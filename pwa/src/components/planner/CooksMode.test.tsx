import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

vi.mock('next/image', () => ({
  default: ({ fill: _fill, priority: _priority, unoptimized: _unoptimized, ...props }: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt} />
  ),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAnimation: () => ({ start: vi.fn() }),
}));

const routerMocks = vi.hoisted(() => ({ push: vi.fn() }));
const cookingMocks = vi.hoisted(() => ({ markCooked: vi.fn() }));

vi.mock('@/store/todayStore', () => ({
  useTodayStore: { getState: () => cookingMocks },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => routerMocks,
}));

vi.mock('@/locales', () => ({
  t: (_key: string, fallback: string) => fallback,
  tWithVars: (_key: string, fallback: string, vars: Record<string, string | number>) =>
    Object.entries(vars).reduce(
      (value, [key, replacement]) => value.replace(`{{${key}}}`, String(replacement)),
      fallback
    ),
}));

vi.mock('@/components/ui/SolarLoader', () => ({
  SolarLoader: () => <div>Loading...</div>,
}));

vi.mock('@/lib/imageUtils', () => ({
  getImageUrl: (value: string) => value,
}));

const getRecipeMock = vi.fn();
const updateRecipeMock = vi.fn();
const saveRecipeImportIssueMock = vi.fn();
const resolveRecipeImportIssueMock = vi.fn();

vi.mock('@/lib/api/recipes', () => ({
  getRecipe: (...args: any[]) => getRecipeMock(...args),
  updateRecipe: (...args: any[]) => updateRecipeMock(...args),
  saveRecipeImportIssue: (...args: any[]) => saveRecipeImportIssueMock(...args),
  resolveRecipeImportIssue: (...args: any[]) => resolveRecipeImportIssueMock(...args),
}));

vi.mock('@/components/recipes/RecipeDetailSheet', () => ({
  RecipeDetailSheet: ({ recipeId }: { recipeId: string }) => (
    <div data-testid="recipe-detail-sheet">Recipe Detail for {recipeId}</div>
  ),
}));

import { CooksMode } from './CooksMode';
import { usePlannerStore } from '@/store/plannerStore';
import { useFamilyStore } from '@/store/familyStore';

const member = {
  id: '11111111-1111-4111-8111-111111111119',
  name: 'Alex',
  browseViewMode: 'stack' as const,
  preferredLanguage: 'en',
  cookingViewMode: 'step-by-step' as const,
};

function setCookingView(cookingViewMode: 'step-by-step' | 'all-steps' | null) {
  useFamilyStore.setState({
    selectedFamilyMemberId: member.id,
    familyMembers: [{ ...member, cookingViewMode }],
  });
}

const originalUpdateMemberPreferences = useFamilyStore.getState().updateMemberPreferences;

describe('CooksMode', () => {
  beforeEach(() => {
    getRecipeMock.mockReset();
    updateRecipeMock.mockReset();
    saveRecipeImportIssueMock.mockReset();
    resolveRecipeImportIssueMock.mockReset();
    routerMocks.push.mockReset();
    cookingMocks.markCooked.mockReset().mockResolvedValue(undefined);
    usePlannerStore.setState({ cookProgress: {} });
    setCookingView('step-by-step');
    useFamilyStore.setState({ updateMemberPreferences: originalUpdateMemberPreferences });
  });

  it('consults original photos without losing an unsaved draft, bookmark, scroll or ingredient checks', async () => {
    const id = 'recipe-original';
    setCookingView('all-steps');
    getRecipeMock.mockResolvedValue({
      id,
      name: 'Pasta',
      sourceType: 'photos',
      imageCount: 3,
      finishedDishIndex: 1,
      ingredients: ['Pasta'],
      recipeInstructions: ['Boil water.', 'Cook pasta.'],
    });
    const onClose = vi.fn();
    render(<CooksMode recipe={{ id, name: 'Pasta', image: '/pasta.jpg' }} onClose={onClose} />);
    fireEvent.click((await screen.findAllByTestId('ingredient-toggle'))[0]);
    fireEvent.click(screen.getByTestId('cooks-mode-step-next'));
    act(() => usePlannerStore.getState().setCookProgress(id, 2));
    const surface = screen.getByTestId('cooks-mode-instructions');
    surface.scrollTop = 137;
    fireEvent.click(screen.getByTestId('single-page-edit-step-2'));
    const editor = screen.getByRole('textbox');
    fireEvent.change(editor, { target: { value: 'My unsaved correction' } });
    const original = screen.getByTestId('cooks-mode-original');
    original.focus();
    fireEvent.click(original);
    const dialog = screen.getByRole('dialog', { name: 'View Original' });
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', `/api/recipes/${id}/original/1`);
    expect(screen.getByTestId('cooks-mode-overlay')).toHaveAttribute('inert');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(original).toHaveFocus();
    expect(editor).toHaveValue('My unsaved correction');
    expect(surface.scrollTop).toBe(137);
    expect(usePlannerStore.getState().cookProgress[id]).toBe(2);
    expect(onClose).not.toHaveBeenCalled();
    expect(updateRecipeMock).not.toHaveBeenCalled();
    expect(cookingMocks.markCooked).not.toHaveBeenCalled();
    expect(getRecipeMock).toHaveBeenCalledOnce();
    fireEvent.click(original);
    expect(within(screen.getByRole('dialog')).getByRole('img')).toHaveAttribute(
      'src',
      `/api/recipes/${id}/original/1`
    );
    fireEvent.click(screen.getByTestId('action-close-viewer'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ingredients' }));
    expect(screen.getAllByTestId('ingredient-toggle')[0]).toHaveAttribute('aria-checked', 'true');
  });

  it('keeps the recipe photo and direct controls separate from reading position', async () => {
    getRecipeMock.mockResolvedValue({
      id: 'recipe-1',
      sourceType: 'photos',
      imageCount: 1,
      finishedDishIndex: -1,
      recipeInstructions: ['Cook pasta.'],
    });
    render(
      <CooksMode
        recipe={{ id: 'recipe-1', name: 'Pasta', image: '/pasta.jpg' }}
        onClose={vi.fn()}
      />
    );
    await screen.findByTestId('cooks-mode-original');
    const hero = screen.getByTestId('cooks-mode-hero');
    expect(within(hero).getByRole('img', { name: 'Pasta' })).toHaveAttribute('src', '/pasta.jpg');
    expect(within(hero).getByTestId('cooking-view-toggle')).toBeInTheDocument();
    expect(within(hero).queryByTestId('cooks-mode-step-indicator')).toBeNull();
    expect(
      within(screen.getByTestId('cooking-reading-context')).getByTestId('cooks-mode-step-indicator')
    ).toHaveTextContent('Check & Prep');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it.each([
    ['photos', null, 0],
    ['synthesized', null, 0],
    ['url', null, 0],
  ])('hides Original without a destination (%s)', async (sourceType, sourceUrl, imageCount) => {
    getRecipeMock.mockResolvedValue({
      id: 'recipe-1',
      sourceType,
      sourceUrl,
      imageCount,
      recipeInstructions: ['Cook.'],
    });
    render(<CooksMode recipe={{ id: 'recipe-1', name: 'Pasta', image: '' }} onClose={vi.fn()} />);
    await screen.findByRole('heading', { name: 'Check & Prep' });
    expect(screen.queryByTestId('cooks-mode-original')).toBeNull();
  });

  it('opens the website externally and uses images when its URL is absent', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    getRecipeMock.mockResolvedValue({
      id: 'recipe-1',
      sourceType: 'url',
      sourceUrl: 'https://example.test/soup',
      imageCount: 0,
      recipeInstructions: [],
    });
    const { rerender } = render(
      <CooksMode recipe={{ id: 'recipe-1', name: 'Soup', image: '' }} onClose={vi.fn()} />
    );
    fireEvent.click(await screen.findByTestId('cooks-mode-original'));
    expect(open).toHaveBeenCalledWith('https://example.test/soup', '_blank', 'noopener,noreferrer');
    expect(screen.queryByRole('dialog')).toBeNull();
    getRecipeMock.mockResolvedValue({
      id: 'recipe-2',
      sourceType: 'url',
      sourceUrl: null,
      imageCount: 2,
      finishedDishIndex: -1,
      recipeInstructions: [],
    });
    rerender(<CooksMode recipe={{ id: 'recipe-2', name: 'Soup', image: '' }} onClose={vi.fn()} />);
    fireEvent.click(await screen.findByTestId('cooks-mode-original'));
    expect(within(screen.getByRole('dialog')).getByRole('img')).toHaveAttribute(
      'src',
      '/api/recipes/recipe-2/original/0'
    );
    expect(open).toHaveBeenCalledOnce();
    open.mockRestore();
  });

  it('blocks Original while an instruction save is pending, then retains failed-draft recovery', async () => {
    let reject!: (error: Error) => void;
    updateRecipeMock.mockReturnValue(
      new Promise((_resolve, fail) => {
        reject = fail;
      })
    );
    setCookingView('all-steps');
    getRecipeMock.mockResolvedValue({
      id: 'recipe-1',
      sourceType: 'photos',
      imageCount: 1,
      finishedDishIndex: -1,
      recipeInstructions: ['Cook.'],
    });
    render(<CooksMode recipe={{ id: 'recipe-1', name: 'Pasta', image: '' }} onClose={vi.fn()} />);
    await screen.findByTestId('cooks-mode-original');
    fireEvent.click(screen.getByTestId('cooks-mode-step-next'));
    fireEvent.click(screen.getByTestId('single-page-edit-step-1'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByTestId('cooks-mode-original')).toBeDisabled();
    await act(async () => reject(new Error('offline')));
    expect(screen.getByTestId('cooks-mode-original')).toBeEnabled();
    expect(screen.getByRole('textbox')).toHaveValue('My draft');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('blocks Original during preference writes and pending cooking completion without replaying it', async () => {
    let save!: (value: unknown) => void;
    let failCompletion!: (error: Error) => void;
    useFamilyStore.setState({
      updateMemberPreferences: vi.fn().mockReturnValue(
        new Promise((resolve) => {
          save = resolve;
        })
      ),
    });
    cookingMocks.markCooked.mockReturnValue(
      new Promise((_resolve, reject) => {
        failCompletion = reject;
      })
    );
    getRecipeMock.mockResolvedValue({
      id: 'recipe-1',
      sourceType: 'photos',
      imageCount: 1,
      finishedDishIndex: -1,
      recipeInstructions: [],
    });
    render(<CooksMode recipe={{ id: 'recipe-1', name: 'Pasta', image: '' }} onClose={vi.fn()} />);
    const original = await screen.findByTestId('cooks-mode-original');
    fireEvent.click(screen.getByRole('button', { name: 'All steps' }));
    expect(original).toBeDisabled();
    fireEvent.click(original);
    await act(async () => save({ ...member, cookingViewMode: 'all-steps' }));
    expect(original).toBeEnabled();
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Mark recipe as cooked' }));
    expect(original).toBeDisabled();
    await act(async () => failCompletion(new Error('offline')));
    expect(original).toBeEnabled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('blocks Original during a cooking quality-report write and restores it afterwards', async () => {
    const recipe = {
      id: 'recipe-1',
      name: 'Pasta',
      canReimport: true,
      sourceType: 'photos',
      imageCount: 1,
      finishedDishIndex: -1,
      ingredients: ['Pasta'],
      recipeInstructions: ['Cook.'],
    };
    let finish!: (value: unknown) => void;
    getRecipeMock.mockResolvedValue(recipe);
    saveRecipeImportIssueMock.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    render(<CooksMode recipe={{ id: 'recipe-1', name: 'Pasta', image: '' }} onClose={vi.fn()} />);
    const original = await screen.findByTestId('cooks-mode-original');
    fireEvent.click(screen.getByTestId('cooks-mode-report-ingredients'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }));
    expect(original).toBeDisabled();
    await act(async () => finish({ recipe, reimportStarted: false }));
    expect(original).toBeEnabled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows a failed read honestly and retries real steps', async () => {
    getRecipeMock.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({
      id: 'recipe-1',
      ingredients: [],
      recipeInstructions: ['Actual instruction'],
    });
    render(<CooksMode recipe={{ id: 'recipe-1', name: 'Pasta', image: '' }} onClose={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load cooking instructions.'
    );
    expect(
      screen.queryByText('Gather everything you need. Clear the counter and get ready to cook!')
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark recipe as cooked' })).toBeEnabled();
    fireEvent.click(screen.getByTestId('cooks-mode-content-retry'));
    await screen.findByRole('heading', { name: 'Check & Prep' });
    fireEvent.click(screen.getByTestId('cooks-mode-step-next'));
    expect(await screen.findByText('Actual instruction')).toBeVisible();
  });

  it.each([null, [], ['   '], [{ text: '' }]])(
    'explains absent or unusable instructions %j without invented steps',
    async (recipeInstructions) => {
      getRecipeMock.mockResolvedValue({ id: 'recipe-1', canReimport: false, recipeInstructions });
      render(<CooksMode recipe={{ id: 'recipe-1', name: 'Pasta', image: '' }} onClose={vi.fn()} />);
      expect(await screen.findByTestId('cooks-mode-no-steps')).toHaveTextContent(
        'Cooking instructions are not available for this recipe.'
      );
      expect(screen.queryByRole('button', { name: 'Report steps' })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Open recipe details' }));
      expect(screen.getByTestId('recipe-detail-sheet')).toHaveTextContent('recipe-1');
    }
  );

  it('offers contextual reporting and acknowledges background reimport while keeping completion available', async () => {
    const recipe = { id: 'recipe-1', canReimport: true, ingredients: [], recipeInstructions: [] };
    getRecipeMock.mockResolvedValue(recipe);
    saveRecipeImportIssueMock.mockResolvedValue({
      recipe: {
        ...recipe,
        importIssue: {
          reasons: ['steps'],
          note: 'Missing steps',
          status: 'reported',
          isReimporting: true,
        },
      },
      reimportStarted: true,
      reimportLaunchFailed: false,
    });
    render(<CooksMode recipe={{ id: 'recipe-1', name: 'Pasta', image: '' }} onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Report steps' }));
    expect(screen.getByRole('button', { name: 'Steps' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByTestId('import-issue-note-disclosure'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Missing steps' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Reimporting in background')).toBeVisible();
    expect(saveRecipeImportIssueMock).toHaveBeenCalledWith('recipe-1', {
      reasons: ['steps'],
      note: 'Missing steps',
    });
    expect(screen.getByRole('button', { name: 'Mark recipe as cooked' })).toBeEnabled();
    expect(screen.getByTestId('cooks-mode-content-retry')).toBeEnabled();
    getRecipeMock.mockResolvedValueOnce({
      ...recipe,
      recipeInstructions: ['Recovered instruction'],
    });
    fireEvent.click(screen.getByTestId('cooks-mode-content-retry'));
    await screen.findByRole('heading', { name: 'Check & Prep' });
    fireEvent.click(screen.getByTestId('cooks-mode-step-next'));
    expect(await screen.findByText('Recovered instruction')).toBeVisible();
  });

  it('keeps existing completion failure recovery when instructions are missing', async () => {
    getRecipeMock.mockResolvedValue({ id: 'recipe-1', recipeInstructions: [] });
    cookingMocks.markCooked
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(undefined);
    render(<CooksMode recipe={{ id: 'recipe-1', name: 'Pasta', image: '' }} onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Mark recipe as cooked' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not save cooking completion.'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Mark recipe as cooked' }));
    await waitFor(() => expect(cookingMocks.markCooked).toHaveBeenCalledTimes(2));
  });

  it('ignores a departed identity response after the next recipe succeeds', async () => {
    let finish!: (value: unknown) => void;
    getRecipeMock
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          })
      )
      .mockResolvedValueOnce({ id: 'recipe-2', recipeInstructions: [] });
    const view = render(
      <CooksMode recipe={{ id: 'recipe-1', name: 'Old', image: '' }} onClose={vi.fn()} />
    );
    view.rerender(
      <CooksMode recipe={{ id: 'recipe-2', name: 'New', image: '' }} onClose={vi.fn()} />
    );
    await screen.findByTestId('cooks-mode-no-steps');
    await act(async () => finish({ id: 'recipe-1', recipeInstructions: ['Departed instruction'] }));
    expect(screen.getByTestId('cooks-mode-no-steps')).toBeVisible();
    expect(screen.getByTestId('cooks-mode-recipe-name')).toHaveTextContent('New');
  });

  it('defaults missing cooking preferences to All steps without a feature snapshot', async () => {
    const id = '11111111-1111-4111-8111-111111111118';
    setCookingView(null);
    getRecipeMock.mockResolvedValue({ id, recipeInstructions: ['Boil water', 'Cook pasta'] });

    render(<CooksMode recipe={{ id, name: 'Pasta', image: '' }} onClose={vi.fn()} />);

    const allStepsButton = await screen.findByRole('button', { name: 'All steps' });
    expect(allStepsButton).toHaveAttribute('aria-pressed', 'true');
    expect(allStepsButton).toHaveTextContent('');
    expect(allStepsButton.querySelector('.lucide-file')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cooks-mode-step-next'));
    expect(screen.getByTestId('all-steps-recipe-list')).toHaveTextContent('Cook pasta');
  });

  it('switches views locally and persists only for the selected member', async () => {
    const id = '11111111-1111-4111-8111-111111111117';
    const updateMemberPreferences = vi.fn().mockResolvedValue({
      ...member,
      cookingViewMode: 'all-steps',
    });
    useFamilyStore.setState({ updateMemberPreferences });
    getRecipeMock.mockResolvedValue({ id, recipeInstructions: ['Boil water', 'Cook pasta'] });
    render(<CooksMode recipe={{ id, name: 'Pasta', image: '' }} onClose={vi.fn()} />);

    const stepByStepButton = await screen.findByRole('button', { name: 'Step by step' });
    const allStepsButton = screen.getByRole('button', { name: 'All steps' });
    expect(stepByStepButton).toHaveAttribute('aria-pressed', 'true');
    expect(stepByStepButton.querySelector('.lucide-layers-3')).toBeInTheDocument();
    expect(screen.queryByText('Remembered for Alex')).not.toBeInTheDocument();
    fireEvent.click(allStepsButton);

    expect(updateMemberPreferences).toHaveBeenCalledWith(member.id, {
      cookingViewMode: 'all-steps',
    });
    expect(allStepsButton).toHaveAttribute('aria-pressed', 'true');
    expect(stepByStepButton).toHaveAttribute('aria-pressed', 'false');
    expect(allStepsButton.querySelector('.lucide-file')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cooks-mode-step-next'));
    expect(screen.getByTestId('all-steps-recipe-list')).toHaveTextContent('Cook pasta');
    expect(
      within(screen.getByTestId('cooks-mode-hero')).getByTestId('cooking-view-toggle')
    ).toBeInTheDocument();
  });

  it('keeps a session view and offers retry when preference persistence fails', async () => {
    const id = '11111111-1111-4111-8111-111111111116';
    const updateMemberPreferences = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValue({
        ...member,
        cookingViewMode: 'all-steps',
      });
    useFamilyStore.setState({ updateMemberPreferences });
    getRecipeMock.mockResolvedValue({ id, recipeInstructions: ['Boil water'] });
    render(<CooksMode recipe={{ id, name: 'Pasta', image: '' }} onClose={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: 'All steps' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save for Alex");
    expect(screen.getByRole('button', { name: 'All steps' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(updateMemberPreferences).toHaveBeenCalledTimes(2));
  });

  it.each([false, true])(
    'records the viewed recipe on completion without a parent callback (single page: %s)',
    async (singlePage) => {
      const id = '550e8400-e29b-41d4-a716-446655440102';
      getRecipeMock.mockResolvedValue({ id, name: 'Lunch', recipeInstructions: ['Cook lunch.'] });
      if (singlePage) {
        setCookingView('all-steps');
      }
      const onClose = vi.fn();
      render(<CooksMode recipe={{ id, name: 'Lunch', image: '' }} onClose={onClose} />);
      fireEvent.click(await screen.findByTestId('cooks-mode-step-next'));
      await screen.findByText('Cook lunch.');
      fireEvent.click(screen.getByTestId('cooks-mode-step-next'));
      await waitFor(() => expect(cookingMocks.markCooked).toHaveBeenCalledWith(id));
      await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    }
  );

  it('keeps cooking open and shows an error if saving completion fails', async () => {
    const id = '550e8400-e29b-41d4-a716-446655440102';
    getRecipeMock.mockResolvedValue({ id, recipeInstructions: ['Cook lunch.'] });
    cookingMocks.markCooked.mockRejectedValueOnce(new Error('Saving failed'));
    const onClose = vi.fn();
    render(<CooksMode recipe={{ id, name: 'Lunch', image: '' }} onClose={onClose} />);
    fireEvent.click(await screen.findByTestId('cooks-mode-step-next'));
    await screen.findByText('Cook lunch.');
    fireEvent.click(screen.getByTestId('cooks-mode-step-next'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save cooking completion');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('returns to ingredients without losing checks, the step bookmark, or the reading offset', async () => {
    const id = '11111111-1111-4111-8111-111111111113';
    getRecipeMock.mockResolvedValue({
      id,
      ingredients: ['Pasta', 'Butter'],
      recipeInstructions: ['Boil water.', 'Cook pasta.'],
    });
    setCookingView('all-steps');
    const onCooked = vi.fn();
    render(
      <CooksMode recipe={{ id, name: 'Pasta', image: '' }} onClose={vi.fn()} onCooked={onCooked} />
    );
    const ingredient = (await screen.findAllByTestId('ingredient-toggle'))[0];
    fireEvent.click(ingredient);
    fireEvent.click(screen.getByTestId('cooks-mode-step-next'));
    const scroll = screen.getByTestId('cooks-mode-instructions');
    scroll.scrollTop = 137;
    act(() => usePlannerStore.getState().setCookProgress(id, 2));
    fireEvent.click(screen.getByRole('button', { name: 'Ingredients' }));
    expect(scroll.scrollTop).toBe(0);
    expect(screen.getByRole('heading', { name: 'Check & Prep' })).toBeInTheDocument();
    expect(screen.getAllByTestId('ingredient-toggle')[0]).toHaveAttribute('aria-checked', 'true');
    expect(usePlannerStore.getState().cookProgress[id]).toBe(2);
    fireEvent.click(screen.getByRole('button', { name: /Resume steps/ }));
    expect(screen.getByTestId('all-steps-recipe-list')).toBeInTheDocument();
    expect(scroll.scrollTop).toBe(137);
    expect(screen.getByTestId('cooks-mode-step-indicator')).toHaveTextContent('2 / 2');
    expect(onCooked).not.toHaveBeenCalled();
    expect(getRecipeMock).toHaveBeenCalledOnce();
  });

  it('renders section context, supplied headings, and scan-friendly source text without changing edits', async () => {
    const id = '11111111-1111-4111-8111-111111111114';
    const text =
      '1. Verser 60 ml (1/4 tasse) de pâte. Cuire environ 1 minute. Retourner et cuire 30 secondes.';
    const recipeInstructions = [
      {
        '@type': 'HowToSection',
        name: 'Crêpes de base',
        itemListElement: [
          { name: 'Cuire les crêpes', text },
          { name: '', text: 'Réserver au chaud. Couvrir.\n\nServir avec la salade.' },
        ],
      },
    ];
    getRecipeMock.mockResolvedValue({ id, recipeInstructions });
    setCookingView('all-steps');
    render(<CooksMode recipe={{ id, name: 'Crêpes', image: '' }} onClose={vi.fn()} />);
    fireEvent.click(await screen.findByTestId('cooks-mode-step-next'));
    expect(screen.getAllByText('Crêpes de base')).toHaveLength(1);
    const row = screen.getByTestId('single-page-step-1');
    expect(within(row).getByRole('heading', { name: 'Cuire les crêpes' })).toBeInTheDocument();
    const body = within(row).getByTestId('single-page-step-body-1');
    expect(body.textContent).toBe(text);
    expect(row.textContent).toBe(`Crêpes de baseCuire les crêpes${text}`);
    expect(body.querySelectorAll('p')).toHaveLength(1);
    expect(body.querySelectorAll('strong')).toHaveLength(0);
    const untitled = screen.getByTestId('single-page-step-2');
    expect(within(untitled).queryByRole('heading')).not.toBeInTheDocument();
    const paragraphs = within(untitled)
      .getByTestId('single-page-step-body-2')
      .querySelectorAll('p');
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]).toHaveTextContent('Réserver au chaud. Couvrir.');
    expect(paragraphs[1]).toHaveTextContent('Servir avec la salade.');
    fireEvent.click(within(row).getByRole('button', { name: 'Edit step 1' }));
    expect(screen.getByLabelText('Edit step 1 instructions')).toHaveValue(text);
    expect(screen.getByRole('button', { name: 'Ingredients' })).toBeDisabled();
    for (const label of ['Step by step', 'All steps']) {
      expect(screen.getByRole('button', { name: label })).toBeDisabled();
      expect(screen.getByRole('button', { name: label })).toHaveAttribute(
        'title',
        'Save or cancel your edit to change view.'
      );
    }
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Ingredients' })).toBeEnabled();
  });

  it('keeps preparation and then renders every editable step on one page when enabled', async () => {
    getRecipeMock.mockResolvedValue({
      id: 'recipe-1',
      name: 'Pasta Night',
      ingredients: ['Pasta'],
      recipeInstructions: ['Boil water', 'Cook pasta'],
    });
    updateRecipeMock.mockResolvedValue(undefined);
    setCookingView('all-steps');

    render(
      <CooksMode recipe={{ id: 'recipe-1', name: 'Pasta Night', image: '' }} onClose={vi.fn()} />
    );

    expect(await screen.findByRole('heading', { name: 'Check & Prep' })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cooks-mode-step-next'));
    expect(await screen.findByTestId('all-steps-recipe-list')).toHaveTextContent('Boil water');
    expect(screen.getByTestId('all-steps-recipe-list')).toHaveTextContent('Cook pasta');
    expect(screen.queryByRole('heading', { name: /^Step \d+$/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit step 2' }));
    fireEvent.change(screen.getByLabelText('Edit step 2 instructions'), {
      target: { value: 'Cook gently' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(updateRecipeMock).toHaveBeenCalledWith('recipe-1', {
        recipeInstructions: ['Boil water', 'Cook gently'],
      })
    );
  });

  it('tracks single-page reading position without remounting rows or completing cooking', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    // Use a consistent structured representation, including a redundant source title.
    getRecipeMock.mockResolvedValue({
      id,
      recipeInstructions: [
        { name: 'Step 1', text: 'Boil water' },
        { name: 'Simmer gently', text: 'Cook pasta' },
      ],
    });
    setCookingView('all-steps');
    const onCooked = vi.fn();
    const { unmount } = render(
      <CooksMode recipe={{ id, name: 'Pasta', image: '' }} onClose={vi.fn()} onCooked={onCooked} />
    );
    fireEvent.click(await screen.findByTestId('cooks-mode-step-next'));
    expect(screen.queryByRole('heading', { name: 'Step 1' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Cooking steps' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Simmer gently' })).toBeInTheDocument();
    expect(screen.getByTestId('cooks-mode-step-next')).toHaveTextContent('Cooked');
    expect(screen.getByTestId('cooks-mode-step-next')).toHaveAccessibleName(
      'Mark recipe as cooked'
    );
    expect(screen.getByTestId('cooks-mode-step-next').querySelector('svg')).toBeNull();
    const scroll = screen.getByTestId('cooks-mode-instructions');
    const row = screen.getByTestId('single-page-step-2');
    vi.spyOn(scroll, 'getBoundingClientRect').mockReturnValue({ top: 0 } as DOMRect);
    vi.spyOn(screen.getByTestId('single-page-step-1'), 'getBoundingClientRect').mockReturnValue({
      top: -300,
    } as DOMRect);
    const secondRect = vi
      .spyOn(row, 'getBoundingClientRect')
      .mockReturnValue({ top: 0 } as DOMRect);
    fireEvent.scroll(scroll);
    expect(screen.getByTestId('cooks-mode-step-indicator')).toHaveTextContent('2 / 2');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
    expect(screen.getByTestId('single-page-step-2')).toBe(row);
    expect(onCooked).not.toHaveBeenCalled();
    secondRect.mockReturnValue({ top: 300 } as DOMRect);
    fireEvent.scroll(scroll);
    expect(screen.getByTestId('cooks-mode-step-indicator')).toHaveTextContent('1 / 2');
    fireEvent.click(screen.getByTestId('single-page-edit-step-2'));
    const editor = screen.getByLabelText('Edit step 2 instructions');
    fireEvent.change(editor, { target: { value: 'Keep this draft' } });
    secondRect.mockReturnValue({ top: 0 } as DOMRect);
    fireEvent.scroll(scroll);
    expect(screen.getByLabelText('Edit step 2 instructions')).toBe(editor);
    expect(editor).toHaveValue('Keep this draft');
    expect(usePlannerStore.getState().cookProgress[id]).toBe(2);
    unmount();
    render(
      <CooksMode recipe={{ id, name: 'Pasta', image: '' }} onClose={vi.fn()} onCooked={onCooked} />
    );
    expect(await screen.findByTestId('cooks-mode-step-indicator')).toHaveTextContent('2 / 2');
    vi.useFakeTimers();
    try {
      fireEvent.click(screen.getByTestId('cooks-mode-step-next'));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });
      expect(onCooked).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it('preserves focused headings, Next/Back navigation, and ignores scrolling with the flag off', async () => {
    const id = '11111111-1111-4111-8111-111111111112';
    getRecipeMock.mockResolvedValue({ id, recipeInstructions: ['Boil water', 'Cook pasta'] });
    render(<CooksMode recipe={{ id, name: 'Pasta', image: '' }} onClose={vi.fn()} />);
    fireEvent.click(await screen.findByTestId('cooks-mode-step-next'));
    expect(screen.getByRole('heading', { name: 'Step 1' })).toBeInTheDocument();
    expect(screen.getByTestId('cooks-mode-step-next')).toHaveTextContent('Next');
    fireEvent.scroll(screen.getByTestId('cooks-mode-instructions'));
    expect(screen.getByTestId('cooks-mode-step-indicator')).toHaveTextContent('1 / 2');
    fireEvent.click(screen.getByTestId('cooks-mode-step-next'));
    expect(screen.getByRole('heading', { name: 'Step 2' })).toBeInTheDocument();
    expect(screen.getByTestId('cooks-mode-step-next')).toHaveTextContent('Cooked');
    expect(screen.getByTestId('cooks-mode-step-next')).toHaveAccessibleName(
      'Mark recipe as cooked'
    );
    expect(screen.getByTestId('cooks-mode-step-next').querySelector('svg')).toBeNull();
    fireEvent.click(screen.getByTestId('cooks-mode-step-prev'));
    expect(screen.getByTestId('cooks-mode-step-text')).toHaveTextContent('Boil water');
    expect(screen.queryByTestId('all-steps-recipe-list')).not.toBeInTheDocument();
  });

  it('completes Cook Mode in place so the Home cooked state is not remounted', async () => {
    getRecipeMock.mockResolvedValue({
      id: 'recipe-1',
      name: 'Pasta Night',
      recipeInstructions: [{ name: 'Cook Pasta', text: 'Cook until al dente.' }],
    });
    const onCooked = vi.fn();
    const onClose = vi.fn();

    render(
      <CooksMode
        recipe={{ id: 'recipe-1', name: 'Pasta Night', image: '/img/pasta.jpg' }}
        onCooked={onCooked}
        onClose={onClose}
      />
    );

    const nextButton = await screen.findByTestId('cooks-mode-step-next');
    fireEvent.click(nextButton);
    await screen.findByRole('heading', { name: 'Cook Pasta' });

    vi.useFakeTimers();
    try {
      fireEvent.click(nextButton);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });

      expect(onCooked).toHaveBeenCalledOnce();
      expect(onClose).toHaveBeenCalledOnce();
      expect(routerMocks.push).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('reports Ingredients from Check & Prep without losing checked ingredients or cook progress', async () => {
    const recipe = {
      id: 'recipe-1',
      name: 'Pasta Night',
      canReimport: true,
      importIssue: null,
      ingredients: ['Pasta', 'Tomatoes'],
      recipeInstructions: [{ name: 'Boil Water', text: 'Boil the water.' }],
    };
    getRecipeMock.mockResolvedValue(recipe);
    saveRecipeImportIssueMock.mockResolvedValue({
      recipe: {
        ...recipe,
        importIssue: { reasons: ['ingredients', 'steps'], note: null, status: 'reported' },
      },
      reimportStarted: false,
      reimportLaunchFailed: false,
      importId: null,
    });

    render(
      <CooksMode
        recipe={{ id: 'recipe-1', name: 'Pasta Night', image: '/img/pasta.jpg' }}
        onClose={vi.fn()}
      />
    );

    const firstIngredient = (await screen.findAllByTestId('ingredient-toggle'))[0];
    fireEvent.click(firstIngredient);

    const reportAction = screen.getByRole('button', { name: 'Report issue with ingredients' });
    const topActions = screen.getByTestId('cooks-mode-top-actions');
    expect(reportAction).toHaveClass('h-12', 'w-12', 'text-terracotta-600');
    expect(reportAction).toHaveTextContent('');
    expect(topActions).toContainElement(reportAction);
    expect(topActions).toContainElement(screen.getByRole('button', { name: "Close cook's mode" }));
    expect(screen.getByTestId('cooks-mode-hero')).toContainElement(reportAction);
    expect(reportAction.closest('[data-testid="cooks-mode-controls"]')).toBeNull();
    expect(screen.queryByTestId('cooks-mode-report-duplicate')).toBeNull();
    fireEvent.click(reportAction);

    expect(screen.getByRole('button', { name: 'Ingredients' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Steps' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Steps' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(saveRecipeImportIssueMock).toHaveBeenCalledWith('recipe-1', {
        reasons: ['ingredients', 'steps'],
        note: null,
      })
    );
    expect(screen.queryByRole('dialog', { name: 'Report issue' })).toBeNull();
    expect(firstIngredient).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('heading', { name: 'Check & Prep' })).toBeInTheDocument();
    expect(usePlannerStore.getState().cookProgress['recipe-1']).toBeUndefined();
  });

  it('merges Steps into an existing issue and preserves its reasons, note, and active step', async () => {
    const recipe = {
      id: 'recipe-1',
      name: 'Pasta Night',
      canReimport: true,
      ingredients: ['Pasta'],
      recipeInstructions: [{ name: 'Boil Water', text: 'Boil the water.' }],
      importIssue: {
        reasons: ['ingredients'],
        note: 'The amounts are unclear',
        status: 'reported',
      },
    };
    getRecipeMock.mockResolvedValue(recipe);
    saveRecipeImportIssueMock.mockResolvedValue({
      recipe: {
        ...recipe,
        importIssue: {
          reasons: ['ingredients', 'steps'],
          note: 'The amounts are unclear',
          status: 'reported',
        },
      },
      reimportStarted: false,
      reimportLaunchFailed: false,
      importId: null,
    });

    render(
      <CooksMode
        recipe={{ id: 'recipe-1', name: 'Pasta Night', image: '/img/pasta.jpg' }}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(await screen.findByTestId('cooks-mode-step-next'));
    expect(await screen.findByRole('heading', { name: 'Boil Water' })).toBeInTheDocument();

    const reportAction = screen.getByRole('button', { name: 'Report issue with steps' });
    const editAction = screen.getByRole('button', { name: 'Edit step' });
    expect(reportAction).toHaveClass('h-12', 'w-12', 'text-terracotta-600');
    expect(editAction).toHaveClass('h-12', 'w-12');
    expect(reportAction).toHaveTextContent('');
    expect(editAction).toHaveTextContent('');
    expect(screen.getByTestId('cooks-mode-top-actions')).toContainElement(reportAction);
    expect(screen.getByTestId('cooks-mode-hero')).toContainElement(reportAction);
    expect(screen.getByTestId('cooking-reading-context')).toContainElement(editAction);
    expect(reportAction.closest('[data-testid="cooks-mode-controls"]')).toBeNull();
    fireEvent.click(reportAction);

    expect(screen.queryByTestId('recipe-detail-sheet')).toBeNull();
    expect(screen.getByRole('button', { name: 'Ingredients' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Steps' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('What should we check?')).toHaveValue('The amounts are unclear');

    fireEvent.click(screen.getByRole('button', { name: 'Close review issue' }));
    expect(screen.queryByRole('dialog', { name: 'Review issue' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Boil Water' })).toBeInTheDocument();
    expect(usePlannerStore.getState().cookProgress['recipe-1']).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: 'Report issue with steps' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(saveRecipeImportIssueMock).toHaveBeenCalledWith('recipe-1', {
        reasons: ['ingredients', 'steps'],
        note: 'The amounts are unclear',
      })
    );
    expect(screen.queryByRole('dialog', { name: 'Review issue' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Boil Water' })).toBeInTheDocument();
    expect(usePlannerStore.getState().cookProgress['recipe-1']).toBe(1);
  });

  it('does not offer contextual reporting for an ineligible recipe', async () => {
    getRecipeMock.mockResolvedValue({
      id: 'recipe-1',
      name: 'Synthesized Pasta',
      canReimport: false,
      ingredients: ['Pasta'],
      recipeInstructions: [{ name: 'Step 1', text: 'Cook pasta.' }],
    });

    render(
      <CooksMode
        recipe={{ id: 'recipe-1', name: 'Synthesized Pasta', image: '/img/pasta.jpg' }}
        onClose={vi.fn()}
      />
    );

    await screen.findByRole('heading', { name: 'Check & Prep' });
    expect(screen.queryByRole('button', { name: /Report issue with/ })).toBeNull();
  });

  it("keeps check and prep focused on ingredients, then starts recipe content at step 1 after Let's Cook", async () => {
    getRecipeMock.mockResolvedValue({
      id: 'recipe-1',
      name: 'Pasta Night',
      description: '',
      imageUrl: '/img/pasta.jpg',
      totalTime: '30 mins',
      category: 'Dinner',
      rating: 0,
      ingredients: ['Pasta', 'Tomatoes'],
      recipeInstructions: [
        { name: 'Boil Water', text: 'Bring a large pot of salted water to a boil.' },
        { name: 'Cook Pasta', text: 'Cook the pasta until al dente.' },
      ],
    });

    render(
      <CooksMode
        recipe={{ id: 'recipe-1', name: 'Pasta Night', image: '/img/pasta.jpg' }}
        onClose={vi.fn()}
      />
    );

    expect(await screen.findByRole('heading', { name: 'Check & Prep' })).toBeInTheDocument();
    expect(screen.getByText('Pasta')).toBeInTheDocument();
    expect(screen.queryByText('Boil Water')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Bring a large pot of salted water to a boil.')
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('cooks-mode-step-next'));

    expect(await screen.findByText('Boil Water')).toBeInTheDocument();
    expect(screen.getByText('Bring a large pot of salted water to a boil.')).toBeInTheDocument();
  });

  it('aligns instructions to the left for better legibility', async () => {
    getRecipeMock.mockResolvedValue({
      id: 'recipe-1',
      name: 'Pasta Night',
      recipeInstructions: [{ name: 'Step 1', text: 'Instruction 1' }],
    });

    render(
      <CooksMode
        recipe={{ id: 'recipe-1', name: 'Pasta Night', image: '/img/pasta.jpg' }}
        onClose={vi.fn()}
      />
    );

    // Advance past Check & Prep
    fireEvent.click(await screen.findByTestId('cooks-mode-step-next'));

    const instructionArea = screen.getByText('Instruction 1').closest('.text-left');
    expect(instructionArea).toBeInTheDocument();
  });

  it('retains the dish photo and opens detail from its accessible action', async () => {
    getRecipeMock.mockResolvedValue({
      id: 'recipe-1',
      name: 'Pasta Night',
      recipeInstructions: [{ name: 'Step 1', text: 'Instruction 1' }],
    });

    render(
      <CooksMode
        recipe={{ id: 'recipe-1', name: 'Pasta Night', image: '/img/pasta.jpg' }}
        onClose={vi.fn()}
      />
    );

    const heroImage = await screen.findByAltText('Pasta Night');
    const heroContainer = screen.getByTestId('cooks-mode-hero');

    expect(heroContainer).toContainElement(heroImage);
    expect(screen.getByTestId('cooks-mode-photo')).toContainElement(heroImage);

    const openDetails = screen.getByRole('button', { name: 'Open recipe details' });
    expect(openDetails).toBeInTheDocument();
    fireEvent.click(openDetails);
    expect(screen.getByTestId('recipe-detail-sheet')).toBeInTheDocument();
  });

  it('allows editing a step and saves on explicit Save button click', async () => {
    getRecipeMock.mockResolvedValue({
      id: 'recipe-1',
      name: 'Pasta Night',
      recipeInstructions: ['Original Step 1', 'Original Step 2'],
    });

    render(
      <CooksMode
        recipe={{ id: 'recipe-1', name: 'Pasta Night', image: '/img/pasta.jpg' }}
        onClose={vi.fn()}
      />
    );

    // Advance to Step 1
    fireEvent.click(await screen.findByTestId('cooks-mode-step-next'));

    // Should find a pencil icon to trigger edit
    const editBtn = screen.getByTestId('cooks-mode-edit-step');
    fireEvent.click(editBtn);

    const textarea = screen.getByDisplayValue('Original Step 1');
    fireEvent.change(textarea, { target: { value: 'Updated Step 1' } });

    // Save button should be present
    const saveBtn = screen.getByTestId('cooks-mode-save-edit');
    fireEvent.click(saveBtn);

    await waitFor(() =>
      expect(updateRecipeMock).toHaveBeenCalledWith('recipe-1', {
        recipeInstructions: ['Updated Step 1', 'Original Step 2'],
      })
    );
    expect(await screen.findByText('Updated Step 1')).toBeInTheDocument();
  });

  it('cancels editing without saving when Cancel button is clicked', async () => {
    getRecipeMock.mockResolvedValue({
      id: 'recipe-1',
      name: 'Pasta Night',
      recipeInstructions: ['Original Step 1'],
    });

    render(
      <CooksMode
        recipe={{ id: 'recipe-1', name: 'Pasta Night', image: '/img/pasta.jpg' }}
        onClose={vi.fn()}
      />
    );

    // Advance to Step 1
    fireEvent.click(await screen.findByTestId('cooks-mode-step-next'));

    fireEvent.click(screen.getByTestId('cooks-mode-edit-step'));
    const textarea = screen.getByDisplayValue('Original Step 1');
    fireEvent.change(textarea, { target: { value: 'Nonsense' } });

    const cancelBtn = screen.getByTestId('cooks-mode-cancel-edit');
    fireEvent.click(cancelBtn);

    expect(updateRecipeMock).not.toHaveBeenCalled();
    expect(screen.getByText('Original Step 1')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Nonsense')).not.toBeInTheDocument();
  });

  it('ingredient checklist toggles aria-checked on tap', async () => {
    getRecipeMock.mockResolvedValue({
      id: 'recipe-1',
      name: 'Pasta Night',
      ingredients: ['Pasta', 'Tomatoes'],
      recipeInstructions: [{ name: 'Step 1', text: 'Cook pasta.' }],
    });

    render(
      <CooksMode
        recipe={{ id: 'recipe-1', name: 'Pasta Night', image: '/img/pasta.jpg' }}
        onClose={vi.fn()}
      />
    );

    const toggles = await screen.findAllByTestId('ingredient-toggle');
    const first = toggles[0];

    expect(first).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(first);
    expect(first).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(first);
    expect(first).toHaveAttribute('aria-checked', 'false');
  });

  it('dietary badge text is absent on the ingredient prep screen', async () => {
    getRecipeMock.mockResolvedValue({
      id: 'recipe-1',
      name: 'Pasta Night',
      isVegetarian: true,
      ingredients: ['Pasta'],
      recipeInstructions: [{ name: 'Step 1', text: 'Cook pasta.' }],
    });

    render(
      <CooksMode
        recipe={{
          id: 'recipe-1',
          name: 'Pasta Night',
          image: '/img/pasta.jpg',
          isVegetarian: true,
        }}
        onClose={vi.fn()}
      />
    );

    await screen.findByTestId('ingredient-toggle');

    expect(screen.queryByText('Plant-Powered Choice!')).not.toBeInTheDocument();
    expect(screen.queryByText('Healthy Pick!')).not.toBeInTheDocument();
  });

  it('next button reads "Let\'s Cook" on the ingredient prep screen (step 0)', async () => {
    getRecipeMock.mockResolvedValue({
      id: 'recipe-1',
      name: 'Pasta Night',
      ingredients: ['Pasta'],
      recipeInstructions: [{ name: 'Step 1', text: 'Cook pasta.' }],
    });

    render(
      <CooksMode
        recipe={{ id: 'recipe-1', name: 'Pasta Night', image: '/img/pasta.jpg' }}
        onClose={vi.fn()}
      />
    );

    await screen.findByTestId('ingredient-toggle');

    expect(screen.getByTestId('cooks-mode-step-next')).toHaveTextContent("Let's Cook");
  });
});
