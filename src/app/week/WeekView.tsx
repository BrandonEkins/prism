'use client';

import * as React from 'react';
import { addDays, startOfWeek } from 'date-fns';
import { useWeekStartsOn } from '@/lib/hooks/useWeekStartsOn';
import { useWeekViewData } from '@/lib/hooks/useWeekViewData';
import { WeekViewHeader } from './WeekViewHeader';
import { WeekViewGrid } from './WeekViewGrid';

export function WeekView() {
  const { weekStartsOn } = useWeekStartsOn();

  const [weekStart, setWeekStart] = React.useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn }),
  );

  // Re-anchor weekStart if user's preference loads/changes after mount
  React.useEffect(() => {
    setWeekStart((prev) => startOfWeek(prev, { weekStartsOn }));
  }, [weekStartsOn]);

  const { days, loading, error, refresh } = useWeekViewData({
    weekStart,
    weekStartsOn,
  });

  const goPrev = () => setWeekStart((d) => addDays(d, -7));
  const goNext = () => setWeekStart((d) => addDays(d, 7));
  const goToday = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn }));

  return (
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

      {error && (
        <div className="mb-2 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <WeekViewGrid days={days} />
    </div>
  );
}
