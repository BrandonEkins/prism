'use client';

import * as React from 'react';
import { addDays, format, isSameMonth, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WeekViewHeaderProps {
  weekStart: Date;
  weekStartsOn: 0 | 1;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onRefresh?: () => void;
  loading?: boolean;
}

function rangeLabel(weekStart: Date, weekStartsOn: 0 | 1): string {
  const start = startOfWeek(weekStart, { weekStartsOn });
  const end = addDays(start, 6);
  if (isSameMonth(start, end)) {
    return `${format(start, 'MMM d')} – ${format(end, 'd, yyyy')}`;
  }
  return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
}

export function WeekViewHeader({
  weekStart,
  weekStartsOn,
  onPrev,
  onNext,
  onToday,
  onRefresh,
  loading,
}: WeekViewHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-3">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold sm:text-2xl">
          {rangeLabel(weekStart, weekStartsOn)}
        </h1>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={onPrev} aria-label="Previous week">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onToday}>
          Today
        </Button>
        <Button variant="outline" size="sm" onClick={onNext} aria-label="Next week">
          <ChevronRight className="h-4 w-4" />
        </Button>
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            aria-label="Refresh"
            disabled={loading}
          >
            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          </Button>
        )}
      </div>
    </div>
  );
}
