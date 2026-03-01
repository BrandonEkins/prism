'use client';

import * as React from 'react';
import { useState } from 'react';
import { validateCommunityLayout } from '@/lib/community/validateLayout';
import type { WidgetConfig } from '@/lib/hooks/useLayouts';
import { WIDGET_REGISTRY } from '@/components/widgets/widgetRegistry';

interface ExportWidget {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  backgroundColor?: string;
  backgroundOpacity?: number;
  minW?: number;
  minH?: number;
}

interface LayoutExportV2 {
  type: 'prism-layout';
  version: number;
  mode: 'dashboard' | 'screensaver';
  name: string;
  description: string;
  author: string;
  tags: string[];
  screenSizes: string[];
  orientation: 'landscape' | 'portrait';
  widgets: ExportWidget[];
}

export function LayoutEditorShareDialog({
  open,
  onClose,
  layoutName,
  mode,
  currentWidgets,
}: {
  open: boolean;
  onClose: () => void;
  layoutName?: string;
  mode: 'dashboard' | 'screensaver';
  currentWidgets: WidgetConfig[];
}) {
  const [shareForm, setShareForm] = useState({
    name: layoutName || '',
    description: '',
    author: '',
    screenSizes: [] as string[],
    orientation: 'landscape' as 'landscape' | 'portrait',
    tags: '',
  });
  const [shareErrors, setShareErrors] = useState<string[]>([]);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setShareForm({
        name: layoutName || '',
        description: '',
        author: '',
        screenSizes: [],
        orientation: 'landscape',
        tags: '',
      });
      setShareErrors([]);
    }
  }, [open, layoutName]);

  if (!open) return null;

  const buildExportData = (): LayoutExportV2 => ({
    type: 'prism-layout',
    version: 2,
    mode,
    name: layoutName || (mode === 'screensaver' ? 'Screensaver' : 'Dashboard'),
    description: '',
    author: '',
    tags: [],
    screenSizes: [],
    orientation: 'landscape',
    widgets: currentWidgets
      .filter(w => w.visible !== false)
      .map(widget => {
        const reg = WIDGET_REGISTRY[widget.i];
        const exported: ExportWidget = {
          i: widget.i,
          x: widget.x,
          y: widget.y,
          w: widget.w,
          h: widget.h,
        };
        if (widget.backgroundColor) exported.backgroundColor = widget.backgroundColor;
        if (widget.backgroundOpacity !== undefined && widget.backgroundOpacity !== 1) {
          exported.backgroundOpacity = widget.backgroundOpacity;
        }
        if (reg?.minW) exported.minW = reg.minW;
        if (reg?.minH) exported.minH = reg.minH;
        return exported;
      }),
  });

  const handleShareSubmit = () => {
    const exportData = buildExportData();
    const submissionData = {
      ...exportData,
      name: shareForm.name,
      description: shareForm.description,
      author: shareForm.author,
      screenSizes: shareForm.screenSizes,
      orientation: shareForm.orientation,
      tags: shareForm.tags.split(',').map(t => t.trim()).filter(Boolean),
    };

    const result = validateCommunityLayout(submissionData, { communitySubmission: true });
    if (!result.valid) {
      setShareErrors(result.errors);
      return;
    }

    const title = encodeURIComponent(`Community Layout: ${shareForm.name}`);
    const body = encodeURIComponent(
      '```json\n' + JSON.stringify(submissionData, null, 2) + '\n```\n\n' +
      `**Author:** ${shareForm.author}\n` +
      `**Screen Sizes:** ${shareForm.screenSizes.join(', ')}\n` +
      `**Orientation:** ${shareForm.orientation}\n`
    );
    const url = `https://github.com/sandydargoport/prism/issues/new?labels=layout-submission&title=${title}&body=${body}`;
    window.open(url, '_blank');
    onClose();
  };

  const presetSizes = ['1920x1080', '2560x1440', '3840x2160', '2560x1600', '2048x1536', '1366x768'];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-popover border border-border rounded-lg shadow-xl p-4 max-w-2xl w-full mx-4 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="text-sm font-medium">Share to Community</div>
        <p className="text-xs text-muted-foreground">
          Submit your layout to the Prism community gallery. This opens a GitHub Issue with your layout data.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Layout Name *</label>
            <input
              type="text"
              value={shareForm.name}
              onChange={e => setShareForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-2 py-1 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              maxLength={100}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Author Name *</label>
            <input
              type="text"
              value={shareForm.author}
              onChange={e => setShareForm(f => ({ ...f, author: e.target.value }))}
              className="w-full px-2 py-1 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              maxLength={50}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Description *</label>
          <input
            type="text"
            value={shareForm.description}
            onChange={e => setShareForm(f => ({ ...f, description: e.target.value }))}
            className="w-full px-2 py-1 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Target Resolutions *</label>
            <div className="flex gap-1 flex-wrap items-center">
              {presetSizes.map(size => (
                <button
                  key={size}
                  onClick={() => setShareForm(f => ({
                    ...f,
                    screenSizes: f.screenSizes.includes(size)
                      ? f.screenSizes.filter(s => s !== size)
                      : [...f.screenSizes, size],
                  }))}
                  className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                    shareForm.screenSizes.includes(size)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted border-border hover:bg-accent'
                  }`}
                >
                  {size}
                </button>
              ))}
              <input
                type="text"
                placeholder="Custom (e.g. 2736x1824)"
                className="px-2 py-0.5 text-xs bg-muted border border-border rounded-full w-[155px] focus:outline-none focus:ring-1 focus:ring-primary"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (/^\d{3,5}x\d{3,5}$/.test(val) && !shareForm.screenSizes.includes(val)) {
                      setShareForm(f => ({ ...f, screenSizes: [...f.screenSizes, val] }));
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
              />
            </div>
            {shareForm.screenSizes.filter(s => !presetSizes.includes(s)).length > 0 && (
              <div className="flex gap-1 flex-wrap mt-1">
                {shareForm.screenSizes.filter(s => !presetSizes.includes(s)).map(size => (
                  <button
                    key={size}
                    onClick={() => setShareForm(f => ({ ...f, screenSizes: f.screenSizes.filter(s => s !== size) }))}
                    className="px-2 py-0.5 text-xs rounded-full border bg-primary text-primary-foreground border-primary transition-colors"
                  >
                    {size} &times;
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Orientation *</label>
            <div className="flex gap-1">
              {(['landscape', 'portrait'] as const).map(orient => (
                <button
                  key={orient}
                  onClick={() => setShareForm(f => ({ ...f, orientation: orient }))}
                  className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                    shareForm.orientation === orient
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted border-border hover:bg-accent'
                  }`}
                >
                  {orient}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Tags (comma-separated)</label>
          <input
            type="text"
            value={shareForm.tags}
            onChange={e => setShareForm(f => ({ ...f, tags: e.target.value }))}
            placeholder="e.g. family, minimal, kitchen"
            className="w-full px-2 py-1 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        {shareErrors.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-md p-2">
            {shareErrors.map((err, i) => (
              <p key={i} className="text-xs text-destructive">{err}</p>
            ))}
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded-md bg-muted hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleShareSubmit}
            className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Open GitHub Issue
          </button>
        </div>
      </div>
    </div>
  );
}
