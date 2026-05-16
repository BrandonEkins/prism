/**
 * GET /api/auth/kroger
 * Kicks off the Kroger OAuth Authorization Code flow by redirecting the
 * user to Kroger's consent screen. The callback at /api/auth/kroger/callback
 * exchanges the returned code for tokens and stores them per-user.
 */
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireAuth, requireRole } from '@/lib/auth';
import { buildAuthorizeUrl } from '@/lib/integrations/kroger/client';
import { getRedisClient } from '@/lib/cache/getRedisClient';
import { logError } from '@/lib/utils/logError';

const STATE_TTL = 600; // 10 minutes for the user to complete consent

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const forbidden = requireRole(auth, 'canManageIntegrations');
  if (forbidden) return forbidden;

  try {
    // Bind the OAuth state token to this user via Redis so the callback can
    // verify the redirect didn't come from a different session.
    const state = randomUUID();
    const redis = await getRedisClient();
    if (redis) {
      await redis.setEx(`kroger-oauth-state:${state}`, STATE_TTL, auth.userId);
    }

    const url = await buildAuthorizeUrl(state);
    if (!url) {
      return NextResponse.json(
        { error: 'Kroger OAuth not configured. Add credentials in setup.' },
        { status: 500 },
      );
    }

    return NextResponse.redirect(url);
  } catch (error) {
    logError('Failed to initiate Kroger OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Kroger authentication' },
      { status: 500 },
    );
  }
}
