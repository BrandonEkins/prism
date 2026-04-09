'use client';

import { ChevronLeft, ChevronRight, Grid3X3, Merge, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { VIEW_OPTIONS, WidgetViewType, ResolvedViewType } from '@/lib/hooks/useCalendarWidgetPrefs';

interface CalendarWidgetControlsProps {
  viewType: WidgetViewType;
  setViewType: (v: WidgetViewType) => void;
  availableViews: WidgetViewType[];
  resolvedView: ResolvedViewType;
  widgetBordered: boolean;
  setWidgetBordered: (v: boolean) => void;
  mergedView: boolean;
  setMergedView: (v: boolean) => void;
  showNotes: boolean;
  setShowNotes: (v: boolean) => void;
  notesSupported: boolean;
  transparentMode: boolean;
  showMerge: boolean;
  goToPrevious: () => void;
  goToToday: () => void;
  goToNext: () => void;
}

export function CalendarWidgetControls({
  viewType,
  setViewType,
  availableViews,
  resolvedView,
  widgetBordered,
  setWidgetBordered,
  mergedView,
  setMergedView,
  showNotes,
  setShowNotes,
  notesSupported,
  transparentMode,
  showMerge,
  goToPrevious,
  goToToday,
  goToNext,
}: CalendarWidgetControlsProps) {
  const showBorderToggle =
    resolvedView === 'multiWeek' ||
    resolvedView === 'week' ||
    resolvedView === 'day' ||
    resolvedView === 'list' ||
    resolvedView === 'month';

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {/* Navigation (hidden in agenda-only mode) */}
      {availableViews.length > 1 && resolvedView !== 'agenda' && (
        <>
          <button onClick={goToPrevious} className="p-0.5 rounded hover:opacity-70" aria-label="Previous">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button onClick={goToToday} className="px-1.5 py-0.5 rounded text-[10px] font-medium hover:opacity-70">
            Today
          </button>
          <button onClick={goToNext} className="p-0.5 rounded hover:opacity-70" aria-label="Next">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </>
      )}

      {/* Merge/Split toggle for day and list views */}
      {showMerge && (
        <button
          onClick={() => setMergedView(!mergedView)}
          className={cn('p-0.5 rounded hover:opacity-70', mergedView && 'bg-current/20')}
          title={mergedView ? 'Split by calendar' : 'Merge into one column'}
          aria-label={mergedView ? 'Split by calendar' : 'Merge calendars'}
        >
          <Merge className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Notes toggle for day and list views */}
      {notesSupported && (
        <button
          onClick={() => setShowNotes(!showNotes)}
          className={cn('p-0.5 rounded hover:opacity-70', showNotes && 'bg-current/20')}
          title={showNotes ? 'Hide notes' : 'Show notes'}
          aria-label={showNotes ? 'Hide notes' : 'Show notes'}
        >
          <StickyNote className="h-3.5 w-3.5" />
        </button>
      )}

      {/* View selector + border toggle */}
      {availableViews.length > 1 && (
        <>
          <Select value={viewType} onValueChange={(v) => setViewType(v as WidgetViewType)}>
            <SelectTrigger
              aria-label="Calendar view"
              className={cn('h-6 w-[90px] text-[10px]', transparentMode && 'bg-transparent border-current/20')}
            >
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
          {showBorderToggle && (
            <button
              onClick={() => setWidgetBordered(!widgetBordered)}
              className={cn('p-0.5 rounded hover:opacity-70', widgetBordered && 'bg-current/20')}
              title={widgetBordered ? 'Hide grid lines' : 'Show grid lines'}
              aria-label="Toggle grid lines"
            >
              <Grid3X3 className="h-3.5 w-3.5" />
            </button>
          )}
        </>
      )}
    </div>
  );
}
