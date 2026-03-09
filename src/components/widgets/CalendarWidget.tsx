'use client';

import * as React from 'react';
import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import {
  format,
  isToday,
  isTomorrow,
  isSameDay,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  startOfDay,
  startOfWeek,
} from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, Grid3X3, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isLightColor } from '@/lib/utils/color';
import { deduplicateEvents } from '@/lib/utils/calendarDedup';
import { WidgetContainer, WidgetEmpty, useWidgetBgOverride } from './WidgetContainer';
import {
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { useCalendarEvents, useCalendarFilter } from '@/lib/hooks';
const MonthView = lazy(() => import('@/components/calendar/MonthView').then(m => ({ default: m.MonthView })));
const WeekView = lazy(() => import('@/components/calendar/WeekView').then(m => ({ default: m.WeekView })));
const MultiWeekView = lazy(() => import('@/components/calendar/MultiWeekView').then(m => ({ default: m.MultiWeekView })));
const DayViewSideBySide = lazy(() => import('@/components/calendar/DayViewSideBySide').then(m => ({ default: m.DayViewSideBySide })));
import type { CalendarEvent } from '@/types/calendar';
export type { CalendarEvent };


type WidgetViewType = 'list' | 'day' | 'week' | 'multiWeek' | 'multiWeek2' | 'multiWeek3' | 'multiWeek4' | 'month';

const VIEW_OPTIONS: { value: WidgetViewType; label: string }[] = [
  { value: 'list', label: 'List' },
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'multiWeek', label: '1W' },
  { value: 'multiWeek2', label: '2W' },
  { value: 'multiWeek3', label: '3W' },
  { value: 'multiWeek4', label: '4W' },
  { value: 'month', label: 'Month' },
];

/** Determine which views are available at a given grid size (48-col grid) */
function getAvailableViews(gridW: number, gridH: number): WidgetViewType[] {
  const mw: WidgetViewType[] = ['multiWeek', 'multiWeek2', 'multiWeek3', 'multiWeek4'];
  if (gridW >= 36 && gridH >= 24) return ['list', 'day', 'week', ...mw, 'month'];
  if (gridW >= 24 && gridH >= 36) return ['list', 'day', 'week', ...mw, 'month'];
  if (gridW >= 24 && gridH >= 24) return ['list', 'week', ...mw, 'month'];
  if (gridW >= 16 && gridH >= 16) return ['list', 'week', ...mw];
  return ['list'];
}

/** Resolve multiWeekN view type to base view + week count */
function resolveMultiWeek(vt: WidgetViewType): { baseView: 'list' | 'day' | 'week' | 'multiWeek' | 'month'; weekCount: 1 | 2 | 3 | 4 } {
  if (vt === 'multiWeek') return { baseView: 'multiWeek', weekCount: 1 };
  if (vt === 'multiWeek2') return { baseView: 'multiWeek', weekCount: 2 };
  if (vt === 'multiWeek3') return { baseView: 'multiWeek', weekCount: 3 };
  if (vt === 'multiWeek4') return { baseView: 'multiWeek', weekCount: 4 };
  return { baseView: vt as 'list' | 'day' | 'week' | 'month', weekCount: 2 };
}


export interface CalendarWidgetProps {
  events?: CalendarEvent[];
  loading?: boolean;
  error?: string | null;
  onEventClick?: (event: CalendarEvent) => void;
  titleHref?: string;
  className?: string;
  gridW?: number;
  gridH?: number;
}


export const CalendarWidget = React.memo(function CalendarWidget({
  events: externalEvents,
  loading: externalLoading,
  error: externalError,
  onEventClick,
  titleHref,
  className,
  gridW = 2,
  gridH = 2,
}: CalendarWidgetProps) {
  const bgOverride = useWidgetBgOverride();
  const transparentMode = bgOverride?.hasCustomBg === true;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [widgetBordered, setWidgetBordered] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('prism-calendar-bordered') === 'true';
    }
    return false;
  });
  const [viewType, setViewType] = useState<WidgetViewType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('prism-calendar-view');
      // Migrate old formats
      if (saved === 'twoWeek') return 'multiWeek2';
      if (saved === 'multiWeek') {
        // Migrate old multiWeek + weekcount to new combined type
        const wc = Number(localStorage.getItem('prism-calendar-weekcount') || '2');
        if (wc === 1) return 'multiWeek';
        if (wc === 3) return 'multiWeek3';
        if (wc === 4) return 'multiWeek4';
        return 'multiWeek2';
      }
      const valid: WidgetViewType[] = ['list', 'day', 'week', 'multiWeek', 'multiWeek2', 'multiWeek3', 'multiWeek4', 'month'];
      if (saved && valid.includes(saved as WidgetViewType)) {
        return saved as WidgetViewType;
      }
    }
    return 'list';
  });

  // Persist view type to localStorage
  useEffect(() => {
    localStorage.setItem('prism-calendar-view', viewType);
  }, [viewType]);
  useEffect(() => {
    localStorage.setItem('prism-calendar-bordered', String(widgetBordered));
  }, [widgetBordered]);

  // Fetch own events if none provided
  const { events: apiEvents, loading: apiLoading, error: apiError } = useCalendarEvents({ daysToShow: 60 });
  const { selectedCalendarIds, toggleCalendar, filterEvents, calendarGroups } = useCalendarFilter();

  const loading = externalLoading ?? apiLoading;
  const error = externalError ?? apiError;
  const rawEvents = externalEvents ?? apiEvents;
  const events = useMemo(() => {
    return deduplicateEvents(filterEvents(rawEvents));
  }, [filterEvents, rawEvents]);

  // Size awareness
  const availableViews = useMemo(() => getAvailableViews(gridW, gridH), [gridW, gridH]);
  const effectiveView = availableViews.includes(viewType) ? viewType : 'list';
  const viewUnavailable = viewType !== effectiveView;
  const { baseView: resolvedView, weekCount: resolvedWeekCount } = resolveMultiWeek(effectiveView);

  // Navigation
  const goToToday = useCallback(() => setCurrentDate(new Date()), []);
  const goToPrevious = useCallback(() => {
    setCurrentDate(d => {
      switch (resolvedView) {
        case 'day': return subDays(d, 1);
        case 'week': return subWeeks(d, 1);
        case 'multiWeek': return subWeeks(d, resolvedWeekCount);
        case 'month': return subMonths(d, 1);
        default: return subDays(d, 3);
      }
    });
  }, [resolvedView, resolvedWeekCount]);
  const goToNext = useCallback(() => {
    setCurrentDate(d => {
      switch (resolvedView) {
        case 'day': return addDays(d, 1);
        case 'week': return addWeeks(d, 1);
        case 'multiWeek': return addWeeks(d, resolvedWeekCount);
        case 'month': return addMonths(d, 1);
        default: return addDays(d, 3);
      }
    });
  }, [resolvedView, resolvedWeekCount]);

  // List view data
  const listDays = 14;
  const listStartDate = startOfDay(new Date());
  const listEvents = useMemo(() => {
    const endDate = addDays(listStartDate, listDays);
    return events
      .filter(e => {
        const ed = startOfDay(e.startTime);
        return ed >= listStartDate && ed < endDate;
      })
      .sort((a, b) => {
        const dc = startOfDay(a.startTime).getTime() - startOfDay(b.startTime).getTime();
        if (dc !== 0) return dc;
        if (a.allDay && !b.allDay) return -1;
        if (!a.allDay && b.allDay) return 1;
        return a.startTime.getTime() - b.startTime.getTime();
      });
  }, [events, listStartDate]);

  const eventsByDay = useMemo(() => {
    const result: Array<{ date: Date; events: CalendarEvent[] }> = [];
    for (let i = 0; i < listDays; i++) {
      const date = addDays(listStartDate, i);
      const dayStart = startOfDay(date);
      const dayEvents = listEvents.filter(e =>
        e.allDay
          ? e.startTime <= dayStart && e.endTime > dayStart
          : isSameDay(e.startTime, date)
      );
      if (dayEvents.length > 0) result.push({ date, events: dayEvents });
    }
    return result;
  }, [listEvents, listStartDate]);

  const handleEventClick = useCallback((event: CalendarEvent) => {
    onEventClick?.(event);
  }, [onEventClick]);

  // Header actions
  const headerActions = (
    <div className="flex items-center gap-1">
      {/* Navigation (hidden in list-only mode) */}
      {availableViews.length > 1 && (
        <>
          <button onClick={goToPrevious} className="p-0.5 rounded hover:bg-accent" aria-label="Previous">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button onClick={goToToday} className="px-1.5 py-0.5 rounded text-[10px] font-medium hover:bg-accent">
            Today
          </button>
          <button onClick={goToNext} className="p-0.5 rounded hover:bg-accent" aria-label="Next">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </>
      )}

      {/* View selector */}
      {availableViews.length > 1 && (
        <>
          <Select value={viewType} onValueChange={(v) => setViewType(v as WidgetViewType)}>
            <SelectTrigger aria-label="Calendar view" className={cn("h-6 w-[70px] text-[10px]", transparentMode && "bg-transparent border-current/20")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIEW_OPTIONS.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  className="text-xs"
                  disabled={!availableViews.includes(opt.value)}
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {resolvedView === 'multiWeek' && (
            <button
              onClick={() => setWidgetBordered(!widgetBordered)}
              className={cn(
                'p-0.5 rounded hover:bg-accent',
                widgetBordered && 'bg-accent'
              )}
              title={widgetBordered ? 'Hide cell borders' : 'Show cell borders'}
              aria-label="Toggle cell borders"
            >
              <Grid3X3 className="h-3.5 w-3.5" />
            </button>
          )}
        </>
      )}
    </div>
  );

  // Calendar filter chips (shown below header when calendars exist)
  const calendarChips = calendarGroups.length > 0 ? (
    <div className="flex items-center gap-1 flex-wrap px-3 pb-2 -mt-1">
      <button
        onClick={() => toggleCalendar('all')}
        className={cn(
          'px-2 py-1 rounded-full text-[10px] font-medium transition-colors leading-none',
          selectedCalendarIds.has('all')
            ? 'bg-primary text-primary-foreground'
            : transparentMode ? 'text-current/70 hover:text-current' : 'bg-muted text-muted-foreground hover:bg-accent'
        )}
      >
        All
      </button>
      {calendarGroups.map((group) => (
        <button
          key={group.id}
          onClick={() => toggleCalendar(group.id)}
          className={cn(
            'px-2 py-1 rounded-full text-[10px] font-medium transition-colors inline-flex items-center gap-1 leading-none',
            selectedCalendarIds.has(group.id) || selectedCalendarIds.has('all')
              ? isLightColor(group.color) ? 'text-black' : 'text-white'
              : 'bg-muted text-muted-foreground hover:bg-accent'
          )}
          style={
            selectedCalendarIds.has(group.id) || selectedCalendarIds.has('all')
              ? { backgroundColor: group.color }
              : undefined
          }
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: group.color }}
          />
          {group.name}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <WidgetContainer
      title="Calendar"
      titleHref={titleHref}
      icon={<Calendar className="h-4 w-4" />}
      size="large"
      loading={loading}
      error={error}
      actions={headerActions}
      className={className}
    >
      {calendarChips}
      {viewUnavailable && (
        <div className="text-[10px] text-muted-foreground text-center py-1 bg-muted/50 rounded mb-1">
          Resize widget for {VIEW_OPTIONS.find(v => v.value === viewType)?.label} view
        </div>
      )}

      {resolvedView === 'list' && (
        listEvents.length === 0 ? (
          <WidgetEmpty
            icon={<Calendar className="h-8 w-8" />}
            message="No upcoming events"
          />
        ) : (
          <div className="overflow-auto h-full -mr-2 pr-2">
            <div className="space-y-4">
              {eventsByDay.map(({ date, events: dayEvts }) => (
                <DaySection
                  key={date.toISOString()}
                  date={date}
                  events={dayEvts}
                  maxEvents={5}
                  onEventClick={handleEventClick}
                />
              ))}
            </div>
          </div>
        )
      )}

      <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}>
        {resolvedView === 'month' && (
          <MonthView
            currentDate={currentDate}
            events={events}
            onEventClick={handleEventClick}
            onDateClick={(date) => {
              setCurrentDate(date);
              setViewType('day');
            }}
          />
        )}

        {resolvedView === 'week' && (
          <WeekView
            currentDate={currentDate}
            events={events}
            onEventClick={handleEventClick}
          />
        )}

        {resolvedView === 'multiWeek' && (
          <MultiWeekView
            currentDate={currentDate}
            events={events}
            onEventClick={handleEventClick}
            weekCount={resolvedWeekCount}
            bordered={widgetBordered}
          />
        )}

        {resolvedView === 'day' && (
          <>
            <div className="text-center text-sm font-medium text-foreground mb-2">
              {formatDayHeader(currentDate)}
            </div>
            <DayViewSideBySide
              currentDate={currentDate}
              events={events}
              calendarGroups={calendarGroups}
              selectedCalendarIds={selectedCalendarIds}
              onEventClick={handleEventClick}
            />
          </>
        )}
      </Suspense>
    </WidgetContainer>
  );
});


// ---- List view sub-components (kept from original) ----

function DaySection({
  date,
  events,
  maxEvents,
  onEventClick,
}: {
  date: Date;
  events: CalendarEvent[];
  maxEvents: number;
  onEventClick?: (event: CalendarEvent) => void;
}) {
  const displayEvents = events.slice(0, maxEvents);
  const remainingCount = events.length - maxEvents;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span
          className={cn(
            'text-sm font-semibold',
            isToday(date) && 'text-seasonal-accent'
          )}
        >
          {formatDayHeader(date)}
        </span>
        {isToday(date) && (
          <Badge className="text-[10px] px-1.5 py-0 bg-seasonal-highlight text-foreground">
            Today
          </Badge>
        )}
      </div>

      <div className="space-y-1.5 pl-2 border-l-2 border-border">
        {displayEvents.map((event) => (
          <EventRow
            key={event.id}
            event={event}
            onClick={() => onEventClick?.(event)}
          />
        ))}
        {remainingCount > 0 && (
          <div className="text-xs text-muted-foreground pl-2">
            +{remainingCount} more events
          </div>
        )}
      </div>
    </div>
  );
}

function EventRow({
  event,
  onClick,
}: {
  event: CalendarEvent;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left flex items-start gap-2 p-1.5 rounded',
        'hover:bg-accent/50 transition-colors',
        'touch-action-manipulation'
      )}
    >
      <div
        className="w-1 h-full min-h-[24px] rounded-full flex-shrink-0"
        style={{ backgroundColor: event.color }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">
          {event.allDay ? 'All day' : format(event.startTime, 'h:mm a')}
        </div>
        <div className="text-sm font-medium truncate">
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

function formatDayHeader(date: Date): string {
  const dayName = format(date, 'EEEE, MMMM d, yyyy');
  if (isToday(date)) return `Today — ${dayName}`;
  if (isTomorrow(date)) return `Tomorrow — ${dayName}`;
  return dayName;
}
