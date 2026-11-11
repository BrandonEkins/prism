import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import { syncTaskSource } from '@/lib/services/task-source-sync';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/task-sources/[id]/sync
 *
 * Performs bidirectional sync between Prism tasks and the external provider.
 * The sync itself lives in syncTaskSource so the server cron can run it too.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const forbidden = requireRole(auth, 'canManageIntegrations');
  if (forbidden) return forbidden;

  const { id: sourceId } = await params;
  const { status, body } = await syncTaskSource(sourceId, auth.userId);
  return NextResponse.json(body, { status });
}
