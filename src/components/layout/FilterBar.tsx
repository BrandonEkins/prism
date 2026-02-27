import { cn } from '@/lib/utils';

export interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div className={cn('flex-shrink-0 border-b border-border bg-card/85 backdrop-blur-sm px-3 py-1.5 max-h-24 overflow-y-auto', className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {children}
      </div>
    </div>
  );
}
