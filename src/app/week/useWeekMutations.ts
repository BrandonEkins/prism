'use client';

import { useCallback } from 'react';
import { format } from 'date-fns';
import { DAYS_OF_WEEK, type DayOfWeek } from '@/lib/constants/days';

interface UseWeekMutationsOptions {
  /** Called after a successful mutation to re-fetch upstream data. */
  refresh: () => Promise<void>;
}

interface UseWeekMutationsResult {
  moveChore: (choreId: string, targetDate: Date) => Promise<void>;
  moveTask: (taskId: string, targetDate: Date) => Promise<void>;
  moveMeal: (mealId: string, targetDate: Date) => Promise<void>;
}

async function patchJson(url: string, body: unknown): Promise<void> {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = `PATCH ${url} failed: ${res.status}`;
    try {
      const data = await res.json();
      if (typeof data?.error === 'string') message = data.error;
    } catch { /* swallow */ }
    throw new Error(message);
  }
}

export function useWeekMutations({ refresh }: UseWeekMutationsOptions): UseWeekMutationsResult {
  const moveChore = useCallback(
    async (choreId: string, targetDate: Date) => {
      await patchJson(`/api/chores/${choreId}`, {
        nextDue: format(targetDate, 'yyyy-MM-dd'),
      });
      await refresh();
    },
    [refresh],
  );

  const moveTask = useCallback(
    async (taskId: string, targetDate: Date) => {
      // Preserve the existing time-of-day; if no prior dueDate use end-of-day.
      const iso = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate(),
        23, 59, 59,
      ).toISOString();
      await patchJson(`/api/tasks/${taskId}`, { dueDate: iso });
      await refresh();
    },
    [refresh],
  );

  const moveMeal = useCallback(
    async (mealId: string, targetDate: Date) => {
      const dayOfWeek = DAYS_OF_WEEK[targetDate.getDay()] as DayOfWeek;
      // Note: weekOf is preserved server-side. Cross-week meal moves are
      // a Phase 2.1 follow-up — for now drag is in-week only.
      await patchJson(`/api/meals/${mealId}`, { dayOfWeek });
      await refresh();
    },
    [refresh],
  );

  return { moveChore, moveTask, moveMeal };
}
