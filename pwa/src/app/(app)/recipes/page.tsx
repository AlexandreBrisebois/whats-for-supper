'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search as SearchIcon,
  Star,
  Sparkles,
  Clock,
  ChefHat,
  Loader2,
  Camera,
  Image as ImageIcon,
  BookOpen,
  Dices,
  Trash2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { apiClient } from '@/lib/api/api-client';
import { searchRecipes, type RecipeSearchResponse, type Recipe } from '@/lib/api/recipes';
import { submitPhotoSearch } from '@/lib/api/inventory';
import type { RecipeSearchFiltersDto } from '@/lib/api/generated/models/index';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { t, tWithVars } from '@/locales';
import { RecipeDetailSheet } from '@/components/recipes/RecipeDetailSheet';
import { SkipRecoveryDialog } from '@/components/home/SkipRecoveryDialog';
import {
  assignRecipeToEmptySlot,
  findFirstOpenPlannerSlot,
  getPlannerSlot,
  resolveOccupiedSlot,
  type AssignmentRecipe,
  type PlannerSlot,
} from '@/lib/planner/slotAssignment';
import { getImageUrl } from '@/lib/imageUtils';

type SearchMode = 'standard' | 'agent' | 'camera';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function resolveDayName(weekOffset: number, dayIndex: number): string {
  const today = new Date();
  // Get start of CURRENT week (Monday)
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  currentMonday.setHours(0, 0, 0, 0);

  // Get target date
  const target = new Date(currentMonday);
  target.setDate(currentMonday.getDate() + dayIndex + weekOffset * 7);

  // Check if target is today
  const todayDate = new Date(today);
  todayDate.setHours(0, 0, 0, 0);

  if (target.getTime() === todayDate.getTime()) {
    return 'Tonight';
  }

  return WEEKDAYS[target.getDay()];
}

const INITIAL_LIMIT = 6;
const PAGE_SIZE = 6;

export default function RecipesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState('');
  const [agentQuery, setAgentQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('standard');
  const [isCameraBusy, setIsCameraBusy] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [isSubmittingPhotos, setIsSubmittingPhotos] = useState(false);
  const [pantrySnapshotId, setPantrySnapshotId] = useState<string | null>(null);
  const [data, setData] = useState<RecipeSearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [openDetailRecipeId, setOpenDetailRecipeId] = useState<string | null>(() =>
    searchParams.get('open')
  );
  const [prevOpenIdFromUrl, setPrevOpenIdFromUrl] = useState<string | null>(() =>
    searchParams.get('open')
  );
  const [similarToRecipeId, setSimilarToRecipeId] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<RecipeSearchFiltersDto>({});
  const [limit, setLimit] = useState(INITIAL_LIMIT);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showDemoAiNotice, setShowDemoAiNotice] = useState(false);
  const [pendingRecovery, setPendingRecovery] = useState<{
    slot: PlannerSlot;
    recipe: AssignmentRecipe;
    navigateTo: { weekOffset: number; dayIndex: number; home?: boolean };
  } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const resultsSentinelRef = useRef<HTMLDivElement | null>(null);

  const addToDay = searchParams.get('addToDay');
  const weekOffset = searchParams.get('weekOffset');

  const parsedDayIndex = addToDay !== null ? parseInt(addToDay, 10) : undefined;
  const parsedWeekOffset = weekOffset !== null ? parseInt(weekOffset, 10) : undefined;

  const isAgentSearchEnabled = process.env.NEXT_PUBLIC_ENABLE_AGENT_SEARCH === 'true';
  const isPhotoSearchEnabled = process.env.NEXT_PUBLIC_ENABLE_PHOTO_SEARCH === 'true';

  useEffect(() => {
    let isActive = true;

    void (async () => {
      try {
        const health = (await apiClient.api.health.get()) as { demoMode?: boolean } | undefined;
        if (isActive) {
          setIsDemoMode(Boolean(health?.demoMode));
        }
      } catch {
        if (isActive) {
          setIsDemoMode(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

  let dayName: string | null = null;
  try {
    dayName =
      parsedDayIndex !== undefined && parsedWeekOffset !== undefined
        ? resolveDayName(parsedWeekOffset, parsedDayIndex)
        : null;
  } catch (err) {
    console.error('[RecipesPage] resolveDayName error:', err);
  }

  const runSearch = useCallback(
    async (
      nextQuery: string,
      nextSimilarToRecipeId?: string | null,
      nextFilters?: RecipeSearchFiltersDto,
      nextPantrySnapshotId?: string | null,
      nextLimit?: number
    ) => {
      setIsLoading(true);
      try {
        const filters = nextFilters ?? activeFilters;
        const snapshotId = nextPantrySnapshotId ?? pantrySnapshotId;
        const resolvedLimit = nextLimit ?? limit;
        const response = await searchRecipes({
          query: nextQuery,
          mode: 'standard',
          limit: resolvedLimit,
          weekOffset: parsedWeekOffset,
          dayIndex: parsedDayIndex,
          similarToRecipeId: nextSimilarToRecipeId ?? undefined,
          pantrySnapshotId: snapshotId ?? undefined,
          filters: Object.keys(filters).length > 0 ? filters : undefined,
        });
        setData(response);
        setSimilarToRecipeId(nextSimilarToRecipeId ?? null);
      } catch (error) {
        console.error('Failed to search recipes', error);
        setData({
          topPick: null,
          results: [],
          appliedFilters: {},
          searchMode: 'standard',
          resultPath: 'lexical-only',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [activeFilters, pantrySnapshotId, limit, parsedWeekOffset, parsedDayIndex]
  );

  useEffect(() => {
    let isActive = true;

    void (async () => {
      try {
        const response = await searchRecipes({
          query: '',
          mode: 'standard',
          limit: INITIAL_LIMIT,
          weekOffset: parsedWeekOffset,
          dayIndex: parsedDayIndex,
          similarToRecipeId: undefined,
        });

        if (!isActive) return;
        setData(response);
      } catch (error) {
        if (!isActive) return;
        console.error('Failed to search recipes', error);
        setData({
          topPick: null,
          results: [],
          appliedFilters: {},
          searchMode: 'standard',
          resultPath: 'lexical-only',
        });
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [parsedDayIndex, parsedWeekOffset]);

  // Adjust state when URL 'open' parameter changes
  const openIdFromUrl = searchParams.get('open');
  if (openIdFromUrl !== prevOpenIdFromUrl) {
    setPrevOpenIdFromUrl(openIdFromUrl);
    setOpenDetailRecipeId(openIdFromUrl);
  }

  // Debounced search-as-you-type
  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSearch(value, similarToRecipeId, activeFilters, pantrySnapshotId, limit);
    }, 300);
  };

  const handleOpenRecipe = (recipeId: string) => {
    setOpenDetailRecipeId(recipeId);
  };

  const toAssignmentRecipe = (recipe: Recipe): AssignmentRecipe => ({
    id: recipe.id,
    name: recipe.name,
    image: recipe.imageUrl,
  });

  const assignWithRecoveryGuard = async (
    weekOffsetValue: number,
    dayIndexValue: number,
    recipe: Recipe,
    options: { home?: boolean } = {}
  ) => {
    const assignmentRecipe = toAssignmentRecipe(recipe);
    const slot = await getPlannerSlot(weekOffsetValue, dayIndexValue);

    if (slot?.recipe) {
      setPendingRecovery({
        slot,
        recipe: assignmentRecipe,
        navigateTo: { weekOffset: weekOffsetValue, dayIndex: dayIndexValue, home: options.home },
      });
      return;
    }

    await assignRecipeToEmptySlot(weekOffsetValue, dayIndexValue, assignmentRecipe);
    if (options.home) {
      router.push('/home');
    } else {
      router.push(`/planner?success=1&dayIndex=${dayIndexValue}&weekOffset=${weekOffsetValue}`);
    }
  };

  const handleAssignRecipe = async (recipe: Recipe, specificDayIndex?: number) => {
    // If specificDayIndex is provided, it's the "Plan for later" flow from discovery
    if (specificDayIndex !== undefined) {
      setIsAssigning(true);
      try {
        await assignWithRecoveryGuard(0, specificDayIndex, recipe);
      } catch (error) {
        console.error('Failed to assign recipe:', error);
        setIsAssigning(false);
      }
      return;
    }

    // Otherwise, it's either "Add it to {day}" (planner flow) or "Cook it tonight" (discovery flow)
    if (addToDay !== null && weekOffset !== null) {
      // Planner flow
      setIsAssigning(true);
      try {
        const d = parseInt(addToDay, 10);
        const w = parseInt(weekOffset, 10);
        await assignWithRecoveryGuard(w, d, recipe);
      } catch (error) {
        console.error('Failed to assign recipe:', error);
        setIsAssigning(false);
      }
    } else {
      // Discovery flow - Cook it tonight
      const todayIndex = (new Date().getDay() + 6) % 7;
      setIsAssigning(true);
      try {
        await assignWithRecoveryGuard(0, todayIndex, recipe, { home: true });
      } catch (error) {
        console.error('Failed to assign recipe:', error);
        setIsAssigning(false);
      }
    }
  };

  const handlePlanForLater = async (recipe: Recipe) => {
    setIsAssigning(true);
    try {
      // "Plan for Later" starts from tomorrow onwards
      const todayIndex = (new Date().getDay() + 6) % 7;
      let startDayIndex = todayIndex + 1;
      let startWeekOffset = 0;

      if (startDayIndex > 6) {
        startDayIndex = 0;
        startWeekOffset = 1;
      }

      const openSlot = await findFirstOpenPlannerSlot(startWeekOffset, startDayIndex);
      if (!openSlot) {
        setIsAssigning(false);
        return;
      }

      await assignRecipeToEmptySlot(
        openSlot.weekOffset,
        openSlot.dayIndex,
        toAssignmentRecipe(recipe)
      );
      router.push(
        `/planner?success=1&dayIndex=${openSlot.dayIndex}&weekOffset=${openSlot.weekOffset}`
      );
    } catch (error) {
      console.error('Failed to plan recipe for later:', error);
      setIsAssigning(false);
    }
  };

  const handleRecoveryAction = async (action: string) => {
    if (!pendingRecovery) return;
    if (action !== 'tomorrow' && action !== 'next_week' && action !== 'drop') return;

    setIsAssigning(true);
    try {
      await resolveOccupiedSlot(pendingRecovery.slot, action);
      await assignRecipeToEmptySlot(
        pendingRecovery.navigateTo.weekOffset,
        pendingRecovery.navigateTo.dayIndex,
        pendingRecovery.recipe
      );

      const { weekOffset: targetWeekOffset, dayIndex, home } = pendingRecovery.navigateTo;
      setPendingRecovery(null);
      if (home) {
        router.push('/home');
      } else {
        router.push(`/planner?success=1&dayIndex=${dayIndex}&weekOffset=${targetWeekOffset}`);
      }
    } catch (error) {
      console.error('Failed recovery action:', error);
      setIsAssigning(false);
    }
  };

  const handleFindSimilar = (recipeId: string) => {
    setOpenDetailRecipeId(null);
    setQuery('');
    void runSearch('', recipeId);
  };

  const handleAgentSubmit = () => {
    if (isDemoMode) {
      setShowDemoAiNotice(true);
      setSearchMode('standard');
      return;
    }
    if (!agentQuery.trim()) return;
    setSearchMode('standard');
    setIsLoading(true);
    searchRecipes({
      query: agentQuery,
      mode: 'agent',
      limit,
      weekOffset: parsedWeekOffset,
      dayIndex: parsedDayIndex,
    })
      .then((response) => setData(response))
      .catch(() =>
        setData({
          topPick: null,
          results: [],
          appliedFilters: {},
          searchMode: 'agent',
          resultPath: 'lexical-only',
        })
      )
      .finally(() => setIsLoading(false));
  };

  const handleCameraSubmit = async () => {
    setIsCameraBusy(false);
    setIsSubmittingPhotos(true);
    try {
      const result = await submitPhotoSearch(pendingPhotos);
      if ('busy' in result) {
        setIsCameraBusy(true);
        return;
      }
      setPendingPhotos([]);
      setSearchMode('standard');
      if (result.intent === 'recipe') {
        const photoQuery = result.query || result.inferredIngredients.join(' ');
        setQuery(photoQuery);
        setPantrySnapshotId(null);
        void runSearch(photoQuery, null, activeFilters, null);
        return;
      }

      setPantrySnapshotId(result.pantrySnapshotId);
      void runSearch(query, similarToRecipeId, activeFilters, result.pantrySnapshotId);
    } finally {
      setIsSubmittingPhotos(false);
    }
  };

  const handlePhotoInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    setPendingPhotos((prev) => [...prev, ...files]);
    event.target.value = '';
  };

  const handleFilterToggle = (key: keyof RecipeSearchFiltersDto) => {
    const next = { ...activeFilters, [key]: activeFilters[key] ? null : true };
    if (!next[key]) delete next[key];
    setActiveFilters(next);
    void runSearch(query, similarToRecipeId, next);
  };

  const { topPick, results } = data ?? { topPick: null, results: [] };
  const showEmptyState = !isLoading && topPick == null && results.length === 0;
  const hasActiveFilters = Object.keys(activeFilters).length > 0;
  const hasMoreResults = data !== null && results.length >= limit;

  const handleShowMore = useCallback(async () => {
    if (isLoadingMore || isLoading || !hasMoreResults) return;

    const nextLimit = limit + PAGE_SIZE;
    setLimit(nextLimit);
    setIsLoadingMore(true);
    try {
      const response = await searchRecipes({
        query,
        mode: 'standard',
        limit: nextLimit,
        weekOffset: parsedWeekOffset,
        dayIndex: parsedDayIndex,
        similarToRecipeId: similarToRecipeId ?? undefined,
        pantrySnapshotId: pantrySnapshotId ?? undefined,
        filters: Object.keys(activeFilters).length > 0 ? activeFilters : undefined,
      });
      setData(response);
    } catch {
      // keep existing results
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    activeFilters,
    hasMoreResults,
    isLoading,
    isLoadingMore,
    limit,
    pantrySnapshotId,
    parsedDayIndex,
    parsedWeekOffset,
    query,
    similarToRecipeId,
  ]);

  const handleFeelLucky = () => {
    setData((currentData) => {
      if (!currentData || currentData.results.length === 0) {
        void runSearch(query, null, activeFilters, pantrySnapshotId, limit);
        return currentData;
      }

      const nextTopPickIndex = Math.floor(Math.random() * currentData.results.length);
      const nextTopPick = currentData.results[nextTopPickIndex];
      const previousTopPick = currentData.topPick;
      const nextResults = currentData.results.filter((_, index) => index !== nextTopPickIndex);

      if (previousTopPick) {
        nextResults.unshift(previousTopPick);
      }

      return {
        ...currentData,
        topPick: nextTopPick,
        results: nextResults,
      };
    });
  };

  useEffect(() => {
    const sentinel = resultsSentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void handleShowMore();
        }
      },
      { rootMargin: '600px 0px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleShowMore]);

  return (
    <div className="flex flex-col gap-6 pt-6 pb-12">
      {addToDay !== null && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          data-testid="planning-mode-banner"
          className="bg-terracotta/10 border border-terracotta/20 rounded-2xl p-4 flex items-center justify-between"
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-terracotta/60 mb-1">
              {t('recipes.planningMode', 'Planning Mode')}
            </p>
            <p className="text-sm font-bold text-charcoal">
              {dayName
                ? tWithVars('recipes.selectMealForDay', `Planning for ${dayName}`, {
                    day: dayName,
                  })
                : tWithVars(
                    'recipes.selectMealForDayNum',
                    `Planning for Day ${parseInt(addToDay) + 1}`,
                    { day: parseInt(addToDay) + 1 }
                  )}
            </p>
          </div>
          <button
            onClick={() => router.push('/planner')}
            data-testid="planning-mode-cancel"
            className="text-xs font-bold text-terracotta hover:underline"
          >
            {t('recipes.cancel', 'Cancel')}
          </button>
        </motion.div>
      )}

      {/* Top Bar: Browse Library (left) */}
      <div className="flex items-center px-1">
        <Link
          href="/browse-all-stack"
          data-testid="browse-all-stack-trigger"
          aria-label={t('recipes.browseLibrary', 'Browse Library')}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-charcoal/70 shadow-sm border border-charcoal/8 backdrop-blur-sm hover:bg-white active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-ochre focus:ring-offset-2"
        >
          <BookOpen size={20} className="text-ochre" />
        </Link>
      </div>

      {/* Mode selector */}
      {(isAgentSearchEnabled || isPhotoSearchEnabled) && (
        <div className="flex flex-wrap gap-2 px-1">
          {isAgentSearchEnabled && (
            <button
              type="button"
              data-testid="agent-search-trigger"
              onClick={() => {
                if (isDemoMode) {
                  setShowDemoAiNotice(true);
                  setSearchMode('standard');
                  return;
                }
                setSearchMode(searchMode === 'agent' ? 'standard' : 'agent');
              }}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold shadow-sm transition-colors',
                isDemoMode && 'opacity-60',
                searchMode === 'agent'
                  ? 'border-terracotta bg-terracotta text-white'
                  : 'border-charcoal/10 bg-white/70 text-charcoal'
              )}
            >
              <Sparkles
                size={16}
                className={searchMode === 'agent' ? 'text-white' : 'text-terracotta'}
              />
              {t('recipes.agentSearch', 'Agent Search')}
            </button>
          )}
          {isPhotoSearchEnabled && (
            <button
              type="button"
              data-testid="inventory-camera-trigger"
              onClick={() => setSearchMode(searchMode === 'camera' ? 'standard' : 'camera')}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold shadow-sm transition-colors',
                searchMode === 'camera'
                  ? 'border-terracotta bg-terracotta text-white'
                  : 'border-charcoal/10 bg-white/70 text-charcoal'
              )}
            >
              <Camera
                size={16}
                className={searchMode === 'camera' ? 'text-white' : 'text-terracotta'}
              />
              {t('recipes.inventoryCamera', 'Photo Search')}
            </button>
          )}
        </div>
      )}

      {showDemoAiNotice && (
        <div
          data-testid="demo-ai-notice"
          className="rounded-2xl border border-terracotta/20 bg-terracotta/10 px-4 py-3 text-sm font-bold text-terracotta"
        >
          {t('recipes.demoAiNotice', 'Semantic search translation is disabled in Demo Mode')}
        </div>
      )}

      {/* Single active canvas */}
      {searchMode === 'standard' && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative group"
        >
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-charcoal/30 group-focus-within:text-terracotta transition-colors z-10">
            <SearchIcon size={24} strokeWidth={2.5} />
          </div>
          <input
            type="text"
            value={query}
            data-testid="recipe-search-input"
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (debounceRef.current) clearTimeout(debounceRef.current);
                (e.target as HTMLInputElement).blur();
                void runSearch(query);
              }
            }}
            placeholder={t('recipes.searchPlaceholder', 'Something spicy for 4...')}
            className="w-full bg-white/70 backdrop-blur-md border-2 border-charcoal/5 rounded-[2rem] py-5 pl-16 pr-8 text-lg font-bold text-charcoal placeholder:text-charcoal/20 focus:outline-none focus:border-terracotta/20 transition-all shadow-card focus:shadow-xl focus:bg-white"
          />
          {query && (
            <div className="absolute right-6 top-1/2 -translate-y-1/2">
              <Sparkles size={20} className="text-terracotta animate-pulse" />
            </div>
          )}
        </motion.div>
      )}

      {searchMode === 'agent' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-2"
        >
          <textarea
            data-testid="agent-search-input"
            value={agentQuery}
            onChange={(e) => setAgentQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                (e.target as HTMLTextAreaElement).blur();
                handleAgentSubmit();
              }
            }}
            placeholder={t(
              'recipes.agentSearchPlaceholder',
              'Describe what you feel like tonight in your own words…'
            )}
            rows={3}
            className="w-full rounded-2xl border-2 border-charcoal/5 bg-white/60 backdrop-blur-md p-4 text-base font-bold text-charcoal placeholder:text-charcoal/20 focus:border-terracotta/20 focus:outline-none resize-none shadow-sm transition-all"
          />
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="agent-search-submit"
              onClick={handleAgentSubmit}
              className="rounded-full bg-terracotta px-5 py-2 text-sm font-bold text-white shadow-sm"
            >
              {t('recipes.agentSearchSubmit', 'Search')}
            </button>
            <button
              type="button"
              data-testid="agent-search-close"
              onClick={() => setSearchMode('standard')}
              className="rounded-full border border-charcoal/10 bg-white/70 px-5 py-2 text-sm font-bold text-charcoal shadow-sm"
            >
              {t('recipes.cancel', 'Cancel')}
            </button>
          </div>
        </motion.div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        data-testid="inventory-camera-input"
        className="hidden"
        onChange={handlePhotoInput}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        data-testid="inventory-gallery-input"
        className="hidden"
        onChange={handlePhotoInput}
      />

      {/* Camera photo queue panel */}
      {searchMode === 'camera' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          data-testid="inventory-capture-popup"
          className="flex flex-col gap-4 rounded-2xl border border-charcoal/10 bg-white/90 p-5 shadow-lg"
        >
          {/* Large Capture Button */}
          <div className="flex flex-col items-center gap-6 py-4">
            <button
              type="button"
              data-testid="inventory-take-photo"
              onClick={() => cameraInputRef.current?.click()}
              aria-label={t('recipes.takePhoto', 'Take Photo')}
              className="flex h-24 w-24 items-center justify-center rounded-full bg-terracotta text-white shadow-xl shadow-terracotta/30 ring-4 ring-white active:scale-95 transition-transform"
            >
              <Camera size={32} strokeWidth={2} />
            </button>

            <button
              type="button"
              data-testid="inventory-choose-photos"
              onClick={() => galleryInputRef.current?.click()}
              className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-terracotta/60 transition-colors hover:text-terracotta"
            >
              <ImageIcon size={14} />
              {t('recipes.choosePhotos', 'Choose from Library')}
            </button>
          </div>

          {/* Photo preview strip */}
          {pendingPhotos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pendingPhotos.map((file, i) => (
                <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Photo ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    data-testid={`remove-photo-${i}`}
                    onClick={() => setPendingPhotos((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-charcoal/70 text-white text-xs font-black leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {isCameraBusy && (
            <p className="text-sm text-terracotta font-medium">
              {t('recipes.cameraBusy', "We're processing a lot right now. Try again in a moment.")}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              data-testid="inventory-capture-submit"
              onClick={() => void handleCameraSubmit()}
              disabled={isSubmittingPhotos}
              className="inline-flex items-center gap-2 rounded-full bg-terracotta px-5 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-40"
            >
              {isSubmittingPhotos
                ? t('recipes.searching', 'Searching…')
                : tWithVars(
                    'recipes.searchWithPhotos',
                    `Search with ${pendingPhotos.length} photos`,
                    {
                      count: pendingPhotos.length,
                    }
                  )}
            </button>
            <button
              type="button"
              data-testid="inventory-capture-cancel"
              onClick={() => {
                setSearchMode('standard');
                setPendingPhotos([]);
                setIsCameraBusy(false);
              }}
              className="rounded-full border border-charcoal/10 bg-white/70 px-5 py-2 text-sm font-bold text-charcoal shadow-sm"
            >
              {t('recipes.cancel', 'Cancel')}
            </button>
          </div>
        </motion.div>
      )}

      {/* Filter pills */}
      <div className="flex flex-col gap-2 px-1">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-charcoal/40">
          {t('recipes.filterBy', 'Filter by')}
        </p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              {
                key: 'newRecipes',
                label: t('recipes.filterNew', 'New'),
                testId: 'filter-new-recipes',
              },
              {
                key: 'neverCooked',
                label: t('recipes.filterNeverTried', 'Never Tried'),
                testId: 'filter-never-tried',
              },
              {
                key: 'familyFavorite',
                label: t('recipes.filterFamilyFavorite', 'Family Favorite'),
                testId: 'filter-family-favorite',
              },
              {
                key: 'quickOnly',
                label: t('recipes.filterQuick', 'Quick'),
                testId: 'filter-quick',
              },
              {
                key: 'notCookedInLongTime',
                label: t('recipes.filterNotCookedLong', "It's Been a While"),
                testId: 'filter-not-cooked-long-time',
              },
              {
                key: 'healthyOnly',
                label: t('recipes.filterHealthy', 'Healthy Choice'),
                testId: 'filter-healthy',
              },
            ] as { key: keyof RecipeSearchFiltersDto; label: string; testId: string }[]
          ).map(({ key, label, testId }) => {
            const isActive = !!activeFilters[key];
            return (
              <button
                key={key}
                type="button"
                data-testid={isActive ? `${testId}-active` : testId}
                onClick={() => handleFilterToggle(key)}
                className={cn(
                  'rounded-full border px-4 py-2 text-sm font-bold shadow-sm transition-colors',
                  isActive
                    ? 'border-terracotta bg-terracotta text-white'
                    : 'border-charcoal/10 bg-white/70 text-charcoal'
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Section */}
      <div className="flex flex-col gap-6">
        {isLoading ? (
          <div className="flex h-48 w-full items-center justify-center">
            <Loader2 className="animate-spin text-ochre" size={48} data-testid="recipe-loader" />
          </div>
        ) : !data ? null : showEmptyState ? (
          <div
            data-testid={hasActiveFilters ? 'filter-no-results' : 'search-empty-state'}
            className="rounded-[2rem] border border-dashed border-charcoal/15 bg-white/60 p-8 text-center shadow-sm flex flex-col items-center gap-4"
          >
            <p className="text-lg font-black tracking-tight text-charcoal">
              {hasActiveFilters
                ? t('recipes.filterNoResults', 'No matches with these filters. Try removing one.')
                : t(
                    'recipes.searchEmptyTitle',
                    'No matches yet. Try a different description or clear filters.'
                  )}
            </p>
            <div className="flex gap-3 flex-wrap justify-center">
              <button
                type="button"
                onClick={() => void runSearch('')}
                className="inline-flex rounded-full bg-terracotta px-4 py-2 text-sm font-bold text-white shadow-sm"
              >
                {t('recipes.clearFilters', 'Clear Filters')}
              </button>
              <a
                href="/browse-all-stack"
                className="inline-flex items-center gap-1.5 rounded-full border border-charcoal/10 bg-white/70 px-4 py-2 text-sm font-bold text-charcoal shadow-sm"
              >
                <BookOpen size={14} />
                {t('recipes.browseLibrary', 'Browse Library')}
              </a>
            </div>
          </div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-between px-1"
            >
              <h2 className="font-heading text-[11px] font-black uppercase tracking-[0.2em] text-charcoal/40">
                {t('recipes.recommendations', 'Top Picks')}
              </h2>
            </motion.div>

            {/* Top Pick Hero */}
            {topPick && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                onClick={() => handleOpenRecipe(topPick.id)}
                data-testid="recipe-card-top-pick"
                className={cn(
                  'relative group cursor-pointer active:scale-[0.98] transition-all',
                  isAssigning && 'opacity-50 pointer-events-none'
                )}
              >
                <div className="absolute top-5 left-5 z-20 bg-ochre text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg flex items-center gap-1.5">
                  <Star size={12} fill="currentColor" /> {t('recipes.topPick', 'Top Pick')}
                </div>

                {/* Feeling Lucky refresh button */}
                <button
                  type="button"
                  data-testid="top-pick-feeling-lucky"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFeelLucky();
                  }}
                  className="absolute top-5 right-5 z-20 h-10 w-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:bg-white/30 active:scale-95 transition-all"
                  aria-label="Surprise me — show a different pick"
                >
                  <Dices size={16} />
                </button>

                <div className="relative w-full aspect-[16/10] min-h-[240px] rounded-[2.5rem] overflow-hidden shadow-2xl glass-solar border border-white/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getImageUrl(topPick.imageUrl) || '/placeholder-recipe.jpg'}
                    alt={topPick.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/20 to-transparent opacity-90" />

                  <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-2.5 text-white z-10">
                    <div className="flex gap-2">
                      <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                        <Clock size={10} /> {topPick.totalTime}
                      </span>
                    </div>
                    <h3 className="text-3xl font-black tracking-tighter leading-none mb-1">
                      {topPick.name}
                    </h3>
                    {topPick.plannerFitNote && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-[0_0_30px_rgba(255,255,255,0.05)] relative overflow-hidden group/reason"
                      >
                        <div className="absolute top-0 left-0 w-1 h-full bg-ochre shadow-[0_0_10px_rgba(255,180,0,0.5)]" />
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            <Sparkles size={16} className="text-ochre animate-pulse" />
                          </div>
                          <p className="text-white font-bold text-sm leading-snug tracking-tight">
                            {topPick.plannerFitNote}
                          </p>
                        </div>
                      </motion.div>
                    )}
                    {!topPick.plannerFitNote && topPick.reasons.length > 0 && (
                      <p className="text-white/70 text-sm font-medium line-clamp-2 max-w-[90%] leading-snug">
                        {topPick.reasons[0].label}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Secondary Results */}
            <div className="grid grid-cols-2 gap-4">
              {results.map((recipe, idx) => (
                <motion.div
                  key={recipe.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + idx * 0.1 }}
                  onClick={() => handleOpenRecipe(recipe.id)}
                  data-testid={`recipe-card-${recipe.id}`}
                  className={cn(
                    'group flex flex-col justify-start items-stretch gap-3 p-3 bg-white/50 backdrop-blur-sm rounded-[2rem] border border-charcoal/5 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95',
                    isAssigning && 'opacity-50 pointer-events-none'
                  )}
                >
                  <div className="relative aspect-video overflow-hidden rounded-3xl mb-6 shadow-sm ring-1 ring-charcoal/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getImageUrl(recipe.imageUrl) || '/placeholder-recipe.jpg'}
                      alt={recipe.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1 px-1.5 pb-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-charcoal/30 flex items-center gap-1">
                      <Clock size={9} /> {recipe.totalTime}
                    </span>
                    <h4 className="text-base font-black tracking-tighter leading-tight text-charcoal truncate">
                      {recipe.name}
                    </h4>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            {hasMoreResults && (
              <div
                ref={resultsSentinelRef}
                data-testid="search-results-scroll-sentinel"
                className="flex min-h-12 items-center justify-center px-1"
                aria-hidden="true"
              >
                {isLoadingMore ? <Loader2 size={18} className="animate-spin text-ochre" /> : null}
              </div>
            )}
          </>
        )}
      </div>

      <div className="sr-only" aria-hidden="true">
        {openDetailRecipeId}
        {similarToRecipeId}
      </div>

      {openDetailRecipeId && (
        <RecipeDetailSheet
          recipeId={openDetailRecipeId}
          plannerDayLabel={
            dayName ?? (addToDay !== null ? `Day ${parseInt(addToDay, 10) + 1}` : null)
          }
          onClose={() => setOpenDetailRecipeId(null)}
          onUseForDay={handleAssignRecipe}
          onPlanForLater={handlePlanForLater}
          onFindSimilar={handleFindSimilar}
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
