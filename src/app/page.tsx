import { DashboardClient } from './DashboardClient';

export const metadata = {
  title: 'Dashboard',
  description: 'Your family dashboard - view calendars, tasks, weather, and more.',
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Server-rendered content for fast LCP — replaced by client dashboard on hydration */}
      <div id="ssr-placeholder" className="h-screen flex items-center justify-center" aria-hidden="true">
        <h1 className="text-4xl font-bold text-muted-foreground/20">Prism</h1>
      </div>
      <DashboardClient />
    </main>
  );
}
