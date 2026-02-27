'use client';

import { useState, useRef, useEffect, useCallback, KeyboardEvent, FocusEvent } from 'react';
import { toast } from '@/components/ui/use-toast';
import {
  ShoppingCart,
  Plus,
  Settings,
  ChevronsDown,
  Maximize2,
  Minimize2,
  GripVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { PageWrapper, SubpageHeader } from '@/components/layout';
import type { OverflowItem } from '@/components/layout';
import { ShoppingItemRow } from '@/app/shopping/ShoppingItemRow';
import { ItemModal } from '@/app/shopping/ItemModal';
import { ListModal } from '@/app/shopping/ListModal';
import { ShoppingCelebration } from '@/app/shopping/ShoppingCelebration';
import { useShoppingViewData } from './useShoppingViewData';
import { useShoppingCategories } from '@/lib/hooks/useShoppingCategories';
import { useOrientation } from '@/lib/hooks/useOrientation';
import { cn } from '@/lib/utils';
import type { ShoppingItem } from '@/types';

// Base number of empty lines to show in each category
const BASE_EMPTY_LINES = 6;

export function getCategoryEmoji(category: string): string {
  // Fallback function — components should prefer the hook's getCategoryEmoji
  const defaults: Record<string, string> = {
    produce: '🥬', dairy: '🥛', meat: '🥩', bakery: '🥖',
    frozen: '🧊', pantry: '🥫', household: '🧴',
  };
  return defaults[category] || '🛒';
}

export function ShoppingView() {
  const {
    lists, loading, error, refreshLists, familyMembers,
    requireAuth, apiAddItem,
    activeListId, setActiveListId,
    showChecked, setShowChecked,
    showAddItemModal, setShowAddItemModal,
    editingItem, setEditingItem,
    showListModal, setShowListModal,
    editingList, setEditingList,
    activeList, filteredItems,
    toggleItem, deleteItem,
    totalItems, checkedItems, progress,
  } = useShoppingViewData();

  const {
    categories: dynamicCategories,
    addCategory, removeCategory, reorderCategories,
    getCategoryEmoji: getDynCategoryEmoji,
    getCategoryColor: getDynCategoryColor,
  } = useShoppingCategories();

  // Track which category to default when opening modal
  const [defaultCategory, setDefaultCategory] = useState<string | null>(null);

  // Category order derived from dynamic categories, filtered by list visibility
  const categoryOrder = dynamicCategories.map(c => c.id);
  const effectiveCategoryOrder = activeList?.visibleCategories
    ? categoryOrder.filter(id => activeList.visibleCategories!.includes(id))
    : categoryOrder;
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);

  // Touch drag state
  const touchStartRef = useRef<{ x: number; y: number; element: HTMLElement | null }>({ x: 0, y: 0, element: null });


  // Save category order via settings
  const saveCategoryOrder = useCallback((order: string[]) => {
    const reordered = order.map(id => dynamicCategories.find(c => c.id === id)).filter(Boolean) as typeof dynamicCategories;
    reorderCategories(reordered);
  }, [dynamicCategories, reorderCategories]);


  // Drag and drop handlers for category reordering (mouse)
  const handleDragStart = useCallback((category: string) => {
    setDraggedCategory(category);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetCategory: string) => {
    e.preventDefault();
    if (!draggedCategory || draggedCategory === targetCategory) return;

    const newOrder = [...categoryOrder];
    const draggedIndex = newOrder.indexOf(draggedCategory);
    const targetIndex = newOrder.indexOf(targetCategory);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedCategory);
      saveCategoryOrder(newOrder);
    }
  }, [draggedCategory, categoryOrder, saveCategoryOrder]);

  const handleDragEnd = useCallback(() => {
    setDraggedCategory(null);
  }, []);

  // Touch handlers for category reordering
  const handleTouchStart = useCallback((e: React.TouchEvent, category: string) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      element: e.currentTarget as HTMLElement,
    };
    setDraggedCategory(category);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!draggedCategory) return;
    const touch = e.touches[0];
    if (!touch) return;

    // Find which category we're over
    const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
    for (const el of elements) {
      const categoryAttr = el.getAttribute('data-category');
      if (categoryAttr && categoryAttr !== draggedCategory) {
        const targetCategory = categoryAttr;
        const newOrder = [...categoryOrder];
        const draggedIndex = newOrder.indexOf(draggedCategory);
        const targetIndex = newOrder.indexOf(targetCategory);

        if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
          newOrder.splice(draggedIndex, 1);
          newOrder.splice(targetIndex, 0, draggedCategory);
          saveCategoryOrder(newOrder);
        }
        break;
      }
    }
  }, [draggedCategory, categoryOrder, saveCategoryOrder]);

  const handleTouchEnd = useCallback(() => {
    setDraggedCategory(null);
    touchStartRef.current = { x: 0, y: 0, element: null };
  }, []);


  // Track inline input values for each category
  const [inlineInputs, setInlineInputs] = useState<Record<string, string>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Track extra rows per category
  const [extraRows, setExtraRows] = useState<Record<string, number>>({});

  // Track celebration animation
  const [showCelebration, setShowCelebration] = useState(false);
  const [lastCheckedCount, setLastCheckedCount] = useState<number | null>(null);
  const isInitialLoadRef = useRef(true);
  const prevListIdRef = useRef<string | null>(null);

  // Reset initial load tracking when list changes
  useEffect(() => {
    if (activeListId !== prevListIdRef.current) {
      isInitialLoadRef.current = true;
      setLastCheckedCount(null);
      prevListIdRef.current = activeListId;
    }
  }, [activeListId]);

  // Detect when all items are checked off
  useEffect(() => {
    // Skip if no items or not all checked
    if (totalItems === 0 || checkedItems !== totalItems) {
      // Once we've seen unchecked items, initial load is complete
      if (totalItems > 0 && checkedItems < totalItems) {
        isInitialLoadRef.current = false;
      }
      setLastCheckedCount(checkedItems);
      return;
    }

    // All items are checked - should we celebrate?
    // Only celebrate if:
    // 1. Not initial load (we've seen the list in incomplete state)
    // 2. The count actually increased (user checked something)
    if (!isInitialLoadRef.current && lastCheckedCount !== null && lastCheckedCount < checkedItems) {
      setShowCelebration(true);
    }

    // Mark initial load complete after first data arrives
    isInitialLoadRef.current = false;
    setLastCheckedCount(checkedItems);
  }, [checkedItems, totalItems, lastCheckedCount]);

  // Orientation for responsive layout
  const orientation = useOrientation();
  const isPortrait = orientation === 'portrait';

  // Shopping mode - full screen list without filters
  const [shoppingMode, setShoppingMode] = useState(false);

  // All list types now use the category grid layout

  // Add/remove extra rows from a category
  const addExtraRows = (category: string, count: number) => {
    setExtraRows(prev => {
      const current = prev[category] || 0;
      const newValue = Math.max(-BASE_EMPTY_LINES + 1, current + count); // Allow reducing to minimum 1 empty line
      return { ...prev, [category]: newValue };
    });
  };

  // For grocery layout, organize items by the effective (visible) category order
  const groceryCategoryItems = effectiveCategoryOrder.map((cat) => ({
    category: cat,
    items: (filteredItems[cat] || []) as ShoppingItem[],
  }));

  // For non-grocery, use the existing filteredItems (items in categories not in the effective order)
  const otherItems = Object.entries(filteredItems).filter(
    ([cat]) => !effectiveCategoryOrder.includes(cat)
  );

  // Handle adding item with login prompt
  const handleAddItem = async (category?: string) => {
    const user = await requireAuth("Who's adding an item?");
    if (!user) return;

    if (category) {
      setDefaultCategory(category);
    }
    setShowAddItemModal(true);
  };

  // Handle inline item add
  const handleInlineAdd = async (category: string) => {
    const name = inlineInputs[category]?.trim();
    if (!name || !activeList) return;

    const user = await requireAuth("Who's adding an item?");
    if (!user) return;

    try {
      await apiAddItem(activeList.id, {
        name,
        category,
      });
      setInlineInputs(prev => ({ ...prev, [category]: '' }));
    } catch (err) {
      console.error('Failed to add item:', err);
      toast({ title: 'Failed to add item. Please try again.', variant: 'destructive' });
    }
  };

  const handleInlineKeyDown = (e: KeyboardEvent<HTMLInputElement>, category: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInlineAdd(category);
    }
  };

  const handleInlineBlur = (e: FocusEvent<HTMLInputElement>, category: string) => {
    // Add item when user taps out of the input
    handleInlineAdd(category);
  };


  // Handle new list creation
  const handleNewList = async () => {
    const user = await requireAuth("Who's creating a list?");
    if (user) {
      setEditingList(null);
      setShowListModal(true);
    }
  };

  // Handle edit item with auth
  const handleEditItem = async (item: ShoppingItem) => {
    const user = await requireAuth("Who's editing this item?");
    if (user) {
      setEditingItem(item);
    }
  };

  // Handle delete item with auth
  const handleDeleteItem = async (itemId: string) => {
    const user = await requireAuth("Who's deleting this item?");
    if (user) {
      deleteItem(itemId);
    }
  };

  return (
    <PageWrapper>
      <div className="h-screen flex flex-col">
        {/* Collapsible header - hidden in shopping mode */}
        {!shoppingMode && (
          <>
            <SubpageHeader
              icon={<ShoppingCart className="h-5 w-5 text-primary" />}
              title="Shopping"
              badge={activeList ? <Badge variant="secondary">{checkedItems}/{totalItems}</Badge> : undefined}
              actions={<>
                <Button variant="ghost" size="icon" onClick={() => setShoppingMode(true)} title="Enter shopping mode">
                  <Maximize2 className="h-4 w-4" />
                </Button>
                <Button onClick={handleNewList} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add List
                </Button>
              </>}
              overflow={[
                ...(activeList ? [{
                  label: 'Edit List',
                  icon: Settings,
                  onClick: async () => {
                    const user = await requireAuth("Who's editing this list?");
                    if (user && user.role === 'parent') { setEditingList(activeList); setShowListModal(true); }
                    else if (user) toast({ title: 'Only parents can edit list settings', variant: 'warning' });
                  },
                }] : []),
                { label: showChecked ? 'Hide Checked Items' : 'Show Checked Items', checked: showChecked, onClick: () => setShowChecked(!showChecked) },
              ] as OverflowItem[]}
            />

            <div className="flex-shrink-0 border-b border-border bg-card/85 backdrop-blur-sm px-3 py-1">
              <div className="overflow-x-auto">
                <div className="flex gap-1 items-center min-w-max">
                  {lists.map((list) => {
                    const assignedMember = list.assignedTo ? familyMembers.find(m => m.id === list.assignedTo) : null;
                    return (
                      <Button key={list.id} variant={activeListId === list.id ? 'secondary' : 'ghost'} size="sm"
                        onClick={() => setActiveListId(list.id)} className="relative">
                        {list.name}
                        {assignedMember && (
                          <span className="ml-1.5 w-3 h-3 rounded-full inline-block"
                            style={{ backgroundColor: assignedMember.color }} title={`Assigned to ${assignedMember.name}`} />
                        )}
                        <Badge variant="outline" className="ml-2 text-xs">{list.items.length}</Badge>
                      </Button>
                    );
                  })}
                  <Button variant="outline" size="sm" className="border-dashed" onClick={handleNewList}>
                    <Plus className="h-3 w-3 mr-1" />New List
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Compact header for shopping mode */}
        {shoppingMode && (
          <header className="flex-shrink-0 border-b border-border bg-card/85 backdrop-blur-sm px-3 py-1 safe-area-top">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-primary" />
                <span className="font-medium">{activeList?.name}</span>
                <Badge variant="secondary" className="text-xs">{checkedItems}/{totalItems}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={progress} className="h-2 w-24" />
                <Button variant="ghost" size="sm" onClick={() => setShoppingMode(false)} title="Exit shopping mode">
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </header>
        )}

        {activeList && totalItems > 0 && !shoppingMode && (
          <div className="flex-shrink-0 px-3 py-1 bg-card/85 backdrop-blur-sm">
            <div className="max-w-6xl mx-auto flex items-center gap-3">
              <Progress value={progress} className="h-2 flex-1" />
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {checkedItems}/{totalItems} ({Math.round(progress)}%)
              </span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mb-4 opacity-50 animate-pulse" /><p className="text-lg">Loading shopping lists...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-destructive text-lg">Error: {error}</p>
              <p className="text-base mt-2">Please check your connection</p>
            </div>
          ) : !activeList ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mb-4 opacity-50" /><p className="text-lg">No shopping lists yet</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={handleNewList}>Create your first list</Button>
            </div>
          ) : activeList ? (
            /* Category grid layout - 3 cols landscape, 2 cols portrait */
            <div className="max-w-7xl mx-auto">
              <div className={cn(
                'grid gap-2',
                isPortrait ? 'grid-cols-2' : 'grid-cols-3'
              )}>
                {groceryCategoryItems.map(({ category, items }) => {
                  const categoryColor = getDynCategoryColor(category);
                  const categoryExtraRows = extraRows[category] || 0;
                  const totalEmptyLines = BASE_EMPTY_LINES + categoryExtraRows;
                  const emptyLinesNeeded = Math.max(0, totalEmptyLines - items.length);
                  const isDragging = draggedCategory === category;

                  return (
                    <div
                      key={category}
                      data-category={category}
                      draggable
                      onDragStart={() => handleDragStart(category)}
                      onDragOver={(e) => handleDragOver(e, category)}
                      onDragEnd={handleDragEnd}
                      onTouchStart={(e) => handleTouchStart(e, category)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      className={cn(
                        'border-2 rounded-lg overflow-hidden bg-card/90 backdrop-blur-sm',
                        'flex flex-col cursor-grab active:cursor-grabbing transition-all touch-none',
                        isDragging && 'opacity-50 scale-95 ring-4 ring-primary/50'
                      )}
                      style={{ borderColor: categoryColor }}
                    >
                      {/* Category header with Add Item button - draggable handle */}
                      <div
                        className="px-2 py-1 flex items-center gap-1 select-none"
                        style={{ backgroundColor: categoryColor + '20' }}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                        <span className="text-xl">{getDynCategoryEmoji(category)}</span>
                        <h3
                          className="text-base font-bold capitalize"
                          style={{ color: categoryColor }}
                        >
                          {category}
                        </h3>
                        <Badge variant="outline" className="ml-auto text-xs">
                          {items.length}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1"
                          onClick={() => handleAddItem(category)}
                          style={{ color: categoryColor }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Items with notebook lines */}
                      <div className="flex-1 p-1">
                        {/* Existing items */}
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="border-b border-muted-foreground/30"
                            style={{ borderColor: categoryColor + '40' }}
                          >
                            <ShoppingItemRow
                              item={item}
                              onToggle={() => toggleItem(item.id)}
                              onEdit={() => handleEditItem(item)}
                              onDelete={() => handleDeleteItem(item.id)}
                            />
                          </div>
                        ))}

                        {/* Inline input row */}
                        <div
                          className="border-b border-muted-foreground/30 py-1 px-2"
                          style={{ borderColor: categoryColor + '40' }}
                        >
                          <Input
                            ref={(el) => { inputRefs.current[category] = el; }}
                            value={inlineInputs[category] || ''}
                            onChange={(e) => setInlineInputs(prev => ({ ...prev, [category]: e.target.value }))}
                            onKeyDown={(e) => handleInlineKeyDown(e, category)}
                            onBlur={(e) => handleInlineBlur(e, category)}
                            placeholder="Add item..."
                            className="h-7 border-none bg-transparent shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50"
                          />
                        </div>

                        {/* Empty underlined rows */}
                        {Array.from({ length: emptyLinesNeeded }).map((_, i) => (
                          <div
                            key={`empty-${i}`}
                            className="h-7 border-b border-muted-foreground/30"
                            style={{ borderColor: categoryColor + '40' }}
                          />
                        ))}

                        {/* Add/remove rows buttons */}
                        <div className="flex items-center justify-center gap-1 pt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-muted-foreground"
                            onClick={() => addExtraRows(category, -1)}
                            disabled={(extraRows[category] || 0) <= 0 && items.length >= BASE_EMPTY_LINES}
                          >
                            -1
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-muted-foreground"
                            onClick={() => addExtraRows(category, 1)}
                          >
                            +1
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-muted-foreground"
                            onClick={() => addExtraRows(category, 5)}
                          >
                            +5
                          </Button>
                          <ChevronsDown className="h-3 w-3 text-muted-foreground/50" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Other categories below the grid */}
              {otherItems.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-lg font-semibold text-muted-foreground">Other Items</h3>
                  {otherItems.map(([category, items]) => (
                    <div key={category} className="border rounded-lg p-3 bg-card/90 backdrop-blur-sm">
                      <h4 className="text-base font-semibold text-muted-foreground mb-2 capitalize flex items-center gap-2">
                        <span>{getDynCategoryEmoji(category)}</span><span>{category}</span>
                      </h4>
                      <div className="space-y-1">
                        {(items as ShoppingItem[]).map((item) => (
                          <ShoppingItemRow key={item.id} item={item}
                            onToggle={() => toggleItem(item.id)}
                            onEdit={() => handleEditItem(item)}
                            onDelete={() => handleDeleteItem(item.id)} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {showAddItemModal && activeList && (
          <ItemModal
            listId={activeList.id}
            lists={lists}
            defaultCategory={defaultCategory || undefined}
            onClose={() => { setShowAddItemModal(false); setDefaultCategory(null); }}
            onSave={async (item) => {
              const user = await requireAuth("Who's adding an item?");
              if (!user) {
                setShowAddItemModal(false);
                setDefaultCategory(null);
                return;
              }
              try {
                await apiAddItem(item.listId, {
                  name: item.name, quantity: item.quantity ?? undefined,
                  unit: item.unit ?? undefined, category: item.category ?? undefined,
                  notes: item.notes ?? undefined,
                });
                setShowAddItemModal(false);
                setDefaultCategory(null);
                if (item.listId !== activeList.id) setActiveListId(item.listId);
              } catch (err) {
                console.error('Failed to add item:', err);
                toast({ title: 'Failed to add item. Please try again.', variant: 'destructive' });
              }
            }} />
        )}

        {editingItem && (
          <ItemModal listId={editingItem.listId} item={editingItem}
            onClose={() => setEditingItem(null)}
            onSave={async (updatedItem) => {
              try {
                const response = await fetch(`/api/shopping-items/${editingItem.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: updatedItem.name, quantity: updatedItem.quantity,
                    unit: updatedItem.unit, category: updatedItem.category, notes: updatedItem.notes,
                  }),
                });
                if (!response.ok) throw new Error('Failed to update item');
                setEditingItem(null);
                refreshLists();
              } catch (err) {
                console.error('Failed to update item:', err);
                toast({ title: 'Failed to update item. Please try again.', variant: 'destructive' });
              }
            }} />
        )}

        {showListModal && (
          <ListModal list={editingList} familyMembers={familyMembers} categories={dynamicCategories}
            onClose={() => { setShowListModal(false); setEditingList(null); }}
            onSave={async (listData: { name: string; description?: string; assignedTo?: string; listType?: string; visibleCategories?: string[] | null }) => {
              try {
                if (editingList) {
                  const response = await fetch(`/api/shopping-lists/${editingList.id}`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(listData),
                  });
                  if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.error || 'Failed to update list');
                  }
                } else {
                  const response = await fetch('/api/shopping-lists', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(listData),
                  });
                  if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.error || 'Failed to create list');
                  }
                  const newList = await response.json();
                  setActiveListId(newList.id);
                }
                setShowListModal(false);
                setEditingList(null);
                refreshLists();
              } catch (err) {
                console.error('Failed to save list:', err);
                toast({ title: err instanceof Error ? err.message : 'Failed to save list. Please try again.', variant: 'destructive' });
              }
            }}
            onDelete={editingList ? async () => {
              try {
                const response = await fetch(`/api/shopping-lists/${editingList.id}`, {
                  method: 'DELETE',
                });
                if (!response.ok) {
                  const data = await response.json().catch(() => ({}));
                  throw new Error(data.error || 'Failed to delete list');
                }
                setShowListModal(false);
                setEditingList(null);
                const remainingLists = lists.filter(l => l.id !== editingList.id);
                setActiveListId(remainingLists[0]?.id || '');
                refreshLists();
              } catch (err) {
                console.error('Failed to delete list:', err);
                toast({ title: err instanceof Error ? err.message : 'Failed to delete list. Please try again.', variant: 'destructive' });
              }
            } : undefined} />
        )}

        {/* Celebration animation when all items checked */}
        <ShoppingCelebration
          show={showCelebration}
          onComplete={() => setShowCelebration(false)}
        />
      </div>
    </PageWrapper>
  );
}
