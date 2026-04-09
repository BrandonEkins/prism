import { NextRequest, NextResponse } from 'next/server';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Routes called by external services or with their own auth/origin logic.
 * These are exempt from the blanket CSRF Origin check.
 */
const CSRF_EXEMPT_PREFIXES = [
  '/api/away-mode',      // has its own same-origin check
];

function generateRequestId(): string {
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * CSRF protection + request ID injection.
 *
 * Adds x-request-id to all API responses for log correlation.
 * For browser-originated mutation requests, verifies Origin matches Host.
 * Non-browser clients (no Origin header) bypass CSRF — they rely on other
 * auth layers (requireAuth, API tokens).
 */
export function middleware(request: NextRequest) {
  // Attach (or propagate) request ID for log correlation
  const requestId = request.headers.get('x-request-id') ?? generateRequestId();
  const response = NextResponse.next({
    request: { headers: new Headers({ ...Object.fromEntries(request.headers), 'x-request-id': requestId }) },
  });
  response.headers.set('x-request-id', requestId);

  if (!MUTATION_METHODS.has(request.method)) return response;

  const { pathname } = request.nextUrl;
  if (CSRF_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))) return response;

  const origin = request.headers.get('origin');
  if (!origin) {
    // No Origin header — non-browser client, allow through
    return response;
  }

  const host = request.headers.get('host');
  if (!host) return response;

  try {
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      const forbidden = NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      forbidden.headers.set('x-request-id', requestId);
      return forbidden;
    }
  } catch {
    const forbidden = NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    forbidden.headers.set('x-request-id', requestId);
    return forbidden;
  }

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
