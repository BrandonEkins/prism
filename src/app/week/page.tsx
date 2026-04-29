import { Suspense } from 'react';
import { WeekView } from './WeekView';

export const metadata = {
  title: 'Week Planner',
  description: 'Unified weekly view of calendar events, meals, chores, and tasks.',
};

export default function WeekPage() {
  return (
    <main className="min-h-screen bg-background">
      <Suspense fallback={<WeekSkeleton />}>
        <WeekView />
      </Suspense>
    </main>
  );
}

function WeekSkeleton() {
  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-8 w-56 bg-muted rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-10 w-10 bg-muted rounded animate-pulse" />
          <div className="h-10 w-20 bg-muted rounded animate-pulse" />
          <div className="h-10 w-10 bg-muted rounded animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-48 bg-muted/30 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}
