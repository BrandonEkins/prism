import { NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { taskSources, shoppingListSources } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const forbidden = requireRole(auth, 'canManageIntegrations');
  if (forbidden) return forbidden;

  try {
    await db
      .delete(taskSources)
      .where(eq(taskSources.provider, 'microsoft_todo'));

    await db
      .delete(shoppingListSources)
      .where(eq(shoppingListSources.provider, 'microsoft_todo'));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Microsoft:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Microsoft' },
      { status: 500 }
    );
  }
}
