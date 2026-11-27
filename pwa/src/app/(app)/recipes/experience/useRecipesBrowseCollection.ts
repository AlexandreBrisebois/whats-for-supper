'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { updateRecipe, type RecipeSearchResponse } from '@/lib/api/recipes';
import type { RecipeDto } from '@/lib/api/generated/models/index';
import { useBrowseStackStore } from '@/store/browseStackStore';
import { useFamilyStore } from '@/store/familyStore';
import { STACK_PAGE_SIZE, type BrowseViewMode } from './recipesSearchHelpers';
import { useRecipesBrowsePagination } from './useRecipesBrowsePagination';

export function useBrowseViewModeState() {
  const { familyMembers, selectedFamilyMemberId, loadFamilyMembers, updateMemberPreferences } =
    useFamilyStore();
  const gotoMembershipVersion = useFamilyStore((state) => state.gotoMembershipVersion);
  const selectedMember = familyMembers.find((member) => member.id === selectedFamilyMemberId);
  const savedBrowseViewMode: BrowseViewMode =
    selectedMember?.browseViewMode === 'stack' ? 'stack' : 'list';
  const [browseViewModeOverride, setBrowseViewModeOverride] = useState<{
    memberId: string | null;
    mode: BrowseViewMode;
  } | null>(null);
  const browseViewMode: BrowseViewMode =
    browseViewModeOverride?.memberId === selectedFamilyMemberId
      ? browseViewModeOverride.mode
      : savedBrowseViewMode;

  useEffect(() => {
    if (selectedFamilyMemberId && familyMembers.length === 0) {
      void loadFamilyMembers();
    }
  }, [familyMembers.length, loadFamilyMembers, selectedFamilyMemberId]);

  return {
    browseViewMode,
    selectedFamilyMemberId,
    gotoMembershipVersion,
    setBrowseViewModeOverride,
    updateMemberPreferences,
  };
}

interface UseRecipesBrowseCollectionParams {
  viewModeState: ReturnType<typeof useBrowseViewModeState>;
  isDiscoverableOnly: boolean;
  gotoOnly: boolean;
  browseRefreshVersion: number;
  searchActive: boolean;
  searchData: RecipeSearchResponse | null;
  searchIndex: number;
  setSearchIndex: React.Dispatch<React.SetStateAction<number>>;
  loadMoreSearch: (retry?: boolean) => Promise<void>;
  bumpStackRenderVersion: () => void;
  recipesViewportRef: React.RefObject<HTMLDivElement | null>;
  listScrollContainerRef: React.RefObject<HTMLDivElement | null>;
  listSentinelRef: React.RefObject<HTMLDivElement | null>;
}

export function useRecipesBrowseCollection({
  viewModeState,
  isDiscoverableOnly,
  gotoOnly,
  browseRefreshVersion,
  searchActive,
  searchData,
  searchIndex,
  setSearchIndex,
  loadMoreSearch,
  bumpStackRenderVersion,
  recipesViewportRef,
  listScrollContainerRef,
  listSentinelRef,
}: UseRecipesBrowseCollectionParams) {
  const {
    browseViewMode,
    selectedFamilyMemberId,
    gotoMembershipVersion,
    setBrowseViewModeOverride,
    updateMemberPreferences,
  } = viewModeState;
  const appliedGotoVersion = gotoOnly ? gotoMembershipVersion : 0;

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
  }, [recipesViewportRef]);

  const pagination = useRecipesBrowsePagination({
    browseViewMode,
    isDiscoverableOnly,
    gotoOnly,
    appliedGotoVersion,
    browseRefreshVersion,
    searchActive,
    loadMoreSearch,
    bumpStackRenderVersion,
    listScrollContainerRef,
    listSentinelRef,
  });

  const {
    recipes,
    currentIndex,
    setCurrentIndex,
    totalCount,
    isEndCard,
    setIsEndCard,
    isPrefetching,
    isInitialLoading,
    loadError,
    isWrappingToEnd,
    historyRestartRequired,
    stackPage,
    failedNavigation,
    isNavigationPending,
    fetchLibraryData,
    navigatePage,
    handleListScroll,
  } = pagination;

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
    if (isNavigationPending()) return;
    if (currentIndex < recipes.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      void navigatePage(
        stackPage < Math.ceil(totalCount / STACK_PAGE_SIZE) ? stackPage + 1 : 1,
        false
      );
    }
  }, [
    searchActive,
    searchData,
    searchIndex,
    setSearchIndex,
    loadMoreSearch,
    isNavigationPending,
    currentIndex,
    recipes.length,
    setCurrentIndex,
    navigatePage,
    stackPage,
    totalCount,
  ]);

  const handleSwipeRight = useCallback(() => {
    if (searchActive) {
      if (searchIndex > 0) setSearchIndex(searchIndex - 1);
      return;
    }
    if (isNavigationPending()) return;
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
    else
      void navigatePage(
        stackPage > 1 ? stackPage - 1 : Math.max(1, Math.ceil(totalCount / STACK_PAGE_SIZE)),
        true
      );
  }, [
    searchActive,
    searchIndex,
    setSearchIndex,
    isNavigationPending,
    currentIndex,
    setCurrentIndex,
    navigatePage,
    stackPage,
    totalCount,
  ]);

  const handleIndividualToggleDiscoverable = useCallback(
    async (recipeId: string, newValue: boolean) => {
      await updateRecipe(recipeId, { isDiscoverable: newValue });
      useBrowseStackStore.setState((state) => ({
        recipes: state.recipes.map((recipe) =>
          recipe.id === recipeId ? { ...recipe, isDiscoverable: newValue } : recipe
        ),
      }));
    },
    []
  );

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
    [
      browseViewMode,
      selectedFamilyMemberId,
      setBrowseViewModeOverride,
      setIsEndCard,
      setCurrentIndex,
      setSearchIndex,
      updateMemberPreferences,
    ]
  );

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

  const activeOffset = searchActive ? searchIndex : currentIndex;
  const currentRecipe = visibleRecipes[activeOffset] ?? null;
  const globalIndex = searchActive ? searchIndex : (stackPage - 1) * STACK_PAGE_SIZE + currentIndex;
  const displayTotal = searchActive ? visibleRecipes.length : totalCount;
  const stackVisibleRecipes = visibleRecipes.slice(activeOffset, activeOffset + 4);

  const isEmpty =
    !searchActive &&
    !isInitialLoading &&
    !loadError &&
    recipes.length === 0 &&
    !isDiscoverableOnly &&
    !gotoOnly;

  return {
    browseViewMode,
    recipes,
    isEndCard,
    isPrefetching,
    isInitialLoading,
    loadError,
    isWrappingToEnd,
    historyRestartRequired,
    failedNavigation,
    visibleRecipes,
    currentRecipe,
    globalIndex,
    displayTotal,
    stackVisibleRecipes,
    isEmpty,
    fetchLibraryData,
    navigatePage,
    handleListScroll,
    handleSwipeLeft,
    handleSwipeRight,
    handleIndividualToggleDiscoverable,
    handleViewModeChange,
  };
}
