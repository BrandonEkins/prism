'use client';

import * as React from 'react';
import { format, isSameDay, isToday, isTomorrow } from 'date-fns';
import { useDroppable } from '@dnd-kit/core';
import { Cloud, CloudRain, CloudSnow, Sun, CloudSun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WeekItemCard } from './WeekItemCard';
import type { DayBucket } from '@/lib/hooks/useWeekViewData';
import type { WeatherCondition } from '@/components/widgets/WeatherWidget';

const PRIORITY_COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#3b82f6',
} as const;

const CHORE_PENDING_COLOR = '#f59e0b';
const CHORE_OVERDUE_COLOR = '#ef4444';
const CHORE_PENDING_APPROVAL_COLOR = '#a855f7';

/** Fallback for meals without a cookedBy/createdBy member color. */
const MEAL_FALLBACK_COLOR = '#10b981';

function mealStripeColor(meal: {
  cookedBy?: { color: string } | null;
  createdBy?: { color: string } | null;
}): string {
  return meal.cookedBy?.color || meal.createdBy?.color || MEAL_FALLBACK_COLOR;
}

function weatherIcon(cond: WeatherCondition | undefined): React.ReactNode {
  switch (cond) {
    case 'sunny':
      return <Sun className="h-4 w-4 text-amber-300" aria-hidden />;
    case 'partly-cloudy':
      return <CloudSun className="h-4 w-4 text-amber-200" aria-hidden />;
    case 'cloudy':
      return <Cloud className="h-4 w-4 text-white/70" aria-hidden />;
    case 'rainy':
      return <CloudRain className="h-4 w-4 text-blue-300" aria-hidden />;
    case 'snowy':
      return <CloudSnow className="h-4 w-4 text-blue-200" aria-hidden />;
    default:
      return null;
  }
}

function dayLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEEE');
}

function timeLabel(start: Date, end: Date, allDay: boolean): string | undefined {
  if (allDay) return 'All day';
  const startStr = format(start, 'h:mm a');
  if (!isSameDay(start, end)) return startStr;
  return startStr;
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

interface DayColumnProps {
  bucket: DayBucket;
  className?: string;
}

export function DayColumn({ bucket, className }: DayColumnProps) {
  const today = isToday(bucket.date);
  const droppableId = format(bucket.date, 'yyyy-MM-dd');
  const droppable = useDroppable({ id: droppableId });

  return (
    <div
      ref={droppable.setNodeRef}
      data-droppable-day={droppableId}
      className={cn(
        'flex min-h-[180px] flex-col gap-1.5 rounded-lg p-2',
        'bg-card/60 backdrop-blur-sm',
        'border border-border/30',
        today && 'ring-2 ring-seasonal-accent/60',
        droppable.isOver && 'ring-2 ring-seasonal-accent shadow-lg bg-card/80',
        className,
      )}
    >
      {/* HEADER */}
      <div className="flex items-baseline justify-between gap-1 pb-1">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-2xl font-semibold leading-none text-foreground">
            {format(bucket.date, 'd')}
          </span>
          <span
            className={cn(
              'truncate text-xs leading-none',
              today
                ? 'font-semibold text-seasonal-accent'
                : 'text-muted-foreground',
            )}
          >
            {dayLabel(bucket.date)}
          </span>
        </div>
        {bucket.weather && (
          <div className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
            {weatherIcon(bucket.weather.condition)}
            <span className="tabular-nums">
              {Math.round(bucket.weather.high)}°/{Math.round(bucket.weather.low)}°
            </span>
          </div>
        )}
      </div>

      {/* MEAL RIBBON — full width above time-blocked items */}
      {bucket.meals.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {bucket.meals.map((meal) => (
            <WeekItemCard
              key={`meal-${meal.id}`}
              variant="meal"
              stripeColor={mealStripeColor(meal)}
              title={meal.name}
              timeLabel={meal.mealType}
              subtitle={meal.cookedBy?.name ? `Cooked by ${meal.cookedBy.name}` : undefined}
              muted={Boolean(meal.cookedAt)}
              dragId={`meal:${meal.id}`}
            />
          ))}
        </div>
      )}

      {/* ALL-DAY EVENTS — read-only */}
      {bucket.allDayEvents.map((event) => (
        <WeekItemCard
          key={`evt-allday-${event.id}`}
          variant="event"
          stripeColor={event.color}
          title={event.title}
          timeLabel="All day"
          subtitle={event.calendarName}
        />
      ))}

      {/* TIMED EVENTS — read-only */}
      {bucket.timedEvents.map((event) => (
        <WeekItemCard
          key={`evt-${event.id}`}
          variant="event"
          stripeColor={event.color}
          title={event.title}
          timeLabel={timeLabel(event.startTime, event.endTime, false)}
          subtitle={event.location || event.calendarName}
        />
      ))}

      {/* CHORES — draggable */}
      {bucket.chores.map((chore) => (
        <WeekItemCard
          key={`chore-${chore.id}`}
          variant="chore"
          stripeColor={choreStripeColor(chore)}
          title={chore.title}
          subtitle={chore.assignedTo?.name}
          muted={Boolean(chore.pendingApproval)}
          dragId={`chore:${chore.id}`}
        />
      ))}

      {/* TASKS — draggable */}
      {bucket.tasks.map((task) => (
        <WeekItemCard
          key={`task-${task.id}`}
          variant="task"
          stripeColor={PRIORITY_COLORS[task.priority]}
          title={task.title}
          subtitle={task.assignedTo?.name}
          muted={task.completed}
          dragId={`task:${task.id}`}
        />
      ))}

      {/* EMPTY STATE */}
      {bucket.allDayEvents.length === 0 &&
        bucket.timedEvents.length === 0 &&
        bucket.meals.length === 0 &&
        bucket.chores.length === 0 &&
        bucket.tasks.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded border border-dashed border-border/30 bg-black/10 py-3 text-[10px] text-muted-foreground">
            Nothing planned
          </div>
        )}
    </div>
  );
}
