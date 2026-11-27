'use client';

import React, { useEffect, useRef, useState } from 'react';
import type {
  RecipeSearchFiltersDto,
  RecipeSearchPreferencesDto,
} from '@/lib/api/generated/models/index';
import type { searchRecipes } from '@/lib/api/recipes';
import { absoluteMonday } from '@/lib/deployment-calendar';
import { getFillTheGap } from '@/lib/api/planner';
import { useSearchPromotionStore } from '@/store/searchPromotionStore';
import { hasSearchIntent, type RecipesEntryContext } from './recipesSearchHelpers';

interface UseRecipesSearchSyncParams {
  searchParams: Pick<URLSearchParams, 'get' | 'has'>;
  entryContext: RecipesEntryContext;
  entryContextKey: string;
  detailRecipeId: string | null;
  searchControlsExpanded: boolean;
  setSearchControlsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  setSimilarToRecipeId: React.Dispatch<React.SetStateAction<string | null>>;
  activeFilters: RecipeSearchFiltersDto;
  activePreferences: RecipeSearchPreferencesDto;
  isDiscoverableOnly: boolean;
  setIsDiscoverableOnly: React.Dispatch<React.SetStateAction<boolean>>;
  gotoOnly: boolean;
  setGotoOnly: React.Dispatch<React.SetStateAction<boolean>>;
  searchActive: boolean;
  setBrowseRefreshVersion: React.Dispatch<React.SetStateAction<number>>;
  setStackRenderVersion: React.Dispatch<React.SetStateAction<number>>;
  clearSearchDebounce: () => void;
  getSubmittedSearchRequest: () => Parameters<typeof searchRecipes>[0] | null;
  runSearch: (
    nextQuery: string,
    nextFilters?: RecipeSearchFiltersDto,
    nextPreferences?: RecipeSearchPreferencesDto,
    nextScope?: { discoverableOnly: boolean; gotoOnly: boolean },
    nextSimilarTo?: string | null
  ) => Promise<void>;
  deactivateSearchFromUrlSync: () => void;
}

export function useRecipesSearchSync({
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
}: UseRecipesSearchSyncParams) {
  const fillTheGapReference =
    absoluteMonday(searchParams.get('referenceWeekStartDate')) ?? undefined;
  const [placeholderSuggestion, setPlaceholderSuggestion] = useState<string | null>(null);

  useEffect(() => {
    if (!searchControlsExpanded) return;
    let active = true;
    void Promise.resolve(
      fillTheGapReference ? getFillTheGap(0, fillTheGapReference) : getFillTheGap(0)
    )
      .then((suggestions) => {
        if (!active || !Array.isArray(suggestions)) return;
        const topName = suggestions
          .map((item) => item?.name?.trim())
          .find((name): name is string => Boolean(name));
        setPlaceholderSuggestion(topName ?? null);
      })
      .catch(() => {
        if (active) setPlaceholderSuggestion(null);
      });
    return () => {
      active = false;
    };
  }, [searchControlsExpanded, fillTheGapReference]);

  const searchPromotionVersion = useSearchPromotionStore((state) => state.version);
  const lastSearchPromotionVersionRef = useRef(searchPromotionVersion);
  const lastEntryContextRef = useRef(entryContext);
  const initialSimilarStartedRef = useRef(false);
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
  }, [searchControlsExpanded, detailRecipeId, searchInputRef]);

  useEffect(() => {
    if (lastSearchPromotionVersionRef.current === searchPromotionVersion) return;
    lastSearchPromotionVersionRef.current = searchPromotionVersion;
    const submitted = getSubmittedSearchRequest();
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
  }, [
    searchPromotionVersion,
    searchActive,
    runSearch,
    getSubmittedSearchRequest,
    setBrowseRefreshVersion,
  ]);

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
    clearSearchDebounce();
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
      deactivateSearchFromUrlSync();
      setBrowseRefreshVersion((version) => version + 1);
    }
    // This effect is gated by the URL context key; local toolbar edits do not re-enter it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryContextKey]);

  return { placeholderSuggestion };
}
