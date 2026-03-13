import type { CSSProperties } from 'react';
import { hexToRgba, isLightColor } from '@/lib/utils/color';
import type { WidgetConfig } from '@/lib/hooks/useLayouts';

/**
 * Compute inline CSSProperties for a widget's background, outline, and text color.
 * Used by both CssGridDisplay and the editor.
 */
export function getWidgetStyle(w: WidgetConfig): CSSProperties | undefined {
  if (!w.backgroundColor && !w.outlineColor && !w.textColor) return undefined;
  const style: CSSProperties = { borderRadius: '0.5rem' };

  if (w.backgroundColor === 'frosted') {
    // Blur intensity mapped from backgroundOpacity: 0.25=light, 0.5=med, 0.75=heavy, 1=max
    const intensity = w.backgroundOpacity ?? 0.5;
    const blurPx = Math.round(intensity * 24); // 6px to 24px
    const tintOpacity = 0.08 + intensity * 0.12; // 0.08 to 0.20
    style.backgroundColor = `rgba(255,255,255,${tintOpacity})`;
    style.backdropFilter = `blur(${blurPx}px) saturate(${1 + intensity * 0.3})`;
    (style as Record<string, string>).WebkitBackdropFilter = `blur(${blurPx}px) saturate(${1 + intensity * 0.3})`;
  } else if (w.backgroundColor && w.backgroundColor !== 'transparent') {
    const opacity = w.backgroundOpacity ?? 1;
    style.backgroundColor = opacity < 1
      ? hexToRgba(w.backgroundColor, opacity)
      : w.backgroundColor;
  }

  if (w.outlineColor) {
    const olOpacity = w.outlineOpacity ?? 1;
    style.border = `2px solid ${olOpacity < 1 ? hexToRgba(w.outlineColor, olOpacity) : w.outlineColor}`;
  }

  if (w.textColor) {
    const txtOpacity = w.textOpacity ?? 1;
    style.color = txtOpacity < 1
      ? hexToRgba(w.textColor, txtOpacity)
      : w.textColor;
  }

  if (w.textScale && w.textScale !== 1) {
    // Use zoom instead of fontSize because Tailwind text classes use rem (root-relative),
    // which ignores parent em/font-size. Zoom scales everything proportionally.
    (style as Record<string, unknown>).zoom = w.textScale;
  }

  return style;
}

/**
 * Get a Tailwind text color class based on widget background luminance.
 * Returns empty string if widget has explicit textColor (applied via context).
 */
export function getTextColorClass(w: WidgetConfig, fallback = ''): string {
  if (w.textColor) return '';
  if (!w.backgroundColor || w.backgroundColor === 'transparent' || w.backgroundColor === 'frosted' || w.backgroundOpacity === 0) return fallback;
  return isLightColor(w.backgroundColor) ? 'text-black' : 'text-white';
}
