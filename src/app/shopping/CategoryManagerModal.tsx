'use client';

import { useState, useCallback } from 'react';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ShoppingCategoryDef } from '@/lib/hooks/useShoppingCategories';

interface CategoryManagerModalProps {
  categories: ShoppingCategoryDef[];
  visibleCategories?: string[] | null;
  onUpdateVisibility: (visibleIds: string[] | null) => Promise<void>;
  onClose: () => void;
}

export function CategoryManagerModal({
  categories,
  visibleCategories,
  onUpdateVisibility,
  onClose,
}: CategoryManagerModalProps) {
  // Local visibility state — start from prop or all-visible
  const [localVisible, setLocalVisible] = useState<Set<string>>(() => {
    if (visibleCategories) return new Set(visibleCategories);
    return new Set(categories.map(c => c.id));
  });

  const toggleVisibility = useCallback((categoryId: string) => {
    setLocalVisible(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setLocalVisible(new Set(categories.map(c => c.id)));
  }, [categories]);

  const selectNone = useCallback(() => {
    setLocalVisible(new Set());
  }, []);

  const saveVisibility = useCallback(async () => {
    const allSelected = localVisible.size === categories.length;
    await onUpdateVisibility(allSelected ? null : Array.from(localVisible));
    onClose();
  }, [localVisible, categories, onUpdateVisibility, onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 pb-20 md:pb-0" onClick={onClose}>
      <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4 shadow-lg border border-border max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Categories for This List</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mb-3">
          Choose which categories appear on this list. To add or remove categories globally, go to Settings.
        </p>

        <div className="flex gap-2 mb-3">
          <Button variant="outline" size="sm" onClick={selectAll} className="text-xs">
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={selectNone} className="text-xs">
            None
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="space-y-1">
            {categories.map((cat) => {
              const isVisible = localVisible.has(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleVisibility(cat.id)}
                  className={cn(
                    'flex items-center gap-2 w-full p-2 rounded-md border transition-colors text-left',
                    isVisible
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border opacity-50'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0',
                    isVisible ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                  )}>
                    {isVisible && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <span className="text-lg">{cat.emoji}</span>
                  <span className="font-medium flex-1">{cat.name}</span>
                  <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <Button onClick={saveVisibility} size="sm">
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
