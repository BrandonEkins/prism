'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';
import {
  ShoppingCart,
  Plus,
  Settings,
  Maximize2,
  Minimize2,
  Tags,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PageWrapper, SubpageHeader, UndoButton } from '@/components/layout';
import type { OverflowItem } from '@/components/layout';
import { ShoppingItemRow } from '@/app/shopping/ShoppingItemRow';
import { ShoppingCategoryCard } from '@/app/shopping/ShoppingCategoryCard';
import { ItemModal } from '@/app/shopping/ItemModal';
import { ListModal } from '@/app/shopping/ListModal';
import { ShoppingCelebration } from '@/app/shopping/ShoppingCelebration';
import { ManageCategoriesModal } from '@/app/shopping/ManageCategoriesModal';
import { useShoppingViewData } from './useShoppingViewData';
import { useShoppingCategories } from '@/lib/hooks/useShoppingCategories';
import { useShoppingDragReorder } from './useShoppingDragReorder';
import { useShoppingInlineInput, BASE_EMPTY_LINES } from './useShoppingInlineInput';
import { useShoppingCelebration } from './useShoppingCelebration';
import { useOrientation } from '@/lib/hooks/useOrientation';
import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { cn } from '@/lib/utils';
import type { ShoppingItem } from '@/types';
import dynamic from 'next/dynamic';
const CameraScannerOverlay = dynamic(
  () => import('@/components/input/CameraScannerOverlay').then(m => m.CameraScannerOverlay),
  { ssr: false }
);

export function getCategoryEmoji(category: string): string {
  // Fallback function — components should prefer the hook's getCategoryEmoji
  const defaults: Record<string, string> = {
    produce: '🥬', dairy: '🥛', meat: '🥩', bakery: '🥖',
    frozen: '🧊', pantry: '🥫', household: '🧴',
  };
  return defaults[category] || '🛒';
}

// Scan flow types
type ScanStep = 'loading' | 'duplicate' | 'list' | 'category' | null;
interface ScanProduct { name: string; brand?: string; suggestedCategory?: string | null }
interface ScanExisting { listId: string; listName: string; itemId: string }
interface ScanState {
  barcode: string;
  product: ScanProduct | null;
  existingInLists: ScanExisting[];
  step: ScanStep;
  targetListId: string | null;
  targetListName: string | null;
}

export function ShoppingView() {
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [scan, setScan] = useState<ScanState | null>(null);

  const clearScan = useCallback(() => setScan(null), []);

  // Called by overlay after decode — close the scanner immediately, then look up product
  const handleCameraScan = useCallback(async (barcode: string) => {
    setShowCameraScanner(false); // close overlay right away; don't wait for async
    setScan({ barcode, product: null, existingInLists: [], step: 'loading', targetListId: null, targetListName: null });
    try {
      const r = await fetch('/api/shopping/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode, dryRun: true }),
      });
      const data = await r.json() as {
        found: boolean;
        product?: ScanProduct;
        existingInLists?: ScanExisting[];
      };

      if (!data.found || !data.product) {
        toast({ title: 'Product not found', description: 'Barcode not in database. Add it manually.', variant: 'destructive' });
        setScan(null);
        return;
      }

      setScan(prev => prev ? ({
        ...prev,
        product: data.product!,
        existingInLists: data.existingInLists ?? [],
        step: 'list', // always start at list picker; duplicate warning shown after list selection
      }) : null);
    } catch {
      toast({ title: 'Lookup failed', variant: 'destructive' });
      setScan(null);
    }
  }, []);

  // After list is chosen — check for cross-list duplicates, then go to category picker
  const handleListChosen = useCallback((listId: string, listName: string) => {
    setScan(prev => {
      if (!prev) return null;
      const inOtherLists = prev.existingInLists.filter(e => e.listId !== listId);
      return {
        ...prev,
        targetListId: listId,
        targetListName: listName,
        step: inOtherLists.length > 0 ? 'duplicate' : 'category',
      };
    });
  }, []);

  // Execute the actual add
  const doAdd = useCallback(async (category: string | null) => {
    if (!scan?.product || !scan.targetListId) return;
    setScan(prev => prev ? { ...prev, step: null } : null);
    try {
      const r = await fetch('/api/shopping/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode: scan.barcode,
          listId: scan.targetListId,
          ...(category ? { category } : {}),
        }),
      });
      const data = await r.json() as { found: boolean; item?: { name: string }; action?: string; itemId?: string };
      setScan(null);
      if (!data.found) {
        toast({ title: 'Product not found', variant: 'destructive' });
        return;
      }
      window.dispatchEvent(new CustomEvent('prism:scan-result', { detail: data }));
      toast({
        title: data.action === 'updated_existing'
          ? `Already on list — ${data.item!.name}`
          : `Added — ${data.item!.name}`,
      });
    } catch {
      setScan(null);
      toast({ title: 'Add failed', variant: 'destructive' });
    }
  }, [scan]);

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

  // Auto-advance: if only 1 list, skip list picker and go straight to category
  useEffect(() => {
    if (scan?.step !== 'list' || lists.length !== 1) return;
    handleListChosen(lists[0]!.id, lists[0]!.name);
  }, [scan?.step, lists, handleListChosen]);

  // Listen for PWA FAB "Scan" button — opens scanner from mobile + button
  useEffect(() => {
    const handler = () => setShowCameraScanner(true);
    window.addEventListener('prism:open-barcode-scanner', handler);
    return () => window.removeEventListener('prism:open-barcode-scanner', handler);
  }, []);

  // Listen for barcode scan results — scroll to and highlight the added/updated item
  useEffect(() => {
    const handler = (e: Event) => {
      const data = (e as CustomEvent<{ itemId?: string }>).detail;
      if (!data?.itemId) return;
      refreshLists();
      setTimeout(() => {
        const el = document.getElementById(`shopping-item-${data.itemId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          el.classList.add('scan-highlight');
          setTimeout(() => el.classList.remove('scan-highlight'), 1500);
        }
      }, 400); // wait for re-render after refreshLists
    };
    window.addEventListener('prism:scan-result', handler);
    return () => window.removeEventListener('prism:scan-result', handler);
  }, [refreshLists]);

  const {
    categories: dynamicCategories,
    addCategory, removeCategory, reorderCategories,
    getCategoryEmoji: getDynCategoryEmoji,
    getCategoryColor: getDynCategoryColor,
  } = useShoppingCategories();

  const [defaultCategory, setDefaultCategory] = useState<string | null>(null);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);

  const categoryOrder = dynamicCategories.map(c => c.id);
  const effectiveCategoryOrder = activeList?.visibleCategories
    ? categoryOrder.filter(id => activeList.visibleCategories!.includes(id))
    : categoryOrder;

  const {
    draggedCategory,
    handleDragStart, handleDragOver, handleDragEnd,
    handleTouchStart, handleTouchMove, handleTouchEnd,
  } = useShoppingDragReorder({ categoryOrder, dynamicCategories, reorderCategories });

  const {
    inlineInputs, setInlineInputs, inputRefs, extraRows,
    handleInlineKeyDown, handleInlineBlur, addExtraRows,
  } = useShoppingInlineInput({ activeList, requireAuth, apiAddItem });

  const { showCelebration, setShowCelebration } = useShoppingCelebration(activeListId, checkedItems, totalItems);

  const orientation = useOrientation();
  const isMobile = useIsMobile();
  const isPortrait = orientation === 'portrait';
  const [shoppingMode, setShoppingMode] = useState(false);

  const groceryCategoryItems = effectiveCategoryOrder.map((cat) => ({
    category: cat,
    items: (filteredItems[cat] || []) as ShoppingItem[],
  }));

  const otherItems = Object.entries(filteredItems).filter(
    ([cat]) => !effectiveCategoryOrder.includes(cat)
  );

  const handleAddItem = async (category?: string) => {
    const user = await requireAuth("Who's adding an item?");
    if (!user) return;
    if (category) {
      setDefaultCategory(category);
    }
    setShowAddItemModal(true);
  };

  const handleNewList = async () => {
    const user = await requireAuth("Who's creating a list?");
    if (user) {
      setEditingList(null);
      setShowListModal(true);
    }
  };

  const handleEditItem = async (item: ShoppingItem) => {
    const user = await requireAuth("Who's editing this item?");
    if (user) {
      setEditingItem(item);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    const user = await requireAuth("Who's deleting this item?");
    if (user) {
      deleteItem(itemId);
    }
  };

  const handleSaveNewItem = async (item: Omit<ShoppingItem, 'id' | 'createdAt'>) => {
    const user = await requireAuth("Who's adding an item?");
    if (!user) { setShowAddItemModal(false); setDefaultCategory(null); return; }
    try {
      await apiAddItem(item.listId, {
        name: item.name, quantity: item.quantity ?? undefined,
        unit: item.unit ?? undefined, category: item.category ?? undefined,
        notes: item.notes ?? undefined,
      });
      setShowAddItemModal(false);
      setDefaultCategory(null);
      if (activeList && item.listId !== activeList.id) setActiveListId(item.listId);
    } catch (err) {
      console.error('Failed to add item:', err);
      toast({ title: 'Failed to add item. Please try again.', variant: 'destructive' });
    }
  };

  const handleUpdateItem = async (updatedItem: Omit<ShoppingItem, 'id' | 'createdAt'>) => {
    if (!editingItem) return;
    try {
      const response = await fetch(`/api/shopping-items/${editingItem.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
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
  };

  const handleSaveList = async (listData: { name: string; description?: string; assignedTo?: string; listType?: string; visibleCategories?: string[] | null }) => {
    try {
      if (editingList) {
        const response = await fetch(`/api/shopping-lists/${editingList.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(listData),
        });
        if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || 'Failed to update list'); }
      } else {
        const response = await fetch('/api/shopping-lists', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(listData),
        });
        if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || 'Failed to create list'); }
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
  };

  const handleDeleteList = editingList ? async () => {
    try {
      const response = await fetch(`/api/shopping-lists/${editingList.id}`, { method: 'DELETE' });
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || 'Failed to delete list'); }
      setShowListModal(false);
      setEditingList(null);
      const remainingLists = lists.filter(l => l.id !== editingList.id);
      setActiveListId(remainingLists[0]?.id || '');
      refreshLists();
    } catch (err) {
      console.error('Failed to delete list:', err);
      toast({ title: err instanceof Error ? err.message : 'Failed to delete list. Please try again.', variant: 'destructive' });
    }
  } : undefined;

  return (
    <PageWrapper>
      <div className="h-screen flex flex-col">
        {!shoppingMode && (
          <>
            <SubpageHeader
              icon={<ShoppingCart className="h-5 w-5 text-primary" />}
              title="Shopping"
              badge={activeList ? <Badge variant="secondary">{checkedItems}/{totalItems}</Badge> : undefined}
              actions={<>
                <UndoButton />
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
                { label: 'Manage Categories', icon: Tags, onClick: () => setShowCategoriesModal(true) },
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

        <div className="flex-1 overflow-y-auto p-2 pb-24">
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
            <div className="max-w-7xl mx-auto">
              <div className={cn(
                'grid gap-2',
                isMobile ? 'grid-cols-1' : isPortrait ? 'grid-cols-2' : 'grid-cols-3'
              )}>
                {groceryCategoryItems.map(({ category, items }) => {
                  const categoryExtraRows = extraRows[category] || 0;
                  const totalEmptyLines = BASE_EMPTY_LINES + categoryExtraRows;
                  const emptyLinesNeeded = Math.max(0, totalEmptyLines - items.length);

                  return (
                    <ShoppingCategoryCard
                      key={category}
                      category={category}
                      items={items}
                      categoryColor={getDynCategoryColor(category)}
                      categoryEmoji={getDynCategoryEmoji(category)}
                      isDragging={draggedCategory === category}
                      emptyLinesNeeded={emptyLinesNeeded}
                      extraRowCount={categoryExtraRows}
                      baseEmptyLines={BASE_EMPTY_LINES}
                      inlineInputValue={inlineInputs[category] || ''}
                      inputRefs={inputRefs}
                      onDragStart={() => handleDragStart(category)}
                      onDragOver={(e) => handleDragOver(e, category)}
                      onDragEnd={handleDragEnd}
                      onTouchStart={(e) => handleTouchStart(e, category)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onToggleItem={(itemId) => toggleItem(itemId)}
                      onEditItem={handleEditItem}
                      onDeleteItem={(itemId) => handleDeleteItem(itemId)}
                      onAddItem={handleAddItem}
                      onInlineInputChange={(cat, value) => setInlineInputs(prev => ({ ...prev, [cat]: value }))}
                      onInlineKeyDown={handleInlineKeyDown}
                      onInlineBlur={handleInlineBlur}
                      onAddExtraRows={addExtraRows}
                      isMobile={isMobile}
                    />
                  );
                })}
              </div>

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
          <ItemModal listId={activeList.id} lists={lists} defaultCategory={defaultCategory || undefined}
            onClose={() => { setShowAddItemModal(false); setDefaultCategory(null); }}
            onSave={handleSaveNewItem} />
        )}

        {editingItem && (
          <ItemModal listId={editingItem.listId} item={editingItem}
            onClose={() => setEditingItem(null)} onSave={handleUpdateItem} />
        )}

        {showListModal && (
          <ListModal list={editingList} familyMembers={familyMembers} categories={dynamicCategories}
            onClose={() => { setShowListModal(false); setEditingList(null); }}
            onSave={handleSaveList} onDelete={handleDeleteList} />
        )}

        <ManageCategoriesModal open={showCategoriesModal} onOpenChange={setShowCategoriesModal} />

        {showCameraScanner && (
          <CameraScannerOverlay
            onClose={() => setShowCameraScanner(false)}
            onScan={handleCameraScan}
          />
        )}

        {/* Scan flow bottom sheets */}
        {scan && scan.step && scan.step !== 'loading' && (() => {
          const product = scan.product;
          if (!product) return null;
          return (
            <div className="fixed inset-0 z-[9100] flex items-end justify-center bg-black/60"
              onClick={clearScan}>
              <div className="w-full max-w-lg bg-card rounded-t-2xl p-4 pb-8 shadow-xl"
                onClick={e => e.stopPropagation()}>
                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-3" />
                <p className="font-semibold text-center mb-1">{product.name}</p>
                {product.brand && <p className="text-sm text-muted-foreground text-center mb-3">{product.brand}</p>}

                {/* Step: list picker */}
                {scan.step === 'list' && (
                  <>
                    <p className="text-sm text-muted-foreground text-center mb-3">Which list?</p>
                    <div className="flex flex-col gap-2">
                      {lists.map(list => (
                        <Button key={list.id}
                          variant={list.id === activeListId ? 'default' : 'outline'}
                          className="w-full justify-start text-base py-3"
                          onClick={() => handleListChosen(list.id, list.name)}>
                          {list.name}
                        </Button>
                      ))}
                    </div>
                  </>
                )}

                {/* Step: duplicate warning */}
                {scan.step === 'duplicate' && (() => {
                  const others = scan.existingInLists.filter(e => e.listId !== scan.targetListId);
                  return (
                    <>
                      <p className="text-sm text-muted-foreground text-center mb-3">
                        Already on <strong>{others.map(e => e.listName).join(', ')}</strong>.
                        Add to <strong>{scan.targetListName}</strong> anyway?
                      </p>
                      <div className="flex flex-col gap-2">
                        <Button className="w-full py-3" onClick={() => setScan(prev => prev ? { ...prev, step: 'category' } : null)}>
                          Yes, add to {scan.targetListName}
                        </Button>
                        <Button variant="outline" className="w-full py-3" onClick={clearScan}>
                          Cancel
                        </Button>
                      </div>
                    </>
                  );
                })()}

                {/* Step: category picker */}
                {scan.step === 'category' && (
                  <>
                    <p className="text-sm text-muted-foreground text-center mb-3">Which category?</p>
                    <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                      {dynamicCategories.map(cat => (
                        <Button key={cat.id}
                          variant={cat.id === product.suggestedCategory ? 'default' : 'outline'}
                          className="w-full justify-start text-base py-3 gap-2"
                          onClick={() => doAdd(cat.id)}>
                          <span>{getDynCategoryEmoji(cat.id)}</span>
                          <span>{cat.name}</span>
                          {cat.id === product.suggestedCategory && (
                            <span className="ml-auto text-xs opacity-60">suggested</span>
                          )}
                        </Button>
                      ))}
                      <Button variant="ghost" className="w-full py-3 text-muted-foreground"
                        onClick={() => doAdd(null)}>
                        No category
                      </Button>
                    </div>
                  </>
                )}

                <Button variant="ghost" className="w-full mt-2 text-muted-foreground" onClick={clearScan}>
                  Cancel
                </Button>
              </div>
            </div>
          );
        })()}

        {/* Loading indicator while doing dryRun lookup */}
        {scan?.step === 'loading' && (
          <div className="fixed inset-0 z-[9100] flex items-center justify-center bg-black/40">
            <div className="bg-card rounded-2xl p-6 flex flex-col items-center gap-3 shadow-xl">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Looking up product…</p>
            </div>
          </div>
        )}

        <ShoppingCelebration
          show={showCelebration}
          onComplete={() => setShowCelebration(false)}
        />
      </div>
    </PageWrapper>
  );
}
