'use client';

import { Loader2 } from 'lucide-react';
import { EndCard } from '@/components/recipes/EndCard';
import { Button } from '@/components/ui/button';
import type {
  RecipeSearchFiltersDto,
  RecipeSearchPreferencesDto,
} from '@/lib/api/generated/models/index';
import { t } from '@/locales';

interface RecipesStatusAndEmptyStatesProps {
  searchActive: boolean;
  searchLoading: boolean;
  hasSearchData: boolean;
  searchError: boolean;
  isInitialLoading: boolean;
  recipesCount: number;
  visibleRecipesCount: number;
  loadError: boolean;
  historyRestartRequired: boolean;
  isPrefetching: boolean;
  gotoOnly: boolean;
  isEmpty: boolean;
  activeFilters: RecipeSearchFiltersDto;
  activePreferences: RecipeSearchPreferencesDto;
  onRetryBrowse: () => void;
  onRestartFromFirstPage: () => void;
  onClearGotoOnly: () => void;
  onRetrySearch: () => void;
  onClearSearchFilters: () => void;
  onClearSearch: () => void;
}

export function RecipesStatusAndEmptyStates({
  searchActive,
  searchLoading,
  hasSearchData,
  searchError,
  isInitialLoading,
  recipesCount,
  visibleRecipesCount,
  loadError,
  historyRestartRequired,
  isPrefetching,
  gotoOnly,
  isEmpty,
  activeFilters,
  activePreferences,
  onRetryBrowse,
  onRestartFromFirstPage,
  onClearGotoOnly,
  onRetrySearch,
  onClearSearchFilters,
  onClearSearch,
}: RecipesStatusAndEmptyStatesProps) {
  return (
    <>
      {(searchActive
        ? searchLoading && !hasSearchData
        : isInitialLoading && recipesCount === 0) && (
        <div className="flex flex-col items-center gap-4">
          <Loader2
            data-testid="browse-all-loader"
            className="animate-spin motion-reduce:animate-none text-hearth-ink"
            size={48}
          />
          <p className="text-sm font-medium text-ink-muted">
            {searchActive
              ? t('recipes.searchLoading', 'Searching…')
              : t('recipes.libraryLoading', 'Loading your library…')}
          </p>
        </div>
      )}

      {!searchActive && !isInitialLoading && loadError && (
        <div
          data-testid="browse-request-error"
          role="alert"
          className="mx-4 flex max-w-md flex-col items-center gap-4 rounded-2xl border border-hearth-line bg-terracotta-50 p-6 text-center text-ink-body shadow-sm"
        >
          <p className="font-heading text-base font-bold text-hearth-ink">
            {t('recipes.browseFailed', 'Failed to load recipes.')}
          </p>
          <Button
            type="button"
            variant="primary"
            size="md"
            data-testid="browse-request-retry"
            onClick={onRetryBrowse}
          >
            {t('common.retry', 'Retry')}
          </Button>
        </div>
      )}

      {!searchActive && historyRestartRequired && (
        <div
          role="status"
          className="mx-4 max-w-md space-y-3 rounded-2xl border border-chrome-line bg-white p-5 text-center text-sm text-ink-body shadow-sm"
        >
          <p>
            {t(
              'recipes.orderChanged',
              'Recipe order changed. Your current cards are kept until the first page reloads.'
            )}
          </p>
          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={isPrefetching}
            onClick={onRestartFromFirstPage}
          >
            {t('recipes.restartFirstPage', 'Restart from first page')}
          </Button>
        </div>
      )}

      {!searchActive && !isInitialLoading && !loadError && gotoOnly && recipesCount === 0 && (
        <div
          data-testid="browse-goto-empty"
          className="mx-4 flex max-w-md flex-col items-center gap-4 rounded-2xl border border-chrome-line bg-white p-6 text-center text-ink-body shadow-sm"
        >
          <p className="text-sm text-ink-body">
            {t(
              'recipes.gotoNoMatches',
              'No matching Go-To recipes. Clear this filter to find recipes and add stars.'
            )}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="md"
            data-testid="browse-goto-clear"
            onClick={onClearGotoOnly}
          >
            {t('recipes.clearFilters', 'Clear filters')}
          </Button>
        </div>
      )}

      {isEmpty && <EndCard isEmpty={true} onSwipeRight={() => {}} onSwipeLeft={() => {}} />}

      {searchActive && !searchLoading && searchError && (
        <div
          data-testid="search-request-error"
          role="alert"
          className="mx-4 max-w-md space-y-4 rounded-2xl border border-hearth-line bg-terracotta-50 p-6 text-center text-ink-body shadow-sm"
        >
          <p className="font-heading text-base font-bold text-hearth-ink">
            {t('recipes.searchFailed', 'Could not load recipes. Try again.')}
          </p>
          <Button
            type="button"
            variant="primary"
            size="md"
            data-testid="search-request-retry"
            onClick={onRetrySearch}
          >
            {t('common.retry', 'Retry')}
          </Button>
        </div>
      )}

      {searchActive && !searchLoading && !searchError && visibleRecipesCount === 0 && (
        <div
          data-testid="search-empty-state"
          className="mx-4 max-w-md rounded-2xl border border-chrome-line bg-white p-6 text-center text-ink-body shadow-sm"
        >
          <p className="text-sm text-ink-body">
            {Object.keys(activeFilters).length || Object.keys(activePreferences).length
              ? t('recipes.filterNoResults', 'No matches with these filters. Try removing one.')
              : t(
                  'recipes.searchEmptyTitle',
                  'No matches yet. Try a different description or clear filters.'
                )}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="md"
              data-testid="search-empty-clear-filters"
              onClick={onClearSearchFilters}
            >
              {t('recipes.clearFilters', 'Clear filters')}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              data-testid="search-empty-clear-search"
              onClick={onClearSearch}
            >
              {t('recipes.clearSearchAndBrowse', 'Clear search and browse')}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
