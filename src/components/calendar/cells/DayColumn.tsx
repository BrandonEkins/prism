'use client';

import * as React from 'react';
import { format, isSameDay, isToday, isTomorrow } from 'date-fns';
import { useDroppable } from '@dnd-kit/core';
import { Cloud, CloudRain, CloudSnow, Sun, CloudSun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WeekItemCard, type WeekItemSize, type WeekItemLayout } from './WeekItemCard';
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
const MEAL_FALLBACK_COLOR = '#10b981';

export interface OverlayFlags {
  events?: boolean;
  meals?: boolean;
  chores?: boolean;
  tasks?: boolean;
}

const ALL_OVERLAYS: Required<OverlayFlags> = {
  events: true,
  meals: true,
  chores: true,
  tasks: true,
};

function mealStripeColor(meal: {
  cookedBy?: { color: string } | null;
  createdBy?: { color: string } | null;
}): string {
  return meal.cookedBy?.color || meal.createdBy?.color || MEAL_FALLBACK_COLOR;
}

/**
 * Tinted Lucide icon per condition. Upstream ships colored raster PNGs;
 * we tint Lucide instead to keep things theme-aware. Color choices match
 * the upstream PNG palette: yellow sun, blue rain, gray cloud, etc.
 */
function weatherIcon(cond: WeatherCondition | undefined, size: 'sm' | 'lg' = 'sm'): React.ReactNode {
  const cls = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
  switch (cond) {
    case 'sunny':
      return <Sun className={cn(cls, 'text-amber-400')} aria-hidden />;
    case 'partly-cloudy':
      return <CloudSun className={cn(cls, 'text-amber-300')} aria-hidden />;
    case 'cloudy':
      return <Cloud className={cn(cls, 'text-slate-400 dark:text-white/70')} aria-hidden />;
    case 'rainy':
      return <CloudRain className={cn(cls, 'text-blue-400')} aria-hidden />;
    case 'snowy':
      return <CloudSnow className={cn(cls, 'text-blue-200')} aria-hidden />;
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

interface SizeProfile {
  itemSize: WeekItemSize;
  minHeight: string;
  headerDateText: string;
  headerLabelText: string;
  showWeather: boolean;
  showEmptyState: boolean;
  containerPadding: string;
  gap: string;
}

/**
 * Size profiles aligned with docs/calendar-cards-design.md. Upstream's day
 * number is 3.5em (≈56px) — we go text-3xl/text-4xl which approximates that
 * on Prism's root font size. Larger headers + larger weather icons are the
 * "neatness" the user observed in the upstream screenshot.
 */
const SIZE_PROFILES: Record<WeekItemSize, SizeProfile> = {
  xs: {
    itemSize: 'xs',
    minHeight: 'min-h-[40px]',
    headerDateText: 'text-xs font-bold',
    headerLabelText: 'text-[9px]',
    showWeather: false,
    showEmptyState: false,
    containerPadding: 'p-1',
    gap: 'gap-0.5',
  },
  sm: {
    itemSize: 'sm',
    minHeight: 'min-h-[70px]',
    headerDateText: 'text-base font-bold',
    headerLabelText: 'text-[10px]',
    showWeather: false,
    showEmptyState: false,
    containerPadding: 'p-1.5',
    gap: 'gap-1',
  },
  md: {
    itemSize: 'md',
    minHeight: 'min-h-[200px]',
    headerDateText: 'text-3xl font-bold',
    headerLabelText: 'text-xs font-medium',
    showWeather: true,
    showEmptyState: true,
    containerPadding: 'p-2.5',
    gap: 'gap-1.5',
  },
  lg: {
    itemSize: 'lg',
    minHeight: 'min-h-[320px]',
    headerDateText: 'text-4xl font-bold',
    headerLabelText: 'text-sm font-medium',
    showWeather: true,
    showEmptyState: true,
    containerPadding: 'p-3',
    gap: 'gap-2',
  },
};

interface DayColumnProps {
  bucket: DayBucket;
  /** Visual density. Defaults to 'md' (the original /week look). */
  size?: WeekItemSize;
  /** Per-stream visibility. Omitted = all streams shown. */
  overlays?: OverlayFlags;
  /** Item layout — 'column' for grid views, 'row' for vertical-week / agenda. Defaults 'column'. */
  itemLayout?: WeekItemLayout;
  /** Disable drag/drop (e.g. month view where moves don't make sense). Defaults false. */
  disableDrop?: boolean;
  className?: string;
}

export function DayColumn({
  bucket,
  size = 'md',
  overlays,
  itemLayout = 'column',
  disableDrop = false,
  className,
}: DayColumnProps) {
  const flags = { ...ALL_OVERLAYS, ...overlays };
  const today = isToday(bucket.date);
  const droppableId = format(bucket.date, 'yyyy-MM-dd');
  const droppable = useDroppable({ id: droppableId, disabled: disableDrop });
  const profile = SIZE_PROFILES[size];

  const showMeals = flags.meals && bucket.meals.length > 0;
  const showAllDay = flags.events && bucket.allDayEvents.length > 0;
  const showTimed = flags.events && bucket.timedEvents.length > 0;
  const showChores = flags.chores && bucket.chores.length > 0;
  const showTasks = flags.tasks && bucket.tasks.length > 0;

  const isEmpty = !showMeals && !showAllDay && !showTimed && !showChores && !showTasks;

  return (
    <div
      ref={disableDrop ? undefined : droppable.setNodeRef}
      data-droppable-day={disableDrop ? undefined : droppableId}
      className={cn(
        'flex flex-col rounded-lg',
        'bg-card/60 backdrop-blur-sm',
        'border border-border/30',
        profile.containerPadding,
        profile.minHeight,
        profile.gap,
        today && 'ring-2 ring-seasonal-accent/60',
        droppable.isOver && !disableDrop && 'ring-2 ring-seasonal-accent shadow-lg bg-card/80',
        className,
      )}
    >
      {/* HEADER */}
      <div className="flex items-baseline justify-between gap-1 pb-1">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className={cn('leading-none text-foreground', profile.headerDateText)}>
            {format(bucket.date, 'd')}
          </span>
          <span
            className={cn(
              'truncate leading-none',
              profile.headerLabelText,
              today
                ? 'font-semibold text-seasonal-accent'
                : 'text-muted-foreground',
            )}
          >
            {dayLabel(bucket.date)}
          </span>
        </div>
        {profile.showWeather && bucket.weather && (
          <div className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
            {weatherIcon(bucket.weather.condition, size === 'lg' ? 'lg' : 'sm')}
            <span className="tabular-nums">
              {Math.round(bucket.weather.high)}°/{Math.round(bucket.weather.low)}°
            </span>
          </div>
        )}
      </div>

      {showMeals &&
        bucket.meals.map((meal) => (
          <WeekItemCard
            key={`meal-${meal.id}`}
            variant="meal"
            size={profile.itemSize}
            layout={itemLayout}
            stripeColor={mealStripeColor(meal)}
            title={meal.name}
            timeLabel={meal.mealType}
            subtitle={meal.cookedBy?.name ? `Cooked by ${meal.cookedBy.name}` : undefined}
            muted={Boolean(meal.cookedAt)}
            dragId={disableDrop ? undefined : `meal:${meal.id}`}
          />
        ))}

      {showAllDay &&
        bucket.allDayEvents.map((event) => (
          <WeekItemCard
            key={`evt-allday-${event.id}`}
            variant="event"
            size={profile.itemSize}
            layout={itemLayout}
            stripeColor={event.color}
            title={event.title}
            timeLabel="All day"
            subtitle={event.calendarName}
          />
        ))}

      {showTimed &&
        bucket.timedEvents.map((event) => (
          <WeekItemCard
            key={`evt-${event.id}`}
            variant="event"
            size={profile.itemSize}
            layout={itemLayout}
            stripeColor={event.color}
            title={event.title}
            timeLabel={timeLabel(event.startTime, event.endTime, false)}
            subtitle={event.location || event.calendarName}
          />
        ))}

      {showChores &&
        bucket.chores.map((chore) => (
          <WeekItemCard
            key={`chore-${chore.id}`}
            variant="chore"
            size={profile.itemSize}
            layout={itemLayout}
            stripeColor={choreStripeColor(chore)}
            title={chore.title}
            subtitle={chore.assignedTo?.name}
            muted={Boolean(chore.pendingApproval)}
            dragId={disableDrop ? undefined : `chore:${chore.id}`}
          />
        ))}

      {showTasks &&
        bucket.tasks.map((task) => (
          <WeekItemCard
            key={`task-${task.id}`}
            variant="task"
            size={profile.itemSize}
            layout={itemLayout}
            stripeColor={PRIORITY_COLORS[task.priority]}
            title={task.title}
            subtitle={task.assignedTo?.name}
            muted={task.completed}
            dragId={disableDrop ? undefined : `task:${task.id}`}
          />
        ))}

      {profile.showEmptyState && isEmpty && (
        <div className="flex flex-1 items-center justify-center rounded border border-dashed border-border/30 bg-black/10 py-3 text-[10px] text-muted-foreground">
          Nothing planned
        </div>
      )}
    </div>
  );
}
