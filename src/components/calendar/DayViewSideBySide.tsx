'use client';

import {
  format,
  isSameDay,
  isBefore,
  startOfDay,
} from 'date-fns';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWidgetBgOverride } from '@/components/widgets/WidgetContainer';
import { useHiddenHours } from '@/lib/hooks/useHiddenHours';
import { calculateEventPositions, positionToCSS } from '@/lib/utils/eventLayout';
import type { CalendarEvent } from '@/types/calendar';

export interface DayViewSideBySideProps {
  currentDate: Date;
  events: CalendarEvent[];
  calendarGroups: Array<{ id: string; name: string; color: string }>;
  selectedCalendarIds?: Set<string>;
  mergedView?: boolean;
  onEventClick: (event: CalendarEvent) => void;
}

export function DayViewSideBySide({
  currentDate,
  events,
  calendarGroups,
  selectedCalendarIds,
  mergedView = false,
  onEventClick,
}: DayViewSideBySideProps) {
  const bgOverride = useWidgetBgOverride();
  const transparentMode = bgOverride?.hasCustomBg === true;

  // Hidden hours hook
  const { settings: hiddenSettings, toggleHidden, getVisibleHours } = useHiddenHours();

  // Time tracking
  const now = new Date();
  const isCurrentDay = isSameDay(currentDate, now);
  const isPastDay = isBefore(startOfDay(currentDate), startOfDay(now)) && !isCurrentDay;
  const currentHour = now.getHours();
  // Snap to 15-min increments: 0%, 25%, 50%, 75%
  const currentMinuteSnapped = Math.floor(now.getMinutes() / 15) * 25;

  // Get visible hours (filtered if hidden mode is enabled)
  const hours = getVisibleHours();

  const dayStart = startOfDay(currentDate);
  const dayEvents = events.filter((event) =>
    event.allDay
      ? event.startTime <= dayStart && event.endTime > dayStart
      : isSameDay(event.startTime, currentDate)
  );

  const allDayEvents = dayEvents.filter((e) => e.allDay);
  const timedEvents = dayEvents.filter((e) => !e.allDay);

  // If there are no calendar groups configured or merged view is on, show all events in a single column
  const showAllInOne = calendarGroups.length === 0 || mergedView;

  // Filter groups to only show selected ones (hide columns when filtered out)
  const filteredGroups = selectedCalendarIds && !selectedCalendarIds.has('all')
    ? calendarGroups.filter((g) => selectedCalendarIds.has(g.id))
    : calendarGroups;

  // For single-column mode or when no groups are selected, create a synthetic group
  const displayGroups = showAllInOne || filteredGroups.length === 0
    ? [{ id: 'all', name: 'All Events', color: '#3B82F6' }]
    : filteredGroups;

  const getEventsForGroup = (groupId: string) => {
    if (showAllInOne || groupId === 'all') {
      return timedEvents;
    }
    // Match events by their color to the group color, or by calendarName containing group name
    const group = calendarGroups.find((g) => g.id === groupId);
    if (!group) return [];
    return timedEvents.filter((e) => {
      // Primary: match by event color to group color
      if (e.color === group.color) return true;
      // Fallback: match by calendar name containing group name
      if (e.calendarName?.toLowerCase().includes(group.name.toLowerCase())) return true;
      return false;
    });
  };

  const getAllDayEventsForGroup = (groupId: string) => {
    if (showAllInOne || groupId === 'all') {
      return allDayEvents;
    }
    const group = calendarGroups.find((g) => g.id === groupId);
    if (!group) return [];
    return allDayEvents.filter((e) => {
      if (e.color === group.color) return true;
      if (e.calendarName?.toLowerCase().includes(group.name.toLowerCase())) return true;
      return false;
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* All-day events row */}
      <div className={cn('flex-shrink-0 border-b border-border rounded-t-md', !transparentMode && 'bg-card/85 backdrop-blur-sm')}>
        <div className="flex">
          {/* Time column header with toggle button */}
          <div className="w-16 flex-shrink-0 flex items-center justify-center">
            <button
              onClick={toggleHidden}
              className={cn(
                'p-1.5 rounded-full transition-colors',
                hiddenSettings.enabled
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent text-muted-foreground'
              )}
              title={hiddenSettings.enabled ? 'Show all hours' : 'Hide time block'}
            >
              <Clock className="h-4 w-4" />
            </button>
          </div>
          {displayGroups.map((group) => {
            const calAllDay = getAllDayEventsForGroup(group.id);
            return (
              <div
                key={group.id}
                className="flex-1 min-w-0 border-l border-border p-1"
              >
                <div
                  className="text-sm font-medium text-center py-1 mb-1 rounded"
                  style={{ backgroundColor: group.color + '20', color: group.color }}
                >
                  {group.name}
                </div>
                {calAllDay.length > 0 && (
                  <div className="space-y-0.5">
                    {calAllDay.map((event) => (
                      <button
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        className="w-full text-left text-xs px-1 py-0.5 rounded truncate hover:opacity-80 hover:ring-2 hover:ring-seasonal-accent/50 transition-all"
                        style={{ backgroundColor: event.color + '20', borderLeft: `2px solid ${event.color}` }}
                      >
                        {event.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Hourly schedule - scrollable when widget is small */}
      <div className={cn('flex-1 overflow-auto rounded-b-md min-h-0', !transparentMode && 'bg-card/85 backdrop-blur-sm')}>
        <div className="flex min-h-full">
        {/* Time column */}
        <div className="w-16 flex-shrink-0 grid" style={{ gridTemplateRows: `repeat(${hours.length}, minmax(28px, 1fr))` }}>
          {hours.map((hour) => {
            const isPastHour = isPastDay || (isCurrentDay && hour < currentHour);
            const isNowHour = isCurrentDay && hour === currentHour;
            return (
              <div key={hour} className={cn(
                'pl-1 pr-2 text-right text-xs border-t border-border flex items-start pt-0.5 min-h-0 relative text-muted-foreground',
                isPastHour && 'bg-muted/55',
                isNowHour && 'text-primary font-semibold'
              )}>
                {format(new Date().setHours(hour, 0), 'h a')}
                {isNowHour && (
                  <div className="absolute left-0 right-0 border-t-2 border-t-primary z-20 pointer-events-none" style={{ top: `${currentMinuteSnapped}%` }} />
                )}
              </div>
            );
          })}
        </div>
        {/* Group columns */}
        {displayGroups.map((group) => {
          const calEvents = getEventsForGroup(group.id);

          return (
            <div
              key={group.id}
              className="flex-1 min-w-0 border-l border-border grid"
              style={{ gridTemplateRows: `repeat(${hours.length}, minmax(28px, 1fr))` }}
            >
              {hours.map((hour) => {
                const hourEvents = calEvents.filter((event) => event.startTime.getHours() === hour);
                const positions = calculateEventPositions(hourEvents);
                const isPastHour = isPastDay || (isCurrentDay && hour < currentHour);
                const isNowHour = isCurrentDay && hour === currentHour;

                return (
                  <div key={hour} className={cn(
                    'border-t border-border relative min-h-0',
                    isPastHour && 'bg-muted/55'
                  )}>
                    {isNowHour && (
                      <div className="absolute left-0 right-0 border-t-2 border-t-primary z-20 pointer-events-none" style={{ top: `${currentMinuteSnapped}%` }} />
                    )}
                    {hourEvents.map((event) => {
                      const pos = positions.get(event.id);
                      if (!pos) return null;
                      const css = positionToCSS(pos);
                      return (
                        <button
                          key={event.id}
                          onClick={() => onEventClick(event)}
                          className="absolute p-0.5 rounded text-left text-xs z-10 hover:opacity-80 hover:ring-2 hover:ring-seasonal-accent/50 transition-all"
                          style={{
                            backgroundColor: event.color + '20',
                            borderLeft: `2px solid ${event.color}`,
                            top: `${(event.startTime.getMinutes() / 60) * 100}%`,
                            left: css.left,
                            width: css.width,
                          }}
                        >
                          <div className="font-medium truncate text-[11px]">{event.title}</div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
