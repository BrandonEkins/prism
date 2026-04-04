'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { BrowserMultiFormatReader as BrowserMultiFormatReaderType } from '@zxing/browser';

export type CameraScannerState = 'idle' | 'starting' | 'scanning' | 'error';

interface UseCameraScannerOptions {
  onScan: (barcode: string) => void;
  onError?: (message: string) => void;
}

// Prefer native BarcodeDetector (Chrome 83+, Android) — faster and more reliable
async function tryNativeScan(
  stream: MediaStream,
  onScan: (barcode: string) => void,
  activeRef: React.MutableRefObject<boolean>,
): Promise<(() => void) | null> {
  if (!('BarcodeDetector' in window)) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detector = new (window as any).BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code', 'data_matrix'],
    });
    const track = stream.getVideoTracks()[0];
    let rafId: number;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();

    const scan = async () => {
      if (!activeRef.current) return;
      if (video.readyState >= 2) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        try {
          const results = await detector.detect(canvas);
          if (results.length > 0 && activeRef.current) {
            onScan(results[0].rawValue);
          }
        } catch {
          // detection frame error — continue
        }
      }
      rafId = requestAnimationFrame(() => setTimeout(scan, 200));
    };
    scan();

    return () => {
      cancelAnimationFrame(rafId);
      video.pause();
      video.srcObject = null;
      track?.stop();
    };
  } catch {
    return null;
  }
}

export function useCameraScanner({ onScan, onError }: UseCameraScannerOptions) {
  const [state, setState] = useState<CameraScannerState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReaderType | null>(null);
  const nativeCleanupRef = useRef<(() => void) | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const activeRef = useRef(false);

  const stop = useCallback(() => {
    activeRef.current = false;
    readerRef.current = null;
    nativeCleanupRef.current?.();
    nativeCleanupRef.current = null;
    const stream = streamRef.current ?? (videoRef.current?.srcObject as MediaStream | null);
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setState('idle');
    setErrorMessage(null);
  }, []);

  const start = useCallback(async (videoEl: HTMLVideoElement) => {
    videoRef.current = videoEl;
    setState('starting');
    activeRef.current = true;

    try {
      // Request higher-res stream with autofocus for better barcode detection
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          ...({ focusMode: { ideal: 'continuous' } } as object),
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (!activeRef.current) { stream.getTracks().forEach(t => t.stop()); return; }

      streamRef.current = stream;
      videoEl.srcObject = stream;
      videoEl.muted = true;
      videoEl.playsInline = true;
      await videoEl.play();
      if (!activeRef.current) return;

      setState('scanning');

      // Try native BarcodeDetector first (Chrome/Android — GPU-accelerated)
      const nativeCleanup = await tryNativeScan(stream, (barcode) => {
        if (activeRef.current) onScan(barcode);
      }, activeRef);

      if (nativeCleanup) {
        nativeCleanupRef.current = nativeCleanup;
        return;
      }

      // Fallback: ZXing BrowserMultiFormatReader
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      if (!activeRef.current) return;

      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      // Hand the already-playing video element to ZXing
      reader.decodeFromStream(stream, videoEl, (result, err) => {
        if (!activeRef.current) return;
        if (result) {
          const text = result.getText();
          if (text) onScan(text);
        }
        if (err && err.name !== 'NotFoundException') {
          console.error('[CameraScanner]', err);
        }
      });
    } catch (err) {
      if (!activeRef.current) return;
      const msg = err instanceof Error ? err.message : 'Camera access failed';
      setErrorMessage(msg);
      setState('error');
      onError?.(msg);
    }
  }, [onScan, onError]);

  // Cleanup on unmount
  useEffect(() => () => { stop(); }, [stop]);

  return { state, errorMessage, start, stop };
}
