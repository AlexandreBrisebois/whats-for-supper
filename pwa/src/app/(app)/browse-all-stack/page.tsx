'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { X, Search, Loader2, Compass, Trash2 } from 'lucide-react';
import { RecipeStackCard } from '@/components/recipes/RecipeStackCard';
import { StackActionBar } from '@/components/recipes/StackActionBar';
import { EndCard } from '@/components/recipes/EndCard';
import { RecipeDetailSheet } from '@/components/recipes/RecipeDetailSheet';
import { RecycleBinSheet } from '@/components/recipes/RecycleBinSheet';
import { useBrowseStackStore } from '@/store/browseStackStore';
import { apiClient } from '@/lib/api/api-client';
import { updateRecipe } from '@/lib/api/recipes';
import { assignRecipeToDay } from '@/lib/api/planner';
import { GetOrderQueryParameterTypeObject } from '@/lib/api/generated/api/recipes/index';
import type { RecipeDto } from '@/lib/api/generated/models/index';
import { BackgroundBlobs } from '@/components/ui/BackgroundBlobs';

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
  const [isDiscoverableOnly, setIsDiscoverableOnly] = useState(false);
  const [isEndCard, setIsEndCard] = useState(false);
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [prefetchFailed, setPrefetchFailed] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  // True while we are fetching the last page to wrap backwards
  const [isWrappingToEnd, setIsWrappingToEnd] = useState(false);

  // Recipe Detail Sheet state — freeze stack while open
  const [detailRecipeId, setDetailRecipeId] = useState<string | null>(null);
  const [isTrashOpen, setIsTrashOpen] = useState(false);

  // Ref to track whether a prefetch is already in flight (avoid duplicate requests)
  const prefetchInFlightRef = useRef(false);
  // Ref to track the page/filter being prefetched to avoid races
  const currentRequestRef = useRef<{ page: number; discoverableOnly: boolean } | null>(null);

  // ---------------------------------------------------------------------------
  // Data Fetching: fetch summary + first page
  // ---------------------------------------------------------------------------
  const fetchLibraryData = useCallback(
    async (page: number, discoverable: boolean, append = false) => {
      try {
        if (!append) {
          setIsInitialLoading(true);
          setLoadError(false);
          setIsEndCard(false);
        } else {
          setIsPrefetching(true);
          setPrefetchFailed(false);
        }

        currentRequestRef.current = { page, discoverableOnly: discoverable };

        // Fetch library summary for total counts (only on first load)
        if (!append) {
          const summaryResult = await apiClient.api.recipes.librarySummary.get();
          const total = summaryResult?.data?.total ?? 0;
          // Note: totalCount in indicator reflects the filtered total from pagination
        }

        // Fetch recipes in explore order with optional filter
        const result = await apiClient.api.recipes.get({
          queryParameters: {
            order: GetOrderQueryParameterTypeObject.Explore,
            page: page,
            limit: 20,
            discoverableOnly: discoverable,
          },
        });

        // Check if this request is still relevant (not superseded by a filter toggle)
        if (
          currentRequestRef.current?.page !== page ||
          currentRequestRef.current?.discoverableOnly !== discoverable
        ) {
          return;
        }

        const fetchedRecipes = (result?.recipes ?? []) as RecipeDto[];
        const paginationTotal = result?.pagination?.total ?? 0;

        if (append) {
          appendRecipes(fetchedRecipes);
        } else {
          setRecipes(fetchedRecipes);
          setCurrentIndex(0);
        }

        setTotalCount(paginationTotal);

        // Update store pagination state
        const currentRecipesCount = useBrowseStackStore.getState().recipes.length;
        useBrowseStackStore.setState({
          currentPage: page,
          hasMorePages:
            (append ? currentRecipesCount + fetchedRecipes.length : fetchedRecipes.length) <
            paginationTotal,
        });
      } catch (err) {
        console.error('BrowseAllStack: fetch failed', err);
        if (append) {
          setPrefetchFailed(true);
        } else {
          setLoadError(true);
        }
      } finally {
        setIsInitialLoading(false);
        setIsPrefetching(false);
        prefetchInFlightRef.current = false;
      }
    },
    [appendRecipes, setRecipes, setCurrentIndex, setTotalCount]
  );

  // ---------------------------------------------------------------------------
  // Wrap-to-last-page: fetch the last page and land on its last recipe.
  // Called when swiping left from card 1 or left from the End Card.
  // ---------------------------------------------------------------------------
  const wrapToLastPage = useCallback(async () => {
    // If all pages are already in memory, jump instantly.
    if (!hasMorePages) {
      setIsEndCard(false);
      setCurrentIndex(recipes.length - 1);
      return;
    }

    // Otherwise calculate the last page number and fetch it.
    const LIMIT = 20;
    const lastPage = Math.ceil(totalCount / LIMIT);

    setIsWrappingToEnd(true);
    setIsEndCard(false);
    try {
      const result = await apiClient.api.recipes.get({
        queryParameters: {
          order: GetOrderQueryParameterTypeObject.Explore,
          page: lastPage,
          limit: LIMIT,
          discoverableOnly: isDiscoverableOnly,
        },
      });

      const fetchedRecipes = (result?.recipes ?? []) as RecipeDto[];

      // Replace the store recipes with page 1 already in memory + this last
      // page so the user can swipe left naturally from here.
      // We only prepend page-1 recipes (already loaded) + last-page recipes.
      // The middle pages are intentionally skipped; they'll load on forward
      // swipe if the user reverses direction.
      const firstPageRecipes = useBrowseStackStore.getState().recipes.slice(0, LIMIT);
      const merged = [...firstPageRecipes, ...fetchedRecipes];
      setRecipes(merged);

      // Update pagination state so the store knows we're "at" the last page.
      useBrowseStackStore.setState({
        currentPage: lastPage,
        hasMorePages: false,
      });
      setTotalCount(result?.pagination?.total ?? totalCount);

      // Land on the last recipe.
      setCurrentIndex(merged.length - 1);
    } catch (err) {
      console.error('BrowseAllStack: wrapToLastPage failed', err);
      // Fall back gracefully: just land on the last recipe we have.
      setCurrentIndex(recipes.length - 1);
    } finally {
      setIsWrappingToEnd(false);
    }
  }, [
    hasMorePages,
    totalCount,
    isDiscoverableOnly,
    recipes,
    setRecipes,
    setCurrentIndex,
    setTotalCount,
  ]);

  // Initial load or filter change
  useEffect(() => {
    // Defer to avoid "setState in effect" lint error
    Promise.resolve().then(() => {
      fetchLibraryData(1, isDiscoverableOnly);
    });
  }, [isDiscoverableOnly, fetchLibraryData]);

  // Unmount: reset store state
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  // ---------------------------------------------------------------------------
  // Pre-fetch next page when remainingCards <= 5 (requirement 5.3)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isInitialLoading || isEndCard || !hasMorePages || prefetchInFlightRef.current) return;

    const remainingCards = recipes.length - currentIndex - 1;

    if (remainingCards <= 5) {
      prefetchInFlightRef.current = true;
      // Defer to avoid "setState in effect" lint error
      Promise.resolve().then(() => {
        fetchLibraryData(currentPage + 1, isDiscoverableOnly, true);
      });
    }
  }, [
    currentIndex,
    recipes.length,
    hasMorePages,
    isInitialLoading,
    isEndCard,
    currentPage,
    isDiscoverableOnly,
    fetchLibraryData,
  ]);

  // ---------------------------------------------------------------------------
  // Navigation handlers
  // ---------------------------------------------------------------------------
  const handleSwipeRight = useCallback(() => {
    if (isEndCard) {
      setIsEndCard(false);
      setCurrentIndex(0);
      return;
    }

    const isLastCard = currentIndex >= recipes.length - 1;

    if (isLastCard && !hasMorePages) {
      setIsEndCard(true);
      return;
    }

    if (isLastCard && isPrefetching) {
      return;
    }

    setCurrentIndex(currentIndex + 1);
  }, [isEndCard, currentIndex, recipes.length, hasMorePages, isPrefetching, setCurrentIndex]);

  const handleSwipeLeft = useCallback(() => {
    // From the End Card: go to the actual last recipe (wrap backwards).
    if (isEndCard) {
      wrapToLastPage();
      return;
    }
    // From the first card: also wrap to the last recipe.
    if (currentIndex <= 0) {
      wrapToLastPage();
      return;
    }
    previousCard();
  }, [isEndCard, currentIndex, previousCard, wrapToLastPage]);

  // ---------------------------------------------------------------------------
  // Recipe Detail Sheet handlers
  // ---------------------------------------------------------------------------
  const handleCardTap = useCallback((recipeId: string) => {
    setDetailRecipeId(recipeId);
  }, []);

  const handleDetailSheetClose = useCallback(() => {
    setDetailRecipeId(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Discoverable handlers
  // ---------------------------------------------------------------------------

  // Individual curation (requirement 1.6)
  const handleIndividualToggleDiscoverable = useCallback(
    async (recipeId: string, newValue: boolean) => {
      await updateRecipe(recipeId, { isDiscoverable: newValue });
      useBrowseStackStore.setState((s) => ({
        recipes: s.recipes.map((r) => (r.id === recipeId ? { ...r, isDiscoverable: newValue } : r)),
      }));
    },
    []
  );

  // Global toggle (requirement 2.3)
  const handleGlobalToggleDiscoverable = useCallback(() => {
    setIsDiscoverableOnly((prev) => !prev);
  }, []);

  // ---------------------------------------------------------------------------
  // Exit and search escape handlers
  // ---------------------------------------------------------------------------
  const handleExit = useCallback(() => {
    router.back();
  }, [router]);

  const handleSearchEscape = useCallback(() => {
    router.push('/recipes?focus=search');
  }, [router]);

  const handleAddRecipe = useCallback(() => {
    router.push('/capture');
  }, [router]);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------
  const visibleRecipes = useMemo(() => {
    if (recipes.length === 0) return [];
    return recipes.slice(currentIndex, currentIndex + 4);
  }, [recipes, currentIndex]);

  const currentRecipe = recipes[currentIndex] ?? null;
  const position = currentIndex + 1;
  const displayTotal = totalCount;

  const isAtLastLoadedCard = currentIndex >= recipes.length - 1;
  const showLoader =
    (isAtLastLoadedCard && isPrefetching && !isEndCard && recipes.length > 0) || isWrappingToEnd;
  const isEmpty = !isInitialLoading && !loadError && recipes.length === 0 && !isDiscoverableOnly;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div
      data-testid="browse-all-stack-container"
      className="fixed inset-0 z-50 flex flex-col bg-cream overflow-hidden"
    >
      <BackgroundBlobs />

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

        <div className="flex flex-col items-center">
          <h1 className="text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/40">
            Library
          </h1>
          <div className="h-0.5 w-6 rounded-full bg-ochre mt-1" />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="recycle-bin-entry"
            aria-label="Recycle bin"
            onClick={() => setIsTrashOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-charcoal/70 shadow-sm border border-charcoal/8 backdrop-blur-sm hover:bg-white active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-ochre focus:ring-offset-2"
          >
            <Trash2 size={20} />
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
      </div>

      {isTrashOpen && <RecycleBinSheet onClose={() => setIsTrashOpen(false)} />}

      {/* Main content area */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-2 min-h-0">
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

        {!isInitialLoading && loadError && (
          <div className="flex flex-col items-center gap-4 text-center px-8">
            <p className="text-base font-semibold text-charcoal/70">Failed to load recipes.</p>
            <button
              type="button"
              onClick={() => fetchLibraryData(1, isDiscoverableOnly)}
              className="px-6 py-3 rounded-full bg-ochre text-white font-bold text-sm shadow-md"
            >
              Retry
            </button>
          </div>
        )}

        {isEmpty && <EndCard isEmpty={true} onSwipeRight={() => {}} onSwipeLeft={() => {}} />}

        {!isInitialLoading && !loadError && (recipes.length > 0 || isEndCard) && (
          <div className="w-full max-w-sm flex-1 flex flex-col min-h-0">
            <div className="relative flex-1 min-h-0">
              <AnimatePresence mode="popLayout">
                {showLoader ? (
                  <div
                    data-testid="browse-all-loader"
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Loader2 className="animate-spin text-ochre" size={48} />
                  </div>
                ) : isEndCard ? (
                  <EndCard
                    key="end"
                    isEmpty={false}
                    onSwipeRight={handleSwipeRight}
                    onSwipeLeft={handleSwipeLeft}
                    onAddRecipe={handleAddRecipe}
                  />
                ) : (
                  visibleRecipes.map((recipe, i) => (
                    <RecipeStackCard
                      key={recipe.id}
                      id={recipe.id!}
                      name={recipe.name!}
                      description={recipe.description || ''}
                      imageUrl={`/api/recipes/${recipe.id}/hero`}
                      totalTime={recipe.totalTime || ''}
                      difficulty={recipe.difficulty || 'Medium'}
                      category={recipe.category || ''}
                      isFront={i === 0}
                      stackIndex={i}
                      onSwipeRight={handleSwipeRight}
                      onSwipeLeft={handleSwipeLeft}
                      onTap={() => handleCardTap(recipe.id!)}
                    />
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Stack Action Bar */}
            {!isEndCard && currentRecipe && (
              <StackActionBar
                currentRecipe={currentRecipe}
                currentIndex={currentIndex}
                totalCount={totalCount}
                isDiscoverableOnly={isDiscoverableOnly}
                onToggleGlobalFilter={handleGlobalToggleDiscoverable}
                onToggleIndividualCuration={handleIndividualToggleDiscoverable}
              />
            )}

            {isEndCard && (
              <div className="flex items-center justify-end px-6 py-4">
                <span className="text-sm font-black tabular-nums text-charcoal/50 tracking-tight">
                  {totalCount} / {totalCount}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {detailRecipeId && (
        <RecipeDetailSheet
          recipeId={detailRecipeId}
          plannerDayLabel={null}
          onClose={handleDetailSheetClose}
          onUseForDay={async (recipe) => {
            const todayIndex = (new Date().getDay() + 6) % 7;
            await assignRecipeToDay(0, todayIndex, {
              id: recipe.id,
              name: recipe.name ?? null,
              image: recipe.imageUrl ?? '',
            });
            router.push(`/planner?success=1&dayIndex=${todayIndex}`);
          }}
          onFindSimilar={() => {
            handleDetailSheetClose();
          }}
        />
      )}
    </div>
  );
}
