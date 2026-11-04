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
    'shows the read-only %s serving basis inside the Ingredients heading',
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
        name: `Ingredients ${servings} ${servings === 1 ? 'serving' : 'servings'}`,
      });
      expect(heading.querySelector('button, input, [tabindex]')).toBeNull();
      expect(
        screen.getAllByText(`${servings} ${servings === 1 ? 'serving' : 'servings'}`)
      ).toHaveLength(1);
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
    await screen.findByRole('heading', { name: 'Ingredients 4 servings' });
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
