/**
 * Integration tests for BrowseAllStack page
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 5.3, 5.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
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
  const updateRecipe = vi.fn();
  const push = vi.fn();
  const back = vi.fn();

  return {
    librarySummaryGet,
    recipesGet,
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
    difficulty: 'Easy',
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

// ---------------------------------------------------------------------------
// Import component AFTER mocks
// ---------------------------------------------------------------------------
import BrowseAllStackPage from './page';
import { useBrowseStackStore } from '@/store/browseStackStore';

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
    difficulty: 'Easy',
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

  // Default: 3 recipes, no more pages
  mocks.librarySummaryGet.mockResolvedValue(makeSummaryResponse(3));
  mocks.recipesGet.mockResolvedValue(makePageResponse(RECIPE_IDS.slice(0, 3), 3));
  mocks.updateRecipe.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BrowseAllStack — mount fetches', () => {
  it('fetches library summary on mount', async () => {
    render(<BrowseAllStackPage />);

    await waitFor(() => {
      expect(mocks.librarySummaryGet).toHaveBeenCalledTimes(1);
    });
  });

  it('fetches first page of recipes on mount', async () => {
    render(<BrowseAllStackPage />);

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

describe('BrowseAllStack — initial card display', () => {
  it('displays the first card after load', async () => {
    render(<BrowseAllStackPage />);

    await waitFor(() => {
      expect(screen.getByTestId('stack-card-front')).toBeInTheDocument();
    });

    // The front card should be the first recipe
    expect(screen.getByTestId('stack-card-front')).toHaveAttribute('data-recipe-id', RECIPE_IDS[0]);
  });
});

describe('BrowseAllStack — swipe navigation', () => {
  it('advances to the next card on swipe right', async () => {
    render(<BrowseAllStackPage />);

    await waitFor(() => {
      expect(screen.getByTestId('stack-card-front')).toBeInTheDocument();
    });

    const onDragEnd = mocks.getCapturedOnDragEnd();
    expect(onDragEnd).toBeDefined();

    // Swipe right beyond 80px threshold
    await act(async () => {
      await onDragEnd!(null, makeDragInfo(100));
    });

    await waitFor(() => {
      // Second recipe should now be the front card
      expect(screen.getByTestId('stack-card-front')).toHaveAttribute(
        'data-recipe-id',
        RECIPE_IDS[1]
      );
    });
  });

  it('returns to the previous card on swipe left', async () => {
    render(<BrowseAllStackPage />);

    await waitFor(() => {
      expect(screen.getByTestId('stack-card-front')).toBeInTheDocument();
    });

    // First advance to card 2
    const onDragEnd = mocks.getCapturedOnDragEnd();
    await act(async () => {
      await onDragEnd!(null, makeDragInfo(100));
    });

    await waitFor(() => {
      expect(screen.getByTestId('stack-card-front')).toHaveAttribute(
        'data-recipe-id',
        RECIPE_IDS[1]
      );
    });

    // Now swipe left to go back
    const onDragEndAfterAdvance = mocks.getCapturedOnDragEnd();
    await act(async () => {
      await onDragEndAfterAdvance!(null, makeDragInfo(-100));
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
    // Set up 7 recipes on page 1, total 14 (so there is a page 2).
    // Page 2 returns total=7 so hasMorePages becomes false after the prefetch,
    // preventing a spurious third call when the user advances further.
    const page1Ids = RECIPE_IDS.slice(0, 7);
    mocks.librarySummaryGet.mockResolvedValue(makeSummaryResponse(14));
    mocks.recipesGet
      .mockResolvedValueOnce(makePageResponse(page1Ids, 14, 1))
      .mockResolvedValue(makePageResponse([], 7, 2));

    render(<BrowseAllStackPage />);

    await waitFor(() => {
      expect(screen.getByTestId('stack-card-front')).toBeInTheDocument();
    });

    // Advance to index 1 (6 remaining) — no prefetch yet
    const onDragEnd = mocks.getCapturedOnDragEnd();
    await act(async () => {
      await onDragEnd!(null, makeDragInfo(100));
    });

    // Advance to index 2 (5 remaining) — prefetch should trigger
    const onDragEnd2 = mocks.getCapturedOnDragEnd();
    await act(async () => {
      await onDragEnd2!(null, makeDragInfo(100));
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
  it('shows End Card after swiping past the last recipe', async () => {
    // 3 recipes, no more pages
    render(<BrowseAllStackPage />);

    await waitFor(() => {
      expect(screen.getByTestId('stack-card-front')).toBeInTheDocument();
    });

    // Swipe through all 3 recipes
    for (let i = 0; i < 3; i++) {
      const onDragEnd = mocks.getCapturedOnDragEnd();
      await act(async () => {
        await onDragEnd!(null, makeDragInfo(100));
      });
    }

    await waitFor(() => {
      expect(screen.getByTestId('browse-all-end-card')).toBeInTheDocument();
    });
  });

  it('wraps to first card when End Card is swiped right', async () => {
    render(<BrowseAllStackPage />);

    await waitFor(() => {
      expect(screen.getByTestId('stack-card-front')).toBeInTheDocument();
    });

    // Swipe through all 3 recipes to reach End Card
    for (let i = 0; i < 3; i++) {
      const onDragEnd = mocks.getCapturedOnDragEnd();
      await act(async () => {
        await onDragEnd!(null, makeDragInfo(100));
      });
    }

    await waitFor(() => {
      expect(screen.getByTestId('browse-all-end-card')).toBeInTheDocument();
    });

    // Swipe right on End Card — should wrap to first recipe
    const onDragEndOnEndCard = mocks.getCapturedOnDragEnd();
    await act(async () => {
      await onDragEndOnEndCard!(null, makeDragInfo(100));
    });

    await waitFor(() => {
      expect(screen.getByTestId('stack-card-front')).toHaveAttribute(
        'data-recipe-id',
        RECIPE_IDS[0]
      );
    });

    // End Card should no longer be visible
    expect(screen.queryByTestId('browse-all-end-card')).not.toBeInTheDocument();
  });
});

describe('BrowseAllStack — Recipe Detail Sheet', () => {
  it('opens Recipe Detail Sheet when card is tapped', async () => {
    render(<BrowseAllStackPage />);

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
    render(<BrowseAllStackPage />);

    await waitFor(() => {
      expect(screen.getByTestId('stack-card-front')).toBeInTheDocument();
    });

    // Advance to card 2 first
    const onDragEnd = mocks.getCapturedOnDragEnd();
    await act(async () => {
      await onDragEnd!(null, makeDragInfo(100));
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
});
