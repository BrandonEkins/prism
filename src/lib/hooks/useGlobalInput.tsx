'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { useIsMobile } from './useIsMobile';
import { useSpeechRecognition } from './useSpeechRecognition';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GlobalInputContextValue {
  keyboardVisible: boolean;
  isListening: boolean;
  lastPointerType: 'touch' | 'mouse' | 'keyboard';
  isMobile: boolean;
  activeInputRef: React.MutableRefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  setKeyboardVisible: (visible: boolean) => void;
  setIsListening: (v: boolean) => void;
  injectText: (text: string) => void;
  startListening: () => void;
  stopListening: () => void;
  virtualKeyboardEnabled: boolean;
}

const GlobalInputContext = createContext<GlobalInputContextValue | null>(null);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shouldShowKeyboard(el: Element): boolean {
  if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) return false;
  if (el instanceof HTMLInputElement) {
    return ['text', 'search', 'email', 'password'].includes(el.type.toLowerCase());
  }
  return true; // textarea
}

function isInsideKeyboard(el: Element): boolean {
  return !!el.closest('[data-virtual-keyboard]');
}

function getScrollParent(el: Element): Element | Window {
  let parent = el.parentElement;
  while (parent) {
    const style = getComputedStyle(parent);
    if (['auto', 'scroll'].includes(style.overflowY)) return parent;
    parent = parent.parentElement;
  }
  return window;
}

function isRealKeyboardEvent(e: KeyboardEvent): boolean {
  if (!e.isTrusted) return false;
  if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const KEYBOARD_HEIGHT_VH = 38;
const SCROLL_MARGIN_PX = 16;

export function GlobalInputProvider({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [keyboardVisible, setKeyboardVisibleState] = useState(false);
  const [lastPointerType, setLastPointerType] = useState<'touch' | 'mouse' | 'keyboard'>('mouse');

  const activeInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const originalScrollY = useRef<number | null>(null);
  const suppressedForScan = useRef(false);

  // Read virtual keyboard setting (default enabled)
  const [virtualKeyboardEnabled, setVirtualKeyboardEnabled] = useState(true);
  useEffect(() => {
    fetch('/api/settings?key=input.virtualKeyboardEnabled')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.value === false) setVirtualKeyboardEnabled(false);
      })
      .catch(() => {});
  }, []);

  // ---- injectText ----
  const injectText = useCallback((text: string) => {
    const input = activeInputRef.current;
    if (!input) return;
    const proto = input instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (!setter) return;
    setter.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, []);

  // ---- speech recognition ----
  const handleSpeechResult = useCallback((transcript: string) => {
    const input = activeInputRef.current;
    if (!input) return;
    const current = input.value;
    const sep = current.length > 0 && !current.endsWith(' ') ? ' ' : '';
    injectText(current + sep + transcript);
  }, [injectText]);

  const speech = useSpeechRecognition(handleSpeechResult);

  // ---- scroll helpers ----
  const scrollInputIntoView = useCallback((el: Element) => {
    const rect = el.getBoundingClientRect();
    const keyboardTop = window.innerHeight * (1 - KEYBOARD_HEIGHT_VH / 100);
    if (rect.bottom + SCROLL_MARGIN_PX > keyboardTop) {
      originalScrollY.current = window.scrollY;
      const scrollNeeded = rect.bottom + SCROLL_MARGIN_PX - keyboardTop;
      const scrollParent = getScrollParent(el);
      if (scrollParent === window) {
        window.scrollBy({ top: scrollNeeded, behavior: 'smooth' });
      } else {
        (scrollParent as Element).scrollBy({ top: scrollNeeded, behavior: 'smooth' });
      }
    }
  }, []);

  const restoreScroll = useCallback(() => {
    if (originalScrollY.current !== null) {
      window.scrollTo({ top: originalScrollY.current, behavior: 'smooth' });
      originalScrollY.current = null;
    }
  }, []);

  // ---- setKeyboardVisible (public) ----
  const setKeyboardVisible = useCallback((visible: boolean) => {
    setKeyboardVisibleState(visible);
    if (!visible) restoreScroll();
  }, [restoreScroll]);

  // ---- keyboard height CSS var ----
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--keyboard-height',
      keyboardVisible ? `${KEYBOARD_HEIGHT_VH}vh` : '0px',
    );
  }, [keyboardVisible]);

  // ---- barcode buffer ----
  const barcodeBuffer = useRef<{ char: string; time: number }[]>([]);

  // ---- document event listeners ----
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') setLastPointerType('touch');
      else if (e.pointerType === 'mouse') setLastPointerType('mouse');
    };

    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as Element;
      if (!shouldShowKeyboard(target)) {
        activeInputRef.current = null;
        setKeyboardVisibleState(false);
        return;
      }
      activeInputRef.current = target as HTMLInputElement | HTMLTextAreaElement;
      if (
        lastPointerType === 'touch' &&
        !isMobile &&
        !suppressedForScan.current &&
        virtualKeyboardEnabled
      ) {
        setKeyboardVisibleState(true);
        scrollInputIntoView(target);
      }
    };

    const onFocusOut = (e: FocusEvent) => {
      const next = e.relatedTarget as Element | null;
      if (next && isInsideKeyboard(next)) return;
      activeInputRef.current = null;
      setKeyboardVisibleState(false);
      restoreScroll();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Physical keyboard auto-dismiss
      if (isRealKeyboardEvent(e)) {
        setKeyboardVisibleState(false);
      }

      // Barcode scanner detection
      if (e.key === 'Enter') {
        const buf = barcodeBuffer.current;
        if (buf.length >= 10) {
          const elapsed = buf[buf.length - 1]!.time - buf[0]!.time;
          if (elapsed < 100) {
            const barcode = buf.map(b => b.char).join('');
            barcodeBuffer.current = [];
            e.preventDefault();
            // dispatchScan will be wired in a future session when scanner hardware arrives
            window.dispatchEvent(
              new CustomEvent('prism:barcode', { detail: { barcode } })
            );
            return;
          }
        }
        barcodeBuffer.current = [];
        return;
      }
      if (e.key.length === 1) {
        const now = Date.now();
        barcodeBuffer.current.push({ char: e.key, time: now });
        const cutoff = now - 200;
        barcodeBuffer.current = barcodeBuffer.current.filter(b => b.time >= cutoff);
      } else {
        barcodeBuffer.current = [];
      }
    };

    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.addEventListener('focusin', onFocusIn, { passive: true });
    document.addEventListener('focusout', onFocusOut, { passive: true });
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('keydown', onKeyDown);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastPointerType, isMobile, virtualKeyboardEnabled, scrollInputIntoView, restoreScroll]);

  const value = useMemo<GlobalInputContextValue>(() => ({
    keyboardVisible,
    isListening: speech.isListening,
    lastPointerType,
    isMobile,
    activeInputRef,
    setKeyboardVisible,
    setIsListening: () => {},
    injectText,
    startListening: speech.start,
    stopListening: speech.stop,
    virtualKeyboardEnabled,
  }), [
    keyboardVisible, speech.isListening, speech.start, speech.stop,
    lastPointerType, isMobile, setKeyboardVisible, injectText, virtualKeyboardEnabled,
  ]);

  return (
    <GlobalInputContext.Provider value={value}>
      {children}
    </GlobalInputContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGlobalInput(): GlobalInputContextValue {
  const ctx = useContext(GlobalInputContext);
  if (!ctx) throw new Error('useGlobalInput must be used inside GlobalInputProvider');
  return ctx;
}
