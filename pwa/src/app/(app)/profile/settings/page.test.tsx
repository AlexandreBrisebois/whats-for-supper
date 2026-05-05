/**
 * Unit tests — Settings page language toggle
 *
 * Validates: Task 40 — no visual regression on language toggle active state
 *
 * The active language button must carry `bg-indigo text-lavender` classes.
 * The inactive button must NOT carry those classes.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// next/navigation — page calls useRouter()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// @/locales — avoids localStorage access in jsdom
vi.mock('@/locales', () => ({
  t: (_key: string, defaultValue: string) => defaultValue,
}));

// @/components/profile/FamilyManagement — avoid deep dependency tree
vi.mock('@/components/profile/FamilyManagement', () => ({
  FamilyManagement: () => <div data-testid="family-management-stub" />,
}));

// @/components/profile/FamilyGOTOSettings — avoid deep dependency tree
vi.mock('@/components/profile/FamilyGOTOSettings', () => ({
  FamilyGOTOSettings: () => <div data-testid="family-goto-stub" />,
}));

// @/components/common/LocaleProvider — control locale state
const localeState = { locale: 'en' };
const mockSetCurrentLocale = vi.fn((l: string) => {
  localeState.locale = l;
});

vi.mock('@/components/common/LocaleProvider', () => ({
  useLocale: () => ({ locale: localeState.locale, setCurrentLocale: mockSetCurrentLocale }),
}));

// ---------------------------------------------------------------------------
// Import component under test AFTER mocks
// ---------------------------------------------------------------------------
import SettingsPage from './page';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SettingsPage — language toggle active state', () => {
  it('English button has bg-indigo and text-lavender when locale is en', () => {
    localeState.locale = 'en';
    render(<SettingsPage />);

    const englishBtn = screen.getByText('English');
    const frenchBtn = screen.getByText('French');

    // Active state: bg-indigo as a standalone class (not bg-indigo/5 or hover:bg-indigo/5)
    expect(englishBtn.className.split(' ')).toContain('bg-indigo');
    expect(englishBtn.className).toContain('text-lavender');

    // Inactive: bg-indigo is NOT a standalone class
    expect(frenchBtn.className.split(' ')).not.toContain('bg-indigo');
    expect(frenchBtn.className).not.toContain('text-lavender');
  });

  it('French button has bg-indigo and text-lavender when locale is fr', () => {
    localeState.locale = 'fr';
    render(<SettingsPage />);

    const frenchBtn = screen.getByText('French');
    const englishBtn = screen.getByText('English');

    expect(frenchBtn.className.split(' ')).toContain('bg-indigo');
    expect(frenchBtn.className).toContain('text-lavender');

    expect(englishBtn.className.split(' ')).not.toContain('bg-indigo');
    expect(englishBtn.className).not.toContain('text-lavender');
  });

  it('active button also carries shadow-card class', () => {
    localeState.locale = 'en';
    render(<SettingsPage />);

    const englishBtn = screen.getByText('English');
    expect(englishBtn.className).toContain('shadow-card');
  });

  it('inactive button carries bg-white/60 and text-charcoal classes', () => {
    localeState.locale = 'en';
    render(<SettingsPage />);

    const frenchBtn = screen.getByText('French');
    expect(frenchBtn.className).toContain('bg-white/60');
    expect(frenchBtn.className).toContain('text-charcoal');
  });

  it('calls setCurrentLocale with "fr" when French button is clicked', () => {
    localeState.locale = 'en';
    mockSetCurrentLocale.mockClear();
    render(<SettingsPage />);

    fireEvent.click(screen.getByText('French'));
    expect(mockSetCurrentLocale).toHaveBeenCalledWith('fr');
  });

  it('calls setCurrentLocale with "en" when English button is clicked', () => {
    localeState.locale = 'fr';
    mockSetCurrentLocale.mockClear();
    render(<SettingsPage />);

    fireEvent.click(screen.getByText('English'));
    expect(mockSetCurrentLocale).toHaveBeenCalledWith('en');
  });
});
