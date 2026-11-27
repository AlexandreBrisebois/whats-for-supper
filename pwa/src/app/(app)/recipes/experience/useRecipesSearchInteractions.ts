'use client';

import React, { useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api/api-client';
import type {
  RecipeSearchFilterDiscoveryDto,
  RecipeSearchFiltersDto,
  RecipeSearchPreferencesDto,
} from '@/lib/api/generated/models/index';
import { hasSearchIntent } from './recipesSearchHelpers';

interface UseRecipesSearchInteractionsParams {
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  similarToRecipeId: string | null;
  setSimilarToRecipeId: React.Dispatch<React.SetStateAction<string | null>>;
  activeFilters: RecipeSearchFiltersDto;
  activePreferences: RecipeSearchPreferencesDto;
  isDiscoverableOnly: boolean;
  setIsDiscoverableOnly: React.Dispatch<React.SetStateAction<boolean>>;
  gotoOnly: boolean;
  setGotoOnly: React.Dispatch<React.SetStateAction<boolean>>;
  searchActive: boolean;
  searchControlsExpanded: boolean;
  setSearchControlsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  filterMetadata: RecipeSearchFilterDiscoveryDto | null;
  setFilterMetadata: React.Dispatch<React.SetStateAction<RecipeSearchFilterDiscoveryDto | null>>;
  setIsFiltersOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setBrowseRefreshVersion: React.Dispatch<React.SetStateAction<number>>;
  setStackRenderVersion: React.Dispatch<React.SetStateAction<number>>;
  clearSearchDebounce: () => void;
  scheduleDebouncedSearch: (callback: () => void, delayMs?: number) => void;
  runSearch: (
    nextQuery: string,
    nextFilters?: RecipeSearchFiltersDto,
    nextPreferences?: RecipeSearchPreferencesDto,
    nextScope?: { discoverableOnly: boolean; gotoOnly: boolean },
    nextSimilarTo?: string | null
  ) => Promise<void>;
  deactivateInlineSearch: (resetContinuationFlags: boolean) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  searchTriggerRef: React.RefObject<HTMLButtonElement | null>;
  filtersTriggerRef: React.RefObject<HTMLButtonElement | null>;
  listScrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

export function useRecipesSearchInteractions({
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
}: UseRecipesSearchInteractionsParams) {
  const listScrollRestoreRef = useRef<number | null>(null);

  const handleToggleSearchControls = useCallback(() => {
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
  }, [
    setStackRenderVersion,
    searchControlsExpanded,
    listScrollContainerRef,
    setSearchControlsExpanded,
    searchTriggerRef,
    searchInputRef,
  ]);

  const handleSearchQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      clearSearchDebounce();
      if (value.trim()) setSimilarToRecipeId(null);
      const nextSimilar = value.trim() ? null : similarToRecipeId;
      if (hasSearchIntent(value, activeFilters, activePreferences, nextSimilar)) {
        scheduleDebouncedSearch(
          () =>
            void runSearch(
              value,
              activeFilters,
              activePreferences,
              { discoverableOnly: isDiscoverableOnly, gotoOnly },
              nextSimilar
            ),
          500
        );
      } else if (searchActive && !similarToRecipeId) {
        deactivateInlineSearch(true);
      }
    },
    [
      setQuery,
      clearSearchDebounce,
      setSimilarToRecipeId,
      similarToRecipeId,
      activeFilters,
      activePreferences,
      scheduleDebouncedSearch,
      runSearch,
      isDiscoverableOnly,
      gotoOnly,
      searchActive,
      deactivateInlineSearch,
    ]
  );

  const handleSearchInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSearchControlsExpanded(false);
        searchTriggerRef.current?.focus({ preventScroll: true });
        return;
      }
      if (event.key !== 'Enter') return;
      clearSearchDebounce();
      if (hasSearchIntent(query, activeFilters, activePreferences, similarToRecipeId))
        void runSearch(
          query,
          activeFilters,
          activePreferences,
          { discoverableOnly: isDiscoverableOnly, gotoOnly },
          query.trim() ? null : similarToRecipeId
        );
      event.currentTarget.blur();
    },
    [
      setSearchControlsExpanded,
      searchTriggerRef,
      clearSearchDebounce,
      query,
      activeFilters,
      activePreferences,
      similarToRecipeId,
      runSearch,
      isDiscoverableOnly,
      gotoOnly,
    ]
  );

  const handleOpenFilters = useCallback(() => {
    setIsFiltersOpen(true);
    if (!filterMetadata)
      void apiClient.api.recipes.search.filters
        .get()
        .then((metadata) => setFilterMetadata(metadata ?? null))
        .catch(() => {});
  }, [setIsFiltersOpen, filterMetadata, setFilterMetadata]);

  const handleCloseFilters = useCallback(() => {
    setIsFiltersOpen(false);
    filtersTriggerRef.current?.focus({ preventScroll: true });
  }, [setIsFiltersOpen, filtersTriggerRef]);

  const handleRemoveSimilarChip = useCallback(() => {
    setSimilarToRecipeId(null);
    clearSearchDebounce();
    if (hasSearchIntent(query, activeFilters, activePreferences))
      void runSearch(
        query,
        activeFilters,
        activePreferences,
        { discoverableOnly: isDiscoverableOnly, gotoOnly },
        null
      );
    else deactivateInlineSearch(false);
  }, [
    setSimilarToRecipeId,
    clearSearchDebounce,
    query,
    activeFilters,
    activePreferences,
    runSearch,
    isDiscoverableOnly,
    gotoOnly,
    deactivateInlineSearch,
  ]);

  const handleFindSimilar = useCallback(
    (recipeId: string) => {
      setQuery('');
      setSimilarToRecipeId(recipeId);
      setSearchControlsExpanded(true);
      clearSearchDebounce();
      void runSearch(
        '',
        activeFilters,
        activePreferences,
        { discoverableOnly: isDiscoverableOnly, gotoOnly },
        recipeId
      );
    },
    [
      setQuery,
      setSimilarToRecipeId,
      setSearchControlsExpanded,
      clearSearchDebounce,
      runSearch,
      activeFilters,
      activePreferences,
      isDiscoverableOnly,
      gotoOnly,
    ]
  );

  const handleGlobalToggleDiscoverable = useCallback(() => {
    setStackRenderVersion((version) => version + 1);
    const next = !isDiscoverableOnly;
    setIsDiscoverableOnly(next);
    if (searchActive)
      void runSearch(query, activeFilters, activePreferences, { discoverableOnly: next, gotoOnly });
  }, [
    setStackRenderVersion,
    isDiscoverableOnly,
    setIsDiscoverableOnly,
    searchActive,
    runSearch,
    query,
    activeFilters,
    activePreferences,
    gotoOnly,
  ]);

  const handleToggleGotoOnly = useCallback(() => {
    setStackRenderVersion((version) => version + 1);
    const next = !gotoOnly;
    setGotoOnly(next);
    if (searchActive)
      void runSearch(query, activeFilters, activePreferences, {
        discoverableOnly: isDiscoverableOnly,
        gotoOnly: next,
      });
  }, [
    setStackRenderVersion,
    gotoOnly,
    setGotoOnly,
    searchActive,
    runSearch,
    query,
    activeFilters,
    activePreferences,
    isDiscoverableOnly,
  ]);

  const handleRecipeDeleted = useCallback(() => {
    if (searchActive)
      void runSearch(query, activeFilters, activePreferences, {
        discoverableOnly: isDiscoverableOnly,
        gotoOnly,
      });
    else setBrowseRefreshVersion((version) => version + 1);
  }, [
    searchActive,
    runSearch,
    query,
    activeFilters,
    activePreferences,
    isDiscoverableOnly,
    gotoOnly,
    setBrowseRefreshVersion,
  ]);

  return {
    handleToggleSearchControls,
    handleSearchQueryChange,
    handleSearchInputKeyDown,
    handleOpenFilters,
    handleCloseFilters,
    handleRemoveSimilarChip,
    handleFindSimilar,
    handleGlobalToggleDiscoverable,
    handleToggleGotoOnly,
    handleRecipeDeleted,
  };
}
