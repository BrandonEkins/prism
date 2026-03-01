import type { CalendarEvent } from '@/types/calendar';

/**
 * Collapse events that share the same title and exact start/end times across
 * different calendars. The events still exist in each calendar (nothing is
 * deleted) — we just display one representative per duplicate cluster.
 */
export function deduplicateEvents(events: CalendarEvent[]): CalendarEvent[] {
  const seen = new Map<string, CalendarEvent>();
  for (const event of events) {
    const key = `${event.title}|${event.startTime.getTime()}|${event.endTime.getTime()}`;
    if (!seen.has(key)) {
      seen.set(key, event);
    }
  }
  return Array.from(seen.values());
}
