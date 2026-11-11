/**
 * The server cron's pass over task sources: which ones it syncs, and how it
 * reports results. The per-source sync is stubbed; its behaviour is covered by
 * the route tests in app/api/task-sources/__tests__.
 */
let sources: Array<Record<string, unknown>> = [];

jest.mock('@/lib/db/client', () => ({
  db: {
    select: () => ({ from: () => ({ where: () => Promise.resolve(sources) }) }),
  },
}));
jest.mock('@/lib/cache/cacheKeys', () => ({ invalidateEntity: jest.fn() }));
jest.mock('@/lib/services/auditLog', () => ({ logActivity: jest.fn() }));
jest.mock('@/lib/integrations/tasks', () => ({ getTaskProvider: jest.fn() }));

import { syncStaleTaskSources } from '../task-source-sync';

const minutesAgo = (m: number) => new Date(Date.now() - m * 60 * 1000);

describe('syncStaleTaskSources', () => {
  it('syncs only sources that are stale or never synced, with no acting user', async () => {
    sources = [
      { id: 'fresh', externalListName: 'Fresh', lastSyncAt: minutesAgo(2) },
      { id: 'stale', externalListName: 'Stale', lastSyncAt: minutesAgo(30) },
      { id: 'never', externalListName: 'Never', lastSyncAt: null },
    ];
    const sync = jest.fn().mockResolvedValue({ status: 200, body: { success: true, created: 1, updated: 2, errors: [] } });

    const result = await syncStaleTaskSources(5, sync);

    expect(sync.mock.calls).toEqual([['stale', null], ['never', null]]);
    expect(result).toEqual({ synced: 2, skipped: 1, created: 2, updated: 4, errors: [] });
  });

  it('reports failed and partial syncs by list name and keeps going', async () => {
    sources = [
      { id: 'a', externalListName: 'Groceries', lastSyncAt: null },
      { id: 'b', externalListName: null, externalListId: 'list-b', lastSyncAt: null },
      { id: 'c', externalListName: 'Chores', lastSyncAt: null },
    ];
    const sync = jest.fn()
      .mockResolvedValueOnce({ status: 401, body: { error: 'Token refresh failed. Please reconnect the provider.' } })
      .mockResolvedValueOnce({ status: 200, body: { success: true, created: 0, updated: 1, errors: ['Failed to push task to remote: Milk'] } })
      .mockResolvedValueOnce({ status: 200, body: { success: true, created: 3, updated: 0, errors: [] } });

    const result = await syncStaleTaskSources(5, sync);

    expect(sync).toHaveBeenCalledTimes(3);
    expect(result.synced).toBe(2);
    expect(result.created).toBe(3);
    expect(result.errors).toEqual([
      'Groceries: Token refresh failed. Please reconnect the provider.',
      'list-b: Failed to push task to remote: Milk',
    ]);
  });
});
