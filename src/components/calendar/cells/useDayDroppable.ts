'use client';

import { useDroppable } from '@dnd-kit/core';
import { format } from 'date-fns';

interface UseDayDroppableOptions {
  date: Date;
  enabled: boolean;
}

interface UseDayDroppableResult {
  setNodeRef: (node: HTMLElement | null) => void;
  isOver: boolean;
  droppableId: string;
}

/**
 * Wraps useDroppable with a stable yyyy-MM-dd id so calendar views can register
 * an entire day cell as a drop target. Used by every cards-mode calendar view.
 *
 * When `enabled` is false, useDroppable still runs (rules-of-hooks) but is
 * disabled, so dragging a chore/task/meal onto the cell is a no-op.
 */
export function useDayDroppable({ date, enabled }: UseDayDroppableOptions): UseDayDroppableResult {
  const droppableId = format(date, 'yyyy-MM-dd');
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    disabled: !enabled,
  });
  return { setNodeRef, isOver, droppableId };
}
