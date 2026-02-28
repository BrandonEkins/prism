import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { requireAuth, requireRole } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { calendarSources } from '@/lib/db/schema';
import {
  exchangeCodeForTokens,
  fetchCalendarList,
} from '@/lib/integrations/google-calendar';
import { encrypt } from '@/lib/utils/crypto';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const forbidden = requireRole(auth, 'canModifySettings');
  if (forbidden) return forbidden;

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    // Parse state early to get returnSection for error redirects
    let earlyReturnSection = 'connections';
    if (state) {
      try {
        const parsed = JSON.parse(state);
        earlyReturnSection = parsed.returnSection || 'connections';
      } catch { /* ignore */ }
    }

    // Check for errors from Google
    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(`${BASE_URL}/settings?section=${earlyReturnSection}&error=google_auth_denied`);
    }

    // Ensure we have an authorization code
    if (!code) {
      return NextResponse.redirect(`${BASE_URL}/settings?section=${earlyReturnSection}&error=missing_code`);
    }

    // Parse state to get user ID, reauth source ID, and return section
    let userId: string | null = null;
    let reauthSourceId: string | null = null;
    let returnSection = 'connections';
    if (state) {
      try {
        const parsed = JSON.parse(state);
        userId = parsed.userId || null;
        reauthSourceId = parsed.reauth || null;
        returnSection = parsed.returnSection || 'connections';
      } catch {
        // State parsing failed, continue without user ID
      }
    }

    const tokens = await exchangeCodeForTokens(code);
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Encrypt tokens before storing
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;

    // If re-authenticating, update ALL Google calendar sources (they share the same OAuth token)
    if (reauthSourceId) {
      await db
        .update(calendarSources)
        .set({
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken || undefined,
          tokenExpiresAt,
          syncErrors: null,
          updatedAt: new Date(),
        })
        .where(eq(calendarSources.provider, 'google'));

      // Also update showInEventModal based on current accessRole
      const reAuthCalendars = await fetchCalendarList(tokens.access_token);
      for (const calendar of reAuthCalendars) {
        const isWritable = calendar.accessRole === 'writer' || calendar.accessRole === 'owner';
        const existing = await db.query.calendarSources.findFirst({
          where: (cs, { and, eq }) =>
            and(
              eq(cs.provider, 'google'),
              eq(cs.sourceCalendarId, calendar.id)
            ),
        });
        if (existing) {
          await db
            .update(calendarSources)
            .set({ showInEventModal: isWritable, updatedAt: new Date() })
            .where(eq(calendarSources.id, existing.id));
        }
      }

      return NextResponse.redirect(`${BASE_URL}/settings?section=${returnSection}&success=google_reauth`);
    }

    // Fetch calendars using the plaintext token (before we discard it)
    const calendars = await fetchCalendarList(tokens.access_token);

    for (const calendar of calendars) {
      const existing = await db.query.calendarSources.findFirst({
        where: (cs, { and, eq }) =>
          and(
            eq(cs.provider, 'google'),
            eq(cs.sourceCalendarId, calendar.id)
          ),
      });

      if (existing) {
        await db
          .update(calendarSources)
          .set({
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken || existing.refreshToken,
            tokenExpiresAt,
            syncErrors: null,
            updatedAt: new Date(),
          })
          .where(eq(calendarSources.id, existing.id));
      } else {
        const calendarName = (calendar.summary || 'Untitled Calendar').slice(0, 255);
        const isWritable = calendar.accessRole === 'writer' || calendar.accessRole === 'owner';

        await db.insert(calendarSources).values({
          userId: userId || undefined,
          provider: 'google',
          sourceCalendarId: calendar.id,
          dashboardCalendarName: calendarName,
          displayName: calendarName,
          color: calendar.backgroundColor || undefined,
          enabled: true,
          showInEventModal: isWritable,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt,
        });
      }
    }

    // Redirect back to settings with success message
    return NextResponse.redirect(`${BASE_URL}/settings?section=${returnSection}&success=google_connected`);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    // returnSection may not be in scope if parsing failed early; parse state again
    let fallbackSection = 'connections';
    try {
      const { searchParams } = new URL(request.url);
      const s = searchParams.get('state');
      if (s) fallbackSection = JSON.parse(s).returnSection || 'connections';
    } catch { /* ignore */ }
    return NextResponse.redirect(`${BASE_URL}/settings?section=${fallbackSection}&error=google_auth_failed`);
  }
}
