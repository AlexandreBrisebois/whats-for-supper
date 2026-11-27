'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { RecipeImportIssueBadge } from '@/components/recipes/RecipeImportIssueBadge';
import { Button } from '@/components/ui/button';
import type { RecipeDto } from '@/lib/api/generated/models/index';
import { formatRecipeTime } from '@/lib/duration';
import { getImageUrl } from '@/lib/imageUtils';
import { t, tWithVars } from '@/locales';

interface RecipesListViewProps {
  visibleRecipes: RecipeDto[];
  searchActive: boolean;
  hasSearchData: boolean;
  isPrefetching: boolean;
  searchLoadingMore: boolean;
  searchLoadMoreError: boolean;
  listScrollContainerRef: React.RefObject<HTMLDivElement | null>;
  listSentinelRef: React.RefObject<HTMLDivElement | null>;
  onListScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  onCardTap: (recipeId: string) => void;
  onRetryLoadMoreSearch: () => void;
}

export function RecipesListView({
  visibleRecipes,
  searchActive,
  hasSearchData,
  isPrefetching,
  searchLoadingMore,
  searchLoadMoreError,
  listScrollContainerRef,
  listSentinelRef,
  onListScroll,
  onCardTap,
  onRetryLoadMoreSearch,
}: RecipesListViewProps) {
  return (
    <div
      ref={listScrollContainerRef}
      data-testid="browse-list-scroll-container"
      onScroll={onListScroll}
      className="w-full max-w-6xl flex-1 min-h-0 overflow-y-auto px-1 pb-8"
    >
      {searchActive && hasSearchData && (
        <h2 className="mb-3 font-heading text-lg font-bold text-ink-muted">
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
            data-recipe-id={recipe.id}
            onClick={() => onCardTap(recipe.id!)}
            className="group flex flex-col justify-start items-stretch overflow-hidden rounded-lg bg-white/85 text-left shadow-sm border border-charcoal/8 backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body focus:ring-2 focus:ring-ochre focus:ring-offset-2"
          >
            <div className="relative aspect-[4/3] bg-sage/10 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getImageUrl(searchActive ? recipe.imageUrl : `/api/recipes/${recipe.id}/hero`)}
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
              <p className="line-clamp-2 text-sm font-black leading-tight text-ink-body">
                {recipe.name}
              </p>
              <p className="mt-1 text-xs font-semibold text-ink-muted">
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
          <Loader2 className="animate-spin motion-reduce:animate-none text-hearth-ink" size={28} />
        </div>
      )}
      {searchActive && searchLoadingMore && (
        <p role="status">{t('recipes.loadingMore', 'Loading more…')}</p>
      )}
      {searchActive && searchLoadMoreError && (
        <div
          role="alert"
          data-testid="search-load-more-error"
          className="mt-3 flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-hearth-line bg-terracotta-50 px-4 py-3 text-center text-sm text-ink-body shadow-sm"
        >
          <p className="font-medium text-hearth-ink">
            {t('recipes.searchFailed', 'Could not load recipes. Try again.')}
          </p>
          <Button
            type="button"
            variant="primary"
            size="md"
            data-testid="search-load-more-retry"
            className="max-w-full whitespace-normal text-center"
            onClick={onRetryLoadMoreSearch}
          >
            {t('common.retry', 'Retry')}
          </Button>
        </div>
      )}
    </div>
  );
}
