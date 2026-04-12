import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { settings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST() {
  try {
    const existing = await db.select().from(settings).where(eq(settings.key, 'setupComplete'));
    if (existing.length > 0) {
      await db.update(settings)
        .set({ value: { completedAt: new Date().toISOString() } })
        .where(eq(settings.key, 'setupComplete'));
    } else {
      await db.insert(settings).values({
        key: 'setupComplete',
        value: { completedAt: new Date().toISOString() },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[setup/complete]', error);
    return NextResponse.json({ error: 'Failed to mark setup complete' }, { status: 500 });
  }
}
