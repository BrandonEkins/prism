'use client';

import { useState } from 'react';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ShoppingCategoryDef } from '@/lib/hooks/useShoppingCategories';

interface CategoryManagerModalProps {
  categories: ShoppingCategoryDef[];
  onAdd: (name: string) => Promise<ShoppingCategoryDef | null>;
  onRemove: (categoryId: string) => Promise<void>;
  onReorder: (categories: ShoppingCategoryDef[]) => Promise<void>;
  onClose: () => void;
}

export function CategoryManagerModal({ categories, onAdd, onRemove, onReorder, onClose }: CategoryManagerModalProps) {
  const [newName, setNewName] = useState('');
  const [localCategories, setLocalCategories] = useState(categories);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    const result = await onAdd(name);
    if (result) {
      setLocalCategories(prev => [...prev, result]);
      setNewName('');
    }
  };

  const handleRemove = async (categoryId: string) => {
    await onRemove(categoryId);
    setLocalCategories(prev => prev.filter(c => c.id !== categoryId));
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
      onReorder(newOrder);
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 pb-20 md:pb-0" onClick={onClose}>
      <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4 shadow-lg border border-border max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Manage Categories</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-1 mb-4">
          {localCategories.map((cat) => (
            <div
              key={cat.id}
              draggable
              onDragStart={() => handleDragStart(cat.id)}
              onDragOver={(e) => handleDragOver(e, cat.id)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-2 p-2 rounded-md border border-border cursor-grab active:cursor-grabbing transition-opacity ${draggedId === cat.id ? 'opacity-50' : ''}`}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              <span className="text-lg">{cat.emoji}</span>
              <span className="font-medium flex-1">{cat.name}</span>
              <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                onClick={() => handleRemove(cat.id)}
                title={`Remove ${cat.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category name..."
            className="flex-1 h-9"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <Button size="sm" onClick={handleAdd} disabled={!newName.trim()}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
