'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Plus, MapPin, Image as ImageIcon, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TravelPin } from '../types';
import { STATUS_CONFIG } from '../types';

type FilterTab = 'all' | 'been_there' | 'want_to_go' | 'bucket_list';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'been_there', label: 'Been There' },
  { key: 'want_to_go', label: 'Want to Go' },
  { key: 'bucket_list', label: 'Bucket List' },
];

interface PinListProps {
  pins: TravelPin[];
  selectedPinId: string | null;
  photoCounts: Record<string, number>;
  onSelectPin: (pin: TravelPin) => void;
  onAddPin: () => void;
}

export function PinList({ pins, selectedPinId, photoCounts, onSelectPin, onAddPin }: PinListProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const filtered = pins
    .filter((p) => {
      if (activeTab === 'all') return true;
      if (activeTab === 'bucket_list') return p.isBucketList;
      return p.status === activeTab;
    })
    .sort((a, b) => {
      if (a.status === 'been_there' && b.status === 'been_there') {
        const da = a.visitedDate ?? '';
        const db = b.visitedDate ?? '';
        return db.localeCompare(da);
      }
      return a.name.localeCompare(b.name);
    });

  const counts: Record<FilterTab, number> = {
    all: pins.length,
    been_there: pins.filter((p) => p.status === 'been_there').length,
    want_to_go: pins.filter((p) => p.status === 'want_to_go').length,
    bucket_list: pins.filter((p) => p.isBucketList).length,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar + Add button */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border shrink-0">
        <div className="flex gap-1 flex-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {tab.key === 'bucket_list' && <Star className="h-3 w-3" />}
              {tab.label}
              {counts[tab.key] > 0 && (
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] leading-none',
                  activeTab === tab.key ? 'bg-primary-foreground/20' : 'bg-muted-foreground/20'
                )}>
                  {counts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={onAddPin} className="shrink-0 gap-1 h-7 text-xs px-2">
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      {/* Pin list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center p-4">
            <MapPin className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              {activeTab === 'all'
                ? 'No pins yet. Click the globe to add one.'
                : `No ${TABS.find((t) => t.key === activeTab)?.label.toLowerCase()} places yet.`}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((pin) => {
              const config = STATUS_CONFIG[pin.status];
              const photoCount = photoCounts[pin.id] ?? 0;
              const isSelected = pin.id === selectedPinId;

              return (
                <li key={pin.id}>
                  <button
                    onClick={() => onSelectPin(pin)}
                    className={cn(
                      'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors',
                      isSelected
                        ? 'bg-primary/10 border-l-2 border-primary'
                        : 'hover:bg-muted/50 border-l-2 border-transparent'
                    )}
                  >
                    {/* Status dot */}
                    <span
                      className="mt-1.5 h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: pin.color || config.color }}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm truncate">{pin.name}</span>
                        {pin.isBucketList && (
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500 shrink-0" />
                        )}
                        {photoCount > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground shrink-0">
                            <ImageIcon className="h-3 w-3" />
                            {photoCount}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {pin.tripLabel && (
                          <span className="text-xs text-muted-foreground truncate">{pin.tripLabel}</span>
                        )}
                        {!pin.tripLabel && pin.placeName && pin.placeName !== pin.name && (
                          <span className="text-xs text-muted-foreground truncate">{pin.placeName}</span>
                        )}
                        {pin.visitedDate && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {pin.visitedEndDate
                              ? `${format(parseISO(pin.visitedDate), 'MMM d')}–${format(parseISO(pin.visitedEndDate), 'MMM d, yyyy')}`
                              : format(parseISO(pin.visitedDate), 'MMM yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

    </div>
  );
}
