# Prism Help Guide

A complete guide to using Prism, the self-hosted family dashboard. Current as of **v1.8.0**.

> Prefer the rendered version? This guide is also published at <https://sandydargoport.github.io/prism/HELP/> with search, dark mode, and image zoom.

---

## Getting Started

### What is Prism?

Prism is a self-hosted family dashboard that brings together calendars, tasks, chores, shopping lists, meals, recipes, photos, travel plans, and more into one shared hub. It's designed for always-on displays (tablets, kiosks, wall-mounted TVs), works as a PWA on phones and tablets, and uses PIN-based login so everyone in the family — including young kids — can use it without a password.

### First-Time Setup

1. **Add family members** in *Settings → Family Members*.
2. **Set PINs** for each member in *Settings → Security*. Defaults are `1234` (parent) and `0000` (child) — change them.
3. **Connect integrations** in *Settings → Connected Accounts* (Google Calendar, Google Tasks, Microsoft, OneDrive, Gmail, Kroger as needed).
4. **Customize your dashboard** layout — open the layout editor with the grid icon (parent only).
5. **Install as a PWA** on phones and tablets for quick access.

### Logging In

Tap a family member's avatar, then enter their 4-digit PIN. The PIN auto-submits after 4 digits. Keyboard input works too (0-9, Backspace, Enter). Once you log in, your session stays active for 7 days (or 1 day if you check "this is a shared device").

---

## Roles & Permissions

| Action | Parent | Child |
|---|---|---|
| View dashboard & pages | Yes | Yes |
| Complete chores | Yes (auto-approved) | Yes (pending parent approval) |
| Approve chores | Yes | No |
| Edit settings | Yes | No |
| Manage family members | Yes | No |
| Redeem goals | Yes | No |
| Exit Away / Babysitter Mode | Yes (parent PIN required) | No |
| Add tasks, messages, wishes | Yes | Yes |
| Delete others' messages | Yes | No |
| Generate API tokens | Yes | No |

---

## Dashboard

The dashboard is the main hub, displaying live data through customizable widgets on a 48-column CSS Grid. Multiple dashboards are supported — each display (e.g. `/d/kitchen`, `/d/bedroom`) has its own independent layout, screensaver, and orientation.

### Available Widgets

- **Clock** — Current time and date.
- **Weather** — Temperature, conditions, humidity, wind, sunrise/sunset, and a forecast row. Default provider is Open-Meteo (no API key required); Pirate Weather and OpenWeatherMap are alternatives.
- **Calendar** — Full subpage parity: Agenda, Day, List, Schedule (week vertical), 1W/2W/3W/4W, Month, and 3 Months. Drag-and-drop in cards mode, click-to-edit on widget items.
- **Tasks** — Open tasks with completion status. Click an item to open the same edit modal as the Tasks page.
- **Chores** — Pending and due chores grouped by person. Auto-strikes chores past their reset day.
- **Shopping** — Active list items, check off in place, optimistic updates.
- **Meals** — Weekly meal plan with type ordering (breakfast → lunch → snack → dinner).
- **Messages** — Family message board with pinned and expiring messages.
- **Photos** — Rotating photo slideshow (or a single static image in Performance Mode).
- **Points** — Per-child goal progress with point waterfall.
- **Birthdays** — Upcoming family birthdays.
- **Wishes** — Family member wish lists.
- **Bus Tracker** — School bus arrival predictions with status dots and ETA.
- **Travel** — Compact travel map snapshot.

### Editing the Layout

1. Tap the **grid icon** (four squares) in the dashboard header to enter edit mode (parent only).
2. **Drag** widgets to reposition; **resize** by dragging corner handles. The grid is 48 columns wide for fine positioning.
3. Use **Widgets** to show/hide widgets or adjust their coordinates manually.
4. Click a widget to select it, then use the **properties toolbar** to adjust background color, opacity, outline, text color, text size, and per-widget transparency.
5. Load pre-designed arrangements from **Templates**.
6. **Save** to overwrite the current layout, or use the dropdown arrow for **Save As** to create a named copy.
7. **Set as Default** in the More menu makes a dashboard the one served at `/`.

### Preview & Validation

Click **Preview** in the editor toolbar to see a miniature map of your layout — widget positions, screen safe zones for common display sizes, and warnings for overlapping or undersized widgets. Click the preview map to scroll the grid to that area.

### Measure Mode

Click **Measure** (or press Ctrl+Shift+M) to hide the editor toolbar and see your layout as it will actually appear. The "Show Nav / Hide Nav" toggle lets you check how it reads with and without the side navigation. Useful for fine-tuning layouts on dedicated displays.

For a permanent clean look, enable **Auto-Hide Navigation** in *Settings → Display*. The nav and toolbar fade out after a period of inactivity and reappear on click or keyboard input.

### Screensaver Layout

Each dashboard has its own screensaver layout. In edit mode, click **Screensaver** to switch to editing the screensaver widget arrangement. The screensaver activates after a configurable idle period (*Settings → Display*) and overlays your chosen widgets on a photo slideshow.

Configure in *Settings → Display*:
- **Screensaver timeout** — How long before it activates (1 / 5 / 15 / 30 / 60 minutes).
- **Photo rotation interval** — How often photos cycle.
- **Pin a photo** — Use one static image instead of rotating.

### Performance Mode

For low-power devices (Raspberry Pi, older tablets), **Performance Mode** stretches polling intervals (~2.5×), renders the Photo widget as a single static image instead of a slideshow, and pulls back on animations. A subtle lightning-bolt badge appears in the dashboard header while active.

Auto-enabled on first load when the browser reports ≤2 GB RAM or ≤4 CPU cores. Your explicit choice in *Settings → Display* is always respected on subsequent loads. The `?perf=1` URL param continues to work for kiosk URLs.

### Import, Export & Community Layouts

- **Export** — Copy your current layout as JSON to share (*More → Export*).
- **Import** — Paste a layout JSON to load someone else's design (*More → Import*).
- **Share** — Submit your layout to the Prism community gallery via GitHub (*More → Share*).
- **Community** — Browse and apply layouts shared by other Prism users from the Community button in the editor toolbar.

### Multiple Dashboards

Create separate dashboards for different rooms or displays. Click the dashboard name dropdown in the editor toolbar to switch between them or create new ones.

- Default dashboard lives at `/` (configure which is the default via *More → Set as Default*).
- Named dashboards get URLs like `/d/kitchen` or `/d/living-room`.
- Each has independent widget layout, screensaver layout, and orientation (landscape/portrait).
- Bookmark a dashboard URL on a dedicated device for instant access.

### Orientation

Toggle between **Landscape** and **Portrait** mode using the orientation button in the editor toolbar. This controls which screen safe zone guides are shown and how the layout snaps.

### Mobile Dashboard

On phones, the dashboard shows a simplified single-column layout with summary cards for each feature. The Floating Action Button (FAB) in the corner replaces the bottom nav and provides:
- **Home** — return to the dashboard
- **Reorder** — drag cards into your preferred order (persists)
- **Settings** — toggle which cards are visible
- **Login** — switch users

Tap any card to navigate to the full page. Screensaver and Away Mode auto-disable on PWA installations so they don't interrupt phone use.

---

## Calendar

### Setting Up Calendars

Two source types are supported:

1. **Google Calendar (OAuth)** — Bidirectional sync. Connect in *Settings → Connected Accounts → Google*. Create, edit, drag, and delete events in Prism, and changes push back to Google Calendar.
2. **iCal (read-only)** — Paste any public `.ics` URL in *Settings → Calendars → Add iCal source*. Used for school calendars, sports schedules, or any subscription feed.

Once connected, individual calendars appear in *Settings → Calendars* where you can:

- **Enable/disable** individual calendars from showing on the dashboard.
- **Assign to a family member** — each calendar is linked to a person or marked as "Family" (shared).
- **Set display names** — customize how a calendar appears in the UI.
- **Change colors** — override the default color for any calendar.

### Server-Side Sync Cron

Calendar sync runs as a 10-minute server-side cron job, so events stay current even when no one is looking at the dashboard. The default sync window is **−90 days to +365 days** — far enough back to keep historic events, far enough forward to cover the full school year and sports season.

Disable with `PRISM_DISABLE_CALENDAR_CRON=true` if you want to rely on user-triggered syncs only.

### Calendar Groups & Columns

In Day and List views, events are organized into **columns by calendar group**. Groups are created automatically based on your calendar assignments:

- The **Family** group always appears first (for shared/family calendars).
- **Person columns** appear after Family, ordered by the family member sort order in *Settings → Family Members*.
- Reorder family members to change the column order.
- Use the **Merge/Split** toggle in View Options to combine all events into a single column or separate by person.

Filter buttons at the top of the calendar let you show/hide specific calendar groups. Click **All** to show everything.

### Color Coding

Events inherit their color from the calendar source they belong to. When calendars are assigned to family members, each person's events appear in their column with the calendar's color. Customize per-calendar in *Settings → Calendars*.

### Views

| View | Description |
|---|---|
| **Agenda** | Upcoming events in a scrollable chronological list. |
| **Day** | Hourly breakdown with side-by-side calendar columns. |
| **List** | Vertical week view with events listed per day; optional notes column. |
| **Schedule** | Week shown vertically — every day in one tall column. Good for narrow displays. |
| **1W / 2W / 3W / 4W** | Multi-week views, configurable from 1 to 4 weeks. |
| **Month** | Full month grid (auto-spans 6 rendered weeks so neighboring-month days aren't missing). |
| **3 Months** | Three months side-by-side. |

The view selector includes ▲▼ triangles for one-click cycling between views. Multi-week navigation advances/retreats by the configured `weekCount`.

### Display Mode: Inline vs Cards

In any view, you can switch between two display modes via the **View Options** gear:

- **Inline** — Events listed as compact rows (the original look).
- **Cards** — Each day becomes a card with meals at top, events in the middle, chores+tasks at bottom. A dynamic capacity probe respects your font scale and viewport; overflow folds into a "+N more" popover so nothing is silently clipped.

Cards mode also enables drag-and-drop and overlays.

### Drag-and-Drop

In **cards mode**, you can drag meals, chores, tasks, and events between days — on every view (Day, List, Week, 1W-4W, Month, 3 Months, Agenda) and inside the dashboard CalendarWidget. The drag activates after 5px of movement, so single taps still trigger click-to-edit. The API rejection (if any) surfaces inline as a `moveError`.

### Click-to-Edit from the Widget

Tasks, chores, and meals on the dashboard CalendarWidget open the same edit modals as the calendar subpage. Modals lazy-load so the dashboard's first paint isn't taxed.

### View Options Menu

The gear icon next to the view selector opens View Options:

- **Hide weekends** (multi-week views only).
- **Merge calendars** into one column.
- **Show notes column** (Day / Schedule).
- **Overlay toggles** — show/hide events, meals, chores, tasks per surface.

Settings persist to localStorage. The View Options icon shows a badge when any toggle is non-default; **Reset to defaults** restores the standard view.

### Overlays — Meals, Chores, Tasks

Cards mode renders meals (top), chores+tasks (bottom), and events (middle) alongside one another on every view. Bucket data comes from a shared range hook so the subpage and widget see exactly the same data with the same timezone handling.

### Calendar Notes

Click the **sticky note icon** to show a notes panel alongside Day or List views. Notes are day-tied, shared across the family, and support formatting:

- **Ctrl+B** Bold, **Ctrl+I** Italic, **Ctrl+U** Underline
- **Ctrl+Shift+S** Strikethrough, **Ctrl+Shift+L** Bullet list
- Type `- ` at the start of a line to auto-convert to a bullet

Notes auto-save after 2 seconds of idle typing or when the panel loses focus.

### Hidden Hours

Hide a time range from day/week views (e.g., midnight to 6 AM). The remaining hours auto-resize to fill the available space. Configure the range in *Settings → Display → Calendar Hours*, and toggle visibility with the clock button in calendar views.

### Navigation

- **Previous/Next** arrows to move between periods.
- **Today** button to jump back to current date.
- **Swipe** left/right on touch devices.

---

## Tasks

Create and manage to-do items with optional assignment, due dates, priorities, and categories.

- **Add** via the "Add Task" button or inline text input.
- **Complete** by tapping the checkbox. Undo button appears in the nav bar for ~5 seconds.
- **Filter** by person, priority, or category.
- **Sort** by due date, priority, or category.
- **Group** by Person, by List, or nested (Person → List, List → Person) — primary group with sub-group dividers inside.

### Sync Providers

Tasks can sync with one of two providers:

- **Microsoft To Do** — bidirectional, configure in *Settings → Task Sync*.
- **Google Tasks** — bidirectional, configure in *Settings → Task Sync* (pick provider).

Pick one per Prism instance. The provider's list selection appears in the same settings card.

---

## Chores

Family chores with an approval workflow and point system.

### How It Works

1. A parent creates a chore with a frequency (daily, weekly, biweekly, monthly, quarterly, annually) and point value.
2. A child marks it complete — it enters "Pending Approval" state.
3. A parent approves it — points are awarded and `nextDue` advances.
4. If a parent completes it themselves, it's auto-approved.

### Reset Day

Each chore can have a custom reset day:
- **Weekly / Biweekly** — Which day of the week (Sun-Sat, defaults to Sunday).
- **Monthly / Quarterly** — Which day of the month (1-28).
- **Annually** — Specific date (MM-DD format).

Set this in the Add/Edit Chore modal.

### Views

- **Group by Person** — Cards per family member showing their chores.
- **List view** — All chores in a sortable list.
- **History** — Recent completions with approval status.

Recently approved chores remain visible for 24 hours so you can see what's been finished today.

---

## Goals & Points

Set family goals that children work toward by earning points from chore completions.

### Setup

1. Go to *Goals*, tap **Add Goal**.
2. Set a name, emoji, and point cost.
3. Choose **Recurring** (resets weekly / monthly / yearly) or **One-time** (accumulates until redeemed).
4. Set priority order — points fill higher-priority goals first.

### How Points Work

Points are earned from approved chore completions. The **waterfall** allocates points in priority order:

1. Highest priority recurring goal gets filled first.
2. Overflow goes to the next goal.
3. Non-recurring goals accumulate across weeks.

### Celebrations

When a goal is fully achieved, a seasonal celebration animation plays:

- Valentine's week: Hearts
- St. Patrick's week: Leprechaun & gold
- Easter week: Easter bunny & eggs
- Mother's Day week: Spring flowers
- Memorial Day week: Flags & stars
- July 4th week: Bald eagle & fireworks
- Halloween week: Jack-o-lantern & bats
- Thanksgiving week: Cornucopia
- Christmas week: Santa's gift bag
- New Year's: Fireworks & confetti
- All other times: Trophy & confetti

Celebrations honor `prefers-reduced-motion` and Performance Mode — they fire their completion callback immediately and skip the animation if either is active.

---

## Shopping

Manage multiple shopping lists with categories and per-person tracking.

- **Multiple lists** — Groceries, Hardware, Target, etc.
- **Categories** — Produce, Dairy, Bakery, Meat, Frozen, Pantry, plus open-ended categories for non-grocery lists (clothes, housewares, etc.).
- **Group by person** — See who requested each item.
- **Shopping mode** — Simplified view for in-store use.
- **Drag-to-reorder** items within a category — handy for arranging by store layout.
- **Undo** — Recent check-offs / deletions can be reversed from the nav bar.

### Barcode Scanning

Two ways to scan a barcode into the active list:

- **Phone camera** — Tap the camera icon in the Shopping header to open a full-screen scanner overlay. A successful scan plays a haptic + audio tone, dismisses the overlay, and adds the item with its Open Food Facts data + a suggested category.
- **USB HID scanner** — Plug a barcode scanner into your dashboard PC. Scanners act as a keyboard, so no configuration is needed. Items are added instantly when scanned anywhere in the app.

If the scanned item is already on a list, Prism warns and lets you pick which list to add it to (or cancel).

### Send to Kroger / Mariano's / All Banners

If you've connected a Kroger account (*Settings → Shopping → Kroger / Mariano's cart*), the Shopping header gains a **Send to Kroger** button. Tap it to launch a SKU picker that walks through each unchecked item, showing up to 5 product candidates per item with image, price, and a normalized unit price (lb / fl oz / ct) so options compare directly.

Works at every Kroger banner — Kroger, Mariano's, Ralphs, King Soopers, Fred Meyer, QFC, Smith's, Fry's, Harris Teeter, Pick 'n Save, Metro Market, Pay Less, Food 4 Less, Foods Co., Bakers' Plus, City Market, Copps, Dillons, Gerbes, Jay C, and Ruler Foods (one Kroger account works across all of them).

- **Quantity controls** — bump cart count 1-99 per item with +/-.
- **Search override** — refine the search term when the parser strips too much.
- **SKU caching** — once you pick *"Mariano's 2% Reduced Fat Milk Gallon"* for the abstract item *"milk"*, the productId is remembered. Weekly staples become one-tap on the next trip.
- **Default store** — set your preferred banner by zip code so searches use location-aware pricing.

Detailed setup is in the [Kroger integration guide](features/KROGER.md).

### Microsoft To Do Sync

Map any Prism shopping list to a Microsoft To Do list in *Settings → Shopping Sync*. Bidirectional — adds/checks on either side flow through.

---

## Meals

Weekly meal planner with recipe integration.

- **Plan meals** by dragging recipes to days of the week (or use the Add Meal modal).
- **Meal types** — Breakfast, Lunch, Snack, Dinner (rendered in that order — snack between lunch and dinner).
- **Link recipes** from your recipe library so opening a planned meal jumps to the recipe.
- **Mark as cooked** to track what's been prepared. Cooked-by attribution shows who cooked it.
- **Drag between days** — including from the dashboard Meals widget on touch devices.
- Week starts on your configured day (*Settings → Display → Week Starts On*).

---

## Recipes

Browse, import, scale, and manage recipes.

### Importing

| Method | How |
|---|---|
| **URL** | Paste a recipe URL (works with schema.org sites like AllRecipes, NYT Cooking, etc.). |
| **Paprika** | Upload Paprika HTML export files. |
| **Paste text** | Paste OCR'd recipe text (iOS Live Text from a photo, Google Lens, anything you copied). A heuristic parser splits it into title (AP-style title-cased), prep/cook/total time, servings, ingredients, and step-by-step instructions. |

### Photos

Each recipe can carry its own image. Tap **Add photo** on the recipe form to upload from your phone camera or photo library. Images are resized to ≤1200px and stored at `data/recipe-images/<recipeId>.jpg`.

### Ingredient Sections

Ingredient lists can carry **section headings** like `Fries:`, `Meatballs:`, `Sauce:`. Headings render bolded in the detail view and are filtered out of the "Add to shopping list" payload (they're visual grouping, not items to buy).

### Scaling

The detail modal includes quick-scale pills next to the +/- servings adjuster:

- **½× / 1× / 2× / 3× / 4×** — instantly recalculate ingredient quantities.
- The active multiplier highlights so you know what you're seeing.
- ½× rounds up to the nearest whole serving (so a 3-serving recipe scales to 2, not 1.5).
- Scaled quantities propagate to the shopping list when you tap **Add to Shopping List**.

### Adding to Shopping List

Open a recipe, pick the shopping list from the dropdown, and tap **Add to Shopping List**. The current scale is applied. Section headings are stripped automatically.

---

## Messages

Family message board for shared updates.

- **Post** messages attributed to whoever is logged in.
- **Pin** important messages to the top.
- **Mark as important** for visual emphasis.
- **Set expiration** (12h / 1d / 2d / 3d / 7d) for temporary notices — auto-deletes after the window.
- **Edit** — Click the pencil icon to edit in place (Ctrl+Enter to save).
- **Delete** — Authors can delete their own; parents can delete any message.
- **Group by Person** toggle organizes messages into person-colored cards.

---

## Wishes & Gift Ideas

Per-family-member wish lists with optional Microsoft To Do sync.

### My Wishes Tab

Each family member has their own wish list. Others can view and **secretly mark items as purchased** — the owner doesn't see who claimed what.

- **Add** items with name, link, and notes (quick-add input at the top of the list).
- **Claim** — Mark as purchased (secret from the wish owner).
- **Cross off** — Owner can cross off items they got themselves. If someone else already secretly bought it, the message reads "Someone already got this for you!"
- **Sync** with Microsoft To Do — configure per member in *Settings → Wish List Sync*.

### Gift Ideas Tab

Private per-user gift idea tracking for other family members.

- Each person sees columns for every OTHER family member.
- Add gift ideas with name, link, price, and notes.
- Mark ideas as purchased.
- **Privacy** — only you can see your own gift ideas. They are never visible to the recipient or other family members.
- Gift ideas do **not** sync to Microsoft To Do (privacy protection).

---

## Photos

Photo gallery with local uploads and OneDrive sync.

- **Gallery** — Browse all photos with lightbox view.
- **Slideshow** — Auto-rotating photo display.
- **Sources** — Local uploads and/or OneDrive sync.
- **OneDrive folder picker** — Pick which OneDrive folder to sync from in *Settings → Photos → OneDrive*. Defaults to the root if not chosen.
- **GPS backfill** — Read GPS EXIF from already-synced OneDrive photos and write coordinates back to the database without re-downloading (useful when enabling Travel Map photo linking after the fact). Trigger from *Settings → Photos*.
- **Orientation filter** — Show only landscape, portrait, or square photos.
- **Pin photo** — Set as wallpaper or screensaver background.

Configure in *Settings → Photos*.

---

## Travel Map

Interactive 3D globe for tracking family travel. Drop pins for places you've visited or want to visit, build multi-stop trips, and link GPS-tagged photos to where they were taken.

### Places

The Places tab lists every standalone pin you've created with stats, search, and filters:

- **Been there** — visited (green checkmark).
- **Want to go** — on the wishlist (white dot).
- **Bucket list** — high-priority must-visit (amber star).
- **National parks** included as a sub-category.

Group by **Year**, **Country**, or **None** (country flag emoji shown in group headers). Selecting a place switches to the globe and opens its detail panel for inline editing — name, trip label, status toggle, bucket list star, visit dates, description, tags. No separate edit modal.

The **pencil icon** next to a pin's coordinates opens an inline geocode search for re-locating a pin that landed in the wrong spot.

### Trips

Trips are multi-stop journeys, separate from standalone place pins. Three styles:

- **Route** — A → B → C polyline.
- **Loop** — Closed polyline returning to start.
- **Hub** — Home base + day-trip spokes.

All trips are always visible on the globe. Inactive trips render as faint colored dots and lines; the active (selected) trip shows full numbered markers and a bright dashed line. Click any faint dot to select that trip.

Trips support both regular stops and **national park stops** from a curated NPS list. NP stops display a green tree icon instead of a number badge.

### GPS Photo Linking

Geotagged OneDrive photos automatically match to nearby travel pins. The pin detail panel shows a photo strip of matching shots within a configurable radius (default 50 km). Photos can be browsed via a lightbox. (Run the GPS backfill on existing photos to enable this for shots taken before you set up Travel Map.)

### Globe Controls

- **Drag** to rotate.
- **Scroll / pinch** to zoom.
- **Moon/sun button** toggles a dark-map filter that darkens tiles while keeping markers at full brightness — no tile reload required.

---

## Weekend Ideas

A family activity board for local places to visit.

- **Backlog** — Add places you want to try (parks, restaurants, museums, hiking trails, etc.).
- **Mark visited** with a 1-5 star rating.
- **Favorites** — Star important places for quick filtering.
- **Tags** — `outdoor`, `nature`, `hike`, `food`, `museum`, `farm`, and more. Place cards group into emoji-headed tag-category sections so you can scan by activity type.
- **Filters** for status (backlog vs visited), favorites, tags, and free-text search.
- **Side panel detail view** with edit, mark-visited, and favorite actions.

Visit frequency shows as pip dots grouped in 5s so you can see at a glance which places get the most repeat trips.

---

## Display Modes

### Screensaver

Photo slideshow after idle timeout with configurable templates. Each dashboard has its own screensaver layout.

- **Configure timeout** in *Settings → Display → Screensaver Timeout* (1 / 5 / 15 / 30 / 60 minutes).
- **Photo rotation interval** controls how fast photos cycle.
- **Pin a photo** to use one static image instead of rotating.

### Away Mode

Privacy overlay for when the dashboard is unattended.

- Shows photo slideshow with clock and weather in a compact header bar.
- **Activate**: Tap the shield icon in the dashboard header.
- **Auto-activate**: Configure in *Settings → Display → Away Mode Auto-Activation* (4h / 8h / 1 day / 1 week).
- **Exit**: Tap anywhere, then enter a parent PIN.

### Babysitter Mode

Caregiver information overlay with essential household details.

- **Emergency contacts** with phone numbers.
- **House info** — WiFi (with QR code), door codes, address.
- **Child info** — Allergies, medications, bedtime, special notes.
- **House rules** — Guidelines for the caregiver.
- **Activate**: Tap the babysitter icon in the dashboard header.
- **Exit**: Tap anywhere, then enter a parent PIN.

Configure in *Settings → Babysitter Info*. Mark items as **sensitive** to require PIN unlock for that section. The babysitter info page is also available at `/babysitter` without login (for sharing with the caregiver before they arrive).

---

## Bus Tracking

School bus arrival predictions via Gmail/FirstView integration.

- Parses bus notification emails to predict arrival times based on rolling-median transit times (30-day window).
- Dashboard widget with progress dots, status colors (gray / amber / green / red), and ETA display.
- Screensaver widget support.
- Configurable per student with AM/PM trips.
- **Adaptive polling** — scales from 60s down to 10s as the bus approaches.
- **Active days awareness** — no false "overdue" status on weekends/non-school days.
- **Route auto-discovery** — *Settings → Bus Tracking → Discover routes* scans existing emails and proposes routes for you to confirm.
- **Gmail label support** — if you use a Gmail filter to route bus emails to a label (e.g. "bus") that skips the inbox, configure the label in *Settings → Bus Tracking*.

Configure in *Settings → Bus Tracking*.

---

## Voice & API

### API Tokens

*Settings → Security → API Tokens*

Generate bearer tokens for external integrations (Home Assistant, scripts, Alexa). Each token has:

- A **name** (your label).
- A **scope** — pick the smallest that works:
  - **Voice API only** (default) — confines the token to `/api/v1/voice/*` endpoints. Use this for Alexa skills, voice automations, and anything that just needs to read calendar / tasks / shopping or post messages.
  - **Full access (legacy)** — full account access. Treat like a password.
- An **issued date** + the masked token (the full secret is shown once at creation — save it then or generate a new one).

Scopes are color-badged in the token list (Voice = blue, Full = amber).

### Voice API

`/api/v1/voice/*` is a versioned, token-authenticated API surface for voice and home-automation integrations. Each endpoint returns the shared `{ ok, spoken, data }` shape — the `spoken` field is a pre-formatted natural-language sentence ready to send to a TTS engine (no client-side templating needed).

Current endpoints:

| Endpoint | Returns |
|---|---|
| `GET /api/v1/voice/calendar/today` | Today's events. |
| `GET /api/v1/voice/calendar/upcoming` | Next N upcoming events. |
| `GET /api/v1/voice/family` | Family member list. |
| `GET /api/v1/voice/tasks/today` | Tasks due today. |
| `POST /api/v1/voice/shopping/add` | Add an item to the active shopping list. |
| `POST /api/v1/voice/chore/complete` | Mark a chore complete (respects approval). |
| `POST /api/v1/voice/message/post` | Post a message to the family board. |

Per-token rate limit: 60 requests/minute. Full reference: <https://sandydargoport.github.io/prism/voice-api/>.

### Alexa Skill

If you have an Echo, the personal Alexa skill lets you ask Prism for today's events, today's tasks, the family list, upcoming birthdays, weather, and the school bus ETA — answered out loud.

The skill is a **single-user personal skill**: you generate a Voice-scoped token in Prism, point the skill at your public Prism URL, and Alexa hits your dashboard directly. No AWS Lambda, no third-party hosting.

Setup (one-time, ~10 minutes):

1. Install the Alexa Skill Kit CLI: `npm install -g ask-cli` and `ask configure`.
2. Generate a Voice-scoped token in *Settings → Security → API Tokens*.
3. Add `ALEXA_VOICE_TOKEN=<token>` to your `.env` and recreate the app container.
4. Run `pwsh alexa/deploy.ps1` with `$env:ALEXA_PRISM_HOSTNAME = '<your-public-host>'`.
5. Enable the skill on your Echo via the Alexa app → Skills & Games → Your Skills → Dev.

Then: *"Alexa, ask Prism what's on today."*

Full setup walkthrough in [`alexa/README.md`](https://github.com/sandydargoport/prism/blob/master/alexa/README.md).

---

## Settings Reference

### Family Members
Add, edit, remove family members. Set names, colors, avatars, roles (parent / child), and sort order. Sort order determines column order on calendar views and goal layouts.

### Security
- **Member PINs** — Set or change PINs for each family member.
- **API Tokens** — Generate scoped tokens for external integrations (Home Assistant, Alexa, scripts).

### Connected Accounts
Connect external services via OAuth:
- **Google** — Calendar (read/write) and/or Google Tasks.
- **Microsoft** — To Do, OneDrive.
- **Gmail** — Bus tracking via FirstView emails.
- **Kroger** — Shopping cart push (per-user). Detailed setup in [`docs/features/KROGER.md`](features/KROGER.md).

### Calendars
Manage synced calendars. Enable/disable, assign to members, set display names, override colors. Add iCal sources (read-only).

### Task Sync / Shopping Sync / Wish List Sync
Map Prism lists to Microsoft To Do or Google Tasks lists for bidirectional sync.

### Photos
Manage photo sources (Local upload, OneDrive). Configure OneDrive folder picker, orientation filtering, quality thresholds, and sync. Run GPS backfill on existing photos.

### Bus Tracking
Connect Gmail, configure bus routes, set the Gmail label filter, and use route auto-discovery.

### Babysitter Info
Add emergency contacts, house info (WiFi password — stored AES-256-GCM encrypted), child info, and house rules.

### Display
- **Theme** — Light, Dark, or System.
- **Theme Palette** — Pick from multiple curated color palettes (Default, Ocean, Forest, Sunset, etc.).
- **Seasonal Theme** — Auto / Manual / Off.
- **Performance Mode** — On / Off / Auto-detect (auto-enables on low-power devices).
- **Screensaver Timeout** — Idle time before screensaver activates.
- **Photo Rotation** — Interval for photo changes.
- **Auto-Hide Navigation** — Hide nav after inactivity (wake on click/keyboard/touch).
- **Away Mode Auto-Activation** — Timer for automatic away mode.
- **Calendar Hours** — Hide a time range from day/week views.
- **Week Starts On** — Sunday or Monday (affects calendars, goals, meals).
- **Orientation Override** — Force landscape or portrait.

### Features
Show or hide navigation pages. Dashboard and Settings always visible; everything else can be hidden from the side nav and mobile FAB.

### Backups
Create, download, restore, or delete database backups. Includes dangerous operations (truncate all tables, seed demo data) gated behind explicit confirmation.

### Activity Log
Filterable log of all actions taken in the app — useful for auditing changes and debugging "who did what when."

### About
Version, build info, deep health check status (`/api/health/deep` covers DB, Redis, last backup recency, OAuth token expiry).

---

## Installing as PWA

### iOS (Safari)
1. Open Prism in Safari.
2. Tap **Share** → **Add to Home Screen** → **Add**.

### Android (Chrome)
1. Open Prism in Chrome.
2. Tap **Menu (three dots)** → **Install app**.

### Desktop (Chrome / Edge)
1. Open Prism in your browser.
2. Click the **install icon** in the address bar.

Once installed, Prism opens in its own window without browser chrome. The PWA caches the shell so subsequent loads are instant, even on slow networks.

---

## Mobile Experience

On phones, Prism adapts automatically:

- **Compact headers** save vertical space.
- **Collapsible filters** — tap "Filters" to expand/collapse on list pages.
- **Floating Action Button (FAB)** — bottom-corner button with Home / Reorder / Settings / Login replaces the desktop bottom nav.
- **Mobile dashboard** — single-column summary cards instead of the full grid.
- **Card reorder mode** — tap FAB → Reorder, drag pills, save. Persists per user.
- **Card visibility** — tap FAB → Settings to toggle which dashboard cards show.
- **Agenda-only calendar** — on phone viewports, the calendar shows the agenda view exclusively (no view switcher, no chevrons — header reads "Upcoming Events").
- **Grouped list pages** (Tasks, Chores, Shopping, Wishes, Gift Ideas) — all use single-column layout.
- **Meals** — touch-drag between days.
- **Screensaver and Away Mode** — auto-disabled in PWA mode.
- **Touch optimized** — 44px+ touch targets, swipe navigation on calendars.

---

## Keyboard Shortcuts

| Shortcut | Where | Action |
|---|---|---|
| 0-9 | PIN pad | Enter digit |
| Backspace | PIN pad | Delete last digit |
| Enter | PIN pad | Submit |
| Escape | Modals | Close |
| Ctrl+Enter | Message edit | Save |
| Ctrl+B | Calendar notes | Bold |
| Ctrl+I | Calendar notes | Italic |
| Ctrl+U | Calendar notes | Underline |
| Ctrl+Shift+S | Calendar notes | Strikethrough |
| Ctrl+Shift+L | Calendar notes | Bullet list |
| Ctrl+Shift+M | Layout editor | Toggle measure mode |

---

## Troubleshooting

### Forgot PIN
Ask a parent to reset it in *Settings → Security → Member PINs*.

### Calendar events not showing
1. Check *Settings → Calendars* — is the calendar enabled?
2. Tap **Sync** to force a refresh.
3. Verify the Google connection is still active in *Settings → Connected Accounts*.
4. The server-side sync cron also runs every 10 minutes — wait one cycle.

### Tasks / Shopping / Wishes not syncing
1. Verify the relevant account is connected in *Settings → Connected Accounts*.
2. Check the sync source is enabled in *Settings → Task Sync* / *Shopping Sync* / *Wish List Sync*.
3. Tap **Sync All** to force a refresh.

### Widget not loading
1. Refresh the page (Ctrl+Shift+R for hard reload).
2. Toggle the widget off and on in layout edit mode.
3. Clear browser cache (PWA users: uninstall + reinstall).

### Photos not appearing
1. Check *Settings → Photos* — is the source enabled?
2. Tap **Sync** next to the photo source.
3. Verify the OneDrive folder still exists (folder picker may need re-pointing if you renamed it).

### Kroger connection failing
- See the troubleshooting matrix in [`docs/features/KROGER.md`](features/KROGER.md) for `403 Forbidden`, `kroger_state_mismatch`, `kroger_token_exchange_failed`, and SKU-picker-no-price issues.

### "Bus tracker shows nothing"
1. Confirm Gmail is connected and you've granted access to the bus-emails label.
2. Run **Discover Routes** in *Settings → Bus Tracking* — it'll surface any FirstView emails you've already received.
3. Verify your active days are set correctly (no false "overdue" status on weekends).

### Performance Mode auto-enabled but I don't want it
Set *Settings → Display → Performance Mode* to **Off**. Your explicit choice persists across reloads.

### "Failed to save" / "Failed to add"
Error messages now propagate the actual server-side reason. If the message says "rate limit exceeded", wait a minute and retry (rate limits exist on most mutation endpoints).

---

## Support

- **Documentation**: <https://sandydargoport.github.io/prism/>
- **Report bugs**: [GitHub Issues](https://github.com/sandydargoport/prism/issues)
- **Source code**: [GitHub Repository](https://github.com/sandydargoport/prism)
- **License**: PolyForm Noncommercial 1.0.0 — free for personal and non-commercial use.
