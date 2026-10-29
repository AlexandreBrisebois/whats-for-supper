'use client';

import { useUiStore } from '@/store/uiStore';

import { useTodayStore } from '@/store/todayStore';
import { calendarDayIndex } from '@/lib/deployment-calendar';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { X, Search, Loader2, Compass, Recycle, Layers3, Grid3X3 } from 'lucide-react';
import { GotoAcquisitionSheet } from '@/components/recipes/GotoAcquisitionSheet';
import { BrowseFiltersSheet } from '@/components/recipes/BrowseFiltersSheet';
import { RecipeStackCard } from '@/components/recipes/RecipeStackCard';
import { StackActionBar } from '@/components/recipes/StackActionBar';
import { EndCard } from '@/components/recipes/EndCard';
import { RecipeDetailSheet } from '@/components/recipes/RecipeDetailSheet';
import { RecipeImportIssueBadge } from '@/components/recipes/RecipeImportIssueBadge';
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
import { getImageUrl } from '@/lib/imageUtils';
import { t, tWithVars } from '@/locales';
import { formatRecipeTime } from '@/lib/duration';

type BrowseViewMode = 'stack' | 'list';

const STACK_PAGE_SIZE = 20;
const LIST_PAGE_SIZE = 12;
const isHistoryExpired = (error: unknown) => {
  const failure = error as { responseStatusCode?: number; status?: number; code?: string } | null;
  return (
    failure?.responseStatusCode === 409 ||
    failure?.status === 409 ||
    failure?.code === 'history_generation_expired'
  );
};

// ---------------------------------------------------------------------------
// BrowseAllStack page
// Full-screen immersive overlay for browsing the recipe library card by card.
// Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.1–2.9, 5.1–5.7
// ---------------------------------------------------------------------------

export default function BrowseAllStackPage() {
  return (
    <React.Suspense fallback={null}>
      <BrowseAllStackContent />
    </React.Suspense>
  );
}

function BrowseAllStackContent() {
  const searchParams = useSearchParams();
  const manageGotoOnEntry = searchParams.get('manageGoto') === 'true';
  const router = useRouter();
  const { familyMembers, selectedFamilyMemberId, loadFamilyMembers, updateMemberPreferences } =
    useFamilyStore();
  const gotoMembershipVersion = useFamilyStore((state) => state.gotoMembershipVersion);
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
    reset,
  } = useBrowseStackStore();

  // Local UI state
  const [gotoOnly, setGotoOnly] = useState(() => searchParams.get('gotoOnly') === 'true');
  const [filtersOpen, setFiltersOpen] = useState(manageGotoOnEntry);
  const [acquisitionOpen, setAcquisitionOpen] = useState(false);
  const filtersEntryRef = useRef<HTMLButtonElement>(null);
  const appliedGotoVersion = gotoOnly ? gotoMembershipVersion : 0;
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
  const [allLibraryTotal, setAllLibraryTotal] = useState<number | null>(null);
  const allLibraryTotalRef = useRef<number | null>(null);
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
  const generationRef = useRef(0);
  const historyGenerationRef = useRef<string | undefined>(undefined);
  const [historyRestartRequired, setHistoryRestartRequired] = useState(false);
  const stackPagesRef = useRef(new Map<number, RecipeDto[]>());
  const pageRequestsRef = useRef(new Map<number, Promise<RecipeDto[]>>());
  const navigationPendingRef = useRef(false);
  const [stackPage, setStackPage] = useState(1);
  const [stackRenderVersion, setStackRenderVersion] = useState(0);
  const [failedNavigation, setFailedNavigation] = useState<{ page: number; last: boolean } | null>(
    null
  );

  useEffect(() => {
    if (selectedFamilyMemberId && familyMembers.length === 0) {
      void loadFamilyMembers();
    }
  }, [familyMembers.length, loadFamilyMembers, selectedFamilyMemberId]);

  // ---------------------------------------------------------------------------
  // Data Fetching: fetch summary + first page
  // ---------------------------------------------------------------------------
  const fetchLibraryData = useCallback(
    async (page: number, discoverable: boolean, append = false, restart = false) => {
      const pageSize = browseViewMode === 'list' ? LIST_PAGE_SIZE : STACK_PAGE_SIZE;
      const generation = restart ? ++generationRef.current : generationRef.current;
      let summaryTotalForRequest: number | null = null;
      try {
        if (!append) {
          setIsInitialLoading(true);
          setLoadError(false);
          setIsEndCard(false);
        } else {
          setIsPrefetching(true);
          setPrefetchFailed(false);
        }

        // Fetch library summary for total counts (only on first load)
        if (!append) {
          const summaryResult = await apiClient.api.recipes.librarySummary.get();
          if (generation !== generationRef.current) return;
          const total = summaryResult?.data?.total ?? 0;
          summaryTotalForRequest = total;
          setAllLibraryTotal(total);
          allLibraryTotalRef.current = total;
        }

        // Fetch recipes in explore order with optional filter
        const result = await apiClient.api.recipes.get({
          queryParameters: {
            order: GetOrderQueryParameterTypeObject.Explore,
            page: page,
            limit: pageSize,
            discoverableOnly: discoverable,
            gotoOnly: gotoOnly || undefined,
            historyGeneration: append && !restart ? historyGenerationRef.current : undefined,
          },
        });

        if (generation !== generationRef.current) return;

        const fetchedRecipes = (result?.recipes ?? []) as RecipeDto[];
        const paginationTotal = result?.pagination?.total ?? 0;

        if (append && !restart) {
          appendRecipes(fetchedRecipes);
        } else {
          historyGenerationRef.current = result?.historyGeneration ?? undefined;
          stackPagesRef.current.clear();
          pageRequestsRef.current.clear();
          setHistoryRestartRequired(false);
          setRecipes(fetchedRecipes);
          setCurrentIndex(0);
          setStackPage(1);
          if (browseViewMode === 'stack') stackPagesRef.current.set(1, fetchedRecipes);
        }

        const effectiveTotal =
          (discoverable || gotoOnly) && paginationTotal >= 0
            ? paginationTotal
            : (summaryTotalForRequest ?? allLibraryTotalRef.current ?? paginationTotal);
        setTotalCount(effectiveTotal);

        // Update store pagination state
        useBrowseStackStore.setState({
          currentPage: page,
          hasMorePages: page * pageSize < effectiveTotal,
        });
      } catch (err) {
        if (generation !== generationRef.current) return;
        if (isHistoryExpired(err)) setHistoryRestartRequired(true);
        console.error('BrowseAllStack: fetch failed', err);
        if (append) {
          setPrefetchFailed(true);
        } else {
          setLoadError(true);
        }
      } finally {
        if (generation === generationRef.current) {
          setIsInitialLoading(false);
          setIsPrefetching(false);
          prefetchInFlightRef.current = false;
        }
      }
    },
    [appendRecipes, browseViewMode, gotoOnly, setRecipes, setCurrentIndex, setTotalCount]
  );

  const getStackPage = useCallback(
    (page: number, force = false): Promise<RecipeDto[]> => {
      const cached = stackPagesRef.current.get(page);
      if (!force && cached) return Promise.resolve(cached);
      const pending = pageRequestsRef.current.get(page);
      if (pending) return pending;
      const generation = generationRef.current;
      const request = apiClient.api.recipes
        .get({
          queryParameters: {
            order: GetOrderQueryParameterTypeObject.Explore,
            page,
            limit: STACK_PAGE_SIZE,
            discoverableOnly: isDiscoverableOnly,
            gotoOnly: gotoOnly || undefined,
            historyGeneration: historyGenerationRef.current,
          },
        })
        .then((result) => {
          const items = (result?.recipes ?? []) as RecipeDto[];
          if (generation === generationRef.current) stackPagesRef.current.set(page, items);
          return items;
        })
        .catch((error) => {
          if (generation === generationRef.current && isHistoryExpired(error))
            setHistoryRestartRequired(true);
          throw error;
        })
        .finally(() => {
          if (generation === generationRef.current) pageRequestsRef.current.delete(page);
        });
      pageRequestsRef.current.set(page, request);
      return request;
    },
    [isDiscoverableOnly, gotoOnly]
  );

  const navigatePage = useCallback(
    async (page: number, last: boolean) => {
      if (navigationPendingRef.current) return;
      const generation = generationRef.current;
      navigationPendingRef.current = true;
      setIsWrappingToEnd(true);
      // A completed swipe has animated its originating card out. Remount the
      // retained page so pending/failed navigation keeps that card visible.
      setStackRenderVersion((version) => version + 1);
      setFailedNavigation(null);
      // Preserve local curation changes when revisiting a cached page.
      stackPagesRef.current.set(stackPage, useBrowseStackStore.getState().recipes);
      try {
        let target = page;
        let items = await getStackPage(target);
        // Preserve bounded probing for a count which became stale on the server.
        for (
          let attempts = 1;
          last && items.length === 0 && target > 1 && attempts < 3;
          attempts++
        ) {
          if (generation !== generationRef.current) return;
          items = await getStackPage(--target, true);
        }
        if (generation !== generationRef.current) return;
        if (!items.length) throw new Error('Requested recipe page is empty');
        setStackPage(target);
        setRecipes(items);
        setCurrentIndex(last ? items.length - 1 : 0);
        setIsEndCard(false);
        setPrefetchFailed(false);
        useBrowseStackStore.setState({
          currentPage: target,
          hasMorePages: target * STACK_PAGE_SIZE < totalCount,
        });
      } catch (error) {
        if (generation !== generationRef.current) return;
        console.error('BrowseAllStack: page navigation failed', error);
        setFailedNavigation({ page, last });
      } finally {
        if (generation === generationRef.current) {
          navigationPendingRef.current = false;
          setIsWrappingToEnd(false);
        }
      }
    },
    [getStackPage, stackPage, setRecipes, setCurrentIndex, totalCount]
  );

  useEffect(() => {
    const generation = ++generationRef.current;
    historyGenerationRef.current = undefined;
    stackPagesRef.current.clear();
    pageRequestsRef.current.clear();
    navigationPendingRef.current = false;
    prefetchInFlightRef.current = false;
    Promise.resolve().then(() => {
      if (generation !== generationRef.current) return;
      setHistoryRestartRequired(false);
      setFailedNavigation(null);
      setIsWrappingToEnd(false);
      setPrefetchFailed(false);
      void fetchLibraryData(1, isDiscoverableOnly);
    });
    return () => {
      generationRef.current = generation + 1;
    };
  }, [isDiscoverableOnly, browseViewMode, fetchLibraryData, appliedGotoVersion]);

  useEffect(() => () => reset(), [reset]);

  useEffect(() => {
    if (recipes.length === 0) return;
    if (currentIndex < 0) setCurrentIndex(0);
    else if (currentIndex >= recipes.length) setCurrentIndex(recipes.length - 1);
  }, [currentIndex, recipes.length, setCurrentIndex]);

  useEffect(() => {
    const nextPage = stackPage + 1;
    if (
      browseViewMode !== 'stack' ||
      isInitialLoading ||
      isEndCard ||
      prefetchFailed ||
      recipes.length - currentIndex - 1 > 5 ||
      nextPage > Math.ceil(totalCount / STACK_PAGE_SIZE) ||
      stackPagesRef.current.has(nextPage) ||
      pageRequestsRef.current.has(nextPage)
    )
      return;
    const generation = generationRef.current;
    void getStackPage(nextPage).catch(() => {
      if (generation === generationRef.current) setPrefetchFailed(true);
    });
  }, [
    browseViewMode,
    isInitialLoading,
    isEndCard,
    prefetchFailed,
    stackPage,
    recipes.length,
    currentIndex,
    totalCount,
    getStackPage,
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
    if (navigationPendingRef.current) return;
    if (currentIndex < recipes.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      void navigatePage(
        stackPage < Math.ceil(totalCount / STACK_PAGE_SIZE) ? stackPage + 1 : 1,
        false
      );
    }
  }, [currentIndex, recipes.length, stackPage, totalCount, navigatePage, setCurrentIndex]);

  const handleSwipeRight = useCallback(() => {
    if (navigationPendingRef.current) return;
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
    else
      void navigatePage(
        stackPage > 1 ? stackPage - 1 : Math.max(1, Math.ceil(totalCount / STACK_PAGE_SIZE)),
        true
      );
  }, [currentIndex, stackPage, totalCount, navigatePage, setCurrentIndex]);

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
      const calendar = await useTodayStore.getState().ensureCalendar();
      const todayIndex = calendarDayIndex(calendar);
      const assignmentRecipe = toAssignmentRecipe(recipe);
      const slot = await getPlannerSlot(0, todayIndex, calendar.referenceWeekStartDate);

      if (slot?.recipe) {
        setDetailRecipeId(null);
        setPendingRecovery({
          slot,
          recipe: assignmentRecipe,
          navigateTo: { weekOffset: 0, dayIndex: todayIndex },
        });
        return;
      }

      await assignRecipeToEmptySlot(
        0,
        todayIndex,
        assignmentRecipe,
        calendar.referenceWeekStartDate
      );
      router.push(
        `/planner?success=1&dayIndex=${todayIndex}&weekOffset=0&referenceWeekStartDate=${calendar.referenceWeekStartDate}`
      );
    },
    [router]
  );

  const handlePlanForLater = useCallback(
    async (recipe: Recipe) => {
      // "Plan for Later" starts from tomorrow onwards
      const calendar = await useTodayStore.getState().ensureCalendar();
      const todayIndex = calendarDayIndex(calendar);
      let startDayIndex = todayIndex + 1;
      let startWeekOffset = 0;

      if (startDayIndex > 6) {
        startDayIndex = 0;
        startWeekOffset = 1;
      }

      const openSlot = await findFirstOpenPlannerSlot(
        startWeekOffset,
        startDayIndex,
        520,
        calendar.referenceWeekStartDate
      );
      if (!openSlot) return;

      await assignRecipeToEmptySlot(
        openSlot.weekOffset,
        openSlot.dayIndex,
        toAssignmentRecipe(recipe),
        openSlot.referenceWeekStartDate
      );
      router.push(
        `/planner?success=1&dayIndex=${openSlot.dayIndex}&weekOffset=${openSlot.weekOffset}&referenceWeekStartDate=${openSlot.referenceWeekStartDate}`
      );
    },
    [router]
  );

  const recoverySubmissionRef = useRef(false);
  const [recoveryPending, setRecoveryPending] = useState(false);

  const handleRecoveryAction = useCallback(
    async (action: string) => {
      if (!pendingRecovery) return;
      if (action !== 'tomorrow' && action !== 'next_week' && action !== 'drop') return;
      if (recoverySubmissionRef.current) return;
      recoverySubmissionRef.current = true;
      setRecoveryPending(true);

      try {
        await resolveOccupiedSlot(pendingRecovery.slot, action);
        await assignRecipeToEmptySlot(
          pendingRecovery.navigateTo.weekOffset,
          pendingRecovery.navigateTo.dayIndex,
          pendingRecovery.recipe,
          pendingRecovery.slot.referenceWeekStartDate
        );

        const { weekOffset, dayIndex } = pendingRecovery.navigateTo;
        setPendingRecovery(null);
        router.push(
          `/planner?success=1&dayIndex=${dayIndex}&weekOffset=${weekOffset}&referenceWeekStartDate=${pendingRecovery.slot.referenceWeekStartDate}`
        );
      } catch (error) {
        useUiStore.getState().addToast({
          type: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'This meal could not be moved. Refresh your plan.',
        });
      } finally {
        recoverySubmissionRef.current = false;
        setRecoveryPending(false);
      }
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
  const globalIndex = (stackPage - 1) * STACK_PAGE_SIZE + currentIndex;
  const displayTotal = totalCount;

  const isEmpty =
    !isInitialLoading && !loadError && recipes.length === 0 && !isDiscoverableOnly && !gotoOnly;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div
      data-testid="browse-all-stack-container"
      className="fixed inset-0 z-50 flex flex-col bg-cream overflow-hidden"
    >
      <BackgroundBlobs />

      {/* Top bar: Clustered actions (right) */}
      <div className="relative z-10 flex items-center justify-end px-6 pt-safe-top pt-2 pb-1 shrink-0 gap-1.5">
        <button
          onClick={handleGlobalToggleDiscoverable}
          data-testid="stack-toggle-discoverable"
          className={`flex h-11 items-center gap-2 rounded-full px-3 transition-all duration-300 border ${
            isDiscoverableOnly
              ? 'bg-ochre/15 text-ochre-800 border-ochre/25 shadow-sm shadow-ochre/10'
              : 'bg-white/80 text-charcoal/70 border-charcoal/8 hover:bg-white active:scale-95'
          } backdrop-blur-sm focus:outline-none`}
          aria-label={
            isDiscoverableOnly ? 'Showing recipes marked Discovery' : 'Showing all recipes'
          }
        >
          <Compass className={`h-4 w-4 ${isDiscoverableOnly ? 'text-ochre fill-ochre/20' : ''}`} />
          <span className="text-xs font-black tracking-wide uppercase">
            {isDiscoverableOnly ? 'Discovery' : 'All'}
          </span>
        </button>

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
          </button>
        </div>

        <button
          type="button"
          data-testid="recycle-bin-entry"
          aria-label="Recycle bin"
          onClick={() => setIsTrashOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-charcoal/70 shadow-sm border border-charcoal/8 backdrop-blur-sm hover:bg-white active:scale-95 transition-all focus:outline-none"
        >
          <Recycle size={20} />
        </button>

        <button
          type="button"
          data-testid="browse-all-exit"
          aria-label="Close browse overlay"
          onClick={handleExit}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-charcoal/70 shadow-sm border border-charcoal/8 backdrop-blur-sm hover:bg-white active:scale-95 transition-all focus:outline-none"
        >
          <X size={20} />
        </button>
      </div>

      <div className="relative z-10 flex shrink-0 justify-end px-6 pb-1">
        <button
          type="button"
          ref={filtersEntryRef}
          data-testid="browse-filters-entry"
          aria-haspopup="dialog"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen(true)}
          className="min-h-11 rounded-full border border-charcoal/10 bg-white px-4 text-sm font-bold text-charcoal"
        >
          {t('recipes.filters', 'Filters')} {gotoOnly ? '(1)' : ''}
        </button>
      </div>
      {filtersOpen && (
        <BrowseFiltersSheet
          manageGoto={manageGotoOnEntry}
          onAddGoto={() => {
            setFiltersOpen(false);
            setAcquisitionOpen(true);
          }}
          gotoOnly={gotoOnly}
          onClose={() => setFiltersOpen(false)}
          onApply={(selected) => {
            setGotoOnly(selected);
            setFiltersOpen(false);
          }}
        />
      )}

      {acquisitionOpen && (
        <GotoAcquisitionSheet
          returnFocus={filtersEntryRef}
          onClose={() => setAcquisitionOpen(false)}
        />
      )}

      {isTrashOpen && <RecycleBinSheet onClose={() => setIsTrashOpen(false)} />}

      {/* Main content area */}
      <div
        className={`relative z-10 flex flex-1 flex-col items-center justify-start pt-4 px-6 pb-2 min-h-0 ${browseViewMode === 'stack' ? 'overflow-y-auto overflow-x-hidden' : ''}`}
      >
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

        {historyRestartRequired && (
          <div role="status" className="rounded-2xl bg-white/90 p-4 text-center">
            <p>Recipe order changed. Your current cards are kept until the first page reloads.</p>
            <button
              type="button"
              disabled={isPrefetching}
              onClick={() => void fetchLibraryData(1, isDiscoverableOnly, true, true)}
              className="mt-2 min-h-12 rounded-full bg-ochre px-6 font-bold text-white"
            >
              Restart from first page
            </button>
          </div>
        )}

        {!isInitialLoading && !loadError && gotoOnly && recipes.length === 0 && (
          <div
            data-testid="browse-goto-empty"
            className="flex flex-col items-center gap-3 px-4 text-center text-charcoal"
          >
            <p>
              {t(
                'recipes.gotoNoMatches',
                'No matching GOTO recipes. Pending recipes are still available in management.'
              )}
            </p>
            <button
              type="button"
              data-testid="browse-goto-clear"
              onClick={() => setGotoOnly(false)}
              className="min-h-11 px-4 font-bold text-terracotta-700 underline"
            >
              {t('recipes.clearFilters', 'Clear filters')}
            </button>
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="min-h-11 px-4 font-bold text-charcoal"
            >
              {t('recipes.filters', 'Filters')}
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
                  className="group flex flex-col justify-start items-stretch overflow-hidden rounded-lg bg-white/85 text-left shadow-sm border border-charcoal/8 backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ochre focus:ring-offset-2"
                >
                  <div className="relative aspect-[4/3] bg-sage/10 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getImageUrl(`/api/recipes/${recipe.id}/hero`)}
                      alt=""
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    {recipe.importIssue?.status && (
                      <div className="absolute left-2 top-2">
                        <RecipeImportIssueBadge status={recipe.importIssue.status} />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-sm font-black leading-tight text-charcoal">
                      {recipe.name}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-charcoal/50">
                      {tWithVars('common.readyIn', 'READY IN {{time}}', {
                        time: formatRecipeTime(recipe.totalTime),
                      })}
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
          <div className="w-full max-w-sm md:max-w-xl flex-1 flex flex-col min-h-[740px] md:min-h-[860px] max-h-[82vh] md:max-h-[880px] lg:max-h-[780px] transition-all duration-500 ease-in-out">
            <div className="relative flex-1 min-h-0">
              <AnimatePresence mode="popLayout">
                {visibleRecipes.map((recipe, i) => (
                  <RecipeStackCard
                    key={`${recipe.id}:${stackRenderVersion}`}
                    id={recipe.id!}
                    name={recipe.name!}
                    description={recipe.description || ''}
                    imageUrl={getImageUrl(`/api/recipes/${recipe.id}/hero`)}
                    totalTime={recipe.totalTime || ''}
                    category={recipe.category || ''}
                    cuisineType={recipe.cuisineType ?? null}
                    mealTypes={recipe.mealTypes ?? null}
                    importIssueStatus={recipe.importIssue?.status ?? null}
                    isFront={i === 0}
                    stackIndex={i}
                    onSwipeRight={handleSwipeRight}
                    onSwipeLeft={handleSwipeLeft}
                    onTap={() => handleCardTap(recipe.id!)}
                  />
                ))}
              </AnimatePresence>
            </div>

            {isWrappingToEnd && (
              <p role="status" className="text-center text-sm text-charcoal/60">
                Loading recipes…
              </p>
            )}
            {failedNavigation && (
              <div role="alert" className="text-center text-sm text-terracotta">
                Could not load that page. Your place is kept.
                <button
                  type="button"
                  data-testid="stack-page-retry"
                  className="ml-2 font-bold underline"
                  onClick={() => void navigatePage(failedNavigation.page, failedNavigation.last)}
                >
                  Retry
                </button>
              </div>
            )}
            {/* Stack Action Bar */}
            {!isEndCard && currentRecipe && (
              <StackActionBar
                currentRecipe={currentRecipe}
                currentIndex={globalIndex}
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
          onFindSimilar={(recipeId) => {
            router.push(`/recipes?similarTo=${recipeId}`);
          }}
        />
      )}

      {pendingRecovery && (
        <SkipRecoveryDialog
          pending={recoveryPending}
          isOpen={true}
          step={2}
          onClose={() => {
            if (!recoverySubmissionRef.current) setPendingRecovery(null);
          }}
          onBack={() => {
            if (!recoverySubmissionRef.current) setPendingRecovery(null);
          }}
          onAction={handleRecoveryAction}
        />
      )}
    </div>
  );
}
