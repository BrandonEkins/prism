'use client';

import * as React from 'react';
import { Layers, Calendar, UtensilsCrossed, ListChecks, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { OverlayFlags } from '@/lib/hooks/useDayBucketsForRange';

interface OverlaysToolbarProps {
  overlays: OverlayFlags;
  onChange: (next: OverlayFlags) => void;
  /** Hide the meals/chores/tasks rows when cards mode is off — they have no visible effect. */
  showOverlayRows: boolean;
}

const ROWS: Array<{ key: keyof OverlayFlags; label: string; Icon: typeof Calendar }> = [
  { key: 'events', label: 'Events', Icon: Calendar },
  { key: 'meals', label: 'Meals', Icon: UtensilsCrossed },
  { key: 'chores', label: 'Chores', Icon: ListChecks },
  { key: 'tasks', label: 'Tasks', Icon: CheckSquare },
];

export function OverlaysToolbar({ overlays, onChange, showOverlayRows }: OverlaysToolbarProps) {
  const visibleCount = (Object.values(overlays) as boolean[]).filter(Boolean).length;
  const total = ROWS.length;

  const toggle = (key: keyof OverlayFlags) => {
    onChange({ ...overlays, [key]: !overlays[key] });
  };

  const rows = showOverlayRows ? ROWS : ROWS.filter((r) => r.key === 'events');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={visibleCount < total ? 'secondary' : 'ghost'}
          size="sm"
          aria-label="Show or hide calendar overlays"
          title="Overlays"
        >
          <Layers className={cn('h-4 w-4', visibleCount < total && 'text-primary')} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground mb-2">Show on calendar</p>
          {rows.map(({ key, label, Icon }) => {
            const checked = overlays[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggle(key)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                  'hover:bg-accent hover:text-accent-foreground transition-colors',
                  checked ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded border',
                    checked ? 'bg-primary border-primary' : 'border-muted-foreground/40',
                  )}
                  aria-hidden
                >
                  {checked && (
                    <svg viewBox="0 0 12 12" className="h-3 w-3 fill-none stroke-primary-foreground stroke-[2.5]">
                      <path d="M2 6.5l2.5 2.5L10 3" />
                    </svg>
                  )}
                </span>
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{label}</span>
              </button>
            );
          })}
          {!showOverlayRows && (
            <p className="text-[10px] text-muted-foreground mt-2 leading-snug">
              Switch to cards mode to show meals, chores, and tasks alongside events.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
