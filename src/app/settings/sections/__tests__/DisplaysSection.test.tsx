/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DisplaysSection } from '../DisplaysSection';

const mockLayouts = [
  { id: 'layout-1', name: 'Main Display', slug: 'main', fontScale: 100, isDefault: true, orientation: 'landscape', widgets: [] },
];

// Mock useLayouts hook with stable reference
jest.mock('@/lib/hooks/useLayouts', () => ({
  useLayouts: () => ({
    layouts: mockLayouts,
    loading: false,
  }),
}));

describe('DisplaysSection Remote Navigation', () => {
  it('does not change font scale on ArrowUp and ArrowDown', () => {
    render(<DisplaysSection />);

    const slider = screen.getByRole('slider');
    expect(slider.getAttribute('aria-valuenow')).toBe('100');

    // Press ArrowUp and ArrowDown -> font scale remains 100
    fireEvent.keyDown(slider, { key: 'ArrowUp', code: 'ArrowUp' });
    expect(slider.getAttribute('aria-valuenow')).toBe('100');

    fireEvent.keyDown(slider, { key: 'ArrowDown', code: 'ArrowDown' });
    expect(slider.getAttribute('aria-valuenow')).toBe('100');
  });

  it('adjusts font scale on ArrowLeft and ArrowRight', () => {
    render(<DisplaysSection />);

    const slider = screen.getByRole('slider');
    expect(slider.getAttribute('aria-valuenow')).toBe('100');

    // Press ArrowRight -> increases scale to 105
    fireEvent.keyDown(slider, { key: 'ArrowRight', code: 'ArrowRight' });
    expect(slider.getAttribute('aria-valuenow')).toBe('105');

    // Press ArrowLeft -> decreases scale back to 100
    fireEvent.keyDown(slider, { key: 'ArrowLeft', code: 'ArrowLeft' });
    expect(slider.getAttribute('aria-valuenow')).toBe('100');
  });
});
