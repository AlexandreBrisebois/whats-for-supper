import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RecipeDetailSheet } from './RecipeDetailSheet';

const mockGetRecipe = vi.fn();
const mockGetRecipeShareBundle = vi.fn();
const mockDownloadRecipeBundleFile = vi.fn();
const mockUpdateRecipe = vi.fn();
const mockDeleteRecipe = vi.fn();
const mockReimportRecipe = vi.fn();
const mockUploadRecipeOriginal = vi.fn();
const mockRegenerateHero = vi.fn();

vi.mock('@/lib/api/recipes', () => ({
  getRecipe: (...args: unknown[]) => mockGetRecipe(...args),
  getRecipeShareBundle: (...args: unknown[]) => mockGetRecipeShareBundle(...args),
  downloadRecipeBundleFile: (...args: unknown[]) => mockDownloadRecipeBundleFile(...args),
  updateRecipe: (...args: unknown[]) => mockUpdateRecipe(...args),
  deleteRecipe: (...args: unknown[]) => mockDeleteRecipe(...args),
  reimportRecipe: (...args: unknown[]) => mockReimportRecipe(...args),
  uploadRecipeOriginal: (...args: unknown[]) => mockUploadRecipeOriginal(...args),
  regenerateHero: (...args: unknown[]) => mockRegenerateHero(...args),
}));

vi.mock('@/locales', () => ({
  t: (_key: string, value: string) => value,
  tWithVars: (_key: string, value: string) => value,
}));

vi.mock('@/store/uiStore', () => ({
  useUiStore: (selector: (state: { addToast: (...args: unknown[]) => void }) => unknown) =>
    selector({ addToast: vi.fn() }),
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
});
