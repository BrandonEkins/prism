'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'prism-perf-mode';
const HTML_CLASS = 'performance-mode';

/**
 * Persists a "performance mode" preference to localStorage and reflects it
 * as a CSS class on <html>. When enabled:
 *  - backdrop-filter is removed (biggest GPU win on thin clients / integrated graphics)
 *  - CSS transitions and animations are made instant
 *
 * Called inside ThemeProvider so the class is applied on first render alongside
 * the dark/light class.
 */
export function usePerformanceMode() {
  const [enabled, setEnabledState] = useState(false);

  // Read from localStorage on mount and apply class
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const on = stored === 'true';
    setEnabledState(on);
    document.documentElement.classList.toggle(HTML_CLASS, on);
  }, []);

  const setEnabled = useCallback((on: boolean) => {
    setEnabledState(on);
    localStorage.setItem(STORAGE_KEY, String(on));
    document.documentElement.classList.toggle(HTML_CLASS, on);
  }, []);

  return { enabled, setEnabled };
}
