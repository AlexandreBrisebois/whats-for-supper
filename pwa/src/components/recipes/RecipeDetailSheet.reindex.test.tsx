import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RecipeDetailSheet } from './RecipeDetailSheet';

vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => false }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/recipes',
  useRouter: () => ({ push: vi.fn() }),
}));

const mockGetRecipe = vi.fn();
const mockReindexRecipe = vi.fn();

vi.mock('@/lib/api/recipes', () => ({
  getRecipe: (...args: unknown[]) => mockGetRecipe(...args),
  getIngredientProjection: vi.fn(),
  getIngredientPreview: vi.fn(),
  getRecipeShareBundle: vi.fn(),
  downloadRecipeBundleFile: vi.fn(),
  updateRecipe: vi.fn(),
  deleteRecipe: vi.fn(),
  getRecipeImportStatus: vi.fn(),
  uploadRecipeOriginal: vi.fn(),
  regenerateHero: vi.fn(),
  saveRecipeImportIssue: vi.fn(),
  resolveRecipeImportIssue: vi.fn(),
  reindexRecipe: (...args: unknown[]) => mockReindexRecipe(...args),
}));

vi.mock('@/locales', () => ({
  t: (_key: string, value: string) => value,
  tWithVars: (_key: string, value: string, vars: Record<string, unknown>) =>
    value.replace(/{{(\w+)}}/g, (_, key) => String(vars[key])),
}));

const mockAddToast = vi.fn();
const mockRemoveToast = vi.fn();
const mockLoadGoTo = vi.fn().mockResolvedValue(undefined);
const mockSaveGoTo = vi.fn();
const mockFamilySettings = { family_goto: { items: [] } };

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
      familySettings: mockFamilySettings,
      loadGoTo: mockLoadGoTo,
      saveGoTo: mockSaveGoTo,
    }),
}));

vi.mock('@/lib/imageUtils', () => ({
  getImageUrl: (value: string | null | undefined) => value ?? '',
}));

describe('RecipeDetailSheet Reindex (R3)', () => {
  const recipeId = '550e8400-e29b-41d4-a716-446655440111';

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockGetRecipe.mockResolvedValue({
      id: recipeId,
      name: 'Lemon Garlic Pasta',
      description: 'Bright weeknight pasta.',
      imageUrl: `/api/recipes/${recipeId}/hero`,
      totalTime: 'PT25M',
      category: 'Supper',
      rating: 3,
      ingredients: ['200 g pasta', '1 lemon'],
      servings: 4,
      recipeInstructions: ['Boil pasta', 'Toss with lemon and garlic'],
      sourceType: 'url',
      canReimport: false,
      imageCount: 0,
      finishedDishIndex: 0,
      isReady: true,
    });
    mockReindexRecipe.mockResolvedValue({
      message: 'Recipe queued for search reindex.',
      queued: true,
    });
  });

  it('queues single-recipe reindex from ••• overflow menu with quiet status and zero checkmarks', async () => {
    const { container } = render(
      <RecipeDetailSheet
        recipeId={recipeId}
        plannerDayLabel={null}
        onClose={vi.fn()}
        onUseForDay={vi.fn()}
      />
    );

    await screen.findByRole('heading', { name: 'Lemon Garlic Pasta' });
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    const reindexBtn = screen.getByTestId('action-reindex-recipe');
    expect(reindexBtn).toHaveTextContent('Reindex');
    expect(reindexBtn).toHaveClass('min-h-[48px]');

    fireEvent.click(reindexBtn);
    await waitFor(() => expect(mockReindexRecipe).toHaveBeenCalledWith(recipeId));

    const status = await screen.findByTestId('recipe-reindex-status');
    expect(status).toHaveAttribute('role', 'status');
    expect(status).toHaveTextContent('Queued for search reindex.');
    expect(container.textContent).not.toContain('✓');
  });

  it('surfaces inline role="alert" when single-recipe reindex rejects', async () => {
    mockReindexRecipe.mockRejectedValueOnce(new Error('Reindex unavailable'));
    render(
      <RecipeDetailSheet
        recipeId={recipeId}
        plannerDayLabel={null}
        onClose={vi.fn()}
        onUseForDay={vi.fn()}
      />
    );

    await screen.findByRole('heading', { name: 'Lemon Garlic Pasta' });
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    fireEvent.click(screen.getByTestId('action-reindex-recipe'));

    const error = await screen.findByTestId('recipe-reindex-error');
    expect(error).toHaveAttribute('role', 'alert');
    expect(error).toHaveTextContent('Could not queue search reindex for this recipe. Try again.');
  });
});
