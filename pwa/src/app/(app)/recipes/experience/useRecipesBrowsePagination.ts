'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api/api-client';
import { GetOrderQueryParameterTypeObject } from '@/lib/api/generated/api/recipes/index';
import type { RecipeDto } from '@/lib/api/generated/models/index';
import { useBrowseStackStore } from '@/store/browseStackStore';
import {
  isHistoryExpired,
  LIST_PAGE_SIZE,
  STACK_PAGE_SIZE,
  type BrowseViewMode,
} from './recipesSearchHelpers';
import { useRecipesListInfiniteScroll } from './useRecipesListInfiniteScroll';

interface UseRecipesBrowsePaginationParams {
  browseViewMode: BrowseViewMode;
  isDiscoverableOnly: boolean;
  gotoOnly: boolean;
  appliedGotoVersion: number;
  browseRefreshVersion: number;
  searchActive: boolean;
  loadMoreSearch: (retry?: boolean) => Promise<void>;
  bumpStackRenderVersion: () => void;
  listScrollContainerRef: React.RefObject<HTMLDivElement | null>;
  listSentinelRef: React.RefObject<HTMLDivElement | null>;
}

export function useRecipesBrowsePagination({
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
}: UseRecipesBrowsePaginationParams) {
  const {
    recipes,
    currentIndex,
    totalCount,
    currentPage,
    hasMorePages,
    setRecipes,
    appendRecipes,
    setCurrentIndex,
    setTotalCount,
    reset,
  } = useBrowseStackStore();

  const [isEndCard, setIsEndCard] = useState(false);
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [prefetchFailed, setPrefetchFailed] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isWrappingToEnd, setIsWrappingToEnd] = useState(false);
  const [historyRestartRequired, setHistoryRestartRequired] = useState(false);
  const [stackPage, setStackPage] = useState(1);
  const [failedNavigation, setFailedNavigation] = useState<{ page: number; last: boolean } | null>(
    null
  );

  const allLibraryTotalRef = useRef<number | null>(null);
  const prefetchInFlightRef = useRef(false);
  const generationRef = useRef(0);
  const historyGenerationRef = useRef<string | undefined>(undefined);
  const stackPagesRef = useRef(new Map<number, RecipeDto[]>());
  const pageRequestsRef = useRef(new Map<number, Promise<RecipeDto[]>>());
  const navigationPendingRef = useRef(false);

  const isNavigationPending = useCallback(() => navigationPendingRef.current, []);
  const isPrefetchInFlight = useCallback(() => prefetchInFlightRef.current, []);
  const markPrefetchInFlight = useCallback(() => {
    prefetchInFlightRef.current = true;
  }, []);

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

        if (!append) {
          const summaryResult = await apiClient.api.recipes.librarySummary.get();
          if (generation !== generationRef.current) return;
          const total = summaryResult?.data?.total ?? 0;
          summaryTotalForRequest = total;
          allLibraryTotalRef.current = total;
        }

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
      bumpStackRenderVersion();
      setFailedNavigation(null);
      stackPagesRef.current.set(stackPage, useBrowseStackStore.getState().recipes);
      try {
        let target = page;
        let items = await getStackPage(target);
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
    [bumpStackRenderVersion, getStackPage, stackPage, setRecipes, setCurrentIndex, totalCount]
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

  const { handleListScroll } = useRecipesListInfiniteScroll({
    browseViewMode,
    currentPage,
    hasMorePages,
    isDiscoverableOnly,
    isInitialLoading,
    isPrefetching,
    searchActive,
    loadMoreSearch,
    isPrefetchInFlight,
    markPrefetchInFlight,
    fetchLibraryData,
    listScrollContainerRef,
    listSentinelRef,
  });

  return {
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
  };
}
