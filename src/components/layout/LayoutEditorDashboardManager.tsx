'use client';

import { useState } from 'react';

export function CreateDashboardDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, startFrom: 'blank' | 'template' | 'copy') => void;
}) {
  const [createForm, setCreateForm] = useState({ name: '', startFrom: 'template' as 'blank' | 'template' | 'copy' });

  if (!open) return null;

  const handleSubmit = () => {
    if (!createForm.name.trim()) return;
    onCreate(createForm.name.trim(), createForm.startFrom);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-popover border border-border rounded-lg shadow-xl p-4 max-w-sm w-full mx-4 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="text-sm font-medium">New Dashboard</div>
        <div>
          <label className="text-xs text-muted-foreground">Name</label>
          <input
            type="text"
            value={createForm.name}
            onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Kitchen Display"
            className="w-full px-2 py-1.5 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            maxLength={100}
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Start from</label>
          <div className="flex gap-2">
            {([
              { value: 'template' as const, label: 'Default Template' },
              { value: 'copy' as const, label: 'Copy Current' },
              { value: 'blank' as const, label: 'Blank' },
            ]).map(opt => (
              <button
                key={opt.value}
                onClick={() => setCreateForm(f => ({ ...f, startFrom: opt.value }))}
                className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                  createForm.startFrom === opt.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted border-border hover:bg-accent'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded-md bg-muted hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!createForm.name.trim()}
            className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
