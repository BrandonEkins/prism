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

  if (w.backgroundColor && w.backgroundColor !== 'transparent') {
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

  return style;
}

/**
 * Get a Tailwind text color class based on widget background luminance.
 * Returns empty string if widget has explicit textColor (applied via context).
 */
export function getTextColorClass(w: WidgetConfig, fallback = ''): string {
  if (w.textColor) return '';
  if (!w.backgroundColor || w.backgroundColor === 'transparent' || w.backgroundOpacity === 0) return fallback;
  return isLightColor(w.backgroundColor) ? 'text-black' : 'text-white';
}
