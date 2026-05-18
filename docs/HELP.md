# Prism User Guide

A configurable family dashboard for large wall-mounted screens, tablets, and phones. Connects to Google Calendar, Microsoft To Do, Google Tasks, OneDrive, Kroger, Gmail/FirstView, and more — surfacing the information your family actually needs in one place.

> **This page is the overview.** For deep-dive guides on each feature, follow the links below.

---

## First-time setup

Five quick steps:

1. **Install Prism** — [installation guide](getting-started/install.md).
2. **Add family members** — *Settings → Family Members → Add Member.* Each gets a name, color, avatar, role (parent or child), and a 4-digit PIN.
3. **Set PINs** in *Settings → Security.* Change the defaults (`1234` parent / `0000` child) before sharing.
4. **Connect integrations** — *Settings → Connected Accounts.* Most families want at least Google Calendar, weather (Open-Meteo is the zero-config default), and OneDrive. See the [first-time setup walkthrough](getting-started/first-time-setup.md).
5. **Customize the dashboard** — click the **grid icon** to enter layout edit mode and arrange widgets.

When you're done with setup, install Prism as a PWA on phones and tablets — [Mobile guide](features/MOBILE.md).

---

## Logging in

Tap your avatar, enter your 4-digit PIN. The PIN auto-submits after 4 digits. Keyboard input works too (0-9, Backspace, Enter). Once logged in, your session stays active for 7 days (or 1 day if you check "this is a shared device").

---

## Roles

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

## Features

### [Calendar](features/CALENDAR.md)

Multiple sources (Google OAuth + iCal subscriptions), ten view modes (Agenda / Day / List / Schedule / 1W-4W / Month / 3 Months), drag-and-drop, click-to-edit from the dashboard widget, server-side sync cron, calendar notes, hidden hours, view options menu. Mobile collapses to Agenda only.

### [Shopping](features/SHOPPING.md)

Multiple lists with category layouts, per-person attribution, camera + USB barcode scanning, Microsoft To Do bidirectional sync, and one-click push to your online Kroger cart at any banner.

### [Recipes](features/RECIPES.md)

URL import (schema.org), Paprika import, paste-text import (OCR-friendly with ingredient sections), per-recipe photo upload, ½× / 1× / 2× / 3× / 4× scaling pills, "Add to Shopping List" with the active scale applied.

### [Tasks](features/TASKS.md)

To-do items with assignment, due dates, priorities, lists, nested grouping (Person → List), bidirectional sync to **Microsoft To Do or Google Tasks**.

### [Goals & Points](features/GOALS.md)

Kids earn points from approved chores. Parents set goals — recurring (allowance) or one-time (LEGO set). Waterfall allocation fills goals in priority order. Seasonal celebration animations when a goal is achieved.

### [Mobile & PWA](features/MOBILE.md)

Installable as a PWA on iOS, Android, and desktop. Phone viewports get a Floating Action Button (FAB), simplified single-column dashboard, and agenda-only calendar.

### Integrations

- **[Kroger / Mariano's cart push](features/KROGER.md)** — send your shopping list to your online cart at any Kroger banner.
- **[Home Assistant](home-assistant.md)** — read Prism data into HA via the Voice API tokens.
- **[Voice API + Alexa skill](voice-api.md)** — token-authenticated `/api/v1/voice/*` endpoints; personal Alexa skill for asking "Alexa, ask Prism what's on today."

---

## Other features (covered inline below)

The following features are smaller in scope; they're documented here rather than getting their own page.

### Chores

The flip side of [Goals & Points](features/GOALS.md). Parents create chores with a frequency (daily / weekly / biweekly / monthly / quarterly / annually) and a point value. Kids mark complete; parent approves; points flow into the goals waterfall. Each chore can have a custom reset day (which day of the week for weekly chores, which day of the month for monthly, MM-DD for annual).

Views: **Group by Person** (cards per family member), **List view** (sortable), **History** (recent completions with approval status). Approved chores stay visible for 24 hours.

### Meals

Weekly meal planner. Plan meals by day + meal type (breakfast / lunch / snack / dinner). Link recipes from the [Recipes](features/RECIPES.md) library so opening a planned meal jumps to its recipe. Mark as cooked to track. Drag between days — including from the dashboard Meals widget on touch devices. Week starts on your configured day (*Settings → Display → Week Starts On*).

### Messages

Family message board for shared updates.

- **Post** messages attributed to whoever's logged in.
- **Pin** important ones to the top.
- **Mark as important** for visual emphasis.
- **Set expiration** (12h / 1d / 2d / 3d / 7d) for temporary notices.
- **Edit** — pencil icon, edit in place, Ctrl+Enter to save.
- **Delete** — authors can delete their own; parents can delete any.
- **Group by Person** toggle organizes into person-colored cards.

### Wishes & Gift Ideas

**My Wishes Tab.** Each family member has their own wish list. Others can view and **secretly mark items as purchased** — the owner doesn't see who claimed what.

- Quick-add input at the top of the list (name, URL, notes).
- **Claim** marks as purchased, hidden from the owner.
- **Cross off** — owner can cross off items themselves; if someone else already secretly bought it, the message reads "Someone already got this for you!"
- Optional **Microsoft To Do sync** per member (*Settings → Wish List Sync*).

**Gift Ideas Tab.** Private per-user gift idea tracking for other family members.

- Each person sees columns for every OTHER family member.
- Add gift ideas with name, link, price, notes.
- Mark as purchased.
- **Privacy** — only you can see your own gift ideas. Never visible to the recipient or other family members.
- Gift ideas do NOT sync to Microsoft To Do (privacy protection).

### Photos

Photo gallery with local uploads and OneDrive sync.

- **Gallery** — browse with lightbox view.
- **Slideshow** — auto-rotating display, used by the screensaver.
- **Sources** — local uploads + OneDrive sync (with **folder picker** so you don't have to sync the root).
- **GPS backfill** — read EXIF GPS from already-synced photos without re-downloading (used by Travel Map photo linking).
- **Orientation filter** — show only landscape / portrait / square.
- **Pin photo** — set as wallpaper or screensaver background.

### Travel Map

Interactive 3D globe for tracking family travel.

- **Places** — drop pins for visited / want-to-go / bucket list places. Filter by status, year, country.
- **Trips** — multi-stop journeys: **Route** (A→B→C), **Loop** (closed), or **Hub** (home base + spokes). National park stops as sub-pins.
- **GPS photo linking** — geotagged OneDrive photos auto-match to nearby pins. Photo strip on each pin's detail panel.
- **Globe controls** — drag to rotate, scroll/pinch to zoom, sun/moon toggle for dark map.

### Weekend Ideas

A family activity board for local places to visit.

- **Backlog** of places to try.
- **Visited tracking** with 1-5 star rating.
- **Favorites** flag.
- **Tags** — outdoor / hike / nature / food / museum / farm. Grouped into emoji-headed category sections.
- **Filters** — status, favorites, tags, search.
- **Visit frequency** — pip dots grouped in 5s.

### Bus Tracking

School bus arrival predictions via Gmail / FirstView email parsing.

- Configure per student with AM/PM trips.
- Adaptive polling — scales from 60s down to 10s as the bus approaches.
- Active-days awareness (no false "overdue" on weekends).
- Route auto-discovery scans existing emails to propose routes.
- Gmail label filter support (if your bus emails skip the inbox).
- Dashboard + screensaver widgets with status dots + ETA.

### Display Modes

- **Screensaver** — photo slideshow after idle timeout. Each dashboard has its own screensaver layout. Configurable timeout (1 / 5 / 15 / 30 / 60 min) and rotation interval.
- **Away Mode** — privacy overlay with photos + clock + weather. Activate manually (shield icon) or auto-activate after 4h / 8h / 1 day / 1 week of inactivity. Exit requires parent PIN.
- **Babysitter Mode** — caregiver information overlay with emergency contacts, WiFi (with QR code), child info (allergies, bedtime, medications), house rules. Sections can be marked sensitive to require PIN unlock. Public URL `/babysitter` works without login (for sharing the link with the caregiver before they arrive).

### Performance Mode

Auto-enabled on devices reporting ≤2 GB RAM or ≤4 CPU cores. Stretches polling intervals ~2.5×, renders Photo widget as a single static image instead of a slideshow, dials back animations. Lightning-bolt badge appears in the dashboard header while active. Override in *Settings → Display → Performance Mode*.

---

## Settings reference

A short tour of *Settings*. (Each section's deep behavior is documented in the linked feature pages above where relevant.)

- **Family Members** — add / edit / remove members. Names, colors, avatars, roles, sort order.
- **Security** — PINs + API tokens (with Voice / Full scope picker).
- **Connected Accounts** — Google (Calendar, Tasks), Microsoft (To Do, OneDrive), Gmail (bus tracking), Kroger (shopping cart push).
- **Calendars** — manage synced calendars; iCal subscriptions; per-calendar enable/assign/color.
- **Task Sync / Shopping Sync / Wish List Sync** — map Prism lists to Microsoft To Do or Google Tasks lists.
- **Photos** — manage sources (Local, OneDrive); folder picker; orientation filter; GPS backfill.
- **Bus Tracking** — Gmail connection, route configuration, route auto-discovery, Gmail label filter.
- **Babysitter Info** — emergency contacts, house info (WiFi password stored AES-256-GCM encrypted), child info, house rules.
- **Display** — Theme (Light / Dark / System), Theme Palette, Seasonal Theme, Performance Mode, Screensaver Timeout, Photo Rotation, Auto-Hide Navigation, Away Mode Auto-Activation, Calendar Hours (hidden hours range), Week Starts On, Orientation Override.
- **Features** — show / hide individual nav pages.
- **Backups** — create, download, restore, or delete database backups. Includes dangerous operations (Truncate, Seed demo data) gated behind explicit confirmation.
- **Activity Log** — filterable log of every action taken in the app.

---

## Installing as PWA

See the dedicated [Mobile & PWA guide](features/MOBILE.md) for OS-specific steps and tips.

---

## Keyboard shortcuts

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

For feature-specific troubleshooting, each feature page has its own section:

- [Calendar troubleshooting](features/CALENDAR.md#troubleshooting)
- [Shopping troubleshooting](features/SHOPPING.md#troubleshooting)
- [Recipes troubleshooting](features/RECIPES.md#troubleshooting)
- [Tasks troubleshooting](features/TASKS.md#troubleshooting)
- [Goals & Points troubleshooting](features/GOALS.md#troubleshooting)
- [Mobile & PWA troubleshooting](features/MOBILE.md#troubleshooting)
- [Kroger troubleshooting](features/KROGER.md#troubleshooting)

Common gotchas:

### Forgot PIN

Ask a parent to reset in *Settings → Security → Member PINs.*

### Stuck in Away or Babysitter Mode

A parent PIN exits both modes. If you forgot it, run `docker exec prism-db psql -U prism -d prism -c "UPDATE users SET pin='\$2a\$12\$...' WHERE role='parent';"` to manually reset — see the install guide for details.

### "Failed to save" / "Failed to add"

Error messages now propagate the actual server-side reason in v1.8. If you see "rate limit exceeded", wait a minute and retry. Other failures will surface the underlying issue (validation error, database constraint, etc.).

### Widget not loading

Refresh the page (Ctrl+Shift+R for a hard reload). For PWA installs: uninstall + reinstall.

---

## Support

- **Documentation**: <https://sandydargoport.github.io/prism/>
- **Report bugs**: [GitHub Issues](https://github.com/sandydargoport/prism/issues)
- **Source code**: [GitHub Repository](https://github.com/sandydargoport/prism)
- **License**: PolyForm Noncommercial 1.0.0 — free for personal and non-commercial use.
