'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { searchRecipes, type RecipeSearchResponse } from '@/lib/api/recipes';
import type {
  RecipeSearchFiltersDto,
  RecipeSearchPreferencesDto,
} from '@/lib/api/generated/models/index';
import type { BrowseViewMode } from './recipesSearchHelpers';

interface UseRecipesSearchExecutionParams {
  initialSimilarTo: string | null;
  isDiscoverableOnly: boolean;
  gotoOnly: boolean;
  weekOffset: string | null;
  addToDay: string | null;
  browseViewMode: BrowseViewMode;
}

export function useRecipesSearchExecution({
  initialSimilarTo,
  isDiscoverableOnly,
  gotoOnly,
  weekOffset,
  addToDay,
  browseViewMode,
}: UseRecipesSearchExecutionParams) {
  const [query, setQuery] = useState('');
  const [similarToRecipeId, setSimilarToRecipeId] = useState<string | null>(() => initialSimilarTo);
  const [searchActive, setSearchActive] = useState(() => Boolean(initialSimilarTo));
  const [searchData, setSearchData] = useState<RecipeSearchResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [searchLoadMoreError, setSearchLoadMoreError] = useState(false);
  const [searchLoadingMore, setSearchLoadingMore] = useState(false);
  const [searchIndex, setSearchIndex] = useState(0);
  const [activeFilters, setActiveFilters] = useState<RecipeSearchFiltersDto>({});
  const [activePreferences, setActivePreferences] = useState<RecipeSearchPreferencesDto>({});

  const searchGenerationRef = useRef(0);
  const searchContinuationRef = useRef(false);
  const searchCursorRestartedRef = useRef(false);
  const lastContinuationExpiredRef = useRef(false);
  const searchRequestRef = useRef<Parameters<typeof searchRecipes>[0] | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lifecycleTrackerRef = useRef({ activeId: 0 });

  const clearSearchDebounce = useCallback(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = null;
  }, []);

  const scheduleDebouncedSearch = useCallback((callback: () => void, delayMs = 500) => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(callback, delayMs);
  }, []);

  const getSubmittedSearchRequest = useCallback(() => searchRequestRef.current, []);

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
      searchCursorRestartedRef.current = false;
      lastContinuationExpiredRef.current = false;
      setSearchLoadingMore(false);
      setSearchLoadMoreError(false);
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

  const loadMoreSearch = useCallback(
    async (retry = false) => {
      const cursor = searchData?.nextCursor;
      const request = searchRequestRef.current;
      const useFreshSearch = retry && lastContinuationExpiredRef.current;
      if (
        !searchActive ||
        searchLoading ||
        (!cursor && !useFreshSearch) ||
        !request ||
        searchContinuationRef.current ||
        (!retry && searchLoadMoreError)
      )
        return;
      const generation = searchGenerationRef.current;
      searchContinuationRef.current = true;
      setSearchLoadingMore(true);
      setSearchLoadMoreError(false);
      try {
        if (useFreshSearch) {
          const fresh = await searchRecipes(request);
          if (generation !== searchGenerationRef.current) return;
          searchCursorRestartedRef.current = false;
          lastContinuationExpiredRef.current = false;
          setSearchData(fresh);
          setSearchIndex(0);
          return;
        }
        const response = await searchRecipes({
          ...request,
          continuationToken: cursor!,
          limit: searchData?.resultPath === 'browse' ? 24 : 12,
        });
        if (generation !== searchGenerationRef.current) return;
        searchCursorRestartedRef.current = false;
        lastContinuationExpiredRef.current = false;
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
        if (status === 409 && !useFreshSearch && !searchCursorRestartedRef.current) {
          searchCursorRestartedRef.current = true;
          lastContinuationExpiredRef.current = true;
          try {
            const restarted = await searchRecipes(request);
            if (generation !== searchGenerationRef.current) return;
            lastContinuationExpiredRef.current = false;
            setSearchData(restarted);
            setSearchIndex(0);
            setSearchLoadMoreError(false);
            return;
          } catch {
            if (generation !== searchGenerationRef.current) return;
            setSearchLoadMoreError(true);
            return;
          }
        }
        if (status === 409) lastContinuationExpiredRef.current = true;
        setSearchLoadMoreError(true);
      } finally {
        if (generation === searchGenerationRef.current) {
          searchContinuationRef.current = false;
          setSearchLoadingMore(false);
        }
      }
    },
    [searchActive, searchLoading, searchData, browseViewMode, searchLoadMoreError]
  );

  const deactivateSearchFromUrlSync = useCallback(() => {
    searchGenerationRef.current += 1;
    searchContinuationRef.current = false;
    searchCursorRestartedRef.current = false;
    lastContinuationExpiredRef.current = false;
    searchRequestRef.current = null;
    setSearchActive(false);
    setSearchData(null);
    setSearchIndex(0);
    setSearchError(false);
    setSearchLoading(false);
    setSearchLoadingMore(false);
  }, []);

  const deactivateSearchFromFilterApply = useCallback(() => {
    searchGenerationRef.current += 1;
    setSearchActive(false);
    setSearchData(null);
    setSearchIndex(0);
  }, []);

  const deactivateInlineSearch = useCallback((resetContinuationFlags: boolean) => {
    searchGenerationRef.current += 1;
    if (resetContinuationFlags) {
      searchContinuationRef.current = false;
      searchCursorRestartedRef.current = false;
      lastContinuationExpiredRef.current = false;
    }
    searchRequestRef.current = null;
    setSearchData(null);
    setSearchIndex(0);
    setSearchActive(false);
  }, []);

  const resetAllSearchState = useCallback(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = null;
    searchGenerationRef.current += 1;
    searchRequestRef.current = null;
    searchContinuationRef.current = false;
    searchCursorRestartedRef.current = false;
    lastContinuationExpiredRef.current = false;
    setQuery('');
    setSimilarToRecipeId(null);
    setActiveFilters({});
    setActivePreferences({});
    setSearchData(null);
    setSearchIndex(0);
    setSearchError(false);
    setSearchLoadMoreError(false);
    setSearchLoading(false);
    setSearchLoadingMore(false);
    setSearchActive(false);
  }, []);

  useEffect(() => {
    const tracker = lifecycleTrackerRef.current;
    const lifecycle = ++tracker.activeId;
    return () =>
      queueMicrotask(() => {
        if (tracker.activeId !== lifecycle) return;
        searchGenerationRef.current += 1;
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      });
  }, []);

  return {
    query,
    setQuery,
    similarToRecipeId,
    setSimilarToRecipeId,
    searchActive,
    searchData,
    searchLoading,
    searchError,
    searchLoadMoreError,
    searchLoadingMore,
    searchIndex,
    setSearchIndex,
    activeFilters,
    setActiveFilters,
    activePreferences,
    setActivePreferences,
    clearSearchDebounce,
    scheduleDebouncedSearch,
    getSubmittedSearchRequest,
    runSearch,
    loadMoreSearch,
    deactivateSearchFromUrlSync,
    deactivateSearchFromFilterApply,
    deactivateInlineSearch,
    resetAllSearchState,
  };
}
