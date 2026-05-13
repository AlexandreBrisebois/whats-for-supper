/**
 * Integration tests for BrowseAllStack page
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 5.3, 5.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Hoisted mocks — declared before any imports
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => {
  // Capture framer-motion drag handlers from RecipeStackCard
  let capturedOnDragEnd: ((event: unknown, info: unknown) => void) | undefined;
  let capturedOnTap: (() => void) | undefined;

  const librarySummaryGet = vi.fn();
  const recipesGet = vi.fn();
  const familyPreferencesPut = vi.fn();
  const updateRecipe = vi.fn();
  const push = vi.fn();
  const back = vi.fn();

  return {
    librarySummaryGet,
    recipesGet,
    familyPreferencesPut,
    updateRecipe,
    push,
    back,
    getCapturedOnDragEnd: () => capturedOnDragEnd,
    getCapturedOnTap: () => capturedOnTap,
    setCapturedOnDragEnd: (fn: (event: unknown, info: unknown) => void) => {
      capturedOnDragEnd = fn;
    },
    setCapturedOnTap: (fn: () => void) => {
      capturedOnTap = fn;
    },
    resetCaptures: () => {
      capturedOnDragEnd = undefined;
      capturedOnTap = undefined;
    },
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, back: mocks.back }),
}));

vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    fill: _fill,
    sizes: _sizes,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; sizes?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock framer-motion — capture drag/tap handlers from:
//   - the front card (data-front="true")
//   - the End Card (data-testid="browse-all-end-card")
// This allows tests to simulate swipes on both recipe cards and the End Card.
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      onDragEnd,
      onTap,
      // Strip framer-motion-specific props
      layout: _layout,
      dragConstraints: _dragConstraints,
      dragElastic: _dragElastic,
      dragMomentum: _dragMomentum,
      whileTap: _whileTap,
      animate: _animate,
      drag: _drag,
      style: _style,
      ...props
    }: any) => {
      // Capture handlers from the front card (data-front="true") or the End Card
      // (data-testid="browse-all-end-card"). This prevents non-front card handlers
      // from overwriting the active card's handlers.
      const isFrontCard = props['data-front'] === 'true';
      const isEndCard = props['data-testid'] === 'browse-all-end-card';
      if (isFrontCard || isEndCard) {
        if (onDragEnd) mocks.setCapturedOnDragEnd(onDragEnd);
        if (onTap) mocks.setCapturedOnTap(onTap);
      }
      return <div {...props}>{children}</div>;
    },
  },
  useMotionValue: () => ({ get: () => 0, set: vi.fn() }),
  useTransform: () => ({ get: () => 0 }),
  useAnimation: () => ({ start: vi.fn().mockResolvedValue(undefined) }),
  useMotionValueEvent: vi.fn(),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock apiClient — the page uses apiClient.api.recipes.librarySummary.get() and
// apiClient.api.recipes.get()
vi.mock('@/lib/api/api-client', () => ({
  apiClient: {
    api: {
      recipes: {
        librarySummary: {
          get: (...args: unknown[]) => mocks.librarySummaryGet(...args),
        },
        get: (...args: unknown[]) => mocks.recipesGet(...args),
      },
      family: {
        byId: () => ({
          preferences: {
            put: (...args: unknown[]) => mocks.familyPreferencesPut(...args),
          },
        }),
      },
    },
  },
}));

// Mock updateRecipe used by StackActionBar
vi.mock('@/lib/api/recipes', () => ({
  updateRecipe: (...args: unknown[]) => mocks.updateRecipe(...args),
  getRecipe: vi.fn().mockResolvedValue({
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    name: 'Recipe A',
    description: 'Desc A',
    imageUrl: '/img/a.jpg',
    totalTime: 'PT30M',
    category: 'Dinner',
    rating: 2,
    notes: '',
    isDiscoverable: true,
    ingredients: [],
  }),
}));

// Stub RecipeDetailSheet — renders a minimal stand-in with a close button
vi.mock('@/components/recipes/RecipeDetailSheet', () => ({
  RecipeDetailSheet: ({ recipeId, onClose }: { recipeId: string; onClose: () => void }) => (
    <div data-testid="recipe-detail-sheet" data-recipe-id={recipeId}>
      <button data-testid="action-close-sheet" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

vi.mock('@/components/recipes/RecycleBinSheet', () => ({
  RecycleBinSheet: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="trash-list">
      <button data-testid="recycle-bin-close" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Import component AFTER mocks
// ---------------------------------------------------------------------------
import BrowseAllStackPage from './page';
import { useBrowseStackStore } from '@/store/browseStackStore';
import { useFamilyStore } from '@/store/familyStore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RECIPE_IDS = [
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'gggggggg-gggg-gggg-gggg-gggggggggggg',
];

function makeRecipe(id: string, index: number) {
  return {
    id,
    name: `Recipe ${index + 1}`,
    description: `Description ${index + 1}`,
    imageUrl: `/img/${id}.jpg`,
    totalTime: 'PT30M',
    category: 'Dinner',
    rating: 0,
    isDiscoverable: true,
    notes: '',
    lastCookedDate: null,
  };
}

function makePageResponse(ids: string[], total: number, page = 1) {
  return {
    recipes: ids.map((id, i) => makeRecipe(id, i)),
    pagination: { page, limit: 20, total },
  };
}

function makeRecipeId(index: number) {
  return `${String(index).padStart(8, '0')}-0000-4000-8000-${String(index).padStart(12, '0')}`;
}

function makeSummaryResponse(total: number) {
  return {
    data: {
      total,
      neverCooked: 1,
      ratings: { love: 0, like: 0, dislike: 0, unrated: total },
    },
  };
}

function makeDragInfo(offsetX: number, velocityX = 0) {
  return {
    offset: { x: offsetX, y: 0 },
    velocity: { x: velocityX, y: 0 },
    point: { x: 0, y: 0 },
    delta: { x: 0, y: 0 },
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mocks.resetCaptures();
  useBrowseStackStore.getState().reset();
  useFamilyStore.setState({
    familyMembers: [
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Alex',
        browseViewMode: 'stack',
      },
    ],
    selectedFamilyMemberId: '11111111-1111-1111-1111-111111111111',
    isLoading: false,
    error: null,
    hasLoaded: true,
  });

  // Default: 3 recipes, no more pages
  mocks.librarySummaryGet.mockResolvedValue(makeSummaryResponse(3));
  mocks.recipesGet.mockResolvedValue(makePageResponse(RECIPE_IDS.slice(0, 3), 3));
  mocks.familyPreferencesPut.mockResolvedValue({
    data: {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Alex',
      browseViewMode: 'list',
    },
  });
  mocks.updateRecipe.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BrowseAllStack — mount fetches', () => {
  it('fetches library summary on mount', async () => {
    await act(async () => {
      render(<BrowseAllStackPage />);
    });

    await waitFor(() => {
      expect(mocks.librarySummaryGet).toHaveBeenCalledTimes(1);
    });
  });

  it('fetches first page of recipes on mount', async () => {
    await act(async () => {
      render(<BrowseAllStackPage />);
    });

    await waitFor(() => {
      expect(mocks.recipesGet).toHaveBeenCalledTimes(1);
    });

    // Verify it requested explore order, page 1, limit 20
    expect(mocks.recipesGet).toHaveBeenCalledWith(
      expect.objectContaining({
        queryParameters: expect.objectContaining({
          order: 'explore',
          page: 1,
          limit: 20,
        }),
      })
    );
  });
});

describe('BrowseAllStack — view mode preference', () => {
  it('uses the selected member saved browse mode as the initial view', async () => {
    useFamilyStore.setState({
      familyMembers: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'Alex',
          browseViewMode: 'list',
        },
      ],
      selectedFamilyMemberId: '11111111-1111-1111-1111-111111111111',
    });

    await act(async () => {
      render(<BrowseAllStackPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('browse-list-grid')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('stack-card-front')).not.toBeInTheDocument();
    expect(mocks.recipesGet).toHaveBeenCalledWith(
      expect.objectContaining({
        queryParameters: expect.objectContaining({
          page: 1,
          limit: 12,
        }),
      })
    );
  });

  it('optimistically toggles view mode and persists it to member preferences', async () => {
    await act(async () => {
      render(<BrowseAllStackPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('stack-card-front')).toBeInTheDocument();
    });

    act(() => {
      screen.getByTestId('browse-view-list').click();
    });

    expect(screen.getByTestId('browse-list-grid')).toBeInTheDocument();
    expect(mocks.familyPreferencesPut).toHaveBeenCalledWith(
      expect.objectContaining({ browseViewMode: 'list' })
    );
  });
});

describe('BrowseAllStack — initial card display', () => {
  it('displays the first card after load', async () => {
    await act(async () => {
      render(<BrowseAllStackPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('stack-card-front')).toBeInTheDocument();
    });

    // The front card should be the first recipe
    expect(screen.getByTestId('stack-card-front')).toHaveAttribute('data-recipe-id', RECIPE_IDS[0]);
  });
});

describe('BrowseAllStack — swipe navigation', () => {
  it('advances to the next card on swipe left', async () => {
    await act(async () => {
      render(<BrowseAllStackPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('stack-card-front')).toBeInTheDocument();
    });

    const onDragEnd = mocks.getCapturedOnDragEnd();
    expect(onDragEnd).toBeDefined();

    // Swipe left beyond 80px threshold
    await act(async () => {
      await onDragEnd!(null, makeDragInfo(-100));
    });

    await waitFor(() => {
      // Second recipe should now be the front card
      expect(screen.getByTestId('stack-card-front')).toHaveAttribute(
        'data-recipe-id',
        RECIPE_IDS[1]
      );
    });
  });

  it('returns to the previous card on swipe right', async () => {
    await act(async () => {
      render(<BrowseAllStackPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('stack-card-front')).toBeInTheDocument();
    });

    // First advance to card 2
    const onDragEnd = mocks.getCapturedOnDragEnd();
    await act(async () => {
      await onDragEnd!(null, makeDragInfo(-100));
    });

    await waitFor(() => {
      expect(screen.getByTestId('stack-card-front')).toHaveAttribute(
        'data-recipe-id',
        RECIPE_IDS[1]
      );
    });

    // Now swipe right to go back
    const onDragEndAfterAdvance = mocks.getCapturedOnDragEnd();
    await act(async () => {
      await onDragEndAfterAdvance!(null, makeDragInfo(100));
    });

    await waitFor(() => {
      // Should be back on the first recipe
      expect(screen.getByTestId('stack-card-front')).toHaveAttribute(
        'data-recipe-id',
        RECIPE_IDS[0]
      );
    });
  });
});

describe('BrowseAllStack — pre-fetch', () => {
  it('pre-fetches next page when 5 cards remain', async () => {
    // Set up 7 recipes on page 1, total 21 (so there is a page 2 with limit 20).
    // Page 2 covers the remaining total so hasMorePages becomes false after the prefetch,
    // preventing a spurious third call when the user advances further.
    const page1Ids = RECIPE_IDS.slice(0, 7);
    mocks.librarySummaryGet.mockResolvedValue(makeSummaryResponse(21));
    mocks.recipesGet
      .mockResolvedValueOnce(makePageResponse(page1Ids, 21, 1))
      .mockResolvedValue(makePageResponse([], 21, 2));

    await act(async () => {
      render(<BrowseAllStackPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('stack-card-front')).toBeInTheDocument();
    });

    // Advance to index 1 (6 remaining) — no prefetch yet
    const onDragEnd = mocks.getCapturedOnDragEnd();
    await act(async () => {
      await onDragEnd!(null, makeDragInfo(-100));
    });

    // Advance to index 2 (5 remaining) — prefetch should trigger
    const onDragEnd2 = mocks.getCapturedOnDragEnd();
    await act(async () => {
      await onDragEnd2!(null, makeDragInfo(-100));
    });

    await waitFor(() => {
      // recipesGet called twice: initial load + prefetch
      expect(mocks.recipesGet).toHaveBeenCalledTimes(2);
    });

    // Verify the prefetch requested page 2
    expect(mocks.recipesGet).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryParameters: expect.objectContaining({
          order: 'explore',
          page: 2,
        }),
      })
    );
  });
});

describe('BrowseAllStack — End Card', () => {
  it('loops to the first card instead of showing End Card after the last recipe', async () => {
    // 3 recipes, no more pages
    await act(async () => {
      render(<BrowseAllStackPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('stack-card-front')).toBeInTheDocument();
    });

    // Swipe through all 3 recipes
    for (let i = 0; i < 3; i++) {
      const onDragEnd = mocks.getCapturedOnDragEnd();
      await act(async () => {
        await onDragEnd!(null, makeDragInfo(-100));
      });
    }

    await waitFor(() => {
      expect(screen.getByTestId('stack-card-front')).toHaveAttribute(
        'data-recipe-id',
        RECIPE_IDS[0]
      );
    });
    expect(screen.queryByTestId('browse-all-end-card')).not.toBeInTheDocument();
  });

  it('loops backward from the first card to the last recipe', async () => {
    await act(async () => {
      render(<BrowseAllStackPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('stack-card-front')).toBeInTheDocument();
    });

    const onDragEnd = mocks.getCapturedOnDragEnd();
    await act(async () => {
      await onDragEnd!(null, makeDragInfo(100));
    });

    await waitFor(() => {
      expect(screen.getByTestId('stack-card-front')).toHaveAttribute(
        'data-recipe-id',
        RECIPE_IDS[2]
      );
    });

    expect(screen.queryByTestId('browse-all-end-card')).not.toBeInTheDocument();
  });
});

describe('BrowseAllStack — list mode', () => {
  it('requests pages of 12 and appends deduped results', async () => {
    useFamilyStore.setState({
      familyMembers: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'Alex',
          browseViewMode: 'list',
        },
      ],
      selectedFamilyMemberId: '11111111-1111-1111-1111-111111111111',
    });
    mocks.recipesGet
      .mockResolvedValueOnce(makePageResponse(RECIPE_IDS.slice(0, 3), 15, 1))
      .mockResolvedValueOnce(
        makePageResponse([RECIPE_IDS[2], RECIPE_IDS[3], RECIPE_IDS[4]], 15, 2)
      );

    await act(async () => {
      render(<BrowseAllStackPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('browse-list-grid')).toBeInTheDocument();
    });

    expect(mocks.recipesGet).toHaveBeenCalledWith(
      expect.objectContaining({
        queryParameters: expect.objectContaining({
          page: 1,
          limit: 12,
        }),
      })
    );

    act(() => {
      window.dispatchEvent(new Event('browse-list-load-more'));
    });

    await waitFor(() => {
      expect(mocks.recipesGet).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(screen.getAllByTestId('browse-list-recipe-card')).toHaveLength(5);
    });
  });

  it('loads the final partial page when retained list items are capped', async () => {
    useFamilyStore.setState({
      familyMembers: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'Alex',
          browseViewMode: 'list',
        },
      ],
      selectedFamilyMemberId: '11111111-1111-1111-1111-111111111111',
    });

    const ids = Array.from({ length: 100 }, (_, index) => makeRecipeId(index + 1));
    for (let page = 1; page <= 8; page += 1) {
      const start = (page - 1) * 12;
      mocks.recipesGet.mockResolvedValueOnce(
        makePageResponse(ids.slice(start, start + 12), 100, page)
      );
    }
    mocks.recipesGet.mockResolvedValueOnce(makePageResponse(ids.slice(96, 100), 100, 9));

    await act(async () => {
      render(<BrowseAllStackPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('browse-list-grid')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(useBrowseStackStore.getState().hasMorePages).toBe(true);
    });

    for (let page = 2; page <= 9; page += 1) {
      act(() => {
        window.dispatchEvent(new Event('browse-list-load-more'));
      });

      await waitFor(() => {
        expect(mocks.recipesGet).toHaveBeenCalledWith(
          expect.objectContaining({
            queryParameters: expect.objectContaining({ page, limit: 12 }),
          })
        );
      });
    }

    await waitFor(() => {
      expect(useBrowseStackStore.getState().recipes.at(-1)?.id).toBe(ids[99]);
    });

    act(() => {
      window.dispatchEvent(new Event('browse-list-load-more'));
    });

    expect(mocks.recipesGet).toHaveBeenCalledTimes(9);
  });

  it('loads additional pages from the real list scroll container', async () => {
    useFamilyStore.setState({
      familyMembers: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'Alex',
          browseViewMode: 'list',
        },
      ],
      selectedFamilyMemberId: '11111111-1111-1111-1111-111111111111',
    });

    const ids = Array.from({ length: 25 }, (_, index) => makeRecipeId(index + 1));
    mocks.recipesGet
      .mockResolvedValueOnce(makePageResponse(ids.slice(0, 12), 25, 1))
      .mockResolvedValueOnce(makePageResponse(ids.slice(12, 24), 25, 2))
      .mockResolvedValueOnce(makePageResponse(ids.slice(24, 25), 25, 3));

    await act(async () => {
      render(<BrowseAllStackPage />);
    });

    const scrollContainer = await screen.findByTestId('browse-list-scroll-container');
    Object.defineProperties(scrollContainer, {
      clientHeight: { configurable: true, value: 800 },
      scrollHeight: { configurable: true, value: 1400 },
      scrollTop: { configurable: true, value: 20 },
    });

    fireEvent.scroll(scrollContainer);

    await waitFor(() => {
      expect(mocks.recipesGet).toHaveBeenCalledWith(
        expect.objectContaining({
          queryParameters: expect.objectContaining({ page: 2, limit: 12 }),
        })
      );
    });

    Object.defineProperty(scrollContainer, 'scrollTop', { configurable: true, value: 40 });
    fireEvent.scroll(scrollContainer);

    await waitFor(() => {
      expect(mocks.recipesGet).toHaveBeenCalledWith(
        expect.objectContaining({
          queryParameters: expect.objectContaining({ page: 3, limit: 12 }),
        })
      );
    });

    await waitFor(() => {
      expect(useBrowseStackStore.getState().recipes.at(-1)?.id).toBe(ids[24]);
      expect(useBrowseStackStore.getState().hasMorePages).toBe(false);
    });
  });
});

describe('BrowseAllStack — Recipe Detail Sheet', () => {
  it('opens Recipe Detail Sheet when card is tapped', async () => {
    await act(async () => {
      render(<BrowseAllStackPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('stack-card-front')).toBeInTheDocument();
    });

    const onTap = mocks.getCapturedOnTap();
    expect(onTap).toBeDefined();

    act(() => {
      onTap!();
    });

    await waitFor(() => {
      expect(screen.getByTestId('recipe-detail-sheet')).toBeInTheDocument();
    });
  });

  it('returns to the same card after Recipe Detail Sheet closes', async () => {
    await act(async () => {
      render(<BrowseAllStackPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('stack-card-front')).toBeInTheDocument();
    });

    // Advance to card 2 first
    const onDragEnd = mocks.getCapturedOnDragEnd();
    await act(async () => {
      await onDragEnd!(null, makeDragInfo(-100));
    });

    await waitFor(() => {
      expect(screen.getByTestId('stack-card-front')).toHaveAttribute(
        'data-recipe-id',
        RECIPE_IDS[1]
      );
    });

    // Tap to open detail sheet
    const onTap = mocks.getCapturedOnTap();
    act(() => {
      onTap!();
    });

    await waitFor(() => {
      expect(screen.getByTestId('recipe-detail-sheet')).toBeInTheDocument();
    });

    // Verify the sheet opened for the correct recipe
    expect(screen.getByTestId('recipe-detail-sheet')).toHaveAttribute(
      'data-recipe-id',
      RECIPE_IDS[1]
    );

    // Close the sheet
    act(() => {
      screen.getByTestId('action-close-sheet').click();
    });

    await waitFor(() => {
      expect(screen.queryByTestId('recipe-detail-sheet')).not.toBeInTheDocument();
    });

    // Same card should still be shown — no index change
    expect(screen.getByTestId('stack-card-front')).toHaveAttribute('data-recipe-id', RECIPE_IDS[1]);

    // No additional API calls should have been made on close
    expect(mocks.recipesGet).toHaveBeenCalledTimes(1);
  });

  it('recycle-bin-entry opens the recycle bin sheet and close button dismisses it', async () => {
    await act(async () => {
      render(<BrowseAllStackPage />);
    });
    await waitFor(() =>
      expect(screen.getByTestId('browse-all-stack-container')).toBeInTheDocument()
    );

    expect(screen.queryByTestId('trash-list')).not.toBeInTheDocument();

    act(() => {
      screen.getByTestId('recycle-bin-entry').click();
    });

    expect(screen.getByTestId('trash-list')).toBeInTheDocument();

    act(() => {
      screen.getByTestId('recycle-bin-close').click();
    });

    await waitFor(() => expect(screen.queryByTestId('trash-list')).not.toBeInTheDocument());
  });
});
