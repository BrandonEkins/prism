import { NextRequest, NextResponse } from 'next/server';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Routes called by external services or with their own auth/origin logic.
 * These are exempt from the blanket CSRF Origin check.
 */
const CSRF_EXEMPT_PREFIXES = [
  '/api/away-mode',      // has its own same-origin check
];

/**
 * CSRF protection: for browser-originated mutation requests, verify that the
 * Origin header matches the server's Host header. This blocks cross-site
 * fetch() attacks that bypass sameSite:lax (which only covers navigations/forms).
 *
 * Non-browser clients (curl, server-to-server) send no Origin header and are
 * allowed through — they rely on other auth layers (requireAuth, API tokens).
 */
export function middleware(request: NextRequest) {
  if (!MUTATION_METHODS.has(request.method)) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (CSRF_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const origin = request.headers.get('origin');
  if (!origin) {
    // No Origin header — non-browser client, allow through
    return NextResponse.next();
  }

  const host = request.headers.get('host');
  if (!host) return NextResponse.next();

  try {
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
