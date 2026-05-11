'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { X, Search, Loader2, Compass, Recycle, Layers3, Grid3X3 } from 'lucide-react';
import { RecipeStackCard } from '@/components/recipes/RecipeStackCard';
import { StackActionBar } from '@/components/recipes/StackActionBar';
import { EndCard } from '@/components/recipes/EndCard';
import { RecipeDetailSheet } from '@/components/recipes/RecipeDetailSheet';
import { RecycleBinSheet } from '@/components/recipes/RecycleBinSheet';
import { SkipRecoveryDialog } from '@/components/home/SkipRecoveryDialog';
import { useBrowseStackStore } from '@/store/browseStackStore';
import { useFamilyStore } from '@/store/familyStore';
import { apiClient } from '@/lib/api/api-client';
import { updateRecipe, type Recipe } from '@/lib/api/recipes';
import {
  assignRecipeToEmptySlot,
  findFirstOpenPlannerSlot,
  getPlannerSlot,
  resolveOccupiedSlot,
  type AssignmentRecipe,
  type PlannerSlot,
} from '@/lib/planner/slotAssignment';
import { GetOrderQueryParameterTypeObject } from '@/lib/api/generated/api/recipes/index';
import type { RecipeDto } from '@/lib/api/generated/models/index';
import { BackgroundBlobs } from '@/components/ui/BackgroundBlobs';

type BrowseViewMode = 'stack' | 'list';

const STACK_PAGE_SIZE = 20;
const LIST_PAGE_SIZE = 12;
const LIST_RETAINED_RECIPE_COUNT = 72;

// ---------------------------------------------------------------------------
// BrowseAllStack page
// Full-screen immersive overlay for browsing the recipe library card by card.
// Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.1–2.9, 5.1–5.7
// ---------------------------------------------------------------------------

export default function BrowseAllStackPage() {
  const router = useRouter();
  const { familyMembers, selectedFamilyMemberId, loadFamilyMembers, updateMemberPreferences } =
    useFamilyStore();
  const selectedMember = familyMembers.find((member) => member.id === selectedFamilyMemberId);
  const savedBrowseViewMode: BrowseViewMode =
    selectedMember?.browseViewMode === 'list' ? 'list' : 'stack';

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
  const [browseViewModeOverride, setBrowseViewModeOverride] = useState<{
    memberId: string | null;
    mode: BrowseViewMode;
  } | null>(null);
  const browseViewMode =
    browseViewModeOverride?.memberId === selectedFamilyMemberId
      ? browseViewModeOverride.mode
      : savedBrowseViewMode;
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
  const [pendingRecovery, setPendingRecovery] = useState<{
    slot: PlannerSlot;
    recipe: AssignmentRecipe;
    navigateTo: { weekOffset: number; dayIndex: number };
  } | null>(null);

  // Ref to track whether a prefetch is already in flight (avoid duplicate requests)
  const prefetchInFlightRef = useRef(false);
  const listScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const listSentinelRef = useRef<HTMLDivElement | null>(null);
  // Ref to track the page/filter being prefetched to avoid races
  const currentRequestRef = useRef<{
    page: number;
    discoverableOnly: boolean;
    viewMode: BrowseViewMode;
  } | null>(null);

  useEffect(() => {
    if (selectedFamilyMemberId && familyMembers.length === 0) {
      void loadFamilyMembers();
    }
  }, [familyMembers.length, loadFamilyMembers, selectedFamilyMemberId]);

  // ---------------------------------------------------------------------------
  // Data Fetching: fetch summary + first page
  // ---------------------------------------------------------------------------
  const fetchLibraryData = useCallback(
    async (page: number, discoverable: boolean, append = false) => {
      const pageSize = browseViewMode === 'list' ? LIST_PAGE_SIZE : STACK_PAGE_SIZE;
      try {
        if (!append) {
          setIsInitialLoading(true);
          setLoadError(false);
          setIsEndCard(false);
        } else {
          setIsPrefetching(true);
          setPrefetchFailed(false);
        }

        currentRequestRef.current = {
          page,
          discoverableOnly: discoverable,
          viewMode: browseViewMode,
        };

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
            limit: pageSize,
            discoverableOnly: discoverable,
          },
        });

        // Check if this request is still relevant (not superseded by a filter toggle)
        if (
          currentRequestRef.current?.page !== page ||
          currentRequestRef.current?.discoverableOnly !== discoverable ||
          currentRequestRef.current?.viewMode !== browseViewMode
        ) {
          return;
        }

        const fetchedRecipes = (result?.recipes ?? []) as RecipeDto[];
        const paginationTotal = result?.pagination?.total ?? 0;

        if (append) {
          appendRecipes(
            fetchedRecipes,
            browseViewMode === 'list' ? LIST_RETAINED_RECIPE_COUNT : undefined
          );
        } else {
          setRecipes(fetchedRecipes);
          setCurrentIndex(0);
        }

        setTotalCount(paginationTotal);

        // Update store pagination state
        useBrowseStackStore.setState({
          currentPage: page,
          hasMorePages: page * pageSize < paginationTotal,
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
    [appendRecipes, browseViewMode, setRecipes, setCurrentIndex, setTotalCount]
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
    const LIMIT = STACK_PAGE_SIZE;
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
  }, [isDiscoverableOnly, browseViewMode, fetchLibraryData]);

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
    if (
      browseViewMode !== 'stack' ||
      isInitialLoading ||
      isEndCard ||
      !hasMorePages ||
      prefetchInFlightRef.current
    ) {
      return;
    }

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
    browseViewMode,
  ]);

  const loadNextListPage = useCallback(() => {
    if (
      browseViewMode !== 'list' ||
      isInitialLoading ||
      isPrefetching ||
      !hasMorePages ||
      prefetchInFlightRef.current
    ) {
      return;
    }

    prefetchInFlightRef.current = true;
    Promise.resolve().then(() => {
      fetchLibraryData(currentPage + 1, isDiscoverableOnly, true);
    });
  }, [
    browseViewMode,
    currentPage,
    fetchLibraryData,
    hasMorePages,
    isDiscoverableOnly,
    isInitialLoading,
    isPrefetching,
  ]);

  useEffect(() => {
    if (browseViewMode !== 'list') return;
    const root = listScrollContainerRef.current;
    const sentinel = listSentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadNextListPage();
        }
      },
      { root, rootMargin: '600px 0px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [browseViewMode, loadNextListPage]);

  const handleListScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
      if (scrollHeight - scrollTop - clientHeight <= 600) {
        loadNextListPage();
      }
    },
    [loadNextListPage]
  );

  useEffect(() => {
    const handler = () => loadNextListPage();
    window.addEventListener('browse-list-load-more', handler);
    return () => window.removeEventListener('browse-list-load-more', handler);
  }, [loadNextListPage]);

  // ---------------------------------------------------------------------------
  // Navigation handlers
  // ---------------------------------------------------------------------------
  const handleSwipeLeft = useCallback(() => {
    const isLastCard = currentIndex >= recipes.length - 1;

    if (isLastCard && hasMorePages && isPrefetching) return;

    if (isLastCard && !hasMorePages) {
      setCurrentIndex(0);
      return;
    }

    setCurrentIndex(currentIndex + 1);
  }, [currentIndex, recipes.length, hasMorePages, isPrefetching, setCurrentIndex]);

  const handleSwipeRight = useCallback(() => {
    if (currentIndex <= 0) {
      wrapToLastPage();
      return;
    }
    previousCard();
  }, [currentIndex, previousCard, wrapToLastPage]);

  // ---------------------------------------------------------------------------
  // Recipe Detail Sheet handlers
  // ---------------------------------------------------------------------------
  const handleCardTap = useCallback((recipeId: string) => {
    setDetailRecipeId(recipeId);
  }, []);

  const handleDetailSheetClose = useCallback(() => {
    setDetailRecipeId(null);
  }, []);

  const toAssignmentRecipe = (recipe: Recipe): AssignmentRecipe => ({
    id: recipe.id,
    name: recipe.name ?? null,
    image: recipe.imageUrl ?? '',
  });

  const handleCookTonight = useCallback(
    async (recipe: Recipe) => {
      const todayIndex = (new Date().getDay() + 6) % 7;
      const assignmentRecipe = toAssignmentRecipe(recipe);
      const slot = await getPlannerSlot(0, todayIndex);

      if (slot?.recipe) {
        setPendingRecovery({
          slot,
          recipe: assignmentRecipe,
          navigateTo: { weekOffset: 0, dayIndex: todayIndex },
        });
        return;
      }

      await assignRecipeToEmptySlot(0, todayIndex, assignmentRecipe);
      router.push(`/planner?success=1&dayIndex=${todayIndex}&weekOffset=0`);
    },
    [router]
  );

  const handlePlanForLater = useCallback(
    async (recipe: Recipe) => {
      // "Plan for Later" starts from tomorrow onwards
      const todayIndex = (new Date().getDay() + 6) % 7;
      let startDayIndex = todayIndex + 1;
      let startWeekOffset = 0;

      if (startDayIndex > 6) {
        startDayIndex = 0;
        startWeekOffset = 1;
      }

      const openSlot = await findFirstOpenPlannerSlot(startWeekOffset, startDayIndex);
      if (!openSlot) return;

      await assignRecipeToEmptySlot(
        openSlot.weekOffset,
        openSlot.dayIndex,
        toAssignmentRecipe(recipe)
      );
      router.push(
        `/planner?success=1&dayIndex=${openSlot.dayIndex}&weekOffset=${openSlot.weekOffset}`
      );
    },
    [router]
  );

  const handleRecoveryAction = useCallback(
    async (action: string) => {
      if (!pendingRecovery) return;
      if (action !== 'tomorrow' && action !== 'next_week' && action !== 'drop') return;

      await resolveOccupiedSlot(pendingRecovery.slot, action);
      await assignRecipeToEmptySlot(
        pendingRecovery.navigateTo.weekOffset,
        pendingRecovery.navigateTo.dayIndex,
        pendingRecovery.recipe
      );

      const { weekOffset, dayIndex } = pendingRecovery.navigateTo;
      setPendingRecovery(null);
      router.push(`/planner?success=1&dayIndex=${dayIndex}&weekOffset=${weekOffset}`);
    },
    [pendingRecovery, router]
  );

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

  const handleViewModeChange = useCallback(
    (nextMode: BrowseViewMode) => {
      if (nextMode === browseViewMode) return;
      setBrowseViewModeOverride({ memberId: selectedFamilyMemberId, mode: nextMode });
      setIsEndCard(false);
      setCurrentIndex(0);
      if (selectedFamilyMemberId) {
        void updateMemberPreferences(selectedFamilyMemberId, { browseViewMode: nextMode }).catch(
          () => {
            setBrowseViewModeOverride({ memberId: selectedFamilyMemberId, mode: browseViewMode });
          }
        );
      }
    },
    [browseViewMode, selectedFamilyMemberId, setCurrentIndex, updateMemberPreferences]
  );

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
    browseViewMode === 'stack' &&
    ((isAtLastLoadedCard && isPrefetching && !isEndCard && recipes.length > 0) || isWrappingToEnd);
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

        <div className="flex items-center gap-2">
          <div className="flex h-11 rounded-full bg-white/80 border border-charcoal/8 p-1 shadow-sm backdrop-blur-sm">
            <button
              type="button"
              data-testid="browse-view-stack"
              aria-label="Show recipe cards"
              onClick={() => handleViewModeChange('stack')}
              className={`flex items-center gap-1.5 rounded-full px-3 text-xs font-black uppercase transition-all ${
                browseViewMode === 'stack' ? 'bg-sage/20 text-sage-900' : 'text-charcoal/55'
              }`}
            >
              <Layers3 className="h-4 w-4" />
              {/* Cards */}
            </button>
            <button
              type="button"
              data-testid="browse-view-list"
              aria-label="Show recipe list"
              onClick={() => handleViewModeChange('list')}
              className={`flex items-center gap-1.5 rounded-full px-3 text-xs font-black uppercase transition-all ${
                browseViewMode === 'list' ? 'bg-sage/20 text-sage-900' : 'text-charcoal/55'
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
              {/* List */}
            </button>
          </div>

          <button
            onClick={handleGlobalToggleDiscoverable}
            data-testid="stack-toggle-discoverable"
            className={`flex h-11 items-center gap-2 rounded-full px-4 transition-all duration-300 border ${
              isDiscoverableOnly
                ? 'bg-ochre/15 text-ochre-800 border-ochre/25 shadow-sm shadow-ochre/10'
                : 'bg-white/80 text-charcoal/70 border-charcoal/8 hover:bg-white active:scale-95'
            } backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-ochre focus:ring-offset-2`}
            aria-label={
              isDiscoverableOnly ? 'Showing recipes marked Discovery' : 'Showing all recipes'
            }
          >
            <Compass
              className={`h-4 w-4 ${isDiscoverableOnly ? 'text-ochre fill-ochre/20' : ''}`}
            />
            <span className="text-xs font-black tracking-wide uppercase">
              {isDiscoverableOnly ? 'Discovery Recipes' : 'All Recipes'}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="recycle-bin-entry"
            aria-label="Recycle bin"
            onClick={() => setIsTrashOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-charcoal/70 shadow-sm border border-charcoal/8 backdrop-blur-sm hover:bg-white active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-ochre focus:ring-offset-2"
          >
            <Recycle size={20} />
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

        {!isInitialLoading && !loadError && browseViewMode === 'list' && recipes.length > 0 && (
          <div
            ref={listScrollContainerRef}
            data-testid="browse-list-scroll-container"
            onScroll={handleListScroll}
            className="w-full max-w-6xl flex-1 min-h-0 overflow-y-auto px-1 pb-8"
          >
            <div
              data-testid="browse-list-grid"
              className="grid grid-cols-2 min-[1024px]:grid-cols-3 gap-3 sm:gap-4"
            >
              {recipes.map((recipe) => (
                <button
                  type="button"
                  key={recipe.id}
                  data-testid="browse-list-recipe-card"
                  onClick={() => handleCardTap(recipe.id!)}
                  className="group overflow-hidden rounded-lg bg-white/85 text-left shadow-sm border border-charcoal/8 backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ochre focus:ring-offset-2"
                >
                  <div className="aspect-[4/3] bg-sage/10 overflow-hidden">
                    <img
                      src={`/api/recipes/${recipe.id}/hero`}
                      alt=""
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-sm font-black leading-tight text-charcoal">
                      {recipe.name}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-charcoal/50">
                      {recipe.totalTime || 'N/A'} · {recipe.difficulty || 'Medium'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            <div ref={listSentinelRef} className="h-20 w-full" aria-hidden="true" />
            {isPrefetching && (
              <div className="flex justify-center py-4">
                <Loader2 className="animate-spin text-ochre" size={28} />
              </div>
            )}
          </div>
        )}

        {!isInitialLoading && !loadError && browseViewMode === 'stack' && recipes.length > 0 && (
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
                onToggleIndividualCuration={handleIndividualToggleDiscoverable}
              />
            )}
          </div>
        )}
      </div>

      {detailRecipeId && (
        <RecipeDetailSheet
          recipeId={detailRecipeId}
          plannerDayLabel={null}
          onClose={handleDetailSheetClose}
          onUseForDay={handleCookTonight}
          onPlanForLater={handlePlanForLater}
          onFindSimilar={() => {
            handleDetailSheetClose();
          }}
        />
      )}

      {pendingRecovery && (
        <SkipRecoveryDialog
          isOpen={true}
          step={2}
          onClose={() => setPendingRecovery(null)}
          onBack={() => setPendingRecovery(null)}
          onAction={handleRecoveryAction}
        />
      )}
    </div>
  );
}
