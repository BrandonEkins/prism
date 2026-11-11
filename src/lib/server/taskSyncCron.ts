/**
 * Server-side task sync cron.
 *
 * Why: task sync was client-driven. The dashboard's auto-sync checks
 * document.cookie for prism_session, which is httpOnly and never visible
 * there, so it never ran; the Tasks page syncs only while a parent has it
 * open. A wall display showing the dashboard therefore never pulled changes
 * from Google Tasks or Microsoft To Do. Same reasoning as calendarSyncCron.
 *
 * Kept in its own file so the edge bundle of instrumentation.ts never pulls
 * in the db client and provider code.
 */

import { syncStaleTaskSources } from '@/lib/services/task-source-sync';

const INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const INITIAL_DELAY_MS = 2 * 60 * 1000; // after boot, clear of the calendar cron's first run
// Matches the pages' AUTO_SYNC_STALE_MINUTES, so a source an open Tasks page
// just synced is skipped rather than synced twice.
const STALE_MINUTES = 5;

async function runOnce() {
  try {
    const { synced, skipped, created, updated, errors } = await syncStaleTaskSources(STALE_MINUTES);
    const line = `[task-cron] synced ${synced} source(s), skipped ${skipped}: ${created} created, ${updated} updated`;
    if (errors.length > 0) {
      console.warn(`${line} with ${errors.length} errors:`, errors.slice(0, 3));
    } else {
      console.log(line);
    }
  } catch (err) {
    // Never let a transient sync failure crash the cron loop.
    console.error('[task-cron] tick failed:', err);
  }
}

export function startTaskSyncCron(): void {
  if (process.env.PRISM_DISABLE_TASK_CRON === 'true') {
    console.log('[task-cron] disabled via PRISM_DISABLE_TASK_CRON');
    return;
  }
  if (process.env.NODE_ENV === 'test') return;

  setTimeout(() => {
    void runOnce();
    setInterval(() => void runOnce(), INTERVAL_MS);
  }, INITIAL_DELAY_MS);

  console.log(
    `[task-cron] scheduled every ${INTERVAL_MS / 1000}s (first run in ${INITIAL_DELAY_MS / 1000}s)`,
  );
}
