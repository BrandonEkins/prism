'use client';

import { useMemo, useState, useCallback } from 'react';
import { ClipboardList, GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/ui/avatar';
import { useDragReorder } from '@/lib/hooks/useDragReorder';
import { ChoreGroupCard } from './ChoreGroupCard';
import { cn } from '@/lib/utils';

export interface ChoreGroupEntry {
  user: { id: string; name: string; color: string } | null;
  chores: any[];
}

interface ChoreGroupGridProps {
  choresByUser: ChoreGroupEntry[];
  inlineChoreByUser: Record<string, string>;
  setInlineChoreByUser: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  inlineAddChore: (title: string, assignedTo?: string) => Promise<boolean>;
  completeChore: (id: string) => Promise<boolean>;
  editChore: (chore: any) => void;
  deleteChore: (id: string) => void;
  setCelebratingUser: (user: { id: string; name: string } | null) => void;
  isMobile?: boolean;
}

export function ChoreGroupGrid({
  choresByUser,
  inlineChoreByUser,
  setInlineChoreByUser,
  inlineAddChore,
  completeChore,
  editChore,
  deleteChore,
  setCelebratingUser,
  isMobile = false,
}: ChoreGroupGridProps) {
  const groupKeys = useMemo(
    () => choresByUser.map((g) => g.user?.id || 'unassigned'),
    [choresByUser]
  );

  const [groupOrder, setGroupOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('prism:chore-group-order');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const effectiveOrder = useMemo(() => {
    const known = groupOrder.filter((k) => groupKeys.includes(k));
    const newKeys = groupKeys.filter((k) => !known.includes(k));
    return [...known, ...newKeys];
  }, [groupOrder, groupKeys]);

  const saveOrder = useCallback((order: string[]) => {
    setGroupOrder(order);
    try {
      localStorage.setItem('prism:chore-group-order', JSON.stringify(order));
    } catch {}
  }, []);

  const { draggedId, getDragProps } = useDragReorder({ order: effectiveOrder, onReorder: saveOrder });

  const sortedGroups = useMemo(() => {
    const map = new Map(choresByUser.map((g) => [g.user?.id || 'unassigned', g]));
    return effectiveOrder.map((k) => map.get(k)).filter(Boolean) as ChoreGroupEntry[];
  }, [choresByUser, effectiveOrder]);

  return (
    <div
      className={cn(
        'grid gap-2 h-full',
        isMobile
          ? 'grid-cols-1'
          : sortedGroups.length <= 2
          ? 'grid-cols-1 md:grid-cols-2'
          : sortedGroups.length <= 4
          ? 'grid-cols-2'
          : 'grid-cols-2 md:grid-cols-3'
      )}
    >
      {sortedGroups.map(({ user, chores }) => {
        const userColor = user?.color || '#6B7280';
        const key = user?.id || 'unassigned';
        const isDragging = draggedId === key;
        return (
          <div
            key={key}
            {...(isMobile ? {} : getDragProps(key))}
            className={cn(
              'flex flex-col border-2 rounded-lg overflow-hidden bg-card/90 backdrop-blur-sm transition-all',
              !isMobile && 'cursor-grab active:cursor-grabbing touch-none',
              isDragging && 'opacity-50 scale-95 ring-4 ring-primary/50'
            )}
            style={{ borderColor: userColor }}
          >
            <div
              className="flex items-center gap-2 px-3 py-2 shrink-0"
              style={{ backgroundColor: userColor + '20' }}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0 hidden md:block" />
              {user ? (
                <UserAvatar name={user.name} color={user.color} size="sm" className="h-7 w-7" />
              ) : (
                <ClipboardList className="h-5 w-5 text-muted-foreground" />
              )}
              <h3 className="font-bold text-lg" style={{ color: userColor }}>
                {user?.name || 'Unassigned'}
              </h3>
              <Badge variant="outline" className="ml-auto">
                {chores.length}
              </Badge>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <Input
                placeholder="Add chore..."
                value={inlineChoreByUser[key] || ''}
                onChange={(e) =>
                  setInlineChoreByUser((prev) => ({ ...prev, [key]: e.target.value }))
                }
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = (inlineChoreByUser[key] || '').trim();
                    if (!val) return;
                    const success = await inlineAddChore(val, user?.id);
                    if (success) setInlineChoreByUser((prev) => ({ ...prev, [key]: '' }));
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                draggable={false}
                className="h-8 text-sm mb-1"
              />
              {chores.map((chore) => (
                <ChoreGroupCard
                  key={chore.id}
                  chore={chore}
                  assignedUser={user}
                  allChores={chores}
                  onComplete={() => completeChore(chore.id)}
                  onEdit={() => editChore(chore)}
                  onDelete={() => deleteChore(chore.id)}
                  setCelebratingUser={setCelebratingUser}
                />
              ))}
              {chores.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-4">No chores</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
