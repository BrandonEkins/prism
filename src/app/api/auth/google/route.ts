import { NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import { getGoogleAuthUrl } from '@/lib/integrations/google-calendar';

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const forbidden = requireRole(auth, 'canModifySettings');
  if (forbidden) return forbidden;

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const reauth = searchParams.get('reauth');
    const stateObj: Record<string, string> = {};
    if (userId) stateObj.userId = userId;
    if (reauth) stateObj.reauth = reauth;
    const state = Object.keys(stateObj).length > 0 ? JSON.stringify(stateObj) : undefined;
    const authUrl = getGoogleAuthUrl(state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Failed to initiate Google OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Google authentication' },
      { status: 500 }
    );
  }
}
