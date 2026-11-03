import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { useFamilyStore } from '@/store/familyStore';
import { useSearchPromotionStore } from '@/store/searchPromotionStore';

const mocks = vi.hoisted(() => {
  const searchRecipes = vi.fn();
  const librarySummaryGet = vi.fn();
  const recipesGet = vi.fn();
  const getRecipe = vi.fn();
  const updateRecipe = vi.fn();
  const deleteRecipe = vi.fn();
  const loadSetting = vi.fn();
  const saveSetting = vi.fn();
  const assignRecipeToDay = vi.fn();
  const getSchedule = vi.fn();
  const getTrashItems = vi.fn();
  const restoreRecipe = vi.fn();
  const purgeRecipe = vi.fn();
  const healthGet = vi.fn();
  const filterDiscoveryGet = vi.fn();
  const push = vi.fn();
  const loadGoTo = vi.fn();
  const saveGoTo = vi.fn();
  const loadActiveGoTo = vi.fn();
  const updateMemberPreferences = vi.fn();
  let searchParams = new URLSearchParams('');
  let familySettings: Record<string, unknown> = {};

  return {
    gotoMembershipVersion: 0,
    searchRecipes,
    librarySummaryGet,
    recipesGet,
    getRecipe,
    updateRecipe,
    deleteRecipe,
    loadSetting,
    saveSetting,
    assignRecipeToDay,
    getSchedule,
    getTrashItems,
    restoreRecipe,
    purgeRecipe,
    healthGet,
    filterDiscoveryGet,
    push,
    loadGoTo,
    saveGoTo,
    loadActiveGoTo,
    updateMemberPreferences,
    setSearchParams: (value: string) => {
      searchParams = new URLSearchParams(value);
    },
    getSearchParams: () => searchParams,
    setFamilySettings: (value: Record<string, unknown>) => {
      familySettings = value;
    },
    getFamilySettings: () => familySettings,
  };
});

vi.mock('next/navigation', () => ({
  usePathname: () => '/recipes',
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => mocks.getSearchParams(),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useMotionValue: () => ({ get: () => 0, set: vi.fn() }),
  useTransform: () => ({ get: () => 0 }),
  useAnimation: () => ({ start: vi.fn().mockResolvedValue(undefined), stop: vi.fn() }),
  useDragControls: () => ({ start: vi.fn() }),
  useIsPresent: () => true,
  useMotionValueEvent: vi.fn(),
}));

// Controller tests invoke the card's own callbacks without adding production
// navigation buttons. RecipeStackCard's gesture/tap semantics have separate tests.
vi.mock('@/components/recipes/RecipeStackCard', () => ({
  RecipeStackCard: ({
    id,
    name,
    isFront,
    onSwipeLeft,
    onSwipeRight,
    onTap,
  }: {
    id: string;
    name: string;
    isFront: boolean;
    onSwipeLeft: () => void;
    onSwipeRight: () => void;
    onTap: () => void;
  }) => (
    <div data-testid={isFront ? 'stack-card-front' : 'stack-card-back'} data-recipe-id={id}>
      {name}
      {isFront && (
        <>
          <button type="button" data-testid="unit-stack-previous" onClick={onSwipeRight} />
          <button type="button" data-testid="unit-stack-next" onClick={onSwipeLeft} />
          <button type="button" data-testid="unit-stack-detail" onClick={onTap} />
        </>
      )}
    </div>
  ),
}));

vi.mock('@/locales', () => ({
  getLocale: () => 'en',
  t: (_key: string, fallback: string) => fallback,
  tWithVars: (_key: string, fallback: string, vars: Record<string, unknown> = {}) =>
    Object.entries(vars).reduce(
      (text, [key, value]) => text.replaceAll(`{{${key}}}`, String(value)),
      fallback
    ),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' '),
}));

vi.mock('@/lib/api/recipes', () => ({
  searchRecipes: (...args: unknown[]) => mocks.searchRecipes(...args),
  getRecipe: (...args: unknown[]) => mocks.getRecipe(...args),
  updateRecipe: (...args: unknown[]) => mocks.updateRecipe(...args),
  deleteRecipe: (...args: unknown[]) => mocks.deleteRecipe(...args),
  getTrashItems: (...args: unknown[]) => mocks.getTrashItems(...args),
  restoreRecipe: (...args: unknown[]) => mocks.restoreRecipe(...args),
  purgeRecipe: (...args: unknown[]) => mocks.purgeRecipe(...args),
}));

vi.mock('@/store/familyStore', () => ({
  useFamilyStore: (selector?: (state: any) => any) => {
    const state = {
      familySettings: mocks.getFamilySettings(),
      loadSetting: (...args: unknown[]) => mocks.loadSetting(...args),
      saveSetting: (...args: unknown[]) => mocks.saveSetting(...args),
      loadGoTo: mocks.loadGoTo,
      saveGoTo: mocks.saveGoTo,
      loadActiveGoTo: mocks.loadActiveGoTo,
      gotoMembershipVersion: mocks.gotoMembershipVersion,
      selectedFamilyMemberId: 'member-1',
      familyMembers: [{ id: 'member-1', name: 'Alex', browseViewMode: 'stack' }],
      loadFamilyMembers: vi.fn().mockResolvedValue(undefined),
      updateMemberPreferences: mocks.updateMemberPreferences,
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock('@/lib/api/api-client', () => ({
  apiClient: {
    api: {
      health: {
        get: (...args: unknown[]) => mocks.healthGet(...args),
      },
      recipes: {
        librarySummary: { get: (...args: unknown[]) => mocks.librarySummaryGet(...args) },
        get: (...args: unknown[]) => mocks.recipesGet(...args),
        search: {
          filters: { get: (...args: unknown[]) => mocks.filterDiscoveryGet(...args) },
        },
      },
    },
  },
}));

vi.mock('@/lib/api/planner', () => ({
  assignRecipeToDay: (...args: unknown[]) => mocks.assignRecipeToDay(...args),
  getSchedule: (...args: unknown[]) => mocks.getSchedule(...args),
  normalizeScheduleRecipe: (recipe: unknown) => recipe ?? null,
}));

if (typeof window !== 'undefined') {
  window.URL.createObjectURL = vi.fn(() => 'mock-url');
}

import UnifiedRecipesPage from './page';

function makeSearchResponse(overrides: Record<string, unknown> = {}) {
  return {
    topPick: {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Chicken Soup',
      imageUrl: 'https://example.com/chicken-soup.jpg',
      totalTime: '30 min',
      rating: 2,
      isDiscoverable: true,
      notes: null,
      reasons: [{ source: 'name-match', label: 'Name matches your search' }],
      isPromotionEligible: true,
    },
    results: [
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Chicken Pasta',
        imageUrl: 'https://example.com/chicken-pasta.jpg',
        totalTime: '25 min',
        rating: 1,
        isDiscoverable: true,
        notes: null,
        reasons: [{ source: 'name-match', label: 'Name matches your search' }],
        isPromotionEligible: true,
      },
    ],
    appliedFilters: {},
    searchMode: 'explicit',
    resultPath: 'lexical-only',
    ...overrides,
  };
}

function makeRecipeDetail(overrides: Record<string, unknown> = {}) {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Chicken Soup',
    description: 'Comforting soup for busy weeknights.',
    imageUrl: 'https://example.com/chicken-soup.jpg',
    totalTime: '30 min',
    category: 'Dinner',
    rating: 2,
    notes: 'Family favorite.',
    ingredients: ['Chicken', 'Broth', 'Carrots'],
    isReady: true,
    ...overrides,
  };
}

function makeSearchResult(index: number) {
  const id = `${String(index).padStart(8, '0')}-0000-0000-0000-${String(index).padStart(12, '0')}`;
  return {
    id,
    name: `Recipe ${index}`,
    imageUrl: `https://example.com/recipe-${index}.jpg`,
    totalTime: '25 min',
    rating: 1,
    isDiscoverable: true,
    notes: null,
    reasons: [{ source: 'name-match', label: 'Name matches your search' }],
    isPromotionEligible: true,
  };
}

describe('RecipesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.searchRecipes.mockReset();
    mocks.setSearchParams('focus=search');
    mocks.setFamilySettings({});
    mocks.searchRecipes.mockResolvedValue(makeSearchResponse());
    mocks.librarySummaryGet.mockResolvedValue({ data: { total: 1 } });
    mocks.recipesGet.mockResolvedValue({
      recipes: [{ id: '11111111-1111-1111-1111-111111111111', name: 'Chicken Soup' }],
      pagination: { page: 1, limit: 20, total: 1 },
    });
    mocks.getRecipe.mockResolvedValue(makeRecipeDetail());
    mocks.updateRecipe.mockResolvedValue(undefined);
    mocks.deleteRecipe.mockResolvedValue(undefined);
    mocks.loadSetting.mockResolvedValue(null);
    mocks.gotoMembershipVersion = 0;
    mocks.loadGoTo.mockResolvedValue({ items: [] });
    mocks.saveGoTo.mockResolvedValue(undefined);
    mocks.loadActiveGoTo.mockResolvedValue(null);
    mocks.updateMemberPreferences.mockResolvedValue(undefined);
    mocks.saveGoTo.mockImplementation(async (value: any) => {
      mocks.setFamilySettings({ ...mocks.getFamilySettings(), family_goto: value });
    });
    mocks.saveSetting.mockImplementation(async (key: string, value: unknown) => {
      mocks.setFamilySettings({ ...mocks.getFamilySettings(), [key]: value });
    });
    mocks.assignRecipeToDay.mockResolvedValue(undefined);
    mocks.getSchedule.mockResolvedValue({
      weekOffset: 0,
      weekStartDate: '2026-05-04',
      calendar: {
        timeZone: 'UTC',
        today: '2026-05-04',
        capturedAtUtc: '2026-05-04T12:00:00Z',
        currentWeekStartDate: '2026-05-04',
        referenceWeekStartDate: '2026-05-04',
        nextDayAtUtc: '2026-05-05T00:00:00Z',
      },
      days: Array.from({ length: 7 }, (_, index) => ({
        day: `Day ${index + 1}`,
        date: `2026-05-${String(4 + index).padStart(2, '0')}`,
        recipe: null,
        status: 0,
      })),
    });
    mocks.getTrashItems.mockResolvedValue([]);
    mocks.restoreRecipe.mockResolvedValue(undefined);
    mocks.purgeRecipe.mockResolvedValue(undefined);
    mocks.healthGet.mockResolvedValue({ demoMode: false });
    mocks.filterDiscoveryGet.mockResolvedValue({
      generatedAt: null,
      main: [
        { id: 'beef', concept: 'beef' },
        { id: 'poultry', concept: 'poultry' },
        { id: 'pork', concept: 'pork' },
        { id: 'fish', concept: 'fish' },
        { id: 'pasta', concept: 'pasta' },
        { id: 'vegetarian', concept: 'vegetarian' },
      ],
      mealTypes: ['Supper', 'Lunch', 'Breakfast', 'Dessert'],
      cuisines: { promoted: [], all: [] },
    });
    useSearchPromotionStore.getState().reset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('opens ordinary Recipes in collapsed Explore after its library summary', async () => {
    mocks.setSearchParams('');
    await act(async () => {
      render(<UnifiedRecipesPage />);
    });

    await waitFor(() => expect(mocks.recipesGet).toHaveBeenCalledTimes(1));
    expect(mocks.librarySummaryGet).toHaveBeenCalledTimes(1);
    expect(mocks.librarySummaryGet.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.recipesGet.mock.invocationCallOrder[0]
    );
    expect(mocks.searchRecipes).not.toHaveBeenCalled();
    expect(screen.queryByTestId('recipe-search-input')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    const toolbar = [
      'recipes-search-disclosure',
      'stack-toggle-discoverable',
      'browse-filter-goto',
      'browse-view-stack',
      'browse-view-list',
      'recycle-bin-entry',
    ].map((id) => screen.getByTestId(id));
    expect(toolbar.map((element) => element.compareDocumentPosition(toolbar[0]))).toEqual([
      0, 2, 2, 2, 2, 2,
    ]);
    expect(screen.queryByTestId('browse-all-exit')).not.toBeInTheDocument();
  });

  it('keeps detail on the front card without an added action row in Explore', async () => {
    mocks.setSearchParams('');
    await act(async () => render(<UnifiedRecipesPage />));
    await screen.findByTestId('stack-card-front');
    expect(screen.queryByTestId('stack-navigation-actions')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('unit-stack-detail'));
    expect(await screen.findByTestId('recipe-detail-sheet')).toBeInTheDocument();
    expect(mocks.getRecipe).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111');
  });

  it('opens a recognizable Search field and counts only applied scope and filters', async () => {
    mocks.setSearchParams('');
    await act(async () => render(<UnifiedRecipesPage />));
    fireEvent.click(screen.getByTestId('recipes-search-disclosure'));
    const input = screen.getByTestId('recipe-search-input');
    expect(input).toHaveAttribute('placeholder', 'Something spicy for 4...');
    expect(input.parentElement?.querySelector('.lucide-search')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-filters-button')).toHaveAccessibleName('Filters');

    fireEvent.click(screen.getByTestId('stack-toggle-discoverable'));
    fireEvent.click(screen.getByTestId('browse-filter-goto'));
    expect(screen.getByTestId('mobile-filters-button')).toHaveAccessibleName('Filters, 2 active');
    fireEvent.click(screen.getByTestId('mobile-filters-button'));
    fireEvent.click(screen.getByTestId('mobile-filter-quick'));
    expect(screen.getByTestId('mobile-filters-button')).toHaveAccessibleName('Filters, 2 active');
    fireEvent.click(screen.getByTestId('mobile-filter-apply'));
    expect(screen.getByTestId('mobile-filters-button')).toHaveAccessibleName('Filters, 3 active');
  });

  it('shows a modest Results heading only for a populated Search list', async () => {
    mocks.setSearchParams('');
    await act(async () => render(<UnifiedRecipesPage />));
    fireEvent.click(screen.getByTestId('browse-view-list'));
    expect(screen.queryByRole('heading', { name: 'Results' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('recipes-search-disclosure'));
    fireEvent.change(screen.getByTestId('recipe-search-input'), { target: { value: 'chicken' } });
    fireEvent.keyDown(screen.getByTestId('recipe-search-input'), { key: 'Enter' });
    await waitFor(() => expect(screen.getAllByTestId('browse-list-recipe-card')).toHaveLength(2));
    expect(screen.getByRole('heading', { name: 'Results' })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('browse-view-stack'));
    expect(screen.queryByRole('heading', { name: 'Results' })).not.toBeInTheDocument();
  });

  it('searches from Explore and shows ordered results in stack and list without another POST', async () => {
    mocks.setSearchParams('');
    await act(async () => {
      render(<UnifiedRecipesPage />);
    });
    await waitFor(() => expect(mocks.recipesGet).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId('recipes-search-disclosure'));
    await waitFor(() => expect(screen.getByTestId('recipe-search-input')).toHaveFocus());
    vi.useFakeTimers();
    try {
      fireEvent.change(screen.getByTestId('recipe-search-input'), { target: { value: 'chicken' } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(mocks.searchRecipes).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'chicken' })
      );
      expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Soup');
      const postCount = mocks.searchRecipes.mock.calls.length;
      fireEvent.click(screen.getByTestId('browse-view-list'));
      expect(screen.getAllByTestId('browse-list-recipe-card')).toHaveLength(2);
      expect(screen.getAllByTestId('browse-list-recipe-card')[0]).toHaveTextContent('Chicken Soup');
      expect(mocks.searchRecipes).toHaveBeenCalledTimes(postCount);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps toolbar scope and Filters drafts separate in Explore', async () => {
    mocks.setSearchParams('');
    await act(async () => {
      render(<UnifiedRecipesPage />);
    });
    await waitFor(() => expect(mocks.recipesGet).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId('browse-filter-goto'));
    await waitFor(() => expect(mocks.recipesGet).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByTestId('recipes-search-disclosure'));
    fireEvent.click(screen.getByTestId('mobile-filters-button'));
    expect(screen.getByRole('button', { name: 'GOTO' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Discovery' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByTestId('stack-toggle-discoverable')).toHaveAttribute(
      'aria-label',
      'Showing all recipes'
    );
    expect(screen.getByTestId('browse-filter-goto')).toHaveAttribute('aria-pressed', 'true');
    expect(mocks.searchRecipes).not.toHaveBeenCalled();
  });

  it('uses a Search cursor only at the loaded stack boundary and does not wrap', async () => {
    mocks.setSearchParams('');
    mocks.searchRecipes.mockResolvedValueOnce(makeSearchResponse({ nextCursor: 'cursor-2' }));
    mocks.searchRecipes.mockResolvedValueOnce(
      makeSearchResponse({
        topPick: null,
        results: [{ ...makeSearchResult(3), name: 'Third match' }],
        nextCursor: null,
      })
    );
    await act(async () => {
      render(<UnifiedRecipesPage />);
    });
    fireEvent.click(screen.getByTestId('recipes-search-disclosure'));
    fireEvent.change(screen.getByTestId('recipe-search-input'), { target: { value: 'chicken' } });
    fireEvent.keyDown(screen.getByTestId('recipe-search-input'), { key: 'Enter' });
    await waitFor(() =>
      expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Soup')
    );
    fireEvent.click(screen.getByTestId('unit-stack-previous'));
    expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Soup');
    expect(screen.getByTestId('stack-depth-indicator')).toHaveTextContent('more available');
    fireEvent.click(screen.getByTestId('unit-stack-next'));
    expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Pasta');
    fireEvent.click(screen.getByTestId('unit-stack-next'));
    await waitFor(() =>
      expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Third match')
    );
    expect(mocks.searchRecipes).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('stack-depth-indicator')).toHaveTextContent('3 / 3');
    fireEvent.click(screen.getByTestId('unit-stack-next'));
    expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Third match');
    fireEvent.click(screen.getByTestId('unit-stack-previous'));
    expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Pasta');
    expect(mocks.searchRecipes).toHaveBeenCalledTimes(2);
  });

  it('deduplicates continuation overlaps and permits one pending cursor request', async () => {
    let completeCursor: ((response: ReturnType<typeof makeSearchResponse>) => void) | undefined;
    mocks.setSearchParams('');
    mocks.searchRecipes.mockResolvedValueOnce(makeSearchResponse({ nextCursor: 'cursor-2' }));
    mocks.searchRecipes.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          completeCursor = resolve;
        })
    );
    await act(async () => {
      render(<UnifiedRecipesPage />);
    });
    fireEvent.click(screen.getByTestId('recipes-search-disclosure'));
    fireEvent.change(screen.getByTestId('recipe-search-input'), { target: { value: 'chicken' } });
    fireEvent.keyDown(screen.getByTestId('recipe-search-input'), { key: 'Enter' });
    await waitFor(() =>
      expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Soup')
    );
    fireEvent.click(screen.getByTestId('unit-stack-next'));
    fireEvent.click(screen.getByTestId('unit-stack-next'));
    fireEvent.click(screen.getByTestId('unit-stack-next'));
    expect(mocks.searchRecipes).toHaveBeenCalledTimes(2);
    expect(mocks.searchRecipes).toHaveBeenLastCalledWith(
      expect.objectContaining({
        query: 'chicken',
        continuationToken: 'cursor-2',
        limit: 12,
      })
    );
    expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Pasta');
    await act(async () =>
      completeCursor?.(
        makeSearchResponse({
          topPick: null,
          results: [
            makeSearchResponse().results[0],
            { ...makeSearchResult(3), name: 'Third match' },
          ],
          nextCursor: null,
        })
      )
    );
    await waitFor(() =>
      expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Third match')
    );
    expect(screen.getByTestId('stack-depth-indicator')).toHaveTextContent('3 / 3');
    fireEvent.click(screen.getByTestId('unit-stack-previous'));
    expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Pasta');
    expect(mocks.searchRecipes).toHaveBeenCalledTimes(2);
  });

  it('lets a replacement Search continue while the departed cursor request is still pending', async () => {
    let finishOld!: (response: ReturnType<typeof makeSearchResponse>) => void;
    mocks.setSearchParams('');
    mocks.searchRecipes.mockResolvedValueOnce(makeSearchResponse({ nextCursor: 'old-cursor' }));
    mocks.searchRecipes.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOld = resolve;
        })
    );
    mocks.searchRecipes.mockResolvedValueOnce(
      makeSearchResponse({
        topPick: null,
        results: [
          { ...makeSearchResult(3), name: 'Pasta one' },
          { ...makeSearchResult(4), name: 'Pasta two' },
        ],
        nextCursor: 'new-cursor',
      })
    );
    mocks.searchRecipes.mockResolvedValueOnce(
      makeSearchResponse({ topPick: null, results: [], nextCursor: null })
    );
    await act(async () => {
      render(<UnifiedRecipesPage />);
    });
    fireEvent.click(screen.getByTestId('recipes-search-disclosure'));
    const input = screen.getByTestId('recipe-search-input');
    fireEvent.change(input, { target: { value: 'chicken' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() =>
      expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Soup')
    );
    fireEvent.click(screen.getByTestId('unit-stack-next'));
    fireEvent.click(screen.getByTestId('unit-stack-next'));
    expect(mocks.searchRecipes).toHaveBeenCalledTimes(2);
    fireEvent.change(input, { target: { value: 'pasta' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() =>
      expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Pasta one')
    );
    fireEvent.click(screen.getByTestId('unit-stack-next'));
    fireEvent.click(screen.getByTestId('unit-stack-next'));
    await waitFor(() => expect(mocks.searchRecipes).toHaveBeenCalledTimes(4));
    expect(mocks.searchRecipes).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: 'pasta', continuationToken: 'new-cursor' })
    );
    await act(async () =>
      finishOld(
        makeSearchResponse({
          topPick: null,
          results: [{ ...makeSearchResult(5), name: 'Obsolete' }],
          nextCursor: null,
        })
      )
    );
    expect(screen.queryByText('Obsolete')).not.toBeInTheDocument();
  });

  it('ends a Search stack cleanly when a cursor page contains no new matches', async () => {
    mocks.setSearchParams('');
    mocks.searchRecipes.mockResolvedValueOnce(makeSearchResponse({ nextCursor: 'cursor-2' }));
    mocks.searchRecipes.mockResolvedValueOnce(
      makeSearchResponse({
        topPick: null,
        results: [makeSearchResponse().results[0]],
        nextCursor: null,
      })
    );
    await act(async () => {
      render(<UnifiedRecipesPage />);
    });
    fireEvent.click(screen.getByTestId('recipes-search-disclosure'));
    fireEvent.change(screen.getByTestId('recipe-search-input'), { target: { value: 'chicken' } });
    fireEvent.keyDown(screen.getByTestId('recipe-search-input'), { key: 'Enter' });
    await waitFor(() =>
      expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Soup')
    );
    fireEvent.click(screen.getByTestId('unit-stack-next'));
    fireEvent.click(screen.getByTestId('unit-stack-next'));
    fireEvent.click(screen.getByTestId('unit-stack-next'));
    expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Pasta');
    await waitFor(() =>
      expect(screen.getByTestId('stack-depth-indicator')).toHaveTextContent('2 / 2')
    );
    expect(mocks.searchRecipes).toHaveBeenCalledTimes(2);
  });

  it('offers restart for an expired Search cursor while retaining loaded cards', async () => {
    mocks.setSearchParams('');
    mocks.searchRecipes.mockResolvedValueOnce(makeSearchResponse({ nextCursor: 'cursor-2' }));
    mocks.searchRecipes.mockRejectedValueOnce({ responseStatusCode: 409 });
    mocks.searchRecipes.mockResolvedValueOnce(
      makeSearchResponse({
        topPick: null,
        results: [{ ...makeSearchResult(4), name: 'Restarted match' }],
        nextCursor: null,
      })
    );
    await act(async () => {
      render(<UnifiedRecipesPage />);
    });
    fireEvent.click(screen.getByTestId('recipes-search-disclosure'));
    fireEvent.change(screen.getByTestId('recipe-search-input'), { target: { value: 'chicken' } });
    fireEvent.keyDown(screen.getByTestId('recipe-search-input'), { key: 'Enter' });
    await waitFor(() =>
      expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Soup')
    );
    fireEvent.click(screen.getByTestId('unit-stack-next'));
    fireEvent.click(screen.getByTestId('unit-stack-next'));
    await waitFor(() => expect(screen.getByTestId('search-restart-expired')).toBeInTheDocument());
    expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Pasta');
    expect(screen.queryByTestId('search-load-more-retry')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('search-restart-expired'));
    await waitFor(() =>
      expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Restarted match')
    );
    expect(mocks.searchRecipes).toHaveBeenCalledTimes(3);
    expect(mocks.searchRecipes).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: 'chicken' })
    );
    expect(mocks.searchRecipes.mock.lastCall?.[0]).not.toHaveProperty('continuationToken');
  });

  it('retries a failed continuation with the same cursor and retains its loaded position', async () => {
    mocks.setSearchParams('');
    mocks.searchRecipes.mockResolvedValueOnce(makeSearchResponse({ nextCursor: 'cursor-2' }));
    mocks.searchRecipes.mockRejectedValueOnce({ responseStatusCode: 503 });
    mocks.searchRecipes.mockResolvedValueOnce(
      makeSearchResponse({
        topPick: null,
        results: [{ ...makeSearchResult(3), name: 'Third match' }],
        nextCursor: null,
      })
    );
    await act(async () => {
      render(<UnifiedRecipesPage />);
    });
    fireEvent.click(screen.getByTestId('recipes-search-disclosure'));
    fireEvent.change(screen.getByTestId('recipe-search-input'), { target: { value: 'chicken' } });
    fireEvent.keyDown(screen.getByTestId('recipe-search-input'), { key: 'Enter' });
    await waitFor(() =>
      expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Soup')
    );
    fireEvent.click(screen.getByTestId('unit-stack-next'));
    fireEvent.click(screen.getByTestId('unit-stack-next'));
    await waitFor(() => expect(screen.getByTestId('search-load-more-retry')).toBeInTheDocument());
    expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Pasta');
    fireEvent.click(screen.getByTestId('search-load-more-retry'));
    await waitFor(() =>
      expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Third match')
    );
    expect(mocks.searchRecipes).toHaveBeenCalledTimes(3);
    expect(mocks.searchRecipes.mock.calls[1][0]).toEqual(mocks.searchRecipes.mock.calls[2][0]);
  });

  it('returns to scoped Explore when the last text criterion is cleared', async () => {
    mocks.setSearchParams('');
    await act(async () => {
      render(<UnifiedRecipesPage />);
    });
    await waitFor(() => expect(mocks.recipesGet).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId('browse-filter-goto'));
    await waitFor(() => expect(mocks.recipesGet).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByTestId('recipes-search-disclosure'));
    const input = screen.getByTestId('recipe-search-input');
    fireEvent.change(input, { target: { value: 'chicken' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(mocks.searchRecipes).toHaveBeenCalledTimes(1));
    fireEvent.change(input, { target: { value: '' } });
    await waitFor(() => expect(mocks.recipesGet).toHaveBeenCalledTimes(3));
    expect(mocks.recipesGet).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryParameters: expect.objectContaining({ gotoOnly: true }),
      })
    );
    expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Soup');
  });

  it('opens focus=search over Explore without an empty POST', async () => {
    mocks.setSearchParams('focus=search');
    await act(async () => {
      render(<UnifiedRecipesPage />);
    });
    await waitFor(() => expect(mocks.recipesGet).toHaveBeenCalledTimes(1));
    expect(mocks.searchRecipes).not.toHaveBeenCalled();
    expect(screen.getByTestId('recipes-search-disclosure')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    await waitFor(() => expect(screen.getByTestId('recipe-search-input')).toHaveFocus());
  });

  it('uses explicit Similar context in the unified Search and can remove it', async () => {
    mocks.setSearchParams('similarTo=11111111-1111-1111-1111-111111111111');
    await act(async () => {
      render(<UnifiedRecipesPage />);
    });
    await waitFor(() =>
      expect(mocks.searchRecipes).toHaveBeenCalledWith(
        expect.objectContaining({
          similarToRecipeId: '11111111-1111-1111-1111-111111111111',
        })
      )
    );
    expect(screen.getByTestId('recipe-search-input')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('search-similar-chip-remove'));
    await waitFor(() => expect(mocks.recipesGet).toHaveBeenCalled());
    expect(screen.queryByTestId('search-similar-chip-remove')).not.toBeInTheDocument();
  });

  it('retains Similar when clearing only filter selections', async () => {
    mocks.setSearchParams('similarTo=11111111-1111-1111-1111-111111111111');
    await act(async () => {
      render(<UnifiedRecipesPage />);
    });
    await waitFor(() => expect(mocks.searchRecipes).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId('mobile-filters-button'));
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    fireEvent.click(screen.getByTestId('mobile-filter-apply'));
    await waitFor(() => expect(mocks.searchRecipes).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('search-similar-chip-remove')).toBeInTheDocument();
    expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Soup');
  });

  it.each(['debounce', 'Enter'] as const)(
    'typing over Similar removes its source for %s submission',
    async (submit) => {
      mocks.setSearchParams('similarTo=11111111-1111-1111-1111-111111111111');
      await act(async () => {
        render(<UnifiedRecipesPage />);
      });
      await waitFor(() => expect(mocks.searchRecipes).toHaveBeenCalledTimes(1));
      vi.useFakeTimers();
      try {
        const input = screen.getByTestId('recipe-search-input');
        fireEvent.change(input, { target: { value: 'pasta' } });
        expect(screen.queryByTestId('search-similar-chip-remove')).not.toBeInTheDocument();
        if (submit === 'Enter') fireEvent.keyDown(input, { key: 'Enter' });
        else
          await act(async () => {
            await vi.advanceTimersByTimeAsync(500);
          });
        expect(mocks.searchRecipes).toHaveBeenCalledTimes(2);
        expect(mocks.searchRecipes).toHaveBeenLastCalledWith(
          expect.objectContaining({
            query: 'pasta',
            similarToRecipeId: undefined,
          })
        );
      } finally {
        vi.useRealTimers();
      }
    }
  );

  it('keeps a planner target visible outside the Search disclosure', async () => {
    mocks.setSearchParams('addToDay=2&weekOffset=0&referenceWeekStartDate=2026-05-04');
    await act(async () => {
      render(<UnifiedRecipesPage />);
    });
    expect(screen.getByTestId('planning-mode-banner')).toHaveTextContent('Choosing for');
    expect(
      screen
        .getByTestId('planning-mode-banner')
        .compareDocumentPosition(screen.getByTestId('recipes-search-disclosure')) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    fireEvent.click(screen.getByTestId('recipes-search-disclosure'));
    expect(screen.queryByTestId('recipe-search-input')).not.toBeInTheDocument();
    expect(screen.getByTestId('planning-mode-banner')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('planning-mode-cancel'));
    expect(mocks.push).toHaveBeenCalledWith('/planner');
  });

  it('opens an explicit recipe detail over Explore without forcing Search', async () => {
    mocks.setSearchParams('open=11111111-1111-1111-1111-111111111111');
    await act(async () => {
      render(<UnifiedRecipesPage />);
    });
    await waitFor(() => expect(mocks.recipesGet).toHaveBeenCalled());
    expect(mocks.searchRecipes).not.toHaveBeenCalled();
    expect(screen.getByTestId('recipe-detail-sheet')).toBeInTheDocument();
    expect(screen.getByTestId('recipes-search-disclosure')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('hides and restores loaded Search without replacing its results or position', async () => {
    mocks.setSearchParams('');
    await act(async () => {
      render(<UnifiedRecipesPage />);
    });
    fireEvent.click(screen.getByTestId('recipes-search-disclosure'));
    fireEvent.change(screen.getByTestId('recipe-search-input'), { target: { value: 'chicken' } });
    fireEvent.keyDown(screen.getByTestId('recipe-search-input'), { key: 'Enter' });
    await waitFor(() =>
      expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Soup')
    );
    fireEvent.click(screen.getByTestId('unit-stack-next'));
    expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Pasta');
    fireEvent.click(screen.getByTestId('recipes-search-disclosure'));
    expect(screen.queryByTestId('recipe-search-input')).not.toBeInTheDocument();
    expect(screen.getByTestId('recipes-search-disclosure')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.getByTestId('recipes-search-disclosure')).toHaveAccessibleName(/search active/i);
    expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Pasta');
    fireEvent.click(screen.getByTestId('recipes-search-disclosure'));
    expect(screen.getByTestId('recipe-search-input')).toHaveValue('chicken');
    expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Pasta');
    expect(mocks.searchRecipes).toHaveBeenCalledTimes(1);
  });

  it('resets position when switching Search presentation without replacing the result set', async () => {
    mocks.setSearchParams('');
    await act(async () => {
      render(<UnifiedRecipesPage />);
    });
    fireEvent.click(screen.getByTestId('recipes-search-disclosure'));
    fireEvent.change(screen.getByTestId('recipe-search-input'), { target: { value: 'chicken' } });
    fireEvent.keyDown(screen.getByTestId('recipe-search-input'), { key: 'Enter' });
    await waitFor(() =>
      expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Soup')
    );
    fireEvent.click(screen.getByTestId('unit-stack-next'));
    expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Pasta');
    fireEvent.click(screen.getByTestId('browse-view-list'));
    expect(screen.getAllByTestId('browse-list-recipe-card')).toHaveLength(2);
    fireEvent.click(screen.getByTestId('browse-view-stack'));
    expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Soup');
    expect(mocks.searchRecipes).toHaveBeenCalledTimes(1);
  });

  it('keeps the originally scheduled Search request when controls are hidden', async () => {
    mocks.setSearchParams('');
    await act(async () => {
      render(<UnifiedRecipesPage />);
    });
    fireEvent.click(screen.getByTestId('recipes-search-disclosure'));
    vi.useFakeTimers();
    try {
      fireEvent.change(screen.getByTestId('recipe-search-input'), { target: { value: 'chicken' } });
      fireEvent.click(screen.getByTestId('recipes-search-disclosure'));
      expect(mocks.searchRecipes).not.toHaveBeenCalled();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(mocks.searchRecipes).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Soup');
      expect(screen.getByTestId('recipes-search-disclosure')).toHaveAttribute(
        'aria-expanded',
        'false'
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps loaded cards visible while a hidden replacement Search is pending', async () => {
    let finishReplacement: ((response: ReturnType<typeof makeSearchResponse>) => void) | undefined;
    mocks.searchRecipes.mockResolvedValueOnce(makeSearchResponse());
    mocks.searchRecipes.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishReplacement = resolve;
        })
    );
    mocks.setSearchParams('');
    await act(async () => {
      render(<UnifiedRecipesPage />);
    });
    fireEvent.click(screen.getByTestId('recipes-search-disclosure'));
    const input = screen.getByTestId('recipe-search-input');
    fireEvent.change(input, { target: { value: 'chicken' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() =>
      expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Soup')
    );
    fireEvent.change(input, { target: { value: 'pasta' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.click(screen.getByTestId('recipes-search-disclosure'));
    expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Soup');
    await act(async () =>
      finishReplacement?.(
        makeSearchResponse({
          topPick: null,
          results: [{ ...makeSearchResult(3), name: 'Pasta dinner' }],
        })
      )
    );
    await waitFor(() =>
      expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Pasta dinner')
    );
    expect(screen.getByTestId('recipes-search-disclosure')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('clears Search explicitly while keeping the applied library scope', async () => {
    mocks.setSearchParams('');
    await act(async () => {
      render(<UnifiedRecipesPage />);
    });
    fireEvent.click(screen.getByTestId('browse-filter-goto'));
    fireEvent.click(screen.getByTestId('recipes-search-disclosure'));
    fireEvent.change(screen.getByTestId('recipe-search-input'), { target: { value: 'chicken' } });
    fireEvent.keyDown(screen.getByTestId('recipe-search-input'), { key: 'Enter' });
    await waitFor(() => expect(mocks.searchRecipes).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId('recipes-clear-search'));
    expect(screen.getByTestId('recipe-search-input')).toHaveValue('');
    expect(screen.getByTestId('browse-filter-goto')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('recipes-search-disclosure')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    await waitFor(() =>
      expect(mocks.recipesGet).toHaveBeenLastCalledWith(
        expect.objectContaining({
          queryParameters: expect.objectContaining({ gotoOnly: true }),
        })
      )
    );
  });

  it('offers filter and Search recovery for a successful zero-match response while controls are hidden', async () => {
    mocks.setSearchParams('');
    mocks.searchRecipes.mockResolvedValueOnce(makeSearchResponse({ topPick: null, results: [] }));
    await act(async () => {
      render(<UnifiedRecipesPage />);
    });
    fireEvent.click(screen.getByTestId('recipes-search-disclosure'));
    fireEvent.change(screen.getByTestId('recipe-search-input'), {
      target: { value: 'unfindable' },
    });
    fireEvent.keyDown(screen.getByTestId('recipe-search-input'), { key: 'Enter' });
    await waitFor(() => expect(screen.getByTestId('search-empty-state')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('recipes-search-disclosure'));
    expect(screen.getByTestId('search-empty-state')).toBeInTheDocument();
    expect(screen.getByTestId('search-empty-clear-filters')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('search-empty-clear-search'));
    await waitFor(() =>
      expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Soup')
    );
    expect(screen.queryByTestId('search-empty-state')).not.toBeInTheDocument();
  });

  it('hides Search with Escape and returns focus to the disclosure', async () => {
    mocks.setSearchParams('focus=search');
    await act(async () => {
      render(<UnifiedRecipesPage />);
    });
    const input = screen.getByTestId('recipe-search-input');
    await waitFor(() => expect(input).toHaveFocus());
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.getByTestId('recipes-search-disclosure')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.getByTestId('recipes-search-disclosure')).toHaveFocus();
  });

  it('lets the current initial Search settle while its controls stay hidden', async () => {
    let completeInitial: ((response: ReturnType<typeof makeSearchResponse>) => void) | undefined;
    mocks.searchRecipes.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          completeInitial = resolve;
        })
    );
    mocks.setSearchParams('');
    await act(async () => {
      render(<UnifiedRecipesPage />);
    });
    fireEvent.click(screen.getByTestId('recipes-search-disclosure'));
    fireEvent.change(screen.getByTestId('recipe-search-input'), { target: { value: 'chicken' } });
    fireEvent.keyDown(screen.getByTestId('recipe-search-input'), { key: 'Enter' });
    fireEvent.click(screen.getByTestId('recipes-search-disclosure'));
    expect(screen.getByTestId('browse-all-loader')).toBeInTheDocument();
    await act(async () => completeInitial?.(makeSearchResponse()));
    await waitFor(() =>
      expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Soup')
    );
    expect(mocks.searchRecipes).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('recipes-search-disclosure')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('keeps a hidden continuation in flight and appends its result without reopening controls', async () => {
    let completeCursor: ((response: ReturnType<typeof makeSearchResponse>) => void) | undefined;
    mocks.searchRecipes.mockResolvedValueOnce(makeSearchResponse({ nextCursor: 'cursor-2' }));
    mocks.searchRecipes.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          completeCursor = resolve;
        })
    );
    mocks.setSearchParams('');
    await act(async () => {
      render(<UnifiedRecipesPage />);
    });
    fireEvent.click(screen.getByTestId('recipes-search-disclosure'));
    fireEvent.change(screen.getByTestId('recipe-search-input'), { target: { value: 'chicken' } });
    fireEvent.keyDown(screen.getByTestId('recipe-search-input'), { key: 'Enter' });
    await waitFor(() =>
      expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Soup')
    );
    fireEvent.click(screen.getByTestId('unit-stack-next'));
    fireEvent.click(screen.getByTestId('unit-stack-next'));
    fireEvent.click(screen.getByTestId('recipes-search-disclosure'));
    expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Pasta');
    await act(async () =>
      completeCursor?.(
        makeSearchResponse({
          topPick: null,
          results: [{ ...makeSearchResult(3), name: 'Third match' }],
          nextCursor: null,
        })
      )
    );
    await waitFor(() =>
      expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Third match')
    );
    expect(screen.getByTestId('recipes-search-disclosure')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(mocks.searchRecipes).toHaveBeenCalledTimes(2);
  });

  it('shows a hidden initial failure as a retryable error without another request', async () => {
    let failInitial: ((error: Error) => void) | undefined;
    mocks.searchRecipes.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          failInitial = reject;
        })
    );
    mocks.setSearchParams('');
    await act(async () => {
      render(<UnifiedRecipesPage />);
    });
    fireEvent.click(screen.getByTestId('recipes-search-disclosure'));
    fireEvent.change(screen.getByTestId('recipe-search-input'), { target: { value: 'chicken' } });
    fireEvent.keyDown(screen.getByTestId('recipe-search-input'), { key: 'Enter' });
    fireEvent.click(screen.getByTestId('recipes-search-disclosure'));
    await act(async () => failInitial?.(new Error('offline')));
    await waitFor(() => expect(screen.getByTestId('search-request-error')).toBeInTheDocument());
    expect(screen.queryByTestId('search-empty-state')).not.toBeInTheDocument();
    expect(screen.getByTestId('recipes-search-disclosure')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(mocks.searchRecipes).toHaveBeenCalledTimes(1);
  });

  it('discards Search on ordinary departure and ignores the departed response', async () => {
    let completeOld: ((response: ReturnType<typeof makeSearchResponse>) => void) | undefined;
    mocks.searchRecipes.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          completeOld = resolve;
        })
    );
    mocks.setSearchParams('');
    const first = render(<UnifiedRecipesPage />);
    await waitFor(() => expect(mocks.recipesGet).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId('recipes-search-disclosure'));
    fireEvent.change(screen.getByTestId('recipe-search-input'), { target: { value: 'chicken' } });
    fireEvent.keyDown(screen.getByTestId('recipe-search-input'), { key: 'Enter' });
    expect(mocks.searchRecipes).toHaveBeenCalledTimes(1);
    first.unmount();
    await act(async () => completeOld?.(makeSearchResponse()));
    await act(async () => {
      render(<UnifiedRecipesPage />);
    });
    await waitFor(() => expect(mocks.recipesGet).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('recipes-search-disclosure')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.queryByTestId('recipe-search-input')).not.toBeInTheDocument();
    expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Soup');
    expect(mocks.searchRecipes).toHaveBeenCalledTimes(1);
  });

  it('refreshes a hidden Search after promotion invalidation with its submitted request', async () => {
    mocks.setSearchParams('');
    mocks.searchRecipes.mockResolvedValueOnce(makeSearchResponse());
    mocks.searchRecipes.mockResolvedValueOnce(
      makeSearchResponse({
        topPick: null,
        results: [{ ...makeSearchResult(3), name: 'Fresh recipe' }],
      })
    );
    await act(async () => {
      render(<UnifiedRecipesPage />);
    });
    fireEvent.click(screen.getByTestId('recipes-search-disclosure'));
    fireEvent.change(screen.getByTestId('recipe-search-input'), { target: { value: 'chicken' } });
    fireEvent.keyDown(screen.getByTestId('recipe-search-input'), { key: 'Enter' });
    await waitFor(() =>
      expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Soup')
    );
    fireEvent.click(screen.getByTestId('recipes-search-disclosure'));
    await act(async () => useSearchPromotionStore.getState().invalidate());
    await waitFor(() =>
      expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Fresh recipe')
    );
    expect(mocks.searchRecipes).toHaveBeenCalledTimes(2);
    expect(mocks.searchRecipes).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: 'chicken' })
    );
    expect(screen.getByTestId('recipes-search-disclosure')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('refreshes active Explore after promotion invalidation without POST Search', async () => {
    mocks.setSearchParams('');
    await act(async () => {
      render(<UnifiedRecipesPage />);
    });
    await waitFor(() => expect(mocks.recipesGet).toHaveBeenCalledTimes(1));
    await act(async () => useSearchPromotionStore.getState().invalidate());
    await waitFor(() => expect(mocks.recipesGet).toHaveBeenCalledTimes(2));
    expect(mocks.searchRecipes).not.toHaveBeenCalled();
    expect(screen.getByTestId('recipes-search-disclosure')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('keeps an Explore card and offers read retry after invalidation refresh fails', async () => {
    mocks.setSearchParams('');
    await act(async () => {
      render(<UnifiedRecipesPage />);
    });
    await waitFor(() =>
      expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Soup')
    );
    mocks.recipesGet.mockRejectedValueOnce(new Error('offline'));
    await act(async () => useSearchPromotionStore.getState().invalidate());
    await waitFor(() => expect(screen.getByTestId('browse-request-error')).toBeInTheDocument());
    expect(screen.getByTestId('stack-card-front')).toHaveTextContent('Chicken Soup');
    fireEvent.click(screen.getByTestId('browse-request-retry'));
    await waitFor(() => expect(mocks.recipesGet).toHaveBeenCalledTimes(3));
    expect(screen.queryByTestId('browse-request-error')).not.toBeInTheDocument();
  });
});
