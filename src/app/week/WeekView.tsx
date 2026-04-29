'use client';

import * as React from 'react';
import { addDays, startOfWeek } from 'date-fns';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useWeekStartsOn } from '@/lib/hooks/useWeekStartsOn';
import { useWeekViewData } from '@/lib/hooks/useWeekViewData';
import { PageWrapper } from '@/components/layout';
import { WeekViewHeader } from './WeekViewHeader';
import { WeekViewGrid } from './WeekViewGrid';
import { useWeekMutations } from './useWeekMutations';

export function WeekView() {
  const { weekStartsOn } = useWeekStartsOn();

  const [weekStart, setWeekStart] = React.useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn }),
  );
  const [moveError, setMoveError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setWeekStart((prev) => startOfWeek(prev, { weekStartsOn }));
  }, [weekStartsOn]);

  const { days, loading, error, refresh } = useWeekViewData({
    weekStart,
    weekStartsOn,
  });

  const { moveChore, moveTask, moveMeal } = useWeekMutations({ refresh });

  const sensors = useSensors(
    // Require 5px movement before activating drag, so click-to-open still works.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const goPrev = () => setWeekStart((d) => addDays(d, -7));
  const goNext = () => setWeekStart((d) => addDays(d, 7));
  const goToday = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn }));

  const handleDragEnd = async (event: DragEndEvent) => {
    setMoveError(null);
    const { active, over } = event;
    if (!over) return;

    const dragId = String(active.id);
    const targetIso = String(over.id);

    // dragId is `chore:<id>` | `task:<id>` | `meal:<id>`
    const colon = dragId.indexOf(':');
    if (colon === -1) return;
    const variant = dragId.slice(0, colon);
    const itemId = dragId.slice(colon + 1);

    // Find the target day's Date by matching ISO key from days[].
    const targetDay = days.find(
      (d) => `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, '0')}-${String(d.date.getDate()).padStart(2, '0')}` === targetIso,
    );
    if (!targetDay) return;

    try {
      if (variant === 'chore') await moveChore(itemId, targetDay.date);
      else if (variant === 'task') await moveTask(itemId, targetDay.date);
      else if (variant === 'meal') await moveMeal(itemId, targetDay.date);
    } catch (err) {
      setMoveError(err instanceof Error ? err.message : 'Failed to move item');
    }
  };

  return (
    <PageWrapper>
      <div className="p-2 sm:p-4">
        <WeekViewHeader
        weekStart={weekStart}
        weekStartsOn={weekStartsOn}
        onPrev={goPrev}
        onNext={goNext}
        onToday={goToday}
        onRefresh={refresh}
        loading={loading}
      />

      {(error || moveError) && (
        <div className="mb-2 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {moveError || error}
        </div>
      )}

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <WeekViewGrid days={days} />
        </DndContext>
      </div>
    </PageWrapper>
  );
}
