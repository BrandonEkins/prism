# Public Demo Deployment

This page explains how the public demo at (e.g.) `prism-demo.duckdns.org` is hosted, why it's structured the way it is, and how to stand up your own copy.

## What the demo is

A read-only public Prism instance seeded with **synthetic** data — fictional family Alex / Jordan / Emma / Sophie, no real names, addresses, schools, calendars, or photos. The dashboard, calendar, chores, meals, etc. all work; mutations are intercepted by middleware and rejected with a friendly *"this is a read-only demo"* message. The database is wiped and reseeded nightly so any state that does change (login session, locally-cached layout) returns to baseline.

## Why this shape

Three things need to be true for the demo to be safe to leave running on the open internet:

1. **No real PII.** The seed file `src/lib/db/init/03-seed.sql` only ever contained fictional data. Demo deployments never receive `.env` keys for real Google Calendar / OneDrive / Gmail, so even if a visitor tried to connect external accounts, the integration credentials don't exist.
2. **Visitors can't trash it for everyone else.** `DEMO_MODE=true` is checked in `src/middleware.ts` — every `POST/PUT/PATCH/DELETE` returns 403 with a `demo_mode` error code, except auth login/logout/session (so visitors can switch between Alex/Jordan/Emma/Sophie to see role-based UI).
3. **State drift is bounded.** A nightly cron job runs `scripts/demo-reset.sh`, which truncates every table in the public schema (except migration bookkeeping) and reapplies the seed. Worst case, the demo is wrong for ≤24 hours.

The demo is never the same host as your real install. Standing it up needs its own VM, its own DNS name, its own `.env`.

## Hosting options

### Recommended: Oracle Cloud Always Free tier

Why: 4 ARM cores + 24 GB RAM + 200 GB storage on a `VM.Standard.A1.Flex` instance, indefinitely free. Comfortably hosts Prism's three containers with headroom. No credit-card-required gotchas after the trial.

Caveats:
- Capacity is region-locked and frequently exhausted. You may need to retry over several days, or pick a less-busy region (Phoenix, Frankfurt tend to have more headroom).
- ARM-only on the free tier — make sure you build the multi-arch image (Prism's `Dockerfile` already supports it).

### Alternatives

| Option | Pros | Cons |
|---|---|---|
| **Hetzner CPX11 (~$4/mo)** | Reliable capacity; x86; pay-as-you-go simplicity | Not free |
| **Fly.io** | Pretty CDN edges; rolling deploys | Free tier shrunk; persistent volumes are easy to misconfigure |
| **Self-host on a spare Pi** | Zero cost if you already own the hardware | Residential IP / ISP TOS / dynamic IP friction |

For a demo, the sweet spot is "free, public, and not connected to your home network." Oracle wins that on price; Hetzner wins it on reliability.

## DNS

You need a public hostname that **does not** point at your home network or any tied to your real identity. A free DDNS name is sufficient — DuckDNS, FreeDNS, or No-IP all work. Pick something neutral (`prism-demo.duckdns.org`).

> Do **not** reuse the same hostname pattern as your real install (e.g. `prism.<your-real-domain>`). Keep the demo on its own DNS so visitors of the demo can never see traffic from your real install and vice versa.

## Walkthrough — Oracle Cloud Always Free

These are the rough steps. They're not exhaustive — Oracle's UI changes frequently. Adjust as needed.

### 1. Provision the VM

- Sign up at oracle.com/cloud/free.
- Create a `VM.Standard.A1.Flex` instance (Ampere ARM). Allocate the full 4 OCPUs / 24 GB if available.
- OS: Ubuntu 22.04 LTS (ARM image).
- Networking: open ports `22`, `80`, `443` in the VCN's security list. **Do not** open `5432` or `6379` — those stay container-internal.

### 2. Bootstrap

```bash
ssh ubuntu@<your-vm-ip>

# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
# log out and back in so the group sticks

# Install caddy for TLS termination (free Let's Encrypt certs, zero config)
sudo apt install -y caddy

# Clone the repo
sudo mkdir -p /opt/prism && sudo chown ubuntu /opt/prism
git clone https://github.com/sandydargoport/prism.git /opt/prism
cd /opt/prism
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env:
#   - DB_PASSWORD: pick a strong random string (this database holds nothing
#     real, but a strong password keeps casual scanning out)
#   - SESSION_SECRET: openssl rand -hex 32
#   - Leave Google Calendar / Gmail / OneDrive / OpenWeather keys EMPTY —
#     the demo must not have access to your real integrations.
```

### 4. Set up Caddy

`/etc/caddy/Caddyfile`:

```caddy
prism-demo.duckdns.org {
    reverse_proxy localhost:3000
}
```

```bash
sudo systemctl reload caddy
```

Caddy auto-provisions a Let's Encrypt cert. Verify HTTPS works at `https://prism-demo.duckdns.org`.

### 5. Start the demo stack

```bash
cd /opt/prism
docker compose -f docker-compose.yml -f docker-compose.demo.yml up -d
docker compose ps  # wait for healthy
```

The demo overlay sets `DEMO_MODE=true` and `NEXT_PUBLIC_DEMO_MODE=true`. Visit the URL — you should see the amber banner across the top, and any attempt to add/edit/delete should return a "this is a read-only demo" message.

### 6. Wire the nightly reset

```bash
sudo tee /etc/cron.d/prism-demo-reset > /dev/null <<'EOF'
0 0 * * * ubuntu /opt/prism/scripts/demo-reset.sh >> /var/log/prism-demo-reset.log 2>&1
EOF

# Test it manually first
/opt/prism/scripts/demo-reset.sh
```

The reset truncates every table in the public schema and reapplies `03-seed.sql`. It also flushes Redis to make sure cached responses don't carry across the boundary.

## Security model

| Threat | Defense |
|---|---|
| Visitor trashes data for other visitors | `DEMO_MODE=true` middleware blocks mutations; nightly reset bounds drift to ≤24h |
| Visitor harvests PII | Seed is fictional; no real integration credentials in demo `.env` |
| Visitor uses demo to enumerate your real users | Demo is its own host with its own DDNS hostname; no shared DB, no shared session, no link back to your real install |
| Visitor exfiltrates the bearer token (Voice API) | Voice API tokens are not seeded into the demo. `/api/v1/voice/*` returns 401 without a token, which is fine |
| Visitor overloads the host | Compose mem limits cap the app at 2 GB; nightly reset clears any DoS-y state |
| Long-running denial-of-service | Out-of-scope; if it gets bad, take the demo down. It's free advertising, not critical infra |

## Updating the demo

```bash
cd /opt/prism
git pull
docker compose -f docker-compose.yml -f docker-compose.demo.yml build app
docker compose -f docker-compose.yml -f docker-compose.demo.yml up -d --force-recreate app
```

The `--force-recreate` is important — without it the container can keep running the old image even after a successful build.

## Tearing down

```bash
docker compose -f docker-compose.yml -f docker-compose.demo.yml down -v
```

`-v` deletes the volumes too. The demo's data is disposable, so this is fine.
