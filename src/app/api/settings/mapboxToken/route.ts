import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, getDisplayAuth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { settings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { invalidateEntity } from '@/lib/cache/cacheKeys';
import { logError } from '@/lib/utils/logError';

const KEY = 'mapboxToken';

export async function GET() {
  const auth = await getDisplayAuth();
  if (!auth) return NextResponse.json({ value: null });

  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, KEY));
    return NextResponse.json({ value: (row?.value as string) ?? null });
  } catch (error) {
    logError('Error fetching mapbox token:', error);
    return NextResponse.json({ value: null });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, 'canModifySettings');
  if (roleCheck) return roleCheck;

  try {
    const { value } = await request.json();
    const token = (value ?? '').trim();

    await db
      .insert(settings)
      .values({ key: KEY, value: token })
      .onConflictDoUpdate({ target: settings.key, set: { value: token } });

    await invalidateEntity('settings');
    return NextResponse.json({ success: true });
  } catch (error) {
    logError('Error saving mapbox token:', error);
    return NextResponse.json({ error: 'Failed to save token' }, { status: 500 });
  }
}
