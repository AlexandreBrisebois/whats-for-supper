import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { useFamilyStore } from '@/store/familyStore';
import { useSearchPromotionStore } from '@/store/searchPromotionStore';

const mocks = vi.hoisted(() => {
  const searchRecipes = vi.fn();
  const getRecipe = vi.fn();
  const updateRecipe = vi.fn();
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
  let searchParams = new URLSearchParams('');
  let familySettings: Record<string, unknown> = {};

  return {
    searchRecipes,
    getRecipe,
    updateRecipe,
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
}));

vi.mock('@/locales', () => ({
  t: (_key: string, fallback: string) => fallback,
  tWithVars: (_key: string, fallback: string) => fallback,
}));

vi.mock('@/lib/utils', () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' '),
}));

vi.mock('@/lib/api/recipes', () => ({
  searchRecipes: (...args: unknown[]) => mocks.searchRecipes(...args),
  getRecipe: (...args: unknown[]) => mocks.getRecipe(...args),
  updateRecipe: (...args: unknown[]) => mocks.updateRecipe(...args),
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
      selectedFamilyMemberId: 'member-1',
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

import RecipesPage from './page';

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
    searchMode: 'standard',
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
    mocks.setSearchParams('');
    mocks.setFamilySettings({});
    mocks.searchRecipes.mockResolvedValue(makeSearchResponse());
    mocks.getRecipe.mockResolvedValue(makeRecipeDetail());
    mocks.updateRecipe.mockResolvedValue(undefined);
    mocks.loadSetting.mockResolvedValue(null);
    mocks.loadGoTo.mockResolvedValue({ items: [] });
    mocks.saveGoTo.mockResolvedValue(undefined);
    mocks.loadActiveGoTo.mockResolvedValue(null);
    mocks.saveGoTo.mockImplementation(async (value: any) => {
      mocks.setFamilySettings({ ...mocks.getFamilySettings(), family_goto: value });
    });
    mocks.saveSetting.mockImplementation(async (key: string, value: unknown) => {
      mocks.setFamilySettings({ ...mocks.getFamilySettings(), [key]: value });
    });
    mocks.assignRecipeToDay.mockResolvedValue(undefined);
    mocks.getSchedule.mockResolvedValue({
      weekOffset: 0,
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

  it('renders the standard search input after load', async () => {
    await act(async () => {
      render(<RecipesPage />);
    });

    expect(screen.getByTestId('recipe-search-input')).toBeInTheDocument();
  });

  it('fires recipe search on mount and again when Enter is pressed with the current query', async () => {
    await act(async () => {
      render(<RecipesPage />);
    });

    await waitFor(() => {
      expect(mocks.searchRecipes).toHaveBeenCalledWith({
        query: '',
        limit: 12,
        weekOffset: undefined,
        dayIndex: undefined,
        similarToRecipeId: undefined,
      });
    });

    fireEvent.change(screen.getByTestId('recipe-search-input'), {
      target: { value: 'chicken' },
    });
    fireEvent.keyDown(screen.getByTestId('recipe-search-input'), {
      key: 'Enter',
      code: 'Enter',
      charCode: 13,
    });

    await waitFor(() => {
      expect(mocks.searchRecipes).toHaveBeenLastCalledWith({
        query: 'chicken',
        limit: 12,
        weekOffset: undefined,
        dayIndex: undefined,
        similarToRecipeId: undefined,
        pantrySnapshotId: undefined,
        filters: undefined,
      });
    });
  });

  it('waits until typing has settled before searching', async () => {
    await act(async () => {
      render(<RecipesPage />);
    });

    await waitFor(() => expect(mocks.searchRecipes).toHaveBeenCalledTimes(1));
    vi.useFakeTimers();
    try {
      fireEvent.change(screen.getByTestId('recipe-search-input'), { target: { value: 'chi' } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(499);
      });
      expect(mocks.searchRecipes).toHaveBeenCalledTimes(1);

      fireEvent.change(screen.getByTestId('recipe-search-input'), { target: { value: 'chicken' } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      expect(mocks.searchRecipes).toHaveBeenLastCalledWith(
        expect.objectContaining({ query: 'chicken' })
      );
      expect(mocks.searchRecipes).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders the top pick card and alternate cards from the search response', async () => {
    await act(async () => {
      render(<RecipesPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('recipe-card-top-pick')).toBeInTheDocument();
    });

    expect(screen.getByTestId('recipe-card-top-pick')).toHaveTextContent('Chicken Soup');
    expect(
      screen.getByTestId('recipe-card-22222222-2222-2222-2222-222222222222')
    ).toBeInTheDocument();
  });

  it('top-pick-feeling-lucky button promotes a different result without changing query', async () => {
    await act(async () => {
      render(<RecipesPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('recipe-card-top-pick')).toBeInTheDocument();
    });

    const callsBefore = mocks.searchRecipes.mock.calls.length;
    fireEvent.click(screen.getByTestId('top-pick-feeling-lucky'));

    expect(screen.getByTestId('recipe-card-top-pick')).toHaveTextContent('Chicken Pasta');
    expect(mocks.searchRecipes.mock.calls.length).toBe(callsBefore);
    expect(screen.getByTestId('recipe-search-input')).toHaveValue('');
  });

  it('top-pick-feeling-lucky ignores ineligible and import-issue results', async () => {
    mocks.searchRecipes.mockResolvedValue(
      makeSearchResponse({
        results: [
          {
            ...makeSearchResult(2),
            name: 'Reported Chicken',
            importIssueStatus: 'reported',
          },
          {
            ...makeSearchResult(4),
            name: 'Ineligible Chicken',
            isPromotionEligible: false,
          },
          {
            ...makeSearchResult(3),
            name: 'Eligible Chicken',
            importIssueStatus: null,
          },
        ],
      })
    );
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    await act(async () => {
      render(<RecipesPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('recipe-card-top-pick')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('top-pick-feeling-lucky'));

    expect(screen.getByTestId('recipe-card-top-pick')).toHaveTextContent('Eligible Chicken');
    expect(screen.getByText('Reported Chicken')).toBeInTheDocument();
    randomSpy.mockRestore();
  });

  it('leaves the current result set intact and makes Surprise Me unavailable without an eligible alternate', async () => {
    mocks.searchRecipes.mockResolvedValue(
      makeSearchResponse({
        results: [
          {
            ...makeSearchResult(2),
            name: 'Ineligible Chicken',
            isPromotionEligible: false,
          },
          {
            ...makeSearchResult(3),
            name: 'Reported Chicken',
            importIssueStatus: 'readyToReview',
          },
        ],
      })
    );

    await act(async () => {
      render(<RecipesPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('recipe-card-top-pick')).toHaveTextContent('Chicken Soup');
    });

    const callsBefore = mocks.searchRecipes.mock.calls.length;
    const surpriseMe = screen.getByTestId('top-pick-feeling-lucky');
    expect(surpriseMe).toBeDisabled();
    expect(surpriseMe).toHaveAccessibleDescription('No eligible alternate pick is available');

    fireEvent.click(surpriseMe);

    expect(screen.getByTestId('recipe-card-top-pick')).toHaveTextContent('Chicken Soup');
    expect(mocks.searchRecipes).toHaveBeenCalledTimes(callsBefore);
  });

  it('loads more search results from an infinite-scroll sentinel instead of a manual button', async () => {
    const observerCallbacks: IntersectionObserverCallback[] = [];
    const observerOptions: IntersectionObserverInit[] = [];
    const observe = vi.fn();
    const disconnect = vi.fn();
    const originalIntersectionObserver = globalThis.IntersectionObserver;

    class MockIntersectionObserver implements IntersectionObserver {
      readonly root = null;
      rootMargin = '';
      readonly scrollMargin = '0px 0px 0px 0px';
      readonly thresholds = [0];

      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        observerCallbacks.push(callback);
        observerOptions.push(options ?? {});
        this.rootMargin = options?.rootMargin ?? '';
      }

      observe = observe;
      unobserve = vi.fn();
      disconnect = disconnect;
      takeRecords = vi.fn(() => []);
    }

    globalThis.IntersectionObserver = MockIntersectionObserver;
    mocks.searchRecipes.mockResolvedValueOnce(
      makeSearchResponse({
        results: Array.from({ length: 6 }, (_, index) => makeSearchResult(index + 2)),
        resultPath: 'browse',
        nextCursor: 'cursor-page-two',
      })
    );
    mocks.searchRecipes.mockResolvedValueOnce(
      makeSearchResponse({
        topPick: null,
        results: Array.from({ length: 7 }, (_, index) => makeSearchResult(index + 8)),
      })
    );

    try {
      await act(async () => {
        render(<RecipesPage />);
      });

      await waitFor(() => {
        expect(screen.getByTestId('search-results-scroll-sentinel')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('show-more-results')).not.toBeInTheDocument();
      expect(observe).toHaveBeenCalledWith(screen.getByTestId('search-results-scroll-sentinel'));
      expect(observerOptions).toContainEqual({ rootMargin: '400px 0px' });

      await act(async () => {
        observerCallbacks[0]?.(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          {} as IntersectionObserver
        );
      });

      await waitFor(() => {
        expect(mocks.searchRecipes).toHaveBeenLastCalledWith({
          query: '',
          limit: 24,
          continuationToken: 'cursor-page-two',
          weekOffset: undefined,
          dayIndex: undefined,
          similarToRecipeId: undefined,
          pantrySnapshotId: undefined,
          filters: undefined,
        });
      });
    } finally {
      globalThis.IntersectionObserver = originalIntersectionObserver;
    }
  });

  it('keeps one browse continuation in flight when the observer fires repeatedly', async () => {
    const observerCallbacks: IntersectionObserverCallback[] = [];
    const originalIntersectionObserver = globalThis.IntersectionObserver;
    let resolveContinuation: ((value: ReturnType<typeof makeSearchResponse>) => void) | undefined;

    class MockIntersectionObserver implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = '400px 0px';
      readonly scrollMargin = '0px 0px 0px 0px';
      readonly thresholds = [0];

      constructor(callback: IntersectionObserverCallback) {
        observerCallbacks.push(callback);
      }

      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
      takeRecords = vi.fn(() => []);
    }

    globalThis.IntersectionObserver = MockIntersectionObserver;
    mocks.searchRecipes.mockResolvedValueOnce(
      makeSearchResponse({ resultPath: 'browse', nextCursor: 'cursor-page-two' })
    );
    mocks.searchRecipes.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveContinuation = resolve;
        })
    );

    try {
      await act(async () => {
        render(<RecipesPage />);
      });
      await waitFor(() => expect(observerCallbacks).not.toHaveLength(0));

      await act(async () => {
        const entry = [{ isIntersecting: true } as IntersectionObserverEntry];
        observerCallbacks[0]?.(entry, {} as IntersectionObserver);
        observerCallbacks[0]?.(entry, {} as IntersectionObserver);
      });

      expect(mocks.searchRecipes).toHaveBeenCalledTimes(2);

      await act(async () => {
        resolveContinuation?.(
          makeSearchResponse({ topPick: null, resultPath: 'browse', results: [] })
        );
      });
    } finally {
      globalThis.IntersectionObserver = originalIntersectionObserver;
    }
  });

  it('does not let an obsolete initial browse response replace a newer search', async () => {
    vi.useFakeTimers();
    let resolveInitial: ((value: ReturnType<typeof makeSearchResponse>) => void) | undefined;
    mocks.searchRecipes.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveInitial = resolve;
        })
    );
    mocks.searchRecipes.mockResolvedValueOnce(
      makeSearchResponse({
        topPick: null,
        results: [{ ...makeSearchResult(9), name: 'New search result' }],
      })
    );

    try {
      render(<RecipesPage />);
      fireEvent.change(screen.getByTestId('recipe-search-input'), {
        target: { value: 'new query' },
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
        await Promise.resolve();
      });
      expect(screen.getByText('New search result')).toBeInTheDocument();

      await act(async () => {
        resolveInitial?.(
          makeSearchResponse({
            topPick: null,
            results: [{ ...makeSearchResult(8), name: 'Old browse result' }],
          })
        );
      });

      expect(screen.getByText('New search result')).toBeInTheDocument();
      expect(screen.queryByText('Old browse result')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('restarts an open browse generation when Search promotion eligibility is invalidated', async () => {
    mocks.searchRecipes.mockResolvedValueOnce(
      makeSearchResponse({ resultPath: 'browse', nextCursor: 'stale-cursor' })
    );
    mocks.searchRecipes.mockResolvedValueOnce(
      makeSearchResponse({
        resultPath: 'browse',
        topPick: null,
        results: [{ ...makeSearchResult(31), name: 'Fresh after schedule change' }],
      })
    );

    await act(async () => {
      render(<RecipesPage />);
    });
    await waitFor(() => expect(mocks.searchRecipes).toHaveBeenCalledTimes(1));

    await act(async () => {
      useSearchPromotionStore.getState().invalidate();
    });

    await waitFor(() => {
      expect(mocks.searchRecipes).toHaveBeenLastCalledWith(
        expect.objectContaining({ query: '', limit: 12 })
      );
    });
    expect(await screen.findByText('Fresh after schedule change')).toBeInTheDocument();
  });

  it('retains active filters, Focus concepts, and planning context when promotion eligibility refreshes', async () => {
    mocks.setSearchParams('addToDay=2&weekOffset=1');
    mocks.searchRecipes.mockResolvedValue(makeSearchResponse({ resultPath: 'browse' }));

    await act(async () => {
      render(<RecipesPage />);
    });
    await waitFor(() => expect(mocks.searchRecipes).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByTestId('mobile-filters-button'));
    const dialog = screen.getByRole('dialog', { name: 'Filter recipes' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Supper' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Beef' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply filters' }));

    await waitFor(() => {
      expect(mocks.searchRecipes).toHaveBeenLastCalledWith(
        expect.objectContaining({
          query: '',
          weekOffset: 1,
          dayIndex: 2,
          filters: { mealTypes: ['Supper'] },
          preferences: { concepts: ['beef'] },
        })
      );
    });

    await act(async () => {
      useSearchPromotionStore.getState().invalidate();
    });

    await waitFor(() => {
      expect(mocks.searchRecipes).toHaveBeenLastCalledWith(
        expect.objectContaining({
          query: '',
          weekOffset: 1,
          dayIndex: 2,
          filters: { mealTypes: ['Supper'] },
          preferences: { concepts: ['beef'] },
        })
      );
    });
  });

  it('renders the empty state when search returns no top pick and no results', async () => {
    mocks.searchRecipes.mockResolvedValue(
      makeSearchResponse({
        topPick: null,
        results: [],
      })
    );

    await act(async () => {
      render(<RecipesPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('search-empty-state')).toBeInTheDocument();
    });
  });

  it('shows planner mode banner when planner context is present', async () => {
    mocks.setSearchParams('addToDay=2&weekOffset=0');

    await act(async () => {
      render(<RecipesPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('planning-mode-banner')).toBeInTheDocument();
    });
  });

  it('opens the detail sheet from a result card and closes it without re-running search or clearing results', async () => {
    await act(async () => {
      render(<RecipesPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('recipe-card-top-pick')).toBeInTheDocument();
    });

    expect(mocks.searchRecipes).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('recipe-card-top-pick'));

    await waitFor(() => {
      expect(screen.getByTestId('recipe-detail-sheet')).toBeInTheDocument();
    });

    expect(screen.getByTestId('recipe-detail-name')).toHaveTextContent('Chicken Soup');
    expect(screen.getByTestId('recipe-notes-input')).toHaveValue('Family favorite.');
    expect(screen.getByRole('button', { name: 'Like' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('action-set-goto')).toBeInTheDocument();
    expect(screen.getByTestId('action-cook-this')).toBeInTheDocument();
    expect(screen.getByTestId('action-find-similar')).toBeInTheDocument();
    expect(screen.getByTestId('action-toggle-discovery')).toBeInTheDocument();

    // Actions now in gear menu
    expect(screen.getByTestId('action-gear-menu')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('action-gear-menu'));
    expect(screen.getByTestId('action-move-to-bin')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('action-close-sheet'));

    await waitFor(() => {
      expect(screen.queryByTestId('recipe-detail-sheet')).not.toBeInTheDocument();
    });

    expect(mocks.searchRecipes).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('recipe-card-top-pick')).toBeInTheDocument();
    expect(screen.getByTestId('recipe-search-input')).toHaveValue('');
  });

  it('marks a recipe as the family GOTO from the detail sheet star pill', async () => {
    await act(async () => {
      render(<RecipesPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('recipe-card-top-pick')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('recipe-card-top-pick'));

    await waitFor(() => {
      expect(screen.getByTestId('action-set-goto')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('action-set-goto'));
    await waitFor(() => {
      expect(mocks.saveGoTo).toHaveBeenCalledWith({
        items: [
          {
            recipeId: '11111111-1111-1111-1111-111111111111',
            description: 'Chicken Soup',
            imageUrl: 'https://example.com/chicken-soup.jpg',
            status: 'ready',
          },
        ],
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('action-current-goto')).toHaveTextContent('GOTO');
    });
    expect(screen.queryByTestId('action-set-goto')).not.toBeInTheDocument();
  });

  it('shows the current GOTO pill without re-saving when the detail recipe is already GOTO', async () => {
    mocks.setFamilySettings({
      family_goto: {
        items: [
          {
            recipeId: '11111111-1111-1111-1111-111111111111',
            description: 'Chicken Soup',
            imageUrl: 'https://example.com/chicken-soup.jpg',
            status: 'ready',
          },
        ],
      },
    });

    await act(async () => {
      render(<RecipesPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('recipe-card-top-pick')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('recipe-card-top-pick'));

    await waitFor(() => {
      expect(screen.getByTestId('action-current-goto')).toHaveTextContent('GOTO');
    });

    fireEvent.click(screen.getByTestId('action-current-goto'));
    await waitFor(() => {
      expect(mocks.saveGoTo).toHaveBeenCalledWith({
        items: [],
      });
    });
  });

  it('edits notes and rating from the detail sheet using PATCH calls', async () => {
    await act(async () => {
      render(<RecipesPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('recipe-card-top-pick')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('recipe-card-top-pick'));

    await waitFor(() => {
      expect(screen.getByTestId('recipe-detail-sheet')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('recipe-notes-input'), {
      target: { value: 'kids loved it' },
    });

    await waitFor(() => {
      expect(mocks.updateRecipe).toHaveBeenCalledWith(
        '11111111-1111-1111-1111-111111111111',
        expect.objectContaining({ notes: 'kids loved it' })
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'Love' }));

    await waitFor(() => {
      expect(mocks.updateRecipe).toHaveBeenCalledWith(
        '11111111-1111-1111-1111-111111111111',
        expect.objectContaining({ rating: 3 })
      );
    });

    expect(screen.getByTestId('recipe-detail-sheet')).toBeInTheDocument();
  });

  it('edits recipe card fields in edit mode and saves them with one PATCH call', async () => {
    await act(async () => {
      render(<RecipesPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('recipe-card-top-pick')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('recipe-card-top-pick'));

    await waitFor(() => {
      expect(screen.getByTestId('recipe-detail-sheet')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('action-gear-menu'));
    fireEvent.click(screen.getByTestId('action-edit-recipe'));
    fireEvent.change(screen.getByTestId('recipe-edit-name-input'), {
      target: { value: 'Chicken Soup Deluxe' },
    });
    fireEvent.change(screen.getByTestId('recipe-edit-description-input'), {
      target: { value: 'A warmer soup for the weeknight table.' },
    });
    fireEvent.change(screen.getByTestId('recipe-edit-ingredient-1'), {
      target: { value: 'Rich chicken broth' },
    });
    fireEvent.click(screen.getByTestId('recipe-add-ingredient'));
    fireEvent.change(screen.getByTestId('recipe-edit-ingredient-3'), {
      target: { value: 'Parsley' },
    });

    fireEvent.click(screen.getByTestId('recipe-save-edits'));

    await waitFor(() => {
      expect(mocks.updateRecipe).toHaveBeenCalledWith(
        '11111111-1111-1111-1111-111111111111',
        expect.objectContaining({
          name: 'Chicken Soup Deluxe',
          description: 'A warmer soup for the weeknight table.',
          ingredients: ['Chicken', 'Rich chicken broth', 'Carrots', 'Parsley'],
          mealTypes: ['Supper'],
        })
      );
    });

    expect(screen.getByTestId('recipe-detail-name')).toHaveTextContent('Chicken Soup Deluxe');
    expect(screen.getByText('Rich chicken broth')).toBeInTheDocument();
  });

  it('cancels recipe card edits without patching editable fields', async () => {
    await act(async () => {
      render(<RecipesPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('recipe-card-top-pick')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('recipe-card-top-pick'));

    await waitFor(() => {
      expect(screen.getByTestId('recipe-detail-sheet')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('action-gear-menu'));
    fireEvent.click(screen.getByTestId('action-edit-recipe'));
    fireEvent.change(screen.getByTestId('recipe-edit-name-input'), {
      target: { value: 'Unsaved Soup' },
    });
    fireEvent.click(screen.getByTestId('recipe-cancel-edits'));

    expect(mocks.updateRecipe).not.toHaveBeenCalled();
    expect(screen.getByTestId('recipe-detail-name')).toHaveTextContent('Chicken Soup');
  });

  it('renders the planner CTA in planner mode and assigns the recipe back to the planner', async () => {
    mocks.setSearchParams('addToDay=2&weekOffset=0');

    await act(async () => {
      render(<RecipesPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('recipe-card-top-pick')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('recipe-card-top-pick'));

    await waitFor(() => {
      expect(screen.getByTestId('action-add-to-day')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('action-add-to-day'));

    await waitFor(() => {
      expect(mocks.assignRecipeToDay).toHaveBeenCalledWith(0, 2, {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Chicken Soup',
        image: 'https://example.com/chicken-soup.jpg',
      });
    });

    expect(mocks.push).toHaveBeenCalledWith('/planner?success=1&dayIndex=2&weekOffset=0');
  });

  describe('Filter controls', () => {
    it('uses the full filter chooser instead of desktop-only shortcut pills', async () => {
      await act(async () => {
        render(<RecipesPage />);
      });

      await waitFor(() => {
        expect(screen.getByTestId('mobile-filters-button')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('desktop-recipe-filters')).not.toBeInTheDocument();
    });

    it('applies a shortcut from the full filter chooser', async () => {
      await act(async () => {
        render(<RecipesPage />);
      });

      await waitFor(() => {
        expect(screen.getByTestId('mobile-filters-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('mobile-filters-button'));
      const dialog = screen.getByRole('dialog', { name: 'Filter recipes' });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Never Tried' }));
      fireEvent.click(within(dialog).getByRole('button', { name: 'Apply filters' }));

      await waitFor(() => {
        expect(mocks.searchRecipes).toHaveBeenLastCalledWith(
          expect.objectContaining({ filters: expect.objectContaining({ neverCooked: true }) })
        );
      });
    });
  });

  describe('responsive import-review filters and card status', () => {
    it('shows Reported and Ready to review badges only on matching result cards', async () => {
      mocks.searchRecipes.mockResolvedValue(
        makeSearchResponse({
          topPick: null,
          results: [
            { ...makeSearchResult(2), name: 'No Issue', importIssueStatus: null },
            { ...makeSearchResult(3), name: 'Needs Fixing', importIssueStatus: 'reported' },
            {
              ...makeSearchResult(4),
              name: 'Check This One',
              importIssueStatus: 'readyToReview',
            },
          ],
        })
      );

      await act(async () => {
        render(<RecipesPage />);
      });

      const noIssueCard = await screen.findByTestId(`recipe-card-${makeSearchResult(2).id}`);
      const reportedCard = screen.getByTestId(`recipe-card-${makeSearchResult(3).id}`);
      const readyCard = screen.getByTestId(`recipe-card-${makeSearchResult(4).id}`);

      expect(within(noIssueCard).queryByLabelText(/Import issue status:/)).not.toBeInTheDocument();
      expect(
        within(reportedCard).getByLabelText('Import issue status: Reported')
      ).toBeInTheDocument();
      expect(
        within(readyCard).getByLabelText('Import issue status: Reimported — check recipe')
      ).toBeInTheDocument();
    });

    it('uses one mobile Filters button with draft apply, dismiss, clear, and active count', async () => {
      await act(async () => {
        render(<RecipesPage />);
      });

      const filtersButton = await screen.findByTestId('mobile-filters-button');
      expect(screen.getAllByRole('button', { name: /^Filters/ })).toHaveLength(1);
      expect(filtersButton).toHaveTextContent('Filters');
      expect(filtersButton).toHaveTextContent('0');

      fireEvent.click(filtersButton);
      const dialog = screen.getByRole('dialog', { name: 'Filter recipes' });
      for (const label of ['Quick', 'Family Favorite', 'Never Tried', 'Supper', 'Beef']) {
        expect(within(dialog).getByRole('button', { name: label })).toBeInTheDocument();
      }
      expect(within(dialog).queryByRole('button', { name: 'Reported' })).not.toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole('button', { name: 'More filters' }));

      const callsBeforeCancel = mocks.searchRecipes.mock.calls.length;
      fireEvent.click(within(dialog).getByRole('button', { name: 'Reported' }));
      fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
      expect(mocks.searchRecipes).toHaveBeenCalledTimes(callsBeforeCancel);
      expect(filtersButton).toHaveTextContent('0');

      fireEvent.click(filtersButton);
      const applyDialog = screen.getByRole('dialog', { name: 'Filter recipes' });
      fireEvent.click(within(applyDialog).getByRole('button', { name: 'More filters' }));
      fireEvent.click(within(applyDialog).getByRole('button', { name: 'Reported' }));
      fireEvent.click(within(applyDialog).getByRole('button', { name: 'Ready to review' }));
      fireEvent.click(within(applyDialog).getByRole('button', { name: 'Apply filters' }));

      await waitFor(() => {
        expect(mocks.searchRecipes).toHaveBeenLastCalledWith(
          expect.objectContaining({
            filters: { reportedOnly: true, readyToReviewOnly: true },
          })
        );
      });
      expect(filtersButton).toHaveTextContent('2');

      fireEvent.click(filtersButton);
      const clearDialog = screen.getByRole('dialog', { name: 'Filter recipes' });
      fireEvent.click(within(clearDialog).getByRole('button', { name: 'Clear filters' }));
      fireEvent.click(within(clearDialog).getByRole('button', { name: 'Apply filters' }));

      await waitFor(() => {
        expect(mocks.searchRecipes).toHaveBeenLastCalledWith(
          expect.objectContaining({ filters: undefined })
        );
      });
      expect(filtersButton).toHaveTextContent('0');
    });

    it('omits Top Pick while a review filter is active and renders matches as regular results', async () => {
      mocks.searchRecipes.mockResolvedValue(
        makeSearchResponse({
          topPick: {
            ...makeSearchResult(1),
            name: 'Should Not Be Promoted',
            importIssueStatus: 'reported',
          },
          results: [
            { ...makeSearchResult(2), name: 'Reported Result', importIssueStatus: 'reported' },
          ],
        })
      );

      await act(async () => {
        render(<RecipesPage />);
      });

      fireEvent.click(await screen.findByTestId('mobile-filters-button'));
      const dialog = screen.getByRole('dialog', { name: 'Filter recipes' });
      fireEvent.click(within(dialog).getByRole('button', { name: 'More filters' }));
      fireEvent.click(within(dialog).getByRole('button', { name: 'Reported' }));
      fireEvent.click(within(dialog).getByRole('button', { name: 'Apply filters' }));

      await waitFor(() => {
        expect(screen.queryByTestId('recipe-card-top-pick')).not.toBeInTheDocument();
      });
      expect(screen.getByText('Reported Result')).toBeInTheDocument();
    });
  });

  it('toggling discovery from the detail sheet calls PATCH with isDiscoverable and keeps the sheet open', async () => {
    await act(async () => {
      render(<RecipesPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('recipe-card-top-pick')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('recipe-card-top-pick'));

    await waitFor(() => {
      expect(screen.getByTestId('action-toggle-discovery')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('action-toggle-discovery'));

    await waitFor(() => {
      expect(mocks.updateRecipe).toHaveBeenCalledWith(
        '11111111-1111-1111-1111-111111111111',
        expect.objectContaining({ isDiscoverable: expect.any(Boolean) })
      );
    });

    expect(screen.getByTestId('recipe-detail-sheet')).toBeInTheDocument();
  });

  it('runs a similar search from the detail sheet with an empty query and the current recipe id', async () => {
    await act(async () => {
      render(<RecipesPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('recipe-card-top-pick')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('recipe-search-input'), {
      target: { value: 'chicken' },
    });

    fireEvent.click(screen.getByTestId('recipe-card-top-pick'));

    await waitFor(() => {
      expect(screen.getByTestId('action-find-similar')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('action-find-similar'));

    await waitFor(() => {
      expect(mocks.searchRecipes).toHaveBeenLastCalledWith({
        query: '',
        limit: 12,
        weekOffset: undefined,
        dayIndex: undefined,
        similarToRecipeId: '11111111-1111-1111-1111-111111111111',
      });
    });

    expect(screen.getByTestId('recipe-search-input')).toHaveValue('');
    expect(screen.queryByTestId('recipe-detail-sheet')).not.toBeInTheDocument();
  });

  it('blurs the search input when Enter is pressed', async () => {
    await act(async () => {
      render(<RecipesPage />);
    });
    const input = screen.getByTestId('recipe-search-input') as HTMLInputElement;
    input.focus();
    expect(input).toHaveFocus();

    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(input).not.toHaveFocus();
  });

  it('fires recipe search on mount with similarToRecipeId if provided in search params', async () => {
    mocks.setSearchParams('similarTo=recipe-123');

    await act(async () => {
      render(<RecipesPage />);
    });

    await waitFor(() => {
      expect(mocks.searchRecipes).toHaveBeenCalledWith(
        expect.objectContaining({
          similarToRecipeId: 'recipe-123',
        })
      );
    });
  });
});
