import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const searchRecipes = vi.fn();
  const getRecipe = vi.fn();
  const updateRecipe = vi.fn();
  const assignRecipeToDay = vi.fn();
  const submitInventoryCapture = vi.fn();
  const getTrashItems = vi.fn();
  const restoreRecipe = vi.fn();
  const purgeRecipe = vi.fn();
  const push = vi.fn();
  let searchParams = new URLSearchParams('');

  return {
    searchRecipes,
    getRecipe,
    updateRecipe,
    assignRecipeToDay,
    submitInventoryCapture,
    getTrashItems,
    restoreRecipe,
    purgeRecipe,
    push,
    setSearchParams: (value: string) => {
      searchParams = new URLSearchParams(value);
    },
    getSearchParams: () => searchParams,
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

vi.mock('@/lib/api/inventory', () => ({
  submitInventoryCapture: (...args: unknown[]) => mocks.submitInventoryCapture(...args),
}));

vi.mock('@/lib/api/planner', () => ({
  assignRecipeToDay: (...args: unknown[]) => mocks.assignRecipeToDay(...args),
}));

import RecipesPage from './page';

function makeSearchResponse(overrides: Record<string, unknown> = {}) {
  return {
    topPick: {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Chicken Soup',
      imageUrl: 'https://example.com/chicken-soup.jpg',
      totalTime: '30 min',
      difficulty: 'Easy',
      rating: 2,
      isDiscoverable: true,
      notes: null,
      reasons: [{ source: 'name-match', label: 'Name matches your search' }],
      plannerFitNote: null,
    },
    results: [
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Chicken Pasta',
        imageUrl: 'https://example.com/chicken-pasta.jpg',
        totalTime: '25 min',
        difficulty: 'Medium',
        rating: 1,
        isDiscoverable: true,
        notes: null,
        reasons: [{ source: 'name-match', label: 'Name matches your search' }],
        plannerFitNote: null,
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
    difficulty: 'Easy',
    category: 'Dinner',
    rating: 2,
    notes: 'Family favorite.',
    ingredients: ['Chicken', 'Broth', 'Carrots'],
    ...overrides,
  };
}

describe('RecipesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setSearchParams('');
    mocks.searchRecipes.mockResolvedValue(makeSearchResponse());
    mocks.getRecipe.mockResolvedValue(makeRecipeDetail());
    mocks.updateRecipe.mockResolvedValue(undefined);
    mocks.assignRecipeToDay.mockResolvedValue(undefined);
    mocks.submitInventoryCapture.mockResolvedValue({
      snapshotId: 'snap-123',
      inferredIngredients: ['chicken'],
      confidence: 0.9,
    });
    mocks.getTrashItems.mockResolvedValue([]);
    mocks.restoreRecipe.mockResolvedValue(undefined);
  });

  it('renders the search input immediately and the placeholder controls after load', async () => {
    render(<RecipesPage />);

    expect(screen.getByTestId('recipe-search-input')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('agent-search-trigger')).toBeInTheDocument();
    });

    expect(screen.getByTestId('inventory-camera-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('recycle-bin-entry')).toBeInTheDocument();
  });

  it('fires recipe search on mount and again when Enter is pressed with the current query', async () => {
    render(<RecipesPage />);

    await waitFor(() => {
      expect(mocks.searchRecipes).toHaveBeenCalledWith({
        query: '',
        mode: 'standard',
        limit: 5,
        weekOffset: undefined,
        dayIndex: undefined,
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
        mode: 'standard',
        limit: 5,
        weekOffset: undefined,
        dayIndex: undefined,
      });
    });
  });

  it('renders the top pick card and alternate cards from the search response', async () => {
    render(<RecipesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('recipe-card-top-pick')).toBeInTheDocument();
    });

    expect(screen.getByTestId('recipe-card-top-pick')).toHaveTextContent('Chicken Soup');
    expect(
      screen.getByTestId('recipe-card-22222222-2222-2222-2222-222222222222')
    ).toBeInTheDocument();
  });

  it('renders the empty state when search returns no top pick and no results', async () => {
    mocks.searchRecipes.mockResolvedValue(
      makeSearchResponse({
        topPick: null,
        results: [],
      })
    );

    render(<RecipesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('search-empty-state')).toBeInTheDocument();
    });
  });

  it('shows planner mode banner when planner context is present', async () => {
    mocks.setSearchParams('addToDay=2&weekOffset=0');

    render(<RecipesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('planning-mode-banner')).toBeInTheDocument();
    });
  });

  it('opens the detail sheet from a result card and closes it without re-running search or clearing results', async () => {
    render(<RecipesPage />);

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
    expect(screen.getByTestId('recipe-rating-selector')).toHaveValue('2');
    expect(screen.getByTestId('action-save-for-tonight')).toBeInTheDocument();
    expect(screen.getByTestId('action-find-similar')).toBeInTheDocument();
    expect(screen.getByTestId('action-toggle-discovery')).toBeInTheDocument();
    expect(screen.getByTestId('action-move-to-bin')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('action-close-sheet'));

    await waitFor(() => {
      expect(screen.queryByTestId('recipe-detail-sheet')).not.toBeInTheDocument();
    });

    expect(mocks.searchRecipes).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('recipe-card-top-pick')).toBeInTheDocument();
    expect(screen.getByTestId('recipe-search-input')).toHaveValue('');
  });

  it('edits notes and rating from the detail sheet using PATCH calls', async () => {
    render(<RecipesPage />);

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

    fireEvent.change(screen.getByTestId('recipe-rating-selector'), {
      target: { value: '3' },
    });

    await waitFor(() => {
      expect(mocks.updateRecipe).toHaveBeenCalledWith(
        '11111111-1111-1111-1111-111111111111',
        expect.objectContaining({ rating: 3 })
      );
    });

    expect(screen.getByTestId('recipe-detail-sheet')).toBeInTheDocument();
  });

  it('renders the planner CTA in planner mode and assigns the recipe back to the planner', async () => {
    mocks.setSearchParams('addToDay=2&weekOffset=0');

    render(<RecipesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('recipe-card-top-pick')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('recipe-card-top-pick'));

    await waitFor(() => {
      expect(screen.getByTestId('action-use-for-day')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('action-use-for-day'));

    await waitFor(() => {
      expect(mocks.assignRecipeToDay).toHaveBeenCalledWith(0, 2, {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Chicken Soup',
        image: 'https://example.com/chicken-soup.jpg',
      });
    });

    expect(mocks.push).toHaveBeenCalledWith('/planner?success=1&dayIndex=2');
  });

  describe('Quick filter pills', () => {
    it('renders all 5 filter pills', async () => {
      render(<RecipesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('filter-new-recipes')).toBeInTheDocument();
      });

      expect(screen.getByTestId('filter-never-tried')).toBeInTheDocument();
      expect(screen.getByTestId('filter-family-favorite')).toBeInTheDocument();
      expect(screen.getByTestId('filter-quick')).toBeInTheDocument();
      expect(screen.getByTestId('filter-not-cooked-long-time')).toBeInTheDocument();
    });

    it('tapping a filter pill marks it active and fires a new search with the filter', async () => {
      render(<RecipesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('filter-never-tried')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('filter-never-tried'));

      await waitFor(() => {
        expect(screen.getByTestId('filter-never-tried-active')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(mocks.searchRecipes).toHaveBeenLastCalledWith(
          expect.objectContaining({ filters: expect.objectContaining({ neverCooked: true }) })
        );
      });
    });

    it('tapping an active filter pill deactivates it and re-runs search without that filter', async () => {
      render(<RecipesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('filter-quick')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('filter-quick'));
      await waitFor(() => expect(screen.getByTestId('filter-quick-active')).toBeInTheDocument());

      fireEvent.click(screen.getByTestId('filter-quick-active'));
      await waitFor(() => expect(screen.getByTestId('filter-quick')).toBeInTheDocument());
      expect(screen.queryByTestId('filter-quick-active')).not.toBeInTheDocument();
    });

    it('combining two filters sends both in the request', async () => {
      render(<RecipesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('filter-never-tried')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('filter-never-tried'));
      await waitFor(() =>
        expect(screen.getByTestId('filter-never-tried-active')).toBeInTheDocument()
      );

      fireEvent.click(screen.getByTestId('filter-quick'));
      await waitFor(() => expect(screen.getByTestId('filter-quick-active')).toBeInTheDocument());

      await waitFor(() => {
        expect(mocks.searchRecipes).toHaveBeenLastCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining({ neverCooked: true, quickOnly: true }),
          })
        );
      });
    });

    it('shows filter-no-results when filters are active and search returns empty', async () => {
      mocks.searchRecipes.mockResolvedValue(makeSearchResponse({ topPick: null, results: [] }));

      render(<RecipesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('filter-never-tried')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('filter-never-tried'));

      await waitFor(() => {
        expect(screen.getByTestId('filter-no-results')).toBeInTheDocument();
      });
    });
  });

  it('toggling discovery from the detail sheet calls PATCH with isDiscoverable and keeps the sheet open', async () => {
    render(<RecipesPage />);

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
    render(<RecipesPage />);

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
        mode: 'standard',
        limit: 5,
        weekOffset: undefined,
        dayIndex: undefined,
        similarToRecipeId: '11111111-1111-1111-1111-111111111111',
      });
    });

    expect(screen.getByTestId('recipe-search-input')).toHaveValue('');
    expect(screen.queryByTestId('recipe-detail-sheet')).not.toBeInTheDocument();
  });

  // ── Task 13: Inventory camera popup ─────────────────────────────────────────

  it('inventory-camera-trigger tap opens the inventory-capture-popup', async () => {
    render(<RecipesPage />);
    await waitFor(() => expect(screen.getByTestId('inventory-camera-trigger')).toBeInTheDocument());

    expect(screen.queryByTestId('inventory-capture-popup')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('inventory-camera-trigger'));

    expect(screen.getByTestId('inventory-capture-popup')).toBeInTheDocument();
  });

  it('inventory-capture-popup renders submit and cancel buttons', async () => {
    render(<RecipesPage />);
    await waitFor(() => expect(screen.getByTestId('inventory-camera-trigger')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('inventory-camera-trigger'));

    expect(screen.getByTestId('inventory-capture-submit')).toBeInTheDocument();
    expect(screen.getByTestId('inventory-capture-cancel')).toBeInTheDocument();
  });

  it('submitting the popup calls POST /api/inventory-captures and includes snapshotId in next search', async () => {
    render(<RecipesPage />);
    await waitFor(() => expect(screen.getByTestId('inventory-camera-trigger')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('inventory-camera-trigger'));
    fireEvent.click(screen.getByTestId('inventory-capture-submit'));

    await waitFor(() => {
      expect(mocks.submitInventoryCapture).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mocks.searchRecipes).toHaveBeenLastCalledWith(
        expect.objectContaining({ pantrySnapshotId: 'snap-123' })
      );
    });
  });

  it('inventory-capture-cancel closes popup without making any API call', async () => {
    const initialCallCount = mocks.searchRecipes.mock.calls.length;

    render(<RecipesPage />);
    await waitFor(() => expect(screen.getByTestId('inventory-camera-trigger')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('inventory-camera-trigger'));

    expect(screen.getByTestId('inventory-capture-popup')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('inventory-capture-cancel'));

    expect(screen.queryByTestId('inventory-capture-popup')).not.toBeInTheDocument();
    // Cancel should not trigger any additional search calls
    expect(mocks.searchRecipes.mock.calls.length).toBe(initialCallCount + 1); // only the initial mount call
  });

  it('popup shows busy message when capture returns busy status', async () => {
    mocks.submitInventoryCapture.mockResolvedValueOnce({ busy: true, retryAfterSeconds: 30 });

    render(<RecipesPage />);
    await waitFor(() => expect(screen.getByTestId('inventory-camera-trigger')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('inventory-camera-trigger'));
    fireEvent.click(screen.getByTestId('inventory-capture-submit'));

    await waitFor(() => {
      // The popup should still be visible with a retry/busy message
      expect(screen.getByTestId('inventory-capture-popup')).toBeInTheDocument();
    });
  });

  // ── Task 15: Recycle Bin UI ─────────────────────────────────────────────────

  it('recycle-bin-entry is visible on the search surface', async () => {
    render(<RecipesPage />);
    await waitFor(() => expect(screen.getByTestId('recycle-bin-entry')).toBeInTheDocument());
  });

  it('tapping recycle-bin-entry opens the trash view with trash-list', async () => {
    render(<RecipesPage />);
    await waitFor(() => expect(screen.getByTestId('recycle-bin-entry')).toBeInTheDocument());

    expect(screen.queryByTestId('trash-list')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('recycle-bin-entry'));

    await waitFor(() => expect(screen.getByTestId('trash-list')).toBeInTheDocument());
  });

  it('trash view renders items with trash-item-<id>, action-restore-<id>, action-purge-<id>', async () => {
    const TRASH_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    mocks.getTrashItems.mockResolvedValue([
      {
        id: TRASH_ID,
        name: 'Old Soup',
        imageUrl: null,
        deletedAt: '2026-05-01T00:00:00Z',
        deletedBy: null,
      },
    ]);

    render(<RecipesPage />);
    await waitFor(() => expect(screen.getByTestId('recycle-bin-entry')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('recycle-bin-entry'));

    await waitFor(() => expect(screen.getByTestId(`trash-item-${TRASH_ID}`)).toBeInTheDocument());
    expect(screen.getByTestId(`action-restore-${TRASH_ID}`)).toBeInTheDocument();
    expect(screen.getByTestId(`action-purge-${TRASH_ID}`)).toBeInTheDocument();
  });

  it('tapping action-restore-<id> calls restoreRecipe and removes the item from the list', async () => {
    const TRASH_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    mocks.getTrashItems.mockResolvedValue([
      {
        id: TRASH_ID,
        name: 'Old Soup',
        imageUrl: null,
        deletedAt: '2026-05-01T00:00:00Z',
        deletedBy: null,
      },
    ]);

    render(<RecipesPage />);
    await waitFor(() => expect(screen.getByTestId('recycle-bin-entry')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('recycle-bin-entry'));

    await waitFor(() =>
      expect(screen.getByTestId(`action-restore-${TRASH_ID}`)).toBeInTheDocument()
    );
    fireEvent.click(screen.getByTestId(`action-restore-${TRASH_ID}`));

    await waitFor(() => {
      expect(mocks.restoreRecipe).toHaveBeenCalledWith(TRASH_ID);
    });

    await waitFor(() => {
      expect(screen.queryByTestId(`trash-item-${TRASH_ID}`)).not.toBeInTheDocument();
    });
  });

  it('trash view shows trash-empty-state when items array is empty', async () => {
    mocks.getTrashItems.mockResolvedValue([]);

    render(<RecipesPage />);
    await waitFor(() => expect(screen.getByTestId('recycle-bin-entry')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('recycle-bin-entry'));

    await waitFor(() => expect(screen.getByTestId('trash-empty-state')).toBeInTheDocument());
  });

  it('restore is available without any PIN challenge', async () => {
    const TRASH_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    mocks.getTrashItems.mockResolvedValue([
      {
        id: TRASH_ID,
        name: 'Old Soup',
        imageUrl: null,
        deletedAt: '2026-05-01T00:00:00Z',
        deletedBy: null,
      },
    ]);

    render(<RecipesPage />);
    await waitFor(() => expect(screen.getByTestId('recycle-bin-entry')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('recycle-bin-entry'));

    await waitFor(() =>
      expect(screen.getByTestId(`action-restore-${TRASH_ID}`)).toBeInTheDocument()
    );

    expect(screen.queryByTestId('elevated-pin-dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId(`action-restore-${TRASH_ID}`));

    await waitFor(() => expect(mocks.restoreRecipe).toHaveBeenCalledWith(TRASH_ID));
    expect(screen.queryByTestId('elevated-pin-dialog')).not.toBeInTheDocument();
  });

  // ── Task 16: Purge + elevated PIN dialog ────────────────────────────────────

  it('tapping action-purge-<id> opens elevated-pin-dialog', async () => {
    const TRASH_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    mocks.getTrashItems.mockResolvedValue([
      {
        id: TRASH_ID,
        name: 'Old Soup',
        imageUrl: null,
        deletedAt: '2026-05-01T00:00:00Z',
        deletedBy: null,
      },
    ]);

    render(<RecipesPage />);
    await waitFor(() => expect(screen.getByTestId('recycle-bin-entry')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('recycle-bin-entry'));
    await waitFor(() => expect(screen.getByTestId(`action-purge-${TRASH_ID}`)).toBeInTheDocument());

    expect(screen.queryByTestId('elevated-pin-dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId(`action-purge-${TRASH_ID}`));

    await waitFor(() => expect(screen.getByTestId('elevated-pin-dialog')).toBeInTheDocument());
  });

  it('elevated-pin-dialog renders elevated-pin-input field', async () => {
    const TRASH_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    mocks.getTrashItems.mockResolvedValue([
      {
        id: TRASH_ID,
        name: 'Old Soup',
        imageUrl: null,
        deletedAt: '2026-05-01T00:00:00Z',
        deletedBy: null,
      },
    ]);

    render(<RecipesPage />);
    await waitFor(() => expect(screen.getByTestId('recycle-bin-entry')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('recycle-bin-entry'));
    await waitFor(() => expect(screen.getByTestId(`action-purge-${TRASH_ID}`)).toBeInTheDocument());
    fireEvent.click(screen.getByTestId(`action-purge-${TRASH_ID}`));

    await waitFor(() => expect(screen.getByTestId('elevated-pin-input')).toBeInTheDocument());
  });

  it('correct PIN submission calls purgeRecipe with X-Elevated-Pin and removes item from list', async () => {
    const TRASH_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    mocks.getTrashItems.mockResolvedValue([
      {
        id: TRASH_ID,
        name: 'Old Soup',
        imageUrl: null,
        deletedAt: '2026-05-01T00:00:00Z',
        deletedBy: null,
      },
    ]);
    mocks.purgeRecipe.mockResolvedValue(undefined);

    render(<RecipesPage />);
    await waitFor(() => expect(screen.getByTestId('recycle-bin-entry')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('recycle-bin-entry'));
    await waitFor(() => expect(screen.getByTestId(`action-purge-${TRASH_ID}`)).toBeInTheDocument());
    fireEvent.click(screen.getByTestId(`action-purge-${TRASH_ID}`));

    await waitFor(() => expect(screen.getByTestId('elevated-pin-input')).toBeInTheDocument());
    fireEvent.change(screen.getByTestId('elevated-pin-input'), { target: { value: '1234' } });
    fireEvent.submit(screen.getByTestId('elevated-pin-dialog'));

    await waitFor(() => expect(mocks.purgeRecipe).toHaveBeenCalledWith(TRASH_ID, '1234'));
    await waitFor(() =>
      expect(screen.queryByTestId(`trash-item-${TRASH_ID}`)).not.toBeInTheDocument()
    );
  });

  it('cancelling PIN dialog does NOT call purgeRecipe', async () => {
    const TRASH_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    mocks.getTrashItems.mockResolvedValue([
      {
        id: TRASH_ID,
        name: 'Old Soup',
        imageUrl: null,
        deletedAt: '2026-05-01T00:00:00Z',
        deletedBy: null,
      },
    ]);

    render(<RecipesPage />);
    await waitFor(() => expect(screen.getByTestId('recycle-bin-entry')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('recycle-bin-entry'));
    await waitFor(() => expect(screen.getByTestId(`action-purge-${TRASH_ID}`)).toBeInTheDocument());
    fireEvent.click(screen.getByTestId(`action-purge-${TRASH_ID}`));

    await waitFor(() => expect(screen.getByTestId('elevated-pin-dialog')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('elevated-pin-cancel'));

    await waitFor(() =>
      expect(screen.queryByTestId('elevated-pin-dialog')).not.toBeInTheDocument()
    );
    expect(mocks.purgeRecipe).not.toHaveBeenCalled();
  });

  it('wrong PIN shows elevated-pin-error in the dialog', async () => {
    const TRASH_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    mocks.getTrashItems.mockResolvedValue([
      {
        id: TRASH_ID,
        name: 'Old Soup',
        imageUrl: null,
        deletedAt: '2026-05-01T00:00:00Z',
        deletedBy: null,
      },
    ]);
    mocks.purgeRecipe.mockRejectedValue(Object.assign(new Error('Forbidden'), { status: 403 }));

    render(<RecipesPage />);
    await waitFor(() => expect(screen.getByTestId('recycle-bin-entry')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('recycle-bin-entry'));
    await waitFor(() => expect(screen.getByTestId(`action-purge-${TRASH_ID}`)).toBeInTheDocument());
    fireEvent.click(screen.getByTestId(`action-purge-${TRASH_ID}`));

    await waitFor(() => expect(screen.getByTestId('elevated-pin-input')).toBeInTheDocument());
    fireEvent.change(screen.getByTestId('elevated-pin-input'), { target: { value: 'wrong' } });
    fireEvent.submit(screen.getByTestId('elevated-pin-dialog'));

    await waitFor(() => expect(screen.getByTestId('elevated-pin-error')).toBeInTheDocument());
    expect(screen.getByTestId('elevated-pin-dialog')).toBeInTheDocument();
  });

  it('on purge success HTTP 200, item is removed from trash list', async () => {
    const TRASH_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    mocks.getTrashItems.mockResolvedValue([
      {
        id: TRASH_ID,
        name: 'Old Soup',
        imageUrl: null,
        deletedAt: '2026-05-01T00:00:00Z',
        deletedBy: null,
      },
    ]);
    mocks.purgeRecipe.mockResolvedValue(undefined);

    render(<RecipesPage />);
    await waitFor(() => expect(screen.getByTestId('recycle-bin-entry')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('recycle-bin-entry'));
    await waitFor(() => expect(screen.getByTestId(`action-purge-${TRASH_ID}`)).toBeInTheDocument());
    fireEvent.click(screen.getByTestId(`action-purge-${TRASH_ID}`));

    await waitFor(() => expect(screen.getByTestId('elevated-pin-input')).toBeInTheDocument());
    fireEvent.change(screen.getByTestId('elevated-pin-input'), { target: { value: '1234' } });
    fireEvent.submit(screen.getByTestId('elevated-pin-dialog'));

    await waitFor(() =>
      expect(screen.queryByTestId(`trash-item-${TRASH_ID}`)).not.toBeInTheDocument()
    );
    expect(screen.queryByTestId('elevated-pin-dialog')).not.toBeInTheDocument();
  });

  // ── Task 12: Agent search UI ────────────────────────────────────────────────

  it('agent-search-trigger tap shows agent-search-input textarea', async () => {
    render(<RecipesPage />);
    await waitFor(() => expect(screen.getByTestId('agent-search-trigger')).toBeInTheDocument());

    expect(screen.queryByTestId('agent-search-input')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('agent-search-trigger'));

    expect(screen.getByTestId('agent-search-input')).toBeInTheDocument();
  });

  it('agent-search-submit calls searchRecipes with mode: "agent"', async () => {
    render(<RecipesPage />);
    await waitFor(() => expect(screen.getByTestId('agent-search-trigger')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('agent-search-trigger'));
    fireEvent.change(screen.getByTestId('agent-search-input'), {
      target: { value: 'something fresh and quick my kids will like' },
    });
    fireEvent.click(screen.getByTestId('agent-search-submit'));

    await waitFor(() => {
      expect(mocks.searchRecipes).toHaveBeenLastCalledWith(
        expect.objectContaining({ mode: 'agent' })
      );
    });
  });

  it('agent search results render in the same recipe-card-top-pick template', async () => {
    mocks.searchRecipes.mockResolvedValue(makeSearchResponse({ searchMode: 'agent' }));
    render(<RecipesPage />);
    await waitFor(() => expect(screen.getByTestId('agent-search-trigger')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('agent-search-trigger'));
    fireEvent.change(screen.getByTestId('agent-search-input'), {
      target: { value: 'something warm' },
    });
    fireEvent.click(screen.getByTestId('agent-search-submit'));

    await waitFor(() => expect(screen.getByTestId('recipe-card-top-pick')).toBeInTheDocument());
  });

  it('agent search does NOT render a chat UI element', async () => {
    render(<RecipesPage />);
    await waitFor(() => expect(screen.getByTestId('agent-search-trigger')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('agent-search-trigger'));
    fireEvent.change(screen.getByTestId('agent-search-input'), {
      target: { value: 'something warm and filling' },
    });
    fireEvent.click(screen.getByTestId('agent-search-submit'));

    await waitFor(() => expect(mocks.searchRecipes).toHaveBeenCalled());

    expect(screen.queryByTestId('chat-response')).not.toBeInTheDocument();
  });

  it('agent-search-close hides agent-search-input and keeps existing results visible', async () => {
    render(<RecipesPage />);
    await waitFor(() => expect(screen.getByTestId('recipe-card-top-pick')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('agent-search-trigger'));
    expect(screen.getByTestId('agent-search-input')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('agent-search-close'));
    expect(screen.queryByTestId('agent-search-input')).not.toBeInTheDocument();
    expect(screen.getByTestId('recipe-card-top-pick')).toBeInTheDocument();
  });
});
