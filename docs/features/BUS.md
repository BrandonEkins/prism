# Bus Tracking

School bus arrival predictions on the dashboard, with adaptive polling that ramps from 60s down to 10s as the bus approaches. Works by parsing the geofence-notification emails that **FirstView** (the bus-tracking service used by many North American school districts) sends to your Gmail inbox.

If your district uses FirstView, you can have your dashboard show "Bus 4 minutes away" without installing the FirstView app or constantly checking your phone.

---

## How it works (at a glance)

1. You connect Gmail in *Settings → Connected Accounts*.
2. You configure one or more **bus routes** — each route is a student + AM/PM trip + ordered geofence checkpoints.
3. Prism polls Gmail for new FirstView emails, parses them, and updates each route's state (next checkpoint, ETA, status).
4. The dashboard widget shows the status in real time. As the bus gets closer, polling interval shrinks so the ETA stays accurate.

---

## Setup

### 1. Connect Gmail

*Settings → Connected Accounts → Gmail → Connect.*

OAuth flow. Prism requests read-only access to your Gmail (specifically: `gmail.readonly` scope). It doesn't send mail, doesn't modify labels, doesn't delete anything. The only thing it does is list + read messages matching the bus filter.

### 2. Auto-discover routes

*Settings → Bus Tracking → Discover routes.*

This scans your existing Gmail for FirstView emails (past 30 days) and proposes a list of routes it found. Each proposal shows:

- The FirstView trip ID (e.g. "28-C").
- The direction (AM / PM).
- The student name parsed from the email.

Confirm any routes you want to track. Confirmed routes go into your `bus_routes` table.

### 3. Configure each route

For each route, set:

- **Student name** — what to display ("Emma", not just "Trip 28-C").
- **Family member** — optional link to a Prism user; lets the widget filter to one kid.
- **Scheduled time** — expected arrival time at your stop, HH:mm format (e.g. `07:42`).
- **Active days** — array of weekday numbers (1=Mon, 5=Fri). Default `[1,2,3,4,5]`.
- **Checkpoints** — ordered list of geofence labels you want to display. The emails reference checkpoint names from FirstView's geofencing setup; you list the ones you care about (e.g. "Bus barn", "Maple & 3rd", "Pine Grove").
- **Stop name** — your stop. Final implicit checkpoint before the kid is at home.
- **School name** — the school. Implicit final checkpoint for AM, starting checkpoint for PM.

### 4. Optional: Gmail label filter

If you have a Gmail filter that routes FirstView emails to a label and skips the inbox (e.g. a `bus` label), tell Prism which label to read from in *Settings → Bus Tracking → Gmail label*.

Defaults to scanning all mail. If you have a noisy inbox, the label filter speeds up sync.

---

## The dashboard widget

The BusTracker widget shows one row per route. Each row has:

- **Student name + direction icon** (sun for AM, moon for PM).
- **Checkpoint progress dots** — one dot per checkpoint, filled in as the bus crosses each geofence.
- **Status color**:
  - **Gray** — before activation (route is enabled but the bus hasn't started moving for today's trip).
  - **Amber** — bus is moving, on the way.
  - **Green** — bus arrived at your stop (AM: arrived at school; PM: arrived at your stop).
  - **Red** — overdue (past the scheduled time with no arrival).
- **ETA text** — "4 min" / "Arrived at school" / "8h 12m" (for large values).

When 6+ checkpoints exist, the progress dots wrap into a 2-row snake layout (top row L→R, bottom row R→L with a vertical connector on the right) so the widget doesn't sprawl horizontally.

### Screensaver widget

Bus tracker has a screensaver variant too — same data, simplified to a single status line per route. Useful when a kid's checking the wall display before walking out the door.

---

## Adaptive polling

The pulse rate adapts based on how close the bus is:

- **Default:** 60 seconds.
- **Bus is moving but >5 minutes out:** 30 seconds.
- **ETA <5 minutes:** 15 seconds.
- **ETA <3 minutes:** 10 seconds.
- **Pre-activation / non-school day:** 5 minutes (low priority).

Polling pauses entirely when:

- It's not an active day for any route (weekend, holiday).
- All active routes are in `arrived` status (today's trip is done).
- The browser tab is hidden — paused via `useVisibilityPolling`. Resumes when the tab is foregrounded.

The visibility pause is important — without it, an open dashboard tab would poll Gmail every 10 seconds indefinitely, which the Gmail API quota doesn't appreciate.

---

## Email parsing

FirstView sends three notification types per trip:

1. **Distance-based** — "Bus is 2 miles away." Contains a distance + ETA estimate.
2. **Arrived at stop** — "Bus has arrived at your stop." Sent when the bus crosses the stop geofence.
3. **Arrived at school** — "Bus has arrived at school." Sent when the bus crosses the school geofence (AM trip).

The parser extracts:

- **Event type** (one of the three above).
- **Checkpoint name** — which geofence was crossed (matches the configured `checkpoints` for that route).
- **Event time** — from the email's `Date:` header (timezone-correct; the body text uses naive local times that broke in UTC Docker containers before v1.3).
- **Trip date** — derived from event time + active day check.
- **Gmail message ID** — for dedup. The `bus_geofence_log` table has a unique index on `gmail_message_id` so reprocessing a message twice is a no-op.

### Fuzzy checkpoint matching

FirstView's checkpoint names can drift — "Maple & 3rd" might show up as "Maple and 3rd", "Maple/3rd", or just "Maple 3rd" across different emails. The parser does fuzzy matching against your configured checkpoint list so minor variations match cleanly.

### Historical median transit times

Once you have a few weeks of data, the system calculates a **rolling 30-day median** transit time between consecutive checkpoints. This is what powers the "8 min ETA" prediction even before the distance-based email arrives.

If the median for `Pine Grove → Our stop` is 4 minutes, and the bus just crossed Pine Grove at 7:38, the widget shows "Bus 4 minutes away" predicted-arrival-7:42. Updates instantly when the actual arrival email comes in.

---

## Status states

Each route walks through these states per trip:

1. **Pre-activation** (gray) — before the first email of the day arrives. Polls slowly.
2. **In transit** (amber) — at least one email has arrived; bus is between checkpoints.
3. **Approaching** (amber, fast polling) — within 3-5 minutes of predicted arrival.
4. **Arrived** (green) — final email received. AM: at school. PM: at your stop.
5. **Overdue** (red) — past the scheduled arrival time + ~10 minute grace, with no arrival email.

The overdue state intentionally has a grace window — buses run a few minutes late routinely, and you don't want a false alarm every Tuesday.

---

## Active days awareness

Without active-days config, the widget would flag "overdue" every weekend morning (no bus, no email, so the predicted arrival never happens). With it configured (`[1,2,3,4,5]` = Mon-Fri), the widget shows neutral "off duty" status on weekends and any non-active day.

You can also have routes with different active days — e.g. one trip only runs Tue/Thu after-school enrichment.

---

## Privacy

Bus tracking is your data, on your instance. The only external service involved is Gmail — Prism's read-only access lets it parse the FirstView emails you already receive.

- Gmail OAuth tokens are stored AES-256-GCM encrypted at rest.
- Parsed email bodies are not stored verbatim; only the structured fields (checkpoint, event time, event type) plus the Gmail message ID for dedup.
- Disconnect anytime — *Settings → Connected Accounts → Gmail → Disconnect*. Tokens are deleted; existing bus tracking data stays in your DB but stops updating.

---

## Common workflows

### Weekday-morning rush

Set up AM routes for each kid. Open the dashboard at 7am. Widget walks through the checkpoints as the bus approaches. When it shows "2 minutes away" you know to start the shoes-and-coats hustle.

### Coordinating two kids on different buses

Two routes, different trip IDs, different students. Widget shows both as separate rows.

### After-school confirmation

PM routes start polling around dismissal. Green "Arrived at school" → amber "in transit" → green "Arrived at your stop" → time to look up from work to greet the kid.

### Late bus / snow day diagnostic

When the bus is late, the widget shows what happened: which checkpoints were crossed (you can see if the bus actually started) and how long ago. Helps distinguish "running 10 min late" from "the bus broke down" without calling the district.

---

## Troubleshooting

### "Bus tracker shows nothing"

Most common cause: no FirstView emails in your inbox yet for today. The widget activates when the first email of the day arrives. Check Gmail directly — do you see today's emails?

If yes but Prism doesn't, check:

1. *Settings → Connected Accounts → Gmail* — still connected?
2. *Settings → Bus Tracking → Gmail label* — is the label filter correct? (If your filter routes to a `bus` label, the default "scan all mail" might not find them either — but the label-specific scan would.)
3. Force a sync: *Settings → Bus Tracking → Sync now.*

### Route auto-discovery missed a trip

Discovery scans the past 30 days. If your district just added a new trip (or you forwarded existing emails to Gmail recently), the discovery might miss them. Manually add the route in *Settings → Bus Tracking → Add route* using the trip ID + direction.

### Checkpoint progress dots don't fill in

The checkpoint names must match (fuzzily) what FirstView sends. If a checkpoint never fills, check the parsed `bus_geofence_log` rows — what `checkpoint_name` did Prism actually parse? Update your `checkpoints` config to match.

### "Overdue" status on weekends

`activeDays` not configured. Set to `[1,2,3,4,5]` for Mon-Fri (or just the days the bus actually runs).

### ETA shows "925m" or other huge value

Was a bug in older versions — large minute values weren't being converted to "h m" format. Fixed in v1.3. Should now show "15h 25m". Hard-reload if you still see raw minutes.

### Gmail rate-limited

Gmail's API has a generous quota but it's not infinite. The visibility-pause + adaptive polling combo keeps quota usage well under the limit for one family on one Gmail account. If you somehow hit the limit (e.g. multiple dashboards polling the same account from different tabs), Gmail returns 429 and Prism backs off. Sync resumes after a cooldown.

### "Bus at school" shows 0-minute ETA at pickup time

Was an old display bug where PM routes showed "0 min" before the bus left school instead of "at school, en route." Fixed — now shows "Bus at school — en route."

### Arrival timestamps were off by 6 hours

Was a TZ bug in early v1.3 — arrival parsers were parsing the email body's text time as naive UTC instead of the email's `Date:` header (which is timezone-aware). Fixed. If you see this on old data, it'll correct itself for new arrivals; historical rows can be re-parsed by deleting and re-syncing.
