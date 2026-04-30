'use client';

import * as React from 'react';
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  isToday,
  isBefore,
  startOfDay,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { useWidgetBgOverride } from '@/components/widgets/WidgetContainer';
import { hexToRgba } from '@/lib/utils/color';
import { useWeekStartsOn } from '@/lib/hooks/useWeekStartsOn';
import { DAYS_SHORT_ARRAY } from '@/lib/constants/days';
import type { CalendarEvent } from '@/types/calendar';
import { CardHeightProbe, DayOverflowPopover, DroppableOverlayCell } from './cells';
import { useCardCapacity } from '@/lib/hooks/useCardCapacity';
import type { DayBucket } from '@/lib/hooks/useWeekViewData';

export interface MultiWeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  weekCount?: 1 | 2 | 3 | 4;
  bordered?: boolean;
  displayMode?: 'inline' | 'cards';
  bucketsByDate?: Map<string, DayBucket>;
  enableDnd?: boolean;
}

/** Fallback while the ResizeObserver hasn't measured yet (~1 frame on mount). */
const FALLBACK_VISIBLE_CARDS_COMPACT = 2;
const FALLBACK_VISIBLE_CARDS = 4;

export function MultiWeekView({
  currentDate,
  events,
  onEventClick,
  weekCount = 2,
  bordered = false,
  displayMode = 'inline',
  bucketsByDate,
  enableDnd = false,
}: MultiWeekViewProps) {
  const { weekStartsOn } = useWeekStartsOn();
  const [cardHeight, setCardHeight] = React.useState<number | undefined>(undefined);
  const cards = displayMode === 'cards';
  const bgOverride = useWidgetBgOverride();
  const cellBg = bgOverride?.cellBackgroundColor;
  const cellBgOpacity = bgOverride?.cellBackgroundOpacity ?? 1;
  const cellBgStyle = cellBg ? { backgroundColor: hexToRgba(cellBg, cellBgOpacity) } : undefined;
  const weekStart = startOfWeek(currentDate, { weekStartsOn });

  const totalDays = weekCount * 7;
  const days: Date[] = [];
  for (let i = 0; i < totalDays; i++) {
    days.push(addDays(weekStart, i));
  }

  const dayNames = [...DAYS_SHORT_ARRAY.slice(weekStartsOn), ...DAYS_SHORT_ARRAY.slice(0, weekStartsOn)];
  const compact = weekCount > 2;

  // Group days into week rows
  const weeks: Date[][] = [];
  for (let w = 0; w < weekCount; w++) {
    weeks.push(days.slice(w * 7, (w + 1) * 7));
  }

  // In inline mode, rows size to content (events list scrolls). In cards mode,
  // rows are equal-height (`1fr`) so dynamic capacity has a meaningful target
  // height to measure.
  const rowSizing = cards ? '1fr' : 'auto';

  return (
    <div className="h-full flex flex-col overflow-auto">
      {cards && <CardHeightProbe size="xs" onMeasure={setCardHeight} />}
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-0.5 shrink-0">
        {dayNames.map((name) => (
          <div key={name} className="text-center text-sm font-medium text-muted-foreground py-1">
            {name}
          </div>
        ))}
      </div>

      {/* Week rows */}
      <div
        className="flex-1 grid gap-0.5 min-h-0"
        style={{ gridTemplateRows: `repeat(${weekCount}, ${rowSizing})` }}
      >
        {weeks.map((week, wIdx) => (
          <div key={wIdx} className={cn('grid grid-cols-7 gap-0.5', cards && 'min-h-0')}>
            {week.map((date, dIdx) => (
              <DayCell
                key={dIdx}
                date={date}
                events={events}
                onEventClick={onEventClick}
                compact={compact}
                bordered={bordered}
                cellBgStyle={cellBgStyle}
                displayMode={displayMode}
                bucket={bucketsByDate?.get(format(date, 'yyyy-MM-dd'))}
                enableDnd={enableDnd}
                cardHeight={cardHeight}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function DayCell({
  date,
  events,
  onEventClick,
  compact,
  bordered,
  cellBgStyle,
  displayMode,
  bucket,
  enableDnd,
  cardHeight,
}: {
  date: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  compact: boolean;
  bordered: boolean;
  cellBgStyle?: React.CSSProperties;
  displayMode: 'inline' | 'cards';
  bucket?: DayBucket;
  enableDnd: boolean;
  cardHeight: number | undefined;
}) {
  const cards = displayMode === 'cards';
  const fallback = compact ? FALLBACK_VISIBLE_CARDS_COMPACT : FALLBACK_VISIBLE_CARDS;
  const dayStart = startOfDay(date);
  const dayEvents = events.filter((event) =>
    event.allDay
      ? event.startTime <= dayStart && event.endTime > dayStart
      : isSameDay(event.startTime, date)
  );
  const sorted = [...dayEvents].sort((a, b) => {
    if (a.allDay && !b.allDay) return -1;
    if (!a.allDay && b.allDay) return 1;
    return a.startTime.getTime() - b.startTime.getTime();
  });
  const isPast = isBefore(date, startOfDay(new Date())) && !isToday(date);

  const overlayItemCount = bucket ? bucket.meals.length + bucket.chores.length + bucket.tasks.length : 0;
  const popoverHeight = 22 + overlayItemCount * 20;
  const { cellRef, fitWithOverflow, fitWithoutOverflow } = useCardCapacity({
    cardHeight,
    popoverHeight,
  });

  let visibleCount: number;
  if (!cards) {
    visibleCount = sorted.length;
  } else {
    const noOverflowFit = fitWithoutOverflow ?? fallback;
    const overflowFit = fitWithOverflow ?? fallback;
    if (sorted.length <= noOverflowFit) visibleCount = sorted.length;
    else if (sorted.length - overflowFit <= 1) visibleCount = sorted.length;
    else visibleCount = overflowFit;
  }

  const visibleEvents = cards ? sorted.slice(0, Math.max(0, visibleCount)) : sorted;
  const hiddenEvents = cards ? sorted.slice(visibleEvents.length) : [];

  return (
    <div
      className={cn(
        'flex flex-col',
        cards && 'min-h-0 h-full',
        isPast && !cellBgStyle && 'opacity-50',
        bordered && !cellBgStyle && 'border border-border rounded-md bg-card/85',
        bordered && cellBgStyle && 'border border-border rounded-md',
        bordered && isPast && !cellBgStyle && 'bg-muted/65',
      )}
      style={cellBgStyle}
    >
      {/* Date header */}
      <div
        className={cn(
          'shrink-0 px-1.5',
          compact ? 'py-1' : 'py-2',
          isToday(date) && 'bg-primary',
          isToday(date) && (bordered ? 'rounded-t-[5px]' : 'rounded-md'),
        )}
        {...(isToday(date) ? { 'data-keep-bg': '' } : {})}
      >
        <div className={cn(
          'flex items-baseline gap-1.5',
          isToday(date) && 'text-primary-foreground'
        )}>
          <span className={cn('font-bold leading-none', compact ? 'text-sm' : 'text-base')}>{format(date, 'd')}</span>
          {!compact && (
            <span className={cn('text-xs font-medium', isToday(date) ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
              {format(date, 'EEE')}
            </span>
          )}
          <span className={cn('text-xs', isToday(date) ? 'text-primary-foreground/70' : 'text-muted-foreground/70')}>
            {format(date, 'MMM')}
          </span>
        </div>
        <div className={cn(
          'mt-1',
          !bordered && 'border-b border-border',
        )} />
      </div>

      {/* Events */}
      <div
        ref={cards ? cellRef : undefined}
        className={cn(
          'space-y-0.5',
          cards && 'flex-1 min-h-0 overflow-hidden',
          compact ? 'px-0.5 pb-0.5' : 'px-1 pb-1',
        )}
      >
        {visibleEvents.map((event) => (
          <button
            key={event.id}
            onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
            className={cn(
              'w-full text-left rounded truncate hover:opacity-80 hover:ring-1 hover:ring-seasonal-accent/50 transition-all',
              compact ? 'text-xs px-0.5 py-px' : 'text-xs px-1 py-0.5',
              cards && 'bg-card/85 backdrop-blur-sm border border-border/40 shadow-sm text-foreground',
            )}
            style={
              cards
                ? { borderLeft: `3px solid ${event.color}` }
                : event.allDay
                  ? { backgroundColor: event.color, color: '#fff', borderLeft: `2px solid ${event.color}` }
                  : { color: event.color }
            }
          >
            {cards
              ? (event.allDay
                  ? <span className="font-medium">{event.title}</span>
                  : <><span className="text-muted-foreground mr-1">{format(event.startTime, 'h:mm')}</span><span className="font-medium">{event.title}</span></>)
              : (event.allDay ? event.title : `${format(event.startTime, 'h:mm')} ${event.title}`)}
          </button>
        ))}
        {cards && hiddenEvents.length > 0 && (
          <DayOverflowPopover
            date={date}
            hiddenEvents={hiddenEvents}
            onEventClick={onEventClick}
          />
        )}
        {cards && bucket && (
          <DroppableOverlayCell
            date={date}
            bucket={bucket}
            size="xs"
            layout="row"
            enableDnd={enableDnd}
          />
        )}
      </div>
    </div>
  );
}
