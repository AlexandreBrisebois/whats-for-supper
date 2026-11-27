import type {
  RecipeSearchFiltersDto,
  RecipeSearchPreferencesDto,
} from '@/lib/api/generated/models/index';
import { getLocale } from '@/locales';

export type BrowseViewMode = 'stack' | 'list';

export const STACK_PAGE_SIZE = 20;
export const LIST_PAGE_SIZE = 12;

export interface RecipesEntryContext {
  gotoOnly: boolean;
  discoverableOnly: boolean;
  similarTo: string | null;
  focus: boolean;
  addToDay: string | null;
  weekOffset: string | null;
  referenceWeekStartDate: string | null;
}

export function buildRecipesEntryContext(
  searchParams: Pick<URLSearchParams, 'get'>
): RecipesEntryContext {
  return {
    gotoOnly: searchParams.get('gotoOnly') === 'true',
    discoverableOnly: searchParams.get('discoverableOnly') === 'true',
    similarTo: searchParams.get('similarTo'),
    focus: searchParams.get('focus') === 'search',
    addToDay: searchParams.get('addToDay'),
    weekOffset: searchParams.get('weekOffset'),
    referenceWeekStartDate: searchParams.get('referenceWeekStartDate'),
  };
}

export function hasSearchIntent(
  query: string,
  filters: RecipeSearchFiltersDto,
  preferences: RecipeSearchPreferencesDto,
  similarToRecipeId?: string | null
) {
  return (
    Boolean(query.trim() || similarToRecipeId) ||
    Object.entries(filters).some(
      ([key, value]) =>
        key !== 'gotoOnly' &&
        key !== 'discoverableOnly' &&
        (Array.isArray(value) ? value.length > 0 : Boolean(value))
    ) ||
    Object.values(preferences).some((value) =>
      Array.isArray(value) ? value.length > 0 : Boolean(value)
    )
  );
}

export function appliedSelectionCount(
  filters: RecipeSearchFiltersDto,
  preferences: RecipeSearchPreferencesDto,
  discoverableOnly: boolean,
  gotoOnly: boolean
) {
  const count = (values: unknown[]) =>
    values.reduce<number>(
      (total, value) => total + (Array.isArray(value) ? value.length : value === true ? 1 : 0),
      0
    );
  const searchFilters = Object.entries(filters)
    .filter(([key]) => key !== 'discoverableOnly' && key !== 'gotoOnly')
    .map(([, value]) => value);
  return (
    count(searchFilters) +
    count(Object.values(preferences)) +
    Number(discoverableOnly) +
    Number(gotoOnly)
  );
}

export function plannerDayName(dayValue: string | null): string | null {
  const day = Number(dayValue);
  if (dayValue === null || !Number.isInteger(day) || day < 0 || day > 6) return null;
  return new Intl.DateTimeFormat(getLocale() === 'fr' ? 'fr-CA' : 'en-CA', {
    weekday: 'long',
    timeZone: 'UTC',
  })
    .format(new Date(Date.UTC(2026, 0, 5 + day)))
    .replace(/^./, (letter) => letter.toUpperCase());
}

export const isHistoryExpired = (error: unknown) => {
  const failure = error as { responseStatusCode?: number; status?: number; code?: string } | null;
  return (
    failure?.responseStatusCode === 409 ||
    failure?.status === 409 ||
    failure?.code === 'history_generation_expired'
  );
};
