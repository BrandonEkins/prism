'use client';

import { useState, useEffect, useRef } from 'react';
import { Monitor, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLayouts } from '@/lib/hooks/useLayouts';
import Link from 'next/link';

const FONT_SCALE_OPTIONS = [75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 130, 140, 150];

function isVerticalNavKey(e: KeyboardEvent | React.KeyboardEvent): boolean {
  return (
    e.key === 'ArrowUp' ||
    e.key === 'Up' ||
    e.key === 'ArrowDown' ||
    e.key === 'Down' ||
    e.keyCode === 38 ||
    e.keyCode === 40 ||
    e.keyCode === 19 || // Android KEYCODE_DPAD_UP
    e.keyCode === 20 || // Android KEYCODE_DPAD_DOWN
    e.which === 38 ||
    e.which === 40 ||
    e.which === 19 ||
    e.which === 20 ||
    e.code === 'ArrowUp' ||
    e.code === 'ArrowDown'
  );
}

function focusActiveSidebarTab() {
  const activeSidebarBtn = document.querySelector<HTMLButtonElement>(
    'nav button.bg-accent, nav button[data-active="true"]'
  );
  if (activeSidebarBtn) {
    activeSidebarBtn.focus();
  }
}

function FontScaleSlider({
  layoutId,
  scale,
  onChange,
}: {
  layoutId: string;
  scale: number;
  onChange: (layoutId: string, scale: number) => void;
}) {
  const min = 75;
  const max = 150;
  const step = 5;
  const safeScale = typeof scale === 'number' && !isNaN(scale) ? scale : 100;
  const pct = Math.max(0, Math.min(100, ((safeScale - min) / (max - min)) * 100));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const isLeft = e.key === 'ArrowLeft' || e.key === 'Left' || e.keyCode === 37 || e.keyCode === 21 || e.which === 37 || e.which === 21;
    const isRight = e.key === 'ArrowRight' || e.key === 'Right' || e.keyCode === 39 || e.keyCode === 22 || e.which === 39 || e.which === 22;

    if (isLeft) {
      e.preventDefault();
      e.stopPropagation();
      const next = Math.max(min, safeScale - step);
      onChange(layoutId, next);
    } else if (isRight) {
      e.preventDefault();
      e.stopPropagation();
      const next = Math.min(max, safeScale + step);
      onChange(layoutId, next);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const updateFromPointer = (clientX: number) => {
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const raw = min + ratio * (max - min);
      const stepped = Math.round(raw / step) * step;
      onChange(layoutId, Math.max(min, Math.min(max, stepped)));
    };
    updateFromPointer(e.clientX);

    const onPointerMove = (ev: PointerEvent) => updateFromPointer(ev.clientX);
    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(layoutId, Math.max(min, safeScale - step))}
        className="h-7 w-7 flex items-center justify-center rounded border border-border bg-card text-xs font-bold hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label="Decrease font scale"
      >
        -
      </button>

      <div
        role="slider"
        tabIndex={0}
        aria-label="Font scale"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={safeScale}
        aria-valuetext={`${safeScale}%`}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        className="relative flex-1 flex items-center h-6 cursor-pointer touch-none select-none focus:outline-none group"
      >
        {/* Track background */}
        <div className="w-full h-2 bg-secondary rounded-full relative overflow-hidden">
          {/* Filled track */}
          <div
            className="h-full bg-primary rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* 100% marker — sits at 33.3% on the 75–150 range */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-muted-foreground/50 pointer-events-none rounded-full"
          style={{ left: 'calc(33.3% - 1px)' }}
          title="100% default"
        />

        {/* Slider Thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-background border-2 border-primary rounded-full shadow transition-transform group-focus:ring-2 group-focus:ring-primary group-focus:ring-offset-2 group-hover:scale-110"
          style={{ left: `${pct}%` }}
        />
      </div>

      <button
        type="button"
        onClick={() => onChange(layoutId, Math.min(max, safeScale + step))}
        className="h-7 w-7 flex items-center justify-center rounded border border-border bg-card text-xs font-bold hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label="Increase font scale"
      >
        +
      </button>
    </div>
  );
}

export function DisplaysSection() {
  const { layouts, loading } = useLayouts();
  const [saving, setSaving] = useState<string | null>(null);
  // Optimistic local scale values — keyed by layout id
  const [localScales, setLocalScales] = useState<Record<string, number>>({});

  // Initialise local scales from loaded layouts (only once per layout)
  useEffect(() => {
    if (layouts.length === 0) return;
    setLocalScales((prev) => {
      const next = { ...prev };
      for (const l of layouts) {
        if (!(l.id in next)) next[l.id] = l.fontScale ?? 100;
      }
      return next;
    });
  }, [layouts]);

  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const updateFontScale = (layoutId: string, scale: number) => {
    // Update local state immediately — slider stays responsive
    setLocalScales((prev) => ({ ...prev, [layoutId]: scale }));

    // Debounce DB write so rapid slider drags don't spam the API
    const timers = saveTimers.current;
    if (timers[layoutId]) clearTimeout(timers[layoutId]);
    timers[layoutId] = setTimeout(async () => {
      setSaving(layoutId);
      try {
        await fetch(`/api/layouts/${layoutId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fontScale: scale === 100 ? null : scale }),
        });
      } catch {
        setLocalScales((prev) => ({ ...prev, [layoutId]: layouts.find(l => l.id === layoutId)?.fontScale ?? 100 }));
      } finally {
        setSaving(null);
      }
    }, 400);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Displays</h2>
        <p className="text-muted-foreground">
          Configure per-display settings for each of your named dashboards.
          Font scale lets you tune text size for screens that are farther away or have unusual DPI.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : layouts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No dashboards yet. Create one from the dashboard toolbar.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {layouts.map((layout) => {
            const scale = localScales[layout.id] ?? layout.fontScale ?? 100;
            const url = layout.slug ? `/d/${layout.slug}` : '/';
            return (
              <Card key={layout.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base">{layout.name}</CardTitle>
                      {layout.isDefault && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                    </div>
                    <Link
                      href={url}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {layout.slug ? `/d/${layout.slug}` : '/'}
                    </Link>
                  </div>
                  {layout.slug && (
                    <CardDescription className="text-xs mt-0.5">
                      Subpages available at <code className="font-mono">/d/{layout.slug}/calendar</code>, <code className="font-mono">/tasks</code>, etc.
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Font Scale</span>
                      <span className={cn(
                        'text-sm tabular-nums',
                        scale !== 100 ? 'text-primary font-medium' : 'text-muted-foreground'
                      )}>
                        {scale}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-6">A</span>
                      <div className="flex-1 relative">
                        <FontScaleSlider
                          layoutId={layout.id}
                          scale={scale}
                          onChange={updateFontScale}
                        />
                        {/* 100% marker — sits at 33% from left on the 75–150 range */}
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-2 bg-muted-foreground/40 pointer-events-none"
                          style={{ left: 'calc(33.3% - 1px)' }}
                          title="100% default"
                        />
                      </div>
                      <span className="text-base text-muted-foreground w-6">A</span>
                    </div>
                    {/* Quick-select labels — positioned proportionally on the 75–150 scale */}
                    <div className="relative h-5 mt-0.5">
                      {[75, 100, 125, 150].map((s) => {
                        const pct = ((s - 75) / 75) * 100;
                        return (
                          <button
                            key={s}
                            onClick={() => updateFontScale(layout.id, s)}
                            className={cn(
                              'absolute text-xs px-0.5 py-0.5 rounded transition-colors -translate-x-1/2',
                              scale === s
                                ? 'text-primary font-medium'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                            style={{ left: `${pct}%` }}
                          >
                            {s}%
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                    <span className="capitalize">{layout.orientation || 'landscape'}</span>
                    <span>·</span>
                    <span>{layout.widgets.length} widget{layout.widgets.length !== 1 ? 's' : ''}</span>
                    {saving === layout.id && (
                      <>
                        <span>·</span>
                        <span className="text-primary">Saving…</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="border-dashed">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            <strong>Tip:</strong> Set a dedicated device to open <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">/d/your-slug</code> as its home page, then tune font scale here to match its viewing distance and screen size.
            Each named dashboard is independent — changes here don&apos;t affect other displays.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
