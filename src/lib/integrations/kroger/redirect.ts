/**
 * Resolve the Kroger OAuth redirect URI from the current request.
 *
 * Prism can be reached via multiple hosts (e.g. a public https hostname
 * over WAN and an http://192.168.x.x:3000 LAN address). The OAuth redirect URI
 * must match the host the user started the flow from — Kroger validates
 * that the URI sent to /token matches the one sent to /authorize, and the
 * post-auth redirect needs to land back on the same origin so the user's
 * Prism session cookie is sent.
 *
 * The user registers BOTH URIs in their Kroger app config; this function
 * picks the right one based on the incoming request.
 */
export function resolveKrogerRedirectUri(request: Request): string {
  const headers = request.headers;
  // When behind a reverse proxy (Cloudflare Tunnel, nginx, etc.) the
  // x-forwarded-* headers carry the public-facing host and protocol that
  // the user actually sees in their browser address bar.
  const xfHost = headers.get('x-forwarded-host');
  const xfProto = headers.get('x-forwarded-proto');
  const url = new URL(request.url);
  const host = xfHost ?? headers.get('host') ?? url.host;
  const proto = xfProto ?? url.protocol.replace(':', '');
  return `${proto}://${host}/api/auth/kroger/callback`;
}
