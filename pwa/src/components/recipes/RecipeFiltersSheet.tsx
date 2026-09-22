'use client';

import { useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import type {
  RecipeSearchFilterDiscoveryDto,
  RecipeSearchFiltersDto,
  RecipeSearchMainDefinitionDto,
  RecipeSearchPreferencesDto,
} from '@/lib/api/generated/models/index';
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
  { key: 'quickOnly', labelKey: 'recipes.filterQuick', fallback: 'Quick', testId: 'filter-quick' },
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

const DEFAULT_MAIN: RecipeSearchMainDefinitionDto[] = [
  { id: 'beef', concept: 'beef' },
  { id: 'poultry', concept: 'poultry' },
  { id: 'pork', concept: 'pork' },
  { id: 'fish', concept: 'fish' },
  { id: 'pasta', concept: 'pasta' },
  { id: 'vegetarian', concept: 'vegetarian' },
];
const DEFAULT_MEAL_TYPES = ['Supper', 'Lunch', 'Breakfast', 'Dessert'];
const PRIMARY_EXISTING_FILTERS: RecipeBooleanFilterKey[] = [
  'quickOnly',
  'familyFavorite',
  'neverCooked',
];
const SECONDARY_EXISTING_FILTERS: RecipeBooleanFilterKey[] = [
  'newRecipes',
  'notCookedInLongTime',
  'healthyOnly',
  'reportedOnly',
  'readyToReviewOnly',
];

export type RecipeFilterDraft = {
  filters: RecipeSearchFiltersDto;
  preferences: RecipeSearchPreferencesDto;
};

interface RecipeFiltersSheetProps {
  activeFilters: RecipeSearchFiltersDto;
  activePreferences: RecipeSearchPreferencesDto;
  filterMetadata: RecipeSearchFilterDiscoveryDto | null;
  onApply: (draft: RecipeFilterDraft) => void;
  onClose: () => void;
}

function mainLabel(main: RecipeSearchMainDefinitionDto) {
  if (main.label?.trim()) return main.label;
  const fallback = main.id
    ? main.id.charAt(0).toUpperCase() + main.id.slice(1)
    : (main.concept ?? '');
  return t(`recipes.filterMain${main.id ?? ''}`, fallback);
}

function Chip({
  label,
  selected,
  onClick,
  testId,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      data-testid={selected ? `${testId}-active` : testId}
      onClick={onClick}
      className={cn(
        'min-h-11 rounded-full border px-4 py-2 text-sm font-bold transition-colors',
        selected
          ? 'border-terracotta bg-terracotta text-white'
          : 'border-charcoal/10 bg-white text-charcoal'
      )}
    >
      {label}
    </button>
  );
}

function Disclosure({
  label,
  expanded,
  onClick,
  controls,
  testId,
}: {
  label: string;
  expanded: boolean;
  onClick: () => void;
  controls: string;
  testId: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-sm font-bold text-ochre hover:bg-ochre/10"
    >
      {label}
      <ChevronDown
        aria-hidden="true"
        size={16}
        className={cn('transition-transform', expanded && 'rotate-180')}
      />
    </button>
  );
}

export function RecipeFiltersSheet({
  activeFilters,
  activePreferences,
  filterMetadata,
  onApply,
  onClose,
}: RecipeFiltersSheetProps) {
  const [draftFilters, setDraftFilters] = useState<RecipeSearchFiltersDto>({ ...activeFilters });
  const [draftPreferences, setDraftPreferences] = useState<RecipeSearchPreferencesDto>({
    ...activePreferences,
  });
  const [existingExpanded, setExistingExpanded] = useState(false);
  const [mainExpanded, setMainExpanded] = useState(false);
  const [cuisineExpanded, setCuisineExpanded] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const main = filterMetadata?.main?.length ? filterMetadata.main : DEFAULT_MAIN;
  const mealTypes = filterMetadata?.mealTypes?.length
    ? filterMetadata.mealTypes
    : DEFAULT_MEAL_TYPES;
  const cuisines = filterMetadata?.cuisines?.all?.filter(Boolean) ?? [];
  const promotedCuisines = filterMetadata?.cuisines?.promoted?.filter(Boolean) ?? [];
  const selectedConcepts = draftPreferences.concepts ?? [];
  const toggleBoolean = (key: RecipeBooleanFilterKey) =>
    setDraftFilters((current) => ({ ...current, [key]: current[key] ? null : true }));
  const toggleArray = (field: 'mealTypes' | 'cuisines', value: string) =>
    setDraftFilters((current) => {
      const values = current[field] ?? [];
      return {
        ...current,
        [field]: values.includes(value)
          ? values.filter((item) => item !== value)
          : [...values, value],
      };
    });
  const toggleConcept = (concept: string) =>
    setDraftPreferences((current) => {
      const concepts = current.concepts ?? [];
      return {
        ...current,
        concepts: concepts.includes(concept)
          ? concepts.filter((item) => item !== concept)
          : [...concepts, concept],
      };
    });
  const existingVisible = [
    ...PRIMARY_EXISTING_FILTERS,
    ...SECONDARY_EXISTING_FILTERS.filter((key) => existingExpanded || Boolean(draftFilters[key])),
  ];
  const mainVisible = [
    ...main.slice(0, 6),
    ...main
      .slice(6)
      .filter(
        (item) => mainExpanded || Boolean(item.concept && selectedConcepts.includes(item.concept))
      ),
  ];
  const cuisineVisible = [
    ...promotedCuisines,
    ...cuisines.filter(
      (item) =>
        !promotedCuisines.includes(item) &&
        (cuisineExpanded || (draftFilters.cuisines ?? []).includes(item))
    ),
  ];

  return (
    <div
      className="fixed inset-0 z-[140] flex items-end bg-charcoal/40 md:items-center md:p-6"
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
        className="flex max-h-[90dvh] w-full flex-col rounded-t-[2rem] bg-cream px-5 pt-5 shadow-2xl md:max-w-2xl md:rounded-[2rem]"
      >
        <div className="mb-3 flex shrink-0 items-center justify-between">
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
        <div className="min-h-0 space-y-5 overflow-y-auto pb-4">
          <section>
            <h3 className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-charcoal/55">
              {t('recipes.filterShortcuts', 'Shortcuts')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {existingVisible.map((key) => {
                const option = RECIPE_FILTER_OPTIONS.find((item) => item.key === key)!;
                return (
                  <Chip
                    key={key}
                    label={t(option.labelKey, option.fallback)}
                    selected={Boolean(draftFilters[key])}
                    onClick={() => toggleBoolean(key)}
                    testId={`mobile-${option.testId}`}
                  />
                );
              })}
            </div>
            <Disclosure
              label="More filters"
              expanded={existingExpanded}
              onClick={() => setExistingExpanded((current) => !current)}
              controls="more-existing-filters"
              testId="mobile-more-filters"
            />
            <div id="more-existing-filters" hidden={!existingExpanded} />
          </section>
          <section>
            <h3 className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-charcoal/55">
              {t('recipes.filterMeal', 'Meal')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {mealTypes.map((mealType) => (
                <Chip
                  key={mealType}
                  label={t(`recipes.filterMeal${mealType}`, mealType)}
                  selected={(draftFilters.mealTypes ?? []).includes(mealType)}
                  onClick={() => toggleArray('mealTypes', mealType)}
                  testId={`mobile-filter-meal-${mealType}`}
                />
              ))}
            </div>
          </section>
          <section>
            <h3 className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-charcoal/55">
              {t('recipes.filterFocus', 'Focus')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {mainVisible.map((item) =>
                item.concept ? (
                  <Chip
                    key={item.id ?? item.concept}
                    label={mainLabel(item)}
                    selected={selectedConcepts.includes(item.concept)}
                    onClick={() => toggleConcept(item.concept!)}
                    testId={`mobile-filter-main-${item.id ?? item.concept}`}
                  />
                ) : null
              )}
            </div>
            {main.length > 6 && (
              <Disclosure
                label="All Main choices"
                expanded={mainExpanded}
                onClick={() => setMainExpanded((current) => !current)}
                controls="more-main-filters"
                testId="mobile-all-main-filters"
              />
            )}
            <div id="more-main-filters" hidden={!mainExpanded} />
          </section>
          {cuisines.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-charcoal/55">
                Cuisine
              </h3>
              <div className="flex flex-wrap gap-2">
                {cuisineVisible.map((cuisine) => (
                  <Chip
                    key={cuisine}
                    label={cuisine}
                    selected={(draftFilters.cuisines ?? []).includes(cuisine)}
                    onClick={() => toggleArray('cuisines', cuisine)}
                    testId={`mobile-filter-cuisine-${cuisine}`}
                  />
                ))}
              </div>
              {cuisines.some((cuisine) => !promotedCuisines.includes(cuisine)) && (
                <Disclosure
                  label="All cuisines"
                  expanded={cuisineExpanded}
                  onClick={() => setCuisineExpanded((current) => !current)}
                  controls="more-cuisine-filters"
                  testId="mobile-all-cuisines"
                />
              )}
              <div id="more-cuisine-filters" hidden={!cuisineExpanded} />
            </section>
          )}
        </div>
        <div className="shrink-0 border-t border-charcoal/10 bg-cream py-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setDraftFilters({});
                setDraftPreferences({});
              }}
              className="min-h-11 rounded-full border border-charcoal/15 bg-white text-sm font-bold text-charcoal"
            >
              {t('recipes.clearFilters', 'Clear filters')}
            </button>
            <button
              type="button"
              data-testid="mobile-filter-apply"
              onClick={() => onApply({ filters: draftFilters, preferences: draftPreferences })}
              className="min-h-11 rounded-full bg-terracotta text-sm font-bold text-white"
            >
              {t('recipes.applyFilters', 'Apply filters')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
