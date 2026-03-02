import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { busRoutes } from '@/lib/db/schema';
import { getCached } from '@/lib/cache/redis';
import { predictArrival } from '@/lib/services/bus-arrival-predictor';
import { isGmailConnected } from '@/lib/services/bus-tracking-sync';

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

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
