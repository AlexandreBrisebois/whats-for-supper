import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockRetryCaptureFailure = vi.fn();
const mockDismissNotification = vi.fn();
let mockNotifications: unknown[] = [];
let mockLocale: 'en' | 'fr' = 'en';

vi.mock('@/lib/api/captures', () => ({
  retryCaptureFailure: (...args: unknown[]) => mockRetryCaptureFailure(...args),
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

import { RecipeFailureBanner } from './RecipeFailureBanner';

describe('RecipeFailureBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocale = 'en';
    mockRetryCaptureFailure.mockResolvedValue({ queued: true });
    mockNotifications = [
      {
        recipeId: 'recipe-fail',
        workflowInstanceId: 'workflow-fail',
        name: 'Failed Recipe',
        type: 'failed',
        errorMessage: 'Timeout',
        failedStep: 'extract_recipe',
      },
    ];
  });

  it('renders an Era 3 Hearth recovery card without border-l-4, duplicate close icon, or em-dashes', () => {
    render(<RecipeFailureBanner />);

    const banner = screen.getByTestId('recipe-failure-banner-recipe-fail');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveClass('border-hearth-line', 'bg-terracotta-50');
    expect(banner).not.toHaveClass('border-l-4', 'border-l-hearth-fill');
    expect(banner.textContent).not.toContain('—');

    const retryBtn = screen.getByTestId('recipe-failure-retry-recipe-fail');
    const dismissBtn = screen.getByTestId('recipe-failure-dismiss-recipe-fail');
    expect(screen.queryByTestId('recipe-failure-dismiss-icon-recipe-fail')).toBeNull();

    expect(retryBtn).toHaveClass(
      'min-h-12',
      'min-w-12',
      'bg-hearth-fill',
      'text-cream-100',
      'focus-visible:outline-ink-body'
    );
    expect(retryBtn.className).not.toContain('transition-all');
    expect(dismissBtn).toHaveClass(
      'min-h-12',
      'min-w-12',
      'border-chrome-line',
      'focus-visible:outline-ink-body'
    );
    expect(screen.getByText('Tap to try again.')).toHaveClass('text-hearth-ink');
  });

  it('renders localized French copy without em-dashes when the active locale is fr', () => {
    mockLocale = 'fr';
    render(<RecipeFailureBanner />);

    const banner = screen.getByTestId('recipe-failure-banner-recipe-fail');
    expect(banner.textContent).not.toContain('—');
    expect(screen.getByText(/La recette n.a pas pu être enregistrée/)).toBeInTheDocument();
    expect(screen.getByText('Touchez pour réessayer.')).toHaveClass('text-hearth-ink');
    expect(screen.getByTestId('recipe-failure-retry-recipe-fail')).toHaveTextContent('Réessayer');
    expect(screen.getByTestId('recipe-failure-dismiss-recipe-fail')).toHaveTextContent('Ignorer');
    expect(screen.queryByTestId('recipe-failure-dismiss-icon-recipe-fail')).toBeNull();
  });

  it('retry calls failed capture API with workflow instance id and dismisses the toast', async () => {
    render(<RecipeFailureBanner />);

    fireEvent.click(screen.getByTestId('recipe-failure-retry-recipe-fail'));

    await waitFor(() => {
      expect(mockRetryCaptureFailure).toHaveBeenCalledWith('workflow-fail');
      expect(mockDismissNotification).toHaveBeenCalledWith('recipe-fail');
    });
  });

  it('dismiss hides the toast without retrying', () => {
    render(<RecipeFailureBanner />);

    fireEvent.click(screen.getByTestId('recipe-failure-dismiss-recipe-fail'));

    expect(mockDismissNotification).toHaveBeenCalledWith('recipe-fail');
    expect(mockRetryCaptureFailure).not.toHaveBeenCalled();
  });
});
