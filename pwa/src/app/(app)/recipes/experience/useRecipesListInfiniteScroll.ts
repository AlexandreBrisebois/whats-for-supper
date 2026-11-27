'use client';

import React, { useCallback, useEffect } from 'react';
import type { BrowseViewMode } from './recipesSearchHelpers';

interface UseRecipesListInfiniteScrollParams {
  browseViewMode: BrowseViewMode;
  currentPage: number;
  hasMorePages: boolean;
  isDiscoverableOnly: boolean;
  isInitialLoading: boolean;
  isPrefetching: boolean;
  searchActive: boolean;
  loadMoreSearch: (retry?: boolean) => Promise<void>;
  isPrefetchInFlight: () => boolean;
  markPrefetchInFlight: () => void;
  fetchLibraryData: (
    page: number,
    discoverable: boolean,
    append?: boolean,
    restart?: boolean
  ) => Promise<void>;
  listScrollContainerRef: React.RefObject<HTMLDivElement | null>;
  listSentinelRef: React.RefObject<HTMLDivElement | null>;
}

export function useRecipesListInfiniteScroll({
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
}: UseRecipesListInfiniteScrollParams) {
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
      isPrefetchInFlight()
    ) {
      return;
    }

    markPrefetchInFlight();
    Promise.resolve().then(() => {
      void fetchLibraryData(currentPage + 1, isDiscoverableOnly, true);
    });
  }, [
    searchActive,
    loadMoreSearch,
    browseViewMode,
    isInitialLoading,
    isPrefetching,
    hasMorePages,
    isPrefetchInFlight,
    markPrefetchInFlight,
    fetchLibraryData,
    currentPage,
    isDiscoverableOnly,
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
  }, [browseViewMode, loadNextListPage, listScrollContainerRef, listSentinelRef]);

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

  return { handleListScroll };
}
