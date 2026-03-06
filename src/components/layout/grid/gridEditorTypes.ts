import type { WidgetConfig } from '@/lib/hooks/useLayouts';

export interface EditorTheme {
  gridBg: string;
  gridStroke: string;
  gridOpacity: number;
  gridPatternId: string;
  borderDash: string;
}

export const DASHBOARD_THEME: EditorTheme = {
  gridBg: '',
  gridStroke: 'currentColor',
  gridOpacity: 0.3,
  gridPatternId: 'grid-dash',
  borderDash: 'border-white/50 dark:border-white/40',
};

export const SCREENSAVER_THEME: EditorTheme = {
  gridBg: 'bg-black/80',
  gridStroke: 'white',
  gridOpacity: 0.2,
  gridPatternId: 'grid-ss',
  borderDash: 'border-white/40',
};

export interface CssGridDisplayProps {
  layout: WidgetConfig[];
  renderWidget: (widget: WidgetConfig) => React.ReactNode;
  margin?: number;
  containerPadding?: number;
  cols?: number;
  /** Fill viewport height (screensaver mode) */
  fillHeight?: boolean;
  /** Offset from top of viewport for visible row calculation */
  headerOffset?: number;
  /** Offset from bottom for portrait nav */
  bottomOffset?: number;
  minVisibleRows?: number;
  className?: string;
}

export interface LayoutGridEditorProps {
  layout: WidgetConfig[];
  onLayoutChange: (layout: WidgetConfig[]) => void;
  isEditable?: boolean;
  renderWidget: (widget: WidgetConfig) => React.ReactNode;
  widgetConstraints?: Record<string, { minW?: number; minH?: number }>;
  margin?: number;
  headerOffset?: number;
  bottomOffset?: number;
  minVisibleRows?: number;
  theme?: EditorTheme;
  gridHelperText?: string;
  className?: string;
  screenGuideOrientation?: 'landscape' | 'portrait';
  enabledSizes?: string[];
  onScrollInfo?: (info: { scrollY: number; visibleRows: number; scrollX: number; visibleCols: number; totalRows: number; totalCols: number }) => void;
  scrollToRef?: React.MutableRefObject<((row: number, col?: number) => void) | null>;
}
