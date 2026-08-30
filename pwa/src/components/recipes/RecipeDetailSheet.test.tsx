import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RecipeDetailSheet } from './RecipeDetailSheet';

const mockGetRecipe = vi.fn();
const mockGetRecipeShareBundle = vi.fn();
const mockDownloadRecipeBundleFile = vi.fn();
const mockUpdateRecipe = vi.fn();
const mockDeleteRecipe = vi.fn();
const mockReimportRecipe = vi.fn();
const mockGetRecipeImportStatus = vi.fn();
const mockUploadRecipeOriginal = vi.fn();
const mockRegenerateHero = vi.fn();
const mockSaveRecipeImportIssue = vi.fn();
const mockResolveRecipeImportIssue = vi.fn();
const mockAddToast = vi.fn();

vi.mock('@/lib/api/recipes', () => ({
  getRecipe: (...args: unknown[]) => mockGetRecipe(...args),
  getRecipeShareBundle: (...args: unknown[]) => mockGetRecipeShareBundle(...args),
  downloadRecipeBundleFile: (...args: unknown[]) => mockDownloadRecipeBundleFile(...args),
  updateRecipe: (...args: unknown[]) => mockUpdateRecipe(...args),
  deleteRecipe: (...args: unknown[]) => mockDeleteRecipe(...args),
  reimportRecipe: (...args: unknown[]) => mockReimportRecipe(...args),
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
  useUiStore: (selector: (state: { addToast: (...args: unknown[]) => void }) => unknown) =>
    selector({ addToast: mockAddToast }),
}));

vi.mock('@/store/familyStore', () => ({
  useFamilyStore: (selector: (state: any) => unknown) =>
    selector({
      familySettings: { family_goto: { items: [] } },
      loadGoTo: vi.fn().mockResolvedValue(undefined),
      saveGoTo: vi.fn().mockResolvedValue(undefined),
    }),
}));

vi.mock('@/lib/imageUtils', () => ({
  getImageUrl: (value: string | null | undefined) => value ?? '',
}));

describe('RecipeDetailSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    mockReimportRecipe.mockResolvedValue({
      importId: '550e8400-e29b-41d4-a716-446655440222',
    });
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
      ...(await mockGetRecipe()),
      importIssue: { reasons: ['ingredients'], note: null, status: 'reported' },
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
    expect(await screen.findByLabelText('Import issue status: Reported')).toBeVisible();
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

    await screen.findByLabelText('Import issue status: Ready to review');
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    fireEvent.click(screen.getByRole('button', { name: 'Review issue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mark as resolved' }));

    await waitFor(() =>
      expect(mockResolveRecipeImportIssue).toHaveBeenCalledWith(recipeWithIssue.id)
    );
    expect(screen.queryByRole('dialog', { name: 'Review issue' })).toBeNull();
    expect(screen.queryByLabelText(/Import issue status/)).toBeNull();
    expect(mockAddToast).toHaveBeenCalledWith({ type: 'success', message: 'Marked as resolved' });
  });

  it('polls a manual re-import to completion and refetches authoritative detail', async () => {
    const initialRecipe = await mockGetRecipe();
    const refreshedRecipe = {
      ...initialRecipe,
      importIssue: { reasons: ['ingredients'], note: null, status: 'readyToReview' },
    };
    mockGetRecipe.mockReset();
    mockGetRecipe.mockResolvedValue(refreshedRecipe).mockResolvedValueOnce(initialRecipe);
    mockGetRecipeImportStatus
      .mockResolvedValueOnce({ status: 'Processing', errorMessage: null })
      .mockResolvedValueOnce({ status: 'Completed', errorMessage: null });

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
    fireEvent.click(screen.getByTestId('action-reimport-recipe'));

    await waitFor(() => expect(mockGetRecipeImportStatus).toHaveBeenCalledTimes(2), {
      timeout: 4000,
    });
    await waitFor(() => expect(mockGetRecipe).toHaveBeenCalledTimes(2));
    expect(await screen.findByLabelText('Import issue status: Ready to review')).toBeVisible();
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
