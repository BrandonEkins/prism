/**
 * ENDPOINT: /api/travel/pins/[id]/nearby-photos
 * Returns photos with GPS coordinates within the pin's photoRadiusKm radius.
 * Uses the Haversine formula to compute great-circle distance.
 *
 * GET /api/travel/pins/[id]/nearby-photos?limit=24
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDisplayAuth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { travelPins, photos } from '@/lib/db/schema';
import { eq, isNotNull, and } from 'drizzle-orm';
import { logError } from '@/lib/utils/logError';

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getDisplayAuth();
  if (!auth) return NextResponse.json({ photos: [] });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '24', 10), 100);

  try {
    const pin = await db.query.travelPins.findFirst({
      where: eq(travelPins.id, id),
    });

    if (!pin) return NextResponse.json({ error: 'Pin not found' }, { status: 404 });

    const radiusKm = pin.photoRadiusKm
      ? parseFloat(pin.photoRadiusKm as unknown as string)
      : 50;

    // Collect anchor points: parent pin + all child pins (stops, national parks)
    const childPins = await db
      .select({ latitude: travelPins.latitude, longitude: travelPins.longitude })
      .from(travelPins)
      .where(eq(travelPins.parentId, id));

    const anchorPoints = [
      { lat: parseFloat(pin.latitude as unknown as string), lng: parseFloat(pin.longitude as unknown as string) },
      ...childPins
        .map((c) => ({ lat: parseFloat(c.latitude as unknown as string), lng: parseFloat(c.longitude as unknown as string) }))
        .filter((c) => c.lat || c.lng),
    ].filter((a) => a.lat || a.lng);

    if (anchorPoints.length === 0) return NextResponse.json({ photos: [] });

    // Fetch all geotagged photos — Haversine filter in JS (fine for home-scale libraries)
    const geoPhotos = await db
      .select({
        id: photos.id,
        filename: photos.filename,
        thumbnailPath: photos.thumbnailPath,
        takenAt: photos.takenAt,
        latitude: photos.latitude,
        longitude: photos.longitude,
        width: photos.width,
        height: photos.height,
      })
      .from(photos)
      .where(and(isNotNull(photos.latitude), isNotNull(photos.longitude)));

    const nearby = geoPhotos
      .filter((p) => {
        const pLat = parseFloat(p.latitude as unknown as string);
        const pLng = parseFloat(p.longitude as unknown as string);
        // Match if within radius of ANY anchor point (parent or child pin)
        return anchorPoints.some((a) => haversineKm(a.lat, a.lng, pLat, pLng) <= radiusKm);
      })
      .sort((a, b) => {
        // Most recent first
        const aTime = a.takenAt?.getTime() ?? 0;
        const bTime = b.takenAt?.getTime() ?? 0;
        return bTime - aTime;
      })
      .slice(0, limit)
      .map((p) => ({
        id: p.id,
        thumbnailPath: p.thumbnailPath,
        takenAt: p.takenAt?.toISOString() ?? null,
        latitude: parseFloat(p.latitude as unknown as string),
        longitude: parseFloat(p.longitude as unknown as string),
        width: p.width,
        height: p.height,
      }));

    return NextResponse.json({ photos: nearby, total: nearby.length, radiusKm, anchors: anchorPoints.length });
  } catch (error) {
    logError('Error fetching nearby photos:', error);
    return NextResponse.json({ error: 'Failed to fetch nearby photos' }, { status: 500 });
  }
}
