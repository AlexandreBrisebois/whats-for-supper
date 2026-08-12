'use client';

import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { RecipeSearchFiltersDto } from '@/lib/api/generated/models/index';
import { cn } from '@/lib/utils';
import { t } from '@/locales';

type RecipeBooleanFilterKey =
  | 'newRecipes'
  | 'neverCooked'
  | 'familyFavorite'
  | 'quickOnly'
  | 'notCookedInLongTime'
  | 'healthyOnly'
  | 'reportedOnly'
  | 'readyToReviewOnly';

export const RECIPE_FILTER_OPTIONS = [
  {
    key: 'newRecipes',
    labelKey: 'recipes.filterNew',
    fallback: 'New',
    testId: 'filter-new-recipes',
  },
  {
    key: 'neverCooked',
    labelKey: 'recipes.filterNeverTried',
    fallback: 'Never Tried',
    testId: 'filter-never-tried',
  },
  {
    key: 'familyFavorite',
    labelKey: 'recipes.filterFamilyFavorite',
    fallback: 'Family Favorite',
    testId: 'filter-family-favorite',
  },
  {
    key: 'quickOnly',
    labelKey: 'recipes.filterQuick',
    fallback: 'Quick',
    testId: 'filter-quick',
  },
  {
    key: 'notCookedInLongTime',
    labelKey: 'recipes.filterNotCookedLong',
    fallback: "It's Been a While",
    testId: 'filter-not-cooked-long-time',
  },
  {
    key: 'healthyOnly',
    labelKey: 'recipes.filterHealthy',
    fallback: 'Healthy Choice',
    testId: 'filter-healthy',
  },
  {
    key: 'reportedOnly',
    labelKey: 'recipes.filterReported',
    fallback: 'Reported',
    testId: 'filter-reported',
  },
  {
    key: 'readyToReviewOnly',
    labelKey: 'recipes.filterReadyToReview',
    fallback: 'Ready to review',
    testId: 'filter-ready-to-review',
  },
] as const satisfies ReadonlyArray<{
  key: RecipeBooleanFilterKey;
  labelKey: string;
  fallback: string;
  testId: string;
}>;

interface RecipeFiltersSheetProps {
  activeFilters: RecipeSearchFiltersDto;
  onApply: (filters: RecipeSearchFiltersDto) => void;
  onClose: () => void;
}

export function RecipeFiltersSheet({ activeFilters, onApply, onClose }: RecipeFiltersSheetProps) {
  const [draftFilters, setDraftFilters] = useState<RecipeSearchFiltersDto>({ ...activeFilters });
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const toggleDraftFilter = (key: RecipeBooleanFilterKey) => {
    setDraftFilters((current) => {
      const next = { ...current };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = true;
      }
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-[140] flex items-end bg-charcoal/40 md:hidden"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="recipe-filters-title"
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
        className="w-full rounded-t-[2rem] bg-cream px-5 pb-safe-bottom pt-5 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="recipe-filters-title" className="font-heading text-xl font-black text-charcoal">
            {t('recipes.filterRecipes', 'Filter recipes')}
          </h2>
          <button
            ref={closeButtonRef}
            autoFocus
            type="button"
            aria-label={t('common.close', 'Close')}
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full text-charcoal/70 hover:bg-charcoal/5"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="flex max-h-[50vh] flex-wrap gap-2 overflow-y-auto pb-5">
          {RECIPE_FILTER_OPTIONS.map(({ key, labelKey, fallback, testId }) => {
            const isActive = Boolean(draftFilters[key]);
            return (
              <button
                key={key}
                type="button"
                aria-pressed={isActive}
                data-testid={`mobile-${testId}${isActive ? '-active' : ''}`}
                onClick={() => toggleDraftFilter(key)}
                className={cn(
                  'min-h-11 rounded-full border px-4 py-2 text-sm font-bold transition-colors',
                  isActive
                    ? 'border-terracotta bg-terracotta text-white'
                    : 'border-charcoal/10 bg-white text-charcoal'
                )}
              >
                {t(labelKey, fallback)}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-charcoal/10 py-4">
          <button
            type="button"
            onClick={() => setDraftFilters({})}
            className="min-h-11 rounded-full border border-charcoal/15 bg-white text-sm font-bold text-charcoal"
          >
            {t('recipes.clearFilters', 'Clear filters')}
          </button>
          <button
            type="button"
            data-testid="mobile-filter-apply"
            onClick={() => onApply(draftFilters)}
            className="min-h-11 rounded-full bg-terracotta text-sm font-bold text-white"
          >
            {t('recipes.applyFilters', 'Apply filters')}
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mb-4 min-h-11 w-full text-sm font-bold text-charcoal/60"
        >
          {t('recipes.cancel', 'Cancel')}
        </button>
      </section>
    </div>
  );
}
