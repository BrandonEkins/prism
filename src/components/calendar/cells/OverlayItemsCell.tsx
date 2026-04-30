'use client';

import * as React from 'react';
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
  className,
}: OverlayItemsCellProps) {
  const hasItems = bucket.meals.length + bucket.chores.length + bucket.tasks.length > 0;
  if (!hasItems) return null;

  return (
    <div className={className}>
      {bucket.meals.map((meal) => (
        <WeekItemCard
          key={`meal-${meal.id}`}
          variant="meal"
          size={size}
          layout={layout}
          stripeColor={mealStripeColor(meal)}
          title={meal.name}
          timeLabel={meal.mealType}
          subtitle={meal.cookedBy?.name ? `Cooked by ${meal.cookedBy.name}` : undefined}
          muted={Boolean(meal.cookedAt)}
          dragId={enableDrag ? `meal:${meal.id}` : undefined}
        />
      ))}
      {bucket.chores.map((chore) => (
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
      {bucket.tasks.map((task) => (
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
