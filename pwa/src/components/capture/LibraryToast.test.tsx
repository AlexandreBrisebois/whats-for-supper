import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockPush = vi.fn();
const mockDismissNotification = vi.fn();
let mockNotifications: unknown[] = [];
let mockLocale: 'en' | 'fr' = 'en';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/components/common/LocaleProvider', () => ({
  useLocale: () => ({ locale: mockLocale, setCurrentLocale: vi.fn() }),
}));

vi.mock('@/store/libraryStore', () => ({
  useLibraryStore: (selector: (state: unknown) => unknown) =>
    selector({
      notifications: mockNotifications,
      dismissNotification: mockDismissNotification,
    }),
}));

import { LibraryToast } from './LibraryToast';

describe('LibraryToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocale = 'en';
    mockNotifications = [
      {
        recipeId: 'recipe-ready-1',
        name: 'Roast Chicken',
        type: 'ready',
      },
      {
        recipeId: 'recipe-ready-2',
        name: 'Tomato Soup',
        type: 'ready',
      },
    ];
  });

  it('renders cooled herb garden semantic tokens, glass-toast surface, and 48px dismiss target', () => {
    render(<LibraryToast />);

    const card = screen.getByTestId('library-toast-card');
    expect(card).toHaveClass('glass-toast', 'border-garden-line', 'border-l-garden-fill');
    expect(screen.getByText('Tap to view recipe')).toHaveClass('text-ink-muted');
    expect(screen.getByText('+1 more')).toHaveClass(
      'bg-sage-50',
      'text-garden-ink',
      'border-garden-line'
    );

    const viewBtn = screen.getByRole('button', { name: 'View Tomato Soup' });
    expect(viewBtn).toHaveClass('focus-visible:outline-ink-body');

    const dismissBtn = screen.getByRole('button', { name: 'Dismiss notification' });
    expect(dismissBtn).toHaveClass(
      'h-12',
      'w-12',
      'text-ink-muted',
      'focus-visible:outline-ink-body'
    );
  });

  it('renders localized French copy when active locale is fr', () => {
    mockLocale = 'fr';
    render(<LibraryToast />);

    expect(screen.getByText(/est prête !/)).toBeInTheDocument();
    expect(screen.getByText('Touchez pour voir la recette')).toBeInTheDocument();
    expect(screen.getByText('+1 de plus')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Voir Tomato Soup' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ignorer la notification' })).toBeInTheDocument();
  });

  it('opens the recipe on click and dismisses without navigation on dismiss click', () => {
    render(<LibraryToast />);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(mockDismissNotification).toHaveBeenCalledWith('recipe-ready-2');
    expect(mockPush).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'View Tomato Soup' }));
    expect(mockDismissNotification).toHaveBeenCalledWith('recipe-ready-2');
    expect(mockPush).toHaveBeenCalledWith('/recipes?open=recipe-ready-2');
  });
});
