'use client';

import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number | null;
  onChange?: (v: number) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function StarRating({ value, onChange, size = 'md', className }: StarRatingProps) {
  const starSize = size === 'sm' ? 'text-sm' : 'text-lg';
  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          className={cn(
            starSize,
            'leading-none transition-transform',
            onChange ? 'cursor-pointer hover:scale-125' : 'cursor-default',
            n <= (value ?? 0) ? 'opacity-100' : 'opacity-25'
          )}
          disabled={!onChange}
          aria-label={`${n} star${n !== 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
