'use client';

import { useState, useEffect } from 'react';

export function useIsPWA(): boolean {
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)');
    setIsPWA(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsPWA(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isPWA;
}
