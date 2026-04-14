import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { photoSources } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { exchangeCodeForTokens } from '@/lib/integrations/onedrive';
import { encrypt } from '@/lib/utils/crypto';
import { logError } from '@/lib/utils/logError';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

export async function GET(request: Request) {
  // Note: no requireAuth here — Microsoft calls back without a Prism session cookie.
  // The state param carries enough context; sensitive ops are gated by the token exchange itself.

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    if (error) {
      const errorDescription = searchParams.get('error_description');
      console.error('Microsoft OAuth error:', error, errorDescription);
      return NextResponse.redirect(`${BASE_URL}/settings?section=connections&error=microsoft_auth_denied`);
    }

    if (!code) {
      return NextResponse.redirect(`${BASE_URL}/settings?section=connections&error=missing_code`);
    }

    let sourceName = 'OneDrive Photos';
    if (state) {
      try {
        const parsed = JSON.parse(state);
        sourceName = parsed.sourceName || sourceName;
      } catch {
        // Ignore parse errors
      }
    }

    const tokens = await exchangeCodeForTokens(code);
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;

    const [existing] = await db.select().from(photoSources).where(eq(photoSources.type, 'onedrive')).limit(1);
    if (existing) {
      await db.update(photoSources).set({
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken || existing.refreshToken,
        tokenExpiresAt,
      }).where(eq(photoSources.id, existing.id));
    } else {
      await db.insert(photoSources).values({
        type: 'onedrive',
        name: sourceName,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt,
      });
    }

    return NextResponse.redirect(`${BASE_URL}/settings?section=connections&success=onedrive_connected`);
  } catch (error) {
    logError('Microsoft OAuth callback error:', error);
    return NextResponse.redirect(`${BASE_URL}/settings?section=connections&error=microsoft_auth_failed`);
  }
}
