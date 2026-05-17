# First-Time Setup

After [installing Prism](install.md) and logging in for the first time, walk through these steps to get a usable family dashboard.

## 1. Add family members

**Settings → Family Members → Add Member.**

Each member gets a name, role (parent or child), and an avatar. Parents can approve chores, exit Away Mode, and redeem goals; children get a more limited UI.

## 2. Set PINs

**Settings → Security.**

Pick a 4-digit PIN for each member. The PIN auto-submits after 4 digits, so it's fast on shared devices. Default PINs (`1234` for parent, `0000` for child) work until you change them — don't ship a public deployment with defaults.

## 3. Connect integrations

**Settings → Integrations.**

Most families want at least:

- **Google Calendar** — for school, work, and shared family events. OAuth-based bidirectional sync.
- **Weather** — Open-Meteo is the zero-config default (no API key). OpenWeatherMap and Pirate Weather are alternatives.
- **OneDrive** — for the photo slideshow on the screensaver and the dashboard photo widget.
- **Microsoft To Do** — if your family already uses it for tasks, shopping, or wish lists.

Optional but popular:

- **[Kroger / Mariano's cart push](../features/KROGER.md)** — send your shopping list straight into your online cart for pickup or delivery.
- **Gmail + FirstView** — school bus arrival tracking via geofence email notifications.

## 4. Customize the dashboard

Click the **Edit** button (top right) to enter layout mode. Drag widgets, resize them on the 48-column grid, and add new ones from the widget picker. Save when you're done.

Each "display" (e.g. `/d/kitchen`, `/d/bedroom`) has its own independent layout and screensaver. The default URL `/` is one of them.

## 5. Install as a PWA

On phones, tablets, and even desktop Chromium, the **Install** prompt adds Prism to the home screen. It launches without browser chrome and runs offline-tolerant for already-loaded data.

On iOS Safari: Share → Add to Home Screen.

---

Next: [updating Prism](updating.md), or jump to the [user guide](../HELP.md) for the full feature tour.
