'use client';

import { useState, useCallback, useEffect } from 'react';

export function useMeasureMode() {
  const [measureMode, setMeasureMode] = useState(false);
  const [measureHideNav, setMeasureHideNav] = useState(true);

  const dispatchMeasure = useCallback((active: boolean, hideNav: boolean) => {
    window.dispatchEvent(new CustomEvent('prism:measure-mode', {
      detail: { active, hideNav },
    }));
  }, []);

  const toggleMeasureMode = useCallback(() => {
    setMeasureMode(prev => {
      const next = !prev;
      dispatchMeasure(next, measureHideNav);
      return next;
    });
  }, [dispatchMeasure, measureHideNav]);

  const toggleMeasureNav = useCallback(() => {
    setMeasureHideNav(prev => {
      const next = !prev;
      dispatchMeasure(true, next);
      return next;
    });
  }, [dispatchMeasure]);

  // Keyboard shortcut: Ctrl+Shift+M
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        toggleMeasureMode();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleMeasureMode]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      dispatchMeasure(false, false);
    };
  }, [dispatchMeasure]);

  return { measureMode, measureHideNav, toggleMeasureMode, toggleMeasureNav };
}
