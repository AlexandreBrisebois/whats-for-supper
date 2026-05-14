import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageSelection } from './LanguageSelection';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// @/locales — avoids localStorage access in jsdom
vi.mock('@/locales', () => ({
  t: (_key: string, defaultValue: string) => defaultValue,
}));

// @/components/common/LocaleProvider — control locale state
const mockSetCurrentLocale = vi.fn();
let currentLocale = 'en';

vi.mock('@/components/common/LocaleProvider', () => ({
  useLocale: () => ({
    locale: currentLocale,
    setCurrentLocale: (l: string) => {
      currentLocale = l;
      mockSetCurrentLocale(l);
    },
  }),
}));

// @/store/familyStore
const mockUpdateMemberPreferences = vi.fn();
vi.mock('@/store/familyStore', () => ({
  useFamilyStore: (selector?: (state: any) => any) => {
    const state = {
      selectedFamilyMemberId: 'member-123',
      updateMemberPreferences: mockUpdateMemberPreferences,
      loadGoTo: vi.fn().mockResolvedValue({ items: [] }),
      saveGoTo: vi.fn().mockResolvedValue(undefined),
    };
    return selector ? selector(state) : state;
  },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LanguageSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentLocale = 'en';
  });

  it('English button has bg-indigo and text-lavender when locale is en', () => {
    currentLocale = 'en';
    render(<LanguageSelection />);

    const englishBtn = screen.getByText('English');
    const frenchBtn = screen.getByText('French');

    expect(englishBtn.className.split(' ')).toContain('bg-indigo');
    expect(englishBtn.className).toContain('text-lavender');

    expect(frenchBtn.className.split(' ')).not.toContain('bg-indigo');
    expect(frenchBtn.className).not.toContain('text-lavender');
  });

  it('French button has bg-indigo and text-lavender when locale is fr', () => {
    currentLocale = 'fr';
    render(<LanguageSelection />);

    const frenchBtn = screen.getByText('French');
    const englishBtn = screen.getByText('English');

    expect(frenchBtn.className.split(' ')).toContain('bg-indigo');
    expect(frenchBtn.className).toContain('text-lavender');

    expect(englishBtn.className.split(' ')).not.toContain('bg-indigo');
    expect(englishBtn.className).not.toContain('text-lavender');
  });

  it('calls setCurrentLocale and updateMemberPreferences when French button is clicked', () => {
    currentLocale = 'en';
    render(<LanguageSelection />);

    fireEvent.click(screen.getByText('French'));

    expect(mockSetCurrentLocale).toHaveBeenCalledWith('fr');
    expect(mockUpdateMemberPreferences).toHaveBeenCalledWith('member-123', {
      preferredLanguage: 'fr',
    });
  });

  it('calls setCurrentLocale and updateMemberPreferences when English button is clicked', () => {
    currentLocale = 'fr';
    render(<LanguageSelection />);

    fireEvent.click(screen.getByText('English'));

    expect(mockSetCurrentLocale).toHaveBeenCalledWith('en');
    expect(mockUpdateMemberPreferences).toHaveBeenCalledWith('member-123', {
      preferredLanguage: 'en',
    });
  });
});
