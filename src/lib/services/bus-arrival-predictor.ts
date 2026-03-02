/**
 * Predicts bus arrival times based on historical geofence crossing data.
 * Uses rolling stats on transit times between consecutive checkpoint pairs.
 */

import { db } from '@/lib/db/client';
import { busGeofenceLog, busRoutes } from '@/lib/db/schema';
import { eq, and, gte, desc } from 'drizzle-orm';

export type BusStatus =
  | 'no_data'        // No checkpoint data today
  | 'cold_start'     // < 5 data points per segment, can't predict
  | 'in_transit'     // Bus is between checkpoints
  | 'at_stop'        // Bus arrived at stop
  | 'at_school'      // Bus arrived at school
  | 'overdue';       // Past scheduled time with no recent updates

export interface ArrivalPrediction {
  status: BusStatus;
  etaMinutes: number | null;
  etaRangeLow: number | null;
  etaRangeHigh: number | null;
  lastCheckpointName: string | null;
  lastCheckpointTime: Date | null;
  lastCheckpointIndex: number;
  totalCheckpoints: number;  // includes stop + school
  minutesSinceLastCheckpoint: number | null;
}

interface SegmentStat {
  fromIndex: number;
  toIndex: number;
  medianMinutes: number;
  p25Minutes: number;
  p75Minutes: number;
  sampleCount: number;
}

const MIN_SAMPLES_FOR_PREDICTION = 5;
const HISTORY_DAYS = 30;

/**
 * Get arrival prediction for a bus route.
 */
export async function predictArrival(routeId: string): Promise<ArrivalPrediction> {
  const route = await db.query.busRoutes.findFirst({
    where: eq(busRoutes.id, routeId),
  });

  if (!route) {
    return emptyPrediction(0);
  }

  const checkpoints = (route.checkpoints as { name: string; sortOrder: number }[]) || [];
  // Total checkpoints = user-defined + stop + school
  const totalCheckpoints = checkpoints.length + (route.stopName ? 1 : 0) + (route.schoolName ? 1 : 0);

  // Check if today is an active day for this route (default weekdays [1-5])
  const activeDays = (route.activeDays as number[]) || [1, 2, 3, 4, 5];
  const todayDow = new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  if (!activeDays.includes(todayDow)) {
    return emptyPrediction(totalCheckpoints);
  }

  // Get today's events for this route
  const today = new Date();
  const todayStr = formatDateStr(today);
  const todayEvents = await db.select()
    .from(busGeofenceLog)
    .where(and(
      eq(busGeofenceLog.routeId, routeId),
      eq(busGeofenceLog.tripDate, todayStr),
    ))
    .orderBy(desc(busGeofenceLog.eventTime));

  if (todayEvents.length === 0) {
    // Check if overdue
    if (isOverdue(route.scheduledTime)) {
      return { ...emptyPrediction(totalCheckpoints), status: 'overdue' };
    }
    return emptyPrediction(totalCheckpoints);
  }

  // Latest checkpoint (guaranteed non-empty after length check)
  const latest = todayEvents[0]!;
  const lastCheckpointIndex = latest.checkpointIndex;
  const lastCheckpointName = latest.checkpointName;
  const lastCheckpointTime = latest.eventTime;
  const minutesSince = (Date.now() - lastCheckpointTime.getTime()) / 60000;

  // If bus has reached stop or school, we're done
  if (latest.eventType === 'arrived_at_stop') {
    return {
      status: 'at_stop',
      etaMinutes: 0,
      etaRangeLow: 0,
      etaRangeHigh: 0,
      lastCheckpointName,
      lastCheckpointTime,
      lastCheckpointIndex,
      totalCheckpoints,
      minutesSinceLastCheckpoint: Math.round(minutesSince),
    };
  }

  if (latest.eventType === 'arrived_at_school') {
    return {
      status: 'at_school',
      etaMinutes: 0,
      etaRangeLow: 0,
      etaRangeHigh: 0,
      lastCheckpointName,
      lastCheckpointTime,
      lastCheckpointIndex,
      totalCheckpoints,
      minutesSinceLastCheckpoint: Math.round(minutesSince),
    };
  }

  // Bus is in transit — try to predict remaining time
  const segments = await getSegmentStats(routeId, lastCheckpointIndex, totalCheckpoints);

  // Check if we have enough data for prediction
  const hasEnoughData = segments.every(s => s.sampleCount >= MIN_SAMPLES_FOR_PREDICTION);

  if (!hasEnoughData) {
    return {
      status: 'cold_start',
      etaMinutes: null,
      etaRangeLow: null,
      etaRangeHigh: null,
      lastCheckpointName,
      lastCheckpointTime,
      lastCheckpointIndex,
      totalCheckpoints,
      minutesSinceLastCheckpoint: Math.round(minutesSince),
    };
  }

  // Sum remaining segment times (subtract time already in transit from first segment)
  let etaMedian = 0;
  let etaLow = 0;
  let etaHigh = 0;

  for (const seg of segments) {
    etaMedian += seg.medianMinutes;
    etaLow += seg.p25Minutes;
    etaHigh += seg.p75Minutes;
  }

  // Subtract time already spent since last checkpoint
  etaMedian = Math.max(0, Math.round(etaMedian - minutesSince));
  etaLow = Math.max(0, Math.round(etaLow - minutesSince));
  etaHigh = Math.max(0, Math.round(etaHigh - minutesSince));

  return {
    status: 'in_transit',
    etaMinutes: etaMedian,
    etaRangeLow: etaLow,
    etaRangeHigh: etaHigh,
    lastCheckpointName,
    lastCheckpointTime,
    lastCheckpointIndex,
    totalCheckpoints,
    minutesSinceLastCheckpoint: Math.round(minutesSince),
  };
}

/**
 * Get historical transit time statistics for segments from currentIndex to end.
 */
async function getSegmentStats(
  routeId: string,
  fromCheckpointIndex: number,
  totalCheckpoints: number
): Promise<SegmentStat[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - HISTORY_DAYS);

  // Fetch all historical events for this route
  const events = await db.select()
    .from(busGeofenceLog)
    .where(and(
      eq(busGeofenceLog.routeId, routeId),
      gte(busGeofenceLog.eventTime, cutoff),
    ))
    .orderBy(busGeofenceLog.tripDate, busGeofenceLog.checkpointIndex);

  // Group events by trip date
  const byDate = new Map<string, typeof events>();
  for (const event of events) {
    const key = event.tripDate;
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(event);
  }

  // For each consecutive pair from currentIndex to end, collect transit times
  const segments: SegmentStat[] = [];

  for (let i = fromCheckpointIndex; i < totalCheckpoints - 1; i++) {
    const transitTimes: number[] = [];

    for (const [, dayEvents] of byDate) {
      const from = dayEvents.find(e => e.checkpointIndex === i);
      const to = dayEvents.find(e => e.checkpointIndex === i + 1);
      if (from && to) {
        const minutes = (to.eventTime.getTime() - from.eventTime.getTime()) / 60000;
        if (minutes > 0 && minutes < 120) { // Sanity: skip > 2 hour gaps
          transitTimes.push(minutes);
        }
      }
    }

    transitTimes.sort((a, b) => a - b);
    const count = transitTimes.length;

    segments.push({
      fromIndex: i,
      toIndex: i + 1,
      medianMinutes: count > 0 ? percentile(transitTimes, 50) : 0,
      p25Minutes: count > 0 ? percentile(transitTimes, 25) : 0,
      p75Minutes: count > 0 ? percentile(transitTimes, 75) : 0,
      sampleCount: count,
    });
  }

  return segments;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower]!;
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (index - lower);
}

function emptyPrediction(totalCheckpoints: number): ArrivalPrediction {
  return {
    status: 'no_data',
    etaMinutes: null,
    etaRangeLow: null,
    etaRangeHigh: null,
    lastCheckpointName: null,
    lastCheckpointTime: null,
    lastCheckpointIndex: -1,
    totalCheckpoints,
    minutesSinceLastCheckpoint: null,
  };
}

function isOverdue(scheduledTime: string): boolean {
  const parts = scheduledTime.split(':').map(Number);
  const hours = parts[0] ?? 0;
  const minutes = parts[1] ?? 0;
  const now = new Date();
  const scheduled = new Date(now);
  scheduled.setHours(hours, minutes, 0, 0);
  // Overdue if more than 30 minutes past scheduled time
  return now.getTime() > scheduled.getTime() + 30 * 60000;
}

function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
