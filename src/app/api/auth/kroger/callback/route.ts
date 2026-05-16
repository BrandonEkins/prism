/**
 * GET /api/auth/kroger/callback
 *
 * Kroger redirects here after the user consents. We verify the OAuth state
 * (binds the redirect to the user that started the flow), exchange the code
 * for tokens, and persist them in user_kroger_connections (encrypted).
 */
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { exchangeCodeForTokens } from '@/lib/integrations/kroger/client';
import { saveUserTokens } from '@/lib/integrations/kroger/tokens';
import { getRedisClient } from '@/lib/cache/getRedisClient';
import { logError } from '@/lib/utils/logError';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      `${BASE_URL}/settings?section=shopping&error=kroger_auth_denied`,
    );
  }
  if (!code || !state) {
    return NextResponse.redirect(
      `${BASE_URL}/settings?section=shopping&error=kroger_missing_code`,
    );
  }

  // Verify state matches the user that started the flow.
  const redis = await getRedisClient();
  if (redis) {
    const expectedUserId = await redis.get(`kroger-oauth-state:${state}`);
    if (!expectedUserId || expectedUserId !== auth.userId) {
      return NextResponse.redirect(
        `${BASE_URL}/settings?section=shopping&error=kroger_state_mismatch`,
      );
    }
    await redis.del(`kroger-oauth-state:${state}`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    await saveUserTokens(auth.userId, tokens);

    return NextResponse.redirect(
      `${BASE_URL}/settings?section=shopping&kroger=connected`,
    );
  } catch (err) {
    logError('Kroger OAuth callback error:', err);
    return NextResponse.redirect(
      `${BASE_URL}/settings?section=shopping&error=kroger_token_exchange_failed`,
    );
  }
}
