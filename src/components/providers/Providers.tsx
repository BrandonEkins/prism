/**
 *
 * Wraps all application providers in a single client component.
 * This is needed because the root layout is a Server Component.
 *
 */

'use client';

import * as React from 'react';
import { ThemeProvider } from './ThemeProvider';
import { AuthProvider } from './AuthProvider';
import { FamilyProvider } from './FamilyProvider';
import { GlobalInputProvider } from '@/lib/hooks/useGlobalInput';
import { VirtualKeyboard, KeyboardToggleButton } from '@/components/input';

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * PROVIDERS COMPONENT
 * Wraps the application with all necessary providers.
 * AuthProvider must be inside ThemeProvider since QuickPinModal uses styled components.
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider defaultTheme="system">
      <FamilyProvider>
        <AuthProvider>
          <GlobalInputProvider>
            {children}
            <VirtualKeyboard />
            <KeyboardToggleButton />
          </GlobalInputProvider>
        </AuthProvider>
      </FamilyProvider>
    </ThemeProvider>
  );
}
