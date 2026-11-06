import { useWeekStore } from '@/store/weekStore';
import type { Recipe } from '@/lib/api/recipes';
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => false }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/recipes',
  useRouter: () => ({ push: vi.fn() }),
}));
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useRecipeNotesStore } from '@/store/recipeNotesStore';
import { RecipeDetailSheet } from './RecipeDetailSheet';

const mockGetRecipe = vi.fn();
const mockGetIngredientProjection = vi.fn();
const mockGetIngredientPreview = vi.fn();
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
  getIngredientProjection: (...args: unknown[]) => mockGetIngredientProjection(...args),
  getIngredientPreview: (...args: unknown[]) => mockGetIngredientPreview(...args),
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
  tWithVars: (_key: string, value: string, vars: Record<string, unknown>) =>
    value.replace(/{{(\w+)}}/g, (_, key) => String(vars[key])),
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

// Group 5 behavior regressions; actual layout/material measurements belong to browser review.
const id = '550e8400-e29b-41d4-a716-446655440111';
const recipe: Recipe = {
  id,
  name: 'Family pasta',
  description: 'Family supper',
  imageUrl: '',
  totalTime: 'PT20M',
  category: 'Dinner',
  canReimport: true,
  finishedDishIndex: 0,
  isReady: true,
  ingredients: ['200 g pasta'],
  servings: 2,
  recipeInstructions: ['Boil pasta.'],
  notes: 'Less chilli',
  rating: 2,
  sourceType: 'url',
  sourceUrl: 'https://example.com/pasta',
  imageCount: 0,
};
const props = {
  recipeId: id,
  plannerDayLabel: 'Wednesday, October 14',
  planningEnabled: true,
  onClose: vi.fn(),
  onUseForDay: vi.fn().mockResolvedValue(undefined),
  onFindSimilar: vi.fn(),
  onChangeDay: vi.fn(),
};
const projection = {
  recipeId: id,
  supperDate: '2026-10-14',
  context: 'proposed' as const,
  targetServings: 4,
  baseServings: 2,
  factor: 2,
  version: 'four',
  status: 'scaled' as const,
  editable: true,
  lines: [
    {
      originalText: '200 g pasta',
      name: 'pasta',
      quantity: 400,
      unitText: 'g',
      status: 'scaled' as const,
      issues: [],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  useWeekStore.setState({ schedule: [], groceryRefresh: undefined });
  useRecipeNotesStore.setState({ drafts: {} });
  mockGetRecipe.mockResolvedValue(recipe);
  mockGetIngredientProjection.mockResolvedValue(projection);
  mockUpdateRecipe.mockResolvedValue(undefined);
  mockAddToast.mockReturnValue('notes');
});

describe('quiet recipe composition refinement', () => {
  it('puts the change arrows on Change day while preserving distinct dated Plan and Cook actions', async () => {
    render(<RecipeDetailSheet {...props} />);
    const plan = await screen.findByTestId('action-add-to-day');
    const change = screen.getByTestId('action-change-day');
    expect(plan).toHaveAccessibleName('Plan for Wednesday, October 14');
    expect(screen.getByTestId('action-cooks-mode')).toHaveAccessibleName('Cook');
    expect(plan.querySelector('.lucide-arrow-right-left')).toBeNull();
    expect(change.querySelector('.lucide-arrow-right-left')).not.toBeNull();
    fireEvent.click(change);
    expect(props.onChangeDay).toHaveBeenCalledOnce();
    expect(props.onUseForDay).not.toHaveBeenCalled();
  });

  it('shows original yield plainly without a duplicate Serving details ingredient list', async () => {
    render(
      <RecipeDetailSheet
        {...props}
        ingredientContext={{ context: 'proposed', supperDate: '2026-10-14' }}
      />
    );
    expect(await screen.findByTestId('recipe-ingredient-projection')).toHaveTextContent(
      '400 g pasta'
    );
    expect(screen.queryByText('Serving details')).not.toBeInTheDocument();
    expect(screen.getByText('Original recipe: 2 servings')).toBeVisible();
    expect(screen.queryByText('200 g pasta')).not.toBeInTheDocument();
    expect(screen.getByTestId('action-view-original')).toBeVisible();
    expect(mockUpdateRecipe).not.toHaveBeenCalled();
    expect(props.onUseForDay).not.toHaveBeenCalled();
  });

  it('replaces planned quantities with original evidence and returns to the same dated list without writes', async () => {
    render(
      <RecipeDetailSheet
        {...props}
        ingredientContext={{ context: 'proposed', supperDate: '2026-10-14' }}
      />
    );
    expect(await screen.findByTestId('recipe-ingredient-projection')).toHaveTextContent(
      '400 g pasta'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Original quantities' }));
    expect(screen.getByText('200 g pasta')).toBeVisible();
    expect(screen.queryByText('400 g pasta')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Planned quantities' }));
    expect(screen.getByTestId('recipe-ingredient-projection')).toHaveTextContent('400 g pasta');
    expect(screen.queryByText('200 g pasta')).not.toBeInTheDocument();
    expect(screen.getByTestId('recipe-portion-context')).toHaveTextContent('Wednesday, October 14');
    expect(mockUpdateRecipe).not.toHaveBeenCalled();
    expect(props.onUseForDay).not.toHaveBeenCalled();
  });

  it('has one visible Notes label tied to the directly writable field', async () => {
    render(<RecipeDetailSheet {...props} />);
    const notes = await screen.findByRole('textbox', { name: 'Notes' });
    expect(notes).toHaveValue('Less chilli');
    const region = screen.getByTestId('recipe-family-notes');
    expect(within(region).getAllByText('Notes')).toHaveLength(1);
    expect(within(region).queryByRole('heading', { name: 'Family notes' })).not.toBeInTheDocument();
  });

  it('retains a failed notes draft and retries through the existing notes owner', async () => {
    useRecipeNotesStore.setState({
      drafts: {
        [id]: {
          text: 'Keep this draft',
          acknowledged: null,
          status: 'error',
        },
      },
    });
    render(<RecipeDetailSheet {...props} />);
    const notes = await screen.findByRole('textbox', { name: 'Notes' });
    expect(notes).toHaveValue('Keep this draft');
    expect(notes).toHaveAccessibleDescription(
      'Notes could not be saved. Your draft is retained. Retry save'
    );
    fireEvent.click(screen.getByTestId('recipe-notes-retry'));
    await waitFor(() =>
      expect(mockUpdateRecipe).toHaveBeenCalledWith(id, { notes: 'Keep this draft' })
    );
    await waitFor(() => expect(screen.getByTestId('recipe-notes-saved')).toBeVisible());
    expect(notes).toHaveValue('Keep this draft');
  });
  it('reads captured original evidence after the current recipe basis and ingredient correction', async () => {
    mockGetRecipe.mockResolvedValue({
      ...recipe,
      servings: 6,
      ingredients: ['900 g corrected pasta'],
    });
    mockGetIngredientProjection.mockResolvedValue({
      ...projection,
      context: 'assigned',
      occurrenceId: 'captured-original',
      editable: false,
    });
    render(
      <RecipeDetailSheet
        {...props}
        ingredientContext={{
          context: 'assigned',
          occurrenceId: 'captured-original',
          supperDate: '2026-10-14',
        }}
      />
    );
    expect(await screen.findByTestId('recipe-ingredient-projection')).toHaveTextContent(
      '400 g pasta'
    );
    expect(screen.getByText('Original recipe: 2 servings')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Original quantities' }));
    expect(screen.getByText('200 g pasta')).toBeVisible();
    expect(screen.queryByText('900 g corrected pasta')).not.toBeInTheDocument();
    expect(screen.queryByText('Original recipe: 6 servings')).not.toBeInTheDocument();
    expect(screen.queryByText('400 g pasta')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Planned quantities' }));
    expect(screen.getByTestId('recipe-ingredient-projection')).toHaveTextContent('400 g pasta');
    expect(mockUpdateRecipe).not.toHaveBeenCalled();
    expect(props.onUseForDay).not.toHaveBeenCalled();
  });
  it('marks the selected appreciation with a visible shape as well as pressed semantics', async () => {
    render(<RecipeDetailSheet {...props} />);
    const selected = await screen.findByRole('button', { name: 'Like' });
    expect(selected).toHaveAttribute('aria-pressed', 'true');
    expect(within(selected).getByTestId('recipe-rating-selected')).toBeVisible();
    expect(screen.getAllByTestId('recipe-rating-selected')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Love' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('does not substitute current corrected originals while the dated projection is pending or fails', async () => {
    mockGetRecipe.mockResolvedValue({
      ...recipe,
      servings: 6,
      ingredients: ['900 g corrected pasta'],
    });
    let reject!: (reason: Error) => void;
    mockGetIngredientProjection.mockImplementation(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail;
        })
    );
    render(
      <RecipeDetailSheet
        {...props}
        ingredientContext={{ context: 'proposed', supperDate: '2026-10-14' }}
      />
    );
    await screen.findByTestId('recipe-detail-name');
    expect(screen.queryByText('Original recipe: 6 servings')).not.toBeInTheDocument();
    expect(screen.queryByText('900 g corrected pasta')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Original quantities' })).toBeDisabled();
    await act(async () => reject(new Error('Unavailable')));
    expect(await screen.findByText('Could not confirm ingredients for this supper.')).toBeVisible();
    expect(screen.queryByText('900 g corrected pasta')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Original quantities' })).toBeDisabled();
    mockGetIngredientProjection.mockResolvedValue(projection);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Original quantities' })).toBeEnabled()
    );
    fireEvent.click(screen.getByRole('button', { name: 'Original quantities' }));
    expect(screen.getByText('200 g pasta')).toBeVisible();
    expect(mockUpdateRecipe).not.toHaveBeenCalled();
  });

  it('keeps original mode honest while a dated original refresh fails, then retries captured evidence', async () => {
    mockGetRecipe.mockResolvedValue({
      ...recipe,
      servings: 6,
      ingredients: ['900 g corrected pasta'],
    });
    render(
      <RecipeDetailSheet
        {...props}
        ingredientContext={{ context: 'proposed', supperDate: '2026-10-14' }}
      />
    );
    await screen.findByTestId('recipe-ingredient-projection');
    fireEvent.click(screen.getByRole('button', { name: 'Original quantities' }));
    expect(screen.getByText('200 g pasta')).toBeVisible();
    mockGetIngredientProjection.mockRejectedValue(new Error('Unavailable'));
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(await screen.findByText('Could not confirm ingredients for this supper.')).toBeVisible();
    expect(screen.queryByText('900 g corrected pasta')).not.toBeInTheDocument();
    expect(screen.queryByText('Original recipe: 6 servings')).not.toBeInTheDocument();
    mockGetIngredientProjection.mockResolvedValue(projection);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('200 g pasta')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Planned quantities' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(mockUpdateRecipe).not.toHaveBeenCalled();
  });

  it('identifies the actual current preview basis separately from captured dated original evidence', async () => {
    mockGetRecipe.mockResolvedValue({
      ...recipe,
      servings: 6,
      ingredients: ['900 g corrected pasta'],
    });
    let finish!: (value: unknown) => void;
    mockGetIngredientPreview.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    render(
      <RecipeDetailSheet
        {...props}
        ingredientContext={{ context: 'proposed', supperDate: '2026-10-14' }}
      />
    );
    await screen.findByTestId('recipe-ingredient-projection');
    fireEvent.click(screen.getByRole('button', { name: 'Preview 6 portions' }));
    expect(screen.queryByText('Original recipe: 2 servings')).not.toBeInTheDocument();
    await act(async () =>
      finish({
        ...projection,
        baseServings: 6,
        targetServings: 6,
        factor: 1,
        lines: [{ ...projection.lines[0], originalText: '900 g corrected pasta', quantity: 900 }],
      })
    );
    expect(await screen.findByText('Original recipe: 6 servings')).toBeVisible();
    expect(screen.getByTestId('recipe-ingredient-preview')).toHaveTextContent('900 g pasta');
    fireEvent.click(screen.getByRole('button', { name: 'Original quantities' }));
    expect(screen.getByText('Original recipe: 2 servings')).toBeVisible();
    expect(screen.getByText('200 g pasta')).toBeVisible();
    expect(mockUpdateRecipe).not.toHaveBeenCalled();
    expect(props.onUseForDay).not.toHaveBeenCalled();
  });
  it('keeps Change day icon-only while retaining its accessible name and separate activation', async () => {
    render(<RecipeDetailSheet {...props} />);
    const change = await screen.findByTestId('action-change-day');
    expect(change).toHaveAccessibleName('Change day');
    expect(change.textContent?.trim()).toBe('');
    expect(change).toHaveAttribute('title', 'Change day');
    expect(change.querySelector('.lucide-arrow-right-left')).not.toBeNull();
    fireEvent.click(change);
    expect(props.onChangeDay).toHaveBeenCalledOnce();
    expect(props.onUseForDay).not.toHaveBeenCalled();
  });
});
