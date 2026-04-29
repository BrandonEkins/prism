'use client';

import * as React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

export type WeekItemVariant = 'event' | 'chore' | 'task' | 'meal';

interface WeekItemCardProps {
  variant: WeekItemVariant;
  /** Hex or CSS color used for the left stripe and (optionally) icon tint */
  stripeColor: string;
  /** Title — main text */
  title: string;
  /** Optional time range, e.g. '7:00 PM' or '7:00 - 8:30 PM' */
  timeLabel?: string;
  /** Optional secondary line, e.g. assignee name or calendar */
  subtitle?: string;
  /** Strike-through and dim, for completed/cooked items */
  muted?: boolean;
  /** Click handler — opens detail modal in caller */
  onClick?: () => void;
  /** Accessible label override */
  ariaLabel?: string;
  /**
   * Drag identifier in the form `chore:<id>` | `task:<id>` | `meal:<id>`.
   * Omit for read-only items (calendar events).
   */
  dragId?: string;
}

export function WeekItemCard({
  variant,
  stripeColor,
  title,
  timeLabel,
  subtitle,
  muted,
  onClick,
  ariaLabel,
  dragId,
}: WeekItemCardProps) {
  const draggable = useDraggable({
    id: dragId ?? `__static__:${variant}:${title}`,
    disabled: !dragId,
    data: { dragId },
  });

  const interactive = Boolean(onClick) && !dragId;
  const Tag = interactive ? 'button' : 'div';

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(draggable.transform),
    touchAction: dragId ? 'none' : undefined,
    zIndex: draggable.isDragging ? 50 : undefined,
  };

  return (
    <Tag
      ref={dragId ? draggable.setNodeRef : undefined}
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      aria-label={ariaLabel ?? title}
      data-variant={variant}
      data-dragging={draggable.isDragging || undefined}
      style={style}
      {...(dragId ? draggable.listeners : {})}
      {...(dragId ? draggable.attributes : {})}
      className={cn(
        'group relative flex w-full items-stretch gap-2',
        'overflow-hidden rounded-md',
        'bg-black/30 dark:bg-black/40 backdrop-blur-sm',
        'border border-white/5',
        'text-left text-foreground',
        'transition-colors duration-150',
        interactive && 'cursor-pointer hover:bg-black/40 dark:hover:bg-black/50',
        dragId && 'cursor-grab active:cursor-grabbing',
        draggable.isDragging && 'opacity-40 ring-2 ring-seasonal-accent shadow-xl',
        muted && 'opacity-60',
      )}
    >
      {/* Left color stripe */}
      <span
        aria-hidden
        className="w-1 shrink-0 rounded-l-md"
        style={{ backgroundColor: stripeColor }}
      />

      <div className="flex min-w-0 flex-1 flex-col py-1 pr-2">
        {timeLabel && (
          <span className="truncate text-[10px] font-medium leading-tight text-white/70">
            {timeLabel}
          </span>
        )}
        <span
          className={cn(
            'truncate text-xs font-semibold leading-tight text-white',
            muted && 'line-through',
          )}
        >
          {title}
        </span>
        {subtitle && (
          <span className="truncate text-[10px] leading-tight text-white/60">
            {subtitle}
          </span>
        )}
      </div>
    </Tag>
  );
}
