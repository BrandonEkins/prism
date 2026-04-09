/**
 * Safe error logger for API routes.
 *
 * In production: logs only error.message to avoid leaking stack traces,
 * file paths, DB query details, or other internals via server logs.
 * In development: logs the full error object for easy debugging.
 *
 * Pass `requestId` (from the x-request-id header) to correlate log lines
 * with specific requests.
 */
export function logError(message: string, error: unknown, requestId?: string): void {
  const prefix = requestId ? `[${requestId}] ` : '';
  if (process.env.NODE_ENV === 'production') {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`${prefix}${message}`, msg);
  } else {
    console.error(`${prefix}${message}`, error);
  }
}
