import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const searchRecipes = vi.fn();
  const getRecipe = vi.fn();
  const updateRecipe = vi.fn();
  const assignRecipeToDay = vi.fn();
  const getSchedule = vi.fn();
  const submitInventoryCapture = vi.fn();
  const getTrashItems = vi.fn();
  const restoreRecipe = vi.fn();
  const purgeRecipe = vi.fn();
  const healthGet = vi.fn();
  const push = vi.fn();
  let searchParams = new URLSearchParams('');

  return {
    searchRecipes,
    getRecipe,
    updateRecipe,
    assignRecipeToDay,
    getSchedule,
    submitInventoryCapture,
    getTrashItems,
    restoreRecipe,
    purgeRecipe,
    healthGet,
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

vi.mock('@/lib/api/api-client', () => ({
  apiClient: {
    api: {
      health: {
        get: (...args: unknown[]) => mocks.healthGet(...args),
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
    mocks.getSchedule.mockResolvedValue({
      weekOffset: 0,
      days: Array.from({ length: 7 }, (_, index) => ({
        day: `Day ${index + 1}`,
        date: `2026-05-${String(4 + index).padStart(2, '0')}`,
        recipe: null,
        status: 0,
      })),
    });
    mocks.submitInventoryCapture.mockResolvedValue({
      snapshotId: 'snap-123',
      inferredIngredients: ['chicken'],
      confidence: 0.9,
    });
    mocks.getTrashItems.mockResolvedValue([]);
    mocks.restoreRecipe.mockResolvedValue(undefined);
    mocks.purgeRecipe.mockResolvedValue(undefined);
    mocks.healthGet.mockResolvedValue({ demoMode: false });
  });

  it('renders the search input and mode controls after load', async () => {
    render(<RecipesPage />);

    expect(screen.getByTestId('recipe-search-input')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('agent-search-trigger')).toBeInTheDocument();
    });

    expect(screen.getByTestId('inventory-camera-trigger')).toBeInTheDocument();
  });

  it('fires recipe search on mount and again when Enter is pressed with the current query', async () => {
    render(<RecipesPage />);

    await waitFor(() => {
      expect(mocks.searchRecipes).toHaveBeenCalledWith({
        query: '',
        mode: 'standard',
        limit: 6,
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
        limit: 6,
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

  it('top-pick-feeling-lucky button re-runs search without changing query', async () => {
    render(<RecipesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('recipe-card-top-pick')).toBeInTheDocument();
    });

    const callsBefore = mocks.searchRecipes.mock.calls.length;
    fireEvent.click(screen.getByTestId('top-pick-feeling-lucky'));

    await waitFor(() => {
      expect(mocks.searchRecipes.mock.calls.length).toBeGreaterThan(callsBefore);
    });

    expect(screen.getByTestId('recipe-search-input')).toHaveValue('');
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
    expect(screen.getByRole('button', { name: 'Like' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('action-cook-this')).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole('button', { name: 'Love' }));

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
        limit: 6,
        weekOffset: undefined,
        dayIndex: undefined,
        similarToRecipeId: '11111111-1111-1111-1111-111111111111',
      });
    });

    expect(screen.getByTestId('recipe-search-input')).toHaveValue('');
    expect(screen.queryByTestId('recipe-detail-sheet')).not.toBeInTheDocument();
  });

  // ── Task 13: Inventory camera popup ─────────────────────────────────────────

  // ── Task 13: Inventory camera popup ─────────────────────────────────────────

  it('inventory-camera-trigger tap opens the inventory-capture-popup', async () => {
    render(<RecipesPage />);
    await waitFor(() => expect(screen.getByTestId('inventory-camera-trigger')).toBeInTheDocument());

    expect(screen.queryByTestId('inventory-capture-popup')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('inventory-camera-trigger'));

    expect(screen.getByTestId('inventory-capture-popup')).toBeInTheDocument();
  });

  it('inventory-capture-popup renders take photo, choose photos, submit and cancel buttons', async () => {
    render(<RecipesPage />);
    await waitFor(() => expect(screen.getByTestId('inventory-camera-trigger')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('inventory-camera-trigger'));

    expect(screen.getByTestId('inventory-take-photo')).toBeInTheDocument();
    expect(screen.getByTestId('inventory-choose-photos')).toBeInTheDocument();
    expect(screen.getByTestId('inventory-capture-submit')).toBeInTheDocument();
    expect(screen.getByTestId('inventory-capture-cancel')).toBeInTheDocument();
  });

  it('submit button stays available and updates the photo count as photos are added', async () => {
    render(<RecipesPage />);
    await waitFor(() => expect(screen.getByTestId('inventory-camera-trigger')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('inventory-camera-trigger'));

    const submitBtn = screen.getByTestId('inventory-capture-submit');
    expect(submitBtn).not.toBeDisabled();
    expect(submitBtn).toHaveTextContent(/Search with 0 photos/i);

    // Mock adding a photo
    const file = new File(['foo'], 'foo.png', { type: 'image/png' });
    const input = screen.getByTestId('inventory-camera-input');
    fireEvent.change(input, { target: { files: [file] } });

    expect(submitBtn).toHaveTextContent(/Search with 1 photo/i);
    expect(screen.getByTestId('remove-photo-0')).toBeInTheDocument();
  });

  it('removing a photo updates the count and keeps submit available when the queue becomes empty', async () => {
    render(<RecipesPage />);
    await waitFor(() => expect(screen.getByTestId('inventory-camera-trigger')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('inventory-camera-trigger'));

    const file = new File(['foo'], 'foo.png', { type: 'image/png' });
    const input = screen.getByTestId('inventory-camera-input');
    fireEvent.change(input, { target: { files: [file] } });

    const submitBtn = screen.getByTestId('inventory-capture-submit');
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(screen.getByTestId('remove-photo-0'));

    expect(submitBtn).not.toBeDisabled();
    expect(submitBtn).toHaveTextContent(/Search with 0 photos/i);
  });

  it('submitting the popup calls POST /api/inventory-captures and includes snapshotId in next search', async () => {
    render(<RecipesPage />);
    await waitFor(() => expect(screen.getByTestId('inventory-camera-trigger')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('inventory-camera-trigger'));

    const file = new File(['foo'], 'foo.png', { type: 'image/png' });
    const input = screen.getByTestId('inventory-camera-input');
    fireEvent.change(input, { target: { files: [file] } });

    fireEvent.click(screen.getByTestId('inventory-capture-submit'));

    await waitFor(() => {
      expect(mocks.submitInventoryCapture).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mocks.searchRecipes).toHaveBeenCalledWith(
        expect.objectContaining({ pantrySnapshotId: 'snap-123' })
      );
    });
  });

  it('inventory-capture-cancel closes popup and clears queue', async () => {
    render(<RecipesPage />);
    await waitFor(() => expect(screen.getByTestId('inventory-camera-trigger')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('inventory-camera-trigger'));

    const file = new File(['foo'], 'foo.png', { type: 'image/png' });
    const input = screen.getByTestId('inventory-camera-input');
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByTestId('inventory-capture-popup')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('inventory-capture-cancel'));

    expect(screen.queryByTestId('inventory-capture-popup')).not.toBeInTheDocument();

    // Re-open to check if queue was cleared
    fireEvent.click(screen.getByTestId('inventory-camera-trigger'));
    expect(screen.getByTestId('inventory-capture-submit')).not.toBeDisabled();
  });

  it('popup shows busy message when capture returns busy status', async () => {
    mocks.submitInventoryCapture.mockResolvedValueOnce({ busy: true, retryAfterSeconds: 30 });

    render(<RecipesPage />);
    await waitFor(() => expect(screen.getByTestId('inventory-camera-trigger')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('inventory-camera-trigger'));

    const file = new File(['foo'], 'foo.png', { type: 'image/png' });
    const input = screen.getByTestId('inventory-camera-input');
    fireEvent.change(input, { target: { files: [file] } });

    fireEvent.click(screen.getByTestId('inventory-capture-submit'));

    await waitFor(() => {
      // The popup should still be visible with a retry/busy message
      expect(screen.getByTestId('inventory-capture-popup')).toBeInTheDocument();
    });
  });

  // ── Task 12: Agent search UI ────────────────────────────────────────────────

  it('agent-search-trigger tap shows agent-search-input textarea', async () => {
    render(<RecipesPage />);
    await waitFor(() => expect(screen.getByTestId('agent-search-trigger')).toBeInTheDocument());

    expect(screen.queryByTestId('agent-search-input')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('agent-search-trigger'));

    expect(screen.getByTestId('agent-search-input')).toBeInTheDocument();
  });

  it('agent-search-trigger shows demo notice instead of textarea in demo mode', async () => {
    mocks.healthGet.mockResolvedValue({ demoMode: true });
    render(<RecipesPage />);
    await waitFor(() => expect(screen.getByTestId('agent-search-trigger')).toBeInTheDocument());
    await waitFor(() => expect(mocks.healthGet).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('agent-search-trigger'));

    expect(screen.getByTestId('demo-ai-notice')).toHaveTextContent(
      'Semantic search translation is disabled in Demo Mode'
    );
    expect(screen.queryByTestId('agent-search-input')).not.toBeInTheDocument();
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

  it('blurs the search input when Enter is pressed', async () => {
    render(<RecipesPage />);
    const input = screen.getByTestId('recipe-search-input') as HTMLInputElement;
    input.focus();
    expect(input).toHaveFocus();

    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(input).not.toHaveFocus();
  });

  it('submits and blurs the agent search textarea when Enter (without Shift) is pressed', async () => {
    render(<RecipesPage />);
    fireEvent.click(screen.getByTestId('agent-search-trigger'));

    const textarea = screen.getByTestId('agent-search-input') as HTMLTextAreaElement;
    textarea.focus();
    expect(textarea).toHaveFocus();

    fireEvent.change(textarea, { target: { value: 'healthy lunch' } });
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter', shiftKey: false });

    expect(textarea).not.toHaveFocus();
    await waitFor(() => {
      expect(mocks.searchRecipes).toHaveBeenLastCalledWith(
        expect.objectContaining({ query: 'healthy lunch', mode: 'agent' })
      );
    });
  });

  it('does NOT submit agent search when Shift+Enter is pressed in textarea', async () => {
    render(<RecipesPage />);
    fireEvent.click(screen.getByTestId('agent-search-trigger'));

    const textarea = screen.getByTestId('agent-search-input') as HTMLTextAreaElement;
    textarea.focus();

    const callsBefore = mocks.searchRecipes.mock.calls.length;
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter', shiftKey: true });

    expect(textarea).toHaveFocus();
    expect(mocks.searchRecipes.mock.calls.length).toBe(callsBefore);
  });
});
