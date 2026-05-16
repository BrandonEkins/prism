/**
 * POST /api/integrations/kroger/disconnect
 * Clears the user's Kroger tokens. The user can reconnect anytime.
 */
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { deleteUserTokens } from '@/lib/integrations/kroger/tokens';
import { logError } from '@/lib/utils/logError';

export async function POST() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    await deleteUserTokens(auth.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError('Failed to disconnect Kroger:', error);
    return NextResponse.json({ error: 'Failed to disconnect Kroger' }, { status: 500 });
  }
}
