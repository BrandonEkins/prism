/**
 * Returns true if the given hex color is light (luminance > 0.5).
 * Used for auto light/dark text detection on colored backgrounds.
 *
 * Future: per-widget text color manual override could replace this auto-detection.
 */
/**
 * Converts a hex color + opacity to an rgba() string.
 * Keeps opacity on the background only — sibling content stays fully opaque.
 */
export function hexToRgba(hex: string, opacity: number): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

export function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  // Relative luminance (ITU-R BT.709)
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.5;
}
