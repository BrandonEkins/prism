import { db } from '@/lib/db/client';
import { taskSources, tasks, dismissedTasks } from '@/lib/db/schema';
import { eq, and, or, isNull, isNotNull, inArray } from 'drizzle-orm';
import { invalidateEntity } from '@/lib/cache/cacheKeys';
import { getTaskProvider } from '@/lib/integrations/tasks';
import { decideDeletionReview } from '@/lib/services/taskDeletionReview';

/**
 * How long a task must have been absent from the provider before it is flagged.
 * Covers the provider listing a just-created task late, and means one missed
 * response cannot flag anything on its own. Slightly over the 5-minute
 * auto-sync interval, so it takes two runs.
 */
const MISSING_GRACE_MS = 6 * 60 * 1000;
import { decrypt, encrypt } from '@/lib/utils/crypto';
import { logActivity } from '@/lib/services/auditLog';
import { logError } from '@/lib/utils/logError';
import type {
  TaskProviderTokens,
  ExternalTask,
  SyncResult,
} from '@/lib/integrations/tasks/types';

export interface TaskSourceSyncOutcome {
  /** HTTP status the sync route answers with. */
  status: number;
  body: Record<string, unknown>;
}

/**
 * Performs bidirectional sync between Prism tasks and the external provider.
 *
 * Sync strategy (newest_wins):
 * 1. Fetch all remote tasks from provider
 * 2. For each remote task:
 *    - If no local match by externalId: create local task
 *    - If local match exists: compare timestamps, update the older one
 * 3. For each local task linked to this source:
 *    - If no remote match: push to remote (task was created locally)
 *    - If deleted remotely: delete locally (or mark as unlinked)
 * 4. Update lastSyncAt timestamp
 */
export async function syncTaskSource(
  sourceId: string,
  actorUserId: string | null,
): Promise<TaskSourceSyncOutcome> {
  try {
    // 1. Get the source configuration
    const [source] = await db
      .select()
      .from(taskSources)
      .where(eq(taskSources.id, sourceId));

    if (!source) {
      return {
        status: 404,
        body: { error: 'Task source not found' },
      };
    }

    if (!source.syncEnabled) {
      return {
        status: 400,
        body: { error: 'Sync is disabled for this source' },
      };
    }

    // 2. Get the provider
    const provider = getTaskProvider(source.provider);
    if (!provider) {
      return {
        status: 400,
        body: { error: `Unknown provider: ${source.provider}` },
      };
    }

    // 3. Prepare tokens (decrypt from storage)
    if (!source.accessToken) {
      return {
        status: 401,
        body: { error: 'No access token configured. Please reconnect the provider.' },
      };
    }

    let tokens: TaskProviderTokens = {
      accessToken: decrypt(source.accessToken),
      refreshToken: source.refreshToken ? decrypt(source.refreshToken) : undefined,
      expiresAt: source.tokenExpiresAt || undefined,
    };

    // 4. Refresh tokens if expired
    if (tokens.expiresAt && new Date(tokens.expiresAt) < new Date()) {
      if (provider.refreshTokens && tokens.refreshToken) {
        const newTokens = await provider.refreshTokens(tokens);
        if (newTokens) {
          tokens = newTokens;
          // Update tokens in database (encrypt before storage)
          await db
            .update(taskSources)
            .set({
              accessToken: encrypt(newTokens.accessToken),
              refreshToken: newTokens.refreshToken ? encrypt(newTokens.refreshToken) : source.refreshToken,
              tokenExpiresAt: newTokens.expiresAt,
              updatedAt: new Date(),
            })
            .where(eq(taskSources.id, sourceId));
        } else {
          await db
            .update(taskSources)
            .set({
              lastSyncError: 'Token refresh failed. Please reconnect.',
              updatedAt: new Date(),
            })
            .where(eq(taskSources.id, sourceId));

          return {
            status: 401,
            body: { error: 'Token refresh failed. Please reconnect the provider.' },
          };
        }
      } else {
        return {
          status: 401,
          body: { error: 'Access token expired. Please reconnect the provider.' },
        };
      }
    }

    // 5. Perform the sync
    const result = await performSync(
      source.id,
      source.externalListId,
      source.taskListId,
      tokens,
      provider
    );

    // 6. Update source with sync result
    await db
      .update(taskSources)
      .set({
        lastSyncAt: new Date(),
        lastSyncError: result.errors.length > 0 ? result.errors.join('; ') : null,
        updatedAt: new Date(),
      })
      .where(eq(taskSources.id, sourceId));

    await invalidateEntity('tasks');
    await invalidateEntity('task-sources');

    // Only syncs someone asked for go in the activity log; the cron's runs
    // every ten minutes would bury everything else there.
    if (actorUserId) {
      logActivity({
        userId: actorUserId,
        action: 'sync',
        entityType: 'integration',
        entityId: sourceId,
        summary:
          `Synced task source: ${source.provider} (${source.externalListName || source.externalListId}) - ` +
          `${result.created} created, ${result.updated} updated` +
          (result.flagged > 0 ? `, ${result.flagged} removals held for review` : ''),
      });
    }

    return { status: 200, body: { success: true, ...result } };
  } catch (error) {
    logError('Sync error:', error);

    // Update source with error
    await db
      .update(taskSources)
      .set({
        lastSyncError: error instanceof Error ? error.message : 'Unknown sync error',
        updatedAt: new Date(),
      })
      .where(eq(taskSources.id, sourceId));

    return {
      status: 500,
      body: { error: 'Sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

/**
 * Sync every enabled task source that has not synced in `staleMinutes`.
 *
 * Called by the server cron, so task lists stay current when no one has a
 * page open. The dashboard's own auto-sync never runs: it looks for the
 * prism_session cookie in document.cookie, which cannot see an httpOnly
 * cookie. Sources are synced one after another to keep provider calls gentle.
 */
export async function syncStaleTaskSources(
  staleMinutes: number,
  sync: typeof syncTaskSource = syncTaskSource,
): Promise<{
  synced: number;
  skipped: number;
  created: number;
  updated: number;
  errors: string[];
}> {
  const sources = await db
    .select()
    .from(taskSources)
    .where(eq(taskSources.syncEnabled, true));

  const cutoff = Date.now() - staleMinutes * 60 * 1000;
  const due = sources.filter((s) => !s.lastSyncAt || new Date(s.lastSyncAt).getTime() <= cutoff);

  const summary = { synced: 0, skipped: sources.length - due.length, created: 0, updated: 0, errors: [] as string[] };
  for (const source of due) {
    const label = source.externalListName || source.externalListId;
    const { status, body } = await sync(source.id, null);
    if (status === 200) {
      summary.synced++;
      summary.created += Number(body.created) || 0;
      summary.updated += Number(body.updated) || 0;
      const errors = Array.isArray(body.errors) ? body.errors : [];
      if (errors.length > 0) summary.errors.push(`${label}: ${errors.join(', ')}`);
    } else {
      summary.errors.push(`${label}: ${String(body.error ?? 'Sync failed')}`);
    }
  }
  return summary;
}

/**
 * Core sync logic
 */
async function performSync(
  sourceId: string,
  externalListId: string,
  taskListId: string,
  tokens: TaskProviderTokens,
  provider: ReturnType<typeof getTaskProvider>
): Promise<SyncResult> {
  if (!provider) {
    throw new Error('Provider not found');
  }

  const result: SyncResult = {
    created: 0,
    updated: 0,
    deleted: 0,
    flagged: 0,
    errors: [],
  };

  try {
    // Fetch remote tasks
    const remoteTasks = await provider.fetchTasks(tokens, externalListId);

    // Fetch local tasks linked to this source OR belonging to this list (for new tasks)
    const localTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          // Kept after a remote deletion, or detached when a source was removed
          // (task_source_id is ON DELETE SET NULL). Either way the row is
          // Prism's now: it must not be matched, pushed or flagged.
          eq(tasks.syncExempt, false),
          or(
            eq(tasks.taskSourceId, sourceId),
            and(eq(tasks.listId, taskListId), isNull(tasks.taskSourceId))
          )
        )
      );

    // Tasks deleted in Prism. The delete is pushed to the provider at delete
    // time, so normally the remote no longer lists them; this covers the cases
    // where that could not be relied on (failed or unsupported upstream
    // delete, or a lagging remote). Without it the loop below sees a remote
    // task with no local match and re-creates it.
    const tombstoned = new Set(
      (
        await db
          .select({ externalTaskId: dismissedTasks.externalTaskId })
          .from(dismissedTasks)
          .where(eq(dismissedTasks.taskSourceId, sourceId))
      ).map((row) => row.externalTaskId),
    );

    // Create maps for quick lookup
    const remoteById = new Map(remoteTasks.map(t => [t.id, t]));

    // Anything the remote is listing again is not missing. Clearing this first
    // is what makes one bad response self-healing rather than leaving a pile of
    // flags to work through by hand. Calendar clears the same way before it
    // re-scans, on all three of its provider paths.
    if (remoteById.size > 0) {
      await db
        .update(tasks)
        .set({ pendingDeletion: null })
        .where(
          and(
            eq(tasks.taskSourceId, sourceId),
            inArray(tasks.externalId, [...remoteById.keys()]),
            isNotNull(tasks.pendingDeletion),
          ),
        );
    }
    const localByExternalId = new Map(
      localTasks
        .filter(t => t.externalId)
        .map(t => [t.externalId!, t])
    );

    // Process remote tasks
    for (const remoteTask of remoteTasks) {
      const localTask = localByExternalId.get(remoteTask.id);

      if (tombstoned.has(remoteTask.id)) {
        // Deleted in Prism and still coming back from the remote. Leave it
        // alone rather than re-adding it; the tombstone is cleared below once
        // the remote stops listing it.
        continue;
      }

      if (!localTask) {
        // Remote task doesn't exist locally - create it
        try {
          await db.insert(tasks).values({
            title: remoteTask.title,
            description: remoteTask.description || null,
            listId: taskListId,
            dueDate: remoteTask.dueDate || null,
            priority: remoteTask.priority || null,
            completed: remoteTask.completed,
            completedAt: remoteTask.completedAt || null,
            taskSourceId: sourceId,
            externalId: remoteTask.id,
            externalUpdatedAt: remoteTask.updatedAt,
            lastSynced: new Date(),
          });
          result.created++;
        } catch (err) {
          result.errors.push(`Failed to create local task: ${remoteTask.title}`);
        }
      } else {
        // Task exists in both - compare timestamps
        const remoteUpdated = remoteTask.updatedAt;
        const localUpdated = localTask.updatedAt;

        if (remoteUpdated > localUpdated) {
          // Remote is newer - update local
          try {
            await db
              .update(tasks)
              .set({
                title: remoteTask.title,
                description: remoteTask.description || null,
                dueDate: remoteTask.dueDate || null,
                // Providers keep no due time, so keep Prism's while the day
                // is unchanged and drop it when the remote moved the task.
                dueTime: remoteTask.dueDate && remoteTask.dueDate === localTask.dueDate
                  ? localTask.dueTime
                  : null,
                priority: remoteTask.priority || null,
                completed: remoteTask.completed,
                completedAt: remoteTask.completedAt || null,
                externalUpdatedAt: remoteTask.updatedAt,
                lastSynced: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(tasks.id, localTask.id));
            result.updated++;
          } catch (err) {
            result.errors.push(`Failed to update local task: ${localTask.title}`);
          }
        } else if (localUpdated > remoteUpdated) {
          // Local is newer - update remote
          try {
            // For MS To-Do, taskId needs format "listId:taskId"
            const taskIdForProvider = `${externalListId}:${remoteTask.id}`;
            await provider.updateTask(tokens, taskIdForProvider, {
              title: localTask.title,
              description: localTask.description,
              dueDate: localTask.dueDate,
              completed: localTask.completed,
              priority: localTask.priority,
            });

            // Update local sync timestamp
            await db
              .update(tasks)
              .set({
                lastSynced: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(tasks.id, localTask.id));
            result.updated++;
          } catch (err) {
            result.errors.push(`Failed to update remote task: ${localTask.title}`);
          }
        } else {
          // Same timestamp - just update lastSynced
          await db
            .update(tasks)
            .set({ lastSynced: new Date() })
            .where(eq(tasks.id, localTask.id));
        }
      }
    }

    // Find local tasks that don't exist remotely (created locally or deleted remotely)
    const missingLocally: typeof localTasks = [];
    for (const localTask of localTasks) {
      if (!localTask.externalId) {
        // Local task without externalId - push to remote
        try {
          const created = await provider.createTask(tokens, {
            listId: externalListId,
            title: localTask.title,
            description: localTask.description,
            dueDate: localTask.dueDate,
            priority: localTask.priority,
          });

          // Update local task with external ID and link to this source
          await db
            .update(tasks)
            .set({
              taskSourceId: sourceId,
              externalId: created.id,
              externalUpdatedAt: created.updatedAt,
              lastSynced: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(tasks.id, localTask.id));
          result.created++;
        } catch (err) {
          result.errors.push(`Failed to push task to remote: ${localTask.title}`);
        }
      } else if (localTask.taskSourceId === sourceId && !remoteById.has(localTask.externalId)) {
        // Gone from this provider. Previously deleted outright — silent and
        // unrecoverable — now collected so the whole run is judged at once.
        //
        // The taskSourceId check matters: the query above also picks up rows
        // with no source at all (CalDAV task rows, and orphans left behind by
        // ON DELETE SET NULL). Those carry an external id this provider has
        // never heard of, so without it one provider deletes another's tasks.
        missingLocally.push(localTask);
      }
    }

    // Decide what to do about the tasks the remote stopped listing. The
    // decision is per-run, not per-task: one task going missing is someone
    // ticking it off, all of them going missing is a broken provider, and
    // telling those apart needs the whole set.
    const now = new Date();
    const flaggable = missingLocally.filter((t) => {
      // A task pushed upstream moments ago may not be in the provider's list
      // yet. Flagging it would tell the user their own new task was deleted.
      // Requiring it to have been absent for longer than one sync interval
      // also means a single missed response never flags anything.
      if (!t.lastSynced) return false;
      return now.getTime() - t.lastSynced.getTime() > MISSING_GRACE_MS;
    });

    const review = decideDeletionReview({
      syncedCount: localTasks.filter((t) => t.externalId && t.taskSourceId === sourceId).length,
      missingCount: flaggable.length,
    });

    if (review.guardTripped) {
      // Deliberately NOT flagged. Burying the user in hundreds of entries
      // invites a bulk confirm, which destroys exactly what the review exists
      // to protect. Said out loud rather than withheld silently.
      result.errors.push(
        `${review.withheld} tasks are missing from the provider — too many at once to be a normal ` +
        `change, so none were touched. Check the connection, then sync again.`,
      );
    } else if (review.flag) {
      for (const localTask of flaggable) {
        // Only when not already flagged, so the original time survives and the
        // count does not climb every five minutes.
        if (localTask.pendingDeletion) continue;
        try {
          await db.update(tasks).set({ pendingDeletion: now }).where(eq(tasks.id, localTask.id));
          result.flagged++;
        } catch (err) {
          result.errors.push(`Failed to flag deleted task: ${localTask.title}`);
        }
      }
    }

    // Drop tombstones the remote has caught up on. Once a task is gone from
    // the provider there is nothing left to suppress, and keeping the row
    // would grow this table without bound.
    const stale = [...tombstoned].filter((externalId) => !remoteById.has(externalId));
    if (stale.length > 0) {
      await db
        .delete(dismissedTasks)
        .where(
          and(
            eq(dismissedTasks.taskSourceId, sourceId),
            inArray(dismissedTasks.externalTaskId, stale),
          ),
        );
    }

    return result;
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : 'Unknown sync error');
    return result;
  }
}
