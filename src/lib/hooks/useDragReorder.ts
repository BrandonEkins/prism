'use client';

import { useState, useRef, useCallback } from 'react';

/**
 * Generic drag reorder hook using native HTML5 Drag API + Touch Events.
 * Reusable across tasks, chores, family profiles, bus routes, etc.
 *
 * Usage:
 * 1. Add `draggable` + all 6 event handlers to each item container
 * 2. Add `data-drag-id={itemId}` attribute for touch detection
 * 3. Check `draggedId === itemId` for visual feedback
 */
interface UseDragReorderProps {
  /** Current order of item IDs */
  order: string[];
  /** Called when order changes */
  onReorder: (newOrder: string[]) => void;
}

export function useDragReorder({ order, onReorder }: UseDragReorderProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleDragStart = useCallback((id: string) => {
    setDraggedId(id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const newOrder = [...order];
    const draggedIndex = newOrder.indexOf(draggedId);
    const targetIndex = newOrder.indexOf(targetId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedId);
      onReorder(newOrder);
    }
  }, [draggedId, order, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent, id: string) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    setDraggedId(id);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!draggedId) return;
    const touch = e.touches[0];
    if (!touch) return;

    const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
    for (const el of elements) {
      const targetId = el.getAttribute('data-drag-id');
      if (targetId && targetId !== draggedId) {
        const newOrder = [...order];
        const draggedIndex = newOrder.indexOf(draggedId);
        const targetIndex = newOrder.indexOf(targetId);

        if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
          newOrder.splice(draggedIndex, 1);
          newOrder.splice(targetIndex, 0, draggedId);
          onReorder(newOrder);
        }
        break;
      }
    }
  }, [draggedId, order, onReorder]);

  const handleTouchEnd = useCallback(() => {
    setDraggedId(null);
    touchStartRef.current = { x: 0, y: 0 };
  }, []);

  /** Convenience: returns all props to spread on a draggable container */
  const getDragProps = useCallback((id: string) => ({
    draggable: true,
    'data-drag-id': id,
    onDragStart: () => handleDragStart(id),
    onDragOver: (e: React.DragEvent) => handleDragOver(e, id),
    onDragEnd: handleDragEnd,
    onTouchStart: (e: React.TouchEvent) => handleTouchStart(e, id),
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  }), [handleDragStart, handleDragOver, handleDragEnd, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    draggedId,
    getDragProps,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
