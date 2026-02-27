'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface PersonFilterProps {
  members: Array<{ id: string; name: string; color: string }>;
  selected: string | null;
  onSelect: (id: string | null) => void;
  className?: string;
}

export function PersonFilter({ members, selected, onSelect, className }: PersonFilterProps) {
  return (
    <div className={cn('flex gap-1 shrink-0', className)}>
      <Button
        variant={selected === null ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onSelect(null)}
        className="h-8"
      >
        All
      </Button>
      {members.map((member) => (
        <Button
          key={member.id}
          variant={selected === member.id ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onSelect(member.id)}
          className="gap-1.5 h-8"
        >
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: member.color }}
          />
          <span className="hidden sm:inline">{member.name}</span>
        </Button>
      ))}
    </div>
  );
}
