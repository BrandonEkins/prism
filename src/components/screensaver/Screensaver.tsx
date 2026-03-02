'use client';

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useIdleDetection } from '@/lib/hooks/useIdleDetection';
import { usePhotos } from '@/lib/hooks/usePhotos';
import { useAutoOrientationSetting, usePinnedPhoto, useScreensaverInterval } from '@/components/layout/WallpaperBackground';
import { useScreenOrientation } from '@/lib/hooks/useScreenOrientation';
import { ResponsiveGridLayout as RGL, useContainerWidth, getCompactor } from 'react-grid-layout';
import type { LayoutItem, Layout } from 'react-grid-layout';
import type { WidgetConfig } from '@/lib/hooks/useLayouts';
import { hexToRgba } from '@/lib/utils/color';
import { WidgetBgOverrideProvider } from '@/components/widgets/WidgetContainer';
import { WIDGET_REGISTRY } from '@/components/widgets/widgetRegistry';
import { useDashboardData } from '@/components/dashboard/useDashboardData';
import { buildWidgetProps } from '@/components/dashboard/useWidgetProps';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const SCREENSAVER_LAYOUT_KEY = 'prism-screensaver-layout';

const overlapCompactor = getCompactor(null, true);

export const DEFAULT_SCREENSAVER_LAYOUT: WidgetConfig[] = [
  { i: 'clock', x: 8, y: 9, w: 4, h: 3, visible: true },
  { i: 'weather', x: 8, y: 7, w: 4, h: 2, visible: true },
  { i: 'messages', x: 8, y: 4, w: 4, h: 3, visible: true },
  { i: 'calendar', x: 0, y: 4, w: 4, h: 4, visible: false },
  { i: 'birthdays', x: 0, y: 8, w: 4, h: 4, visible: false },
  { i: 'tasks', x: 0, y: 0, w: 3, h: 4, visible: false },
  { i: 'chores', x: 3, y: 0, w: 3, h: 4, visible: false },
  { i: 'shopping', x: 6, y: 0, w: 3, h: 4, visible: false },
  { i: 'meals', x: 0, y: 4, w: 4, h: 4, visible: false },
  { i: 'photos', x: 4, y: 4, w: 4, h: 4, visible: false },
  { i: 'wishes', x: 4, y: 0, w: 3, h: 4, visible: false },
  { i: 'busTracking', x: 9, y: 0, w: 3, h: 3, visible: false },
];

export function loadScreensaverLayout(): WidgetConfig[] {
  if (typeof window === 'undefined') return DEFAULT_SCREENSAVER_LAYOUT;
  try {
    const stored = localStorage.getItem(SCREENSAVER_LAYOUT_KEY);
    if (!stored) return DEFAULT_SCREENSAVER_LAYOUT;
    const parsed = JSON.parse(stored) as WidgetConfig[];
    return DEFAULT_SCREENSAVER_LAYOUT.map(def => {
      const saved = parsed.find(p => p.i === def.i);
      return saved ? { ...def, ...saved } : def;
    });
  } catch { return DEFAULT_SCREENSAVER_LAYOUT; }
}

export function saveScreensaverLayout(layout: WidgetConfig[]) {
  localStorage.setItem(SCREENSAVER_LAYOUT_KEY, JSON.stringify(layout));
}

const SCREENSAVER_PRESETS_KEY = 'prism-screensaver-presets';

export function getScreensaverPresets(): Array<{ name: string; widgets: WidgetConfig[] }> {
  try {
    const stored = localStorage.getItem(SCREENSAVER_PRESETS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

export function saveScreensaverPreset(name: string, widgets: WidgetConfig[]) {
  const presets = getScreensaverPresets();
  const existing = presets.findIndex(p => p.name === name);
  if (existing >= 0) presets[existing] = { name, widgets };
  else presets.push({ name, widgets });
  localStorage.setItem(SCREENSAVER_PRESETS_KEY, JSON.stringify(presets));
}

export function deleteScreensaverPreset(name: string) {
  const presets = getScreensaverPresets().filter(p => p.name !== name);
  localStorage.setItem(SCREENSAVER_PRESETS_KEY, JSON.stringify(presets));
}

export function Screensaver() {
  const { isIdle } = useIdleDetection();
  const { enabled: autoOrientation } = useAutoOrientationSetting();
  const { pinnedId } = usePinnedPhoto('screensaver');
  const { interval: screensaverInterval } = useScreensaverInterval();
  const screenOrientation = useScreenOrientation();
  const orientationOverride = typeof window !== 'undefined'
    ? (localStorage.getItem('prism-orientation-override') as 'landscape' | 'portrait' | null) || null
    : null;
  const effectiveOrientation = orientationOverride || screenOrientation;
  const { photos } = usePhotos({
    sort: 'random',
    limit: 50,
    usage: 'screensaver',
    orientation: autoOrientation ? effectiveOrientation : undefined,
  });
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);

  // Only rotate if no pinned photo and interval is not "never" (0)
  useEffect(() => {
    if (!isIdle || photos.length <= 1 || pinnedId || screensaverInterval === 0) return;
    const timer = setInterval(() => {
      setFadingOut(true);
      setTimeout(() => {
        setCurrentIndex((i) => (i + 1) % photos.length);
        setFadingOut(false);
      }, 1000);
    }, screensaverInterval * 1000);
    return () => clearInterval(timer);
  }, [isIdle, photos.length, pinnedId, screensaverInterval]);

  useEffect(() => {
    if (isIdle) {
      const timer = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [isIdle]);

  if (!isIdle) return null;

  // Use pinned photo if set, otherwise use rotating photos
  const src = pinnedId
    ? `/api/photos/${pinnedId}/file`
    : photos[currentIndex]
      ? `/api/photos/${photos[currentIndex]!.id}/file`
      : '';

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black transition-opacity duration-1000 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {src && (
        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
          style={{
            backgroundImage: `url(${src})`,
            opacity: fadingOut ? 0 : 1,
          }}
        />
      )}
      <div className="absolute inset-0 bg-black/40" />
      <ScreensaverGrid />
    </div>
  );
}

function ScreensaverGrid() {
  const layout = useMemo(() => loadScreensaverLayout(), []);
  const { width, containerRef, mounted } = useContainerWidth();
  const data = useDashboardData();
  const widgetProps = useMemo(() =>
    buildWidgetProps(
      data,
      async () => null, // no auth in screensaver
      { setShowAddTask: () => {}, setShowAddMessage: () => {}, setShowAddChore: () => {}, setShowAddShopping: () => {} },
      '',
    ),
  [data]);

  const rowHeight = useMemo(() => {
    if (typeof window === 'undefined') return 60;
    return Math.max(30, Math.floor((window.innerHeight - 24) / 12));
  }, []);

  const visibleWidgets = useMemo(
    () => layout.filter(w => w.visible !== false),
    [layout]
  );

  const rglLayout: LayoutItem[] = useMemo(
    () => visibleWidgets.map((w) => ({ i: w.i, x: w.x, y: w.y, w: w.w, h: w.h, static: true })),
    [visibleWidgets]
  );

  const getWidgetStyle = (w: WidgetConfig): React.CSSProperties | undefined => {
    if (!w.backgroundColor && !w.outlineColor && !w.textColor) return undefined;
    const style: React.CSSProperties = { borderRadius: '0.5rem' };
    if (w.backgroundColor && w.backgroundColor !== 'transparent') {
      const opacity = w.backgroundOpacity ?? 1;
      style.backgroundColor = opacity < 1
        ? hexToRgba(w.backgroundColor, opacity)
        : w.backgroundColor;
    }
    if (w.outlineColor) {
      const olOpacity = w.outlineOpacity ?? 1;
      style.border = `2px solid ${olOpacity < 1 ? hexToRgba(w.outlineColor, olOpacity) : w.outlineColor}`;
    }
    if (w.textColor) {
      const txtOpacity = w.textOpacity ?? 1;
      style.color = txtOpacity < 1
        ? hexToRgba(w.textColor, txtOpacity)
        : w.textColor;
    }
    return style;
  };

  const renderWidget = (w: WidgetConfig) => {
    const reg = WIDGET_REGISTRY[w.i];
    if (!reg) return null;
    const Component = reg.component;
    const rawProps = { ...widgetProps[w.i] || {}, gridW: w.w, gridH: w.h };
    // Strip interactive callbacks — screensaver widgets are display-only
    // (any interaction exits the screensaver, so buttons/dropdowns are misleading)
    const {
      onAddClick, onAddMeal, onListChange, onItemToggle, onTaskToggle,
      onChoreComplete, onEventClick, onMessageClick, onDeleteClick,
      onMarkCooked, onUnmarkCooked,
      ...props
    } = rawProps as Record<string, unknown>;
    return (
      <React.Suspense fallback={<div className="flex items-center justify-center h-full opacity-50 text-sm">Loading...</div>}>
        <div className="h-full w-full [&_*]:!bg-transparent [&_.bg-card]:!bg-white/10 [&_.border-border]:!border-white/20">
          <Component {...props} />
        </div>
      </React.Suspense>
    );
  };

  return (
    <div ref={containerRef as React.RefObject<HTMLDivElement>} className="relative w-full h-full">
      {mounted && width > 0 && (
        <RGL
          className="layout"
          width={width}
          layouts={{ lg: rglLayout }}
          breakpoints={{ lg: 0 }}
          cols={{ lg: 12 }}
          rowHeight={rowHeight}
          compactor={overlapCompactor}
          dragConfig={{ enabled: false }}
          resizeConfig={{ enabled: false }}
          containerPadding={[12, 12]}
          margin={[4, 4]}
        >
          {visibleWidgets.map(w => {
            const hasCustomBg = !!w.backgroundColor;
            const textColor = w.textColor || '#FFFFFF';
            const textOpacity = w.textOpacity ?? (w.textColor ? 1 : 0.9);
            return (
              <div key={w.i} style={getWidgetStyle(w)}>
                <WidgetBgOverrideProvider value={{ hasCustomBg, textColor, textOpacity }}>
                  {renderWidget(w)}
                </WidgetBgOverrideProvider>
              </div>
            );
          })}
        </RGL>
      )}
    </div>
  );
}

export { ScreensaverGrid };
