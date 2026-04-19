'use client';

import { Compass } from 'lucide-react';
import { WeekendPlaceCard } from './WeekendPlaceCard';
import type { WeekendPlace } from '../types';

interface WeekendPlaceGridProps {
  places: WeekendPlace[];
  selectedId: string | null;
  onSelect: (place: WeekendPlace) => void;
}

export function WeekendPlaceGrid({ places, selectedId, onSelect }: WeekendPlaceGridProps) {
  if (places.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
        <Compass className="h-12 w-12 opacity-30" />
        <p className="text-sm">No places yet — add something to try!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 content-start p-1">
      {places.map((place) => (
        <WeekendPlaceCard
          key={place.id}
          place={place}
          selected={place.id === selectedId}
          onClick={() => onSelect(place)}
        />
      ))}
    </div>
  );
}
