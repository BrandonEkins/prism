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

### [Messages](features/MESSAGES.md)

Family message board. Post, pin, mark important, set expiration, edit-in-place, group by person.

### [Wishes & Gift Ideas](features/WISHES.md)

Per-member wish lists with secret claim tracking, plus private gift-idea tracking for the gift-giver side.

### [Photos](features/PHOTOS.md)

Local uploads + OneDrive sync with folder picker. Geotagging powers the Travel Map photo strip. Used by the screensaver, dashboard wallpaper, and slideshow widget.

### [Travel Map](features/TRAVEL.md)

Interactive 3D globe for tracking visited places, bucket-list destinations, and multi-stop trips (route / loop / hub). Geotagged photos auto-link to nearby pins.

### [Weekend Ideas](features/WEEKEND.md)

Family activity board for local places to visit. Backlog, visited tracking, ratings, tags, favorites.

### [Bus Tracking](features/BUS.md)

School bus arrival predictions via Gmail/FirstView email parsing. Adaptive polling, route auto-discovery, AM/PM trips per student.

### [Display Modes](features/DISPLAY-MODES.md)

Screensaver, Away Mode, and Babysitter Mode — three overlay modes that layer on top of the dashboard for idle, privacy, and caregiver scenarios.

### [Mobile & PWA](features/MOBILE.md)

Installable as a PWA on iOS, Android, and desktop. Phone viewports get a Floating Action Button (FAB), simplified single-column dashboard, and agenda-only calendar.

### Integrations

- **[Kroger / Mariano's cart push](features/KROGER.md)** — send your shopping list to your online cart at any Kroger banner.
- **[Home Assistant](home-assistant.md)** — read Prism data into HA via the Voice API tokens.
- **[Voice API + Alexa skill](voice-api.md)** — token-authenticated `/api/v1/voice/*` endpoints; personal Alexa skill for asking "Alexa, ask Prism what's on today."

---

## Other features (covered inline below)

A few smaller surfaces are documented here rather than on dedicated pages.

### Chores

The flip side of [Goals & Points](features/GOALS.md). Parents create chores with a frequency (daily / weekly / biweekly / monthly / quarterly / annually) and a point value. Kids mark complete; parent approves; points flow into the goals waterfall. Each chore can have a custom reset day (which day of the week for weekly chores, which day of the month for monthly, MM-DD for annual).

Views: **Group by Person** (cards per family member), **List view** (sortable), **History** (recent completions with approval status). Approved chores stay visible for 24 hours.

### Meals

Weekly meal planner. Plan meals by day + meal type (breakfast / lunch / snack / dinner). Link recipes from the [Recipes](features/RECIPES.md) library so opening a planned meal jumps to its recipe. Mark as cooked to track. Drag between days — including from the dashboard Meals widget on touch devices. Week starts on your configured day (*Settings → Display → Week Starts On*).

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
