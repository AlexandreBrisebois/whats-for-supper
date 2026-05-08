'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { X, Search, Loader2, Compass } from 'lucide-react';
import { RecipeStackCard } from '@/components/recipes/RecipeStackCard';
import { StackActionBar } from '@/components/recipes/StackActionBar';
import { EndCard } from '@/components/recipes/EndCard';
import { RecipeDetailSheet } from '@/components/recipes/RecipeDetailSheet';
import { useBrowseStackStore } from '@/store/browseStackStore';
import { apiClient } from '@/lib/api/api-client';
import { updateRecipe } from '@/lib/api/recipes';
import { GetOrderQueryParameterTypeObject } from '@/lib/api/generated/api/recipes/index';
import type { RecipeDto } from '@/lib/api/generated/models/index';

// ---------------------------------------------------------------------------
// BrowseAllStack page
// Full-screen immersive overlay for browsing the recipe library card by card.
// Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.1–2.9, 5.1–5.7
// ---------------------------------------------------------------------------

export default function BrowseAllStackPage() {
  const router = useRouter();

  // Store state
  const {
    recipes,
    currentIndex,
    totalCount,
    currentPage,
    isLoading,
    hasMorePages,
    setRecipes,
    appendRecipes,
    setCurrentIndex,
    setTotalCount,
    nextCard,
    previousCard,
    reset,
  } = useBrowseStackStore();

  // Local UI state
  const [isEndCard, setIsEndCard] = useState(false);
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [prefetchFailed, setPrefetchFailed] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Recipe Detail Sheet state — freeze stack while open
  const [detailRecipeId, setDetailRecipeId] = useState<string | null>(null);

  // Ref to track whether a prefetch is already in flight (avoid duplicate requests)
  const prefetchInFlightRef = useRef(false);
  // Ref to track the page being prefetched
  const prefetchingPageRef = useRef<number | null>(null);

  // ---------------------------------------------------------------------------
  // Mount: fetch library summary + first page
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      setIsInitialLoading(true);
      setLoadError(false);

      try {
        // Fetch library summary first so depth indicator shows total immediately
        const summaryResult = await apiClient.api.recipes.librarySummary.get();
        if (!cancelled) {
          const total = summaryResult?.data?.total ?? 0;
          setTotalCount(total);
        }

        // Fetch first page of recipes in explore order
        const pageResult = await apiClient.api.recipes.get({
          queryParameters: {
            order: GetOrderQueryParameterTypeObject.Explore,
            page: 1,
            limit: 20,
          },
        });

        if (!cancelled) {
          const fetchedRecipes = (pageResult?.recipes ?? []) as RecipeDto[];
          const paginationTotal = pageResult?.pagination?.total ?? 0;

          setRecipes(fetchedRecipes);
          // Confirm totalCount from pagination (requirement 5.6)
          setTotalCount(paginationTotal);

          // Update store pagination state
          useBrowseStackStore.setState({
            currentPage: 1,
            hasMorePages: fetchedRecipes.length < paginationTotal,
          });
        }
      } catch (err) {
        if (!cancelled) {
          console.error('BrowseAllStack: initial load failed', err);
          setLoadError(true);
        }
      } finally {
        if (!cancelled) {
          setIsInitialLoading(false);
        }
      }
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Unmount: reset store state
  // ---------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  // ---------------------------------------------------------------------------
  // Pre-fetch next page when remainingCards <= 5 (requirement 5.3)
  // ---------------------------------------------------------------------------
  const prefetchNextPage = useCallback(async () => {
    const storeState = useBrowseStackStore.getState();
    if (!storeState.hasMorePages) return;
    if (prefetchInFlightRef.current) return;

    const nextPage = storeState.currentPage + 1;
    if (prefetchingPageRef.current === nextPage) return;

    prefetchInFlightRef.current = true;
    prefetchingPageRef.current = nextPage;
    setIsPrefetching(true);
    setPrefetchFailed(false);

    try {
      const result = await apiClient.api.recipes.get({
        queryParameters: {
          order: GetOrderQueryParameterTypeObject.Explore,
          page: nextPage,
          limit: 20,
        },
      });

      const newRecipes = (result?.recipes ?? []) as RecipeDto[];
      const paginationTotal = result?.pagination?.total ?? 0;

      appendRecipes(newRecipes);
      useBrowseStackStore.setState({
        currentPage: nextPage,
        hasMorePages: useBrowseStackStore.getState().recipes.length < paginationTotal,
      });
    } catch (err) {
      console.error('BrowseAllStack: prefetch failed', err);
      setPrefetchFailed(true);
      prefetchingPageRef.current = null; // allow retry
    } finally {
      prefetchInFlightRef.current = false;
      setIsPrefetching(false);
    }
  }, [appendRecipes]);

  // Watch currentIndex to trigger pre-fetch when remainingCards <= 5
  useEffect(() => {
    if (isInitialLoading) return;
    if (isEndCard) return;

    const remainingCards = recipes.length - currentIndex - 1;

    // Trigger pre-fetch when 5 cards remain (requirement 5.3)
    if (remainingCards <= 5 && hasMorePages && !prefetchInFlightRef.current) {
      prefetchNextPage();
    }
  }, [currentIndex, recipes.length, hasMorePages, isInitialLoading, isEndCard, prefetchNextPage]);

  // ---------------------------------------------------------------------------
  // Navigation handlers
  // ---------------------------------------------------------------------------
  const handleSwipeRight = useCallback(() => {
    if (isEndCard) {
      // End Card swipe right → wrap to recipe 1 (requirement 2.5)
      setIsEndCard(false);
      setCurrentIndex(0);
      return;
    }

    const isLastCard = currentIndex >= recipes.length - 1;

    if (isLastCard && !hasMorePages) {
      // Show End Card after last recipe (requirement 2.4)
      setIsEndCard(true);
      return;
    }

    if (isLastCard && isPrefetching) {
      // Pre-fetch not complete — loader will show (requirement 5.5)
      // Don't advance yet; the loader is shown at the next card position
      return;
    }

    nextCard();
  }, [isEndCard, currentIndex, recipes.length, hasMorePages, isPrefetching, nextCard, setCurrentIndex]);

  const handleSwipeLeft = useCallback(() => {
    if (isEndCard) {
      // End Card swipe left → return to last recipe (requirement 2.6)
      setIsEndCard(false);
      return;
    }

    // First card no-wrap on swipe left (requirement 2.3)
    previousCard();
  }, [isEndCard, previousCard]);

  // ---------------------------------------------------------------------------
  // Recipe Detail Sheet handlers (requirements 2.7, 2.8, 2.9)
  // ---------------------------------------------------------------------------
  const handleCardTap = useCallback((recipeId: string) => {
    setDetailRecipeId(recipeId);
  }, []);

  const handleDetailSheetClose = useCallback(() => {
    // Return to same card — no index change, no API call (requirement 2.8, 2.9)
    setDetailRecipeId(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Discoverable toggle handler
  // ---------------------------------------------------------------------------
  const handleToggleDiscoverable = useCallback(
    async (recipeId: string, newValue: boolean) => {
      await updateRecipe(recipeId, { isDiscoverable: newValue });
      // Update the recipe in the store so the toggle reflects the new state
      useBrowseStackStore.setState((s) => ({
        recipes: s.recipes.map((r) =>
          r.id === recipeId ? { ...r, isDiscoverable: newValue } : r
        ),
      }));
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Exit and search escape handlers
  // ---------------------------------------------------------------------------
  const handleExit = useCallback(() => {
    router.back();
  }, [router]);

  const handleSearchEscape = useCallback(() => {
    router.push('/recipes?search=focus');
  }, [router]);

  // ---------------------------------------------------------------------------
  // Retry initial load
  // ---------------------------------------------------------------------------
  const handleRetry = useCallback(() => {
    reset();
    setIsInitialLoading(true);
    setLoadError(false);
    setIsEndCard(false);

    const retry = async () => {
      try {
        const summaryResult = await apiClient.api.recipes.librarySummary.get();
        const total = summaryResult?.data?.total ?? 0;
        setTotalCount(total);

        const pageResult = await apiClient.api.recipes.get({
          queryParameters: {
            order: GetOrderQueryParameterTypeObject.Explore,
            page: 1,
            limit: 20,
          },
        });

        const fetchedRecipes = (pageResult?.recipes ?? []) as RecipeDto[];
        const paginationTotal = pageResult?.pagination?.total ?? 0;

        setRecipes(fetchedRecipes);
        setTotalCount(paginationTotal);
        useBrowseStackStore.setState({
          currentPage: 1,
          hasMorePages: fetchedRecipes.length < paginationTotal,
        });
      } catch (err) {
        console.error('BrowseAllStack: retry failed', err);
        setLoadError(true);
      } finally {
        setIsInitialLoading(false);
      }
    };

    retry();
  }, [reset, setTotalCount, setRecipes]);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  // Only render top 4 cards for performance (design requirement)
  const visibleRecipes = useMemo(() => {
    if (recipes.length === 0) return [];
    // Slice from currentIndex, take up to 4
    return recipes.slice(currentIndex, currentIndex + 4);
  }, [recipes, currentIndex]);

  const currentRecipe = recipes[currentIndex] ?? null;
  const position = currentIndex + 1; // 1-based
  const displayTotal = totalCount > 0 ? totalCount : (isInitialLoading ? 0 : 0);

  // Show loader when user is at last loaded card and prefetch is in flight
  const isAtLastLoadedCard = currentIndex >= recipes.length - 1;
  const showLoader = isAtLastLoadedCard && isPrefetching && !isEndCard && recipes.length > 0;

  // Empty state: loaded but zero recipes
  const isEmpty = !isInitialLoading && !loadError && recipes.length === 0 && totalCount === 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div
      data-testid="browse-all-stack-container"
      className="fixed inset-0 z-50 flex flex-col bg-cream overflow-hidden"
    >
      {/* Organic background blobs (matches app aesthetic) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="blob blob-terracotta -top-20 -left-20 animate-[pulse_8s_infinite]" />
        <div className="blob blob-ochre top-1/4 -right-10 animate-[pulse_10s_infinite]" />
        <div className="blob blob-sage -bottom-20 left-1/4 animate-[pulse_12s_infinite]" />
      </div>

      {/* Top bar: exit (left) + search escape (right) */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-safe-top pt-4 pb-2 shrink-0">
        <button
          type="button"
          data-testid="browse-all-exit"
          aria-label="Close browse overlay"
          onClick={handleExit}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-charcoal/70 shadow-sm border border-charcoal/8 backdrop-blur-sm hover:bg-white active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-ochre focus:ring-offset-2"
        >
          <X size={20} />
        </button>

        <button
          type="button"
          data-testid="browse-all-search-trigger"
          aria-label="Search recipes"
          onClick={handleSearchEscape}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-charcoal/70 shadow-sm border border-charcoal/8 backdrop-blur-sm hover:bg-white active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-ochre focus:ring-offset-2"
        >
          <Search size={20} />
        </button>
      </div>

      {/* Main content area */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-2 min-h-0">

        {/* Initial loading state */}
        {isInitialLoading && (
          <div className="flex flex-col items-center gap-4">
            <Loader2
              data-testid="browse-all-loader"
              className="animate-spin text-ochre"
              size={48}
            />
            <p className="text-sm font-medium text-charcoal/50">Loading your library…</p>
          </div>
        )}

        {/* Load error state */}
        {!isInitialLoading && loadError && (
          <div className="flex flex-col items-center gap-4 text-center px-8">
            <p className="text-base font-semibold text-charcoal/70">
              Failed to load recipes. Please try again.
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="px-6 py-3 rounded-full bg-ochre text-white font-bold text-sm shadow-md hover:bg-ochre-600 active:bg-ochre-700 transition-colors focus:outline-none focus:ring-2 focus:ring-ochre focus:ring-offset-2"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state (requirement 9) */}
        {isEmpty && (
          <div
            data-testid="browse-all-empty-state"
            className="flex flex-col items-center gap-5 text-center px-8"
          >
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-ochre-50 border-2 border-ochre-200">
              <Compass size={40} className="text-ochre-500" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight font-heading text-charcoal">
              Your library is empty
            </h2>
            <p className="text-base text-charcoal/70 leading-relaxed max-w-xs">
              Add your first recipe and start building your library
            </p>
            <button
              data-testid="browse-all-empty-capture-cta"
              onClick={() => router.push('/capture')}
              className="mt-2 px-8 py-3 rounded-full bg-ochre text-white font-bold text-sm tracking-wide shadow-md hover:bg-ochre-600 active:bg-ochre-700 transition-colors focus:outline-none focus:ring-2 focus:ring-ochre focus:ring-offset-2"
            >
              Capture a Recipe
            </button>
          </div>
        )}

        {/* Card arena */}
        {!isInitialLoading && !loadError && !isEmpty && (
          <div className="w-full max-w-sm flex-1 flex flex-col min-h-0">
            {/* Card stack */}
            <div className="relative flex-1 min-h-0">
              <AnimatePresence>
                {showLoader ? (
                  /* Loading spinner when pre-fetch hasn't completed (requirement 5.5) */
                  <div
                    data-testid="browse-all-loader"
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Loader2 className="animate-spin text-ochre" size={48} />
                  </div>
                ) : isEndCard ? (
                  /* End Card (requirement 8) */
                  <EndCard
                    onSwipeRight={handleSwipeRight}
                    onSwipeLeft={handleSwipeLeft}
                  />
                ) : (
                  /* Recipe stack cards */
                  visibleRecipes.map((recipe, visibleIndex) => {
                    const stackIndex = visibleIndex; // 0 = front
                    const isFront = stackIndex === 0;

                    return (
                      <RecipeStackCard
                        key={recipe.id}
                        id={recipe.id ?? ''}
                        name={recipe.name ?? ''}
                        description={recipe.description ?? ''}
                        imageUrl={`/api/recipes/${recipe.id}/hero`}
                        totalTime={recipe.totalTime ?? ''}
                        difficulty={recipe.difficulty ?? ''}
                        category={recipe.category ?? ''}
                        isFront={isFront}
                        stackIndex={stackIndex}
                        onSwipeRight={handleSwipeRight}
                        onSwipeLeft={handleSwipeLeft}
                        onTap={() => handleCardTap(recipe.id ?? '')}
                      />
                    );
                  })
                )}
              </AnimatePresence>
            </div>

            {/* Stack Action Bar — outside drag surface (requirement 4, architecture constraint) */}
            {currentRecipe && !isEndCard && (
              <StackActionBar
                currentRecipe={currentRecipe}
                position={position}
                total={displayTotal}
                onToggleDiscoverable={handleToggleDiscoverable}
              />
            )}

            {/* Show depth indicator on End Card too (requirement 1.8) */}
            {isEndCard && (
              <div className="flex items-center justify-end px-6 py-4">
                <span
                  data-testid="stack-depth-indicator"
                  aria-live="polite"
                  className="text-sm font-black tabular-nums text-charcoal/50 tracking-tight"
                >
                  {totalCount} / {displayTotal}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recipe Detail Sheet (requirement 2.7, 2.8, 2.9) */}
      {detailRecipeId && (
        <RecipeDetailSheet
          recipeId={detailRecipeId}
          plannerDayLabel={null}
          onClose={handleDetailSheetClose}
          onUseForDay={async () => {
            handleDetailSheetClose();
          }}
          onFindSimilar={() => {
            handleDetailSheetClose();
          }}
        />
      )}
    </div>
  );
}
