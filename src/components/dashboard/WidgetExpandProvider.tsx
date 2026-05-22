'use client';

/**
 * Widget magnify-on-double-tap (modal overlay variant).
 *
 * Double-tap any dashboard widget → it animates from its grid position
 * to a centered ~84vw × 84vh modal, with the rest of the dashboard
 * dimmed behind. Auto-collapses after AUTO_COLLAPSE_MS of inactivity
 * (timer resets on any pointer / wheel interaction inside the
 * magnified widget), or immediately on Escape / backdrop tap.
 *
 * Design notes:
 *  - FLIP-like animation: we capture the source widget's DOMRect on
 *    double-tap, mount the overlay at that rect, then on the next
 *    frame transition to the target centered rect. CSS transition
 *    does the heavy lifting; no animation library needed.
 *  - The widget is RE-RENDERED inside the overlay (not portal'd in
 *    place), so it runs as a fresh instance at the new gridW/gridH.
 *    Most widgets read from shared data hooks, so this is fine; ones
 *    with heavy local state would warrant moving to a portal approach.
 *  - Gated to the interactive Dashboard render path only. Screensaver,
 *    Away Mode, and Babysitter Mode never wrap their widgets in this
 *    provider, so the handler simply isn't attached there.
 */

import * as React from 'react';

const AUTO_COLLAPSE_MS = 8000;
const TRANSITION_MS = 220;
// Centered target — small viewport margin so the dashboard chrome around
// the modal stays as a visual anchor ("this is temporarily bigger, not
// a new page").
const TARGET = { top: '8vh', left: '8vw', width: '84vw', height: '84vh' } as const;

interface ExpandedState {
  id: string;
  sourceRect: DOMRect;
  phase: 'opening' | 'open' | 'closing';
}

interface ExpandContextValue {
  expandedId: string | null;
  triggerExpand: (id: string, fromElement: HTMLElement) => void;
  collapse: () => void;
}

const ExpandCtx = React.createContext<ExpandContextValue | null>(null);

export function useWidgetExpand(): ExpandContextValue {
  const ctx = React.useContext(ExpandCtx);
  // Outside the provider (screensaver / away / babysitter), return a
  // no-op shape so callers can unconditionally use the hook without
  // crashing those render paths.
  return ctx ?? { expandedId: null, triggerExpand: () => {}, collapse: () => {} };
}

interface ProviderProps {
  /** Renders the magnified widget body for the given widget id. */
  renderMagnified: (id: string) => React.ReactNode;
  children: React.ReactNode;
}

export function WidgetExpandProvider({ renderMagnified, children }: ProviderProps) {
  const [expanded, setExpanded] = React.useState<ExpandedState | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = React.useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  const scheduleCollapse = React.useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      setExpanded(prev => prev ? { ...prev, phase: 'closing' } : null);
    }, AUTO_COLLAPSE_MS);
  }, [clearTimer]);

  const triggerExpand = React.useCallback((id: string, fromElement: HTMLElement) => {
    const sourceRect = fromElement.getBoundingClientRect();
    setExpanded({ id, sourceRect, phase: 'opening' });
    // Double rAF so the initial "at source rect" styles paint before we
    // transition to the target. Single rAF works in some browsers but
    // not reliably in Chromium — double is the safe pattern.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setExpanded(prev => prev ? { ...prev, phase: 'open' } : null);
      scheduleCollapse();
    }));
  }, [scheduleCollapse]);

  const collapse = React.useCallback(() => {
    clearTimer();
    setExpanded(prev => prev ? { ...prev, phase: 'closing' } : null);
  }, [clearTimer]);

  // After the closing transition ends, fully unmount the overlay.
  React.useEffect(() => {
    if (expanded?.phase !== 'closing') return;
    const t = setTimeout(() => setExpanded(null), TRANSITION_MS);
    return () => clearTimeout(t);
  }, [expanded?.phase]);

  // Escape key collapses.
  React.useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') collapse(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded, collapse]);

  // Reset the auto-collapse timer on any interaction inside the modal.
  const handleInteraction = React.useCallback(() => {
    if (expanded?.phase === 'open') scheduleCollapse();
  }, [expanded?.phase, scheduleCollapse]);

  const value = React.useMemo<ExpandContextValue>(
    () => ({ expandedId: expanded?.id ?? null, triggerExpand, collapse }),
    [expanded?.id, triggerExpand, collapse],
  );

  const overlayStyle: React.CSSProperties = expanded?.phase === 'open'
    ? TARGET
    : {
        top: expanded?.sourceRect.top,
        left: expanded?.sourceRect.left,
        width: expanded?.sourceRect.width,
        height: expanded?.sourceRect.height,
      };

  return (
    <ExpandCtx.Provider value={value}>
      {children}

      {expanded && (
        <>
          <div
            data-keep-bg
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm transition-opacity"
            style={{
              transitionDuration: `${TRANSITION_MS}ms`,
              opacity: expanded.phase === 'open' ? 1 : 0,
              pointerEvents: expanded.phase === 'opening' ? 'none' : 'auto',
            }}
            onClick={collapse}
            aria-hidden
          />
          <div
            data-keep-bg
            className="fixed z-50 overflow-hidden rounded-xl bg-card shadow-2xl ring-1 ring-border transition-all ease-out"
            style={{
              ...overlayStyle,
              transitionDuration: `${TRANSITION_MS}ms`,
              // Hide visual artifacts when sourceRect lands off-screen
              // (rare — only if user double-tapped a widget that scrolled
              // out between the capture and the next paint).
              opacity: expanded.phase === 'closing' ? 0.85 : 1,
            }}
            onPointerDownCapture={handleInteraction}
            onWheelCapture={handleInteraction}
            role="dialog"
            aria-modal="true"
          >
            {renderMagnified(expanded.id)}
          </div>
        </>
      )}
    </ExpandCtx.Provider>
  );
}
