'use client';

interface MeasureBarProps {
  measureHideNav: boolean;
  onToggleNav: () => void;
  onExit: () => void;
}

export function LayoutEditorMeasureBar({ measureHideNav, onToggleNav, onExit }: MeasureBarProps) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 bg-card/90 backdrop-blur-sm border border-border rounded-full px-4 py-2 shadow-lg">
      <button
        onClick={onToggleNav}
        className={`px-3 py-1.5 text-xs rounded-full transition-colors whitespace-nowrap ${
          measureHideNav
            ? 'bg-muted text-muted-foreground hover:bg-accent'
            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30'
        }`}
      >
        {measureHideNav ? 'Show Nav' : 'Hide Nav'}
      </button>
      <div className="w-px h-4 bg-border" />
      <button
        onClick={onExit}
        className="px-3 py-1.5 text-xs rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors whitespace-nowrap"
      >
        Exit
      </button>
      <span className="text-[10px] text-muted-foreground hidden sm:inline">Ctrl+Shift+M</span>
    </div>
  );
}
