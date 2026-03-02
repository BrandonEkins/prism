import { NextResponse } from 'next/server';
import { getDisplayAuth } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { busRoutes } from '@/lib/db/schema';
import { getCached } from '@/lib/cache/redis';
import { getRedisClient } from '@/lib/cache/getRedisClient';
import { predictArrival } from '@/lib/services/bus-arrival-predictor';
import { isGmailConnected, syncBusEmails } from '@/lib/services/bus-tracking-sync';

/** Fire-and-forget: sync Gmail emails at most every 60s via Redis lock */
async function triggerSyncIfNeeded() {
  const client = await getRedisClient();
  if (client) {
    const acquired = await client.set('bus:sync-lock', '1', { NX: true, EX: 60 });
    if (!acquired) return; // synced recently
  }
  await syncBusEmails();
}

export async function GET() {
  const auth = await getDisplayAuth();
  if (!auth) {
    return NextResponse.json({ routes: [], connected: false });
  }

  // Trigger background email sync (debounced, non-blocking)
  triggerSyncIfNeeded().catch(err =>
    console.error('Background bus sync failed:', err instanceof Error ? err.message : err)
  );

  try {
    const data = await getCached('bus:status', async () => {
      const routes = await db.select().from(busRoutes).where(eq(busRoutes.enabled, true));
      const connected = await isGmailConnected();

      const routesWithStatus = await Promise.all(
        routes.map(async (route) => {
          const prediction = await predictArrival(route.id);
          return {
            id: route.id,
            label: route.label,
            studentName: route.studentName,
            direction: route.direction,
            scheduledTime: route.scheduledTime,
            checkpoints: route.checkpoints,
            stopName: route.stopName,
            schoolName: route.schoolName,
            prediction,
          };
        })
      );

      return { routes: routesWithStatus, connected };
    }, 30); // 30 second cache

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to get bus status:', error);
    return NextResponse.json({ error: 'Failed to get bus status' }, { status: 500 });
  }
}
