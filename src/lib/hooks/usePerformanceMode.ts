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

  // Read from localStorage on mount and apply class.
  // Supports ?perf=1 URL param for kiosk/headless devices that can't reach Settings:
  //   loading with ?perf=1  → enables and persists performance mode
  //   loading with ?perf=0  → disables and persists performance mode
  // The param is stripped from the URL after being applied.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramVal = params.get('perf');

    let on: boolean;
    if (paramVal === '1' || paramVal === '0') {
      on = paramVal === '1';
      localStorage.setItem(STORAGE_KEY, String(on));
      // Remove the param from the URL without a page reload
      params.delete('perf');
      const newSearch = params.toString();
      const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
      window.history.replaceState(null, '', newUrl);
    } else {
      on = localStorage.getItem(STORAGE_KEY) === 'true';
    }

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
