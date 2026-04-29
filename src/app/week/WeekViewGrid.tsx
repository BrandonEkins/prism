'use client';

import * as React from 'react';
import { DayColumn } from '@/components/calendar/cells';
import type { DayBucket } from '@/lib/hooks/useWeekViewData';

interface WeekViewGridProps {
  days: DayBucket[];
}

export function WeekViewGrid({ days }: WeekViewGridProps) {
  return (
    <div
      className="
        grid gap-2
        grid-cols-1
        sm:grid-cols-2
        md:grid-cols-3
        lg:grid-cols-4
        xl:grid-cols-7
      "
    >
      {days.map((bucket) => (
        <DayColumn key={bucket.date.toISOString()} bucket={bucket} />
      ))}
    </div>
  );
}
