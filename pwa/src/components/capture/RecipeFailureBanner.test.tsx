import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockRetryCaptureFailure = vi.fn();
const mockDismissNotification = vi.fn();
let mockNotifications: unknown[] = [];

vi.mock('@/lib/api/captures', () => ({
  retryCaptureFailure: (...args: unknown[]) => mockRetryCaptureFailure(...args),
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

  it('renders a top toast with retry and dismiss controls', () => {
    render(<RecipeFailureBanner />);

    expect(screen.getByTestId('recipe-failure-banner-recipe-fail')).toBeInTheDocument();
    expect(screen.getByTestId('recipe-failure-retry-recipe-fail')).toBeInTheDocument();
    expect(screen.getByTestId('recipe-failure-dismiss-recipe-fail')).toBeInTheDocument();
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
