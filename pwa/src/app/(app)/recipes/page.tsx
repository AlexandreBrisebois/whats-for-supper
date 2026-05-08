'use client';

import { useState, useEffect } from 'react';
import {
  Search as SearchIcon,
  Star,
  ArrowRight,
  Sparkles,
  Clock,
  ChefHat,
  Loader2,
  Camera,
  Trash2,
  BookOpen,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  searchRecipes,
  type RecipeSearchResponse,
  type RecipeSearchResult,
  type Recipe,
} from '@/lib/api/recipes';
import { submitInventoryCapture } from '@/lib/api/inventory';
import type { RecipeSearchFiltersDto } from '@/lib/api/generated/models/index';
import { useRouter, useSearchParams } from 'next/navigation';
import { assignRecipeToDay } from '@/lib/api/planner';
import { cn } from '@/lib/utils';
import { t, tWithVars } from '@/locales';
import { RecipeDetailSheet } from '@/components/recipes/RecipeDetailSheet';
import { RecycleBinSheet } from '@/components/recipes/RecycleBinSheet';
import { BrowseLibraryTrigger } from '@/components/home/HomeSections';

/**
 * RecipesPage / Search destination.
 * Focuses on a search-first experience with a Top Pick highlight.
 */
export default function RecipesPage() {
  const [query, setQuery] = useState('');
  const [agentQuery, setAgentQuery] = useState('');
  const [isAgentOpen, setIsAgentOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCameraBusy, setIsCameraBusy] = useState(false);
  const [pantrySnapshotId, setPantrySnapshotId] = useState<string | null>(null);
  const [data, setData] = useState<RecipeSearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [openDetailRecipeId, setOpenDetailRecipeId] = useState<string | null>(null);
  const [similarToRecipeId, setSimilarToRecipeId] = useState<string | null>(null);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<RecipeSearchFiltersDto>({});
  const router = useRouter();
  const searchParams = useSearchParams();

  const addToDay = searchParams.get('addToDay');
  const weekOffset = searchParams.get('weekOffset');

  const parsedDayIndex = addToDay !== null ? parseInt(addToDay, 10) : undefined;
  const parsedWeekOffset = weekOffset !== null ? parseInt(weekOffset, 10) : undefined;

  const runSearch = async (
    nextQuery: string,
    nextSimilarToRecipeId?: string | null,
    nextFilters?: RecipeSearchFiltersDto,
    nextPantrySnapshotId?: string | null
  ) => {
    setIsLoading(true);
    try {
      const filters = nextFilters ?? activeFilters;
      const snapshotId = nextPantrySnapshotId ?? pantrySnapshotId;
      const response = await searchRecipes({
        query: nextQuery,
        mode: 'standard',
        limit: 5,
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
  };

  useEffect(() => {
    let isActive = true;

    void (async () => {
      try {
        const response = await searchRecipes({
          query: '',
          mode: 'standard',
          limit: 5,
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

  const handleOpenRecipe = (recipeId: string) => {
    setOpenDetailRecipeId(recipeId);
  };

  const handleAssignRecipe = async (recipe: Recipe) => {
    if (addToDay === null || weekOffset === null) {
      return;
    }

    setIsAssigning(true);
    try {
      await assignRecipeToDay(parseInt(weekOffset, 10), parseInt(addToDay, 10), {
        id: recipe.id,
        name: recipe.name,
        image: recipe.imageUrl,
      });
      router.push(`/planner?success=1&dayIndex=${addToDay}`);
    } catch (error) {
      console.error('Failed to assign recipe:', error);
      setIsAssigning(false);
    }
  };

  const handleFindSimilar = (recipeId: string) => {
    setOpenDetailRecipeId(null);
    setQuery('');
    void runSearch('', recipeId);
  };

  const handleAgentSubmit = () => {
    if (!agentQuery.trim()) return;
    setIsAgentOpen(false);
    setIsLoading(true);
    searchRecipes({
      query: agentQuery,
      mode: 'agent',
      limit: 5,
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

  const handleCameraSubmit = async (files: File[]) => {
    setIsCameraBusy(false);
    const result = await submitInventoryCapture(files);

    if ('busy' in result) {
      setIsCameraBusy(true);
      return;
    }

    setIsCameraOpen(false);
    setPantrySnapshotId(result.snapshotId);
    void runSearch(query, similarToRecipeId, activeFilters, result.snapshotId);
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

  return (
    <div className="flex flex-col gap-8 pb-12">
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
              {tWithVars(
                'recipes.selectMealForDay',
                `Select a meal for Day ${parseInt(addToDay) + 1}`,
                {
                  day: parseInt(addToDay) + 1,
                }
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
      {/* Search zone — always rendered so tests can locate it immediately */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative group mt-2"
      >
        <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-charcoal/30 group-focus-within:text-terracotta transition-colors z-10">
          <SearchIcon size={24} strokeWidth={2.5} />
        </div>
        <input
          type="text"
          value={query}
          data-testid="recipe-search-input"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
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

      <div className="flex flex-col gap-3 px-1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-testid="agent-search-trigger"
            onClick={() => setIsAgentOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-full border border-charcoal/10 bg-white/70 px-4 py-2 text-sm font-bold text-charcoal shadow-sm"
          >
            <Sparkles size={16} className="text-terracotta" />
            {t('recipes.agentSearch', 'Agent Search')}
          </button>
          <button
            type="button"
            data-testid="inventory-camera-trigger"
            onClick={() => {
              setIsCameraOpen(true);
              setIsCameraBusy(false);
            }}
            className="inline-flex items-center gap-2 rounded-full border border-charcoal/10 bg-white/70 px-4 py-2 text-sm font-bold text-charcoal shadow-sm"
          >
            <Camera size={16} className="text-terracotta" />
            {t('recipes.inventoryCamera', 'Use Camera')}
          </button>
        </div>

        {isAgentOpen && (
          <div className="flex flex-col gap-2">
            <textarea
              data-testid="agent-search-input"
              value={agentQuery}
              onChange={(e) => setAgentQuery(e.target.value)}
              placeholder={t(
                'recipes.agentSearchPlaceholder',
                'Describe what you feel like tonight in your own words…'
              )}
              rows={3}
              className="w-full rounded-2xl border-2 border-charcoal/10 bg-white/80 p-4 text-base font-medium text-charcoal placeholder:text-charcoal/30 focus:border-terracotta/30 focus:outline-none resize-none"
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
                onClick={() => setIsAgentOpen(false)}
                className="rounded-full border border-charcoal/10 bg-white/70 px-5 py-2 text-sm font-bold text-charcoal shadow-sm"
              >
                {t('recipes.cancel', 'Cancel')}
              </button>
            </div>
          </div>
        )}
      </div>

      {isCameraOpen && (
        <div
          data-testid="inventory-capture-popup"
          className="rounded-2xl border border-charcoal/10 bg-white/90 p-5 shadow-lg flex flex-col gap-4"
        >
          <p className="text-sm font-bold text-charcoal">
            {t('recipes.cameraPopupTitle', 'Take a photo of your pantry, fridge, or freezer')}
          </p>
          {isCameraBusy && (
            <p className="text-sm text-terracotta font-medium">
              {t('recipes.cameraBusy', "We're processing a lot right now. Try again in a moment.")}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="inventory-capture-submit"
              onClick={() => void handleCameraSubmit([])}
              className="rounded-full bg-terracotta px-5 py-2 text-sm font-bold text-white shadow-sm"
            >
              {t('recipes.cameraSubmit', 'Use Photo')}
            </button>
            <button
              type="button"
              data-testid="inventory-capture-cancel"
              onClick={() => setIsCameraOpen(false)}
              className="rounded-full border border-charcoal/10 bg-white/70 px-5 py-2 text-sm font-bold text-charcoal shadow-sm"
            >
              {t('recipes.cancel', 'Cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Quick filter pills */}
      <div className="flex flex-wrap gap-2 px-1">
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
            { key: 'quickOnly', label: t('recipes.filterQuick', 'Quick'), testId: 'filter-quick' },
            {
              key: 'notCookedInLongTime',
              label: t('recipes.filterNotCookedLong', "It's Been a While"),
              testId: 'filter-not-cooked-long-time',
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

      {/* Browse library trigger — requirement 1.2, 14.1 */}
      <BrowseLibraryTrigger testId="browse-all-stack-trigger" />

      {/* Results Section */}
      <div className="flex flex-col gap-6">
        {isLoading ? (
          <div className="flex h-48 w-full items-center justify-center">
            <Loader2 className="animate-spin text-ochre" size={48} data-testid="recipe-loader" />
          </div>
        ) : !data ? null : showEmptyState ? (
          <div
            data-testid={hasActiveFilters ? 'filter-no-results' : 'search-empty-state'}
            className="rounded-[2rem] border border-dashed border-charcoal/15 bg-white/60 p-8 text-center shadow-sm"
          >
            <p className="text-lg font-black tracking-tight text-charcoal">
              {hasActiveFilters
                ? t('recipes.filterNoResults', 'No matches with these filters. Try removing one.')
                : t(
                    'recipes.searchEmptyTitle',
                    'No matches yet. Try a different description or clear filters.'
                  )}
            </p>
            <button
              type="button"
              onClick={() => void runSearch('')}
              className="mt-4 inline-flex rounded-full bg-terracotta px-4 py-2 text-sm font-bold text-white shadow-sm"
            >
              {t('recipes.clearFilters', 'Clear Filters')}
            </button>
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

                <div className="relative w-full aspect-[16/10] min-h-[240px] rounded-[2.5rem] overflow-hidden shadow-2xl glass-solar border border-white/20">
                  <img
                    src={topPick.imageUrl || '/placeholder-recipe.jpg'}
                    alt={topPick.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/20 to-transparent opacity-90" />

                  <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-2.5 text-white z-10">
                    <div className="flex gap-2">
                      <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                        <Clock size={10} /> {topPick.totalTime}
                      </span>
                      <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                        <ChefHat size={10} /> {topPick.difficulty}
                      </span>
                    </div>
                    <h3 className="text-3xl font-black tracking-tighter leading-none">
                      {topPick.name}
                    </h3>
                    {topPick.reasons.length > 0 && (
                      <p className="text-white/70 text-sm font-medium line-clamp-2 max-w-[90%] leading-snug">
                        {topPick.reasons[0].label}
                      </p>
                    )}
                  </div>

                  <div className="absolute bottom-6 right-6 z-10">
                    <div className="h-12 w-12 rounded-full bg-white text-charcoal flex items-center justify-center shadow-xl transition-all group-hover:bg-terracotta group-hover:text-white group-hover:scale-110">
                      <ArrowRight size={24} />
                    </div>
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
                    'group flex flex-col gap-3 p-3 bg-white/50 backdrop-blur-sm rounded-[2rem] border border-charcoal/5 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95',
                    isAssigning && 'opacity-50 pointer-events-none'
                  )}
                >
                  <div className="relative aspect-[4/3] rounded-[1.5rem] overflow-hidden">
                    <img
                      src={recipe.imageUrl || '/placeholder-recipe.jpg'}
                      alt={recipe.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-110"
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
          </>
        )}
      </div>

      <div className="flex items-center justify-start px-1">
        <button
          type="button"
          data-testid="recycle-bin-entry"
          onClick={() => setIsTrashOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-charcoal/10 bg-white/70 px-4 py-2 text-sm font-bold text-charcoal shadow-sm"
        >
          <Trash2 size={16} className="text-terracotta" />
          {t('recipes.recycleBin', 'Recycle Bin')}
        </button>
      </div>

      <div className="sr-only" aria-hidden="true">
        {openDetailRecipeId}
        {similarToRecipeId}
      </div>

      {openDetailRecipeId && (
        <RecipeDetailSheet
          recipeId={openDetailRecipeId}
          plannerDayLabel={addToDay !== null ? `Day ${parseInt(addToDay, 10) + 1}` : null}
          onClose={() => setOpenDetailRecipeId(null)}
          onUseForDay={handleAssignRecipe}
          onFindSimilar={handleFindSimilar}
        />
      )}

      {isTrashOpen && <RecycleBinSheet onClose={() => setIsTrashOpen(false)} />}
    </div>
  );
}
