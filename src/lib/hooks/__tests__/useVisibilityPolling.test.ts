/**
 * Tests for useVisibilityPolling hook.
 *
 * We test the hook's core logic by mocking useEffect to capture the
 * effect function, then running it with fake timers and a minimal
 * document mock (no jsdom required).
 */

// --- Minimal document mock for node environment ---
const visibilityListeners: (() => void)[] = [];
let mockHidden = false;

const mockDocument = {
  get hidden() { return mockHidden; },
  addEventListener: jest.fn((event: string, handler: () => void) => {
    if (event === 'visibilitychange') visibilityListeners.push(handler);
  }),
  removeEventListener: jest.fn((event: string, handler: () => void) => {
    if (event === 'visibilitychange') {
      const idx = visibilityListeners.indexOf(handler);
      if (idx >= 0) visibilityListeners.splice(idx, 1);
    }
  }),
};

// Assign to global before importing the module
Object.defineProperty(global, 'document', {
  value: mockDocument,
  writable: true,
  configurable: true,
});

function fireVisibilityChange() {
  for (const handler of [...visibilityListeners]) {
    handler();
  }
}

// --- Mock React.useEffect to capture the effect function ---
let capturedEffect: (() => (() => void) | void) | null = null;

jest.mock('react', () => ({
  useEffect: (effect: () => (() => void) | void) => {
    capturedEffect = effect;
  },
}));

import { useVisibilityPolling } from '../useVisibilityPolling';

// --- Tests ---

describe('useVisibilityPolling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    capturedEffect = null;
    mockHidden = false;
    visibilityListeners.length = 0;
    mockDocument.addEventListener.mockClear();
    mockDocument.removeEventListener.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sets up interval with specified ms', () => {
    const callback = jest.fn();
    useVisibilityPolling(callback, 5000);

    const cleanup = capturedEffect!() as () => void;

    jest.advanceTimersByTime(5000);
    expect(callback).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(5000);
    expect(callback).toHaveBeenCalledTimes(2);

    cleanup();
  });

  it('does not set up interval when intervalMs is 0', () => {
    const callback = jest.fn();
    useVisibilityPolling(callback, 0);

    const result = capturedEffect!();
    expect(result).toBeUndefined();

    jest.advanceTimersByTime(10000);
    expect(callback).not.toHaveBeenCalled();
  });

  it('does not set up interval for negative intervalMs', () => {
    const callback = jest.fn();
    useVisibilityPolling(callback, -100);

    const result = capturedEffect!();
    expect(result).toBeUndefined();

    jest.advanceTimersByTime(10000);
    expect(callback).not.toHaveBeenCalled();
  });

  it('pauses polling when page becomes hidden', () => {
    const callback = jest.fn();
    useVisibilityPolling(callback, 1000);
    const cleanup = capturedEffect!() as () => void;

    // Let 2 ticks fire
    jest.advanceTimersByTime(2000);
    expect(callback).toHaveBeenCalledTimes(2);

    // Hide page
    mockHidden = true;
    fireVisibilityChange();

    // Should NOT fire more callbacks
    jest.advanceTimersByTime(5000);
    expect(callback).toHaveBeenCalledTimes(2);

    cleanup();
  });

  it('resumes polling and fires immediately when page becomes visible', () => {
    const callback = jest.fn();
    useVisibilityPolling(callback, 1000);
    const cleanup = capturedEffect!() as () => void;

    // Hide page
    mockHidden = true;
    fireVisibilityChange();
    callback.mockClear();

    // Make visible again
    mockHidden = false;
    fireVisibilityChange();

    // Should fire immediately on becoming visible
    expect(callback).toHaveBeenCalledTimes(1);

    // And resume interval
    jest.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(2);

    cleanup();
  });

  it('cleans up interval and event listener on unmount', () => {
    const callback = jest.fn();
    useVisibilityPolling(callback, 1000);
    const cleanup = capturedEffect!() as () => void;

    expect(mockDocument.addEventListener).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function)
    );

    cleanup();

    callback.mockClear();
    jest.advanceTimersByTime(5000);
    expect(callback).not.toHaveBeenCalled();

    expect(mockDocument.removeEventListener).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function)
    );
  });

  it('registers visibilitychange listener on document', () => {
    const callback = jest.fn();
    useVisibilityPolling(callback, 3000);
    capturedEffect!();

    expect(mockDocument.addEventListener).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function)
    );
  });
});
