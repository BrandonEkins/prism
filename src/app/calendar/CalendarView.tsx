'use client';

import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks } from 'date-fns';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { toast } from '@/components/ui/use-toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useConfirmDialog } from '@/lib/hooks/useConfirmDialog';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CalendarDays,
  CalendarRange,
  LayoutGrid,
  List,
  ListChecks,
  Merge,
  Plus,
  Loader2,
  Grid3X3,
  StickyNote,
  LayoutPanelTop,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { contrastText } from '@/lib/utils/color';
import { useFamily } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { AddEventModal } from '@/components/modals';
import { PageWrapper, SubpageHeader, FilterBar } from '@/components/layout';
const MonthView = lazy(() => import('@/components/calendar/MonthView').then(m => ({ default: m.MonthView })));
const WeekView = lazy(() => import('@/components/calendar/WeekView').then(m => ({ default: m.WeekView })));
const MultiWeekView = lazy(() => import('@/components/calendar/MultiWeekView').then(m => ({ default: m.MultiWeekView })));
const ThreeMonthView = lazy(() => import('@/components/calendar/ThreeMonthView').then(m => ({ default: m.ThreeMonthView })));
const DayViewSideBySide = lazy(() => import('@/components/calendar/DayViewSideBySide').then(m => ({ default: m.DayViewSideBySide })));
const WeekVerticalView = lazy(() => import('@/components/calendar/WeekVerticalView').then(m => ({ default: m.WeekVerticalView })));
const AgendaView = lazy(() => import('@/components/calendar/AgendaView').then(m => ({ default: m.AgendaView })));
import { useCalendarViewData } from './useCalendarViewData';
import { useCalendarNotes } from '@/lib/hooks/useCalendarNotes';
import { useDayBucketsForRange } from '@/lib/hooks/useDayBucketsForRange';
import { useIsMobile, useSwipeNavigation } from '@/lib/hooks';
import { useAuth } from '@/components/providers';
import { useWeekStartsOn } from '@/lib/hooks/useWeekStartsOn';
import { useWeekMutations } from '@/app/week/useWeekMutations';
import { OverlaysToolbar } from './OverlaysToolbar';

export function CalendarView() {
  const { activeUser, requireAuth } = useAuth();
  const { members: familyMembers } = useFamily();
  const { weekStartsOn } = useWeekStartsOn();
  const {
    currentDate, setCurrentDate,
    viewType, setViewType,
    weekCount, setWeekCount,
    weeksBordered, setWeeksBordered,
    displayMode, setDisplayMode,
    overlays, setOverlays,
    selectedEvent, setSelectedEvent,
    showAddEvent, setShowAddEvent,
    editingEvent, setEditingEvent,
    selectedCalendarIds,
    calendarGroups,
    toggleCalendar,
    mergedView, setMergedView,
    events, loading, error, refreshEvents,
    goToToday, goToPrevious, goToNext, getDateRangeTitle,
  } = useCalendarViewData();

  // Date range covered by the active view — used by useDayBucketsForRange to
  // know which days need meal/chore/task buckets prepared.
  const { rangeFrom, rangeTo } = useMemo(() => {
    switch (viewType) {
      case 'agenda':
        return { rangeFrom: new Date(), rangeTo: addDays(new Date(), 30) };
      case 'day':
        return { rangeFrom: currentDate, rangeTo: currentDate };
      case 'week':
      case 'weekVertical': {
        const ws = startOfWeek(currentDate, { weekStartsOn });
        return { rangeFrom: ws, rangeTo: addDays(ws, 6) };
      }
      case 'multiWeek': {
        const ws = startOfWeek(currentDate, { weekStartsOn });
        return { rangeFrom: ws, rangeTo: endOfWeek(addWeeks(ws, weekCount - 1), { weekStartsOn }) };
      }
      case 'month':
      case 'threeMonth': {
        const ms = startOfWeek(startOfMonth(currentDate), { weekStartsOn });
        const me = endOfWeek(endOfMonth(currentDate), { weekStartsOn });
        return { rangeFrom: ms, rangeTo: me };
      }
    }
  }, [viewType, currentDate, weekCount, weekStartsOn]);

  // Build per-day buckets when cards mode is on AND the user has any non-event
  // overlay enabled. In cards-mode-without-overlays the events alone are already
  // available via the `events` array, so the bucket build is wasted work.
  const cardsMode = displayMode === 'cards';
  const overlaysActive = cardsMode && (overlays.meals || overlays.chores || overlays.tasks);

  const { bucketsByDate, refresh: refreshBuckets } = useDayBucketsForRange({
    from: rangeFrom,
    to: rangeTo,
    overlays: {
      events: false, // events come from CalendarView's filtered list, not the bucket
      meals: overlaysActive && overlays.meals,
      chores: overlaysActive && overlays.chores,
      tasks: overlaysActive && overlays.tasks,
    },
    externalEvents: events,
  });

  const refreshAll = useMemo(() => async () => {
    await Promise.all([refreshEvents(), refreshBuckets()]);
  }, [refreshEvents, refreshBuckets]);

  const { moveChore, moveTask, moveMeal } = useWeekMutations({ refresh: refreshAll });

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const [moveError, setMoveError] = useState<string | null>(null);

  const handleDragEnd = async (e: DragEndEvent) => {
    setMoveError(null);
    const { active, over } = e;
    if (!over) return;
    const dragId = String(active.id);
    const targetIso = String(over.id);
    const colon = dragId.indexOf(':');
    if (colon === -1) return;
    const variant = dragId.slice(0, colon);
    const itemId = dragId.slice(colon + 1);

    const targetBucket = bucketsByDate.get(targetIso);
    if (!targetBucket) return;

    try {
      if (variant === 'chore') await moveChore(itemId, targetBucket.date);
      else if (variant === 'task') await moveTask(itemId, targetBucket.date);
      else if (variant === 'meal') await moveMeal(itemId, targetBucket.date);
    } catch (err) {
      setMoveError(err instanceof Error ? err.message : 'Failed to move item');
    }
  };

  const isMobile = useIsMobile();

  // Notes support for day and list views
  const [showNotes, setShowNotes] = useState(false);
  const notesSupported = viewType === 'day' || viewType === 'weekVertical';
  const notesDays = useMemo(() => {
    if (!notesSupported || !showNotes) return [];
    if (viewType === 'day') return [currentDate];
    const ws = startOfWeek(currentDate, { weekStartsOn });
    return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  }, [notesSupported, showNotes, viewType, currentDate, weekStartsOn]);

  const notesFrom = notesDays.length > 0 ? format(notesDays[0]!, 'yyyy-MM-dd') : '';
  const notesTo = notesDays.length > 0 ? format(notesDays[notesDays.length - 1]!, 'yyyy-MM-dd') : '';
  const { notesByDate, upsertNote } = useCalendarNotes({
    from: notesFrom,
    to: notesTo,
    enabled: showNotes && notesSupported,
  });

  // Swipe navigation for touch devices
  const swipeRef = useSwipeNavigation<HTMLDivElement>({
    onSwipeLeft: goToNext,
    onSwipeRight: goToPrevious,
    threshold: 50,
  });

  const handleAddWithAuth = async () => {
    const user = await requireAuth('Add Event', 'Please log in to add an event');
    if (!user) return;
    setShowAddEvent(true);
  };

  // Force agenda or day view on mobile; default to agenda
  useEffect(() => {
    if (isMobile && viewType !== 'day' && viewType !== 'agenda') {
      setViewType('agenda');
    }
  }, [isMobile, viewType, setViewType]);

  return (
    <PageWrapper>
      <div className="h-screen flex flex-col">
        <SubpageHeader
          icon={!isMobile ? <Calendar className="h-5 w-5 text-primary" /> : undefined}
          title={isMobile ? format(currentDate, 'MMM d, yyyy') : getDateRangeTitle()}
          actions={<>
            {isMobile ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToToday}
                  className="h-7 text-xs"
                >
                  Today
                </Button>
                <div className="flex items-center border rounded-md">
                  <Button
                    variant={viewType === 'agenda' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewType('agenda')}
                    className="h-7 text-xs rounded-r-none"
                  >
                    Agenda
                  </Button>
                  <Button
                    variant={viewType === 'day' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewType('day')}
                    className="h-7 text-xs rounded-l-none border-l"
                  >
                    Day
                  </Button>
                </div>
                <div className="flex items-center">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPrevious} aria-label="Previous">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNext} aria-label="Next">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={goToToday}>Today</Button>
                <div className="flex items-center">
                  <Button variant="ghost" size="icon" onClick={goToPrevious} aria-label="Previous">
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={goToNext} aria-label="Next">
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </>
            )}
            {/* View switcher - hidden on mobile (mobile always shows day/agenda view) */}
            <div className="hidden md:flex items-center border rounded-md">
              <Button variant={viewType === 'agenda' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewType('agenda')} className="rounded-r-none">
                <ListChecks className="h-4 w-4 mr-1" />Agenda
              </Button>
              <Button variant={viewType === 'day' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewType('day')} className="rounded-none border-l">
                <CalendarDays className="h-4 w-4 mr-1" />Day
              </Button>
              <Button variant={viewType === 'week' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewType('week')} className="rounded-none border-x">
                <CalendarRange className="h-4 w-4 mr-1" />Week
              </Button>
              <Button variant={viewType === 'weekVertical' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewType('weekVertical')} className="rounded-none border-r">
                <List className="h-4 w-4 mr-1" />List
              </Button>
              <div className="relative flex items-center border-r">
                <Button
                  variant={viewType === 'multiWeek' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="rounded-none"
                  onClick={() => setViewType('multiWeek')}
                  asChild
                >
                  <label className="cursor-pointer">
                    <CalendarRange className="h-4 w-4 mr-1" />{weekCount}W
                    {viewType === 'multiWeek' && (
                      <select
                        value={weekCount}
                        onChange={(e) => setWeekCount(Number(e.target.value) as 1 | 2 | 3 | 4)}
                        className="absolute inset-0 w-full opacity-0 cursor-pointer"
                        aria-label="Number of weeks"
                        style={{ colorScheme: 'normal' }}
                      >
                        {[1, 2, 3, 4].map(n => (
                          <option key={n} value={n} className="text-foreground bg-background">{n}W</option>
                        ))}
                      </select>
                    )}
                  </label>
                </Button>
              </div>
              <Button variant={viewType === 'month' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewType('month')} className="rounded-none border-r">
                <LayoutGrid className="h-4 w-4 mr-1" />Month
              </Button>
              <Button variant={viewType === 'threeMonth' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewType('threeMonth')} className="rounded-l-none">
                <LayoutGrid className="h-4 w-4 mr-1" />3 Mo
              </Button>
            </div>
            {/* Grid lines toggle - works on all applicable views */}
            <div className="hidden md:flex items-center gap-1">
              {notesSupported && (
                <Button
                  variant={showNotes ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setShowNotes(!showNotes)}
                  title={showNotes ? 'Hide notes' : 'Show notes'}
                  aria-label="Toggle notes"
                >
                  <StickyNote className={cn('h-4 w-4', showNotes && 'text-primary')} />
                </Button>
              )}
              <Button
                variant={weeksBordered ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setWeeksBordered(!weeksBordered)}
                title={weeksBordered ? 'Hide grid lines' : 'Show grid lines'}
                aria-label="Toggle grid lines"
              >
                <Grid3X3 className={cn('h-4 w-4', weeksBordered && 'text-primary')} />
              </Button>
              {viewType !== 'threeMonth' && (
                <Button
                  variant={displayMode === 'cards' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setDisplayMode(displayMode === 'cards' ? 'inline' : 'cards')}
                  title={displayMode === 'cards' ? 'Switch to inline blocks' : 'Switch to cards'}
                  aria-label="Toggle card display"
                >
                  <LayoutPanelTop className={cn('h-4 w-4', displayMode === 'cards' && 'text-primary')} />
                </Button>
              )}
              <OverlaysToolbar
                overlays={overlays}
                onChange={setOverlays}
                showOverlayRows={cardsMode}
              />
            </div>
            {!isMobile && (
              <Button size="sm" onClick={handleAddWithAuth}>
                <Plus className="h-4 w-4 mr-1" />Add Event
              </Button>
            )}
          </>}
        />

        {!isMobile && calendarGroups.length > 0 && (
          <FilterBar>
            <span className="text-sm text-muted-foreground shrink-0">Show:</span>
            <Button
              variant={selectedCalendarIds.has('all') ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleCalendar('all')}
              className="h-7 text-xs"
            >
              All
            </Button>
            {calendarGroups.map((group) => {
              const isSelected = selectedCalendarIds.has(group.id) || selectedCalendarIds.has('all');
              return (
                <Button
                  key={group.id}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleCalendar(group.id)}
                  className={cn('h-7 text-xs gap-1.5', isSelected && 'border-transparent')}
                  style={isSelected ? { backgroundColor: group.color, color: contrastText(group.color) } : undefined}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.55)' : group.color }} />
                  {group.name}
                </Button>
              );
            })}
            {(viewType === 'weekVertical' || viewType === 'day') && calendarGroups.length > 1 && (
              <Button
                variant={mergedView ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setMergedView(!mergedView)}
                className="gap-1 ml-auto"
                title={mergedView ? 'Split by calendar' : 'Merge into one column'}
              >
                <Merge className="h-3.5 w-3.5" />
                {mergedView ? 'Split' : 'Merge'}
              </Button>
            )}
          </FilterBar>
        )}

        <div ref={swipeRef} className="flex-1 overflow-hidden p-4 min-h-0">
          {loading && (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && (
            <div className="h-full flex items-center justify-center">
              <p className="text-destructive">Failed to load calendar: {error}</p>
            </div>
          )}
          {!loading && !error && (
            <div className="h-full">
            {moveError && (
              <div className="mb-2 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {moveError}
              </div>
            )}
            <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
            <DndContext sensors={dndSensors} onDragEnd={handleDragEnd}>
              {viewType === 'agenda' && (
                <AgendaView
                  events={events}
                  days={30}
                  onEventClick={setSelectedEvent}
                  displayMode={displayMode}
                  bucketsByDate={overlaysActive ? bucketsByDate : undefined}
                  enableDnd={overlaysActive}
                />
              )}
              {viewType === 'month' && (
                <MonthView currentDate={currentDate} events={events} onEventClick={setSelectedEvent}
                  onDateClick={(date) => { setCurrentDate(date); setViewType('day'); }} bordered={weeksBordered} displayMode={displayMode}
                  bucketsByDate={overlaysActive ? bucketsByDate : undefined}
                  enableDnd={overlaysActive}
                />
              )}
              {viewType === 'week' && (
                <WeekView currentDate={currentDate} events={events} onEventClick={setSelectedEvent} bordered={weeksBordered} displayMode={displayMode}
                  bucketsByDate={overlaysActive ? bucketsByDate : undefined}
                  enableDnd={overlaysActive}
                />
              )}
              {viewType === 'weekVertical' && (
                <WeekVerticalView
                  currentDate={currentDate}
                  events={events}
                  calendarGroups={calendarGroups}
                  selectedCalendarIds={selectedCalendarIds}
                  mergedView={mergedView}
                  bordered={weeksBordered}
                  onEventClick={setSelectedEvent}
                  showNotes={showNotes}
                  notesByDate={notesByDate}
                  onNoteChange={activeUser ? upsertNote : undefined}
                  displayMode={displayMode}
                  bucketsByDate={overlaysActive ? bucketsByDate : undefined}
                  enableDnd={overlaysActive}
                />
              )}
              {viewType === 'multiWeek' && (
                <MultiWeekView currentDate={currentDate} events={events} onEventClick={setSelectedEvent} weekCount={weekCount} bordered={weeksBordered} displayMode={displayMode}
                  bucketsByDate={overlaysActive ? bucketsByDate : undefined}
                  enableDnd={overlaysActive}
                />
              )}
              {viewType === 'threeMonth' && (
                <ThreeMonthView currentDate={currentDate} events={events} onEventClick={setSelectedEvent}
                  onDateClick={(date) => { setCurrentDate(date); setViewType('month'); }} bordered={weeksBordered} />
              )}
              {viewType === 'day' && (
                <DayViewSideBySide
                  currentDate={currentDate}
                  events={events}
                  calendarGroups={calendarGroups}
                  selectedCalendarIds={selectedCalendarIds}
                  mergedView={mergedView}
                  bordered={weeksBordered}
                  onEventClick={setSelectedEvent}
                  showNotes={showNotes}
                  notesByDate={notesByDate}
                  onNoteChange={activeUser ? upsertNote : undefined}
                  displayMode={displayMode}
                  bucketsByDate={overlaysActive ? bucketsByDate : undefined}
                  enableDnd={overlaysActive}
                />
              )}
            </DndContext>
            </Suspense>
            </div>
          )}
        </div>

        {selectedEvent && (
          <EventDetailModal
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            onEdit={() => { setEditingEvent(selectedEvent); setSelectedEvent(null); }}
            onDeleted={() => { setSelectedEvent(null); refreshEvents(); }}
          />
        )}

        <AddEventModal
          open={showAddEvent || editingEvent !== null}
          onOpenChange={(open) => { if (!open) { setShowAddEvent(false); setEditingEvent(null); } }}
          event={editingEvent ? {
            id: editingEvent.id,
            title: editingEvent.title,
            description: editingEvent.description,
            location: editingEvent.location,
            startTime: editingEvent.startTime,
            endTime: editingEvent.endTime,
            allDay: editingEvent.allDay,
            color: editingEvent.color,
            recurring: false,
            recurrenceRule: undefined,
            reminderMinutes: undefined,
            calendarSourceId: editingEvent.calendarId !== 'local' ? editingEvent.calendarId : undefined,
          } : undefined}
          onEventCreated={() => { refreshEvents(); setShowAddEvent(false); setEditingEvent(null); }}
        />
      </div>
    </PageWrapper>
  );
}


function EventDetailModal({ event, onClose, onEdit, onDeleted }: {
  event: { id: string; title: string; startTime: Date; endTime: Date; allDay: boolean; color: string; location?: string; calendarName: string };
  onClose: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const { confirm, dialogProps } = useConfirmDialog();

  const handleDelete = async () => {
    const ok = await confirm('Delete this event?', 'Are you sure you want to delete this event?');
    if (!ok) return;
    try {
      const response = await fetch(`/api/events/${event.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const err = await response.json();
        toast({ title: err.error || 'Failed to delete event', variant: 'destructive' });
        return;
      }
      onDeleted();
    } catch { toast({ title: 'Failed to delete event', variant: 'destructive' }); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4 shadow-lg border border-border" onClick={(e) => e.stopPropagation()}>
        <div className="w-full h-2 rounded-t-lg -mt-6 -mx-6 mb-4" style={{ backgroundColor: event.color }} />
        <h2 className="text-xl font-bold mb-2">{event.title}</h2>
        <p className="text-sm text-muted-foreground mb-1">
          {event.allDay
            ? format(event.startTime, 'EEEE, MMMM d')
            : `${format(event.startTime, 'EEEE, MMMM d')} at ${format(event.startTime, 'h:mm a')}`}
        </p>
        {event.location && <p className="text-sm text-muted-foreground mb-4">{event.location}</p>}
        <p className="text-xs text-muted-foreground">{event.calendarName}</p>
        <div className="flex justify-between mt-6">
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button onClick={onEdit}>Edit</Button>
          </div>
        </div>
      </div>
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
