# Prism Help Guide

A complete guide to using Prism, the self-hosted family dashboard.

---

## Getting Started

### What is Prism?

Prism is a free, self-hosted family dashboard that brings together calendars, tasks, chores, shopping lists, meals, photos, and more into one shared hub. It's designed for always-on displays (tablets, kiosks, TVs) with a PIN-based login system that works for all ages.

### First-Time Setup

1. **Add family members** in Settings > Family Members
2. **Set PINs** for each member in Settings > Security
3. **Connect integrations** (Google Calendar, Microsoft To Do, OneDrive, weather)
4. **Customize your dashboard** layout using the Edit button
5. **Install as PWA** on phones and tablets for quick access

### Logging In

Tap a family member's avatar, then enter their 4-digit PIN. The PIN auto-submits after 4 digits. Keyboard input works too (0-9, Backspace, Enter).

---

## Roles & Permissions

| | Parent | Child |
|---|---|---|
| View dashboard & pages | Yes | Yes |
| Complete chores | Yes (auto-approved) | Yes (requires parent approval) |
| Approve chores | Yes | No |
| Edit settings | Yes | No |
| Manage family members | Yes | No |
| Redeem goals | Yes | No |
| Exit Away/Babysitter Mode | Yes (PIN required) | No |
| Add tasks, messages, wishes | Yes | Yes |
| Delete others' messages | Yes | No |

---

## Dashboard

The dashboard is the main hub, displaying live data through customizable widgets on a grid layout.

### Available Widgets

- **Clock** - Current time
- **Weather** - Temperature, conditions, humidity, wind (requires OpenWeatherMap)
- **Calendar** - Upcoming events with multiple view options (agenda, day, week, month)
- **Tasks** - To-do items with completion status
- **Chores** - Pending and due chores
- **Shopping** - Active shopping list items
- **Meals** - Weekly meal plan
- **Messages** - Family message board
- **Photos** - Rotating photo slideshow
- **Points** - Goal progress with point waterfall
- **Birthdays** - Upcoming family birthdays
- **Wishes** - Family member wish lists
- **Bus Tracker** - School bus arrival predictions

### Editing the Layout

1. Tap the **pencil icon** in the dashboard header (parent only)
2. **Drag** widgets to reposition, **resize** by dragging corners
3. Use the **Widgets** menu to show/hide widgets
4. Adjust **background color and opacity** per widget
5. **Save** when done, or **Save As** to create a named layout
6. Load **Templates** for pre-designed layouts

### Multiple Dashboards

Create separate dashboards for different rooms or purposes:
- Default dashboard lives at `/`
- Named dashboards get URLs like `/d/kitchen` or `/d/living-room`
- Each has its own widget layout, screensaver layout, and orientation
- Switch between them via the dropdown in the editor toolbar

### Screensaver

Activates automatically after a configurable idle period. Shows a photo slideshow with optional widgets (clock, weather, etc.). Edit the screensaver layout separately using the "Screensaver" toggle in edit mode.

Configure in Settings > Display:
- **Screensaver timeout** - How long before it activates
- **Photo rotation interval** - How often photos change
- **Pin a photo** - Use one static image instead of rotating

### Mobile Dashboard

On phones, the dashboard shows a simplified single-column layout with summary cards for each feature. Tap any card to navigate to the full page.

---

## Calendar

### Views

- **Agenda** - Upcoming events in a scrollable list
- **Day** - Hourly breakdown with side-by-side calendar columns
- **Week** - 7-day grid with hourly rows
- **List** - Vertical week view with events listed per day
- **Multi-Week** - 1W, 2W, 3W, or 4W configurable views
- **Month** - Full month grid
- **3 Month** - Three months side-by-side

### Calendar Groups

Events are organized by calendar source. In split views (Day, List), events appear in separate columns per calendar group. Use the **Merge/Split** toggle to combine into one column.

### Calendar Notes

Click the **sticky note icon** to show a notes panel alongside Day or List views. Notes are day-tied, shared across the family, and support formatting:
- **Ctrl+B** Bold, **Ctrl+I** Italic, **Ctrl+U** Underline
- **Ctrl+Shift+S** Strikethrough, **Ctrl+Shift+L** Bullet list
- Type `- ` at the start of a line to auto-convert to a bullet

### Hidden Hours

Hide a time range from day and week views (e.g., hide midnight to 6 AM). Configure in Settings > Display > Calendar Hours. Toggle visibility with the clock button in calendar views.

### Navigation

- **Previous/Next** arrows to move between periods
- **Today** button to jump back to current date
- **Swipe** left/right on touch devices to navigate
- **Grid lines** toggle for bordered/borderless cell display

---

## Tasks

Create and manage to-do items with optional assignment, due dates, priorities, and categories.

- **Add** via the "Add Task" button or inline text input
- **Complete** by tapping the checkbox
- **Filter** by person, priority, or category
- **Sort** by due date, priority, or category
- **Group by Person** to see tasks organized by family member
- **Sync** with Microsoft To Do (configure in Settings > Task Sync)

---

## Chores

Family chores with an approval workflow and point system.

### How It Works

1. A parent creates a chore with a frequency (daily, weekly, etc.) and point value
2. A child marks it complete - it enters "Pending Approval" state
3. A parent approves it - points are awarded and `nextDue` advances
4. If a parent completes it themselves, it's auto-approved

### Reset Day

Each chore can have a custom reset day:
- **Weekly/Biweekly**: Which day of the week (Sun-Sat, defaults to Sunday)
- **Monthly/Quarterly**: Which day of the month (1-28)
- **Annually**: Specific date (MM-DD format)

Set this in the Add/Edit Chore modal.

### Views

- **Group by Person** - Cards per family member showing their chores
- **List view** - All chores in a sortable list
- **History** - Recent completions with approval status

---

## Goals & Points

Set family goals that children work toward by earning points from chore completions.

### Setup

1. Go to Goals page, tap **Add Goal**
2. Set a name, emoji, and point cost
3. Choose **Recurring** (resets weekly/monthly/yearly) or **One-time** (accumulates until redeemed)
4. Set priority order - points fill higher-priority goals first

### How Points Work

Points are earned from approved chore completions. The **waterfall** system allocates points in priority order:
1. Highest priority recurring goal gets filled first
2. Overflow goes to the next goal
3. Non-recurring goals accumulate across weeks

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

---

## Shopping

Manage multiple shopping lists with categories and per-person tracking.

- **Multiple lists** - Groceries, Hardware, General, etc.
- **Categories** - Produce, Dairy, Bakery, Meat, Frozen, etc.
- **Group by person** - See who requested each item
- **Shopping mode** - Simplified view for in-store use
- **Reorder** - Drag items to arrange by store layout
- **Sync** with Microsoft To Do (configure in Settings > Shopping Sync)

---

## Meals

Weekly meal planner with recipe integration.

- **Plan meals** by dragging recipes to days of the week
- **Multiple meal types** - Breakfast, Lunch, Dinner, Snack
- **Link recipes** from your recipe library
- **Mark as cooked** to track what's been prepared
- Week starts on your configured day (Settings > Display > Week Starts On)

---

## Recipes

Browse, import, and manage recipes.

- **Import from URL** - Paste a recipe URL (supports schema.org sites like AllRecipes)
- **Import from Paprika** - Upload Paprika HTML export files
- **Browse** - Search and filter your recipe library
- **View** - Ingredients, instructions, prep/cook time, servings

---

## Messages

Family message board for shared updates.

- **Post** messages attributed to whoever is logged in
- **Pin** important messages to the top
- **Mark as important** for visual emphasis
- **Set expiration** (12h, 1d, 2d, 3d, 7d) for temporary notices
- **Edit** - Click the pencil icon to edit in place (Ctrl+Enter to save)
- **Delete** - Authors can delete their own; parents can delete any message

---

## Wishes

Per-family-member wish lists with optional Microsoft To Do sync.

### My Wishes Tab

Each family member has their own wish list. Others can view and secretly mark items as purchased (the owner doesn't see who purchased what).

- **Add** items with name, link, and notes
- **Claim** - Mark as purchased (secret from the wish owner)
- **Cross off** - Owner can cross off items they got themselves
- **Sync** with Microsoft To Do (configure per member in Settings > Wish List Sync)

### Gift Ideas Tab

Private per-user gift idea tracking for other family members.

- Each person sees columns for every OTHER family member
- Add gift ideas with name, link, price, and notes
- Mark ideas as purchased
- **Privacy**: Only you can see your own gift ideas. They are never visible to the recipient or other family members.
- Gift ideas do not sync to Microsoft To Do (privacy protection)

---

## Photos

Photo gallery with local uploads and OneDrive sync.

- **Gallery** - Browse all photos with lightbox view
- **Slideshow** - Auto-rotating photo display
- **Sources** - Local uploads or OneDrive sync
- **Orientation filter** - Show only landscape, portrait, or square
- **Pin photo** - Set as wallpaper or screensaver background

Configure in Settings > Photos.

---

## Away Mode

Privacy overlay for when the dashboard is unattended.

- Shows photo slideshow with clock and weather in a header bar
- **Activate**: Tap the shield icon in the dashboard header
- **Auto-activate**: Configure in Settings > Display (4h, 8h, 1 day, 1 week)
- **Exit**: Tap anywhere, then enter a parent PIN

---

## Babysitter Mode

Caregiver information overlay with essential household details.

- **Emergency contacts** with phone numbers
- **House info** - WiFi (with QR code), door codes, address
- **Child info** - Allergies, medications, bedtime, special notes
- **House rules** - Guidelines for the caregiver
- **Activate**: Tap the babysitter icon in the dashboard header
- **Exit**: Tap anywhere, then enter a parent PIN

Configure information in Settings > Babysitter Info. Mark items as sensitive to require PIN unlock.

The babysitter info page is also available at `/babysitter` without login.

---

## Bus Tracking

School bus arrival predictions via Gmail/FirstView integration.

- Parses bus notification emails to predict arrival times
- Configurable routes per student with AM/PM trips
- Dashboard widget and screensaver widget
- Configure in Settings > Bus Tracking

---

## Settings Reference

### Family Members
Add, edit, remove family members. Set names, colors, avatars, and roles.

### Security
- **Member PINs** - Set or change PINs for each family member
- **API Tokens** - Generate tokens for external integrations (Home Assistant, scripts)

### Connected Accounts
Connect Google (Calendar) and Microsoft (To Do, OneDrive) accounts via OAuth.

### Calendars
Manage synced calendars. Enable/disable, assign to members, create calendar groups.

### Task Sync / Shopping Sync / Wish List Sync
Map Prism lists to Microsoft To Do lists for bidirectional sync.

### Photos
Manage photo sources (Local, OneDrive). Configure orientation, quality thresholds, sync.

### Bus Tracking
Configure Gmail connection and bus routes.

### Babysitter Info
Add emergency contacts, house info, child info, and house rules.

### Display
- **Theme** - Light, Dark, or System
- **Seasonal Theme** - Auto, Manual, or Off
- **Screensaver Timeout** - Idle time before screensaver activates
- **Photo Rotation** - Interval for photo changes
- **Auto-Hide Navigation** - Hide nav after inactivity
- **Away Mode Auto-Activation** - Timer for automatic away mode
- **Calendar Hours** - Hide a time range from day/week views
- **Week Starts On** - Sunday or Monday (affects calendars, goals, meals)
- **Orientation Override** - Force landscape or portrait

### Features
Show or hide navigation pages. Dashboard and Settings always visible.

### Backups
Create, download, restore, or delete database backups. Includes dangerous operations (truncate, seed demo data).

### Activity Log
View a filterable log of all actions taken in the app.

---

## Installing as PWA

### iOS (Safari)
1. Open Prism in Safari
2. Tap **Share** > **Add to Home Screen**
3. Tap **Add**

### Android (Chrome)
1. Open Prism in Chrome
2. Tap **Menu (three dots)** > **Install app**

### Desktop (Chrome/Edge)
1. Open Prism in your browser
2. Click the **install icon** in the address bar

Once installed, Prism opens in its own window without browser chrome.

---

## Mobile Experience

On phones, Prism adapts automatically:
- **Compact headers** save vertical space
- **Collapsible filters** - tap "Filters" to expand/collapse
- **Bottom navigation** with primary pages + More menu
- **Mobile dashboard** with summary cards instead of the full grid
- **Touch optimized** - 44px+ touch targets, swipe navigation on calendars

---

## Keyboard Shortcuts

| Shortcut | Where | Action |
|----------|-------|--------|
| 0-9 | PIN pad | Enter digit |
| Backspace | PIN pad | Delete last digit |
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
Ask a parent to reset it in Settings > Security > Member PINs.

### Calendar events not showing
1. Check Settings > Calendars - is the calendar enabled?
2. Tap "Sync" to force a refresh
3. Verify the Google/Microsoft connection is still active

### Tasks/Shopping not syncing with Microsoft
1. Verify Microsoft is connected in Settings > Connected Accounts
2. Check the sync source is enabled in Settings > Task Sync / Shopping Sync
3. Tap "Sync All" to force a refresh

### Widget not loading
1. Refresh the page
2. Toggle the widget off and on in edit mode
3. Clear browser cache

### Photos not appearing
1. Check Settings > Photos - is the source enabled?
2. Tap "Sync" next to the photo source
3. Verify the OneDrive folder still exists

---

## Support

- **Report bugs**: [GitHub Issues](https://github.com/sandydargoport/prism/issues)
- **Source code**: [GitHub Repository](https://github.com/sandydargoport/prism)
- **License**: AGPL-3.0 (free and open source)
