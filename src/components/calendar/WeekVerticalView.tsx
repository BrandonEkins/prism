'use client';

import {
  format,
  startOfWeek,
  addDays,
  isToday,
  isBefore,
  startOfDay,
  isSameDay,
} from 'date-fns';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from '@/types/calendar';

export interface WeekVerticalViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  calendarGroups?: Array<{ id: string; name: string; color: string }>;
  selectedCalendarIds?: Set<string>;
  onEventClick: (event: CalendarEvent) => void;
}

export function WeekVerticalView({
  currentDate,
  events,
  calendarGroups = [],
  selectedCalendarIds,
  onEventClick,
}: WeekVerticalViewProps) {
  const weekStart = startOfWeek(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = startOfDay(new Date());

  // Determine display groups (same logic as DayViewSideBySide)
  const showAllInOne = calendarGroups.length === 0;
  const filteredGroups = selectedCalendarIds && !selectedCalendarIds.has('all')
    ? calendarGroups.filter((g) => selectedCalendarIds.has(g.id))
    : calendarGroups;
  const displayGroups = showAllInOne || filteredGroups.length === 0
    ? [{ id: 'all', name: 'All Events', color: '#3B82F6' }]
    : filteredGroups;

  const getEventsForGroup = (dayEvents: CalendarEvent[], groupId: string) => {
    if (showAllInOne || groupId === 'all') return dayEvents;
    const group = calendarGroups.find((g) => g.id === groupId);
    if (!group) return [];
    return dayEvents.filter((e) => {
      if (e.color === group.color) return true;
      if (e.calendarName?.toLowerCase().includes(group.name.toLowerCase())) return true;
      return false;
    });
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Group column headers (sticky) */}
      {displayGroups.length > 1 && (
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border flex">
          <div className="w-20 md:w-28 shrink-0" />
          {displayGroups.map((group) => (
            <div key={group.id} className="flex-1 min-w-0 border-l border-border px-1 py-1.5">
              <div
                className="text-xs font-medium text-center py-0.5 rounded"
                style={{ backgroundColor: group.color + '20', color: group.color }}
              >
                {group.name}
              </div>
            </div>
          ))}
        </div>
      )}

      {days.map((day) => {
        const dayStart = startOfDay(day);
        const isCurrentDay = isToday(day);
        const isPast = isBefore(dayStart, today);

        // All events for this day
        const dayEvents = events.filter((event) => {
          const eventStart = new Date(event.startTime);
          const eventEnd = new Date(event.endTime);
          return eventStart < addDays(dayStart, 1) && eventEnd > dayStart;
        });

        const allDayEvents = dayEvents.filter((e) => e.allDay);
        const timedEvents = dayEvents.filter((e) => !e.allDay).sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );

        return (
          <div
            key={day.toISOString()}
            className={cn(
              'flex border-b border-border',
              isCurrentDay && 'bg-primary/5',
              isPast && !isCurrentDay && 'opacity-60'
            )}
          >
            {/* Day label */}
            <div
              className={cn(
                'w-20 md:w-28 shrink-0 p-2 md:p-3 border-r border-border flex flex-col items-center justify-start',
                isCurrentDay && 'bg-primary/10'
              )}
            >
              <span className={cn(
                'text-xs font-medium uppercase tracking-wide',
                isCurrentDay ? 'text-primary' : 'text-muted-foreground'
              )}>
                {format(day, 'EEE')}
              </span>
              <span className={cn(
                'text-2xl font-bold leading-tight',
                isCurrentDay ? 'text-primary' : 'text-foreground'
              )}>
                {format(day, 'd')}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {format(day, 'MMM')}
              </span>
            </div>

            {/* Events area — one column per group */}
            {displayGroups.length > 1 ? (
              <div className="flex-1 flex min-w-0">
                {displayGroups.map((group) => {
                  const groupAllDay = getEventsForGroup(allDayEvents, group.id);
                  const groupTimed = getEventsForGroup(timedEvents, group.id);
                  return (
                    <div key={group.id} className="flex-1 min-w-0 border-l border-border p-1 space-y-0.5">
                      <DayEventList
                        allDayEvents={groupAllDay}
                        timedEvents={groupTimed}
                        onEventClick={onEventClick}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 p-1.5 min-w-0">
                <DayEventList
                  allDayEvents={allDayEvents}
                  timedEvents={timedEvents}
                  onEventClick={onEventClick}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Renders all-day events then timed events in chronological order */
function DayEventList({
  allDayEvents,
  timedEvents,
  onEventClick,
}: {
  allDayEvents: CalendarEvent[];
  timedEvents: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}) {
  if (allDayEvents.length === 0 && timedEvents.length === 0) {
    return <span className="text-[11px] text-muted-foreground/30 italic px-1 py-0.5 block">—</span>;
  }

  return (
    <div className="space-y-0.5">
      {allDayEvents.map((event) => (
        <button
          key={event.id}
          onClick={() => onEventClick(event)}
          className="w-full text-left text-xs px-1.5 py-1 rounded hover:opacity-80 transition-opacity truncate block"
          style={{ backgroundColor: event.color + '20', borderLeft: `3px solid ${event.color}` }}
        >
          <span className="font-medium" style={{ color: event.color }}>{event.title}</span>
        </button>
      ))}
      {timedEvents.map((event) => (
        <button
          key={event.id}
          onClick={() => onEventClick(event)}
          className="w-full text-left text-xs px-1.5 py-1 rounded hover:opacity-80 transition-opacity truncate block"
          style={{ backgroundColor: event.color + '20', borderLeft: `3px solid ${event.color}` }}
        >
          <span className="text-muted-foreground mr-1">{format(new Date(event.startTime), 'h:mm a')}</span>
          <span className="font-medium" style={{ color: event.color }}>{event.title}</span>
        </button>
      ))}
    </div>
  );
}
