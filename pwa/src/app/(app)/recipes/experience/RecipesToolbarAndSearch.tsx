'use client';

import React from 'react';
import { Compass, Grid3X3, Layers3, Recycle, RotateCcw, Search, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t, tWithVars } from '@/locales';
import type { BrowseViewMode } from './recipesSearchHelpers';

interface RecipesToolbarAndSearchProps {
  addToDay: string | null;
  weekOffset: string | null;
  urlPlanningDayLabel: string | null;
  planningCalendarError: boolean;
  onRetryPlanningCalendar: () => void;
  onCancelPlanningMode: () => void;
  searchActive: boolean;
  searchControlsExpanded: boolean;
  isDiscoverableOnly: boolean;
  gotoOnly: boolean;
  browseViewMode: BrowseViewMode;
  query: string;
  placeholderSuggestion: string | null;
  appliedCount: number;
  similarToRecipeId: string | null;
  searchTriggerRef: React.RefObject<HTMLButtonElement | null>;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  filtersTriggerRef: React.RefObject<HTMLButtonElement | null>;
  recycleTriggerRef: React.RefObject<HTMLButtonElement | null>;
  onToggleSearchControls: () => void;
  onToggleDiscoverable: () => void;
  onToggleGotoOnly: () => void;
  onChangeViewMode: (mode: BrowseViewMode) => void;
  onOpenRecycleBin: () => void;
  onSearchQueryChange: (value: string) => void;
  onSearchInputKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onOpenFilters: () => void;
  onRemoveSimilarChip: () => void;
  onClearSearch: () => void;
}

export function RecipesToolbarAndSearch({
  addToDay,
  weekOffset,
  urlPlanningDayLabel,
  planningCalendarError,
  onRetryPlanningCalendar,
  onCancelPlanningMode,
  searchActive,
  searchControlsExpanded,
  isDiscoverableOnly,
  gotoOnly,
  browseViewMode,
  query,
  placeholderSuggestion,
  appliedCount,
  similarToRecipeId,
  searchTriggerRef,
  searchInputRef,
  filtersTriggerRef,
  recycleTriggerRef,
  onToggleSearchControls,
  onToggleDiscoverable,
  onToggleGotoOnly,
  onChangeViewMode,
  onOpenRecycleBin,
  onSearchQueryChange,
  onSearchInputKeyDown,
  onOpenFilters,
  onRemoveSimilarChip,
  onClearSearch,
}: RecipesToolbarAndSearchProps) {
  return (
    <>
      {addToDay !== null && weekOffset !== null && (
        <div
          data-testid="planning-mode-banner"
          className="relative z-10 mx-4 sm:mx-6 mt-3 mb-1 flex min-h-12 flex-wrap items-center gap-2 rounded-2xl border border-hearth-line bg-terracotta-50 px-4 py-0 text-ink-body shadow-sm"
        >
          <p className="min-w-0 flex-1 py-1 font-heading text-sm font-bold text-hearth-ink">
            {urlPlanningDayLabel
              ? tWithVars('recipes.choosingForDay', 'Choosing for {{day}}', {
                  day: urlPlanningDayLabel,
                })
              : tWithVars('recipes.choosingForDayNum', 'Choosing for Day {{day}}', {
                  day: Number(addToDay) + 1,
                })}
          </p>
          {planningCalendarError && (
            <Button
              type="button"
              variant="primary"
              size="md"
              className="max-w-full whitespace-normal text-center"
              onClick={onRetryPlanningCalendar}
            >
              {t('common.retry', 'Retry')}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="md"
            data-testid="planning-mode-cancel"
            className="max-w-full whitespace-normal text-center"
            onClick={onCancelPlanningMode}
          >
            {t('recipes.cancel', 'Cancel')}
          </Button>
        </div>
      )}

      {/* Toolbar order follows reading and keyboard order. */}
      <div className="relative z-10 flex flex-wrap items-center justify-end px-2 sm:px-6 pt-2 pb-1 shrink-0 gap-1">
        <button
          ref={searchTriggerRef}
          type="button"
          aria-label={
            searchActive && !searchControlsExpanded
              ? t('recipes.searchActiveShowControls', 'Search active; show controls')
              : t('recipes.search', 'Search')
          }
          aria-expanded={searchControlsExpanded}
          aria-controls="recipes-search-controls"
          data-testid="recipes-search-disclosure"
          onClick={onToggleSearchControls}
          className="relative mr-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-charcoal/8 bg-white text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
        >
          <Search size={20} aria-hidden="true" />
          {searchActive && !searchControlsExpanded && (
            <span
              data-testid="recipes-search-active-marker"
              aria-hidden="true"
              className="absolute ml-7 -mt-7 h-2.5 w-2.5 rounded-full bg-hearth-fill"
            />
          )}
        </button>
        <button
          onClick={onToggleDiscoverable}
          data-testid="stack-toggle-discoverable"
          aria-pressed={isDiscoverableOnly}
          className={`flex h-12 min-w-12 shrink-0 items-center gap-1 rounded-full px-2 transition-all duration-300 border ${
            isDiscoverableOnly
              ? 'bg-ochre/15 text-sunlight-ink border-ochre/25 shadow-sm shadow-ochre/10'
              : 'bg-white text-ink-muted border-charcoal/8 hover:bg-white active:scale-95'
          } backdrop-blur-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body`}
          aria-label={
            isDiscoverableOnly
              ? t('recipes.showingDiscovery', 'Showing recipes marked Discovery')
              : t('recipes.showingAll', 'Showing all recipes')
          }
        >
          <Compass
            className={`h-4 w-4 ${isDiscoverableOnly ? 'text-sunlight-ink fill-ochre/20' : ''}`}
          />
          <span className="hidden min-[390px]:inline text-xs font-semibold tracking-wide">
            {isDiscoverableOnly
              ? t('recipes.scopeDiscovery', 'Discovery')
              : t('recipes.scopeAll', 'All')}
          </span>
        </button>

        <button
          type="button"
          data-testid="browse-filter-goto"
          aria-label={t('recipes.gotoOnly', 'Go-To recipes only')}
          aria-pressed={gotoOnly}
          onClick={onToggleGotoOnly}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body active:scale-95 motion-reduce:transform-none ${gotoOnly ? 'bg-ochre/15 text-sunlight-ink border-ochre/25' : 'bg-white text-ink-muted border-charcoal/8'}`}
        >
          <Star size={20} fill={gotoOnly ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>

        <div className="flex h-[50px] shrink-0 rounded-full bg-white border border-charcoal/8 p-0 shadow-sm backdrop-blur-sm">
          <button
            type="button"
            data-testid="browse-view-stack"
            aria-label={t('recipes.showCards', 'Show recipe cards')}
            aria-pressed={browseViewMode === 'stack'}
            onClick={() => onChangeViewMode('stack')}
            className={`flex h-12 items-center justify-center min-w-12 gap-1 rounded-full px-1 text-xs font-black uppercase transition-all ${
              browseViewMode === 'stack' ? 'bg-sage/20 text-garden-ink' : 'text-ink-muted'
            }`}
          >
            <Layers3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            data-testid="browse-view-list"
            aria-label={t('recipes.showList', 'Show recipe list')}
            aria-pressed={browseViewMode === 'list'}
            onClick={() => onChangeViewMode('list')}
            className={`flex h-12 items-center justify-center min-w-12 gap-1 rounded-full px-1 text-xs font-black uppercase transition-all ${
              browseViewMode === 'list' ? 'bg-sage/20 text-garden-ink' : 'text-ink-muted'
            }`}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
        </div>

        <button
          ref={recycleTriggerRef}
          type="button"
          data-testid="recycle-bin-entry"
          aria-label={t('recipes.recycleBin', 'Recycle Bin')}
          onClick={onOpenRecycleBin}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-ink-muted shadow-sm border border-charcoal/8 backdrop-blur-sm hover:bg-white active:scale-95 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
        >
          <Recycle size={20} />
        </button>
      </div>

      {searchControlsExpanded && (
        <div id="recipes-search-controls" className="relative z-10 px-4 pb-2">
          <div className="relative">
            <Search
              aria-hidden="true"
              size={20}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <input
              ref={searchInputRef}
              data-testid="recipe-search-input"
              aria-label={t('recipes.search', 'Search')}
              placeholder={
                placeholderSuggestion ||
                t('recipes.searchPlaceholderFallback', "Try 'Chicken' or 'Quick'…")
              }
              value={query}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              onKeyDown={onSearchInputKeyDown}
              className="min-h-12 w-full rounded-full border border-charcoal/15 bg-white/85 pl-12 pr-4 text-ink-body shadow-sm placeholder:text-ink-muted focus:border-hearth-fill focus:outline-none focus:ring-2 focus:ring-terracotta/40"
            />
          </div>
          <div data-testid="recipes-search-toolbar" className="mt-2 flex items-center gap-2">
            <button
              ref={filtersTriggerRef}
              type="button"
              data-testid="mobile-filters-button"
              onClick={onOpenFilters}
              aria-label={
                appliedCount > 0
                  ? tWithVars('recipes.filtersActiveCount', 'Filters, {{count}} active', {
                      count: appliedCount,
                    })
                  : t('recipes.filters', 'Filters')
              }
              className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full border border-charcoal/15 bg-white/85 px-4 font-bold text-ink-body shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
            >
              {t('recipes.filters', 'Filters')}
              {appliedCount > 0 && (
                <span
                  aria-hidden="true"
                  className="rounded-full bg-terracotta/15 px-2 py-0.5 text-xs font-black text-hearth-ink"
                >
                  {appliedCount}
                </span>
              )}
            </button>
            {similarToRecipeId && (
              <button
                type="button"
                data-testid="search-similar-chip-remove"
                onClick={onRemoveSimilarChip}
                className="inline-flex min-h-12 shrink-0 items-center rounded-full border border-charcoal/20 bg-white px-4 font-bold text-ink-body"
              >
                {t('recipes.similar', 'Similar')} ×
              </button>
            )}
            {searchActive && (
              <button
                type="button"
                data-testid="recipes-clear-search"
                aria-label={t('recipes.clearSearchAndBrowse', 'Clear search and browse')}
                title={t('recipes.clearSearchAndBrowse', 'Clear search and browse')}
                onClick={onClearSearch}
                className="ml-auto inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-charcoal/20 bg-white text-ink-body shadow-sm transition hover:bg-charcoal/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
              >
                <RotateCcw size={18} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
