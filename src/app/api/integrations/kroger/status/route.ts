/**
 * GET /api/integrations/kroger/status
 * Returns whether the current user has connected their Kroger account.
 */
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { userKrogerConnections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getKrogerCredentials } from '@/lib/integrations/credentialStore';

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const creds = await getKrogerCredentials();
  const configured = !!creds;

  const [row] = await db
    .select({
      tokenExpiresAt: userKrogerConnections.tokenExpiresAt,
      preferredLocationId: userKrogerConnections.preferredLocationId,
      preferredLocationName: userKrogerConnections.preferredLocationName,
    })
    .from(userKrogerConnections)
    .where(eq(userKrogerConnections.userId, auth.userId));

  return NextResponse.json({
    configured,
    connected: !!row,
    tokenExpiresAt: row?.tokenExpiresAt?.toISOString() ?? null,
    preferredLocationId: row?.preferredLocationId ?? null,
    preferredLocationName: row?.preferredLocationName ?? null,
  });
}
