'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { X, Search, Loader2, Compass, Recycle, Layers, Grid } from 'lucide-react';
import { RecipeStackCard } from '@/components/recipes/RecipeStackCard';
import { StackActionBar } from '@/components/recipes/StackActionBar';
import { EndCard } from '@/components/recipes/EndCard';
import { RecipeDetailSheet } from '@/components/recipes/RecipeDetailSheet';
import { RecycleBinSheet } from '@/components/recipes/RecycleBinSheet';
import { useBrowseStackStore } from '@/store/browseStackStore';
import { useFamilyStore } from '@/store/familyStore';
import { apiClient } from '@/lib/api/api-client';
import { updateRecipe } from '@/lib/api/recipes';
import { GetOrderQueryParameterTypeObject } from '@/lib/api/generated/api/recipes/index';
import type { RecipeDto } from '@/lib/api/generated/models/index';
import { BackgroundBlobs } from '@/components/ui/BackgroundBlobs';
import { getImageUrl } from '@/lib/imageUtils';

type BrowseViewMode = 'stack' | 'list';

const STACK_PAGE_SIZE = 20;
const LIST_PAGE_SIZE = 12;

export default function BrowseAllStackPage() {
  const router = useRouter();

  const familyMembers = useFamilyStore((s) => s.familyMembers);
  const selectedFamilyMemberId = useFamilyStore((s) => s.selectedFamilyMemberId);
  const loadFamilyMembers = useFamilyStore((s) => s.loadFamilyMembers);
  const selectedMember = useMemo(
    () => familyMembers.find((m) => m.id === selectedFamilyMemberId),
    [familyMembers, selectedFamilyMemberId]
  );
  const savedBrowseViewMode = selectedMember?.browseViewMode ?? 'stack';

  const recipes = useBrowseStackStore((s) => s.recipes);
  const currentIndex = useBrowseStackStore((s) => s.currentIndex);
  const totalCount = useBrowseStackStore((s) => s.totalCount);
  const currentPage = useBrowseStackStore((s) => s.currentPage);
  const hasMorePages = useBrowseStackStore((s) => s.hasMorePages);
  const isInitialLoading = useBrowseStackStore((s) => s.isLoading);
  const isPrefetching = useBrowseStackStore((s) => s.isPrefetching);
  const loadError = useBrowseStackStore((s) => s.loadError);
  const setCurrentIndex = useBrowseStackStore((s) => s.setCurrentIndex);
  const reset = useBrowseStackStore((s) => s.reset);

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
  const [detailRecipeId, setDetailRecipeId] = useState<string | null>(null);
  const [isTrashOpen, setIsTrashOpen] = useState(false);

  const currentRequestRef = useRef<any>(null);
  const initialLoadRef = useRef(false);
  const fetchInProgressRef = useRef(false);
  const isLibrarySummaryLoadedRef = useRef(false);
  const browseViewModeRef = useRef(browseViewMode);
  const hasStartedInitialLoadRef = useRef(false);

  useEffect(() => {
    browseViewModeRef.current = browseViewMode;
  }, [browseViewMode]);

  const fetchLibraryData = useCallback(
    async (page: number, discoverable: boolean, append = false) => {
      if (fetchInProgressRef.current) return;
      fetchInProgressRef.current = true;

      const mode = browseViewModeRef.current;
      const pageSize = mode === 'list' ? LIST_PAGE_SIZE : STACK_PAGE_SIZE;

      // Yield to avoid synchronous setState in useEffect (satisfies react-hooks/set-state-in-effect)
      await Promise.resolve();

      try {
        currentRequestRef.current = { page, discoverableOnly: discoverable, viewMode: mode };
        if (append) useBrowseStackStore.setState({ isPrefetching: true });
        else {
          useBrowseStackStore.setState({ isLoading: true, loadError: false });
        }

        const result = await apiClient.api.recipes.get({
          queryParameters: {
            order: GetOrderQueryParameterTypeObject.Explore,
            page,
            limit: pageSize,
            discoverableOnly: discoverable,
          },
        });

        if (
          currentRequestRef.current?.page !== page ||
          currentRequestRef.current?.discoverableOnly !== discoverable ||
          currentRequestRef.current?.viewMode !== mode
        )
          return;

        const fetched = (result?.recipes ?? []) as RecipeDto[];
        const total = result?.pagination?.total ?? useBrowseStackStore.getState().totalCount;

        useBrowseStackStore.setState((s) => {
          const existingIds = new Set(s.recipes.map((r) => r?.id).filter(Boolean));
          const deduped = fetched.filter((r) => r?.id && !existingIds.has(r.id));
          const nextRecipes = append ? [...s.recipes, ...deduped] : fetched;

          return {
            recipes: nextRecipes,
            totalCount: total,
            currentPage: page,
            hasMorePages: nextRecipes.length < total,
            ...(append ? {} : { currentIndex: 0 }),
          };
        });
        useBrowseStackStore.setState({ loadError: false });
      } catch (err) {
        console.error('Fetch failed', err);
        if (!append) useBrowseStackStore.setState({ loadError: true });
      } finally {
        useBrowseStackStore.setState({ isLoading: false, isPrefetching: false });
        fetchInProgressRef.current = false;
      }
    },
    []
  );

  useEffect(() => {
    if (familyMembers.length === 0 && !initialLoadRef.current) {
      initialLoadRef.current = true;
      void loadFamilyMembers();
    }
  }, [familyMembers.length, loadFamilyMembers]);

  useEffect(() => {
    if (familyMembers.length > 0 && !isLibrarySummaryLoadedRef.current) {
      isLibrarySummaryLoadedRef.current = true;
      void (async () => {
        try {
          const summary = await apiClient.api.recipes.librarySummary.get();
          const total =
            (summary as any)?.data?.total ??
            (summary as any)?.total ??
            (summary as any)?.totalRecipes ??
            0;
          if (total > 0) useBrowseStackStore.setState({ totalCount: total });
        } catch (e) {
          console.warn('Summary fetch failed', e);
        }
      })();
    }
  }, [familyMembers.length]);

  useEffect(() => {
    if (familyMembers.length > 0 && !hasStartedInitialLoadRef.current) {
      hasStartedInitialLoadRef.current = true;
      void fetchLibraryData(1, isDiscoverableOnly);
    }
  }, [familyMembers.length, isDiscoverableOnly, fetchLibraryData]);

  useEffect(() => {
    if (!hasStartedInitialLoadRef.current) return;
    // When filters change, reload page 1
    void fetchLibraryData(1, isDiscoverableOnly);
  }, [isDiscoverableOnly, browseViewMode, fetchLibraryData]);

  useEffect(() => {
    return () => reset();
  }, [reset]);

  const wrapToLastPage = useCallback(async () => {
    const total = totalCount;
    if (total <= 0) return;
    const lastPage = Math.ceil(total / STACK_PAGE_SIZE);
    useBrowseStackStore.setState({ isPrefetching: true });
    setIsEndCard(false);
    try {
      const result = await apiClient.api.recipes.get({
        queryParameters: {
          order: GetOrderQueryParameterTypeObject.Explore,
          page: lastPage,
          limit: STACK_PAGE_SIZE,
          discoverableOnly: isDiscoverableOnly,
        },
      });
      const fetched = (result?.recipes ?? []) as RecipeDto[];
      const actualTotal = result?.pagination?.total ?? total;
      useBrowseStackStore.setState((s) => {
        const existingIds = new Set(s.recipes.map((r) => r?.id).filter(Boolean));
        const deduped = fetched.filter((r) => r?.id && !existingIds.has(r.id));
        const merged = [...s.recipes, ...deduped];
        return {
          recipes: merged,
          totalCount: actualTotal,
          currentPage: lastPage,
          hasMorePages: false,
          currentIndex: merged.length - 1,
        };
      });
    } catch (err) {
      console.error(err);
    } finally {
      useBrowseStackStore.setState({ isPrefetching: false });
    }
  }, [totalCount, isDiscoverableOnly]);

  const handleNext = useCallback(() => {
    if (currentIndex >= totalCount - 1) setIsEndCard(true);
    else setCurrentIndex(currentIndex + 1);
  }, [currentIndex, totalCount, setCurrentIndex]);

  const handlePrevious = useCallback(() => {
    if (currentIndex <= 0) void wrapToLastPage();
    else setCurrentIndex(currentIndex - 1);
  }, [currentIndex, setCurrentIndex, wrapToLastPage]);

  // Pre-fetch next page (stack)
  useEffect(() => {
    if (
      browseViewMode !== 'stack' ||
      isInitialLoading ||
      isEndCard ||
      !hasMorePages ||
      isPrefetching
    )
      return;
    const remaining = recipes.length - (currentIndex + 1);
    if (remaining <= 5) {
      void fetchLibraryData(currentPage + 1, isDiscoverableOnly, true);
    }
  }, [
    currentIndex,
    recipes.length,
    hasMorePages,
    isInitialLoading,
    isEndCard,
    browseViewMode,
    fetchLibraryData,
    isDiscoverableOnly,
    isPrefetching,
    currentPage,
  ]);

  // List view infinite scroll & external load more
  useEffect(() => {
    const handleLoadMore = () => {
      if (hasMorePages && !isPrefetching && !isInitialLoading) {
        void fetchLibraryData(currentPage + 1, isDiscoverableOnly, true);
      }
    };
    window.addEventListener('browse-list-load-more', handleLoadMore);
    return () => window.removeEventListener('browse-list-load-more', handleLoadMore);
  }, [
    hasMorePages,
    isPrefetching,
    isInitialLoading,
    currentPage,
    isDiscoverableOnly,
    fetchLibraryData,
  ]);

  const handleListScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (browseViewMode !== 'list' || !hasMorePages || isPrefetching || isInitialLoading) return;
      const { scrollTop } = e.currentTarget;
      if (scrollTop > 0) {
        void fetchLibraryData(currentPage + 1, isDiscoverableOnly, true);
      }
    },
    [
      browseViewMode,
      hasMorePages,
      isPrefetching,
      isInitialLoading,
      currentPage,
      isDiscoverableOnly,
      fetchLibraryData,
    ]
  );

  const visibleRecipes = useMemo(() => {
    if (browseViewMode === 'list') return recipes.filter(Boolean);
    return recipes
      .slice(currentIndex, currentIndex + 3)
      .map((r, i) => ({ recipe: r, index: currentIndex + i }));
  }, [recipes, currentIndex, browseViewMode]);

  return (
    <div
      data-testid="browse-all-stack-container"
      className="fixed inset-0 z-50 flex flex-col bg-cream overflow-hidden"
    >
      <BackgroundBlobs />
      <div className="relative z-10 flex items-center justify-between px-6 pt-safe-top pt-4 pb-2 shrink-0">
        <button
          onClick={() => router.back()}
          data-testid="browse-all-exit"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 border border-charcoal/8 shadow-sm hover:bg-white transition-all"
        >
          <X size={20} />
        </button>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsTrashOpen(true)}
            data-testid="recycle-bin-entry"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 border border-charcoal/8 shadow-sm hover:bg-white transition-all"
          >
            <Recycle size={20} />
          </button>
          <div className="flex h-11 rounded-full bg-white/80 border border-charcoal/8 p-1 shadow-sm">
            <button
              onClick={() =>
                setBrowseViewModeOverride({ memberId: selectedFamilyMemberId, mode: 'stack' })
              }
              data-testid="browse-view-stack"
              className={`rounded-full px-3 transition-all ${browseViewMode === 'stack' ? 'bg-sage/20 text-sage-900' : 'text-charcoal/55'}`}
            >
              <Layers size={16} />
            </button>
            <button
              onClick={() =>
                setBrowseViewModeOverride({ memberId: selectedFamilyMemberId, mode: 'list' })
              }
              data-testid="browse-view-list"
              className={`rounded-full px-3 transition-all ${browseViewMode === 'list' ? 'bg-sage/20 text-sage-900' : 'text-charcoal/55'}`}
            >
              <Grid size={16} />
            </button>
          </div>
          <button
            onClick={() => setIsDiscoverableOnly(!isDiscoverableOnly)}
            data-testid="stack-toggle-discoverable"
            className={`flex h-11 items-center gap-2 rounded-full px-3 transition-all border ${isDiscoverableOnly ? 'bg-terracotta border-terracotta text-white shadow-lg' : 'bg-white/80 border-charcoal/8 text-charcoal/60'}`}
          >
            <Compass size={16} />
            <span className="text-[10px] font-black uppercase">
              {isDiscoverableOnly ? 'Discovering' : 'All'}
            </span>
          </button>
        </div>
      </div>
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 overflow-hidden">
        {isInitialLoading || loadError ? (
          <div className="flex flex-col items-center gap-4 text-center">
            {loadError ? (
              <>
                <h3 className="text-xl font-bold">Failed to load</h3>
                <button
                  onClick={() => fetchLibraryData(1, isDiscoverableOnly)}
                  className="text-terracotta underline"
                >
                  Try Again
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-terracotta" />
                <p>Loading your library…</p>
              </div>
            )}
          </div>
        ) : browseViewMode === 'list' ? (
          <div
            className="w-full h-full overflow-y-auto pb-20 pt-4"
            data-testid="browse-list-scroll-container"
            onScroll={handleListScroll}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="browse-list-grid">
              {visibleRecipes.map((r: any) => (
                <div
                  key={r.id}
                  data-testid="browse-list-recipe-card"
                  onClick={() => {
                    const idx = recipes.findIndex((x) => x?.id === r.id);
                    if (idx !== -1) {
                      setCurrentIndex(idx);
                      setBrowseViewModeOverride({
                        memberId: selectedFamilyMemberId,
                        mode: 'stack',
                      });
                    }
                  }}
                  className="relative aspect-[4/5] rounded-3xl bg-white border border-charcoal/5 overflow-hidden cursor-pointer"
                >
                  <Image
                    src={getImageUrl(r.imageUrl)}
                    alt={r.name ?? 'Recipe'}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
              ))}
              {hasMorePages && (
                <button
                  onClick={() => fetchLibraryData(currentPage + 1, isDiscoverableOnly, true)}
                  className="col-span-full py-10 underline"
                >
                  Load More
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="relative w-full max-w-sm aspect-[3/4] h-full flex items-center justify-center mb-12">
            <AnimatePresence mode="popLayout">
              {isEndCard ? (
                <EndCard key="end-card" onSwipeLeft={handleNext} onSwipeRight={handlePrevious} />
              ) : !recipes[currentIndex] ? (
                <div key="loader" className="flex flex-col items-center gap-4">
                  <Loader2 className="h-10 w-10 animate-spin text-terracotta" />
                </div>
              ) : (
                visibleRecipes.map(
                  ({ recipe, index }: any, i: number) =>
                    recipe && (
                      <RecipeStackCard
                        key={recipe.id}
                        id={recipe.id}
                        name={recipe.name ?? ''}
                        description={recipe.description ?? ''}
                        imageUrl={recipe.imageUrl ?? ''}
                        totalTime={recipe.totalTime ?? '0'}
                        category={recipe.category ?? ''}
                        isFront={i === 0}
                        stackIndex={i}
                        onSwipeLeft={handleNext}
                        onSwipeRight={handlePrevious}
                        onTap={() => setDetailRecipeId(recipe.id)}
                      />
                    )
                )
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
      {!isInitialLoading &&
        !loadError &&
        browseViewMode === 'stack' &&
        !isEndCard &&
        recipes[currentIndex] && (
          <StackActionBar
            currentRecipe={recipes[currentIndex]!}
            currentIndex={currentIndex}
            totalCount={totalCount}
            onToggleIndividualCuration={async (id, val) => {
              await updateRecipe(id, { isDiscoverable: val });
              useBrowseStackStore.setState((s) => ({
                recipes: s.recipes.map((r) => (r?.id === id ? { ...r, isDiscoverable: val } : r)),
              }));
            }}
          />
        )}
      {detailRecipeId && (
        <RecipeDetailSheet
          recipeId={detailRecipeId}
          plannerDayLabel={null}
          onClose={() => setDetailRecipeId(null)}
          onUseForDay={async () => {}}
          onPlanForLater={async () => {}}
          onFindSimilar={(id) => router.push(`/recipes?similarTo=${id}`)}
        />
      )}
      {isTrashOpen && <RecycleBinSheet onClose={() => setIsTrashOpen(false)} />}
    </div>
  );
}
