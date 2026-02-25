'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ShoppingCategoryDef {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

const DEFAULT_CATEGORIES: ShoppingCategoryDef[] = [
  { id: 'produce', name: 'Produce', emoji: '🥬', color: '#22C55E' },
  { id: 'bakery', name: 'Bakery', emoji: '🥖', color: '#F59E0B' },
  { id: 'meat', name: 'Meat', emoji: '🥩', color: '#EF4444' },
  { id: 'dairy', name: 'Dairy', emoji: '🥛', color: '#3B82F6' },
  { id: 'frozen', name: 'Frozen', emoji: '🧊', color: '#8B5CF6' },
  { id: 'pantry', name: 'Pantry', emoji: '🥫', color: '#F97316' },
];

const EMOJI_POOL = ['🧴', '🥤', '🍿', '🧀', '🥚', '🍕', '🧹', '💊', '🐾', '🎁', '🍬', '🧃', '🥜', '🫒', '🌶️', '🍯'];

const COLOR_POOL = [
  '#EC4899', // pink
  '#14B8A6', // teal
  '#6366F1', // indigo
  '#84CC16', // lime
  '#F43F5E', // rose
  '#06B6D4', // cyan
  '#A855F7', // purple
  '#D97706', // amber darker
  '#10B981', // emerald
  '#0EA5E9', // sky
  '#E11D48', // rose-600
  '#7C3AED', // violet
];

export function useShoppingCategories() {
  const [categories, setCategories] = useState<ShoppingCategoryDef[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        const saved = data.settings?.shoppingCategories;
        if (Array.isArray(saved) && saved.length > 0) {
          setCategories(saved);
        }
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const saveCategories = useCallback(async (newCategories: ShoppingCategoryDef[]) => {
    setCategories(newCategories);
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'shoppingCategories', value: newCategories }),
      });
    } catch {
      // Ignore save errors
    }
  }, []);

  const addCategory = useCallback(async (name: string) => {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (categories.some(c => c.id === id)) return null;

    // Pick next available emoji and color
    const usedEmojis = new Set(categories.map(c => c.emoji));
    const usedColors = new Set(categories.map(c => c.color));
    const emoji = EMOJI_POOL.find(e => !usedEmojis.has(e)) ?? EMOJI_POOL[categories.length % EMOJI_POOL.length] ?? '🛒';
    const color = COLOR_POOL.find(c => !usedColors.has(c)) ?? COLOR_POOL[categories.length % COLOR_POOL.length] ?? '#3B82F6';

    const newCat: ShoppingCategoryDef = { id, name, emoji, color };
    const updated = [...categories, newCat];
    await saveCategories(updated);
    return newCat;
  }, [categories, saveCategories]);

  const removeCategory = useCallback(async (categoryId: string) => {
    const updated = categories.filter(c => c.id !== categoryId);
    await saveCategories(updated);
  }, [categories, saveCategories]);

  const reorderCategories = useCallback(async (newOrder: ShoppingCategoryDef[]) => {
    await saveCategories(newOrder);
  }, [saveCategories]);

  const getCategoryEmoji = useCallback((categoryId: string): string => {
    return categories.find(c => c.id === categoryId)?.emoji || '🛒';
  }, [categories]);

  const getCategoryColor = useCallback((categoryId: string): string => {
    return categories.find(c => c.id === categoryId)?.color || '#3B82F6';
  }, [categories]);

  return {
    categories,
    loading,
    addCategory,
    removeCategory,
    reorderCategories,
    getCategoryEmoji,
    getCategoryColor,
    refresh: fetchCategories,
  };
}
