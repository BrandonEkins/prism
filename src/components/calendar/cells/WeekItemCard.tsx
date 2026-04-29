'use client';

import * as React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

export type WeekItemVariant = 'event' | 'chore' | 'task' | 'meal';
export type WeekItemSize = 'xs' | 'sm' | 'md' | 'lg';
export type WeekItemLayout = 'column' | 'row';

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
  /** Visual density. Defaults to 'md'. */
  size?: WeekItemSize;
  /** Stacked vertical card ('column') or horizontal row ('row'). Defaults to 'column'. */
  layout?: WeekItemLayout;
}

/**
 * Tailwind class fragments per size — kept as static strings (not template-built)
 * so Tailwind's JIT can detect them.
 */
const SIZE_STYLES: Record<WeekItemSize, {
  padding: string;
  titleText: string;
  metaText: string;
  stripeWidth: string;
  showSubtitle: boolean;
  showTime: boolean;
}> = {
  xs: {
    padding: 'py-0.5 pr-1',
    titleText: 'text-[10px] leading-tight',
    metaText: 'text-[9px] leading-tight',
    stripeWidth: 'w-0.5',
    showSubtitle: false,
    showTime: false,
  },
  sm: {
    padding: 'py-0.5 pr-1.5',
    titleText: 'text-[11px] leading-tight',
    metaText: 'text-[9px] leading-tight',
    stripeWidth: 'w-0.5',
    showSubtitle: false,
    showTime: true,
  },
  md: {
    padding: 'py-1 pr-2',
    titleText: 'text-xs leading-tight',
    metaText: 'text-[10px] leading-tight',
    stripeWidth: 'w-1',
    showSubtitle: true,
    showTime: true,
  },
  lg: {
    padding: 'py-1.5 pr-2.5',
    titleText: 'text-sm leading-snug',
    metaText: 'text-xs leading-tight',
    stripeWidth: 'w-1',
    showSubtitle: true,
    showTime: true,
  },
};

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
  size = 'md',
  layout = 'column',
}: WeekItemCardProps) {
  const draggable = useDraggable({
    id: dragId ?? `__static__:${variant}:${title}`,
    disabled: !dragId,
    data: { dragId },
  });

  const interactive = Boolean(onClick) && !dragId;
  const Tag = interactive ? 'button' : 'div';
  const styles = SIZE_STYLES[size];

  const transformStyle: React.CSSProperties = {
    transform: CSS.Translate.toString(draggable.transform),
    touchAction: dragId ? 'none' : undefined,
    zIndex: draggable.isDragging ? 50 : undefined,
  };

  // For row layout, render: [stripe][time][title][subtitle aside]
  if (layout === 'row') {
    return (
      <Tag
        ref={dragId ? draggable.setNodeRef : undefined}
        type={interactive ? 'button' : undefined}
        onClick={onClick}
        aria-label={ariaLabel ?? title}
        data-variant={variant}
        data-dragging={draggable.isDragging || undefined}
        style={transformStyle}
        {...(dragId ? draggable.listeners : {})}
        {...(dragId ? draggable.attributes : {})}
        className={cn(
          'group relative flex w-full items-center gap-2',
          'overflow-hidden rounded-md',
          'bg-black/30 dark:bg-black/40 backdrop-blur-sm',
          'border border-white/5',
          'text-left text-foreground',
          'transition-colors duration-150',
          interactive && 'cursor-pointer hover:bg-black/40 dark:hover:bg-black/50',
          dragId && 'cursor-grab active:cursor-grabbing',
          draggable.isDragging && 'opacity-40 ring-2 ring-seasonal-accent shadow-xl',
          muted && 'opacity-60',
          styles.padding,
        )}
      >
        <span aria-hidden className={cn('shrink-0 self-stretch rounded-full', styles.stripeWidth)} style={{ backgroundColor: stripeColor }} />
        {styles.showTime && timeLabel && (
          <span className={cn('shrink-0 font-medium tabular-nums text-white/70', styles.metaText)}>
            {timeLabel}
          </span>
        )}
        <span className={cn('flex-1 truncate font-semibold text-white', styles.titleText, muted && 'line-through')}>
          {title}
        </span>
        {styles.showSubtitle && subtitle && (
          <span className={cn('shrink-0 truncate text-white/60', styles.metaText)}>
            {subtitle}
          </span>
        )}
      </Tag>
    );
  }

  // Default: column layout (stacked card)
  return (
    <Tag
      ref={dragId ? draggable.setNodeRef : undefined}
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      aria-label={ariaLabel ?? title}
      data-variant={variant}
      data-dragging={draggable.isDragging || undefined}
      style={transformStyle}
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
      <span aria-hidden className={cn('shrink-0 rounded-l-md', styles.stripeWidth)} style={{ backgroundColor: stripeColor }} />

      <div className={cn('flex min-w-0 flex-1 flex-col', styles.padding)}>
        {styles.showTime && timeLabel && (
          <span className={cn('truncate font-medium text-white/70', styles.metaText)}>
            {timeLabel}
          </span>
        )}
        <span className={cn('truncate font-semibold text-white', styles.titleText, muted && 'line-through')}>
          {title}
        </span>
        {styles.showSubtitle && subtitle && (
          <span className={cn('truncate text-white/60', styles.metaText)}>
            {subtitle}
          </span>
        )}
      </div>
    </Tag>
  );
}
