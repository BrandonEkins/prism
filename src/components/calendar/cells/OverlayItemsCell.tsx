'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { WeekItemCard, type WeekItemSize, type WeekItemLayout } from './WeekItemCard';
import type { DayBucket } from '@/lib/hooks/useWeekViewData';

const PRIORITY_COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#3b82f6',
} as const;

const CHORE_PENDING_COLOR = '#f59e0b';
const CHORE_OVERDUE_COLOR = '#ef4444';
const CHORE_PENDING_APPROVAL_COLOR = '#a855f7';
const MEAL_FALLBACK_COLOR = '#10b981';

function mealStripeColor(meal: {
  cookedBy?: { color: string } | null;
  createdBy?: { color: string } | null;
}): string {
  return meal.cookedBy?.color || meal.createdBy?.color || MEAL_FALLBACK_COLOR;
}

function choreStripeColor(chore: { pendingApproval?: unknown; nextDue?: string }): string {
  if (chore.pendingApproval) return CHORE_PENDING_APPROVAL_COLOR;
  if (chore.nextDue) {
    const due = new Date(chore.nextDue);
    if (!Number.isNaN(due.getTime()) && due < new Date()) {
      return CHORE_OVERDUE_COLOR;
    }
  }
  return CHORE_PENDING_COLOR;
}

interface OverlayItemsCellProps {
  bucket: Pick<DayBucket, 'meals' | 'chores' | 'tasks'>;
  size?: WeekItemSize;
  layout?: WeekItemLayout;
  /** When true, items are draggable. */
  enableDrag?: boolean;
  /** Which item kinds to render. Defaults to all three. */
  include?: { meals?: boolean; chores?: boolean; tasks?: boolean };
  /** When set, every meal uses this stripe color (e.g. the Family calendar
   * group color) instead of the cookedBy / createdBy color. */
  mealColor?: string;
  className?: string;
}

/**
 * Renders meals + chores + tasks for a single day as a vertical stack of
 * `WeekItemCard`s. Used by every calendar view to surface non-event streams
 * alongside the event cards.
 */
export function OverlayItemsCell({
  bucket,
  size = 'sm',
  layout = 'column',
  enableDrag = false,
  include,
  mealColor,
  className,
}: OverlayItemsCellProps) {
  const showMeals = include?.meals ?? true;
  const showChores = include?.chores ?? true;
  const showTasks = include?.tasks ?? true;
  const meals = showMeals ? bucket.meals : [];
  const chores = showChores ? bucket.chores : [];
  const tasks = showTasks ? bucket.tasks : [];
  const hasItems = meals.length + chores.length + tasks.length > 0;
  if (!hasItems) return null;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {meals.map((meal) => (
        <WeekItemCard
          key={`meal-${meal.id}`}
          variant="meal"
          size={size}
          layout={layout}
          stripeColor={mealColor ?? mealStripeColor(meal)}
          title={meal.name}
          timeLabel={meal.mealType}
          subtitle={meal.cookedBy?.name ? `Cooked by ${meal.cookedBy.name}` : undefined}
          muted={Boolean(meal.cookedAt)}
          dragId={enableDrag ? `meal:${meal.id}` : undefined}
        />
      ))}
      {chores.map((chore) => (
        <WeekItemCard
          key={`chore-${chore.id}`}
          variant="chore"
          size={size}
          layout={layout}
          stripeColor={choreStripeColor(chore)}
          title={chore.title}
          subtitle={chore.assignedTo?.name}
          muted={Boolean(chore.pendingApproval)}
          dragId={enableDrag ? `chore:${chore.id}` : undefined}
        />
      ))}
      {tasks.map((task) => (
        <WeekItemCard
          key={`task-${task.id}`}
          variant="task"
          size={size}
          layout={layout}
          stripeColor={PRIORITY_COLORS[task.priority]}
          title={task.title}
          subtitle={task.assignedTo?.name}
          muted={task.completed}
          dragId={enableDrag ? `task:${task.id}` : undefined}
        />
      ))}
    </div>
  );
}
