import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

const mockSetCurrentLocale = vi.fn();
let mockLocale = 'en';

vi.mock('./LocaleProvider', () => ({
  useLocale: () => ({
    locale: mockLocale,
    setCurrentLocale: mockSetCurrentLocale,
  }),
}));

import { LanguageSwitchProposal } from './LanguageSwitchProposal';

describe('LanguageSwitchProposal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockLocale = 'en';
    // Mock navigator.language
    vi.stubGlobal('navigator', { language: 'fr-FR' });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a proposal when browser language differs from current locale', async () => {
    render(<LanguageSwitchProposal />);

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(screen.getByTestId('language-proposal')).toBeInTheDocument();
    expect(screen.getByText(/Passer en Français/i)).toBeInTheDocument();
  });

  it('allows switching language', async () => {
    render(<LanguageSwitchProposal />);

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    fireEvent.click(screen.getByTestId('language-proposal-switch'));
    expect(mockSetCurrentLocale).toHaveBeenCalledWith('fr');
  });

  it('allows dismissing proposal', async () => {
    render(<LanguageSwitchProposal />);

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    fireEvent.click(screen.getByTestId('language-proposal-dismiss'));
    expect(screen.queryByTestId('language-proposal')).not.toBeInTheDocument();
  });
});
