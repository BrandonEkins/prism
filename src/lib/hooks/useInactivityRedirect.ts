'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

function isDashboard(path: string) {
  return path === '/' || path.startsWith('/d/');
}

/**
 * Redirects to the dashboard (/) after 5 minutes of user inactivity.
 * Only applies when the user is not already on a dashboard page.
 */
export function useInactivityRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  // Keep refs so the timer callback always sees the latest values
  // without needing them as effect dependencies (avoids re-registering
  // listeners on every navigation when router/pathname change).
  const routerRef = useRef(router);
  const pathnameRef = useRef(pathname);
  routerRef.current = router;
  pathnameRef.current = pathname;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (!isDashboard(pathnameRef.current)) {
          routerRef.current.push('/');
        }
      }, INACTIVITY_TIMEOUT);
    }

    const events = ['mousedown', 'touchstart', 'keydown', 'scroll'] as const;
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // Empty deps: registers listeners exactly once per mount, reads latest
  // router/pathname through refs inside the callback.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
