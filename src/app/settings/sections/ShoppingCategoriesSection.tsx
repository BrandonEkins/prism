'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useShoppingCategories, type ShoppingCategoryDef } from '@/lib/hooks/useShoppingCategories';
import { ALL_DEFAULT_CATEGORIES } from '@/lib/constants/shoppingPresets';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useConfirmDialog } from '@/lib/hooks/useConfirmDialog';

export function ShoppingCategoriesSection() {
  const {
    categories,
    loading,
    addCategory,
    removeCategory,
    reorderCategories,
  } = useShoppingCategories();

  const [newName, setNewName] = useState('');
  const [localCategories, setLocalCategories] = useState<ShoppingCategoryDef[]>(categories);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const { confirm, dialogProps } = useConfirmDialog();

  // Sync local state when hook categories update
  if (!loading && localCategories.length === 0 && categories.length > 0) {
    setLocalCategories(categories);
  }

  // Keep local state in sync with hook after initial load
  if (!loading && categories.length > 0 && localCategories !== categories) {
    // Only update if the categories have actually changed (different reference from hook update)
    const catIds = categories.map(c => c.id).join(',');
    const localIds = localCategories.map(c => c.id).join(',');
    if (catIds !== localIds) {
      setLocalCategories(categories);
    }
  }

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    const result = await addCategory(name);
    if (result) {
      setLocalCategories(prev => [...prev, result]);
      setNewName('');
      toast({ title: `Added "${name}" category` });
    } else {
      toast({ title: 'Category already exists', variant: 'warning' });
    }
  };

  const handleRemove = async (cat: ShoppingCategoryDef) => {
    const ok = await confirm(
      `Remove "${cat.name}"?`,
      'This removes the category from all shopping lists. Items in this category will appear under "Other".'
    );
    if (!ok) return;
    await removeCategory(cat.id);
    setLocalCategories(prev => prev.filter(c => c.id !== cat.id));
    toast({ title: `Removed "${cat.name}" category` });
  };

  const handleResetDefaults = async () => {
    const ok = await confirm(
      'Reset to defaults?',
      'This will replace your current categories with the default set (6 grocery + 6 general categories).'
    );
    if (!ok) return;
    await reorderCategories(ALL_DEFAULT_CATEGORIES as ShoppingCategoryDef[]);
    setLocalCategories(ALL_DEFAULT_CATEGORIES as ShoppingCategoryDef[]);
    toast({ title: 'Categories reset to defaults' });
  };

  const handleDragStart = (categoryId: string) => {
    setDraggedId(categoryId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const newOrder = [...localCategories];
    const draggedIdx = newOrder.findIndex(c => c.id === draggedId);
    const targetIdx = newOrder.findIndex(c => c.id === targetId);

    if (draggedIdx !== -1 && targetIdx !== -1) {
      const draggedItem = localCategories[draggedIdx]!;
      newOrder.splice(draggedIdx, 1);
      newOrder.splice(targetIdx, 0, draggedItem);
      setLocalCategories(newOrder);
      reorderCategories(newOrder);
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Shopping Categories</h2>
        <p className="text-muted-foreground mt-1">
          Manage the categories available across all shopping lists. Individual lists can show/hide categories via the Categories button on the shopping page.
        </p>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Loading categories...</div>
      ) : (
        <>
          <div className="space-y-1">
            {localCategories.map((cat) => (
              <div
                key={cat.id}
                draggable
                onDragStart={() => handleDragStart(cat.id)}
                onDragOver={(e) => handleDragOver(e, cat.id)}
                onDragEnd={handleDragEnd}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-md border border-border cursor-grab active:cursor-grabbing transition-opacity',
                  draggedId === cat.id && 'opacity-50'
                )}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                <span className="text-xl">{cat.emoji}</span>
                <span className="font-medium flex-1">{cat.name}</span>
                <div className="w-5 h-5 rounded-full shrink-0 border border-border" style={{ backgroundColor: cat.color }} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={() => handleRemove(cat)}
                  title={`Remove ${cat.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New category name..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
            <Button onClick={handleAdd} disabled={!newName.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>

          <div className="pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={handleResetDefaults} className="gap-1">
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to Defaults
            </Button>
          </div>
        </>
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
