'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useVisibilityPolling } from '@/lib/hooks/useVisibilityPolling';
import type { FamilyMember } from '@/types';

interface FamilyContextValue {
  members: FamilyMember[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const FamilyContext = createContext<FamilyContextValue>({
  members: [],
  loading: true,
  error: null,
  refresh: async () => {},
});

export function useFamily(): FamilyContextValue {
  return useContext(FamilyContext);
}

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const membersRef = React.useRef<FamilyMember[]>([]);

  const fetchMembers = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/family');
      if (response.ok) {
        const data = await response.json();
        const next: FamilyMember[] = data.members.map((m: {
          id: string;
          loginIndex?: number;
          name: string;
          role?: string;
          color: string;
          avatarUrl?: string | null;
          hasPin: boolean;
        }) => ({
          id: m.id,
          loginIndex: m.loginIndex,
          name: m.name,
          role: m.role as 'parent' | 'child' | 'guest' | undefined,
          color: m.color,
          avatarUrl: m.avatarUrl,
          hasPin: m.hasPin,
        }));
        // Only update state if data actually changed — avoids re-renders on every 10-min poll
        if (JSON.stringify(next) !== JSON.stringify(membersRef.current)) {
          membersRef.current = next;
          setMembers(next);
        }
      } else {
        setError('Failed to fetch family members');
      }
    } catch (err) {
      console.error('Failed to fetch family members:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch family members');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Refresh every 10 minutes with visibility-based pause
  useVisibilityPolling(fetchMembers, 10 * 60 * 1000);

  // Refresh immediately after login so member IDs + roles are real
  useEffect(() => {
    window.addEventListener('prism:auth-changed', fetchMembers);
    return () => window.removeEventListener('prism:auth-changed', fetchMembers);
  }, [fetchMembers]);

  return (
    <FamilyContext.Provider value={{ members, loading, error, refresh: fetchMembers }}>
      {children}
    </FamilyContext.Provider>
  );
}
