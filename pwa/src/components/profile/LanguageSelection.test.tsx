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
let selectedId: string | null = 'member-123';

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
      selectedFamilyMemberId: selectedId,
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
    selectedId = 'member-123';
  });

  for (const locale of ['en', 'fr']) {
    it(`names the group and exposes one checked, pressed choice for ${locale}`, () => {
      currentLocale = locale;
      render(<LanguageSelection />);
      expect(screen.getByRole('group', { name: 'Language' })).toBeInTheDocument();
      const selected = screen.getByTestId(`locale-btn-${locale}`);
      const other = screen.getByTestId(`locale-btn-${locale === 'en' ? 'fr' : 'en'}`);
      expect(selected).toHaveAttribute('aria-pressed', 'true');
      expect(other).toHaveAttribute('aria-pressed', 'false');
      expect(selected.querySelector('[data-language-check]')).not.toBeNull();
      expect(other.querySelector('[data-language-check]')).toBeNull();
      expect(other).toBeEnabled();
    });
  }

  it('without a selected member changes only the browser-local choice', () => {
    selectedId = null;
    currentLocale = 'fr';
    render(<LanguageSelection />);
    fireEvent.click(screen.getByTestId('locale-btn-en'));
    expect(mockSetCurrentLocale).toHaveBeenCalledExactlyOnceWith('en');
    expect(mockUpdateMemberPreferences).not.toHaveBeenCalled();
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
