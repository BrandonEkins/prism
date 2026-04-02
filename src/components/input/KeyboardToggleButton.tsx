'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useGlobalInput } from '@/lib/hooks/useGlobalInput';

export function KeyboardToggleButton() {
  const { keyboardVisible, setKeyboardVisible, activeInputRef, isMobile, lastPointerType } =
    useGlobalInput();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const show =
    mounted &&
    !isMobile &&
    !keyboardVisible &&
    activeInputRef.current !== null &&
    lastPointerType === 'touch';

  if (!show) return null;

  return createPortal(
    <Button
      variant="secondary"
      size="icon"
      aria-label="Open keyboard"
      className={cn(
        'fixed z-[8500] rounded-xl shadow-lg',
        'h-12 w-12',
        'transition-opacity duration-150',
        show ? 'opacity-100' : 'opacity-0 pointer-events-none',
      )}
      style={{ bottom: '1.5rem', right: '1.5rem' }}
      onPointerDown={e => {
        e.preventDefault(); // prevent focusout on the active input
        setKeyboardVisible(true);
      }}
    >
      <Keyboard className="h-5 w-5" />
    </Button>,
    document.body,
  );
}
