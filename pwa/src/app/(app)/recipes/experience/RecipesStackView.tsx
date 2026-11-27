'use client';

import { AnimatePresence } from 'framer-motion';
import { RecipeStackCard } from '@/components/recipes/RecipeStackCard';
import { StackActionBar } from '@/components/recipes/StackActionBar';
import { Button } from '@/components/ui/button';
import type { RecipeDto } from '@/lib/api/generated/models/index';
import { getImageUrl } from '@/lib/imageUtils';
import { t, tWithVars } from '@/locales';

interface RecipesStackViewProps {
  stackVisibleRecipes: RecipeDto[];
  visibleRecipesCount: number;
  currentRecipe: RecipeDto | null;
  globalIndex: number;
  displayTotal: number;
  stackRenderVersion: number;
  searchActive: boolean;
  searchLoading: boolean;
  searchLoadingMore: boolean;
  searchLoadMoreError: boolean;
  searchIndex: number;
  hasNextSearchCursor: boolean;
  isEndCard: boolean;
  isWrappingToEnd: boolean;
  failedNavigation: { page: number; last: boolean } | null;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onStackCardTap: (recipeId: string) => void;
  onRetryPageNavigation: (page: number, last: boolean) => void;
  onToggleIndividualCuration: (recipeId: string, newValue: boolean) => Promise<void>;
  onRetryLoadMoreSearch: () => void;
}

export function RecipesStackView({
  stackVisibleRecipes,
  visibleRecipesCount,
  currentRecipe,
  globalIndex,
  displayTotal,
  stackRenderVersion,
  searchActive,
  searchLoading,
  searchLoadingMore,
  searchLoadMoreError,
  searchIndex,
  hasNextSearchCursor,
  isEndCard,
  isWrappingToEnd,
  failedNavigation,
  onSwipeRight,
  onSwipeLeft,
  onStackCardTap,
  onRetryPageNavigation,
  onToggleIndividualCuration,
  onRetryLoadMoreSearch,
}: RecipesStackViewProps) {
  return (
    <div
      data-testid="browse-stack-layout"
      className="w-full max-w-sm md:max-w-xl flex-1 min-h-[30rem] flex flex-col motion-safe:transition-all motion-safe:duration-500 ease-in-out"
    >
      <div className="flex flex-1 min-h-min items-center">
        <div className="relative w-full flex-none min-h-0">
          <AnimatePresence mode="popLayout">
            {stackVisibleRecipes.map((recipe, index) => (
              <RecipeStackCard
                key={`${recipe.id}:${stackRenderVersion}`}
                id={recipe.id!}
                name={recipe.name!}
                description={recipe.description || ''}
                imageUrl={getImageUrl(
                  searchActive ? recipe.imageUrl : `/api/recipes/${recipe.id}/hero`
                )}
                totalTime={recipe.totalTime || ''}
                category={recipe.category || ''}
                cuisineType={recipe.cuisineType ?? null}
                mealTypes={recipe.mealTypes ?? null}
                importIssueStatus={recipe.importIssue?.status ?? null}
                isFront={index === 0}
                stackIndex={index}
                canSwipeRight={!searchActive || searchIndex > 0}
                canSwipeLeft={
                  !searchActive ||
                  (!searchLoading &&
                    !searchLoadingMore &&
                    (searchIndex < visibleRecipesCount - 1 || hasNextSearchCursor))
                }
                onSwipeRight={onSwipeRight}
                onSwipeLeft={onSwipeLeft}
                onTap={() => onStackCardTap(recipe.id!)}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {!searchActive && isWrappingToEnd && (
        <p role="status" className="text-center text-sm text-ink-muted">
          {t('recipes.libraryLoading', 'Loading your library…')}
        </p>
      )}
      {!searchActive && failedNavigation && (
        <div
          role="alert"
          className="mt-3 flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-hearth-line bg-terracotta-50 px-4 py-3 text-center text-sm text-ink-body shadow-sm"
        >
          <p className="font-medium text-hearth-ink">
            {t('recipes.pageFailed', 'Could not load that page. Your place is kept.')}
          </p>
          <Button
            type="button"
            variant="primary"
            size="md"
            data-testid="stack-page-retry"
            onClick={() => onRetryPageNavigation(failedNavigation.page, failedNavigation.last)}
          >
            {t('common.retry', 'Retry')}
          </Button>
        </div>
      )}
      {/* Stack Action Bar */}
      {!isEndCard && currentRecipe && (
        <StackActionBar
          currentRecipe={currentRecipe}
          currentIndex={globalIndex}
          totalCount={displayTotal}
          positionText={
            searchActive && hasNextSearchCursor
              ? tWithVars(
                  'recipes.loadedPosition',
                  '{{position}} of {{total}} loaded · more available',
                  { position: searchIndex + 1, total: displayTotal }
                )
              : undefined
          }
          onToggleIndividualCuration={onToggleIndividualCuration}
        />
      )}
      {searchActive && searchLoadingMore && (
        <p role="status" className="text-center">
          {t('recipes.loadingMore', 'Loading more…')}
        </p>
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
