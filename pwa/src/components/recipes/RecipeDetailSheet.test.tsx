const issueObservation = vi.hoisted(() => ({ observe: vi.fn() }));
vi.mock('@/lib/telemetry/issue-results', () => ({
  observeIssueResult: (...args: unknown[]) => issueObservation.observe(...args),
}));
const presentationAction = vi.hoisted(() => ({ submit: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/telemetry/actions', () => ({
  reportBrowserObservation: (input: unknown) => presentationAction.submit(input),
}));
import { observeOpening, presentationChanged } from '@/lib/telemetry/opening';
import type { BrowserObservation } from '@/lib/telemetry/navigation';
import { StrictMode } from 'react';
vi.mock('next/navigation', () => ({
  usePathname: () => '/recipes',
  useRouter: () => ({ push: vi.fn() }),
}));
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useRecipeNotesStore } from '@/store/recipeNotesStore';
import { RecipeDetailSheet } from './RecipeDetailSheet';

const mockGetRecipe = vi.fn();
const mockGetRecipeShareBundle = vi.fn();
const mockDownloadRecipeBundleFile = vi.fn();
const mockUpdateRecipe = vi.fn();
const mockDeleteRecipe = vi.fn();
const mockGetRecipeImportStatus = vi.fn();
const mockUploadRecipeOriginal = vi.fn();
const mockRegenerateHero = vi.fn();
const mockSaveRecipeImportIssue = vi.fn();
const mockResolveRecipeImportIssue = vi.fn();
const mockAddToast = vi.fn();
const mockRemoveToast = vi.fn();
const mockSaveGoTo = vi.fn();
let mockGotoItems: any[] = [];

vi.mock('@/lib/api/recipes', () => ({
  getRecipe: (...args: unknown[]) => mockGetRecipe(...args),
  getRecipeShareBundle: (...args: unknown[]) => mockGetRecipeShareBundle(...args),
  downloadRecipeBundleFile: (...args: unknown[]) => mockDownloadRecipeBundleFile(...args),
  updateRecipe: (...args: unknown[]) => mockUpdateRecipe(...args),
  deleteRecipe: (...args: unknown[]) => mockDeleteRecipe(...args),
  getRecipeImportStatus: (...args: unknown[]) => mockGetRecipeImportStatus(...args),
  uploadRecipeOriginal: (...args: unknown[]) => mockUploadRecipeOriginal(...args),
  regenerateHero: (...args: unknown[]) => mockRegenerateHero(...args),
  saveRecipeImportIssue: (...args: unknown[]) => mockSaveRecipeImportIssue(...args),
  resolveRecipeImportIssue: (...args: unknown[]) => mockResolveRecipeImportIssue(...args),
}));

vi.mock('@/locales', () => ({
  t: (_key: string, value: string) => value,
  tWithVars: (_key: string, value: string) => value,
}));

vi.mock('@/store/uiStore', () => ({
  useUiStore: (
    selector: (state: {
      addToast: (...args: unknown[]) => string;
      removeToast: (...args: unknown[]) => void;
    }) => unknown
  ) => selector({ addToast: mockAddToast, removeToast: mockRemoveToast }),
}));

vi.mock('@/store/familyStore', () => ({
  useFamilyStore: (selector: (state: any) => unknown) =>
    selector({
      familySettings: { family_goto: { items: mockGotoItems } },
      loadGoTo: vi.fn().mockResolvedValue(undefined),
      saveGoTo: mockSaveGoTo,
    }),
}));

vi.mock('@/lib/imageUtils', () => ({
  getImageUrl: (value: string | null | undefined) => value ?? '',
}));

describe('RecipeDetailSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGotoItems = [];
    mockSaveGoTo.mockImplementation(async (dto) => {
      mockGotoItems = dto.items;
    });
    mockAddToast.mockReturnValue('recipe-share-preparation');
    mockGetRecipe.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440111',
      name: 'Shareable Pasta',
      description: 'Tomato pasta for weeknights.',
      imageUrl: '/api/recipes/550e8400-e29b-41d4-a716-446655440111/hero',
      totalTime: 'PT30M',
      category: 'Dinner',
      rating: 2,
      notes: null,
      isDiscoverable: false,
      ingredients: ['Pasta', 'Sauce'],
      sourceType: 'url',
      canReimport: true,
      imageCount: 1,
      finishedDishIndex: 0,
      sourceUrl: 'https://example.com/shareable-pasta',
      isReady: true,
      cuisineType: 'Italian',
      mealTypes: ['Supper', 'Lunch'],
    });
    mockGetRecipeShareBundle.mockResolvedValue({
      version: '1.0',
      recipe: {
        name: 'Shareable Pasta',
        ingredients: ['Pasta', 'Sauce'],
        instructions: ['Boil pasta'],
        isSynthesized: false,
      },
      info: {
        exportedAtUtc: new Date('2026-05-14T16:00:00Z'),
        bundleSource: 'wfs-share',
        appVersion: '0.1.0',
      },
      hero: null,
      originals: [],
    });
    mockDownloadRecipeBundleFile.mockResolvedValue(undefined);
  });

  it('labels both star states and preserves pressed, pending and save feedback', async () => {
    render(
      <RecipeDetailSheet
        recipeId="550e8400-e29b-41d4-a716-446655440111"
        plannerDayLabel={null}
        onClose={vi.fn()}
        onUseForDay={vi.fn()}
        onFindSimilar={vi.fn()}
      />
    );
    const add = await screen.findByTestId('action-set-goto');
    expect(add).toHaveTextContent('GOTO');
    expect(add).toHaveAccessibleName('Set as GOTO');
    expect(add).toHaveAttribute('aria-pressed', 'false');
    let finish!: () => void;
    mockSaveGoTo.mockImplementationOnce(
      (dto) =>
        new Promise<void>((resolve) => {
          finish = () => {
            mockGotoItems = dto.items;
            resolve();
          };
        })
    );
    fireEvent.click(add);
    expect(add).toBeDisabled();
    await act(async () => finish());
    const selected = await screen.findByTestId('action-current-goto');
    expect(selected).toHaveTextContent('GOTO');
    expect(selected).toHaveAccessibleName('Remove from GOTO');
    expect(selected).toHaveAttribute('aria-pressed', 'true');
    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Added to GOTO list' })
    );
    mockSaveGoTo.mockRejectedValueOnce(new Error('offline'));
    fireEvent.click(selected);
    await waitFor(() => expect(selected).not.toBeDisabled());
    expect(selected).toHaveAttribute('aria-pressed', 'true');
    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Could not update GOTO' })
    );
  });

  it('recovers a failed first read through Retry while Close remains available', async () => {
    mockGetRecipe.mockRejectedValueOnce(new Error('offline'));
    render(
      <RecipeDetailSheet
        recipeId="550e8400-e29b-41d4-a716-446655440111"
        plannerDayLabel={null}
        onClose={vi.fn()}
        onUseForDay={vi.fn()}
        onFindSimilar={vi.fn()}
      />
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load this recipe.');
    expect(screen.getByTestId('action-close-sheet')).toBeEnabled();
    expect(screen.queryByText('Loading recipe...')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('recipe-detail-retry'));
    expect(await screen.findByTestId('recipe-detail-name')).toHaveTextContent('Shareable Pasta');
  });

  it('hides old content when a replacement identity fails', async () => {
    const props = {
      recipeId: '550e8400-e29b-41d4-a716-446655440111',
      plannerDayLabel: null,
      onClose: vi.fn(),
      onUseForDay: vi.fn(),
      onFindSimilar: vi.fn(),
    };
    const view = render(<RecipeDetailSheet {...props} />);
    await screen.findByTestId('recipe-detail-name');
    mockGetRecipe.mockRejectedValueOnce(new Error('offline'));
    view.rerender(<RecipeDetailSheet {...props} recipeId="550e8400-e29b-41d4-a716-446655440112" />);
    await screen.findByRole('alert');
    expect(screen.queryByTestId('recipe-detail-name')).not.toBeInTheDocument();
    expect(screen.queryByTestId('action-cook-this')).not.toBeInTheDocument();
  });

  it('ignores a late read response for a departed recipe identity', async () => {
    let finish!: (recipe: unknown) => void;
    const next = await mockGetRecipe();
    mockGetRecipe.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const props = {
      recipeId: '550e8400-e29b-41d4-a716-446655440110',
      plannerDayLabel: null,
      onClose: vi.fn(),
      onUseForDay: vi.fn(),
      onFindSimilar: vi.fn(),
    };
    const view = render(<RecipeDetailSheet {...props} />);
    view.rerender(<RecipeDetailSheet {...props} recipeId={next.id} />);
    await screen.findByTestId('recipe-detail-name');
    await act(async () => finish({ ...next, id: props.recipeId, name: 'Departed recipe' }));
    expect(screen.getByTestId('recipe-detail-name')).toHaveTextContent('Shareable Pasta');
  });

  it('keeps detail open and explains a failed move to bin', async () => {
    mockDeleteRecipe.mockRejectedValueOnce(new Error('offline'));
    const onClose = vi.fn();
    const onDeleted = vi.fn();
    render(
      <RecipeDetailSheet
        recipeId="550e8400-e29b-41d4-a716-446655440111"
        plannerDayLabel={null}
        onClose={onClose}
        onDeleted={onDeleted}
        onUseForDay={vi.fn()}
        onFindSimilar={vi.fn()}
      />
    );
    fireEvent.click(await screen.findByTestId('action-gear-menu'));
    fireEvent.click(await screen.findByTestId('action-move-to-bin'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not move this recipe to the Recycle Bin. Try again.'
    );
    expect(screen.getByTestId('recipe-detail-name')).toBeVisible();
    expect(onClose).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('clears failed move feedback when another recipe opens', async () => {
    mockDeleteRecipe.mockRejectedValueOnce(new Error('offline'));
    const props = {
      recipeId: '550e8400-e29b-41d4-a716-446655440111',
      plannerDayLabel: null,
      onClose: vi.fn(),
      onUseForDay: vi.fn(),
      onFindSimilar: vi.fn(),
    };
    const view = render(<RecipeDetailSheet {...props} />);
    fireEvent.click(await screen.findByTestId('action-gear-menu'));
    fireEvent.click(await screen.findByTestId('action-move-to-bin'));
    await screen.findByRole('alert');
    const next = {
      ...(await mockGetRecipe()),
      id: '550e8400-e29b-41d4-a716-446655440112',
      name: 'Next recipe',
    };
    mockGetRecipe.mockResolvedValueOnce(next);
    view.rerender(<RecipeDetailSheet {...props} recipeId={next.id} />);
    expect(await screen.findByTestId('recipe-detail-name')).toHaveTextContent('Next recipe');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders Share in the visible action slot while keeping View Original separate', async () => {
    render(
      <RecipeDetailSheet
        recipeId="550e8400-e29b-41d4-a716-446655440111"
        plannerDayLabel={null}
        onClose={vi.fn()}
        onUseForDay={vi.fn()}
        onFindSimilar={vi.fn()}
      />
    );

    expect(await screen.findByTestId('recipe-share-btn')).toBeVisible();
    expect(screen.getByTestId('action-view-original')).toBeVisible();
  });

  it('uses the authoritative save response to switch from report to review mode', async () => {
    mockSaveRecipeImportIssue.mockResolvedValue({
      recipe: {
        ...(await mockGetRecipe()),
        importIssue: { reasons: ['ingredients'], note: null, status: 'reported' },
      },
      reimportStarted: false,
      reimportLaunchFailed: false,
      importId: null,
    });
    render(
      <RecipeDetailSheet
        recipeId="550e8400-e29b-41d4-a716-446655440111"
        plannerDayLabel={null}
        onClose={vi.fn()}
        onUseForDay={vi.fn()}
        onFindSimilar={vi.fn()}
      />
    );

    await screen.findByTestId('recipe-detail-sheet');
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    fireEvent.click(screen.getByRole('button', { name: 'Report issue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ingredients' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(mockSaveRecipeImportIssue).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440111',
        { reasons: ['ingredients'], note: null }
      )
    );
    expect(await screen.findByLabelText('Recipe reported')).toBeVisible();
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    expect(screen.getByRole('button', { name: 'Review issue' })).toBeVisible();
  });

  it('applies the idempotent resolve response, closes the report sheet, and toasts success', async () => {
    const recipeWithIssue = {
      ...(await mockGetRecipe()),
      importIssue: { reasons: ['steps'], note: null, status: 'readyToReview' },
    };
    mockGetRecipe.mockResolvedValue(recipeWithIssue);
    mockResolveRecipeImportIssue.mockResolvedValue({ ...recipeWithIssue, importIssue: null });
    render(
      <RecipeDetailSheet
        recipeId="550e8400-e29b-41d4-a716-446655440111"
        plannerDayLabel={null}
        onClose={vi.fn()}
        onUseForDay={vi.fn()}
        onFindSimilar={vi.fn()}
      />
    );

    expect(await screen.findByLabelText('Recipe updated — ready to review')).toHaveClass(
      'shrink-0',
      'whitespace-nowrap'
    );
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    fireEvent.click(screen.getByRole('button', { name: 'Review issue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mark as resolved' }));

    await waitFor(() =>
      expect(mockResolveRecipeImportIssue).toHaveBeenCalledWith(recipeWithIssue.id)
    );
    expect(screen.queryByRole('dialog', { name: 'Review issue' })).toBeNull();
    expect(screen.queryByLabelText(/Recipe (reported|updated)/)).toBeNull();
    expect(mockAddToast).toHaveBeenCalledWith({ type: 'success', message: 'Marked as resolved' });
  });

  it('keeps the parent-safe re-import failure message visible on recipe detail', async () => {
    mockGetRecipe.mockResolvedValue({
      ...(await mockGetRecipe()),
      importIssue: {
        reasons: ['steps'],
        note: 'Check the final instructions.',
        status: 'reported',
        isReimporting: false,
        reimportFailureMessage:
          'We couldn’t re-import this recipe. Your report is saved. Add or change a detail, then Save to try again.',
      },
    });
    render(
      <RecipeDetailSheet
        recipeId="550e8400-e29b-41d4-a716-446655440111"
        plannerDayLabel={null}
        onClose={vi.fn()}
        onUseForDay={vi.fn()}
        onFindSimilar={vi.fn()}
      />
    );

    expect(
      await screen.findByText(
        'We couldn’t re-import this recipe. Your report is saved. Add or change a detail, then Save to try again.'
      )
    ).toHaveAttribute('role', 'status');
  });

  it('starts ID-addressable polling only from an accepted report Save response', async () => {
    const initialRecipe = await mockGetRecipe();
    const refreshedRecipe = {
      ...initialRecipe,
      importIssue: { reasons: ['ingredients'], note: null, status: 'readyToReview' },
    };
    mockGetRecipe.mockReset();
    mockGetRecipe.mockResolvedValue(refreshedRecipe).mockResolvedValueOnce(initialRecipe);
    mockSaveRecipeImportIssue.mockResolvedValue({
      recipe: {
        ...initialRecipe,
        importIssue: {
          reasons: ['ingredients'],
          note: 'Missing amounts',
          status: 'reported',
          isReimporting: true,
        },
      },
      reimportStarted: true,
      importId: '550e8400-e29b-41d4-a716-446655440222',
      reimportLaunchFailed: false,
    });
    mockGetRecipeImportStatus
      .mockResolvedValueOnce({ status: 'Processing', errorMessage: null })
      .mockResolvedValueOnce({ status: 'Completed', errorMessage: null });

    const view = render(
      <RecipeDetailSheet
        recipeId="550e8400-e29b-41d4-a716-446655440111"
        plannerDayLabel={null}
        onClose={vi.fn()}
        onUseForDay={vi.fn()}
        onFindSimilar={vi.fn()}
      />
    );

    await screen.findByTestId('recipe-detail-sheet');
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    fireEvent.click(screen.getByRole('button', { name: 'Report issue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ingredients' }));
    fireEvent.change(screen.getByLabelText('What should we check?'), {
      target: { value: 'Missing amounts' },
    });
    vi.useFakeTimers();
    try {
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      });

      expect(mockGetRecipeImportStatus).toHaveBeenCalledExactlyOnceWith(
        '550e8400-e29b-41d4-a716-446655440222'
      );
      expect(mockGetRecipe).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('dialog', { name: 'Report issue' })).toBeNull();
      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'success',
        message: 'Reimporting in background',
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(mockGetRecipeImportStatus).toHaveBeenNthCalledWith(
        2,
        '550e8400-e29b-41d4-a716-446655440222'
      );
      expect(mockGetRecipe).toHaveBeenCalledTimes(2);
      expect(mockGetRecipe).toHaveBeenLastCalledWith('550e8400-e29b-41d4-a716-446655440111');
      expect(screen.getByLabelText('Recipe updated — ready to review')).toBeVisible();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      expect(mockGetRecipeImportStatus).toHaveBeenCalledTimes(2);
      expect(mockGetRecipe).toHaveBeenCalledTimes(2);
    } finally {
      view.unmount();
      vi.useRealTimers();
    }
  });

  it('hides the share button if the recipe has no hero image', async () => {
    mockGetRecipe.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440111',
      name: 'Non-shareable Pasta',
      imageUrl: '', // hero missing
      isReady: true,
      sourceType: 'url',
      canReimport: true,
      imageCount: 0,
    });

    render(
      <RecipeDetailSheet
        recipeId="550e8400-e29b-41d4-a716-446655440111"
        plannerDayLabel={null}
        onClose={vi.fn()}
        onUseForDay={vi.fn()}
        onFindSimilar={vi.fn()}
      />
    );

    await screen.findByTestId('recipe-detail-sheet');
    expect(screen.queryByTestId('recipe-share-btn')).toBeNull();
  });

  it('hides the share button if the recipe is not ready', async () => {
    mockGetRecipe.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440111',
      name: 'Pending Pasta',
      imageUrl: '/api/recipes/550e8400-e29b-41d4-a716-446655440111/hero',
      isReady: false,
      sourceType: 'url',
      canReimport: true,
      imageCount: 1,
    });

    render(
      <RecipeDetailSheet
        recipeId="550e8400-e29b-41d4-a716-446655440111"
        plannerDayLabel={null}
        onClose={vi.fn()}
        onUseForDay={vi.fn()}
        onFindSimilar={vi.fn()}
      />
    );

    await screen.findByTestId('recipe-detail-sheet');
    expect(screen.queryByTestId('recipe-share-btn')).toBeNull();
  });

  it('hides the share button if the imageUrl is a placeholder', async () => {
    mockGetRecipe.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440111',
      name: 'Placeholder Pasta',
      imageUrl: 'https://example.com/placeholder-recipe.jpg',
      isReady: true,
      sourceType: 'url',
      canReimport: true,
      imageCount: 1,
    });

    render(
      <RecipeDetailSheet
        recipeId="550e8400-e29b-41d4-a716-446655440111"
        plannerDayLabel={null}
        onClose={vi.fn()}
        onUseForDay={vi.fn()}
        onFindSimilar={vi.fn()}
      />
    );

    await screen.findByTestId('recipe-detail-sheet');
    expect(screen.queryByTestId('recipe-share-btn')).toBeNull();
  });

  it('moves Edit under the gear menu instead of leaving it as a visible header action', async () => {
    render(
      <RecipeDetailSheet
        recipeId="550e8400-e29b-41d4-a716-446655440111"
        plannerDayLabel={null}
        onClose={vi.fn()}
        onUseForDay={vi.fn()}
        onFindSimilar={vi.fn()}
      />
    );

    await screen.findByTestId('recipe-detail-sheet');

    expect(screen.queryByTestId('action-edit-recipe')).toBeNull();

    fireEvent.click(screen.getByTestId('action-gear-menu'));

    expect(await screen.findByTestId('action-edit-recipe')).toBeVisible();
  });

  it('shows only edit actions while editing and restores viewing actions on cancel', async () => {
    render(
      <RecipeDetailSheet
        recipeId="550e8400-e29b-41d4-a716-446655440111"
        plannerDayLabel={null}
        onClose={vi.fn()}
        onUseForDay={vi.fn()}
        onFindSimilar={vi.fn()}
      />
    );

    expect(await screen.findByTestId('action-cook-this')).toBeVisible();
    expect(screen.getByTestId('action-find-similar')).toBeVisible();
    expect(screen.getByTestId('action-toggle-discovery')).toBeVisible();

    fireEvent.click(screen.getByTestId('action-gear-menu'));
    fireEvent.click(await screen.findByTestId('action-edit-recipe'));

    expect(screen.getByTestId('recipe-save-edits')).toBeVisible();
    expect(screen.getByTestId('recipe-cancel-edits')).toBeVisible();
    expect(screen.queryByTestId('action-cook-this')).toBeNull();
    expect(screen.queryByTestId('action-find-similar')).toBeNull();
    expect(screen.queryByTestId('action-toggle-discovery')).toBeNull();

    fireEvent.click(screen.getByTestId('recipe-cancel-edits'));

    expect(screen.getByTestId('action-cook-this')).toBeVisible();
    expect(screen.getByTestId('action-find-similar')).toBeVisible();
    expect(screen.getByTestId('action-toggle-discovery')).toBeVisible();
  });

  it('shows recipe-share-error when export fails', async () => {
    mockGetRecipeShareBundle.mockRejectedValue(new Error('share failed'));

    render(
      <RecipeDetailSheet
        recipeId="550e8400-e29b-41d4-a716-446655440111"
        plannerDayLabel={null}
        onClose={vi.fn()}
        onUseForDay={vi.fn()}
        onFindSimilar={vi.fn()}
      />
    );

    fireEvent.click(await screen.findByTestId('recipe-share-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('recipe-share-error')).toBeVisible();
    });
  });

  it('keeps a preparation toast visible through a slow share bundle and prevents duplicate shares', async () => {
    let resolveBundle: (value: Record<string, unknown>) => void;
    mockGetRecipeShareBundle.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveBundle = resolve;
        })
    );

    render(
      <RecipeDetailSheet
        recipeId="550e8400-e29b-41d4-a716-446655440111"
        plannerDayLabel={null}
        onClose={vi.fn()}
        onUseForDay={vi.fn()}
        onFindSimilar={vi.fn()}
      />
    );

    const shareButton = await screen.findByTestId('recipe-share-btn');
    fireEvent.click(shareButton);

    expect(mockAddToast).toHaveBeenCalledWith({
      type: 'loading',
      message: 'Preparing recipe…',
      persistent: true,
    });
    expect(shareButton).toBeDisabled();
    expect(mockGetRecipeShareBundle).toHaveBeenCalledTimes(1);

    fireEvent.click(shareButton);
    expect(mockGetRecipeShareBundle).toHaveBeenCalledTimes(1);
    expect(mockRemoveToast).not.toHaveBeenCalled();

    resolveBundle!({ version: '1.0' });

    await waitFor(() => expect(mockDownloadRecipeBundleFile).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockRemoveToast).toHaveBeenCalledWith('recipe-share-preparation'));
  });

  it('removes the preparation toast before preserving the existing share failure message', async () => {
    mockGetRecipeShareBundle.mockRejectedValue(new Error('share failed'));

    render(
      <RecipeDetailSheet
        recipeId="550e8400-e29b-41d4-a716-446655440111"
        plannerDayLabel={null}
        onClose={vi.fn()}
        onUseForDay={vi.fn()}
        onFindSimilar={vi.fn()}
      />
    );

    fireEvent.click(await screen.findByTestId('recipe-share-btn'));

    await waitFor(() => expect(mockRemoveToast).toHaveBeenCalledWith('recipe-share-preparation'));
    expect(await screen.findByTestId('recipe-share-error')).toBeVisible();
  });

  it('hides action-view-original for synthesized recipes with no source URL', async () => {
    mockGetRecipe.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440111',
      name: 'Synthesized Recipe',
      imageUrl: '/api/recipes/550e8400-e29b-41d4-a716-446655440111/hero',
      isReady: true,
      sourceType: 'synthesized',
      canReimport: false,
      imageCount: 0,
      sourceUrl: null,
    });

    render(
      <RecipeDetailSheet
        recipeId="550e8400-e29b-41d4-a716-446655440111"
        plannerDayLabel={null}
        onClose={vi.fn()}
        onUseForDay={vi.fn()}
        onFindSimilar={vi.fn()}
      />
    );

    await screen.findByTestId('recipe-detail-sheet');
    expect(screen.queryByTestId('action-view-original')).toBeNull();
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    expect(screen.getByTestId('action-report-import-issue')).toBeVisible();
    expect(screen.queryByTestId('action-reimport-recipe')).toBeNull();
  });

  it('shows action-view-original with ExternalLink icon for url-type recipes', async () => {
    render(
      <RecipeDetailSheet
        recipeId="550e8400-e29b-41d4-a716-446655440111"
        plannerDayLabel={null}
        onClose={vi.fn()}
        onUseForDay={vi.fn()}
        onFindSimilar={vi.fn()}
      />
    );

    const viewBtn = await screen.findByTestId('action-view-original');
    expect(viewBtn).toBeVisible();
    expect(viewBtn.textContent).toMatch(/View Original/i);
    expect(viewBtn.querySelector('[data-testid="view-original-icon"]')).not.toBeNull();
  });

  it('renders COOK entry points on hero and beside time pill', async () => {
    render(
      <RecipeDetailSheet
        recipeId="550e8400-e29b-41d4-a716-446655440111"
        plannerDayLabel={null}
        onClose={vi.fn()}
        onUseForDay={vi.fn()}
        onFindSimilar={vi.fn()}
      />
    );

    expect(await screen.findByTestId('time-cook-btn')).toBeVisible();
    expect(screen.getByTestId('time-cook-btn')).toHaveTextContent(/STEPS/i);
  });

  it('shows cuisine and meal-type badges cluster above description in view mode', async () => {
    render(
      <RecipeDetailSheet
        recipeId="550e8400-e29b-41d4-a716-446655440111"
        plannerDayLabel={null}
        onClose={vi.fn()}
        onUseForDay={vi.fn()}
        onFindSimilar={vi.fn()}
      />
    );

    expect(await screen.findByTestId('recipe-detail-cuisine-badge')).toBeVisible();
    expect(screen.getByTestId('recipe-detail-meal-type-supper')).toBeVisible();
    expect(screen.getByTestId('recipe-detail-meal-type-lunch')).toBeVisible();
  });

  it('shows cuisine input and meal-type pill board in edit mode above description', async () => {
    render(
      <RecipeDetailSheet
        recipeId="550e8400-e29b-41d4-a716-446655440111"
        plannerDayLabel={null}
        onClose={vi.fn()}
        onUseForDay={vi.fn()}
        onFindSimilar={vi.fn()}
      />
    );

    await screen.findByTestId('recipe-detail-sheet');
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    fireEvent.click(await screen.findByTestId('action-edit-recipe'));

    expect(await screen.findByTestId('recipe-edit-cuisine-input')).toBeVisible();
    expect(screen.getByTestId('recipe-edit-meal-type-pill-supper')).toBeVisible();
    expect(screen.getByTestId('recipe-edit-meal-type-pill-lunch')).toBeVisible();
  });

  it('disables save when no meal types are selected in edit mode', async () => {
    render(
      <RecipeDetailSheet
        recipeId="550e8400-e29b-41d4-a716-446655440111"
        plannerDayLabel={null}
        onClose={vi.fn()}
        onUseForDay={vi.fn()}
        onFindSimilar={vi.fn()}
      />
    );

    await screen.findByTestId('recipe-detail-sheet');
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    fireEvent.click(await screen.findByTestId('action-edit-recipe'));

    fireEvent.click(await screen.findByTestId('recipe-edit-meal-type-pill-supper'));
    fireEvent.click(await screen.findByTestId('recipe-edit-meal-type-pill-lunch'));

    expect(screen.getByTestId('recipe-save-edits')).toBeDisabled();
  });

  it('sends cuisineType and mealTypes in PATCH on save', async () => {
    mockUpdateRecipe.mockResolvedValue(undefined);

    render(
      <RecipeDetailSheet
        recipeId="550e8400-e29b-41d4-a716-446655440111"
        plannerDayLabel={null}
        onClose={vi.fn()}
        onUseForDay={vi.fn()}
        onFindSimilar={vi.fn()}
      />
    );

    await screen.findByTestId('recipe-detail-sheet');
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    fireEvent.click(await screen.findByTestId('action-edit-recipe'));

    fireEvent.change(await screen.findByTestId('recipe-edit-cuisine-input'), {
      target: { value: 'Greek' },
    });
    fireEvent.click(screen.getByTestId('recipe-edit-meal-type-pill-lunch'));
    fireEvent.click(screen.getByTestId('recipe-save-edits'));

    await waitFor(() => {
      expect(mockUpdateRecipe).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440111',
        expect.objectContaining({
          cuisineType: 'Greek',
          mealTypes: ['Supper'],
        })
      );
    });
  });
});

describe('recipe notes acknowledgement', () => {
  beforeEach(() => {
    useRecipeNotesStore.setState({ drafts: {} });
    mockUpdateRecipe.mockReset();
  });
  const props = {
    recipeId: '550e8400-e29b-41d4-a716-446655440111',
    plannerDayLabel: null,
    onClose: vi.fn(),
    onUseForDay: vi.fn(),
    onFindSimilar: vi.fn(),
  };

  it('does not show Saved until the notes request acknowledges', async () => {
    let finish!: () => void;
    mockUpdateRecipe.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    render(<RecipeDetailSheet {...props} />);
    fireEvent.change(await screen.findByTestId('recipe-notes-input'), {
      target: { value: 'pending notes' },
    });
    await waitFor(
      () =>
        expect(mockUpdateRecipe).toHaveBeenCalledWith(props.recipeId, { notes: 'pending notes' }),
      { timeout: 2000 }
    );
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    await act(async () => finish());
    expect(await screen.findByText('Saved')).toBeVisible();
  });

  it('saves restoration to the original notes after an acknowledged edit', async () => {
    mockUpdateRecipe.mockResolvedValue(undefined);
    render(<RecipeDetailSheet {...props} />);
    const input = await screen.findByTestId('recipe-notes-input');
    const original = (input as HTMLTextAreaElement).value;
    fireEvent.change(input, { target: { value: 'changed notes' } });
    await waitFor(
      () =>
        expect(mockUpdateRecipe).toHaveBeenCalledWith(props.recipeId, { notes: 'changed notes' }),
      { timeout: 2000 }
    );
    fireEvent.change(input, { target: { value: original } });
    await waitFor(
      () => expect(mockUpdateRecipe).toHaveBeenCalledWith(props.recipeId, { notes: original }),
      { timeout: 2000 }
    );
  });

  it('flushes an undispatched draft when detail unmounts', async () => {
    mockUpdateRecipe.mockResolvedValue(undefined);
    const view = render(<RecipeDetailSheet {...props} />);
    fireEvent.change(await screen.findByTestId('recipe-notes-input'), {
      target: { value: 'keep on close' },
    });
    view.unmount();
    await waitFor(() =>
      expect(mockUpdateRecipe).toHaveBeenCalledWith(props.recipeId, { notes: 'keep on close' })
    );
  });
});

describe('loaded detail presentation', () => {
  function stream() {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    const submit = vi.fn<(event: BrowserObservation) => Promise<void>>().mockResolvedValue();
    const observe = () => observeOpening(document, true, '/recipes', submit);
    observe();
    submit.mockClear();
    presentationAction.submit.mockImplementation(submit);
    document.addEventListener(presentationChanged, observe);
    return {
      submit,
      stop: () => document.removeEventListener(presentationChanged, observe),
      details: () =>
        submit.mock.calls.filter(([e]) => e.eventName === 'pwa.recipe_detail.presented'),
    };
  }
  const props = {
    recipeId: '550e8400-e29b-41d4-a716-446655440111',
    plannerDayLabel: null,
    onClose: vi.fn(),
    onUseForDay: vi.fn(),
    onFindSimilar: vi.fn(),
  };
  const recipe = {
    id: props.recipeId,
    name: 'Private loaded recipe',
    ingredients: [],
    imageCount: 1,
    finishedDishIndex: 0,
    sourceType: 'url',
    sourceUrl: 'https://private.invalid/recipe',
    canReimport: true,
    isReady: true,
  };
  it('separates a pending shell from committed detail, with no rerender/effect-replay duplicates', async () => {
    let finish!: (value: unknown) => void;
    mockGetRecipe.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    const f = stream();
    const view = render(
      <StrictMode>
        <RecipeDetailSheet {...props} />
      </StrictMode>
    );
    try {
      expect(f.submit.mock.calls.map(([e]) => [e.eventName, e.screen])).toEqual([
        ['pwa.surface.opened', 'recipe.detail'],
      ]);
      expect(f.details()).toHaveLength(0);
      await act(async () => finish(recipe));
      expect(screen.getByTestId('recipe-detail-name')).toHaveTextContent(recipe.name);
      expect(f.details()).toHaveLength(1);
      view.rerender(
        <StrictMode>
          <RecipeDetailSheet {...props} />
        </StrictMode>
      );
      // A field update remains within the same loaded entry.
      fireEvent.click(screen.getByTestId('action-gear-menu'));
      fireEvent.click(screen.getByTestId('action-edit-recipe'));
      expect(f.details()).toHaveLength(1);
      expect(f.details()[0][0].screen).toBe('search');
      expect(JSON.stringify(f.submit.mock.calls)).not.toContain(recipe.id);
    } finally {
      view.unmount();
      f.stop();
    }
  });
  it('drops failed and obsolete reads then counts the first successful current retry once', async () => {
    let finish!: (value: unknown) => void;
    mockGetRecipe.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    mockGetRecipe.mockRejectedValueOnce(new Error('offline'));
    mockGetRecipe.mockResolvedValue(recipe);
    const f = stream();
    const view = render(<RecipeDetailSheet {...props} recipeId="obsolete" />);
    try {
      view.rerender(<RecipeDetailSheet {...props} />);
      await screen.findByTestId('recipe-detail-retry');
      await act(async () => finish({ ...recipe, id: 'obsolete' }));
      expect(f.details()).toHaveLength(0);
      fireEvent.click(screen.getByTestId('recipe-detail-retry'));
      await screen.findByTestId('recipe-detail-name');
      expect(f.details()).toHaveLength(1);
      mockGetRecipe.mockResolvedValue({ ...recipe, id: 'replacement' });
      view.rerender(<RecipeDetailSheet {...props} recipeId="replacement" />);
      await screen.findByTestId('recipe-detail-name');
      expect(f.details()).toHaveLength(2);
    } finally {
      view.unmount();
      f.stop();
    }
  });
  it('observes external activation only as a request even when the popup is blocked', async () => {
    mockGetRecipe.mockResolvedValue(recipe);
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const f = stream();
    const view = render(<RecipeDetailSheet {...props} />);
    try {
      fireEvent.click(await screen.findByTestId('action-view-original'));
      expect(open).toHaveBeenCalledWith(recipe.sourceUrl, '_blank', 'noopener,noreferrer');
      expect(
        f.submit.mock.calls
          .filter(([e]) => e.eventName === 'pwa.original.requested')
          .map(([e]) => e)
      ).toEqual([expect.objectContaining({ screen: 'search', reason: 'external' })]);
      expect(
        f.submit.mock.calls.filter(([e]) => e.eventName === 'pwa.original.presented')
      ).toHaveLength(0);
      expect(JSON.stringify(f.submit.mock.calls)).not.toContain(recipe.sourceUrl);
    } finally {
      view.unmount();
      f.stop();
      open.mockRestore();
    }
  });
});

describe('current issue Save observation owner', () => {
  const id = '550e8400-e29b-41d4-a716-446655440111';
  const props = {
    recipeId: id,
    plannerDayLabel: null,
    onClose: vi.fn(),
    onUseForDay: vi.fn(),
    onFindSimilar: vi.fn(),
  };
  const recipe = {
    id,
    name: 'Private issue recipe',
    sourceType: 'url',
    canReimport: true,
    imageCount: 0,
    finishedDishIndex: -1,
    isReady: true,
  };
  const saved = {
    ...recipe,
    importIssue: {
      reasons: ['ingredients'],
      note: 'Private note',
      status: 'reported',
      isReimporting: false,
    },
  };
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    mockGetRecipe.mockResolvedValue(recipe);
    mockGetRecipeImportStatus.mockResolvedValue({ status: 'Completed', errorMessage: null });
  });
  async function open() {
    const view = render(<RecipeDetailSheet {...props} />);
    await screen.findByTestId('recipe-detail-name');
    await reopen();
    return view;
  }
  async function reopen() {
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    fireEvent.click(await screen.findByRole('button', { name: /^(Report|Review) issue$/ }));
    if (
      screen.getByTestId('import-issue-reason-ingredients').getAttribute('aria-pressed') !== 'true'
    )
      fireEvent.click(screen.getByTestId('import-issue-reason-ingredients'));
  }
  function pending() {
    let resolve!: (value: unknown) => void;
    mockSaveRecipeImportIssue.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      })
    );
    return (value: unknown) => act(async () => resolve(value));
  }
  it.each(['saved_manual', 'processing_acknowledged', 'saved_launch_failed', 'unconfirmed'])(
    'observes %s once while preserving business handling',
    async (reason) => {
      mockSaveRecipeImportIssue.mockResolvedValue({
        recipe: saved,
        reimportStarted: reason === 'processing_acknowledged',
        importId: reason === 'processing_acknowledged' ? 'import-private' : null,
        reimportLaunchFailed: reason === 'saved_launch_failed',
        issueResult: reason,
      });
      const view = await open();
      fireEvent.click(screen.getByTestId('import-issue-save'));
      await waitFor(() => expect(issueObservation.observe).toHaveBeenCalledTimes(1));
      expect(issueObservation.observe).toHaveBeenCalledWith(document, reason, expect.any(Function));
      view.rerender(<RecipeDetailSheet {...props} />);
      expect(issueObservation.observe).toHaveBeenCalledTimes(1);
      if (reason === 'saved_launch_failed') {
        expect(await screen.findByRole('alert')).toHaveTextContent('We saved your report');
        expect(screen.getByTestId('import-issue-reason-ingredients')).toHaveAttribute(
          'aria-pressed',
          'true'
        );
      }
      if (reason === 'processing_acknowledged')
        await waitFor(() => expect(mockGetRecipeImportStatus).toHaveBeenCalledTimes(1));
      expect(mockSaveRecipeImportIssue).toHaveBeenCalledTimes(1);
      view.unmount();
    }
  );
  it('reports rejection once, retains draft and allows a later explicit recovery', async () => {
    mockSaveRecipeImportIssue.mockRejectedValueOnce(new Error('private response lost'));
    mockSaveRecipeImportIssue.mockResolvedValue({
      recipe: saved,
      reimportStarted: false,
      reimportLaunchFailed: false,
      importId: null,
      issueResult: 'saved_manual',
    });
    const view = await open();
    fireEvent.change(screen.getByTestId('import-issue-note'), {
      target: { value: 'private retained draft' },
    });
    fireEvent.click(screen.getByTestId('import-issue-save'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save changes');
    expect(screen.getByTestId('import-issue-note')).toHaveValue('private retained draft');
    expect(issueObservation.observe).toHaveBeenCalledTimes(1);
    expect(issueObservation.observe.mock.calls[0][1]).toBe('unconfirmed');
    fireEvent.click(screen.getByTestId('import-issue-save'));
    await waitFor(() => expect(issueObservation.observe).toHaveBeenCalledTimes(2));
    expect(issueObservation.observe.mock.calls[1][1]).toBe('saved_manual');
    view.unmount();
  });
  it.each(['hidden', 'closed detail', 'dismissed issue', 'replacement', 'unmount', 'superseded'])(
    'suppresses %s settlement permanently',
    async (kind) => {
      const finish = pending();
      const view = await open();
      fireEvent.click(screen.getByTestId('import-issue-save'));
      if (kind === 'hidden') {
        vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
        document.dispatchEvent(new Event('visibilitychange'));
        // Returning before settlement must not revive a departed generation.
        vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
        document.dispatchEvent(new Event('visibilitychange'));
      }
      if (kind === 'closed detail') fireEvent.click(screen.getByTestId('action-close-sheet'));
      if (kind === 'dismissed issue' || kind === 'superseded')
        fireEvent.click(screen.getByRole('button', { name: 'Close report issue' }));
      if (kind === 'superseded') {
        await reopen();
        mockSaveRecipeImportIssue.mockResolvedValue({
          recipe: saved,
          issueResult: 'saved_manual',
          reimportStarted: false,
          importId: null,
          reimportLaunchFailed: false,
        });
        fireEvent.click(screen.getByTestId('import-issue-save'));
        await waitFor(() => expect(issueObservation.observe).toHaveBeenCalledTimes(1));
        issueObservation.observe.mockClear();
      }
      if (kind === 'replacement') {
        mockGetRecipe.mockResolvedValue({ ...recipe, id: 'replacement' });
        view.rerender(<RecipeDetailSheet {...props} recipeId="replacement" />);
        await screen.findByTestId('recipe-detail-name');
      }
      if (kind === 'unmount') view.unmount();
      await finish({
        recipe: saved,
        issueResult: 'saved_manual',
        reimportStarted: false,
        importId: null,
        reimportLaunchFailed: false,
      });
      expect(issueObservation.observe).not.toHaveBeenCalled();
      if (kind !== 'unmount') view.unmount();
    }
  );
  it('does not manufacture a result on cancellation or resolution', async () => {
    mockGetRecipe.mockResolvedValue(saved);
    mockResolveRecipeImportIssue.mockResolvedValue(recipe);
    const view = await open();
    fireEvent.click(screen.getByTestId('import-issue-resolve'));
    await waitFor(() => expect(mockResolveRecipeImportIssue).toHaveBeenCalledTimes(1));
    expect(issueObservation.observe).not.toHaveBeenCalled();
    view.unmount();
  });
});
