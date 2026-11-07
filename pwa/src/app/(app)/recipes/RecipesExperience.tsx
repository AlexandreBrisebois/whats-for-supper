'use client';

import { useReplacementRecovery } from '@/lib/planner/useReplacementRecovery';

// Generation-guarded requests and pagination depend on the explicit callback
// lifetimes below. React Compiler may skip this controller without changing
// those manual useCallback semantics.
/* eslint-disable react-hooks/preserve-manual-memoization */

import { useUiStore } from '@/store/uiStore';

import { rememberPlanningResult } from '@/lib/planner/planningResult';
import { formatSupperPlanDate } from '@/lib/planner/nonCooking';
import { subscribeIngredientProjectionInvalidation } from '@/lib/ingredient-projection-invalidation';
import {
  absoluteMonday,
  calendarAnchorIsFresh,
  CalendarUnavailableError,
  calendarTime,
  loadCalendarSnapshot,
  type CalendarAnchor,
  loadDeploymentCalendar,
  type CalendarContext,
} from '@/lib/deployment-calendar';

import React, { useState, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { Search, Loader2, Compass, Recycle, Layers3, Grid3X3, Star } from 'lucide-react';
import { RecipeStackCard } from '@/components/recipes/RecipeStackCard';
import { StackActionBar } from '@/components/recipes/StackActionBar';
import { EndCard } from '@/components/recipes/EndCard';
import { PlanningDayChooser } from '@/components/recipes/PlanningDayChooser';
import { NonCookingReplacementConfirmation } from '@/components/recipes/NonCookingReplacementConfirmation';
import { RecipeDetailSheet } from '@/components/recipes/RecipeDetailSheet';
import { usePlannerStore } from '@/store/plannerStore';
import { RecipeImportIssueBadge } from '@/components/recipes/RecipeImportIssueBadge';
import {
  RecipeFiltersSheet,
  type RecipeFilterDraft,
} from '@/components/recipes/RecipeFiltersSheet';
import { RecycleBinSheet } from '@/components/recipes/RecycleBinSheet';
import { SkipRecoveryDialog } from '@/components/home/SkipRecoveryDialog';
import { useBrowseStackStore } from '@/store/browseStackStore';
import { useFamilyStore } from '@/store/familyStore';
import { useSearchPromotionStore } from '@/store/searchPromotionStore';
import { apiClient } from '@/lib/api/api-client';
import {
  searchRecipes,
  updateRecipe,
  type Recipe,
  type RecipeSearchResponse,
} from '@/lib/api/recipes';
import {
  assignRecipeToEmptySlot,
  findFirstOpenPlannerSlot,
  getPlannerSlot,
  type AssignmentRecipe,
  type PlannerSlot,
} from '@/lib/planner/slotAssignment';
import { GetOrderQueryParameterTypeObject } from '@/lib/api/generated/api/recipes/index';
import type {
  RecipeDto,
  RecipeSearchFiltersDto,
  RecipeSearchPreferencesDto,
  RecipeSearchFilterDiscoveryDto,
} from '@/lib/api/generated/models/index';
import { BackgroundBlobs } from '@/components/ui/BackgroundBlobs';
import { getImageUrl } from '@/lib/imageUtils';
import { getLocale, t, tWithVars } from '@/locales';
import { formatRecipeTime } from '@/lib/duration';

type BrowseViewMode = 'stack' | 'list';

function hasSearchIntent(
  query: string,
  filters: RecipeSearchFiltersDto,
  preferences: RecipeSearchPreferencesDto,
  similarToRecipeId?: string | null
) {
  return (
    Boolean(query.trim() || similarToRecipeId) ||
    Object.entries(filters).some(
      ([key, value]) =>
        key !== 'gotoOnly' &&
        key !== 'discoverableOnly' &&
        (Array.isArray(value) ? value.length > 0 : Boolean(value))
    ) ||
    Object.values(preferences).some((value) =>
      Array.isArray(value) ? value.length > 0 : Boolean(value)
    )
  );
}

function appliedSelectionCount(
  filters: RecipeSearchFiltersDto,
  preferences: RecipeSearchPreferencesDto,
  discoverableOnly: boolean,
  gotoOnly: boolean
) {
  const count = (values: unknown[]) =>
    values.reduce<number>(
      (total, value) => total + (Array.isArray(value) ? value.length : value === true ? 1 : 0),
      0
    );
  const searchFilters = Object.entries(filters)
    .filter(([key]) => key !== 'discoverableOnly' && key !== 'gotoOnly')
    .map(([, value]) => value);
  return (
    count(searchFilters) +
    count(Object.values(preferences)) +
    Number(discoverableOnly) +
    Number(gotoOnly)
  );
}

function plannerDayName(dayValue: string | null): string | null {
  const day = Number(dayValue);
  if (dayValue === null || !Number.isInteger(day) || day < 0 || day > 6) return null;
  return new Intl.DateTimeFormat(getLocale() === 'fr' ? 'fr-CA' : 'en-CA', {
    weekday: 'long',
    timeZone: 'UTC',
  })
    .format(new Date(Date.UTC(2026, 0, 5 + day)))
    .replace(/^./, (letter) => letter.toUpperCase());
}

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
// Canonical Recipes collection controller.
// ---------------------------------------------------------------------------

export default function RecipesExperience() {
  return (
    <React.Suspense fallback={null}>
      <RecipesContent />
    </React.Suspense>
  );
}

function RecipesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const addToDay = searchParams.get('addToDay');
  const weekOffset = searchParams.get('weekOffset');
  const hasPlanningTarget = addToDay !== null || weekOffset !== null;
  const entryContext = {
    gotoOnly: searchParams.get('gotoOnly') === 'true',
    discoverableOnly: searchParams.get('discoverableOnly') === 'true',
    similarTo: searchParams.get('similarTo'),
    focus: searchParams.get('focus') === 'search',
    addToDay,
    weekOffset,
    referenceWeekStartDate: searchParams.get('referenceWeekStartDate'),
  };
  const entryContextKey = JSON.stringify(entryContext);
  const lastEntryContextRef = useRef(entryContext);
  const [planningCalendar, setPlanningCalendar] = useState<CalendarContext | null>(null);
  const [planningCalendarError, setPlanningCalendarError] = useState(false);
  const targetDay = addToDay?.trim() ? Number(addToDay) : NaN;
  const targetWeek = weekOffset?.trim() ? Number(weekOffset) : NaN;
  const suppliedReference = searchParams.get('referenceWeekStartDate');
  const targetReference = suppliedReference ?? planningCalendar?.referenceWeekStartDate;
  const validTarget =
    Number.isInteger(targetDay) &&
    targetDay >= 0 &&
    targetDay <= 6 &&
    Number.isSafeInteger(targetWeek) &&
    (suppliedReference === null || absoluteMonday(suppliedReference) !== null);
  const targetInstant =
    targetReference && absoluteMonday(targetReference)
      ? Date.parse(`${targetReference}T00:00:00Z`) + (targetWeek * 7 + targetDay) * 86400000
      : NaN;
  const targetDate = new Date(targetInstant);
  const urlPlanningDayLabel = hasPlanningTarget
    ? validTarget &&
      Number.isFinite(targetInstant) &&
      targetDate.getUTCFullYear() >= 1 &&
      targetDate.getUTCFullYear() <= 9999
      ? formatSupperPlanDate(targetDate.toISOString().slice(0, 10))
      : (plannerDayName(addToDay) ?? t('recipes.chooseDay', 'Choose a day'))
    : null;
  const [uncertainAssignment, setUncertainAssignment] = useState<{
    key: string;
    slot: PlannerSlot;
    recipe: AssignmentRecipe;
  } | null>(null);

  useEffect(() => {
    if (addToDay === null || weekOffset === null) return;
    let active = true;
    void loadDeploymentCalendar()
      .then((calendar) => {
        if (active) {
          setPlanningCalendar(calendar);
          setPlanningCalendarError(false);
        }
      })
      .catch(() => {
        if (active) setPlanningCalendarError(true);
      });
    return () => {
      active = false;
    };
  }, [addToDay, weekOffset]);
  const { familyMembers, selectedFamilyMemberId, loadFamilyMembers, updateMemberPreferences } =
    useFamilyStore();
  const gotoMembershipVersion = useFamilyStore((state) => state.gotoMembershipVersion);
  const searchPromotionVersion = useSearchPromotionStore((state) => state.version);
  const lastSearchPromotionVersionRef = useRef(searchPromotionVersion);
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
  const [browseRefreshVersion, setBrowseRefreshVersion] = useState(0);
  const appliedGotoVersion = gotoOnly ? gotoMembershipVersion : 0;
  const [isDiscoverableOnly, setIsDiscoverableOnly] = useState(
    () => searchParams.get('discoverableOnly') === 'true'
  );
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
  const openRecipeId = searchParams.get('open');
  const sourceGroceryOffset = searchParams.get('sourceGroceryWeekOffset');
  const sourceGroceryReference = searchParams.get('sourceGroceryReferenceWeekStartDate');
  const parsedSourceGroceryOffset =
    sourceGroceryOffset === null ? NaN : Number(sourceGroceryOffset);
  const sourceGroceryReturn =
    sourceGroceryOffset !== null &&
    /^-?\d+$/.test(sourceGroceryOffset) &&
    Number.isSafeInteger(parsedSourceGroceryOffset) &&
    Math.abs(parsedSourceGroceryOffset) <= 520 &&
    sourceGroceryReference !== null &&
    absoluteMonday(sourceGroceryReference) !== null
      ? `/planner?${new URLSearchParams({ weekOffset: String(parsedSourceGroceryOffset), referenceWeekStartDate: sourceGroceryReference })}`
      : null;
  const grocerySourceEntry = searchParams.has('reviewAmounts')
    ? JSON.stringify([openRecipeId, sourceGroceryOffset, sourceGroceryReference])
    : null;
  const [sourcePlanningEntry, setSourcePlanningEntry] = useState<string | null>(null);
  const [detailRecipeId, setDetailRecipeId] = useState<string | null>(() => openRecipeId);
  const detailReturnFocusRef = useRef<HTMLElement | null>(null);
  const originalSourceReview = Boolean(
    grocerySourceEntry &&
    detailRecipeId === openRecipeId &&
    sourcePlanningEntry !== grocerySourceEntry
  );
  // Route detail context is an external navigation source for the mounted session.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setDetailRecipeId(openRecipeId), [openRecipeId]);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [stackRenderVersion, setStackRenderVersion] = useState(0);
  const [searchControlsExpanded, setSearchControlsExpanded] = useState(
    () =>
      searchParams.get('focus') === 'search' ||
      searchParams.has('similarTo') ||
      searchParams.has('addToDay')
  );
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState('');
  const [similarToRecipeId, setSimilarToRecipeId] = useState<string | null>(() =>
    searchParams.get('similarTo')
  );
  const [searchActive, setSearchActive] = useState(() => Boolean(searchParams.get('similarTo')));
  const [searchData, setSearchData] = useState<RecipeSearchResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [searchLoadMoreError, setSearchLoadMoreError] = useState(false);
  const [searchCursorExpired, setSearchCursorExpired] = useState(false);
  const [searchLoadingMore, setSearchLoadingMore] = useState(false);
  const [searchIndex, setSearchIndex] = useState(0);
  const [activeFilters, setActiveFilters] = useState<RecipeSearchFiltersDto>({});
  const [activePreferences, setActivePreferences] = useState<RecipeSearchPreferencesDto>({});
  const [filterMetadata, setFilterMetadata] = useState<RecipeSearchFilterDiscoveryDto | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const filtersTriggerRef = useRef<HTMLButtonElement>(null);
  const recycleTriggerRef = useRef<HTMLButtonElement>(null);
  const searchGenerationRef = useRef(0);
  const searchContinuationRef = useRef(false);
  const searchRequestRef = useRef<Parameters<typeof searchRecipes>[0] | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialSimilarStartedRef = useRef(false);
  const searchLifecycleRef = useRef(0);

  const previousSearchDisclosureRef = useRef(false);
  useEffect(() => {
    if (!searchControlsExpanded) {
      previousSearchDisclosureRef.current = false;
      return;
    }
    if (detailRecipeId) {
      previousSearchDisclosureRef.current = true;
      return;
    }
    if (previousSearchDisclosureRef.current) return;
    const frame = requestAnimationFrame(() => {
      if (!searchInputRef.current) return;
      searchInputRef.current.focus({ preventScroll: true });
      previousSearchDisclosureRef.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, [searchControlsExpanded, detailRecipeId]);

  const runSearch = useCallback(
    async (
      nextQuery: string,
      nextFilters = activeFilters,
      nextPreferences = activePreferences,
      nextScope = { discoverableOnly: isDiscoverableOnly, gotoOnly },
      nextSimilarTo = similarToRecipeId
    ) => {
      const generation = ++searchGenerationRef.current;
      searchContinuationRef.current = false;
      setSearchLoadingMore(false);
      setSearchLoadMoreError(false);
      setSearchCursorExpired(false);
      setSearchActive(true);
      setSearchLoading(true);
      setSearchError(false);
      setSearchIndex(0);
      try {
        const request = {
          query: nextQuery,
          limit: 12,
          weekOffset: weekOffset !== null ? Number(weekOffset) : undefined,
          dayIndex: addToDay !== null ? Number(addToDay) : undefined,
          filters: { ...nextFilters, ...nextScope },
          preferences: nextPreferences,
          similarToRecipeId: nextSimilarTo ?? undefined,
        };
        searchRequestRef.current = request;
        const response = await searchRecipes(request);
        if (generation === searchGenerationRef.current) setSearchData(response);
      } catch {
        if (generation === searchGenerationRef.current) setSearchError(true);
      } finally {
        if (generation === searchGenerationRef.current) setSearchLoading(false);
      }
    },
    [
      isDiscoverableOnly,
      gotoOnly,
      activeFilters,
      activePreferences,
      similarToRecipeId,
      weekOffset,
      addToDay,
    ]
  );

  useEffect(() => {
    if (lastSearchPromotionVersionRef.current === searchPromotionVersion) return;
    lastSearchPromotionVersionRef.current = searchPromotionVersion;
    const submitted = searchRequestRef.current;
    if (searchActive && submitted) {
      const {
        discoverableOnly: submittedDiscovery,
        gotoOnly: submittedGoto,
        ...filters
      } = submitted.filters ?? {};
      void runSearch(
        submitted.query ?? '',
        filters,
        submitted.preferences ?? {},
        { discoverableOnly: submittedDiscovery === true, gotoOnly: submittedGoto === true },
        submitted.similarToRecipeId ?? null
      );
    } else if (!searchActive) {
      setBrowseRefreshVersion((version) => version + 1);
    }
  }, [searchPromotionVersion, searchActive, runSearch]);

  useEffect(() => {
    const initialSimilar = searchParams.get('similarTo');
    if (initialSimilar && !initialSimilarStartedRef.current) {
      initialSimilarStartedRef.current = true;
      void runSearch(
        '',
        activeFilters,
        activePreferences,
        { discoverableOnly: isDiscoverableOnly, gotoOnly },
        initialSimilar
      );
    }
    // Explicit entry intent is captured once per mounted Recipes session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // URL context changes can arrive without remounting Recipes; synchronize the
  // active collection immediately after navigation.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const previous = lastEntryContextRef.current;
    if (JSON.stringify(previous) === entryContextKey) return;
    lastEntryContextRef.current = entryContext;
    if (entryContext.focus || entryContext.similarTo || entryContext.addToDay !== null)
      setSearchControlsExpanded(true);
    const collectionChanged =
      previous.gotoOnly !== entryContext.gotoOnly ||
      previous.discoverableOnly !== entryContext.discoverableOnly ||
      previous.similarTo !== entryContext.similarTo ||
      previous.addToDay !== entryContext.addToDay ||
      previous.weekOffset !== entryContext.weekOffset ||
      previous.referenceWeekStartDate !== entryContext.referenceWeekStartDate;
    if (!collectionChanged) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = null;
    setStackRenderVersion((version) => version + 1);
    setGotoOnly(entryContext.gotoOnly);
    setIsDiscoverableOnly(entryContext.discoverableOnly);
    setSimilarToRecipeId(entryContext.similarTo);
    const nextQuery =
      entryContext.similarTo && entryContext.similarTo !== previous.similarTo ? '' : query;
    if (nextQuery !== query) setQuery(nextQuery);
    if (hasSearchIntent(nextQuery, activeFilters, activePreferences, entryContext.similarTo)) {
      void runSearch(
        nextQuery,
        activeFilters,
        activePreferences,
        { gotoOnly: entryContext.gotoOnly, discoverableOnly: entryContext.discoverableOnly },
        entryContext.similarTo
      );
    } else {
      searchGenerationRef.current += 1;
      searchContinuationRef.current = false;
      searchRequestRef.current = null;
      setSearchActive(false);
      setSearchData(null);
      setSearchIndex(0);
      setSearchError(false);
      setSearchLoading(false);
      setSearchLoadingMore(false);
      setBrowseRefreshVersion((version) => version + 1);
    }
    // This effect is gated by the URL context key; local toolbar edits do not re-enter it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryContextKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const applyFilters = useCallback(
    ({ filters, preferences }: RecipeFilterDraft) => {
      const nextGoto = filters.gotoOnly === true;
      const nextDiscovery = filters.discoverableOnly === true;
      const { gotoOnly: _goto, discoverableOnly: _discovery, ...searchFilters } = filters;
      setGotoOnly(nextGoto);
      setIsDiscoverableOnly(nextDiscovery);
      setActiveFilters(searchFilters);
      setActivePreferences(preferences);
      setIsFiltersOpen(false);
      filtersTriggerRef.current?.focus({ preventScroll: true });
      const hasIntent = hasSearchIntent(query, searchFilters, preferences, similarToRecipeId);
      if (!hasIntent) {
        searchGenerationRef.current += 1;
        setSearchActive(false);
        setSearchData(null);
        setSearchIndex(0);
        setBrowseRefreshVersion((version) => version + 1);
        return;
      }
      void runSearch(query, searchFilters, preferences, {
        discoverableOnly: nextDiscovery,
        gotoOnly: nextGoto,
      });
    },
    [query, runSearch, similarToRecipeId]
  );

  const clearSearch = useCallback(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = null;
    searchGenerationRef.current += 1;
    searchRequestRef.current = null;
    searchContinuationRef.current = false;
    setQuery('');
    setSimilarToRecipeId(null);
    setActiveFilters({});
    setActivePreferences({});
    setSearchData(null);
    setSearchIndex(0);
    setSearchError(false);
    setSearchLoadMoreError(false);
    setSearchCursorExpired(false);
    setSearchLoading(false);
    setSearchLoadingMore(false);
    setSearchActive(false);
    requestAnimationFrame(() => searchInputRef.current?.focus({ preventScroll: true }));
  }, []);

  const clearSearchFilters = useCallback(() => {
    setGotoOnly(false);
    setIsDiscoverableOnly(false);
    setActiveFilters({});
    setActivePreferences({});
    if (hasSearchIntent(query, {}, {}, similarToRecipeId)) {
      void runSearch(query, {}, {}, { discoverableOnly: false, gotoOnly: false });
    } else {
      clearSearch();
    }
  }, [query, similarToRecipeId, runSearch, clearSearch]);

  const loadMoreSearch = useCallback(
    async (retry = false) => {
      const cursor = searchData?.nextCursor;
      const request = searchRequestRef.current;
      if (
        !searchActive ||
        searchLoading ||
        !cursor ||
        !request ||
        searchContinuationRef.current ||
        (!retry && (searchLoadMoreError || searchCursorExpired))
      )
        return;
      const generation = searchGenerationRef.current;
      searchContinuationRef.current = true;
      setSearchLoadingMore(true);
      setSearchLoadMoreError(false);
      setSearchCursorExpired(false);
      try {
        const response = await searchRecipes({
          ...request,
          continuationToken: cursor,
          limit: searchData?.resultPath === 'browse' ? 24 : 12,
        });
        if (generation !== searchGenerationRef.current) return;
        const before = new Set([
          searchData?.topPick?.id,
          ...(searchData?.results ?? []).map((item) => item.id),
        ]);
        before.delete(undefined);
        const hasFollowingMatch = response.results.some((item) => item.id && !before.has(item.id));
        if (hasFollowingMatch && browseViewMode === 'stack') setSearchIndex(before.size);
        setSearchData((current) => {
          if (!current) return current;
          const known = new Set([current.topPick?.id, ...current.results.map((item) => item.id)]);
          const additions = response.results.filter(
            (item) => item.id && !known.has(item.id) && Boolean(known.add(item.id))
          );
          return {
            ...response,
            topPick: current.topPick,
            results: [...current.results, ...additions],
          };
        });
      } catch (error) {
        if (generation !== searchGenerationRef.current) return;
        const status =
          (error as { status?: number; responseStatusCode?: number })?.responseStatusCode ??
          (error as { status?: number })?.status;
        setSearchCursorExpired(status === 409);
        setSearchLoadMoreError(status !== 409);
      } finally {
        if (generation === searchGenerationRef.current) {
          searchContinuationRef.current = false;
          setSearchLoadingMore(false);
        }
      }
    },
    [
      searchActive,
      searchLoading,
      searchData,
      browseViewMode,
      searchLoadMoreError,
      searchCursorExpired,
    ]
  );

  useEffect(() => {
    const lifecycle = ++searchLifecycleRef.current;
    return () =>
      queueMicrotask(() => {
        if (searchLifecycleRef.current !== lifecycle) return;
        searchGenerationRef.current += 1;
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      });
  }, []);
  const [pendingRecovery, setPendingRecovery] = useState<{
    slot: PlannerSlot;
    recipe: AssignmentRecipe;
  } | null>(null);

  // Ref to track whether a prefetch is already in flight (avoid duplicate requests)
  const prefetchInFlightRef = useRef(false);
  const listScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const recipesViewportRef = useRef<HTMLDivElement | null>(null);
  const listScrollRestoreRef = useRef<number | null>(null);
  const listSentinelRef = useRef<HTMLDivElement | null>(null);
  const generationRef = useRef(0);
  const historyGenerationRef = useRef<string | undefined>(undefined);
  const [historyRestartRequired, setHistoryRestartRequired] = useState(false);
  const stackPagesRef = useRef(new Map<number, RecipeDto[]>());
  const pageRequestsRef = useRef(new Map<number, Promise<RecipeDto[]>>());
  const navigationPendingRef = useRef(false);
  const [stackPage, setStackPage] = useState(1);
  const [failedNavigation, setFailedNavigation] = useState<{ page: number; last: boolean } | null>(
    null
  );

  // The dock height changes with safe areas and enlarged text. Keep this
  // measurement separate from collection state so resize never resets results.
  useEffect(() => {
    const root = recipesViewportRef.current;
    const dock = document.querySelector<HTMLElement>('[data-testid="app-bottom-navigation"]');
    if (!root || !dock) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const visibleBottom = window.visualViewport
          ? window.visualViewport.offsetTop + window.visualViewport.height
          : window.innerHeight;
        const bottom = Math.min(dock.getBoundingClientRect().top, visibleBottom);
        root.style.height = `${Math.max(0, bottom - root.getBoundingClientRect().top)}px`;
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(dock);
    observer.observe(root);
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('scroll', measure);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('scroll', measure);
    };
  }, []);

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
    if (searchActive) return;
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
  }, [
    isDiscoverableOnly,
    browseViewMode,
    fetchLibraryData,
    appliedGotoVersion,
    browseRefreshVersion,
    searchActive,
  ]);

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
    if (searchActive) {
      void loadMoreSearch();
      return;
    }
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
    searchActive,
    loadMoreSearch,
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
    if (searchActive) {
      const known = new Set([
        searchData?.topPick?.id,
        ...(searchData?.results ?? []).map((item) => item.id),
      ]);
      const count = known.size - (known.has(undefined) ? 1 : 0);
      if (searchIndex < count - 1) setSearchIndex(searchIndex + 1);
      else if (searchData?.nextCursor) void loadMoreSearch();
      return;
    }
    if (navigationPendingRef.current) return;
    if (currentIndex < recipes.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      void navigatePage(
        stackPage < Math.ceil(totalCount / STACK_PAGE_SIZE) ? stackPage + 1 : 1,
        false
      );
    }
  }, [
    currentIndex,
    recipes.length,
    stackPage,
    totalCount,
    navigatePage,
    setCurrentIndex,
    searchActive,
    searchData,
    searchIndex,
    loadMoreSearch,
  ]);

  const handleSwipeRight = useCallback(() => {
    if (searchActive) {
      if (searchIndex > 0) setSearchIndex(searchIndex - 1);
      return;
    }
    if (navigationPendingRef.current) return;
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
    else
      void navigatePage(
        stackPage > 1 ? stackPage - 1 : Math.max(1, Math.ceil(totalCount / STACK_PAGE_SIZE)),
        true
      );
  }, [
    currentIndex,
    stackPage,
    totalCount,
    navigatePage,
    setCurrentIndex,
    searchActive,
    searchIndex,
  ]);

  // ---------------------------------------------------------------------------
  // Recipe Detail Sheet handlers
  // ---------------------------------------------------------------------------
  const handleCardTap = useCallback((recipeId: string) => {
    setDetailRecipeId(recipeId);
  }, []);

  const toAssignmentRecipe = (recipe: Recipe): AssignmentRecipe => ({
    id: recipe.id,
    name: recipe.name ?? null,
    image: recipe.imageUrl ?? '',
  });

  const [chosenDetailTarget, setChosenDetailTarget] = useState<{
    entry: string;
    slot: PlannerSlot;
  } | null>(null);
  const [targetRead, setTargetRead] = useState<{
    key: string;
    slot?: PlannerSlot;
    error?: string;
    checking?: boolean;
    anchor?: CalendarAnchor;
  } | null>(null);
  // Retain the last automatic read's freshness evidence; a repeated cached
  // capture cannot renew its day boundary or move authoritative today backwards.
  const automaticCalendarRead = useRef<Pick<
    Awaited<ReturnType<typeof loadCalendarSnapshot>>,
    'calendar' | 'anchor'
  > | null>(null);
  const readAutomaticCalendar = useCallback(async () => {
    const snapshot = await loadCalendarSnapshot();
    const previous = automaticCalendarRead.current;
    if (previous?.calendar.timeZone === snapshot.calendar.timeZone) {
      if (
        snapshot.calendar.today < previous.calendar.today ||
        (!calendarAnchorIsFresh(previous.anchor) &&
          snapshot.calendar.today === previous.calendar.today)
      )
        throw new CalendarUnavailableError();
      if (
        Date.parse(snapshot.calendar.capturedAtUtc) <= Date.parse(previous.calendar.capturedAtUtc)
      )
        snapshot.anchor = previous.anchor;
    }
    if (!calendarAnchorIsFresh(snapshot.anchor)) throw new CalendarUnavailableError();
    automaticCalendarRead.current = { calendar: snapshot.calendar, anchor: snapshot.anchor };
    return snapshot;
  }, []);
  const [targetReadAttempt, setTargetReadAttempt] = useState(0);
  const targetReadGeneration = useRef(0);
  const [showDayChooser, setShowDayChooser] = useState<string | null>(null);
  const [nonCookingConfirmation, setNonCookingConfirmation] = useState<{
    key: string;
    slot: PlannerSlot;
    recipe: AssignmentRecipe;
  } | null>(null);
  const handleDetailSheetClose = useCallback(() => {
    setDetailRecipeId(null);
    setSourcePlanningEntry(null);
    setShowDayChooser(null);
    setNonCookingConfirmation(null);
    if (grocerySourceEntry && detailRecipeId === openRecipeId && sourceGroceryReturn) {
      usePlannerStore.getState().setActiveTab('grocery');
      router.replace(sourceGroceryReturn);
      return;
    }
    requestAnimationFrame(() => {
      const target = detailReturnFocusRef.current;
      if (target?.isConnected) target.focus();
      detailReturnFocusRef.current = null;
    });
  }, [detailRecipeId, grocerySourceEntry, openRecipeId, router, sourceGroceryReturn]);

  const chosenTarget =
    chosenDetailTarget?.entry === entryContextKey ? chosenDetailTarget.slot : null;
  const detailTargetKey = JSON.stringify([
    detailRecipeId,
    entryContextKey,
    chosenTarget,
    grocerySourceEntry,
    sourcePlanningEntry,
  ]);
  const detailContextRef = useRef<string | null>(detailTargetKey);
  useLayoutEffect(() => {
    detailContextRef.current = detailTargetKey;
    return () => {
      detailContextRef.current = null;
    };
  }, [detailTargetKey]);
  const assignmentNeedsCheck = uncertainAssignment?.key === detailTargetKey;
  const automaticTarget = !chosenTarget && !hasPlanningTarget;
  const visibleTarget = targetRead?.key === detailTargetKey ? targetRead.slot : undefined;
  const targetReadError = targetRead?.key === detailTargetKey ? targetRead.error : undefined;
  const targetChecking = targetRead?.key === detailTargetKey && Boolean(targetRead.checking);
  const planningDayLabel = visibleTarget
    ? formatSupperPlanDate(visibleTarget.date)
    : urlPlanningDayLabel;
  const targetReview =
    !targetChecking && (visibleTarget?.status === 2 || visibleTarget?.status === 4);
  const identicalTarget = !!visibleTarget?.recipe?.id && visibleTarget.recipe.id === detailRecipeId;
  const confirmedPlannedTarget =
    identicalTarget &&
    !targetChecking &&
    !targetReadError &&
    !assignmentNeedsCheck &&
    !targetReview &&
    (visibleTarget?.status === 0 || visibleTarget?.status === 1);
  const targetReferenceForChooser =
    chosenTarget?.referenceWeekStartDate ??
    suppliedReference ??
    planningCalendar?.referenceWeekStartDate;
  const visibleTargetDate = visibleTarget?.date;
  const refreshDetailTarget = useCallback(() => {
    targetReadGeneration.current += 1;
    setTargetRead((current) =>
      current?.key === detailTargetKey
        ? { ...current, checking: true, error: undefined, anchor: undefined }
        : current
    );
    setTargetReadAttempt((attempt) => attempt + 1);
  }, [detailTargetKey]);
  useEffect(() => {
    if (!detailRecipeId || originalSourceReview || assignmentNeedsCheck) return;
    return subscribeIngredientProjectionInvalidation(
      !automaticTarget && visibleTargetDate
        ? { context: 'proposed', supperDate: visibleTargetDate }
        : undefined,
      refreshDetailTarget
    );
  }, [
    detailRecipeId,
    originalSourceReview,
    assignmentNeedsCheck,
    automaticTarget,
    visibleTargetDate,
    refreshDetailTarget,
  ]);
  const automaticAnchor =
    automaticTarget && targetRead?.key === detailTargetKey ? targetRead.anchor : undefined;
  useEffect(() => {
    if (!automaticAnchor || assignmentNeedsCheck) return;
    const remaining =
      automaticAnchor.expiresAfterMs - (calendarTime.elapsed() - automaticAnchor.receivedAtElapsed);
    const timer = window.setTimeout(refreshDetailTarget, Math.max(0, Math.ceil(remaining)));
    return () => window.clearTimeout(timer);
  }, [automaticAnchor, assignmentNeedsCheck, refreshDetailTarget]);
  useEffect(() => {
    if (!detailRecipeId || originalSourceReview) return;
    let active = true;
    const generation = ++targetReadGeneration.current;
    const key = detailTargetKey;
    const current = () =>
      active && targetReadGeneration.current === generation && detailContextRef.current === key;
    void (async () => {
      // A scan may span midnight. Restart once with a new authoritative snapshot,
      // then fail closed rather than publishing an expired or endlessly retried date.
      for (let attempt = 0; attempt < 2; attempt++) {
        const snapshot = await (automaticTarget ? readAutomaticCalendar() : loadCalendarSnapshot());
        if (!current()) return;
        const { calendar, anchor } = snapshot;
        setPlanningCalendar(calendar);
        if (hasPlanningTarget && !validTarget && !chosenTarget)
          throw new Error(
            t(
              'recipes.invalidPlanningDay',
              'Invalid planning day. Choose a day in Planner and try again.'
            )
          );
        let slot: PlannerSlot | null;
        if (chosenTarget)
          slot = await getPlannerSlot(
            chosenTarget.weekOffset,
            chosenTarget.dayIndex,
            chosenTarget.referenceWeekStartDate
          );
        else if (hasPlanningTarget)
          slot = await getPlannerSlot(
            targetWeek,
            targetDay,
            suppliedReference ?? calendar.referenceWeekStartDate
          );
        else {
          const candidate = await findFirstOpenPlannerSlot(
            0,
            0,
            520,
            calendar.referenceWeekStartDate
          );
          if (!candidate)
            throw new Error(
              t('recipes.noOpenDay', 'No open supper found. Choose a day to review your plan.')
            );
          slot = await getPlannerSlot(
            candidate.weekOffset,
            candidate.dayIndex,
            candidate.referenceWeekStartDate
          );
        }
        if (!current()) return;
        if (!slot)
          throw new Error(
            t('recipes.checkPlanFailed', 'Could not confirm this meal. Retry check before saving.')
          );
        if (automaticTarget && (!calendarAnchorIsFresh(anchor) || slot.date < calendar.today))
          continue;
        setTargetRead({ key, slot, ...(automaticTarget ? { anchor } : {}) });
        return;
      }
      throw new Error(
        t('recipes.checkPlanFailed', 'Could not confirm this meal. Retry check before saving.')
      );
    })().catch((error) => {
      if (current())
        setTargetRead((previous) => ({
          key,
          slot: previous?.key === key ? previous.slot : undefined,
          error:
            error instanceof Error
              ? error.message
              : t(
                  'recipes.weekReadFailed',
                  'Could not read this week. Retry before choosing a day.'
                ),
        }));
    });
    return () => {
      active = false;
    };
  }, [
    detailRecipeId,
    originalSourceReview,
    detailTargetKey,
    chosenTarget,
    hasPlanningTarget,
    validTarget,
    targetWeek,
    targetDay,
    suppliedReference,
    targetReadAttempt,
    automaticTarget,
    readAutomaticCalendar,
  ]);

  const reviewDetailTarget = (slot: PlannerSlot) =>
    router.push(
      `/planner?dayIndex=${slot.dayIndex}&weekOffset=${slot.weekOffset}&referenceWeekStartDate=${slot.referenceWeekStartDate}`
    );
  const handleSelectForPlanner = async (recipe: Recipe) => {
    const key = detailTargetKey;
    const active = () => detailContextRef.current === key;
    if (targetChecking)
      throw new Error(
        t('recipes.checkPlanFailed', 'Could not confirm this meal. Retry check before saving.')
      );
    if (targetReadError) throw new Error(targetReadError);
    if (!visibleTarget)
      throw new Error(
        t('recipes.checkPlanFailed', 'Could not confirm this meal. Retry check before saving.')
      );
    const previous = uncertainAssignment?.key === key ? uncertainAssignment : null;
    if (previous) {
      const checked = await getPlannerSlot(
        previous.slot.weekOffset,
        previous.slot.dayIndex,
        previous.slot.referenceWeekStartDate
      );
      if (!active()) return;
      if (!checked)
        throw new Error(
          t('recipes.checkPlanFailed', 'Could not confirm this meal. Retry check before saving.')
        );
      if (checked.recipe?.id === previous.recipe.id) {
        rememberPlanningResult({
          ...checked,
          referenceWeekStartDate: checked.referenceWeekStartDate!,
          recipeId: previous.recipe.id,
          recipeName: previous.recipe.name ?? '',
        });
        setUncertainAssignment(null);
        router.push(
          `/planner?success=1&dayIndex=${checked.dayIndex}&weekOffset=${checked.weekOffset}&referenceWeekStartDate=${checked.referenceWeekStartDate}`
        );
        return;
      }
      setUncertainAssignment(null);
      if (
        automaticTarget &&
        !checked.recipe &&
        checked.status === 0 &&
        !checked.nonCooking &&
        !checked.removalToken
      )
        refreshDetailTarget();
      else setTargetRead({ key, slot: checked });
      throw new Error(
        checked.recipe || checked.status !== 0
          ? t('recipes.planChanged', 'Your plan changed. Review the selected day in Planner.')
          : t('recipes.notSaved', 'This meal was not saved. Try saving again.')
      );
    }
    if (targetReview || identicalTarget) {
      reviewDetailTarget(visibleTarget);
      return;
    }
    const captured = visibleTarget;
    const generation = targetReadGeneration.current;
    let fresh: Awaited<ReturnType<typeof loadCalendarSnapshot>> | undefined;
    if (automaticTarget) {
      try {
        fresh = await readAutomaticCalendar();
      } catch (error) {
        if (active() && targetReadGeneration.current === generation)
          setTargetRead({
            key,
            slot: captured,
            error: error instanceof Error ? error.message : new CalendarUnavailableError().message,
          });
        return;
      }
      if (!active() || targetReadGeneration.current !== generation) return;
      if (!calendarAnchorIsFresh(fresh.anchor) || captured.date < fresh.calendar.today) {
        refreshDetailTarget();
        return;
      }
    }
    let slot: PlannerSlot | null;
    try {
      slot = await getPlannerSlot(
        captured.weekOffset,
        captured.dayIndex,
        captured.referenceWeekStartDate
      );
    } catch (error) {
      if (active() && targetReadGeneration.current === generation)
        setTargetRead({
          key,
          slot: captured,
          error: error instanceof Error ? error.message : new CalendarUnavailableError().message,
        });
      return;
    }
    if (!active() || targetReadGeneration.current !== generation) return;
    if (fresh && !calendarAnchorIsFresh(fresh.anchor)) {
      refreshDetailTarget();
      return;
    }
    if (!slot || slot.referenceWeekStartDate !== captured.referenceWeekStartDate) {
      setTargetRead({
        key,
        slot: captured,
        error: t(
          'recipes.checkPlanFailed',
          'Could not confirm this meal. Retry check before saving.'
        ),
      });
      return;
    }
    if (slot.status === 2 || slot.status === 4 || slot.recipe?.id === recipe.id) {
      setTargetRead({ key, slot });
      return;
    }
    const assignmentRecipe = toAssignmentRecipe(recipe);
    if (slot.nonCooking) {
      setNonCookingConfirmation({ key, slot, recipe: assignmentRecipe });
      return;
    }
    if (slot.status !== 0 && slot.status !== 1 && slot.status !== undefined)
      throw new Error(
        t('recipes.planChanged', 'Your plan changed. Review the selected day in Planner.')
      );
    if (slot.recipe) {
      setDetailRecipeId(null);
      setPendingRecovery({ slot, recipe: assignmentRecipe });
      return;
    }
    if (slot.removalToken)
      throw new Error(
        t('recipes.planChanged', 'Your plan changed. Review the selected day in Planner.')
      );
    try {
      await assignRecipeToEmptySlot(
        slot.weekOffset,
        slot.dayIndex,
        assignmentRecipe,
        slot.referenceWeekStartDate
      );
    } catch (error) {
      if (!active()) return;
      const status = (error as { responseStatusCode?: number })?.responseStatusCode;
      if (![400, 401, 403, 409].includes(status ?? 0)) {
        // Freeze this captured destination until its uncertain write is checked.
        targetReadGeneration.current += 1;
        setTargetRead({ key, slot });
        setUncertainAssignment({ key, slot, recipe: assignmentRecipe });
        throw new Error(
          t(
            'recipes.checkPlanRequired',
            'The save could not be confirmed. Activate again to check the selected day before another save.'
          )
        );
      }
      throw new Error(
        t('recipes.planChanged', 'Your plan changed. Review the selected day in Planner.')
      );
    }
    if (!active()) return;
    rememberPlanningResult({
      ...slot,
      referenceWeekStartDate: slot.referenceWeekStartDate!,
      recipeId: recipe.id,
      recipeName: recipe.name ?? '',
    });
    router.push(
      `/planner?success=1&dayIndex=${slot.dayIndex}&weekOffset=${slot.weekOffset}&referenceWeekStartDate=${slot.referenceWeekStartDate}`
    );
  };

  const recovery = useReplacementRecovery({
    slot: pendingRecovery?.slot,
    recipe: pendingRecovery?.recipe,
    onClosed: (saved) => {
      if (!saved && pendingRecovery) setDetailRecipeId(pendingRecovery.recipe.id);
      setPendingRecovery(null);
    },
    onSaved: async () => {
      if (!pendingRecovery) return;
      const { slot } = pendingRecovery;
      router.push(
        `/planner?success=1&dayIndex=${slot.dayIndex}&weekOffset=${slot.weekOffset}&referenceWeekStartDate=${slot.referenceWeekStartDate}`
      );
    },
    onReview: () => {
      if (!pendingRecovery) return;
      const { slot } = pendingRecovery;
      router.push(
        `/planner?dayIndex=${slot.dayIndex}&weekOffset=${slot.weekOffset}&referenceWeekStartDate=${slot.referenceWeekStartDate}`
      );
    },
  });

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
    // Retire a swipe animation started against the previous collection.
    setStackRenderVersion((version) => version + 1);
    const next = !isDiscoverableOnly;
    setIsDiscoverableOnly(next);
    if (searchActive)
      void runSearch(query, activeFilters, activePreferences, { discoverableOnly: next, gotoOnly });
  }, [
    isDiscoverableOnly,
    searchActive,
    runSearch,
    query,
    activeFilters,
    activePreferences,
    gotoOnly,
  ]);

  const handleViewModeChange = useCallback(
    (nextMode: BrowseViewMode) => {
      if (nextMode === browseViewMode) return;
      setBrowseViewModeOverride({ memberId: selectedFamilyMemberId, mode: nextMode });
      setIsEndCard(false);
      setCurrentIndex(0);
      setSearchIndex(0);
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
  // Entry actions
  // ---------------------------------------------------------------------------
  const handleAddRecipe = useCallback(() => {
    router.push('/capture');
  }, [router]);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------
  const visibleRecipes = useMemo(() => {
    if (searchActive) {
      const known = new Set<string>();
      return [searchData?.topPick, ...(searchData?.results ?? [])]
        .filter((result): result is NonNullable<typeof result> => Boolean(result?.id))
        .filter((result) => !known.has(result.id) && Boolean(known.add(result.id)))
        .map(
          (result) =>
            ({
              id: result.id,
              name: result.name,
              description: result.description,
              imageUrl: result.imageUrl,
              totalTime: result.totalTime,
              rating: result.rating,
              notes: result.notes,
              isDiscoverable: result.isDiscoverable,
              importIssue: result.importIssueStatus ? { status: result.importIssueStatus } : null,
            }) as RecipeDto
        );
    }
    return recipes;
  }, [searchActive, searchData, recipes]);

  const currentRecipe = visibleRecipes[searchActive ? searchIndex : currentIndex] ?? null;
  const globalIndex = searchActive ? searchIndex : (stackPage - 1) * STACK_PAGE_SIZE + currentIndex;
  const displayTotal = searchActive ? visibleRecipes.length : totalCount;
  const stackVisibleRecipes = visibleRecipes.slice(
    searchActive ? searchIndex : currentIndex,
    (searchActive ? searchIndex : currentIndex) + 4
  );

  const isEmpty =
    !searchActive &&
    !isInitialLoading &&
    !loadError &&
    recipes.length === 0 &&
    !isDiscoverableOnly &&
    !gotoOnly;

  const appliedCount = appliedSelectionCount(
    activeFilters,
    activePreferences,
    isDiscoverableOnly,
    gotoOnly
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div
      ref={recipesViewportRef}
      data-testid="browse-all-stack-container"
      className="relative flex h-[calc(100dvh-7.25rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] min-h-0 flex-col bg-cream overflow-x-hidden overflow-y-auto"
    >
      <BackgroundBlobs />

      {addToDay !== null && weekOffset !== null && (
        <div
          data-testid="planning-mode-banner"
          className="relative z-10 mx-4 sm:mx-6 flex min-h-12 flex-wrap items-center gap-x-2 rounded-xl border border-terracotta/20 bg-terracotta/10 px-3"
        >
          <p className="min-w-0 flex-1 text-sm font-bold text-charcoal">
            {urlPlanningDayLabel
              ? tWithVars('recipes.choosingForDay', 'Choosing for {{day}}', {
                  day: urlPlanningDayLabel,
                })
              : tWithVars('recipes.choosingForDayNum', 'Choosing for Day {{day}}', {
                  day: Number(addToDay) + 1,
                })}
          </p>
          {planningCalendarError && (
            <button
              type="button"
              onClick={() =>
                void loadDeploymentCalendar()
                  .then((calendar) => {
                    setPlanningCalendar(calendar);
                    setPlanningCalendarError(false);
                  })
                  .catch(() => {})
              }
              className="min-h-12 px-2 font-bold text-terracotta-700"
            >
              {t('common.retry', 'Retry')}
            </button>
          )}
          <button
            type="button"
            data-testid="planning-mode-cancel"
            onClick={() => router.push('/planner')}
            className="min-h-12 px-2 font-bold text-terracotta-700"
          >
            {t('recipes.cancel', 'Cancel')}
          </button>
        </div>
      )}

      {/* Toolbar order follows reading and keyboard order. */}
      <div className="relative z-10 flex flex-wrap items-center justify-end px-2 sm:px-6 pt-2 pb-1 shrink-0 gap-1">
        <button
          ref={searchTriggerRef}
          type="button"
          aria-label={
            searchActive && !searchControlsExpanded
              ? t('recipes.searchActiveShowControls', 'Search active; show controls')
              : t('recipes.search', 'Search')
          }
          aria-expanded={searchControlsExpanded}
          aria-controls="recipes-search-controls"
          data-testid="recipes-search-disclosure"
          onClick={() => {
            setStackRenderVersion((version) => version + 1);
            if (searchControlsExpanded && listScrollContainerRef.current) {
              listScrollRestoreRef.current = listScrollContainerRef.current.scrollTop;
            }
            setSearchControlsExpanded((expanded) => !expanded);
            if (searchControlsExpanded) searchTriggerRef.current?.focus({ preventScroll: true });
            requestAnimationFrame(() => {
              if (listScrollContainerRef.current && listScrollRestoreRef.current !== null) {
                listScrollContainerRef.current.scrollTop = listScrollRestoreRef.current;
              }
              if (!searchControlsExpanded) searchInputRef.current?.focus({ preventScroll: true });
            });
          }}
          className="relative mr-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-charcoal/8 bg-white/80 text-charcoal/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal"
        >
          <Search size={20} aria-hidden="true" />
          {searchActive && !searchControlsExpanded && (
            <span
              data-testid="recipes-search-active-marker"
              aria-hidden="true"
              className="absolute ml-7 -mt-7 h-2.5 w-2.5 rounded-full bg-terracotta"
            />
          )}
        </button>
        <button
          onClick={handleGlobalToggleDiscoverable}
          data-testid="stack-toggle-discoverable"
          aria-pressed={isDiscoverableOnly}
          className={`flex h-12 min-w-12 shrink-0 items-center gap-1 rounded-full px-2 transition-all duration-300 border ${
            isDiscoverableOnly
              ? 'bg-ochre/15 text-ochre-800 border-ochre/25 shadow-sm shadow-ochre/10'
              : 'bg-white/80 text-charcoal/70 border-charcoal/8 hover:bg-white active:scale-95'
          } backdrop-blur-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal`}
          aria-label={
            isDiscoverableOnly
              ? t('recipes.showingDiscovery', 'Showing recipes marked Discovery')
              : t('recipes.showingAll', 'Showing all recipes')
          }
        >
          <Compass className={`h-4 w-4 ${isDiscoverableOnly ? 'text-ochre fill-ochre/20' : ''}`} />
          <span className="hidden min-[390px]:inline text-xs font-black tracking-wide uppercase">
            {isDiscoverableOnly
              ? t('recipes.scopeDiscovery', 'Discovery')
              : t('recipes.scopeAll', 'All')}
          </span>
        </button>

        <button
          type="button"
          data-testid="browse-filter-goto"
          aria-label={t('recipes.gotoOnly', 'Go-To recipes only')}
          aria-pressed={gotoOnly}
          onClick={() => {
            setStackRenderVersion((version) => version + 1);
            const next = !gotoOnly;
            setGotoOnly(next);
            if (searchActive)
              void runSearch(query, activeFilters, activePreferences, {
                discoverableOnly: isDiscoverableOnly,
                gotoOnly: next,
              });
          }}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal active:scale-95 motion-reduce:transform-none ${gotoOnly ? 'bg-ochre/15 text-ochre-800 border-ochre/25' : 'bg-white/80 text-charcoal-700 border-charcoal/8'}`}
        >
          <Star size={20} fill={gotoOnly ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>

        <div className="flex h-[50px] shrink-0 rounded-full bg-white/80 border border-charcoal/8 p-0 shadow-sm backdrop-blur-sm">
          <button
            type="button"
            data-testid="browse-view-stack"
            aria-label={t('recipes.showCards', 'Show recipe cards')}
            aria-pressed={browseViewMode === 'stack'}
            onClick={() => handleViewModeChange('stack')}
            className={`flex h-12 items-center justify-center min-w-12 gap-1 rounded-full px-1 text-xs font-black uppercase transition-all ${
              browseViewMode === 'stack' ? 'bg-sage/20 text-sage-900' : 'text-charcoal/55'
            }`}
          >
            <Layers3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            data-testid="browse-view-list"
            aria-label={t('recipes.showList', 'Show recipe list')}
            aria-pressed={browseViewMode === 'list'}
            onClick={() => handleViewModeChange('list')}
            className={`flex h-12 items-center justify-center min-w-12 gap-1 rounded-full px-1 text-xs font-black uppercase transition-all ${
              browseViewMode === 'list' ? 'bg-sage/20 text-sage-900' : 'text-charcoal/55'
            }`}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
        </div>

        <button
          ref={recycleTriggerRef}
          type="button"
          data-testid="recycle-bin-entry"
          aria-label={t('recipes.recycleBin', 'Recycle Bin')}
          onClick={() => setIsTrashOpen(true)}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/80 text-charcoal/70 shadow-sm border border-charcoal/8 backdrop-blur-sm hover:bg-white active:scale-95 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal"
        >
          <Recycle size={20} />
        </button>
      </div>

      {searchControlsExpanded && (
        <div id="recipes-search-controls" className="relative z-10 px-4 pb-2">
          <div className="relative">
            <Search
              aria-hidden="true"
              size={20}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/55"
            />
            <input
              ref={searchInputRef}
              data-testid="recipe-search-input"
              aria-label={t('recipes.search', 'Search')}
              placeholder={t('recipes.searchPlaceholder', 'Something spicy for 4...')}
              value={query}
              onChange={(event) => {
                const value = event.target.value;
                setQuery(value);
                if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                if (value.trim()) setSimilarToRecipeId(null);
                if (
                  hasSearchIntent(
                    value,
                    activeFilters,
                    activePreferences,
                    value.trim() ? null : similarToRecipeId
                  )
                ) {
                  searchDebounceRef.current = setTimeout(
                    () =>
                      void runSearch(
                        value,
                        activeFilters,
                        activePreferences,
                        { discoverableOnly: isDiscoverableOnly, gotoOnly },
                        value.trim() ? null : similarToRecipeId
                      ),
                    500
                  );
                } else if (searchActive && !similarToRecipeId) {
                  searchGenerationRef.current += 1;
                  searchRequestRef.current = null;
                  setSearchData(null);
                  setSearchIndex(0);
                  setSearchActive(false);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setSearchControlsExpanded(false);
                  searchTriggerRef.current?.focus({ preventScroll: true });
                  return;
                }
                if (event.key !== 'Enter') return;
                if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                if (hasSearchIntent(query, activeFilters, activePreferences, similarToRecipeId))
                  void runSearch(
                    query,
                    activeFilters,
                    activePreferences,
                    { discoverableOnly: isDiscoverableOnly, gotoOnly },
                    query.trim() ? null : similarToRecipeId
                  );
                event.currentTarget.blur();
              }}
              className="min-h-12 w-full rounded-full border border-charcoal/15 bg-white/85 pl-12 pr-4 text-charcoal shadow-sm placeholder:text-charcoal/55 focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/40"
            />
          </div>
          <button
            ref={filtersTriggerRef}
            type="button"
            data-testid="mobile-filters-button"
            onClick={() => {
              setIsFiltersOpen(true);
              if (!filterMetadata)
                void apiClient.api.recipes.search.filters
                  .get()
                  .then((metadata) => setFilterMetadata(metadata ?? null))
                  .catch(() => {});
            }}
            aria-label={
              appliedCount > 0
                ? tWithVars('recipes.filtersActiveCount', 'Filters, {{count}} active', {
                    count: appliedCount,
                  })
                : t('recipes.filters', 'Filters')
            }
            className="mt-2 inline-flex min-h-12 items-center gap-2 rounded-full border border-charcoal/15 bg-white/85 px-4 font-bold text-charcoal shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
          >
            {t('recipes.filters', 'Filters')}
            {appliedCount > 0 && (
              <span
                aria-hidden="true"
                className="rounded-full bg-terracotta/15 px-2 py-0.5 text-xs font-black text-terracotta-700"
              >
                {appliedCount}
              </span>
            )}
          </button>
          {searchActive && (
            <button
              type="button"
              data-testid="recipes-clear-search"
              onClick={clearSearch}
              className="ml-2 min-h-12 rounded-full border border-charcoal/20 bg-white px-4 font-bold"
            >
              {t('recipes.clearSearchAndBrowse', 'Clear search and browse')}
            </button>
          )}
          {similarToRecipeId && (
            <button
              type="button"
              data-testid="search-similar-chip-remove"
              onClick={() => {
                setSimilarToRecipeId(null);
                if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                if (hasSearchIntent(query, activeFilters, activePreferences))
                  void runSearch(
                    query,
                    activeFilters,
                    activePreferences,
                    { discoverableOnly: isDiscoverableOnly, gotoOnly },
                    null
                  );
                else {
                  searchGenerationRef.current += 1;
                  searchRequestRef.current = null;
                  setSearchData(null);
                  setSearchIndex(0);
                  setSearchActive(false);
                }
              }}
              className="ml-2 min-h-12 rounded-full border border-charcoal/20 bg-white px-4 font-bold"
            >
              {t('recipes.similar', 'Similar')} ×
            </button>
          )}
        </div>
      )}

      {isFiltersOpen && (
        <RecipeFiltersSheet
          activeFilters={{ ...activeFilters, discoverableOnly: isDiscoverableOnly, gotoOnly }}
          activePreferences={activePreferences}
          filterMetadata={filterMetadata}
          onApply={applyFilters}
          onClose={() => {
            setIsFiltersOpen(false);
            filtersTriggerRef.current?.focus({ preventScroll: true });
          }}
        />
      )}

      {isTrashOpen && <RecycleBinSheet onClose={() => setIsTrashOpen(false)} />}

      {/* Main content area */}
      <div
        data-testid="browse-results-region"
        className={`relative z-10 flex flex-1 flex-col items-center justify-start pt-4 px-3 sm:px-6 ${browseViewMode === 'stack' ? 'pb-2 min-h-[16rem] overflow-y-auto overflow-x-hidden touch-pan-y' : 'pb-[8px] min-h-0'}`}
      >
        {(searchActive
          ? searchLoading && !searchData
          : isInitialLoading && recipes.length === 0) && (
          <div className="flex flex-col items-center gap-4">
            <Loader2
              data-testid="browse-all-loader"
              className="animate-spin motion-reduce:animate-none text-ochre"
              size={48}
            />
            <p className="text-sm font-medium text-charcoal/50">
              {searchActive
                ? t('recipes.searchLoading', 'Searching…')
                : t('recipes.libraryLoading', 'Loading your library…')}
            </p>
          </div>
        )}

        {!searchActive && !isInitialLoading && loadError && (
          <div
            data-testid="browse-request-error"
            role="alert"
            className="flex flex-col items-center gap-4 text-center px-8"
          >
            <p className="text-base font-semibold text-charcoal/70">
              {t('recipes.browseFailed', 'Failed to load recipes.')}
            </p>
            <button
              type="button"
              data-testid="browse-request-retry"
              onClick={() => fetchLibraryData(1, isDiscoverableOnly)}
              className="min-h-12 px-6 py-3 rounded-full bg-ochre text-charcoal font-bold text-sm shadow-md"
            >
              {t('common.retry', 'Retry')}
            </button>
          </div>
        )}

        {!searchActive && historyRestartRequired && (
          <div role="status" className="rounded-2xl bg-white/90 p-4 text-center">
            <p>
              {t(
                'recipes.orderChanged',
                'Recipe order changed. Your current cards are kept until the first page reloads.'
              )}
            </p>
            <button
              type="button"
              disabled={isPrefetching}
              onClick={() => void fetchLibraryData(1, isDiscoverableOnly, true, true)}
              className="mt-2 min-h-12 rounded-full bg-ochre px-6 font-bold text-charcoal"
            >
              {t('recipes.restartFirstPage', 'Restart from first page')}
            </button>
          </div>
        )}

        {!searchActive && !isInitialLoading && !loadError && gotoOnly && recipes.length === 0 && (
          <div
            data-testid="browse-goto-empty"
            className="flex flex-col items-center gap-3 px-4 text-center text-charcoal"
          >
            <p>
              {t(
                'recipes.gotoNoMatches',
                'No matching Go-To recipes. Clear this filter to find recipes and add stars.'
              )}
            </p>
            <button
              type="button"
              data-testid="browse-goto-clear"
              onClick={() => setGotoOnly(false)}
              className="min-h-12 px-4 font-bold text-terracotta-700 underline"
            >
              {t('recipes.clearFilters', 'Clear filters')}
            </button>
          </div>
        )}

        {isEmpty && <EndCard isEmpty={true} onSwipeRight={() => {}} onSwipeLeft={() => {}} />}

        {searchActive && !searchLoading && searchError && (
          <div
            data-testid="search-request-error"
            role="alert"
            className="rounded-2xl bg-white p-6 text-center"
          >
            <p>{t('recipes.searchFailed', 'Could not load recipes. Try again.')}</p>
            <button
              type="button"
              data-testid="search-request-retry"
              onClick={() => void runSearch(query)}
              className="min-h-12 px-4 font-bold text-terracotta-700"
            >
              {t('common.retry', 'Retry')}
            </button>
          </div>
        )}
        {searchActive && !searchLoading && !searchError && visibleRecipes.length === 0 && (
          <div data-testid="search-empty-state" className="rounded-2xl bg-white p-6 text-center">
            <p>
              {Object.keys(activeFilters).length || Object.keys(activePreferences).length
                ? t('recipes.filterNoResults', 'No matches with these filters. Try removing one.')
                : t(
                    'recipes.searchEmptyTitle',
                    'No matches yet. Try a different description or clear filters.'
                  )}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                data-testid="search-empty-clear-filters"
                onClick={clearSearchFilters}
                className="min-h-12 rounded-full border border-charcoal/20 bg-white px-4 font-bold"
              >
                {t('recipes.clearFilters', 'Clear filters')}
              </button>
              <button
                type="button"
                data-testid="search-empty-clear-search"
                onClick={clearSearch}
                className="min-h-12 rounded-full bg-ochre px-4 font-bold text-charcoal"
              >
                {t('recipes.clearSearchAndBrowse', 'Clear search and browse')}
              </button>
            </div>
          </div>
        )}

        {!(searchActive ? !searchData : (isInitialLoading || loadError) && recipes.length === 0) &&
          browseViewMode === 'list' &&
          visibleRecipes.length > 0 && (
            <div
              ref={listScrollContainerRef}
              data-testid="browse-list-scroll-container"
              onScroll={handleListScroll}
              className="w-full max-w-6xl flex-1 min-h-0 overflow-y-auto px-1 pb-8"
            >
              {searchActive && searchData && (
                <h2 className="mb-3 font-heading text-lg font-bold text-charcoal/80">
                  {t('recipes.results', 'Results')}
                </h2>
              )}
              <div
                data-testid="browse-list-grid"
                className="grid grid-cols-2 min-[1024px]:grid-cols-3 gap-3 sm:gap-4"
              >
                {visibleRecipes.map((recipe) => (
                  <button
                    type="button"
                    key={recipe.id}
                    data-testid="browse-list-recipe-card"
                    onClick={() => handleCardTap(recipe.id!)}
                    className="group flex flex-col justify-start items-stretch overflow-hidden rounded-lg bg-white/85 text-left shadow-sm border border-charcoal/8 backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal focus:ring-2 focus:ring-ochre focus:ring-offset-2"
                  >
                    <div className="relative aspect-[4/3] bg-sage/10 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getImageUrl(
                          searchActive ? recipe.imageUrl : `/api/recipes/${recipe.id}/hero`
                        )}
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
                  <Loader2
                    className="animate-spin motion-reduce:animate-none text-ochre"
                    size={28}
                  />
                </div>
              )}
              {searchActive && searchLoadingMore && (
                <p role="status">{t('recipes.loadingMore', 'Loading more…')}</p>
              )}
              {searchActive && searchLoadMoreError && (
                <button
                  type="button"
                  data-testid="search-load-more-retry"
                  onClick={() => void loadMoreSearch(true)}
                >
                  {t('recipes.loadMore', 'Load more')}
                </button>
              )}
              {searchActive && searchCursorExpired && (
                <button
                  type="button"
                  data-testid="search-restart-expired"
                  onClick={() => void runSearch(query)}
                >
                  {t('recipes.restartSearch', 'Restart search')}
                </button>
              )}
            </div>
          )}

        {!(searchActive ? !searchData : (isInitialLoading || loadError) && recipes.length === 0) &&
          browseViewMode === 'stack' &&
          visibleRecipes.length > 0 && (
            <div
              data-testid="browse-stack-layout"
              className="w-full max-w-sm md:max-w-xl flex-1 min-h-[30rem] flex flex-col motion-safe:transition-all motion-safe:duration-500 ease-in-out"
            >
              <div className="flex flex-1 min-h-min items-center">
                <div className="relative w-full flex-none min-h-0">
                  <AnimatePresence mode="popLayout">
                    {stackVisibleRecipes.map((recipe, i) => (
                      <RecipeStackCard
                        key={`${recipe.id}:${stackRenderVersion}`}
                        id={recipe.id!}
                        name={recipe.name!}
                        description={recipe.description || ''}
                        imageUrl={getImageUrl(
                          searchActive ? recipe.imageUrl : `/api/recipes/${recipe.id}/hero`
                        )}
                        totalTime={recipe.totalTime || ''}
                        category={recipe.category || ''}
                        cuisineType={recipe.cuisineType ?? null}
                        mealTypes={recipe.mealTypes ?? null}
                        importIssueStatus={recipe.importIssue?.status ?? null}
                        isFront={i === 0}
                        stackIndex={i}
                        canSwipeRight={!searchActive || searchIndex > 0}
                        canSwipeLeft={
                          !searchActive ||
                          (!searchLoading &&
                            !searchLoadingMore &&
                            (searchIndex < visibleRecipes.length - 1 ||
                              Boolean(searchData?.nextCursor)))
                        }
                        onSwipeRight={handleSwipeRight}
                        onSwipeLeft={handleSwipeLeft}
                        onTap={() => {
                          detailReturnFocusRef.current = document.querySelector<HTMLElement>(
                            '[data-testid="stack-card-front"]'
                          );
                          handleCardTap(recipe.id!);
                        }}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {!searchActive && isWrappingToEnd && (
                <p role="status" className="text-center text-sm text-charcoal/60">
                  {t('recipes.libraryLoading', 'Loading your library…')}
                </p>
              )}
              {!searchActive && failedNavigation && (
                <div role="alert" className="text-center text-sm text-terracotta">
                  {t('recipes.pageFailed', 'Could not load that page. Your place is kept.')}
                  <button
                    type="button"
                    data-testid="stack-page-retry"
                    className="ml-2 font-bold underline"
                    onClick={() => void navigatePage(failedNavigation.page, failedNavigation.last)}
                  >
                    {t('common.retry', 'Retry')}
                  </button>
                </div>
              )}
              {/* Stack Action Bar */}
              {!isEndCard && currentRecipe && (
                <StackActionBar
                  currentRecipe={currentRecipe}
                  currentIndex={globalIndex}
                  totalCount={displayTotal}
                  positionText={
                    searchActive && searchData?.nextCursor
                      ? tWithVars(
                          'recipes.loadedPosition',
                          '{{position}} of {{total}} loaded · more available',
                          { position: searchIndex + 1, total: displayTotal }
                        )
                      : undefined
                  }
                  onToggleIndividualCuration={handleIndividualToggleDiscoverable}
                />
              )}
              {searchActive && searchLoadingMore && (
                <p role="status" className="text-center">
                  {t('recipes.loadingMore', 'Loading more…')}
                </p>
              )}
              {searchActive && searchLoadMoreError && (
                <button
                  type="button"
                  data-testid="search-load-more-retry"
                  onClick={() => void loadMoreSearch(true)}
                  className="min-h-12 font-bold text-terracotta-700"
                >
                  {t('recipes.loadMore', 'Load more')}
                </button>
              )}
              {searchActive && searchCursorExpired && (
                <button
                  type="button"
                  data-testid="search-restart-expired"
                  onClick={() => void runSearch(query)}
                  className="min-h-12 font-bold text-terracotta-700"
                >
                  {t('recipes.restartSearch', 'Restart search')}
                </button>
              )}
            </div>
          )}
      </div>

      {showDayChooser === detailTargetKey && targetReferenceForChooser && (
        <PlanningDayChooser
          reference={targetReferenceForChooser}
          weekOffset={visibleTarget?.weekOffset ?? (validTarget ? targetWeek : 0)}
          onClose={() => setShowDayChooser(null)}
          onSelect={(slot) => {
            setChosenDetailTarget({ entry: entryContextKey, slot });
            setShowDayChooser(null);
          }}
        />
      )}
      {nonCookingConfirmation?.key === detailTargetKey && (
        <NonCookingReplacementConfirmation
          slot={nonCookingConfirmation.slot}
          recipe={nonCookingConfirmation.recipe}
          onClose={() => setNonCookingConfirmation(null)}
          onSaved={async () => {
            const slot = nonCookingConfirmation.slot;
            router.push(
              `/planner?success=1&dayIndex=${slot.dayIndex}&weekOffset=${slot.weekOffset}&referenceWeekStartDate=${slot.referenceWeekStartDate}`
            );
          }}
          onReview={() => reviewDetailTarget(nonCookingConfirmation.slot)}
        />
      )}
      {detailRecipeId && (
        <RecipeDetailSheet
          recipeId={detailRecipeId}
          plannerDayLabel={originalSourceReview ? null : planningDayLabel}
          ingredientContext={
            !originalSourceReview && visibleTarget
              ? { context: 'proposed', supperDate: visibleTarget.date }
              : undefined
          }
          planningNeedsCheck={assignmentNeedsCheck || Boolean(targetReadError)}
          plannedDayLabel={
            confirmedPlannedTarget && visibleTarget
              ? formatSupperPlanDate(visibleTarget.date)
              : undefined
          }
          onOpenPlannedDay={
            confirmedPlannedTarget && visibleTarget
              ? () => {
                  const captured = visibleTarget;
                  const generation = targetReadGeneration.current;
                  void getPlannerSlot(
                    captured.weekOffset,
                    captured.dayIndex,
                    captured.referenceWeekStartDate
                  )
                    .then((checked) => {
                      if (
                        detailContextRef.current !== detailTargetKey ||
                        targetReadGeneration.current !== generation
                      )
                        return;
                      if (
                        !checked ||
                        checked.date !== captured.date ||
                        checked.recipe?.id !== detailRecipeId ||
                        (checked.status !== 0 && checked.status !== 1)
                      ) {
                        setTargetRead({
                          key: detailTargetKey,
                          slot: captured,
                          error: t(
                            'recipes.planChanged',
                            'Your plan changed. Review the selected day in Planner.'
                          ),
                        });
                        return;
                      }
                      reviewDetailTarget(checked);
                    })
                    .catch(() => {
                      if (
                        detailContextRef.current === detailTargetKey &&
                        targetReadGeneration.current === generation
                      )
                        setTargetRead({
                          key: detailTargetKey,
                          slot: captured,
                          error: t(
                            'recipes.checkPlanFailed',
                            'Could not confirm this meal. Retry check before saving.'
                          ),
                        });
                    });
                }
              : undefined
          }
          planningEnabled={!originalSourceReview}
          planningLoading={
            !originalSourceReview && (targetChecking || (!visibleTarget && !targetReadError))
          }
          planningMessage={
            originalSourceReview
              ? undefined
              : (targetReadError ??
                (targetReview
                  ? t(
                      'recipes.reviewBeforePlanning',
                      'Review this completed or voting supper in Planner.'
                    )
                  : undefined))
          }
          planningActionLabel={
            originalSourceReview
              ? undefined
              : targetReadError
                ? t('recipes.retryPlanCheck', 'Retry check')
                : targetReview
                  ? t('recipes.reviewPlan', 'Review plan')
                  : undefined
          }
          onChangeDay={
            originalSourceReview ||
            assignmentNeedsCheck ||
            targetChecking ||
            identicalTarget ||
            !targetReferenceForChooser
              ? undefined
              : () => setShowDayChooser(detailTargetKey)
          }
          onRetryTarget={
            !originalSourceReview && targetReadError
              ? () => {
                  setTargetRead((current) =>
                    current?.key === detailTargetKey
                      ? { ...current, checking: true, error: undefined }
                      : current
                  );
                  setTargetReadAttempt((value) => value + 1);
                }
              : undefined
          }
          onBeginPlanning={
            originalSourceReview
              ? () => {
                  // Changing the identity retires any previous read; the normal effect
                  // obtains a fresh calendar/target. This transition never assigns.
                  setSourcePlanningEntry(grocerySourceEntry);
                  setChosenDetailTarget(null);
                  setTargetReadAttempt((value) => value + 1);
                }
              : undefined
          }
          onClose={handleDetailSheetClose}
          onDeleted={() => {
            if (searchActive)
              void runSearch(query, activeFilters, activePreferences, {
                discoverableOnly: isDiscoverableOnly,
                gotoOnly,
              });
            else setBrowseRefreshVersion((version) => version + 1);
          }}
          onUseForDay={handleSelectForPlanner}
          onFindSimilar={(recipeId) => {
            setDetailRecipeId(null);
            setQuery('');
            setSimilarToRecipeId(recipeId);
            setSearchControlsExpanded(true);
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
            void runSearch(
              '',
              activeFilters,
              activePreferences,
              { discoverableOnly: isDiscoverableOnly, gotoOnly },
              recipeId
            );
          }}
        />
      )}

      {pendingRecovery && (
        <SkipRecoveryDialog
          pending={recovery.pending}
          isOpen={true}
          step={2}
          source={pendingRecovery.slot}
          replacement={recovery.feedback}
          confirmAbandon={recovery.confirmAbandon}
          onCancelAbandon={recovery.cancelAbandon}
          onAbandon={recovery.abandon}
          onRetryReplacement={recovery.retry}
          onReviewPlan={recovery.review}
          onClose={recovery.close}
          onBack={recovery.close}
          onAction={recovery.act}
        />
      )}
    </div>
  );
}
