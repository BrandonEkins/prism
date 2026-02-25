'use client';

import {
  format,
  startOfWeek,
  addDays,
  isToday,
  isBefore,
  startOfDay,
} from 'date-fns';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from '@/types/calendar';

export interface WeekVerticalViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export function WeekVerticalView({ currentDate, events, onEventClick }: WeekVerticalViewProps) {
  const weekStart = startOfWeek(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = startOfDay(new Date());

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-0">
        {days.map((day) => {
          const dayStart = startOfDay(day);
          const isCurrentDay = isToday(day);
          const isPast = isBefore(dayStart, today);

          // Get events for this day
          const dayEvents = events
            .filter((event) => {
              const eventStart = new Date(event.startTime);
              const eventEnd = new Date(event.endTime);
              return eventStart < addDays(dayStart, 1) && eventEnd > dayStart;
            })
            .sort((a, b) => {
              // All-day events first, then by start time
              if (a.allDay && !b.allDay) return -1;
              if (!a.allDay && b.allDay) return 1;
              return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
            });

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'flex border-b border-border min-h-[60px]',
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

              {/* Events */}
              <div className="flex-1 p-2 flex flex-wrap gap-1.5 items-start content-start">
                {dayEvents.length === 0 && (
                  <span className="text-xs text-muted-foreground/40 italic py-1">No events</span>
                )}
                {dayEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md text-sm hover:opacity-80 transition-opacity text-left max-w-full"
                    style={{ backgroundColor: event.color + '20', borderLeft: `3px solid ${event.color}` }}
                  >
                    {!event.allDay && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                        {format(new Date(event.startTime), 'h:mm a')}
                      </span>
                    )}
                    <span className="font-medium truncate" style={{ color: event.color }}>
                      {event.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
