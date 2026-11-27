'use client';

import React, { useCallback, useState } from 'react';
import type { RecipeFilterDraft } from '@/components/recipes/RecipeFiltersSheet';
import type { RecipeSearchFilterDiscoveryDto } from '@/lib/api/generated/models/index';
import {
  appliedSelectionCount,
  hasSearchIntent,
  type BrowseViewMode,
  type RecipesEntryContext,
} from './recipesSearchHelpers';
import { useRecipesSearchExecution } from './useRecipesSearchExecution';
import { useRecipesSearchInteractions } from './useRecipesSearchInteractions';
import { useRecipesSearchSync } from './useRecipesSearchSync';

interface UseRecipesSearchControllerParams {
  searchParams: Pick<URLSearchParams, 'get' | 'has'>;
  entryContext: RecipesEntryContext;
  entryContextKey: string;
  detailRecipeId: string | null;
  browseViewMode: BrowseViewMode;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  searchTriggerRef: React.RefObject<HTMLButtonElement | null>;
  filtersTriggerRef: React.RefObject<HTMLButtonElement | null>;
  listScrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

export function useRecipesSearchController({
  searchParams,
  entryContext,
  entryContextKey,
  detailRecipeId,
  browseViewMode,
  searchInputRef,
  searchTriggerRef,
  filtersTriggerRef,
  listScrollContainerRef,
}: UseRecipesSearchControllerParams) {
  const [gotoOnly, setGotoOnly] = useState(() => searchParams.get('gotoOnly') === 'true');
  const [browseRefreshVersion, setBrowseRefreshVersion] = useState(0);
  const [isDiscoverableOnly, setIsDiscoverableOnly] = useState(
    () => searchParams.get('discoverableOnly') === 'true'
  );
  const [stackRenderVersion, setStackRenderVersion] = useState(0);
  const bumpStackRenderVersion = useCallback(
    () => setStackRenderVersion((version) => version + 1),
    []
  );

  const [searchControlsExpanded, setSearchControlsExpanded] = useState(
    () =>
      searchParams.get('focus') === 'search' ||
      searchParams.has('similarTo') ||
      searchParams.has('addToDay')
  );
  const [filterMetadata, setFilterMetadata] = useState<RecipeSearchFilterDiscoveryDto | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const execution = useRecipesSearchExecution({
    initialSimilarTo: searchParams.get('similarTo'),
    isDiscoverableOnly,
    gotoOnly,
    weekOffset: entryContext.weekOffset,
    addToDay: entryContext.addToDay,
    browseViewMode,
  });

  const {
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
  } = execution;

  const { placeholderSuggestion } = useRecipesSearchSync({
    searchParams,
    entryContext,
    entryContextKey,
    detailRecipeId,
    searchControlsExpanded,
    setSearchControlsExpanded,
    searchInputRef,
    query,
    setQuery,
    setSimilarToRecipeId,
    activeFilters,
    activePreferences,
    isDiscoverableOnly,
    setIsDiscoverableOnly,
    gotoOnly,
    setGotoOnly,
    searchActive,
    setBrowseRefreshVersion,
    setStackRenderVersion,
    clearSearchDebounce,
    getSubmittedSearchRequest,
    runSearch,
    deactivateSearchFromUrlSync,
  });

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
        deactivateSearchFromFilterApply();
        setBrowseRefreshVersion((version) => version + 1);
        return;
      }
      void runSearch(query, searchFilters, preferences, {
        discoverableOnly: nextDiscovery,
        gotoOnly: nextGoto,
      });
    },
    [
      setActiveFilters,
      setActivePreferences,
      filtersTriggerRef,
      query,
      similarToRecipeId,
      deactivateSearchFromFilterApply,
      runSearch,
    ]
  );

  const clearSearch = useCallback(() => {
    resetAllSearchState();
    requestAnimationFrame(() => searchInputRef.current?.focus({ preventScroll: true }));
  }, [resetAllSearchState, searchInputRef]);

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
  }, [setActiveFilters, setActivePreferences, query, similarToRecipeId, runSearch, clearSearch]);

  const interactions = useRecipesSearchInteractions({
    query,
    setQuery,
    similarToRecipeId,
    setSimilarToRecipeId,
    activeFilters,
    activePreferences,
    isDiscoverableOnly,
    setIsDiscoverableOnly,
    gotoOnly,
    setGotoOnly,
    searchActive,
    searchControlsExpanded,
    setSearchControlsExpanded,
    filterMetadata,
    setFilterMetadata,
    setIsFiltersOpen,
    setBrowseRefreshVersion,
    setStackRenderVersion,
    clearSearchDebounce,
    scheduleDebouncedSearch,
    runSearch,
    deactivateInlineSearch,
    searchInputRef,
    searchTriggerRef,
    filtersTriggerRef,
    listScrollContainerRef,
  });

  const appliedCount = appliedSelectionCount(
    activeFilters,
    activePreferences,
    isDiscoverableOnly,
    gotoOnly
  );

  return {
    gotoOnly,
    setGotoOnly,
    isDiscoverableOnly,
    browseRefreshVersion,
    stackRenderVersion,
    bumpStackRenderVersion,
    searchControlsExpanded,
    placeholderSuggestion,
    query,
    similarToRecipeId,
    searchActive,
    searchData,
    searchLoading,
    searchError,
    searchLoadMoreError,
    searchLoadingMore,
    searchIndex,
    setSearchIndex,
    activeFilters,
    activePreferences,
    filterMetadata,
    isFiltersOpen,
    appliedCount,
    runSearch,
    loadMoreSearch,
    applyFilters,
    clearSearch,
    clearSearchFilters,
    ...interactions,
  };
}
