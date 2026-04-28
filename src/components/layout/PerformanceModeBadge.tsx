'use client';

import { Zap } from 'lucide-react';
import { usePerformanceMode } from '@/lib/hooks/usePerformanceMode';

export function PerformanceModeBadge() {
  const { enabled, setEnabled } = usePerformanceMode();
  if (!enabled) return null;

  return (
    <button
      onClick={() => setEnabled(false)}
      className="p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground"
      aria-label="Performance Mode active — click to turn off"
      title="Performance Mode active — click to turn off"
    >
      <Zap className="h-4 w-4" />
    </button>
  );
}
