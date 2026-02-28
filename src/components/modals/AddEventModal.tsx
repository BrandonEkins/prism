/**
 *
 * A modal dialog for creating and editing calendar events.
 * Simplified design inspired by Google Calendar's quick-add modal.
 *
 * USAGE:
 *   <AddEventModal
 *     open={isOpen}
 *     onOpenChange={setIsOpen}
 *     onEventCreated={(event) => console.log('Created:', event)}
 *   />
 *
 */

'use client';

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Loader2, MapPin, AlignLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useCalendarSources } from '@/lib/hooks';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@/components/ui';

/**
 * Event data returned after creation
 */
export interface CreatedEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startTime: string;
  endTime: string;
  allDay: boolean;
  recurring: boolean;
  recurrenceRule: string | null;
  color: string | null;
  reminderMinutes: number | null;
}

/**
 * Event data for editing
 */
export interface EventToEdit {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime: Date | string;
  endTime: Date | string;
  allDay?: boolean;
  recurring?: boolean;
  recurrenceRule?: string;
  color?: string;
  reminderMinutes?: number;
  calendarSourceId?: string;
}

/**
 * AddEventModal Props
 */
export interface AddEventModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when event is successfully created or updated */
  onEventCreated?: (event: CreatedEvent) => void;
  /** Event to edit (if provided, modal is in edit mode) */
  event?: EventToEdit;
  /** Pre-fill start date when creating */
  defaultDate?: Date;
}

/**
 * Recurrence presets
 */
const RECURRENCE_OPTIONS = [
  { value: '', label: 'Does not repeat' },
  { value: 'FREQ=DAILY', label: 'Daily' },
  { value: 'FREQ=WEEKLY', label: 'Weekly' },
  { value: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', label: 'Every weekday' },
  { value: 'FREQ=MONTHLY', label: 'Monthly' },
  { value: 'FREQ=YEARLY', label: 'Yearly' },
];

/**
 * Reminder options (minutes before event)
 */
const REMINDER_OPTIONS = [
  { value: 5, label: '5 minutes before' },
  { value: 10, label: '10 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' },
];

/** Format date for datetime-local input (YYYY-MM-DDTHH:mm) */
function formatDateTimeLocal(date: Date | string | undefined): string {
  const d = date ? (typeof date === 'string' ? new Date(date) : date) : new Date();
  if (isNaN(d.getTime())) return formatDateTimeLocal(undefined);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/** Format date for date input (YYYY-MM-DD) */
function formatDateLocal(date: Date | string | undefined): string {
  const d = date ? (typeof date === 'string' ? new Date(date) : date) : new Date();
  if (isNaN(d.getTime())) return formatDateLocal(undefined);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * ADD EVENT MODAL COMPONENT
 */
export function AddEventModal({
  open,
  onOpenChange,
  onEventCreated,
  event,
  defaultDate,
}: AddEventModalProps) {
  const isEditMode = !!event;

  // Fetch available calendars
  const { calendars } = useCalendarSources();

  // Filter to only writable, non-read-only calendars with showInEventModal enabled
  const writableCalendars = useMemo(() => {
    return calendars.filter(
      (cal) => cal.enabled &&
               (cal.provider === 'google' || cal.provider === 'local') &&
               cal.showInEventModal !== false
    );
  }, [calendars]);

  // Default to first writable calendar (or 'local' if none)
  const defaultCalendarId = useMemo(() => {
    return writableCalendars.length > 0 ? writableCalendars[0]!.id : 'local';
  }, [writableCalendars]);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState<number | ''>('');
  const [calendarSourceId, setCalendarSourceId] = useState<string>('');
  const [showMore, setShowMore] = useState(false);

  // Loading/error state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve color from selected calendar's group
  const selectedCalendar = useMemo(() => {
    if (calendarSourceId === 'local') return null;
    return writableCalendars.find((c) => c.id === calendarSourceId) ?? null;
  }, [calendarSourceId, writableCalendars]);

  const eventColor = useMemo(() => {
    if (!selectedCalendar) return undefined;
    // Priority: group color > calendar source color > user color
    return selectedCalendar.groupColor || selectedCalendar.color || selectedCalendar.user?.color || undefined;
  }, [selectedCalendar]);

  // Handle all-day toggle: convert between date and datetime formats
  function handleAllDayChange(checked: boolean) {
    setAllDay(checked);
    if (checked && startTime) {
      // datetime-local → date: strip time portion
      setStartTime(startTime.split('T')[0] || startTime);
      if (endTime) {
        setEndTime(endTime.split('T')[0] || endTime);
      }
    } else if (!checked && startTime) {
      // date → datetime-local: add default times
      setStartTime(`${startTime}T09:00`);
      if (endTime) {
        setEndTime(`${endTime}T10:00`);
      }
    }
  }

  // Populate form when editing
  useEffect(() => {
    if (open && event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setLocation(event.location || '');
      const isAllDay = event.allDay || false;
      setAllDay(isAllDay);
      setStartTime(isAllDay ? formatDateLocal(event.startTime) : formatDateTimeLocal(event.startTime));
      setEndTime(isAllDay ? formatDateLocal(event.endTime) : formatDateTimeLocal(event.endTime));
      // Match recurrence rule to a preset, or use raw value
      setRecurrenceRule(event.recurrenceRule || '');
      setReminderMinutes(event.reminderMinutes ?? '');
      setCalendarSourceId(event.calendarSourceId || defaultCalendarId);
      // Show more options if editing event has description, location, reminder, or recurrence
      setShowMore(!!(event.description || event.location || event.reminderMinutes || event.recurrenceRule));
    } else if (open && defaultDate) {
      const start = new Date(defaultDate);
      start.setHours(9, 0, 0, 0);
      const end = new Date(start);
      end.setHours(10, 0, 0, 0);
      setStartTime(formatDateTimeLocal(start));
      setEndTime(formatDateTimeLocal(end));
    }
    // Set default calendar when opening (for new events without explicit calendar)
    if (open && !event) {
      setCalendarSourceId(defaultCalendarId);
    }
  }, [open, event, defaultDate, defaultCalendarId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setTitle('');
      setDescription('');
      setLocation('');
      setStartTime('');
      setEndTime('');
      setAllDay(false);
      setRecurrenceRule('');
      setReminderMinutes('');
      setCalendarSourceId(defaultCalendarId);
      setShowMore(false);
      setError(null);
    }
  }, [open, defaultCalendarId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // For all-day, only require date; for timed, require full datetime
    const hasStart = allDay ? !!startTime : !!startTime;
    const hasEnd = allDay ? !!endTime : !!endTime;
    if (!title.trim() || !hasStart || !hasEnd) return;

    // Build full ISO dates
    const startISO = allDay
      ? new Date(`${startTime}T00:00:00`).toISOString()
      : new Date(startTime).toISOString();
    const endISO = allDay
      ? new Date(`${endTime}T23:59:59`).toISOString()
      : new Date(endTime).toISOString();

    if (new Date(endISO) < new Date(startISO)) {
      setError('End must be after start');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const recurring = !!recurrenceRule;
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        startTime: startISO,
        endTime: endISO,
        allDay,
        recurring,
        recurrenceRule: recurring ? recurrenceRule : undefined,
        reminderMinutes: reminderMinutes !== '' ? Number(reminderMinutes) : undefined,
        calendarSourceId: calendarSourceId !== 'local' ? calendarSourceId : undefined,
        color: eventColor || undefined,
      };

      const url = isEditMode ? `/api/events/${event.id}` : '/api/events';
      const method = isEditMode ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save event');
      }

      const savedEvent = await response.json();

      if (savedEvent.warning) {
        toast({
          title: 'Event saved locally',
          description: savedEvent.warning,
          variant: 'warning',
        });
      }

      if (onEventCreated) {
        onEventCreated(savedEvent);
      }

      onOpenChange(false);
    } catch (err) {
      console.error('Failed to save event:', err);
      setError(err instanceof Error ? err.message : 'Failed to save event');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Event' : 'New Event'}</DialogTitle>
          <DialogDescription className="sr-only">
            {isEditMode ? 'Update event details.' : 'Create a new calendar event.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Title */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add title"
            className="text-base border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
            autoFocus
            required
          />

          {/* Date & Time */}
          <div className="space-y-2">
            {allDay ? (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="flex-1 text-sm"
                  required
                />
                <span className="text-muted-foreground text-sm shrink-0">to</span>
                <Input
                  type="date"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="flex-1 text-sm"
                  required
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Start</Label>
                  <Input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="text-xs px-2"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">End</Label>
                  <Input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="text-xs px-2"
                    required
                  />
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch
                id="event-all-day"
                checked={allDay}
                onCheckedChange={handleAllDayChange}
              />
              <Label htmlFor="event-all-day" className="text-sm cursor-pointer">
                All day
              </Label>
            </div>
          </div>

          {/* Calendar Selection */}
          <Select value={calendarSourceId} onValueChange={setCalendarSourceId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a calendar" />
            </SelectTrigger>
            <SelectContent>
              {writableCalendars.map((cal) => (
                <SelectItem key={cal.id} value={cal.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cal.groupColor || cal.color || '#3B82F6' }}
                    />
                    <span className="truncate">{cal.displayName || cal.dashboardCalendarName}</span>
                    {cal.groupName && (
                      <span
                        className="text-xs font-medium shrink-0 px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: (cal.groupColor || '#3B82F6') + '20',
                          color: cal.groupColor || '#3B82F6',
                        }}
                      >
                        {cal.groupName}
                      </span>
                    )}
                    {cal.provider === 'google' && (
                      <span className="text-xs text-muted-foreground shrink-0">Google</span>
                    )}
                  </div>
                </SelectItem>
              ))}
              <SelectItem value="local">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40 shrink-0" />
                  <span className="text-muted-foreground">Local only (no sync)</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* More options toggle */}
          <button
            type="button"
            onClick={() => setShowMore(!showMore)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showMore ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showMore ? 'Less options' : 'More options'}
          </button>

          {showMore && (
            <div className="space-y-3">
              {/* Location */}
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Add location"
                  className="flex-1"
                />
              </div>

              {/* Description */}
              <div className="flex items-start gap-2">
                <AlignLeft className="h-4 w-4 text-muted-foreground shrink-0 mt-2.5" />
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add description"
                  rows={2}
                  className="flex-1"
                />
              </div>

              {/* Recurrence */}
              <Select
                value={recurrenceRule || '__none__'}
                onValueChange={(v) => setRecurrenceRule(v === '__none__' ? '' : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Does not repeat" />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value || '__none__'} value={opt.value || '__none__'}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Reminder */}
              <Select
                value={reminderMinutes !== '' ? String(reminderMinutes) : 'none'}
                onValueChange={(value) => setReminderMinutes(value === 'none' ? '' : Number(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No reminder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No reminder</SelectItem>
                  {REMINDER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || !startTime || !endTime || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                isEditMode ? 'Save' : 'Save'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
