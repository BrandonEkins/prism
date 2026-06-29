# Decisions & lessons log

A running record of work that was built but **not merged**, so the reasoning survives after the branch is deleted. When you delete a research / spike branch, leave its post-mortem here first.

Format per entry: what it was, why it's gone, and the specific lessons worth not re-learning.

---

## `feat/photo-sources-icloud-shared` — iCloud Shared Album source (deleted 2026-06-16)

**What it was:** Phase B of [#57](https://github.com/sandydargoport/prism/issues/57) — pull photos from a public iCloud Shared Album by pasting its share link, no Apple Developer account. PR #92.

**Why it's gone:** Apple migrated public shared albums off the legacy `sharedstreams` web service onto a new "iCloud Links" CloudKit backend during 2024–2025. The legacy endpoint now returns **404 for any modern share**, and anonymous server-side access to the new backend appears to require CloudKit JS session tokens. No community library targets the new backend (`ghostops/icloud-shared-album` last updated 2024-10). The doctrine — why this is a structural wall, not a "try harder" — already lives in [ICLOUD.md](features/ICLOUD.md). The shipping path is Phase A: OneDrive folder + an iOS Shortcut, which doesn't touch Apple's private surface.

**Resolver-level lessons** (these were *only* in the branch code, captured here so they're not lost):

- The legacy protocol is: parse token after `#` in the share URL → POST to a starting partition → follow Apple's **HTTP 330** redirect, which names the canonical host in the `X-Apple-MMe-Host` header → POST `/{token}/sharedstreams/webstream` for photo metadata → POST `/{token}/sharedstreams/webasseturls` for download URLs.
- Use **`p23-sharedstreams.icloud.com`** as the starting partition. A made-up partition like `p123` has no host behind Apple's load balancer, so you get a `400` instead of the expected `330` redirect and the whole flow looks broken for the wrong reason.
- Signed asset URLs are **short-lived (~30 min)** — fetch them at the moment of download, never cache them.
- Derivatives come keyed by a per-byte **`checksum`**; that checksum is the key into the asset-URLs map. Pick the highest-resolution derivative before requesting its URL.
- Even with all of the above correct, it stops at the 404 wall above for modern shares — the lessons are for understanding the old path, not reviving it.

---

## `feat/mcp-server` — Prism MCP server (deleted 2026-06-16)

**What it was:** A self-contained Model Context Protocol server under `.mcp/` exposing the Prism REST API as MCP tools (chores, tasks, events, shopping, messages, meals, goals, recipes, maintenance, points, weather, family), so AI clients (Claude Desktop, Cursor / VS Code Copilot Chat, Gemini CLI / Code Assist) can read and write family data over natural-language chat. Cherry-picked from an external contribution (since closed) and modernized before adoption.

**Why it's gone:** Branch was stale (61 commits behind master) and never merged. Deleted during branch cleanup. **The work is worth resurrecting** if MCP access becomes a real ask — re-cut from commit `f870aeb` rather than from scratch.

**Lessons / decisions worth keeping:**

- Built on `@modelcontextprotocol/sdk` **v1.29+** (bumped from the contribution's `^1.12.0`), **stdio** transport (local subprocess launched by the client).
- Auth reuses the existing **Settings → Security → API Tokens** bearer tokens, passed via `PRISM_BASE_URL` / `PRISM_API_TOKEN` env vars in the client config — no new auth surface.
- Per the **2025-06-18** spec, every tool returns `structuredContent` alongside `content` so modern clients use parsed objects without re-parsing JSON (arrays wrapped under `items`, primitives under `value`, objects passed through).
- `outputSchema` declarations were **intentionally omitted** — they'd silently drift from the upstream REST shapes. Deliberate trade-off, not an oversight.
- Future direction (noted in the branch's `.mcp/README.md`): a remote/hosted variant using **Streamable HTTP + OAuth 2.1** per spec **2025-11-25**, so users plug Prism in without running a local Node process. Not built.
