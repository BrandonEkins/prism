import { NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { calendarSources } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const forbidden = requireRole(auth, 'canModifySettings');
  if (forbidden) return forbidden;

  try {
    await db
      .delete(calendarSources)
      .where(eq(calendarSources.provider, 'google'));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Google:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Google' },
      { status: 500 }
    );
  }
}
