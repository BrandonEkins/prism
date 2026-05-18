# Weekend Ideas

![Weekend activity board](../demos/weekend.png){ .hero-image }

A family activity board for local places to visit. Lower-stakes than the Travel Map (which is global trips and bucket-list pins), more structured than a Notes-app list. Built around the question: *"what should we do this weekend?"*

---

## What it tracks

A "weekend place" is anywhere your family might spend a few hours: parks, restaurants, museums, trails, farms, drive-ins, indoor play spots. Each entry has:

- **Name** (required)
- **Description** — what it is, why it's worth going.
- **Location** — optional lat/lng + place name + address.
- **URL** — optional link to the place's website.
- **Status** — `backlog` (want to try) or `visited` (been there).
- **Favorite** — boolean star for filtering.
- **Rating** — 1-5 stars, set per visit.
- **Notes** — free-form text.
- **Tags** — e.g. `outdoor`, `nature`, `hike`, `food`, `museum`, `farm`, `indoor`, `seasonal`.
- **Visit count** — denormalized for fast sorting. Increments when you log a visit.
- **Last visited** — denormalized.

Plus a separate **visit history** — each visit is its own row in `weekend_visits` with date, who visited, rating, and notes specific to that trip.

---

## Adding a place

*Weekend → Add place* opens the modal. Required: name. Everything else optional.

If you have a location, paste a URL with coordinates (e.g. Google Maps share link) or use the geocoder to search by name. Coordinates aren't required — many places (a friend's pool, the random pumpkin patch with no website) won't have them.

Two starting statuses:

- **Backlog** — default. You haven't been yet, this is something to try.
- **Visited** — already been; you're adding it retroactively as a favorite or for record-keeping.

---

## The Weekend page

### Cards grouped by tag-category

Place cards group into emoji-headed tag-category sections so you can scan by activity type at a glance:

- 🌳 **Outdoor / Nature** — parks, trails, gardens, beaches.
- 🍔 **Food** — restaurants, breweries, ice cream.
- 🎨 **Museum / Indoor** — museums, kid play spots, indoor activities.
- 🚜 **Farm / Seasonal** — pick-your-own, fall festivals, lavender farms.
- 🎬 **Entertainment** — drive-ins, theaters, mini-golf.
- ❓ **Other** — untagged or tags that don't match a known category.

Cards within each section sort by status (backlog first, then visited), then by favorite, then by last-visited date.

### Visit-frequency dots

Each visited card shows pip dots representing visit count, grouped in 5s. So 12 visits = `●●●●● ●●●●● ●●`. At a glance you can see which places get heavy rotation vs. one-off visits.

### Filters

Filter chips at the top:

- **Status** — All / Backlog / Visited.
- **Favorites only** toggle.
- **Tags** — multi-select chips for each tag in your library.
- **Search** — free-text match on name + description + notes.

### Side panel detail view

Tap any card to slide out the detail panel with:

- All the place's metadata.
- **Edit** button for changes.
- **Mark visited** action — opens a date/rating/notes form. Saving creates a `weekend_visits` row and increments visit count.
- **Favorite** toggle.
- **Visit history list** — chronological list of every visit, who went, rating, notes.

---

## Marking a visit

When you mark a place visited:

1. Pick the visit date (defaults to today).
2. Optionally: rating (1-5 stars), who visited (multi-select family members), notes.
3. Save.

The place's status flips to `visited` (if it was backlog), `visitCount` increments, `lastVisitedDate` updates. The visit row persists in `weekend_visits` so you can browse history.

Subsequent visits don't change status (it stays `visited`) but do increment count.

---

## Removing or editing a visit

Open the place's side panel, scroll to the visit history list, tap any visit to edit or delete it. Deleting a visit decrements the count and recalculates `lastVisitedDate`. If the count drops to 0, the status flips back to `backlog`.

---

## Tags

Tags are free-form — type any string. The page deduplicates tag chips across all places, so once you use a tag, it appears as a filter chip.

Common tag patterns:

- **Activity type** — outdoor, indoor, hike, food, museum, farm.
- **Audience** — kid-friendly, adult-only, all-ages.
- **Season** — fall, summer, spring, winter, seasonal.
- **Logistics** — free, paid, walking-distance, drive-required.

Tags are also used by the tag-category grouping — the page maps known tags to emoji categories. Unknown tags fall into the "Other" group.

---

## Use cases

### "What should we do Saturday?"

Filter to `status: backlog`, then by season tag (`fall`), then sort by tags you're in the mood for. Surface places you haven't been yet.

### "Where do we always have a good time?"

Filter to `favorite: true`, sort by `visitCount` descending. Your regulars rise to the top.

### "We're hosting cousins this weekend"

Filter by tags `kid-friendly` + `outdoor`. Save the side panel detail of any place you're considering and screenshot to share with the visiting parents.

### Family activity scrapbook

Over years of marking visits with ratings and notes, the visit history becomes a record of what your family liked when. Useful when the kids ask "when was the last time we went to the lavender farm?"

---

## Privacy

Weekend places are local to your Prism database. The geocoder (if you use it for adding coordinates) calls `/api/weekend/geocode` server-side, which proxies to Nominatim — Nominatim sees place-name search queries.

No external service sees your visits, ratings, or notes.

---

## Roadmap (not shipped yet)

The current Weekend Ideas is Phase 1 (manual entry, list/filter UI). On the roadmap:

- **POI search + map view** — search nearby attractions via Mapbox or Nominatim POI categories; add directly from search results.
- **Map view** — visualize your weekend backlog as pins on a regional map.
- **Suggest mode** — given current weather + season + family preferences, surface a few suggestions for "today's outing."
- **Share / collaborate** — share a backlog with another family.

---

## Troubleshooting

### Side panel doesn't open on tap

Was a bug in v1.5.0 — `WeekendView` was missing its `<PageWrapper>` wrapper, causing the side panel context to not initialize. Fixed in v1.5.1. If you still see this, hard-reload.

### Visit count is wrong

Visit count is denormalized from `weekend_visits` rows for speed. If it drifts (rare — only on edge cases like manual DB edits), the simplest fix is to delete and re-add a visit, which triggers a recalculation.

### Tag filter chip missing

Tags are extracted from all places at page load. If you just added a tag and it's not appearing as a filter, refresh the page.

### Group "Other" has stuff I expected to be categorized

The tag-category mapping is a curated list (`outdoor`/`hike`/`nature` → Outdoor; `food` → Food; etc.). Unknown tags fall into Other. To fix, either rename your tag to a recognized one, or extend the mapping in `WeekendView.tsx`.
