'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/avatar';
import type { FamilyMember } from '@/types';

interface MemberSelectionProps {
  members: FamilyMember[];
  onSelect: (member: FamilyMember) => void;
}

/**
 * MEMBER SELECTION COMPONENT
 * Displays a grid of family member avatars for selection.
 */
export function MemberSelection({ members, onSelect }: MemberSelectionProps) {
  return (
    <div className="flex flex-col items-center">
      <h2 className="text-xl font-semibold mb-6">Who&apos;s there?</h2>
      <div className="grid grid-cols-2 gap-4">
        {members.map((member) => (
          <button
            key={member.id}
            onClick={() => onSelect(member)}
            aria-label={`Select ${member.name}`}
            className={cn(
              'flex flex-col items-center p-4 rounded-xl',
              'hover:bg-accent/50 active:bg-accent transition-colors',
              'touch-action-manipulation',
              'min-w-[100px] min-h-[100px]'
            )}
          >
            <UserAvatar
              name={member.name}
              color={member.color}
              imageUrl={member.avatarUrl}
              size="lg"
              className="h-16 w-16 text-xl mb-2"
            />
            <span className="text-sm font-medium">{member.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Returns demo family member data for development/testing.
 */
export function getDemoFamilyMembers(): FamilyMember[] {
  return [
    { id: 'alex',   name: 'Alex',   color: '#3B82F6', role: 'parent' },
    { id: 'jordan', name: 'Jordan', color: '#EC4899', role: 'parent' },
    { id: 'emma',   name: 'Emma',   color: '#10B981', role: 'child'  },
    { id: 'sophie', name: 'Sophie', color: '#F59E0B', role: 'child'  },
  ];
}
