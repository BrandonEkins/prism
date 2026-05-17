export async function register() {
  // Force IPv4-only connections for all fetch() calls.
  // Docker Desktop's bridge network does not route IPv6, so undici (Node's
  // built-in fetch) hangs trying IPv6 addresses before falling back to IPv4.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // undici is bundled with Node 18+ but has no separate @types package;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { setGlobalDispatcher, Agent } = require('undici') as {
      setGlobalDispatcher: (d: unknown) => void;
      Agent: new (opts: { connect: { family: number } }) => unknown;
    };
    setGlobalDispatcher(new Agent({ connect: { family: 4 } }));

    startCalendarSyncCron();
  }
}

/**
 * Server-side calendar sync cron.
 *
 * Calendar sync was previously client-driven — `useCalendarEvents` would
 * fire `/api/calendars/sync` on a 10-minute timer, but only while a logged-in
 * client had the dashboard or calendar page open. If nobody looked at Prism
 * for hours (or sessions broke during a deploy), events silently went stale.
 *
 * This cron runs in the long-lived Node process so sync keeps happening
 * regardless of who's looking. Disabled in tests / when PRISM_DISABLE_CALENDAR_CRON
 * is set so dev runs don't burn through Google API quota.
 */
const CALENDAR_SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const CALENDAR_SYNC_INITIAL_DELAY_MS = 60 * 1000; // wait 1 min after boot

async function runCalendarSyncOnce() {
  try {
    const { syncAllGoogleCalendars, syncAllIcalCalendars } = await import(
      './lib/services/calendar-sync'
    );
    const { invalidateEntity } = await import('./lib/cache/cacheKeys');

    const [google, ical] = await Promise.all([
      syncAllGoogleCalendars(),
      syncAllIcalCalendars(),
    ]);
    const total = google.total + ical.total;
    const errors = [...google.errors, ...ical.errors];

    // Invalidate the events cache so the next page load sees the freshly
    // synced data rather than the stale window from before sync ran.
    await invalidateEntity('events');

    if (errors.length > 0) {
      console.warn(`[calendar-cron] synced ${total} events with ${errors.length} errors:`, errors.slice(0, 3));
    } else {
      console.log(`[calendar-cron] synced ${total} events`);
    }
  } catch (err) {
    // Never let the cron loop crash the process.
    console.error('[calendar-cron] tick failed:', err);
  }
}

function startCalendarSyncCron() {
  if (process.env.PRISM_DISABLE_CALENDAR_CRON === 'true') {
    console.log('[calendar-cron] disabled via PRISM_DISABLE_CALENDAR_CRON');
    return;
  }
  if (process.env.NODE_ENV === 'test') return;

  setTimeout(() => {
    void runCalendarSyncOnce();
    setInterval(() => void runCalendarSyncOnce(), CALENDAR_SYNC_INTERVAL_MS);
  }, CALENDAR_SYNC_INITIAL_DELAY_MS);

  console.log(
    `[calendar-cron] scheduled every ${CALENDAR_SYNC_INTERVAL_MS / 1000}s (first run in ${CALENDAR_SYNC_INITIAL_DELAY_MS / 1000}s)`,
  );
}
