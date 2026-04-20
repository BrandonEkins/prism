# Prism V4 Architecture Review

**Review period:** April 2026
**Scope:** New additions since V3 — Travel Map, Weekend Ideas, Shopping category fix, GitHub Actions Traffic Tracker
**Format:** Three-meeting adversarial review + executive findings

**Participants**

*Apex Technical Advisory (external)*
- **Morgan** — Security Architect
- **Riley** — SRE / Platform
- **Casey** — Frontend / UX Engineering

*Prism Engineering (internal)*
- **Jordan** — Principal Engineer
- **Alex** — Senior Full-Stack
- **Sam** — DevOps

---

## Meeting 1 — Security & Data Integrity of New Features

**Jordan:** Let's open with the Travel Map. Morgan, where did you land?

**Morgan:** Two immediate flags. First, `TravelGlobe.tsx` line 523 — the hover popup uses `popupRef.current.setHTML(buildTooltipHTML(pin, ctx))`. `buildTooltipHTML` is a hand-rolled string that interpolates `pin.name`, `pin.tripLabel`, `pin.tags`, `pin.stops`, `pin.nationalParks`, `pin.description`-adjacent strings. None of them are escaped. Any of those fields is user-authored and travels round-trip through the DB. If a parent user names a pin `<img src=x onerror=alert(1)>`, every display-mode user who hovers that pin executes JS.

**Jordan:** The pins come from our own users — that's low real-world blast radius, but it's still an XSS sink.

**Morgan:** Self-XSS only matters until it doesn't. Shared family device, kid with curiosity, stored payload. The fix is trivial — either HTML-escape each field before interpolation, or rebuild the tooltip with `document.createElement` and `textContent` like the pin markers already do. I'd prefer the DOM approach so it matches the rest of the file's style.

**Alex:** Agreed. I'll note the rest of `createPinElement` is good about this — it uses `textContent` everywhere and only `innerHTML`-style APIs show up in `buildTooltipHTML`. It's a single function fix.

**Morgan:** Second Travel finding — the geocode route now rate-limits at 10/min per user *if* it can resolve a user via `getDisplayAuth()`. That's the right call. But `getDisplayAuth()` falls back to the configured display user — so if a dashboard is in display mode without a live session, every geocode request is attributed to the display user. A misbehaving tab or kiosk bug storms Nominatim from a single user key. Nominatim's ToS is 1 req/sec. We're at 10 req/min, well under, but only for a single identity. If we had per-IP rate limiting too we'd be safer against "one pathological client" and against getting our User-Agent banned.

**Sam:** The User-Agent is `Prism-Family-Dashboard/1.0` — hard-coded, no contact email. Nominatim's usage policy explicitly asks for an identifying User-Agent with a contact point. We should add an env var and include it, or we're one abuse event away from a block.

**Morgan:** Third item on geocode — the alias table. It's cute. It also widens the attack surface zero, but I want to flag that `rawQ` is passed through two `.replace()` calls, then into the URL. `encodeURIComponent` via `url.searchParams.set` handles injection; that's fine. No concern there.

**Jordan:** Let's move to Weekend Ideas. Alex, you looked at the mutation endpoints.

**Alex:** The shape is clean — `POST /api/weekend/places` and `PATCH /api/weekend/places/[id]` both use `requireAuth()`, Zod schemas, and `invalidateEntity('weekend')`. GET uses `getDisplayAuth()` which matches the intentional display-mode pattern. One issue: the Zod schema for `url` is `z.string().max(1000).nullable().optional()`. No URL format check. Someone can store `javascript:alert(1)` as a URL field.

**Casey:** And the detail page presumably renders that as an anchor `href`?

**Alex:** I'd need to read `WeekendPlaceDetail.tsx` to confirm, but if it does — `javascript:` URIs clicking into the same origin — that's a classic stored-XSS-via-link vector.

**Morgan:** Same concern as Travel. The defense is either `z.string().url()` — which rejects `javascript:` by only allowing `http(s)` schemes in most validators, though Zod's default actually allows `javascript:`, careful — or an explicit `.regex(/^https?:\/\//i)`. The latter is safer.

**Jordan:** Note both — URL validation with explicit http/https, on both `url` and `address` fields if `address` ever gets hyperlinked.

**Riley:** Unrelated data integrity note on weekend_places: latitude and longitude are `decimal(9,6)` and `decimal(10,6)` — *nullable*. That's fine. But the API formatter converts null to null and non-null to `parseFloat(str)`. The check is `row.latitude ? parseFloat(...) : null`. If the saved string were literally `"0"` or `"0.000000"` — a valid equator point — it would be falsy and come back as null. Edge case, but a real one for anyone plotting Quito or Singapore.

**Alex:** Good catch. Should be `row.latitude != null ? parseFloat(...) : null`. Same bug exists in the single-pin formatter for travel pins, though travelPins lat/lng are non-null so it's less reachable there.

**Jordan:** Catalog it. Shopping fix, Casey?

**Casey:** `useShoppingCategories` fix looks correct. The type-guard on `saved.filter((c): c is ShoppingCategoryDef => ...)` is reasonable, and prepending missing defaults is the right backfill strategy. One thing I'd tighten — the type guard checks only `id` and `name` are strings, but `ShoppingCategoryPreset` presumably requires `emoji` and `color` too. If a user has a half-broken saved object, it'll pass the guard but render without an emoji. Minor.

**Alex:** That's fair. I can add `typeof (c as Def).emoji === 'string' && typeof (c as Def).color === 'string'` to the guard.

**Morgan:** The validation loosening on `createShoppingItemSchema.category` — `z.enum([8 values])` → `z.string().max(50)` — is *necessary* because users now author their own categories. But now category is free text. Two concerns: (a) leading/trailing whitespace variations produce duplicate-looking categories in the UI group-by, and (b) 50 chars is generous if anyone templates the category name somewhere. I don't see an injection sink, but the category string is likely rendered in labels — which are JSX, so React escapes. OK here.

**Alex:** I'll add a `.trim()` transform and maybe clamp to 40. Not blocking.

**Jordan:** Morgan — anything on the traffic workflow from a security angle?

**Morgan:** The workflow uses `${{ github.repository }}` inside a shell `run:` step. That's interpolated into the shell before execution. If anyone ever gets write access to rename the repo to include shell metacharacters, we'd have command injection. In practice GitHub doesn't allow those characters in repo names, so this is theoretical. I'll still note it — the hardened pattern is to pass `github.repository` as an env var and reference it as `$REPO` in the shell script.

**Sam:** Low risk, easy fix, I'll do it.

**Morgan:** More importantly — `permissions: contents: write` on a scheduled job that commits back to master. If any step in that workflow is ever compromised (supply-chain on `actions/checkout@v4`, for example — they're pinning by tag, not SHA), an attacker can push to master. We should pin `actions/checkout` by commit SHA, and consider whether this job needs to commit or whether it can open a PR instead.

**Riley:** And it's pushing directly to the default branch with no branch protection exception. If master has required reviews, this will fail. If it doesn't, that's a governance gap — not unique to this workflow, but worth noting.

**Jordan:** Open issue: audit branch protection on master and decide whether the traffic bot should PR rather than push.

---

## Meeting 2 — Architecture, Performance, Overlap With Existing Systems

**Jordan:** Architecture round. Riley, start with the nearby-photos query.

**Riley:** `/api/travel/pins/[id]/nearby-photos` pulls *every* geotagged photo from the `photos` table, parses each lat/lng from string, and runs Haversine in JS. Comment says "fine for home-scale libraries." For now, sure. At 10k photos that's 10k parseFloats and 10k haversine ops per pin hover — still sub-100ms, but I want to flag the pattern: this won't scale to any public-use variant of Prism, and the photo library is the fastest-growing dataset in the system.

**Alex:** The cheap win is a PostGIS-free bounding-box filter in SQL. Lat/lng on `photos` are already indexed presumably — yes they are, based on how the app queries them elsewhere, I'd want to confirm — and a `WHERE lat BETWEEN minLat AND maxLat AND lng BETWEEN minLng AND maxLng` filter with the pin's radius converted to degrees would cut the JS work by 99% for most searches. The Haversine in JS then runs only on the candidates.

**Jordan:** Medium priority. Capture it.

**Riley:** Cache invalidation overlap — travel and weekend are registered in `CacheEntity` and `invalidateEntity('travel')` / `invalidateEntity('weekend')` are used correctly in their mutation routes. Good. But neither is in `CROSS_INVALIDATIONS`. Is that right? If a user deletes a travel pin, nearby-photos responses cached under a different key for that pin still exist — well, those are served through the travel namespace too so they'd be invalidated. Fine.

**Alex:** One nit: `/api/travel/pins/[id]/nearby-photos` doesn't cache its result at all. Every hover triggers the full scan. Given the workload — photo lib grows, pins are relatively stable — this should be cached for 60–300 seconds under `travel:pin:{id}:nearby` and invalidated when travel or photos changes. That pulls photos into the invalidation graph.

**Jordan:** So we'd add `photos → ['travel']` to `CROSS_INVALIDATIONS` once we cache nearby-photos.

**Alex:** Right. Not urgent, but worth planning.

**Casey:** Component size — `TravelGlobe.tsx` is 615 lines. CLAUDE.md says 250 lines per component. It's hitting the known problem: map lifecycle, marker sync, trip lines, fly-to, auto-rotation, and far-side culling are all in one file. I want to split it: `useGlobeMap` hook for init + refs, `useGlobeMarkers` for the sync effect, `useGlobeTrips` for the polyline effect, `useGlobeRotation` for rotation state machine. That's a weekend refactor.

**Jordan:** Note. Not blocking, but it's climbing into the category of "oversized component" V3 called out.

**Casey:** The auto-rotation tick runs `requestAnimationFrame` at effectively 60fps, nudging the center by 0.04° each frame. That's ~2.4°/sec — visible but aggressive. My bigger concern: on mobile, this is a continuous battery drain while the tab is visible. We already have `useVisibilityPolling` pattern. I'd tie rotation to `document.visibilityState`, or even better, pause when the travel page isn't in focus for X seconds. Similar treatment for the screensaver rotation would benefit too.

**Jordan:** Agreed. Alex — add a `document.visibilitychange` listener alongside the existing overlay-open pause.

**Alex:** Will do.

**Casey:** `PinDetail.tsx` — the inline Nominatim search calls `/api/travel/geocode` on Enter. No debounce, no abort-controller for in-flight requests. If a user mashes Enter, stacked requests race to populate `geoResults` and the last-landed wins, not the last-typed. Fine today with rate limit, but the UX is sloppy.

**Alex:** I'll add an AbortController ref to cancel prior fetches.

**Riley:** Storing coordinates as `varchar` in `weekend_places` — what's the rationale? Travel pins use `decimal(9,6)` / `decimal(10,6)` which is correct. Weekend uses `decimal(9,6)` / `decimal(10,6)` actually — let me re-check.

**Alex:** Schema shows `weekend_places.latitude` is `decimal('latitude', { precision: 9, scale: 6 })`. Nullable but still decimal. The scope note says "lat/lng stored as varchar (decimal precision reason)" — that's inaccurate relative to the code. Minor documentation drift.

**Riley:** Good. Decimal is correct.

**Jordan:** Any overlap between Travel, Weekend, and Photos?

**Alex:** Travel Map reads OneDrive-synced photos through GPS metadata. That depends on `photo-sync.ts` continuing to parse EXIF. If photo sync breaks or GPS EXIF ever stops being stored, PinPhotoGrid silently shows empty — we don't surface "no photos have GPS" as distinct from "no photos near here." Minor UX.

**Casey:** Noted — I'd add a subtle hint when the user has zero GPS-tagged photos across the whole library, distinguishing "none exist yet" from "none near this pin."

**Jordan:** Overlap with settings — both shopping categories and (indirectly) the display-user fallback live in the `settings` table. The shopping fix correctly writes through `/api/settings` with a PATCH. No new settings overlap from travel or weekend. Clean.

**Riley:** One architectural concern — `getDisplayAuth()` is now used in six or seven GET endpoints (travel pins, geocode, nearby-photos, weekend places GET + [id]). Each of those endpoints trusts the display user and returns data. The display user is designed for read-only unattended kiosks. That's fine as long as every such endpoint stays read-only. Make sure the team has this mental model baked in — if someone adds a POST on a route that already has `getDisplayAuth` for GET, and they copy-paste the auth call, we have an unauthenticated mutation. `requireAuth()` and `getDisplayAuth()` should probably enforce method separation at the type level or by convention. The current pattern — two explicit imports in the same file — is bait for a copy-paste bug.

**Jordan:** That's a V3-era concern reified by new code. Keep it on the list. Possible fix: split the helpers into `getReadAuth()` (can be used for GET) and make it throw in route handlers where `request.method !== 'GET'`.

**Morgan:** Or a lint rule.

**Alex:** I'll draft a proposal.

---

## Meeting 3 — Operational Concerns, the Traffic Workflow, and Priorities

**Sam:** Operational concerns from the traffic workflow. One — it runs nightly, pushes to master, and provides zero observability. If `gh api` fails silently (rate limit on `GITHUB_TOKEN`, throttling), we just won't have data for that day. No alert, no Slack ping, nothing. Minor, but if the workflow drifts broken for two weeks nobody notices.

**Riley:** The Python inline script's error handling — if `/tmp/views.json` is malformed JSON, `json.load()` raises and the step fails with a stack trace. GitHub Actions will mark the run red. That's actually fine observability — just make sure someone watches the actions tab.

**Sam:** Two — the commit message is `chore: traffic stats $(date -u +%Y-%m-%d)`. One commit per day forever. In a year that's 365 commits in master history. Not wrong, but consider batching — weekly? Or using a separate `traffic-data` branch, or `gh-pages`, so the visualization page can be served from a branch that doesn't pollute master history.

**Riley:** I'd separate. The data has nothing to do with the app code. Anything that bloats the main branch's log makes `git log --oneline` less useful.

**Jordan:** Medium prio. Ship a simple dedicated branch approach.

**Sam:** Three — `actions/checkout@v4` is pinned by major version. GitHub's recommended practice is SHA pinning (`actions/checkout@a5ac7e51b41094c92402da3b24376905380afc29`) to protect against supply-chain attacks on tags. Since this workflow has write permission on `contents`, it's worth SHA-pinning.

**Jordan:** Agreed, high-prio relative to other traffic items.

**Sam:** Four — no timeout on the workflow. If Nominatim — wait, this is `gh api`, not Nominatim. If `gh api` hangs, the runner hits the 6-hour default. Set a `timeout-minutes: 5` at the job level.

**Riley:** Reasonable.

**Jordan:** Readiness and health — anything changed from V3?

**Riley:** Not specifically for these features. But the new endpoints all call external services: geocode hits Nominatim, PinDetail's geocode subroutine does too. If Nominatim is down, the user sees "No results — try a broader search" which is indistinguishable from a real zero-result query. Add error differentiation. Not blocking.

**Alex:** PinDetail `handleGeoSearch` swallows the error in the `finally`. We don't toast on network failure. I'll add one.

**Casey:** Accessibility — I scanned `WeekendView.tsx` and `PinDetail.tsx`. The status filter tabs in WeekendView have no `role="tablist"` / `role="tab"` / `aria-selected`. Keyboard navigation works by tab-iteration but without the semantic cues. Screen reader users get "button, button, button" instead of "tab 1 of 3, selected." Low priority for a family-dashboard use case, but a V2 should tighten this.

**Jordan:** Low prio but file it.

**Riley:** One more — weekend_places has a `lastVisitedDate` stored as `varchar(10)`. The comment says it's denormalized from weekend_visits. Two things: (a) varchar instead of date means no sorting / comparison safety, and (b) weekend_visits exists in the schema but I don't see mutation code reading or writing it. Are we building toward it, or is it vestigial?

**Alex:** Vestigial. The plan had visits as a separate log — the current UI just increments `visitCount` and sets `lastVisitedDate` on the parent row. Either drop `weekend_visits` or wire it in. Unused tables drift rot.

**Jordan:** Note.

**Sam:** Last one from me — the traffic workflow writes to `traffic/history.json` which is served as a static asset by the repo's Pages/index. If the JSON ever crosses some multi-megabyte size, the load time for `traffic/index.html` degrades. No concern for a year or two; flag for later.

**Jordan:** Let's wrap with priorities. Morgan — what's your #1?

**Morgan:** XSS in the Travel tooltip. Stored, renders for any viewer, trivial to fix. That's the only one I'd call pre-release blocker.

**Riley:** Agree. Add SHA-pin of actions/checkout and job timeout on the traffic workflow to the same bucket — neither is hair-on-fire, but they're 10-minute fixes.

**Casey:** My top concern is the weekend `url` field — `javascript:` URLs are an XSS vector if the detail page renders the URL as a clickable link.

**Alex:** It does. `WeekendPlaceDetail` has an anchor. Confirmed vector. Escalate.

**Morgan:** Then that's two criticals: Travel tooltip XSS, Weekend URL XSS.

**Jordan:** Understood. Let me consolidate into the findings report.

---

## Executive Findings Report

### Critical (fix before next release)

| # | Finding | Area | Notes |
|---|---|---|---|
| C1 | Stored XSS in Travel Map tooltip — `buildTooltipHTML` interpolates `pin.name`, `tripLabel`, `tags`, `stops`, `nationalParks` into an HTML string passed to MapLibre `popup.setHTML()` with no escaping. | `src/app/travel/components/TravelGlobe.tsx:214–243, 523` | Stored payload fires for any display-mode viewer who hovers the pin. Fix: use `document.createElement` + `textContent` or run each substitution through an HTML-escape helper. |
| C2 | Stored XSS via weekend place `url` field — Zod schema is `z.string().max(1000)` with no scheme check. Detail page renders the field as an anchor `href`, so `javascript:alert(1)` as a URL executes on click. | `src/app/api/weekend/places/route.ts:18`, `src/app/api/weekend/places/[id]/route.ts:17`, `src/app/weekend/components/WeekendPlaceDetail.tsx` | Fix: add `.regex(/^https?:\/\//i)` on `url`, and in the renderer sanitize or reject non-http(s) schemes defensively. |

**Overlap impact (C1, C2):** Both expand the existing auth surface concern from V2/V3. Any family member with parent PIN can persist a payload viewable by any display-mode user. These are the first stored-payload XSS vectors Prism has shipped.

### High (fix within 2 weeks)

| # | Finding | Area | Owner |
|---|---|---|---|
| H1 | Traffic workflow pushes to master with `contents: write` using tag-pinned `actions/checkout@v4`. Supply-chain risk via tag re-pointing. Also uses `${{ github.repository }}` directly in a `run:` step. | `.github/workflows/traffic.yml` | Sam |
| H2 | Traffic workflow has no `timeout-minutes`. Default 6h hold on the runner if `gh api` hangs. | `.github/workflows/traffic.yml` | Sam |
| H3 | Nominatim User-Agent lacks contact information per ToS. Single shared identifier for the deployment; risks being blocklisted without recourse. Additionally, rate-limit key is per `auth.userId` — display-mode kiosks all share one identity, so abuse via a single kiosk can burn the entire family's quota. | `src/app/api/travel/geocode/route.ts:90`, `src/lib/cache/rateLimit.ts` | Alex |
| H4 | `getDisplayAuth` pattern is copy-paste-friendly for GET routes. If reused on a mutation route by mistake (same file imports both `requireAuth` and `getDisplayAuth`), an unauthenticated write ships. No guardrail today. | `src/lib/auth/requireAuth.ts`, all routes using `getDisplayAuth` | Jordan |

### Medium (scheduled)

| # | Finding | Area |
|---|---|---|
| M1 | `TravelGlobe.tsx` is 615 lines, hitting the 250-line guideline. Split into `useGlobeMap`, `useGlobeMarkers`, `useGlobeTrips`, `useGlobeRotation` hooks. | `src/app/travel/components/TravelGlobe.tsx` |
| M2 | Nearby-photos query fetches *every* geotagged photo from the `photos` table and runs Haversine in JS. Add a SQL bounding-box prefilter on lat/lng, then cache the result under `travel:pin:{id}:nearby` with 60–300s TTL. Add `photos` → `travel` to cross-invalidations. | `src/app/api/travel/pins/[id]/nearby-photos/route.ts`, `src/lib/cache/cacheKeys.ts` |
| M3 | Auto-rotation runs rAF continuously while the page is mounted. Tie to `document.visibilitychange` to pause when tab is hidden. Same pattern applies to the screensaver. | `src/app/travel/components/TravelGlobe.tsx:339–377` |
| M4 | Geocode search in `PinDetail` has no debounce or AbortController; rapid Enter presses can land stale results. | `src/app/travel/components/PinDetail.tsx:139–149` |
| M5 | `weekendPlaces` formatter treats `row.latitude` as falsy when the string is `"0"`. Breaks equator points. Change truthy-check to `!= null`. | `src/app/api/weekend/places/route.ts:36–37`, `src/app/api/weekend/places/[id]/route.ts:35–36` |
| M6 | Shopping category type-guard validates only `id` and `name` are strings; does not require `emoji` and `color`. Half-valid saved objects render with fallback emoji only. | `src/lib/hooks/useShoppingCategories.ts:39–44` |
| M7 | Shopping item category now accepts any string up to 50 chars. No `.trim()` transform — duplicate-looking categories diverge in the UI. | `src/lib/validations/index.ts:105` |
| M8 | Traffic workflow commits to master daily. Move to a dedicated `traffic-data` branch or `gh-pages` to keep main history clean. | `.github/workflows/traffic.yml` |
| M9 | `weekend_visits` table exists but is not used by the API. Either wire it in or drop it. | `src/lib/db/schema.ts:1599`, API routes |

### Low / Nice-to-have

| # | Finding | Area |
|---|---|---|
| L1 | Weekend status filter tabs lack `role="tablist"`/`role="tab"`/`aria-selected` ARIA attributes. | `src/app/weekend/WeekendView.tsx:133–148` |
| L2 | Geocode errors show as "No results" rather than distinguishing network failure. | `src/app/travel/components/PinDetail.tsx` |
| L3 | Pin tooltip does not distinguish "no GPS-tagged photos exist in library" from "none near this pin." | `src/app/travel/components/PinPhotoGrid.tsx` (indirect) |
| L4 | Pin `displayName` offset-at-low-zoom is acknowledged as deferred. No action required. | `TravelGlobe.tsx` |

### Positive Findings

1. **Cache invalidation discipline carried through to new features.** Both Travel and Weekend use `invalidateEntity()` consistently in all mutation handlers. No ad-hoc `invalidateCache('...:*')` regressions. This was a V2 concern — V4 shows the new features adopted the correct pattern from day one.
2. **Geocode rate limiting added proactively.** The 10/min bucket via `rateLimitGuard` is a security-positive addition that wasn't strictly required by V3 findings.
3. **Weekend Ideas auth model is correct.** GET uses `getDisplayAuth()` for kiosk read-only; mutations use `requireAuth()`. Matches the intended pattern.
4. **Zod validation coverage.** Every mutation route (travel pins, trips, weekend places) has a Zod schema with sensible min/max, enum'd status values, and coordinate range checks (`lat >= -90`, `lng >= -180`). Only the `url` field escaped proper scheme validation.
5. **Coordinate normalization in globe-click handler** (`TravelGlobe.tsx:476`) correctly wraps longitude to `[-180, 180]` after globe rotation, preventing coordinate drift from storing out-of-range values.
6. **Shopping category backfill logic is the right shape** — type-guard filters invalid entries, then prepends missing defaults. Previous bug (general categories wiping grocery ones) would have recurred without this.
7. **Schema indexes** — `weekend_places_status_idx`, `weekend_places_favorite_idx`, `travel_pins_parent_id_idx`, `travel_pins_trip_id_idx` are all appropriate for the observed query patterns. No missing index flags.
8. **Auto-rotation lifecycle management** — the refs-and-timers pattern in `TravelGlobe` correctly pauses rotation when the overlay opens and resumes after 60s of idle. The bug the code warns about ("longitude drift") is handled with modulo arithmetic.

### Recommended Action Items

| ID | Action | Owner | Target |
|---|---|---|---|
| A1 | Replace `buildTooltipHTML` string interpolation with `document.createElement` + `textContent` (or escape each field) — Critical C1. | Alex | Pre-release |
| A2 | Add `.regex(/^https?:\/\//i)` to weekend `url` Zod schema (POST + PATCH); defensively sanitize at render — Critical C2. | Alex | Pre-release |
| A3 | SHA-pin `actions/checkout@v4` in traffic workflow; add `timeout-minutes: 5`; move `github.repository` into an `env:` var — High H1, H2. | Sam | 1 week |
| A4 | Add configurable contact email to Nominatim User-Agent; document in README / env.example — High H3. | Alex | 2 weeks |
| A5 | Propose a `getReadAuth()` / `getWriteAuth()` split or a lint rule to prevent `getDisplayAuth` on mutation handlers — High H4. | Jordan | 2 weeks |
| A6 | Extract `TravelGlobe` into hooks (`useGlobeMap`, `useGlobeMarkers`, `useGlobeTrips`, `useGlobeRotation`) — Medium M1. | Casey | Next sprint |
| A7 | Add bounding-box SQL prefilter to nearby-photos; cache result; add `photos → travel` cross-invalidation — Medium M2. | Alex | Next sprint |
| A8 | Tie globe auto-rotation to `document.visibilitychange` — Medium M3. | Alex | Next sprint |
| A9 | AbortController + debounce on PinDetail geocode search — Medium M4. | Casey | Next sprint |
| A10 | Fix `row.latitude` falsy-check bug in weekend API formatters — Medium M5. | Alex | Next sprint |
| A11 | Tighten shopping category type-guard and add trim on category input — Medium M6, M7. | Alex | Next sprint |
| A12 | Move traffic data commits to dedicated branch — Medium M8. | Sam | Next sprint |
| A13 | Decide fate of `weekend_visits` table — use or drop — Medium M9. | Jordan | Next sprint |
| A14 | Add ARIA roles to weekend status tabs — Low L1. | Casey | Backlog |
| A15 | Improve error messaging on geocode failure — Low L2. | Casey | Backlog |

### Summary

The V4 surface area (Travel Map, Weekend Ideas, Shopping category fix, Traffic workflow) is generally well-constructed and inherits the good hygiene established by V1–V3 — especially around cache invalidation, Zod validation, and auth separation. Two stored-XSS vectors are the only pre-release blockers; both are trivial fixes. The larger-scope concerns (`TravelGlobe` size, nearby-photos query scaling, display-auth footgun) are accumulating rather than acute — worth a focused sprint before they become architectural debt. The traffic workflow is a useful observability tool but needs standard GitHub Actions hardening (SHA pinning, timeouts, dedicated branch) before it's considered production-grade.

No previously-resolved V1–V3 findings have regressed in the new code.

---

*End of V4 Review*
