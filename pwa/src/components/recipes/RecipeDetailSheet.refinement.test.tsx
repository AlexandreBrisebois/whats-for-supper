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
  getLocale: () => 'en',
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
  sessionStorage.clear();
  useWeekStore.setState({ schedule: [], groceryRefresh: undefined });
  useRecipeNotesStore.setState({ drafts: {} });
  mockGetRecipe.mockResolvedValue(recipe);
  mockGetIngredientProjection.mockResolvedValue(projection);
  mockUpdateRecipe.mockResolvedValue(undefined);
  mockAddToast.mockReturnValue('notes');
});

describe('quiet recipe composition refinement', () => {
  it('does not advertise Similar where the detail caller has no search action', async () => {
    render(<RecipeDetailSheet {...props} onFindSimilar={undefined} />);
    await screen.findByTestId('recipe-detail-name');
    expect(screen.queryByTestId('action-find-similar')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    expect(screen.queryByTestId('action-find-similar')).not.toBeInTheDocument();
  });

  it('shows Similar once before Ingredients and reuses the callback without a menu duplicate', async () => {
    render(<RecipeDetailSheet {...props} />);
    const similar = await screen.findByTestId('action-find-similar');
    expect(similar).toHaveAccessibleName('Find Similar');
    expect(
      similar.compareDocumentPosition(screen.getByRole('heading', { name: /Ingredients/ })) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    expect(screen.getAllByTestId('action-find-similar')).toHaveLength(1);
    fireEvent.click(similar);
    expect(props.onFindSimilar).toHaveBeenCalledWith(id);
    expect(props.onUseForDay).not.toHaveBeenCalled();
    expect(mockUpdateRecipe).not.toHaveBeenCalled();
  });

  it('keeps Similar disabled while an operation owns the detail', async () => {
    render(<RecipeDetailSheet {...props} planningNeedsCheck />);
    expect(await screen.findByTestId('action-find-similar')).toBeDisabled();
    expect(screen.getByTestId('action-cooks-mode')).toBeDisabled();
  });

  it('keeps the sole Cook in the top dock and dated controls in one bottom row', async () => {
    render(<RecipeDetailSheet {...props} />);
    const cook = await screen.findByTestId('action-cooks-mode');
    expect(screen.getByTestId('recipe-detail-toolbar')).toContainElement(cook);
    expect(screen.getByTestId('recipe-planning-actions')).not.toContainElement(cook);
    expect(screen.getAllByTestId('action-cooks-mode')).toHaveLength(1);
    expect(screen.getByTestId('recipe-dated-planning-actions')).not.toHaveClass('flex-wrap');
  });

  it('offers white exact-date Planned navigation without assignment or arrows', async () => {
    const onOpenPlannedDay = vi.fn();
    render(
      <RecipeDetailSheet
        {...props}
        plannedDayLabel="Wednesday, October 14"
        onOpenPlannedDay={onOpenPlannedDay}
      />
    );
    const planned = await screen.findByTestId('action-planned');
    expect(planned).toHaveAccessibleName('Planned for Wednesday, October 14. Open Planner');
    expect(planned).toHaveClass('bg-white');
    expect(screen.queryByTestId('action-change-day')).not.toBeInTheDocument();
    expect(screen.queryByTestId('action-add-to-day')).not.toBeInTheDocument();
    expect(screen.queryByTestId('action-plan-another-day')).not.toBeInTheDocument();
    expect(screen.getByTestId('action-cooks-mode')).toHaveClass('bg-terracotta');
    fireEvent.click(planned);
    expect(onOpenPlannedDay).toHaveBeenCalledOnce();
    expect(props.onUseForDay).not.toHaveBeenCalled();
    expect(mockUpdateRecipe).not.toHaveBeenCalled();
  });

  it('does not let top Cook bypass a pending target check', async () => {
    render(<RecipeDetailSheet {...props} planningLoading />);
    expect(await screen.findByTestId('action-cooks-mode')).toBeDisabled();
  });

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
    expect(screen.queryByText('Original recipe: 2 servings')).not.toBeInTheDocument();
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
    if (!screen.queryByRole('button', { name: 'View original ingredients' }))
      fireEvent.click(screen.getByTestId('action-gear-menu'));
    fireEvent.click(screen.getByRole('button', { name: 'View original ingredients' }));
    expect(screen.getByText('200 g pasta')).toBeVisible();
    expect(screen.queryByText('400 g pasta')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));
    expect(screen.getByTestId('recipe-ingredient-projection')).toHaveTextContent('400 g pasta');
    expect(screen.queryByText('200 g pasta')).not.toBeInTheDocument();
    expect(screen.queryByTestId('recipe-portion-context')).not.toBeInTheDocument();
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
    expect(screen.queryByText('Original recipe: 2 servings')).not.toBeInTheDocument();
    if (!screen.queryByRole('button', { name: 'View original ingredients' }))
      fireEvent.click(screen.getByTestId('action-gear-menu'));
    fireEvent.click(screen.getByRole('button', { name: 'View original ingredients' }));
    expect(screen.getByText('200 g pasta')).toBeVisible();
    expect(screen.queryByText('900 g corrected pasta')).not.toBeInTheDocument();
    expect(screen.queryByText('Original recipe: 6 servings')).not.toBeInTheDocument();
    expect(screen.queryByText('400 g pasta')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));
    expect(screen.getByTestId('recipe-ingredient-projection')).toHaveTextContent('400 g pasta');
    expect(mockUpdateRecipe).not.toHaveBeenCalled();
    expect(props.onUseForDay).not.toHaveBeenCalled();
  });
  it('restores neutral main appreciation without a red selection or checkmark', async () => {
    render(<RecipeDetailSheet {...props} />);
    const selected = await screen.findByRole('button', { name: 'Like' });
    expect(selected).toHaveAttribute('aria-pressed', 'true');
    expect(selected).toHaveClass('bg-white', 'shadow-md');
    expect(selected).not.toHaveClass('bg-terracotta-50', 'text-terracotta-700');
    expect(screen.queryByTestId('recipe-rating-selected')).not.toBeInTheDocument();
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
    if (!screen.queryByRole('button', { name: 'View original ingredients' }))
      fireEvent.click(screen.getByTestId('action-gear-menu'));
    expect(screen.getByRole('button', { name: 'View original ingredients' })).toBeDisabled();
    await act(async () => reject(new Error('Unavailable')));
    expect(await screen.findByText('Could not confirm ingredients for this supper.')).toBeVisible();
    expect(screen.queryByText('900 g corrected pasta')).not.toBeInTheDocument();
    if (!screen.queryByRole('button', { name: 'View original ingredients' }))
      fireEvent.click(screen.getByTestId('action-gear-menu'));
    expect(screen.getByRole('button', { name: 'View original ingredients' })).toBeDisabled();
    mockGetIngredientProjection.mockResolvedValue(projection);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'View original ingredients' })).toBeEnabled()
    );
    if (!screen.queryByRole('button', { name: 'View original ingredients' }))
      fireEvent.click(screen.getByTestId('action-gear-menu'));
    fireEvent.click(screen.getByRole('button', { name: 'View original ingredients' }));
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
    if (!screen.queryByRole('button', { name: 'View original ingredients' }))
      fireEvent.click(screen.getByTestId('action-gear-menu'));
    fireEvent.click(screen.getByRole('button', { name: 'View original ingredients' }));
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
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    expect(screen.getByRole('button', { name: 'Reset view' })).toBeEnabled();
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
    if (!screen.queryByRole('button', { name: 'View original ingredients' }))
      fireEvent.click(screen.getByTestId('action-gear-menu'));
    fireEvent.click(screen.getByRole('button', { name: 'View original ingredients' }));
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

describe('quiet portions deliberate reading', () => {
  it('keeps one default count and moves original inspection into overflow', async () => {
    render(
      <RecipeDetailSheet
        {...props}
        ingredientContext={{ context: 'proposed', supperDate: '2026-10-14' }}
      />
    );
    await screen.findByTestId('recipe-ingredient-projection');
    expect(screen.getByTestId('recipe-servings')).toHaveTextContent('4 servings');
    expect(screen.queryByText('Original recipe: 2 servings')).not.toBeInTheDocument();
    expect(screen.queryByTestId('recipe-portion-context')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'View original ingredients' })
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    if (!screen.queryByRole('button', { name: 'View original ingredients' }))
      fireEvent.click(screen.getByTestId('action-gear-menu'));
    fireEvent.click(screen.getByRole('button', { name: 'View original ingredients' }));
    expect(screen.getByText('200 g pasta')).toBeVisible();
    expect(screen.getByText('Original recipe: 2 servings')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Planned quantities' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));
    expect(screen.queryByText('Original recipe: 2 servings')).not.toBeInTheDocument();
    expect(mockUpdateRecipe).not.toHaveBeenCalled();
  });

  it('reveals temporary basis for a changed partial preview and collapses when default is selected', async () => {
    mockGetIngredientPreview.mockResolvedValue({
      ...projection,
      baseServings: 2,
      targetServings: 6,
      factor: 3,
      status: 'partial',
      lines: [
        { ...projection.lines[0], quantity: 600 },
        { originalText: 'salt to taste', status: 'unresolved' },
      ],
    });
    render(<RecipeDetailSheet {...props} />);
    await screen.findByTestId('recipe-detail-name');
    expect(screen.getByTestId('recipe-servings')).toHaveTextContent('2 servings');
    expect(screen.queryByText('Original recipe: 2 servings')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Preview 6 portions' }));
    await screen.findByTestId('recipe-ingredient-preview');
    expect(screen.getByText('Original recipe: 2 servings')).toBeVisible();
    expect(
      screen.queryByText('Preview only. Your plan and shopping list stay unchanged.')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Some amounts need review. Consult the original recipe.')
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    expect(screen.getByTestId('action-original-quantities')).toBeVisible();
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    fireEvent.click(screen.getByRole('button', { name: 'Preview 2 portions' }));
    expect(screen.queryByTestId('recipe-ingredient-preview')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Preview only. Your plan and shopping list stay unchanged.')
    ).not.toBeInTheDocument();
    expect(mockUpdateRecipe).not.toHaveBeenCalled();
  });

  it('explains saved effects only inside the focused missing-basis editor', async () => {
    mockGetRecipe.mockResolvedValue({ ...recipe, servings: null });
    render(<RecipeDetailSheet {...props} />);
    await screen.findByTestId('recipe-detail-name');
    expect(
      screen.queryByText('This updates the saved recipe and may change your shopping list.')
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Set recipe portions' }));
    await waitFor(() => expect(screen.getByTestId('recipe-edit-servings-input')).toHaveFocus());
    expect(
      screen.getByText('This updates the saved recipe and may change your shopping list.')
    ).toBeVisible();
    expect(mockUpdateRecipe).not.toHaveBeenCalled();
  });
});

describe('quiet portions captured contexts', () => {
  it('keeps a basis-four preview temporary against dated five without claiming a nonunit factor', async () => {
    mockGetRecipe.mockResolvedValue({ ...recipe, servings: 4 });
    mockGetIngredientProjection.mockResolvedValue({
      ...projection,
      baseServings: 4,
      targetServings: 5,
      factor: 1.25,
      lines: [{ ...projection.lines[0], quantity: 250 }],
    });
    mockGetIngredientPreview.mockResolvedValue({
      ...projection,
      baseServings: 4,
      targetServings: 4,
      factor: 1,
      lines: [{ ...projection.lines[0], quantity: 200 }],
    });
    render(
      <RecipeDetailSheet
        {...props}
        ingredientContext={{ context: 'proposed', supperDate: '2026-10-14' }}
      />
    );
    await screen.findByTestId('recipe-ingredient-projection');
    fireEvent.click(screen.getByRole('button', { name: 'Preview 4 portions' }));
    await screen.findByTestId('recipe-ingredient-preview');
    expect(screen.getByText('Original recipe: 4 servings')).toBeVisible();
    expect(screen.getByTestId('recipe-servings')).toHaveTextContent('4 servings');
    expect(screen.queryByTestId('recipe-instruction-limitation')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));
    expect(screen.getByTestId('recipe-servings')).toHaveTextContent('5 servings');
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Ingredients 5 servings' })).toHaveFocus()
    );
    expect(screen.queryByTestId('recipe-original-yield')).not.toBeInTheDocument();
    expect(mockUpdateRecipe).not.toHaveBeenCalled();
  });

  it('keeps frozen prepared seven visible during a temporary preview', async () => {
    mockGetIngredientProjection.mockResolvedValue({
      ...projection,
      targetServings: 7,
      preparation: { servings: 7, preparedOn: '2026-10-12', originalServings: 2 },
    });
    mockGetIngredientPreview.mockResolvedValue({ ...projection, targetServings: 6, factor: 3 });
    render(
      <RecipeDetailSheet
        {...props}
        ingredientContext={{
          context: 'assigned',
          supperDate: '2026-10-14',
          occurrenceId: 'prepared',
        }}
      />
    );
    await screen.findByTestId('recipe-ingredient-projection');
    fireEvent.click(screen.getByRole('button', { name: 'Preview 6 portions' }));
    await screen.findByTestId('recipe-ingredient-preview');
    expect(screen.getByTestId('recipe-servings')).toHaveTextContent('6 servings');
    expect(screen.getByTestId('recipe-prepared-portions')).toHaveTextContent('Prepared 7 portions');
    expect(screen.getByTestId('preparation-status')).toHaveTextContent('Prepared Monday, Oct 12');
    expect(mockUpdateRecipe).not.toHaveBeenCalled();
  });

  it('retains a known grocery source date once beside an undated Plan transition', async () => {
    render(
      <RecipeDetailSheet
        {...props}
        plannerDayLabel={null}
        sourceDayLabel="Wednesday, October 14"
        onBeginPlanning={vi.fn()}
      />
    );
    await screen.findByTestId('recipe-detail-name');
    expect(screen.getAllByText('Wednesday, October 14')).toHaveLength(1);
    expect(screen.getByTestId('action-begin-planning')).toHaveTextContent('Plan');
    expect(screen.queryByTestId('recipe-original-yield')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    fireEvent.click(screen.getByRole('button', { name: 'View original ingredients' }));
    expect(screen.getByText('Original recipe: 2 servings')).toBeVisible();
    expect(screen.getAllByText('Wednesday, October 14')).toHaveLength(1);
    expect(mockUpdateRecipe).not.toHaveBeenCalled();
  });
});

describe('simplified detail preview controls', () => {
  it('retains the open keyboard menu during a same-recipe background read and blocks actions until settled', async () => {
    mockGetIngredientPreview.mockResolvedValue({
      ...projection,
      targetServings: 6,
      lines: [{ ...projection.lines[0], quantity: 600 }],
    });
    render(
      <RecipeDetailSheet
        {...props}
        ingredientContext={{ context: 'proposed', supperDate: '2026-10-14' }}
      />
    );
    await screen.findByTestId('recipe-ingredient-projection');
    fireEvent.click(screen.getByRole('button', { name: 'Preview 6 portions' }));
    await screen.findByTestId('recipe-ingredient-preview');
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    const original = screen.getByTestId('action-original-quantities');
    original.focus();
    let finish!: (value: Recipe) => void;
    mockGetRecipe.mockReturnValueOnce(
      new Promise<Recipe>((resolve) => {
        finish = resolve;
      })
    );
    await act(async () => window.dispatchEvent(new Event('focus')));
    expect(original).toBeInTheDocument();
    expect(original).toBeDisabled();
    expect(screen.getByTestId('action-gear-menu')).toHaveAttribute('aria-expanded', 'true');
    await act(async () => finish(recipe));
    expect(screen.getByTestId('action-original-quantities')).toBe(original);
    expect(original).toBeEnabled();
    expect(mockUpdateRecipe).not.toHaveBeenCalled();
    expect(props.onUseForDay).not.toHaveBeenCalled();
  });

  it('resets a failed standalone preview to an original basis outside the preset counts', async () => {
    mockGetRecipe.mockResolvedValue({ ...recipe, servings: 3 });
    mockGetIngredientPreview.mockRejectedValue(new Error('Preview unavailable'));
    render(<RecipeDetailSheet {...props} />);
    await screen.findByTestId('recipe-detail-name');
    fireEvent.click(screen.getByRole('button', { name: 'Preview 6 portions' }));
    await screen.findByText('Preview could not load.');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Original quantities' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Planned quantities' })).not.toBeInTheDocument();
    expect(
      screen.queryByText('Preview only. Your plan and shopping list stay unchanged.')
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    expect(screen.getByRole('button', { name: 'View original ingredients' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));
    expect(screen.getByTestId('recipe-servings')).toHaveTextContent('3 servings');
    expect(screen.getByText('200 g pasta')).toBeVisible();
    expect(screen.queryByText('Preview could not load.')).not.toBeInTheDocument();
    expect(mockUpdateRecipe).not.toHaveBeenCalled();
    expect(props.onUseForDay).not.toHaveBeenCalled();
  });

  it('restores frozen seven through menu reset after inspecting original from a preview', async () => {
    mockGetIngredientProjection.mockResolvedValue({
      ...projection,
      targetServings: 7,
      lines: [{ ...projection.lines[0], quantity: 700 }],
      preparation: { servings: 7, preparedOn: '2026-10-12', originalServings: 2 },
    });
    mockGetIngredientPreview.mockResolvedValue({
      ...projection,
      targetServings: 6,
      factor: 3,
      lines: [{ ...projection.lines[0], quantity: 600 }],
    });
    render(
      <RecipeDetailSheet
        {...props}
        ingredientContext={{
          context: 'assigned',
          supperDate: '2026-10-14',
          occurrenceId: 'prepared',
        }}
      />
    );
    await screen.findByTestId('recipe-ingredient-projection');
    fireEvent.click(screen.getByRole('button', { name: 'Preview 6 portions' }));
    await screen.findByTestId('recipe-ingredient-preview');
    expect(screen.getByText('Original recipe: 2 servings')).toBeVisible();
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    fireEvent.click(screen.getByRole('button', { name: 'View original ingredients' }));
    expect(screen.getByText('200 g pasta')).toBeVisible();
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));
    expect(screen.getByTestId('recipe-servings')).toHaveTextContent('7 servings');
    expect(screen.getByTestId('recipe-ingredient-projection')).toHaveTextContent('700 g pasta');
    expect(screen.getByTestId('recipe-prepared-portions')).toHaveTextContent('Prepared 7 portions');
    expect(mockUpdateRecipe).not.toHaveBeenCalled();
    expect(props.onUseForDay).not.toHaveBeenCalled();
  });
});

describe('canonical original ingredient editing', () => {
  const canonical = {
    ...recipe,
    contentSchemaVersion: 2,
    contentRevision: 'original-revision',
    servings: 4,
    ingredients: ['200 g pasta', '100 ml sauce'],
    ingredientLines: [
      {
        id: '550e8400-e29b-41d4-a716-446655440211',
        description: 'pasta',
        amount: { kind: 'scalar', value: { n: '200', d: '1' } },
        amountText: '200',
        unit: { text: 'g', definitionId: null },
        scaling: 'proportional',
        packageEscaped: null,
        shopping: { name: 'pasta', foodId: null, mappingRevision: null },
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440212',
        description: 'sauce',
        amount: { kind: 'scalar', value: { n: '100', d: '1' } },
        amountText: '100',
        unit: { text: 'ml', definitionId: null },
        scaling: 'proportional',
        packageEscaped: null,
        shopping: { name: 'sauce', foodId: null, mappingRevision: null },
      },
    ],
  };
  async function edit() {
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    return screen.findByTestId('recipe-edit-amount-0');
  }
  it('edits original separate facts and installs authoritative returned content', async () => {
    mockGetRecipe.mockResolvedValue(canonical);
    mockUpdateRecipe.mockResolvedValue({
      ...canonical,
      name: 'Authoritative saved name',
      contentRevision: 'saved-revision',
      ingredients: ['250 g pasta', '100 ml sauce'],
    });
    render(<RecipeDetailSheet {...props} />);
    await screen.findByTestId('recipe-detail-name');
    const amount = await edit();
    expect(amount).toHaveValue('200');
    expect(screen.getByTestId('recipe-edit-unit-0')).toHaveValue('g');
    expect(screen.getByTestId('recipe-edit-ingredient-0')).toHaveValue('pasta');
    fireEvent.change(amount, { target: { value: '250' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(mockUpdateRecipe).toHaveBeenCalledWith(
        id,
        expect.objectContaining({
          expectedContentRevision: 'original-revision',
          ingredientLines: [
            expect.objectContaining({
              id: canonical.ingredientLines[0].id,
              amountText: '250',
              amount: { kind: 'scalar', value: { n: '250', d: '1' } },
            }),
            expect.objectContaining({ id: canonical.ingredientLines[1].id, amountText: '100' }),
          ],
        })
      )
    );
    expect(mockUpdateRecipe.mock.calls[0][1]).not.toHaveProperty('ingredients');
    await waitFor(() =>
      expect(screen.getByTestId('recipe-detail-name')).toHaveTextContent('Authoritative saved name')
    );
    expect(screen.getByText('250 g pasta')).toBeVisible();
  });
  it('installs independently changed household feedback from the authoritative Save response', async () => {
    mockGetRecipe.mockResolvedValue({ ...canonical, rating: 0, isDiscoverable: true });
    mockUpdateRecipe.mockResolvedValue({
      ...canonical,
      rating: 3,
      isDiscoverable: false,
      contentRevision: 'saved-feedback',
    });
    render(<RecipeDetailSheet {...props} />);
    await screen.findByTestId('recipe-detail-name');
    fireEvent.change(await edit(), { target: { value: '250' } });
    fireEvent.click(screen.getByTestId('recipe-save-edits'));
    await waitFor(() =>
      expect(screen.queryByTestId('recipe-edit-amount-0')).not.toBeInTheDocument()
    );
    expect(
      within(screen.getByTestId('recipe-rating-selector')).getByRole('button', { name: 'Love' })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('action-toggle-discovery')).toHaveAttribute('aria-pressed', 'false');
  });
  it('retains every draft on a failed or lost save and requires reconciliation before retry', async () => {
    mockGetRecipe.mockResolvedValue(canonical);
    mockUpdateRecipe.mockRejectedValue(new Error('Reply lost after possible commit'));
    render(<RecipeDetailSheet {...props} />);
    await screen.findByTestId('recipe-detail-name');
    fireEvent.change(await edit(), { target: { value: '⅓' } });
    fireEvent.change(screen.getByTestId('recipe-edit-name-input'), {
      target: { value: 'Draft name' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByText('Could not save changes. Try again.');
    expect(screen.getByTestId('recipe-edit-amount-0')).toHaveValue('⅓');
    expect(screen.getByTestId('recipe-edit-name-input')).toHaveValue('Draft name');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Check saved recipe' }));
    await waitFor(() => expect(mockGetRecipe).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('recipe-edit-amount-0')).toHaveValue('⅓');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
  });
  it('uses the canonical saved basis with its rows when a dated projection has an older basis', async () => {
    mockGetRecipe.mockResolvedValue(canonical);
    render(
      <RecipeDetailSheet
        {...props}
        ingredientContext={{ context: 'proposed', supperDate: '2026-10-14' }}
      />
    );
    await screen.findByTestId('recipe-ingredient-projection');
    await edit();
    expect(screen.getByTestId('recipe-edit-servings-input')).toHaveValue('4');
    expect(screen.getByTestId('recipe-edit-amount-0')).toHaveValue('200');
  });
  it('recovers every field after unmount and rereads before a recovered draft can save', async () => {
    mockGetRecipe.mockResolvedValue(canonical);
    const first = render(<RecipeDetailSheet {...props} />);
    await screen.findByTestId('recipe-detail-name');
    fireEvent.change(await edit(), { target: { value: '⅓–½' } });
    for (const [field, value] of Object.entries({
      name: 'Unsaved name',
      description: '',
      cuisine: 'Quebec',
      servings: '6',
    }))
      fireEvent.change(screen.getByTestId(`recipe-edit-${field}-input`), { target: { value } });
    fireEvent.change(screen.getByTestId('recipe-edit-unit-0'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('recipe-edit-ingredient-0'), {
      target: { value: 'Fresh pasta' },
    });
    fireEvent.change(screen.getAllByRole('textbox', { name: 'Shopping name' })[0], {
      target: { value: 'Family pasta' },
    });
    fireEvent.click(
      screen.getAllByRole('checkbox', { name: 'Keep amount fixed when portions change' })[0]
    );
    fireEvent.click(screen.getByTestId('recipe-edit-meal-type-pill-lunch'));
    fireEvent.click(screen.getByTestId('recipe-remove-ingredient-1'));
    fireEvent.click(screen.getByRole('button', { name: 'Add ingredient' }));
    fireEvent.change(screen.getByTestId('recipe-edit-ingredient-1'), {
      target: { value: 'Basil leaves' },
    });
    first.unmount();
    render(<RecipeDetailSheet {...props} />);
    expect(await screen.findByTestId('recipe-edit-amount-0')).toHaveValue('⅓–½');
    expect(screen.getByTestId('recipe-edit-name-input')).toHaveValue('Unsaved name');
    expect(screen.getByTestId('recipe-edit-description-input')).toHaveValue('');
    expect(screen.getByTestId('recipe-edit-cuisine-input')).toHaveValue('Quebec');
    expect(screen.getByTestId('recipe-edit-servings-input')).toHaveValue('6');
    expect(screen.getByTestId('recipe-edit-unit-0')).toHaveValue('');
    expect(screen.getByTestId('recipe-edit-ingredient-1')).toHaveValue('Basil leaves');
    expect(screen.getAllByRole('textbox', { name: 'Shopping name' })[0]).toHaveValue(
      'Family pasta'
    );
    expect(
      screen.getAllByRole('checkbox', { name: 'Keep amount fixed when portions change' })[0]
    ).toBeChecked();
    expect(screen.getByTestId('recipe-edit-meal-type-pill-lunch')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('recipe-save-edits')).toBeDisabled();
    expect(mockUpdateRecipe).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Check saved recipe' }));
    await waitFor(() => expect(screen.getByTestId('recipe-save-edits')).toBeEnabled());
  });

  it('reconciles changed saved fields explicitly while preserving the original recovered draft', async () => {
    mockGetRecipe.mockResolvedValue(canonical);
    const first = render(<RecipeDetailSheet {...props} />);
    await screen.findByTestId('recipe-detail-name');
    fireEvent.change(await edit(), { target: { value: '250' } });
    fireEvent.change(screen.getByTestId('recipe-edit-name-input'), {
      target: { value: 'My name' },
    });
    first.unmount();
    const current = {
      ...canonical,
      contentRevision: 'someone-else',
      name: 'Their name',
      description: 'Their description',
      servings: 8,
    };
    mockGetRecipe.mockResolvedValue(current);
    mockUpdateRecipe.mockResolvedValue({ ...current, name: 'My name' });
    render(<RecipeDetailSheet {...props} />);
    expect(await screen.findByTestId('recipe-edit-amount-0')).toHaveValue('250');
    fireEvent.click(screen.getByRole('button', { name: 'Check saved recipe' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Reconcile draft' }));
    expect(screen.getByTestId('recipe-save-edits')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Keep my draft: Name' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply reviewed draft' }));
    expect(screen.getByTestId('recipe-edit-amount-0')).toHaveValue('250');
    expect(screen.getByTestId('recipe-edit-description-input')).toHaveValue('Their description');
    expect(screen.getByTestId('recipe-edit-servings-input')).toHaveValue('8');
    fireEvent.click(screen.getByTestId('recipe-save-edits'));
    await waitFor(() =>
      expect(mockUpdateRecipe).toHaveBeenCalledWith(
        id,
        expect.objectContaining({
          expectedContentRevision: 'someone-else',
          name: 'My name',
          description: 'Their description',
          servings: 8,
        })
      )
    );
  });

  it('discards persisted field drafts only on explicit Cancel or acknowledged Save', async () => {
    mockGetRecipe.mockResolvedValue(canonical);
    const first = render(<RecipeDetailSheet {...props} />);
    await screen.findByTestId('recipe-detail-name');
    fireEvent.change(await edit(), { target: { value: '250' } });
    fireEvent.click(screen.getByTestId('recipe-cancel-edits'));
    first.unmount();
    render(<RecipeDetailSheet {...props} />);
    await screen.findByTestId('recipe-detail-name');
    expect(screen.queryByTestId('recipe-edit-amount-0')).not.toBeInTheDocument();
    expect(await edit()).toHaveValue('200');
  });

  it('prevents further field edits while an acknowledged Save is pending', async () => {
    mockGetRecipe.mockResolvedValue(canonical);
    let finish!: (saved: Recipe) => void;
    mockUpdateRecipe.mockImplementation(
      () =>
        new Promise<Recipe>((resolve) => {
          finish = resolve;
        })
    );
    render(<RecipeDetailSheet {...props} />);
    await screen.findByTestId('recipe-detail-name');
    fireEvent.change(await edit(), { target: { value: '250' } });
    fireEvent.click(screen.getByTestId('recipe-save-edits'));
    expect(screen.getByTestId('recipe-edit-amount-0')).toBeDisabled();
    expect(screen.getByTestId('recipe-edit-name-input')).toBeDisabled();
    expect(screen.getByTestId('recipe-edit-meal-type-pill-lunch')).toBeDisabled();
    await act(async () => finish({ ...canonical, contentRevision: 'saved' } as Recipe));
  });

  it('recovers an uncertain save after reload without sending another write', async () => {
    mockGetRecipe.mockResolvedValue(canonical);
    mockUpdateRecipe.mockRejectedValue(new Error('Lost committed response'));
    const first = render(<RecipeDetailSheet {...props} />);
    await screen.findByTestId('recipe-detail-name');
    fireEvent.change(await edit(), { target: { value: '250' } });
    fireEvent.click(screen.getByTestId('recipe-save-edits'));
    await screen.findByText('Could not save changes. Try again.');
    first.unmount();
    mockGetRecipe.mockResolvedValue({ ...canonical, contentRevision: 'committed-response-lost' });
    render(<RecipeDetailSheet {...props} />);
    expect(await screen.findByTestId('recipe-edit-amount-0')).toHaveValue('250');
    expect(mockUpdateRecipe).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('recipe-save-edits')).toBeDisabled();
  });

  it('ignores an older reconciliation read after a newer saved revision was observed', async () => {
    mockGetRecipe.mockResolvedValue(canonical);
    mockUpdateRecipe.mockRejectedValue(new Error('Uncertain save'));
    render(<RecipeDetailSheet {...props} />);
    await screen.findByTestId('recipe-detail-name');
    fireEvent.change(await edit(), { target: { value: '250' } });
    fireEvent.click(screen.getByTestId('recipe-save-edits'));
    await screen.findByText('Could not save changes. Try again.');
    let oldReply!: (value: Recipe) => void;
    mockGetRecipe.mockImplementationOnce(
      () =>
        new Promise<Recipe>((resolve) => {
          oldReply = resolve;
        })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Check saved recipe' }));
    mockGetRecipe.mockResolvedValueOnce({
      ...canonical,
      name: 'New current name',
      contentRevision: 'new-current',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Check saved recipe' }));
    await screen.findByText('New current name');
    await act(async () => oldReply(canonical as Recipe));
    expect(screen.getByText('New current name')).toBeInTheDocument();
    expect(screen.getByTestId('recipe-save-edits')).toBeDisabled();
    expect(screen.getByTestId('recipe-edit-amount-0')).toHaveValue('250');
  });
  it('retires the old dated projection when a lost-save reread is explicitly accepted with Cancel', async () => {
    mockGetRecipe.mockResolvedValue(canonical);
    mockUpdateRecipe.mockRejectedValue(new Error('Committed response lost'));
    render(
      <RecipeDetailSheet
        {...props}
        ingredientContext={{ context: 'proposed', supperDate: '2026-10-14' }}
      />
    );
    await screen.findByTestId('recipe-detail-name');
    await screen.findByTestId('recipe-ingredient-projection');
    fireEvent.change(await edit(), { target: { value: '250' } });
    fireEvent.click(screen.getByTestId('recipe-save-edits'));
    await screen.findByText('Could not save changes. Try again.');
    mockGetRecipe.mockResolvedValue({
      ...canonical,
      contentRevision: 'committed-current',
      ingredients: ['250 g pasta', '100 ml sauce'],
      ingredientLines: [
        {
          ...canonical.ingredientLines[0],
          amountText: '250',
          amount: { kind: 'scalar', value: { n: '250', d: '1' } },
        },
        canonical.ingredientLines[1],
      ],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Check saved recipe' }));
    await screen.findByRole('button', { name: 'Reconcile draft' });
    mockGetIngredientProjection.mockResolvedValue({
      ...projection,
      lines: [{ ...projection.lines[0], originalText: '250 g pasta', quantity: 500 }],
    });
    fireEvent.click(screen.getByTestId('recipe-cancel-edits'));
    await waitFor(() => expect(mockGetIngredientProjection).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('recipe-ingredient-projection')).toHaveTextContent('500 g pasta');
    expect(mockUpdateRecipe).toHaveBeenCalledTimes(1);
  });

  it('retains a legacy full-editor draft through a canonical format upgrade without replaying its strings', async () => {
    mockGetRecipe.mockResolvedValue(recipe);
    mockUpdateRecipe.mockRejectedValue(new Error('Upgrade required'));
    const first = render(<RecipeDetailSheet {...props} />);
    await screen.findByTestId('recipe-detail-name');
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByTestId('recipe-edit-name-input'), {
      target: { value: 'Legacy name' },
    });
    fireEvent.change(screen.getByTestId('recipe-edit-ingredient-0'), {
      target: { value: '250 g legacy pasta' },
    });
    fireEvent.click(screen.getByTestId('recipe-save-edits'));
    await screen.findByText('Could not save changes. Try again.');
    first.unmount();
    mockGetRecipe.mockResolvedValue(canonical);
    render(<RecipeDetailSheet {...props} />);
    expect(await screen.findByTestId('recipe-edit-ingredient-0')).toHaveValue('250 g legacy pasta');
    expect(screen.getByTestId('recipe-edit-name-input')).toHaveValue('Legacy name');
    fireEvent.click(screen.getByRole('button', { name: 'Check saved recipe' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Reconcile draft' }));
    expect(screen.getByText('250 g legacy pasta')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Keep my draft: Ingredients' })
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Use currently saved: Ingredients' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply reviewed draft' }));
    expect(screen.getByTestId('recipe-edit-amount-0')).toHaveValue('200');
    expect(screen.getByTestId('recipe-edit-name-input')).toHaveValue('Legacy name');
    expect(screen.getByText('Original recovered draft')).toBeInTheDocument();
    expect(mockUpdateRecipe).toHaveBeenCalledTimes(1);
  });
});
