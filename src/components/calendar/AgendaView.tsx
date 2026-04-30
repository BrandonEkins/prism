'use client';

import {
  format,
  isToday,
  isTomorrow,
  isSameDay,
  addDays,
  startOfDay,
} from 'date-fns';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui';
import type { CalendarEvent } from '@/types/calendar';
import type { DayBucket } from '@/lib/hooks/useWeekViewData';
import { DroppableOverlayCell, useDayDroppable } from './cells';
import { format as fmt } from 'date-fns';

export interface AgendaViewProps {
  events: CalendarEvent[];
  days?: number;
  maxEventsPerDay?: number;
  onEventClick?: (event: CalendarEvent) => void;
  emptyMessage?: string;
  displayMode?: 'inline' | 'cards';
  bucketsByDate?: Map<string, DayBucket>;
  enableDnd?: boolean;
}

export function AgendaView({
  events,
  days = 14,
  maxEventsPerDay = 0,
  onEventClick,
  emptyMessage = 'No upcoming events',
  displayMode = 'inline',
  bucketsByDate,
  enableDnd = false,
}: AgendaViewProps) {
  const cards = displayMode === 'cards';
  const startDate = startOfDay(new Date());
  const endDate = addDays(startDate, days);

  const filteredEvents = events
    .filter(e => {
      if (e.allDay) {
        // All-day events are stored as UTC midnight; compare as range overlap
        // so timezone-shifted dates aren't accidentally excluded.
        return e.startTime < endDate && e.endTime > startDate;
      }
      const ed = startOfDay(e.startTime);
      return ed >= startDate && ed < endDate;
    })
    .sort((a, b) => {
      const dc = startOfDay(a.startTime).getTime() - startOfDay(b.startTime).getTime();
      if (dc !== 0) return dc;
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      return a.startTime.getTime() - b.startTime.getTime();
    });

  const eventsByDay: Array<{ date: Date; events: CalendarEvent[]; bucket?: DayBucket }> = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(startDate, i);
    const dayStart = startOfDay(date);
    const dayEvents = filteredEvents.filter(e =>
      e.allDay
        ? e.startTime <= dayStart && e.endTime > dayStart
        : isSameDay(e.startTime, date)
    );
    const bucket = bucketsByDate?.get(fmt(date, 'yyyy-MM-dd'));
    const hasOverlay = bucket && (bucket.meals.length + bucket.chores.length + bucket.tasks.length > 0);
    if (dayEvents.length > 0 || hasOverlay) {
      eventsByDay.push({ date, events: dayEvents, bucket });
    }
  }

  if (eventsByDay.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
        <Calendar className="h-8 w-8" />
        <span className="text-sm">{emptyMessage}</span>
      </div>
    );
  }

  return (
    <div className="overflow-auto h-full -mr-2 pr-2">
      <div className="space-y-4">
        {eventsByDay.map(({ date, events: dayEvts, bucket }) => (
          <AgendaDaySection
            key={date.toISOString()}
            date={date}
            events={dayEvts}
            maxEvents={maxEventsPerDay}
            onEventClick={onEventClick}
            cards={cards}
            bucket={bucket}
            enableDnd={enableDnd}
          />
        ))}
      </div>
    </div>
  );
}

function AgendaDaySection({
  date,
  events,
  maxEvents,
  onEventClick,
  cards = false,
  bucket,
  enableDnd = false,
}: {
  date: Date;
  events: CalendarEvent[];
  maxEvents: number;
  onEventClick?: (event: CalendarEvent) => void;
  cards?: boolean;
  bucket?: DayBucket;
  enableDnd?: boolean;
}) {
  const displayEvents = maxEvents > 0 ? events.slice(0, maxEvents) : events;
  const remainingCount = maxEvents > 0 ? events.length - maxEvents : 0;
  const droppable = useDayDroppable({ date, enabled: cards && enableDnd });

  return (
    <div
      ref={cards && enableDnd ? droppable.setNodeRef : undefined}
      data-droppable-day={cards && enableDnd ? droppable.droppableId : undefined}
      className={cn(
        'rounded',
        cards && enableDnd && droppable.isOver && 'ring-2 ring-seasonal-accent shadow-sm bg-card/40 p-1',
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className={cn(
            'text-sm font-semibold',
            isToday(date) && 'text-seasonal-accent'
          )}
        >
          {formatAgendaDayHeader(date)}
        </span>
        {isToday(date) && (
          <Badge className="text-[10px] px-1.5 py-0 bg-seasonal-highlight text-foreground">
            Today
          </Badge>
        )}
      </div>

      <div className="space-y-1.5 pl-2 border-l-2 border-border">
        {displayEvents.map((event) => (
          <AgendaEventRow
            key={event.id}
            event={event}
            onClick={() => onEventClick?.(event)}
            cards={cards}
          />
        ))}
        {remainingCount > 0 && (
          <div className="text-xs text-muted-foreground pl-2">
            +{remainingCount} more events
          </div>
        )}
        {bucket && (
          <DroppableOverlayCell
            date={date}
            bucket={bucket}
            size="sm"
            layout="row"
            enableDnd={enableDnd}
          />
        )}
      </div>
    </div>
  );
}

function AgendaEventRow({
  event,
  onClick,
  cards = false,
}: {
  event: CalendarEvent;
  onClick?: () => void;
  cards?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left flex items-start gap-2 p-1.5 rounded',
        cards
          ? 'bg-card/85 backdrop-blur-sm border border-border/40 shadow-sm hover:bg-card'
          : 'hover:bg-accent/50',
        'transition-colors',
        'touch-action-manipulation',
      )}
      style={cards ? { borderLeft: `3px solid ${event.color}` } : undefined}
    >
      {!cards && (
        <div
          className="w-1 h-full min-h-[24px] rounded-full flex-shrink-0"
          style={{ backgroundColor: event.color }}
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">
          {event.allDay ? 'All day' : format(event.startTime, 'h:mm a')}
        </div>
        <div className="text-sm font-medium truncate text-foreground">
          {event.title}
        </div>
        {event.location && (
          <div className="text-xs text-muted-foreground truncate">
            {event.location}
          </div>
        )}
      </div>
    </button>
  );
}

function formatAgendaDayHeader(date: Date): string {
  const dayName = format(date, 'EEEE, MMMM d, yyyy');
  if (isToday(date)) return `Today - ${dayName}`;
  if (isTomorrow(date)) return `Tomorrow - ${dayName}`;
  return dayName;
}
