'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';

const Dashboard = dynamic(
  () => import('@/components/dashboard').then(mod => ({ default: mod.Dashboard })),
  { loading: () => <div className="min-h-screen bg-background" /> }
);

export function DashboardClient() {
  // Hide SSR placeholder once client dashboard renders
  useEffect(() => {
    const el = document.getElementById('ssr-placeholder');
    if (el) el.style.display = 'none';
  }, []);

  return (
    <Dashboard />
  );
}
