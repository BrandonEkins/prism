import type { WidgetConfig } from '@/lib/hooks/useLayouts';

export interface ScreensaverTemplate {
  name: string;
  description: string;
  orientation: 'landscape' | 'portrait';
  widgets: WidgetConfig[];
}

export const SCREENSAVER_TEMPLATES: Record<string, ScreensaverTemplate> = {
  // ── Landscape Templates ──────────────────────────────────────────
  minimal: {
    name: 'Minimal',
    description: 'Clock and weather, top-right corner',
    orientation: 'landscape',
    widgets: [
      { i: 'clock', x: 32, y: 0, w: 16, h: 12, visible: true },
      { i: 'weather', x: 32, y: 12, w: 16, h: 8, visible: true },
    ],
  },
  photoFrame: {
    name: 'Photo Frame',
    description: 'Small clock and weather overlay — photos fill the screen',
    orientation: 'landscape',
    widgets: [
      { i: 'clock', x: 36, y: 0, w: 12, h: 8, visible: true },
      { i: 'weather', x: 36, y: 8, w: 12, h: 4, visible: true },
    ],
  },
  infoPanel: {
    name: 'Info Panel',
    description: 'Calendar on the left, clock + weather + messages on the right',
    orientation: 'landscape',
    widgets: [
      { i: 'calendar', x: 0, y: 0, w: 20, h: 36, visible: true },
      { i: 'weather', x: 32, y: 0, w: 16, h: 8, visible: true },
      { i: 'messages', x: 32, y: 8, w: 16, h: 16, visible: true },
      { i: 'clock', x: 32, y: 24, w: 16, h: 12, visible: true },
    ],
  },
  familyBoard: {
    name: 'Family Board',
    description: 'Tasks and chores across the top, clock + weather + messages on the right',
    orientation: 'landscape',
    widgets: [
      { i: 'tasks', x: 0, y: 0, w: 16, h: 20, visible: true },
      { i: 'chores', x: 16, y: 0, w: 16, h: 20, visible: true },
      { i: 'weather', x: 32, y: 0, w: 16, h: 8, visible: true },
      { i: 'messages', x: 32, y: 8, w: 16, h: 16, visible: true },
      { i: 'clock', x: 32, y: 24, w: 16, h: 12, visible: true },
    ],
  },
  kitchen: {
    name: 'Kitchen Display',
    description: 'Meals spanning the top, shopping list below, clock + weather on the right',
    orientation: 'landscape',
    widgets: [
      { i: 'meals', x: 0, y: 0, w: 32, h: 16, visible: true },
      { i: 'shopping', x: 0, y: 16, w: 20, h: 20, visible: true },
      { i: 'weather', x: 32, y: 0, w: 16, h: 8, visible: true },
      { i: 'clock', x: 32, y: 8, w: 16, h: 12, visible: true },
    ],
  },
  commandCenter: {
    name: 'Command Center',
    description: 'Full grid with all common widgets',
    orientation: 'landscape',
    widgets: [
      { i: 'calendar', x: 0, y: 0, w: 16, h: 24, visible: true },
      { i: 'tasks', x: 16, y: 0, w: 16, h: 16, visible: true },
      { i: 'messages', x: 32, y: 0, w: 16, h: 16, visible: true },
      { i: 'chores', x: 16, y: 16, w: 16, h: 16, visible: true },
      { i: 'birthdays', x: 32, y: 16, w: 16, h: 16, visible: true },
      { i: 'weather', x: 0, y: 24, w: 16, h: 8, visible: true },
      { i: 'clock', x: 0, y: 32, w: 16, h: 12, visible: true },
    ],
  },

  // ── Portrait Templates ───────────────────────────────────────────
  minimalPortrait: {
    name: 'Minimal',
    description: 'Clock and weather centered near the top',
    orientation: 'portrait',
    widgets: [
      { i: 'clock', x: 12, y: 0, w: 16, h: 12, visible: true },
      { i: 'weather', x: 12, y: 12, w: 16, h: 8, visible: true },
    ],
  },
  photoFramePortrait: {
    name: 'Photo Frame',
    description: 'Tiny clock overlay for a tall screen',
    orientation: 'portrait',
    widgets: [
      { i: 'clock', x: 12, y: 0, w: 16, h: 8, visible: true },
      { i: 'weather', x: 12, y: 8, w: 16, h: 4, visible: true },
    ],
  },
  infoPanelPortrait: {
    name: 'Info Panel',
    description: 'Calendar and info stacked vertically',
    orientation: 'portrait',
    widgets: [
      { i: 'calendar', x: 0, y: 0, w: 40, h: 28, visible: true },
      { i: 'clock', x: 0, y: 28, w: 20, h: 12, visible: true },
      { i: 'weather', x: 20, y: 28, w: 20, h: 8, visible: true },
      { i: 'messages', x: 0, y: 40, w: 40, h: 20, visible: true },
    ],
  },
  familyBoardPortrait: {
    name: 'Family Board',
    description: 'Tasks and chores stacked, info below',
    orientation: 'portrait',
    widgets: [
      { i: 'tasks', x: 0, y: 0, w: 40, h: 20, visible: true },
      { i: 'chores', x: 0, y: 20, w: 40, h: 20, visible: true },
      { i: 'weather', x: 0, y: 40, w: 20, h: 8, visible: true },
      { i: 'clock', x: 20, y: 40, w: 20, h: 12, visible: true },
      { i: 'messages', x: 0, y: 52, w: 40, h: 16, visible: true },
    ],
  },
  kitchenPortrait: {
    name: 'Kitchen Display',
    description: 'Meals and shopping stacked for a tall screen',
    orientation: 'portrait',
    widgets: [
      { i: 'meals', x: 0, y: 0, w: 40, h: 20, visible: true },
      { i: 'shopping', x: 0, y: 20, w: 40, h: 24, visible: true },
      { i: 'weather', x: 0, y: 44, w: 20, h: 8, visible: true },
      { i: 'clock', x: 20, y: 44, w: 20, h: 12, visible: true },
    ],
  },
  commandCenterPortrait: {
    name: 'Command Center',
    description: 'All common widgets in a narrow, tall layout',
    orientation: 'portrait',
    widgets: [
      { i: 'calendar', x: 0, y: 0, w: 40, h: 24, visible: true },
      { i: 'tasks', x: 0, y: 24, w: 20, h: 16, visible: true },
      { i: 'messages', x: 20, y: 24, w: 20, h: 16, visible: true },
      { i: 'chores', x: 0, y: 40, w: 20, h: 16, visible: true },
      { i: 'birthdays', x: 20, y: 40, w: 20, h: 16, visible: true },
      { i: 'weather', x: 0, y: 56, w: 20, h: 8, visible: true },
      { i: 'clock', x: 20, y: 56, w: 20, h: 12, visible: true },
    ],
  },
};
