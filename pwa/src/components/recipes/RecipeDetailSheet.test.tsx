import { useWeekStore } from '@/store/weekStore';
import { StrictMode } from 'react';
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

  const editProps = {
    recipeId: '550e8400-e29b-41d4-a716-446655440111',
    plannerDayLabel: null,
    onClose: vi.fn(),
    onUseForDay: vi.fn(),
    onFindSimilar: vi.fn(),
  };
  it('exposes the dated action directly, suppresses duplicates and retains visible failure', async () => {
    let reject!: (error: Error) => void;
    const onUseForDay = vi.fn(
      () =>
        new Promise<void>((_, fail) => {
          reject = fail;
        })
    );
    render(
      <RecipeDetailSheet
        {...editProps}
        plannerDayLabel="Wednesday, May 13"
        onUseForDay={onUseForDay}
      />
    );
    const action = await screen.findByTestId('action-add-to-day');
    expect(action).toHaveAccessibleName('Plan for Wednesday, May 13');
    expect(screen.queryByTestId('action-cook-tonight')).not.toBeInTheDocument();
    fireEvent.click(action);
    fireEvent.click(action);
    expect(action).toBeDisabled();
    expect(onUseForDay).toHaveBeenCalledTimes(1);
    await act(async () => reject(new Error('Your plan changed. Review Wednesday.')));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your plan changed. Review Wednesday.'
    );
    expect(action).toBeEnabled();
    expect(screen.getByTestId('recipe-detail-sheet')).toBeInTheDocument();
  });

  async function enterServingsEdit() {
    fireEvent.click(await screen.findByTestId('action-gear-menu'));
    fireEvent.click(await screen.findByTestId('action-edit-recipe'));
    return screen.findByTestId('recipe-edit-servings-input');
  }
  it.each([
    [4, '3', 3],
    [null, '2', 2],
    [null, '', undefined],
  ])('saves the serving draft %s → %s', async (initial, draft, expected) => {
    mockGetRecipe.mockResolvedValue({ ...(await mockGetRecipe()), servings: initial });
    mockUpdateRecipe.mockResolvedValue(undefined);
    render(<RecipeDetailSheet {...editProps} />);
    const input = await enterServingsEdit();
    expect(input).toHaveValue(initial == null ? '' : String(initial));
    expect(input).toHaveAccessibleName('Servings');
    fireEvent.change(input, { target: { value: draft } });
    fireEvent.click(screen.getByTestId('recipe-save-edits'));
    await waitFor(() =>
      expect(mockUpdateRecipe).toHaveBeenCalledWith(
        editProps.recipeId,
        expect.objectContaining(expected === undefined ? {} : { servings: expected })
      )
    );
    if (expected === undefined)
      expect(mockUpdateRecipe.mock.calls.at(-1)?.[1]).not.toHaveProperty('servings');
    await waitFor(() => expect(screen.queryByTestId('recipe-edit-servings-input')).toBeNull());
    if (expected)
      expect(screen.getByTestId('recipe-servings')).toHaveTextContent(`${expected} servings`);
  });
  it.each(['', '0', '-1', '1.5', '2147483648', 'abc', '1e2'])(
    'rejects invalid known count %s with an associated error',
    async (value) => {
      mockGetRecipe.mockResolvedValue({ ...(await mockGetRecipe()), servings: 4 });
      render(<RecipeDetailSheet {...editProps} />);
      const input = await enterServingsEdit();
      fireEvent.change(input, { target: { value } });
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAccessibleDescription('Enter a whole number from 1 to 2147483647.');
      expect(screen.getByTestId('recipe-save-edits')).toBeDisabled();
      expect(screen.getByTestId('recipe-servings')).toHaveTextContent('4 servings');
    }
  );
  it('discards on Cancel and retains the draft after failure for retry', async () => {
    mockGetRecipe.mockResolvedValue({ ...(await mockGetRecipe()), servings: 4 });
    render(<RecipeDetailSheet {...editProps} />);
    let input = await enterServingsEdit();
    fireEvent.change(input, { target: { value: '3' } });
    fireEvent.click(screen.getByTestId('recipe-cancel-edits'));
    expect(mockUpdateRecipe).not.toHaveBeenCalled();
    input = await enterServingsEdit();
    expect(input).toHaveValue('4');
    fireEvent.change(input, { target: { value: '3' } });
    mockUpdateRecipe.mockRejectedValueOnce(new Error('offline'));
    fireEvent.click(screen.getByTestId('recipe-save-edits'));
    await screen.findByText('Could not save changes. Try again.');
    expect(input).toHaveValue('3');
    expect(screen.getByTestId('recipe-servings')).toHaveTextContent('4 servings');
    mockUpdateRecipe.mockResolvedValueOnce(undefined);
    fireEvent.click(screen.getByTestId('recipe-save-edits'));
    await waitFor(() => expect(screen.queryByTestId('recipe-edit-servings-input')).toBeNull());
    expect(screen.getByTestId('recipe-servings')).toHaveTextContent('3 servings');
  });
  it('resets a draft and validation when the recipe identity changes', async () => {
    const known = { ...(await mockGetRecipe()), servings: 4 };
    mockGetRecipe.mockResolvedValue(known);
    const view = render(<RecipeDetailSheet {...editProps} />);
    fireEvent.change(await enterServingsEdit(), { target: { value: '0' } });
    const id = '550e8400-e29b-41d4-a716-446655440112';
    mockGetRecipe.mockResolvedValue({ ...known, id, servings: null });
    view.rerender(<RecipeDetailSheet {...editProps} recipeId={id} />);
    await screen.findByTestId('action-gear-menu');
    const input = await enterServingsEdit();
    expect(input).toHaveValue('');
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });

  it('ignores a completed save from the previous recipe identity', async () => {
    const known = { ...(await mockGetRecipe()), servings: 4 };
    mockGetRecipe.mockResolvedValue(known);
    let finish!: () => void;
    mockUpdateRecipe.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    const view = render(<RecipeDetailSheet {...editProps} />);
    fireEvent.change(await enterServingsEdit(), { target: { value: '3' } });
    fireEvent.click(screen.getByTestId('recipe-save-edits'));
    const id = '550e8400-e29b-41d4-a716-446655440112';
    mockGetRecipe.mockResolvedValue({ ...known, id, servings: null });
    view.rerender(<RecipeDetailSheet {...editProps} recipeId={id} />);
    const input = await enterServingsEdit();
    fireEvent.change(input, { target: { value: '2' } });
    await act(async () => finish());
    expect(input).toHaveValue('2');
    expect(screen.queryByTestId('recipe-servings')).toBeNull();
  });

  it('ignores a save from an earlier visit when returning to the same recipe', async () => {
    const known = { ...(await mockGetRecipe()), servings: 4 };
    mockGetRecipe.mockResolvedValue(known);
    let finish!: () => void;
    mockUpdateRecipe.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    const view = render(<RecipeDetailSheet {...editProps} />);
    fireEvent.change(await enterServingsEdit(), { target: { value: '3' } });
    fireEvent.click(screen.getByTestId('recipe-save-edits'));
    const otherId = '550e8400-e29b-41d4-a716-446655440112';
    mockGetRecipe.mockResolvedValue({ ...known, id: otherId, servings: null });
    view.rerender(<RecipeDetailSheet {...editProps} recipeId={otherId} />);
    await screen.findByRole('heading', { name: 'Ingredients' });
    mockGetRecipe.mockResolvedValue(known);
    view.rerender(<RecipeDetailSheet {...editProps} />);
    const input = await enterServingsEdit();
    fireEvent.change(input, { target: { value: '2' } });
    await act(async () => finish());
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('2');
    expect(screen.getByTestId('recipe-servings')).toHaveTextContent('4 servings');
  });

  it.each([4, 1])(
    'shows the read-only %s original serving basis once beside portion controls',
    async (servings) => {
      const recipe = await mockGetRecipe();
      mockGetRecipe.mockResolvedValue({
        ...recipe,
        servings,
        ingredients: ['510 g beef', '340 g pasta'],
      });
      render(
        <RecipeDetailSheet
          recipeId={recipe.id}
          plannerDayLabel={null}
          onClose={vi.fn()}
          onUseForDay={vi.fn()}
          onFindSimilar={vi.fn()}
        />
      );
      const heading = await screen.findByRole('heading', {
        name: new RegExp(`Ingredients.*${servings} ${servings === 1 ? 'serving' : 'servings'}`),
      });
      expect(heading.querySelector('button, input, [tabindex]')).toBeNull();
      expect(screen.getByTestId('recipe-servings')).toHaveTextContent(
        `${servings} ${servings === 1 ? 'serving' : 'servings'}`
      );
      expect(
        screen.queryByText(
          `Original recipe: ${servings} ${servings === 1 ? 'serving' : 'servings'}`
        )
      ).not.toBeInTheDocument();
      expect(screen.getByText('510 g beef')).toBeInTheDocument();
      expect(screen.getByText('340 g pasta')).toBeInTheDocument();
    }
  );

  it('clears the prior count while another identity loads and when its count is unknown', async () => {
    const known = { ...(await mockGetRecipe()), servings: 4 };
    mockGetRecipe.mockResolvedValueOnce(known);
    const props = {
      recipeId: known.id,
      plannerDayLabel: null,
      onClose: vi.fn(),
      onUseForDay: vi.fn(),
      onFindSimilar: vi.fn(),
    };
    const view = render(<RecipeDetailSheet {...props} />);
    await screen.findByTestId('recipe-servings');
    let finish!: (value: unknown) => void;
    mockGetRecipe.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const nextId = '550e8400-e29b-41d4-a716-446655440112';
    view.rerender(<RecipeDetailSheet {...props} recipeId={nextId} />);
    expect(screen.queryByTestId('recipe-servings')).not.toBeInTheDocument();
    await act(async () => finish({ ...known, id: nextId, servings: null }));
    await screen.findByRole('heading', { name: 'Ingredients' });
    expect(screen.queryByTestId('recipe-servings')).not.toBeInTheDocument();
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

  it('opens a confirmed Planner source day without a second occurrence shortcut', async () => {
    const onOpenPlannedDay = vi.fn();
    render(
      <RecipeDetailSheet
        recipeId="550e8400-e29b-41d4-a716-446655440111"
        plannerDayLabel={null}
        sourceDayLabel="Wednesday, May 6"
        plannedDayLabel="Wednesday, May 6"
        onOpenPlannedDay={onOpenPlannedDay}
        onClose={vi.fn()}
        onUseForDay={vi.fn()}
        onFindSimilar={vi.fn()}
      />
    );
    expect(await screen.findByTestId('recipe-planning-actions')).toHaveTextContent(
      'Wednesday, May 6'
    );
    expect(screen.getByTestId('action-cooks-mode')).toHaveAccessibleName('Cook');
    fireEvent.click(screen.getByTestId('action-planned'));
    expect(onOpenPlannedDay).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('action-plan-another-day')).not.toBeInTheDocument();
    expect(screen.queryByTestId('action-cook-this')).not.toBeInTheDocument();
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

  it('keeps a failed hero out of the original recipe photo editor', async () => {
    render(<RecipeDetailSheet {...editProps} />);
    const photo = await screen.findByRole('img', { name: 'Shareable Pasta' });
    fireEvent.error(photo);
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    fireEvent.click(await screen.findByTestId('action-edit-recipe'));
    expect(screen.queryByRole('img', { name: 'Shareable Pasta' })).toBeNull();
    expect(screen.getByTestId('hero-action-regenerate')).toBeVisible();
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
        plannerDayLabel="Wednesday, May 13"
        onClose={vi.fn()}
        onUseForDay={vi.fn()}
        onFindSimilar={vi.fn()}
      />
    );

    expect(await screen.findByTestId('action-add-to-day')).toBeVisible();
    expect(screen.getByTestId('action-find-similar')).toBeVisible();
    expect(screen.getByTestId('action-toggle-discovery')).toBeVisible();

    fireEvent.click(screen.getByTestId('action-gear-menu'));
    fireEvent.click(await screen.findByTestId('action-edit-recipe'));

    expect(screen.getByTestId('recipe-save-edits')).toBeVisible();
    expect(screen.getByTestId('recipe-cancel-edits')).toBeVisible();
    expect(screen.queryByTestId('action-add-to-day')).toBeNull();
    expect(screen.queryByTestId('action-find-similar')).toBeNull();
    expect(screen.queryByTestId('action-toggle-discovery')).toBeNull();

    fireEvent.click(screen.getByTestId('recipe-cancel-edits'));

    expect(screen.getByTestId('action-add-to-day')).toBeVisible();
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

  it('renders one contextual Cook entry with the current label', async () => {
    render(
      <RecipeDetailSheet
        recipeId="550e8400-e29b-41d4-a716-446655440111"
        plannerDayLabel={null}
        onClose={vi.fn()}
        onUseForDay={vi.fn()}
        onFindSimilar={vi.fn()}
      />
    );

    expect(await screen.findByTestId('action-cooks-mode')).toBeVisible();
    expect(screen.getByTestId('action-cooks-mode')).toHaveTextContent(/Cook/i);
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

    const view = render(
      <StrictMode>
        <RecipeDetailSheet {...props} />
      </StrictMode>
    );
    try {
      await act(async () => finish(recipe));
      expect(screen.getByTestId('recipe-detail-name')).toHaveTextContent(recipe.name);

      view.rerender(
        <StrictMode>
          <RecipeDetailSheet {...props} />
        </StrictMode>
      );
      // A field update remains within the same loaded entry.
      fireEvent.click(screen.getByTestId('action-gear-menu'));
      fireEvent.click(screen.getByTestId('action-edit-recipe'));
    } finally {
      view.unmount();
    }
  });
  it('ignores obsolete reads and renders the current successful retry and replacement', async () => {
    let finish!: (value: unknown) => void;
    mockGetRecipe.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    mockGetRecipe.mockRejectedValueOnce(new Error('offline'));
    mockGetRecipe.mockResolvedValue(recipe);

    const view = render(<RecipeDetailSheet {...props} recipeId="obsolete" />);
    try {
      view.rerender(<RecipeDetailSheet {...props} />);
      await screen.findByTestId('recipe-detail-retry');
      await act(async () => finish({ ...recipe, id: 'obsolete' }));

      fireEvent.click(screen.getByTestId('recipe-detail-retry'));
      expect(await screen.findByTestId('recipe-detail-name')).toHaveTextContent(recipe.name);
      mockGetRecipe.mockResolvedValue({ ...recipe, id: 'replacement' });
      view.rerender(<RecipeDetailSheet {...props} recipeId="replacement" />);
      await screen.findByTestId('recipe-detail-name');
    } finally {
      view.unmount();
    }
  });
  it('requests the original URL with safe window options even when the popup is blocked', async () => {
    mockGetRecipe.mockResolvedValue(recipe);
    const open = vi.spyOn(window, 'open').mockReturnValue(null);

    const view = render(<RecipeDetailSheet {...props} />);
    try {
      fireEvent.click(await screen.findByTestId('action-view-original'));
      expect(open).toHaveBeenCalledWith(recipe.sourceUrl, '_blank', 'noopener,noreferrer');
    } finally {
      view.unmount();

      open.mockRestore();
    }
  });
});

describe('issue Save response handling', () => {
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
  it.each(['saved_manual', 'processing_acknowledged', 'saved_launch_failed', 'unconfirmed'])(
    'preserves business handling for a %s response',
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
      await waitFor(() => expect(mockSaveRecipeImportIssue).toHaveBeenCalledTimes(1));
      view.rerender(<RecipeDetailSheet {...props} />);

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
  it('retains draft after rejection and allows a later explicit recovery', async () => {
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

    fireEvent.click(screen.getByTestId('import-issue-save'));
    await waitFor(() => expect(mockSaveRecipeImportIssue).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByTestId('import-issue-save')).not.toBeInTheDocument());
    view.unmount();
  });

  it('preserves explicit issue resolution', async () => {
    mockGetRecipe.mockResolvedValue(saved);
    mockResolveRecipeImportIssue.mockResolvedValue(recipe);
    const view = await open();
    fireEvent.click(screen.getByTestId('import-issue-resolve'));
    await waitFor(() => expect(mockResolveRecipeImportIssue).toHaveBeenCalledTimes(1));

    view.unmount();
  });
});

describe('complete recipe reading', () => {
  const props = {
    recipeId: '550e8400-e29b-41d4-a716-446655440111',
    plannerDayLabel: 'Wednesday, May 13',
    onClose: vi.fn(),
    onUseForDay: vi.fn(),
    onFindSimilar: vi.fn(),
  };
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.scrollTo = vi.fn();
    useRecipeNotesStore.setState({ drafts: {} });
    mockGetRecipe.mockResolvedValue({
      id: props.recipeId,
      name: 'Family pasta',
      ingredients: ['Pasta', 'Sauce'],
      recipeInstructions: ['Boil water', 'Stir sauce'],
      notes: 'Less chilli for children',
      rating: 2,
      imageCount: 2,
      finishedDishIndex: 0,
      sourceType: 'photos',
      isReady: true,
    });
  });
  it.each([
    [['Boil water', 'Stir sauce']],
    [
      [
        { '@type': 'HowToStep', text: 'Boil water' },
        { '@type': 'HowToStep', text: 'Stir sauce' },
      ],
    ],
    [
      [
        {
          '@type': 'HowToSection',
          name: 'Cook the pasta',
          itemListElement: [{ text: 'Boil water' }],
        },
        {
          '@type': 'HowToSection',
          name: 'Finish the sauce',
          itemListElement: [{ text: 'Stir sauce' }],
        },
      ],
    ],
  ])(
    'reads ordered steps inline without planning, editing or cooking side effects: %j',
    async (instructions) => {
      const fixture = await mockGetRecipe();
      mockGetRecipe.mockResolvedValue({ ...fixture, recipeInstructions: instructions });
      render(<RecipeDetailSheet {...props} />);
      const steps = await screen.findByRole('region', { name: 'Instructions' });
      expect(
        within(steps)
          .getAllByRole('listitem')
          .map((x) => x.querySelector('p')?.textContent)
      ).toEqual(['Boil water', 'Stir sauce']);
      if (
        instructions[0] &&
        typeof instructions[0] === 'object' &&
        'itemListElement' in instructions[0]
      ) {
        expect(
          within(steps)
            .getAllByRole('heading')
            .map((x) => x.textContent)
        ).toEqual(['Instructions', 'Cook the pasta', 'Finish the sauce']);
      }
      expect(mockUpdateRecipe).not.toHaveBeenCalled();
      expect(props.onUseForDay).not.toHaveBeenCalled();
      expect(screen.queryByTestId('cooks-mode')).not.toBeInTheDocument();
    }
  );
  it.each([{ ingredients: ['Pasta', 'Sauce'] }, { ingredients: [] }])(
    'keeps the Ingredients heading and returned ingredient order $ingredients',
    async ({ ingredients }) => {
      const fixture = await mockGetRecipe();
      mockGetRecipe.mockResolvedValue({ ...fixture, ingredients });
      render(<RecipeDetailSheet {...props} />);
      const heading = await screen.findByRole('heading', { name: /^Ingredients$/ });
      const rows = heading.parentElement!.querySelectorAll('ul > li');
      expect(Array.from(rows, (row) => row.textContent)).toEqual(ingredients);
      expect(heading).toBeVisible();
      expect(mockUpdateRecipe).not.toHaveBeenCalled();
      expect(props.onUseForDay).not.toHaveBeenCalled();
    }
  );
  it('explains missing instructions and retains original, reporting and planning access', async () => {
    const fixture = await mockGetRecipe();
    mockGetRecipe.mockResolvedValue({ ...fixture, recipeInstructions: [] });
    render(<RecipeDetailSheet {...props} />);
    expect(await screen.findByText('Instructions are unavailable for this recipe.')).toBeVisible();
    expect(screen.getByTestId('action-view-original')).toBeVisible();
    expect(screen.getByTestId('action-add-to-day')).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Recipe actions' }));
    expect(screen.getByTestId('action-report-import-issue')).toBeVisible();
  });
  it('ends recipe reading with appreciation, writable notes and the unchanged family toggle', async () => {
    render(<RecipeDetailSheet {...props} />);
    const title = await screen.findByTestId('recipe-detail-name');
    const rating = screen.getByTestId('recipe-rating-selector');
    const ingredients = screen.getByRole('heading', { name: 'Ingredients' });
    const instructions = screen.getByRole('region', { name: 'Instructions' });
    const notes = screen.getByRole('region', { name: 'Family notes' });
    const before = (a: Element, b: Element) =>
      expect(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    before(title, rating);
    before(ingredients, instructions);
    before(instructions, rating);
    before(rating, notes);
    before(screen.getByTestId('action-set-goto'), ingredients);
    before(notes, screen.getByTestId('action-toggle-discovery'));
    expect(screen.getByText('Ask the Family')).toBeVisible();
    before(instructions, notes);
    expect(within(rating).getByRole('button', { name: 'Like' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    fireEvent.click(within(rating).getByRole('button', { name: 'Love' }));
    expect(mockUpdateRecipe).toHaveBeenCalledWith(props.recipeId, { rating: 3 });
  });
  const previewFixture = (target = 6, name = 'pasta', basis = 2) => ({
    recipeId: props.recipeId,
    baseServings: basis,
    targetServings: target,
    factor: target / basis,
    version: `${name}-${basis}-${target}`,
    status: 'scaled',
    lines: [
      {
        originalText: `200 g ${name}`,
        name,
        quantity: (200 * target) / basis,
        unitText: 'g',
        status: 'scaled',
        issues: [],
      },
    ],
  });

  it('keeps early preview intent when the automatic planning context first resolves', async () => {
    const fixture = await mockGetRecipe();
    mockGetRecipe.mockResolvedValue({ ...fixture, servings: 2, ingredients: ['200 g pasta'] });
    mockGetIngredientPreview.mockResolvedValue(previewFixture(2));
    mockGetIngredientProjection.mockResolvedValue({
      ...previewFixture(4),
      supperDate: '2026-10-14',
      context: 'proposed',
    });
    const { rerender } = render(<RecipeDetailSheet {...props} planningLoading />);
    await screen.findByTestId('recipe-detail-name');
    fireEvent.click(screen.getByRole('button', { name: 'Preview 2 portions' }));
    await waitFor(() =>
      expect(screen.getByTestId('recipe-ingredient-preview')).toHaveTextContent('200 g pasta')
    );
    rerender(
      <RecipeDetailSheet
        {...props}
        ingredientContext={{ context: 'proposed', supperDate: '2026-10-14' }}
      />
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Preview 2 portions' })).toHaveAttribute(
        'aria-pressed',
        'true'
      )
    );
    expect(screen.getByTestId('recipe-ingredient-preview')).toHaveTextContent('200 g pasta');
    expect(mockUpdateRecipe).not.toHaveBeenCalled();
  });

  it('retains preview intent through equivalent schedule and resume, retiring stale reads on source changes', async () => {
    const fixture = await mockGetRecipe();
    mockGetRecipe.mockResolvedValue({ ...fixture, servings: 2, ingredients: ['200 g pasta'] });
    mockGetIngredientPreview.mockResolvedValue(previewFixture());
    mockGetIngredientProjection.mockResolvedValue({
      ...previewFixture(4),
      supperDate: '2026-10-14',
      context: 'proposed',
    });
    render(
      <RecipeDetailSheet
        {...props}
        ingredientContext={{ context: 'proposed', supperDate: '2026-10-14' }}
      />
    );
    await screen.findByTestId('recipe-detail-name');
    fireEvent.click(screen.getByRole('button', { name: 'Preview 6 portions' }));
    await waitFor(() =>
      expect(screen.getByTestId('recipe-ingredient-preview')).toHaveTextContent('600 g pasta')
    );
    act(() => useWeekStore.setState({ schedule: [...useWeekStore.getState().schedule] }));
    await waitFor(() => expect(mockGetIngredientPreview).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('button', { name: 'Preview 6 portions' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await waitFor(() =>
      expect(screen.getByTestId('recipe-ingredient-preview')).toHaveTextContent('600 g pasta')
    );
    let finishOld!: (data: unknown) => void;
    mockGetIngredientPreview.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOld = resolve;
        })
    );
    act(() => window.dispatchEvent(new Event('focus')));
    await waitFor(() => expect(mockGetIngredientPreview).toHaveBeenCalledTimes(3));
    expect(screen.getByText('Loading preview…')).toBeVisible();
    expect(screen.queryByText('600 g pasta')).not.toBeInTheDocument();
    mockGetIngredientPreview.mockResolvedValueOnce(previewFixture(6, 'sauce', 4));
    mockGetRecipe.mockResolvedValue({ ...fixture, servings: 4, ingredients: ['200 g sauce'] });
    act(() =>
      useWeekStore.setState({
        ingredientProjectionUpdate: { weekStartDate: '2026-10-12', sequence: 123 },
      })
    );
    await waitFor(() =>
      expect(screen.getByTestId('recipe-ingredient-preview')).toHaveTextContent('300 g sauce')
    );
    await act(async () => finishOld(previewFixture()));
    expect(screen.getByTestId('recipe-ingredient-preview')).toHaveTextContent('300 g sauce');
    mockGetIngredientPreview.mockRejectedValueOnce(new Error('Refresh unavailable'));
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(await screen.findByText('Preview could not load.')).toBeVisible();
    expect(screen.queryByText('300 g sauce')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview 6 portions' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    mockGetIngredientPreview.mockResolvedValueOnce(previewFixture(6, 'sauce', 4));
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() =>
      expect(screen.getByTestId('recipe-ingredient-preview')).toHaveTextContent('300 g sauce')
    );
    expect(mockUpdateRecipe).not.toHaveBeenCalled();
    expect(props.onUseForDay).not.toHaveBeenCalled();
  });

  it('resets preview on deliberate date and recipe replacement and never restores late retired requests', async () => {
    const fixture = await mockGetRecipe();
    mockGetRecipe.mockResolvedValue({ ...fixture, servings: 2, ingredients: ['200 g pasta'] });
    mockGetIngredientProjection.mockResolvedValue({
      ...previewFixture(4),
      supperDate: '2026-10-14',
      context: 'proposed',
    });
    let finish!: (data: unknown) => void;
    mockGetIngredientPreview.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const context = { context: 'proposed' as const, supperDate: '2026-10-14' };
    const { rerender } = render(<RecipeDetailSheet {...props} ingredientContext={context} />);
    await screen.findByTestId('recipe-detail-name');
    fireEvent.click(screen.getByRole('button', { name: 'Preview 6 portions' }));
    await waitFor(() => expect(mockGetIngredientPreview).toHaveBeenCalled());
    rerender(
      <RecipeDetailSheet {...props} ingredientContext={{ ...context, supperDate: '2026-10-15' }} />
    );
    await act(async () => finish(previewFixture()));
    expect(screen.getByRole('button', { name: 'Preview 6 portions' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.queryByTestId('recipe-ingredient-preview')).not.toBeInTheDocument();
    rerender(<RecipeDetailSheet {...props} ingredientContext={context} />);
    expect(screen.getByRole('button', { name: 'Preview 6 portions' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    mockGetIngredientPreview.mockResolvedValue(previewFixture());
    fireEvent.click(screen.getByRole('button', { name: 'Preview 6 portions' }));
    await waitFor(() =>
      expect(screen.getByTestId('recipe-ingredient-preview')).toHaveTextContent('600 g pasta')
    );
    const newId = '550e8400-e29b-41d4-a716-446655440333';
    mockGetRecipe.mockResolvedValue({ ...fixture, id: newId, servings: 2 });
    rerender(<RecipeDetailSheet {...props} recipeId={newId} ingredientContext={context} />);
    await screen.findByTestId('recipe-detail-name');
    expect(screen.getByRole('button', { name: 'Preview 6 portions' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('discards preview intent when editing is entered and cancelled', async () => {
    const fixture = await mockGetRecipe();
    mockGetRecipe.mockResolvedValue({ ...fixture, servings: 2, ingredients: ['200 g pasta'] });
    mockGetIngredientPreview.mockResolvedValue(previewFixture());
    render(<RecipeDetailSheet {...props} />);
    await screen.findByTestId('recipe-detail-name');
    fireEvent.click(screen.getByRole('button', { name: 'Preview 6 portions' }));
    await waitFor(() =>
      expect(screen.getByTestId('recipe-ingredient-preview')).toHaveTextContent('600 g pasta')
    );
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    fireEvent.click(screen.getByTestId('action-edit-recipe'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Preview 6 portions' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('previews four portions independently and returns to original quantities', async () => {
    const fixture = await mockGetRecipe();
    mockGetRecipe.mockResolvedValue({ ...fixture, servings: 2, ingredients: ['200 g pasta'] });
    mockGetIngredientPreview.mockResolvedValue({
      recipeId: props.recipeId,
      baseServings: 2,
      targetServings: 4,
      factor: 2,
      version: 'preview-four',
      status: 'scaled',
      lines: [
        {
          originalText: '200 g pasta',
          name: 'pasta',
          quantity: 400,
          unitText: 'g',
          status: 'scaled',
          issues: [],
        },
      ],
    });
    render(<RecipeDetailSheet {...props} />);
    await screen.findByTestId('recipe-detail-name');
    fireEvent.click(screen.getByRole('button', { name: 'Preview 4 portions' }));
    await waitFor(() =>
      expect(screen.getByTestId('recipe-ingredient-preview')).toHaveTextContent('400 g pasta')
    );
    expect(mockGetIngredientPreview).toHaveBeenCalledWith(props.recipeId, 4);
    expect(props.onUseForDay).not.toHaveBeenCalled();
    expect(mockUpdateRecipe).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Original quantities' }));
    expect(screen.queryByTestId('recipe-ingredient-preview')).not.toBeInTheDocument();
    expect(screen.getByText('200 g pasta')).toBeVisible();
    let finishRefresh!: (data: unknown) => void;
    mockGetIngredientPreview.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishRefresh = resolve;
        })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Preview 4 portions' }));
    expect(screen.getByText('Loading preview…')).toBeVisible();
    expect(screen.queryByText('400 g pasta')).not.toBeInTheDocument();
    await act(async () => finishRefresh(previewFixture(4, 'sauce', 4)));
    expect(screen.getByTestId('recipe-ingredient-preview')).toHaveTextContent('200 g sauce');
  });
  it('ignores late preview responses and offers explicit retry without a write', async () => {
    const fixture = await mockGetRecipe();
    mockGetRecipe.mockResolvedValue({ ...fixture, servings: 2, ingredients: ['200 g pasta'] });
    let finishSix!: (data: unknown) => void;
    const data = (target: number) => ({
      recipeId: props.recipeId,
      baseServings: 2,
      targetServings: target,
      factor: target / 2,
      version: `preview-${target}`,
      status: 'scaled',
      lines: [
        {
          originalText: '200 g pasta',
          name: 'pasta',
          quantity: target * 100,
          unitText: 'g',
          status: 'scaled',
          issues: [],
        },
      ],
    });
    mockGetIngredientPreview
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishSix = resolve;
          })
      )
      .mockRejectedValueOnce(new Error('Preview read failed'))
      .mockResolvedValue(data(4));
    render(<RecipeDetailSheet {...props} />);
    await screen.findByTestId('recipe-detail-name');
    fireEvent.click(screen.getByRole('button', { name: 'Preview 6 portions' }));
    await waitFor(() => expect(mockGetIngredientPreview).toHaveBeenCalledWith(props.recipeId, 6));
    fireEvent.click(screen.getByRole('button', { name: 'Preview 4 portions' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Preview could not load.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() =>
      expect(screen.getByTestId('recipe-ingredient-preview')).toHaveTextContent('400 g pasta')
    );
    await act(async () => finishSix(data(6)));
    expect(screen.getByTestId('recipe-ingredient-preview')).toHaveTextContent('400 g pasta');
    expect(screen.getByRole('button', { name: 'Preview 4 portions' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(mockUpdateRecipe).not.toHaveBeenCalled();
  });
  it('offers honest original-yield editing and does not preview an unsaved basis', async () => {
    render(<RecipeDetailSheet {...props} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Set recipe portions' }));
    await waitFor(() => expect(screen.getByTestId('recipe-edit-servings-input')).toHaveFocus());
    fireEvent.change(screen.getByTestId('recipe-edit-servings-input'), { target: { value: '2' } });
    fireEvent.click(screen.getByTestId('recipe-cancel-edits'));
    expect(screen.getByRole('button', { name: 'Set recipe portions' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Preview 4 portions' })).not.toBeInTheDocument();
  });
  it('places GOTO in the toolbar and known readiness and original access on the hero', async () => {
    const fixture = await mockGetRecipe();
    mockGetRecipe.mockResolvedValue({ ...fixture, totalTime: 'PT30M', imageUrl: '/food.webp' });
    render(<RecipeDetailSheet {...props} />);
    await screen.findByTestId('recipe-detail-name');
    expect(
      within(screen.getByTestId('recipe-detail-toolbar')).getByTestId('action-set-goto')
    ).toBeVisible();
    const hero = screen.getByTestId('recipe-detail-hero');
    expect(within(hero).getByTestId('recipe-ready-in')).toHaveTextContent('30');
    expect(within(hero).getByTestId('action-view-original')).toBeVisible();
    expect(screen.queryByTestId('time-cook-btn')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Cook' })).toHaveLength(1);
    expect(
      within(screen.getByTestId('action-add-to-day')).queryByTestId('plan-day-icon')
    ).not.toBeInTheDocument();
  });
  it('omits original access when neither an original URL nor photos exist', async () => {
    const fixture = await mockGetRecipe();
    mockGetRecipe.mockResolvedValue({
      ...fixture,
      sourceType: 'url',
      sourceUrl: null,
      imageCount: 0,
    });
    render(<RecipeDetailSheet {...props} />);
    await screen.findByTestId('recipe-detail-name');
    expect(screen.queryByTestId('action-view-original')).not.toBeInTheDocument();
  });
  it('keeps original access on a neutral hero without inventing missing duration', async () => {
    render(<RecipeDetailSheet {...props} />);
    await screen.findByTestId('recipe-detail-name');
    expect(screen.getByTestId('recipe-detail-hero')).toBeVisible();
    expect(screen.queryByTestId('recipe-ready-in')).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId('recipe-detail-hero')).getByTestId('action-view-original')
    ).toBeVisible();
  });
  it('keeps Find Similar visible in the overview while family participation ends reading', async () => {
    render(<RecipeDetailSheet {...props} />);
    await screen.findByTestId('recipe-detail-name');
    expect(screen.getByTestId('action-find-similar')).toBeVisible();
    fireEvent.click(screen.getByTestId('action-find-similar'));
    expect(props.onFindSimilar).toHaveBeenCalledWith(props.recipeId);
  });
  it('jumps to saved notes with focus while keeping their content', async () => {
    render(<RecipeDetailSheet {...props} />);
    const shortcut = await screen.findByRole('button', { name: 'Family notes' });
    fireEvent.click(shortcut);
    expect(screen.getByTestId('recipe-notes-input')).toHaveFocus();
    expect(screen.getByTestId('recipe-notes-input')).toHaveValue('Less chilli for children');
    expect(mockUpdateRecipe).not.toHaveBeenCalled();
  });
  it('offers directly writable empty notes without an Add button and retains a failed draft shortcut', async () => {
    const fixture = await mockGetRecipe();
    mockGetRecipe.mockResolvedValue({ ...fixture, notes: null });
    const view = render(<RecipeDetailSheet {...props} />);
    expect(await screen.findByTestId('recipe-notes-input')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Add a note' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Family notes' })).not.toBeInTheDocument();
    view.unmount();
    useRecipeNotesStore.setState({
      drafts: {
        [props.recipeId]: {
          text: 'Retained draft',
          acknowledged: '',
          status: 'error',
          revision: 1,
        },
      },
    } as any);
    render(<RecipeDetailSheet {...props} />);
    expect(await screen.findByRole('button', { name: 'Family notes' })).toBeVisible();
    expect(screen.getByTestId('recipe-notes-input')).toHaveValue('Retained draft');
    expect(screen.getByTestId('recipe-notes-retry')).toBeVisible();
  });
  it('opens originals as the active modal and restores source focus without closing detail', async () => {
    render(<RecipeDetailSheet {...props} />);
    const original = await screen.findByTestId('action-view-original');
    original.focus();
    fireEvent.click(original);
    const viewer = screen.getByRole('dialog', { name: 'View Original' });
    expect(viewer).toContainElement(screen.getByTestId('action-close-viewer'));
    expect(screen.getByTestId('action-close-viewer')).toHaveFocus();
    fireEvent.keyDown(viewer, { key: 'Escape' });
    expect(screen.queryByTestId('action-close-viewer')).not.toBeInTheDocument();
    expect(original).toHaveFocus();
    expect(props.onClose).not.toHaveBeenCalled();
  });
});

describe('dated ingredient projection', () => {
  beforeEach(() => vi.clearAllMocks());
  it('retries an initially unavailable proposed projection without stale quantities or writes', async () => {
    const id = '550e8400-e29b-41d4-a716-446655440111';
    mockGetRecipe.mockResolvedValue({
      id,
      name: 'Pasta',
      servings: 2,
      ingredients: ['200 g pasta'],
    });
    mockGetIngredientProjection.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({
      recipeId: id,
      supperDate: '2026-10-16',
      context: 'proposed',
      baseServings: 2,
      targetServings: 6,
      factor: 3,
      version: 'six',
      status: 'scaled',
      editable: true,
      lines: [
        {
          originalText: '200 g pasta',
          name: 'pasta',
          quantity: 600,
          unitText: 'g',
          status: 'scaled',
          issues: [],
        },
      ],
    });
    const onUseForDay = vi.fn();
    render(
      <RecipeDetailSheet
        recipeId={id}
        plannerDayLabel="Friday, October 16"
        ingredientContext={{ context: 'proposed', supperDate: '2026-10-16' }}
        onClose={vi.fn()}
        onUseForDay={onUseForDay}
        onFindSimilar={vi.fn()}
      />
    );
    expect(await screen.findByText('Could not confirm ingredients for this supper.')).toBeVisible();
    expect(screen.queryByText('200 g pasta')).not.toBeInTheDocument();
    expect(screen.queryByText('600 g pasta')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Retry$/ }));
    expect(await screen.findByText('600 g pasta')).toBeVisible();
    expect(mockGetIngredientProjection).toHaveBeenCalledTimes(2);
    expect(mockGetIngredientProjection).toHaveBeenLastCalledWith(id, {
      context: 'proposed',
      supperDate: '2026-10-16',
    });
    expect(mockUpdateRecipe).not.toHaveBeenCalled();
    expect(onUseForDay).not.toHaveBeenCalled();
  });

  it('shows the chosen date and target from the server without changing the original basis', async () => {
    mockGetRecipe.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440111',
      name: 'Pasta',
      ingredients: ['200 g pasta'],
      servings: 2,
      recipeInstructions: ['Add 200 g pasta.'],
    });
    mockGetIngredientProjection.mockResolvedValue({
      recipeId: '550e8400-e29b-41d4-a716-446655440111',
      supperDate: '2026-10-14',
      context: 'proposed',
      targetServings: 4,
      baseServings: 2,
      factor: 2,
      version: 'four',
      status: 'scaled',
      editable: true,
      lines: [
        {
          originalText: '200 g pasta',
          name: 'pasta',
          quantity: 400,
          unitText: 'g',
          status: 'scaled',
          issues: [],
        },
      ],
    });
    const props = {
      recipeId: '550e8400-e29b-41d4-a716-446655440111',
      plannerDayLabel: 'Wednesday, October 14',
      ingredientContext: { context: 'proposed', supperDate: '2026-10-14' },
      onClose: vi.fn(),
      onUseForDay: vi.fn(),
      onFindSimilar: vi.fn(),
    };
    render(<RecipeDetailSheet {...(props as any)} />);
    expect(await screen.findByTestId('recipe-servings')).toHaveTextContent('4 servings');
    expect(screen.getByTestId('recipe-ingredient-projection')).toHaveTextContent('400 g pasta');
    expect(screen.queryByTestId('recipe-portion-context')).not.toBeInTheDocument();
    expect(mockGetIngredientProjection).toHaveBeenCalledWith(
      props.recipeId,
      props.ingredientContext
    );
    expect(screen.queryByTestId('recipe-instruction-limitation')).not.toBeInTheDocument();
    expect(mockUpdateRecipe).not.toHaveBeenCalled();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });
  it('offers a basis correction even when an incomplete recipe has no ingredient lines', async () => {
    mockGetRecipe.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440111',
      name: 'Incomplete',
      ingredients: [],
      servings: null,
      recipeInstructions: [],
    });
    mockGetIngredientProjection.mockResolvedValue({
      recipeId: '550e8400-e29b-41d4-a716-446655440111',
      supperDate: '2026-10-14',
      context: 'proposed',
      targetServings: 4,
      baseServings: null,
      factor: null,
      version: 'incomplete',
      status: 'unresolved',
      editable: true,
      lines: [],
    });
    render(
      <RecipeDetailSheet
        plannerDayLabel="Wednesday, October 14"
        recipeId="550e8400-e29b-41d4-a716-446655440111"
        ingredientContext={{ context: 'proposed', supperDate: '2026-10-14' }}
        onClose={vi.fn()}
        onUseForDay={vi.fn()}
        onFindSimilar={vi.fn()}
      />
    );
    expect(await screen.findByRole('button', { name: 'Set recipe portions' })).toBeVisible();
  });
  it('retires an open dated projection on invalidation and shows current text or failure', async () => {
    const id = '550e8400-e29b-41d4-a716-446655440111';
    const four = {
      recipeId: id,
      supperDate: '2026-10-14',
      context: 'assigned',
      occurrenceId: '550e8400-e29b-41d4-a716-446655440222',
      baseServings: 2,
      targetServings: 4,
      version: 'four',
      status: 'scaled',
      lines: [
        {
          originalText: '200 g pasta',
          name: 'pasta',
          quantity: 400,
          unitText: 'g',
          status: 'scaled',
          issues: [],
        },
      ],
    };
    mockGetIngredientProjection.mockResolvedValue(four);
    render(
      <RecipeDetailSheet
        recipeId={id}
        plannerDayLabel="Wednesday, October 14"
        ingredientContext={{
          context: 'assigned',
          supperDate: '2026-10-14',
          occurrenceId: four.occurrenceId,
        }}
        onClose={vi.fn()}
        onUseForDay={vi.fn()}
        onFindSimilar={vi.fn()}
      />
    );
    expect(await screen.findByText('400 g pasta')).toBeVisible();
    let resolve!: (value: unknown) => void;
    mockGetIngredientProjection.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        })
    );
    act(() => useWeekStore.setState({ schedule: [...useWeekStore.getState().schedule] }));
    await waitFor(() => expect(mockGetIngredientProjection).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('400 g pasta')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    expect(screen.queryByTestId('action-edit-recipe')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    await act(async () =>
      resolve({
        ...four,
        version: 'corrected',
        baseServings: 1,
        lines: [
          {
            originalText: 'current sauce',
            name: 'current sauce',
            quantity: null,
            status: 'unresolved',
            issues: ['stale_source'],
          },
        ],
        status: 'unresolved',
      })
    );
    expect(
      await within(screen.getByTestId('recipe-ingredient-projection')).findByText('current sauce')
    ).toBeVisible();
    expect(screen.queryByText('400 g pasta')).not.toBeInTheDocument();
    fireEvent.click(await screen.findByTestId('action-gear-menu'));
    fireEvent.click(await screen.findByTestId('action-edit-recipe'));
    expect(await screen.findByTestId('recipe-edit-servings-input')).toHaveValue('1');
    expect(screen.getByTestId('recipe-servings')).toHaveTextContent('1 serving');
    expect(screen.getByDisplayValue('current sauce')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    mockGetIngredientProjection.mockRejectedValueOnce(new Error('Captured supper changed'));
    act(() => useWeekStore.setState({ schedule: [...useWeekStore.getState().schedule] }));
    expect(await screen.findByText('Could not confirm ingredients for this supper.')).toBeVisible();
    expect(screen.queryByText('current sauce')).not.toBeInTheDocument();
    expect(mockUpdateRecipe).not.toHaveBeenCalled();
  });
  it('identifies original night-away quantities without claiming the configured usual portions are unset', async () => {
    const id = '550e8400-e29b-41d4-a716-446655440111';
    mockGetIngredientProjection.mockResolvedValue({
      recipeId: id,
      supperDate: '2026-10-14',
      context: 'assigned',
      occurrenceId: '550e8400-e29b-41d4-a716-446655440222',
      baseServings: 2,
      targetServings: null,
      factor: null,
      status: 'original',
      editable: false,
      version: 'original-night-away',
      lines: [
        {
          originalText: '200 g pasta',
          name: 'pasta',
          quantity: 200,
          unitText: 'g',
          status: 'original',
          issues: [],
        },
      ],
    });
    render(
      <RecipeDetailSheet
        recipeId={id}
        plannerDayLabel="Wednesday, October 14"
        ingredientContext={{
          context: 'assigned',
          supperDate: '2026-10-14',
          occurrenceId: '550e8400-e29b-41d4-a716-446655440222',
        }}
        onClose={vi.fn()}
        onUseForDay={vi.fn()}
        onFindSimilar={vi.fn()}
      />
    );
    expect(await screen.findByText('Original recipe quantities are shown.')).toBeVisible();
    expect(
      screen.queryByText('Usual portions are not set. Original quantities are shown.')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('recipe-servings')).toHaveTextContent('2 servings');
    expect(screen.getByTestId('recipe-ingredient-projection')).toHaveTextContent('200 g pasta');
  });
});
