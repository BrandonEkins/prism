/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsView } from '../SettingsView';

// Mocks
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));

jest.mock('@/components/layout', () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/providers', () => ({
  useAuth: () => ({ activeUser: null, isAuthenticated: true }),
}));

jest.mock('../sections/AccountSection', () => ({
  AccountSection: () => (
    <div>
      <button id="account-btn-1">Account Action 1</button>
      <button id="account-btn-2">Account Action 2</button>
    </div>
  ),
}));

jest.mock('../sections/FamilySection', () => ({
  FamilySection: () => <div><button id="family-btn">Family Action</button></div>,
}));

jest.mock('../sections/DisplaySection', () => ({
  DisplaySection: () => <div><button id="display-btn">Appearance Action</button></div>,
}));

jest.mock('../sections/InputSection', () => ({
  InputSection: () => <div><button id="input-btn">Input Action</button></div>,
}));

jest.mock('../sections/BabysitterInfoSection', () => ({
  BabysitterInfoSection: () => <div><button id="babysitter-btn">Babysitter Action</button></div>,
}));

jest.mock('../sections/FeaturesSection', () => ({
  FeaturesSection: () => <div><button id="features-btn">Features Action</button></div>,
}));

jest.mock('../sections/SecuritySection', () => ({
  SecuritySection: () => <div><button id="security-btn">Security Action</button></div>,
}));

jest.mock('../sections/PhotosSettingsSection', () => ({
  PhotosSettingsSection: () => <div><button id="photos-btn">Photos Action</button></div>,
}));

jest.mock('../sections/GeneralSection', () => ({
  GeneralSection: () => <div><button id="general-btn">General Action</button></div>,
}));

jest.mock('../sections/integrations/IntegrationsSection', () => ({
  IntegrationsSection: () => <div><button id="integrations-btn">Integrations Action</button></div>,
}));

describe('SettingsView Remote D-Pad Navigation', () => {
  it('moves focus from sidebar tab to right menu option on ArrowRight', () => {
    render(<SettingsView />);

    const sidebarBtns = screen.getAllByRole('button');
    const accountTab = sidebarBtns.find(b => b.textContent?.includes('Account'));
    expect(accountTab).toBeDefined();

    accountTab?.focus();
    expect(document.activeElement).toBe(accountTab);

    // Press ArrowRight on sidebar button
    fireEvent.keyDown(accountTab!, { key: 'ArrowRight', code: 'ArrowRight' });

    const accountBtn1 = document.getElementById('account-btn-1');
    expect(document.activeElement).toBe(accountBtn1);
  });

  it('navigates down and up between interactive items inside the right section panel', () => {
    render(<SettingsView />);

    const sidebarBtns = screen.getAllByRole('button');
    const accountTab = sidebarBtns.find(b => b.textContent?.includes('Account'));
    accountTab?.focus();

    fireEvent.keyDown(accountTab!, { key: 'ArrowRight', code: 'ArrowRight' });
    const accountBtn1 = document.getElementById('account-btn-1');
    const accountBtn2 = document.getElementById('account-btn-2');
    expect(document.activeElement).toBe(accountBtn1);

    const panel = document.getElementById('settings-content-panel');
    // Press ArrowDown -> moves to button 2
    fireEvent.keyDown(panel!, { key: 'ArrowDown', code: 'ArrowDown' });
    expect(document.activeElement).toBe(accountBtn2);

    // Press ArrowUp -> moves back to button 1
    fireEvent.keyDown(panel!, { key: 'ArrowUp', code: 'ArrowUp' });
    expect(document.activeElement).toBe(accountBtn1);
  });

  it('moves focus back to active sidebar tab on ArrowLeft inside right content panel', () => {
    render(<SettingsView />);

    const sidebarBtns = screen.getAllByRole('button');
    const accountTab = sidebarBtns.find(b => b.textContent?.includes('Account'));
    accountTab?.focus();

    fireEvent.keyDown(accountTab!, { key: 'ArrowRight', code: 'ArrowRight' });
    const accountBtn1 = document.getElementById('account-btn-1');
    expect(document.activeElement).toBe(accountBtn1);

    const panel = document.getElementById('settings-content-panel');
    fireEvent.keyDown(panel!, { key: 'ArrowLeft', code: 'ArrowLeft' });

    expect(document.activeElement).toBe(accountTab);
  });

  it('moves focus back to active sidebar tab on ArrowUp from the top element inside right panel', () => {
    render(<SettingsView />);

    const sidebarBtns = screen.getAllByRole('button');
    const accountTab = sidebarBtns.find(b => b.textContent?.includes('Account'));
    accountTab?.focus();

    fireEvent.keyDown(accountTab!, { key: 'ArrowRight', code: 'ArrowRight' });
    const accountBtn1 = document.getElementById('account-btn-1');
    expect(document.activeElement).toBe(accountBtn1);

    const panel = document.getElementById('settings-content-panel');
    fireEvent.keyDown(panel!, { key: 'ArrowUp', code: 'ArrowUp' });

    expect(document.activeElement).toBe(accountTab);
  });
});
