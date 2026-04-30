'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { OverlayItemsCell } from './OverlayItemsCell';
import type { WeekItemSize, WeekItemLayout } from './WeekItemCard';
import type { DayBucket } from '@/lib/hooks/useWeekViewData';

interface DroppableOverlayCellProps {
  date: Date;
  bucket: Pick<DayBucket, 'meals' | 'chores' | 'tasks'> | undefined;
  size?: WeekItemSize;
  layout?: WeekItemLayout;
  /** When true, registers a drop target with @dnd-kit and shows hover feedback. */
  enableDnd?: boolean;
  className?: string;
}

/**
 * Renders a day's overlay items (meals/chores/tasks) wrapped in a useDroppable
 * so the cell can be a drop target when cards-mode + DndContext are active.
 *
 * Without a parent DndContext, useDroppable is a harmless no-op so the cell
 * still renders the overlay items cleanly.
 */
export function DroppableOverlayCell({
  date,
  bucket,
  size = 'sm',
  layout = 'column',
  enableDnd = false,
  className,
}: DroppableOverlayCellProps) {
  const droppableId = format(date, 'yyyy-MM-dd');
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    disabled: !enableDnd,
  });

  if (!bucket) return null;

  return (
    <div
      ref={enableDnd ? setNodeRef : undefined}
      data-droppable-day={enableDnd ? droppableId : undefined}
      className={cn(
        'flex flex-col gap-1',
        enableDnd && isOver && 'rounded ring-2 ring-seasonal-accent bg-card/40',
        className,
      )}
    >
      <OverlayItemsCell
        bucket={bucket}
        size={size}
        layout={layout}
        enableDrag={enableDnd}
      />
    </div>
  );
}
