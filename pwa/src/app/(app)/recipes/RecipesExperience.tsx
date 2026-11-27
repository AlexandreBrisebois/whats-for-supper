'use client';

import React, { useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BackgroundBlobs } from '@/components/ui/BackgroundBlobs';
import { RecipesListView } from './experience/RecipesListView';
import { RecipesModalsSurface } from './experience/RecipesModalsSurface';
import { RecipesStackView } from './experience/RecipesStackView';
import { RecipesStatusAndEmptyStates } from './experience/RecipesStatusAndEmptyStates';
import { RecipesToolbarAndSearch } from './experience/RecipesToolbarAndSearch';
import {
  useBrowseViewModeState,
  useRecipesBrowseCollection,
} from './experience/useRecipesBrowseCollection';
import { useRecipesPlanningTarget } from './experience/useRecipesPlanningTarget';
import { useRecipesSearchController } from './experience/useRecipesSearchController';
import { useRecipesSlotAssignment } from './experience/useRecipesSlotAssignment';

// ---------------------------------------------------------------------------
// Canonical Recipes collection controller.
// ---------------------------------------------------------------------------

export default function RecipesExperience() {
  return (
    <React.Suspense fallback={null}>
      <RecipesContent />
    </React.Suspense>
  );
}

function RecipesContent() {
  const searchParams = useSearchParams();
  const [isTrashOpen, setIsTrashOpen] = useState(false);

  const recipesViewportRef = useRef<HTMLDivElement | null>(null);
  const listScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const listSentinelRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchTriggerRef = useRef<HTMLButtonElement | null>(null);
  const filtersTriggerRef = useRef<HTMLButtonElement | null>(null);
  const recycleTriggerRef = useRef<HTMLButtonElement | null>(null);

  const planningTarget = useRecipesPlanningTarget(searchParams);
  const viewModeState = useBrowseViewModeState();

  const search = useRecipesSearchController({
    searchParams,
    entryContext: planningTarget.entryContext,
    entryContextKey: planningTarget.entryContextKey,
    detailRecipeId: planningTarget.detailRecipeId,
    browseViewMode: viewModeState.browseViewMode,
    searchInputRef,
    searchTriggerRef,
    filtersTriggerRef,
    listScrollContainerRef,
  });

  const browse = useRecipesBrowseCollection({
    viewModeState,
    isDiscoverableOnly: search.isDiscoverableOnly,
    gotoOnly: search.gotoOnly,
    browseRefreshVersion: search.browseRefreshVersion,
    searchActive: search.searchActive,
    searchData: search.searchData,
    searchIndex: search.searchIndex,
    setSearchIndex: search.setSearchIndex,
    loadMoreSearch: search.loadMoreSearch,
    bumpStackRenderVersion: search.bumpStackRenderVersion,
    recipesViewportRef,
    listScrollContainerRef,
    listSentinelRef,
  });

  const slotAssignment = useRecipesSlotAssignment({
    planningTarget,
    reviewDuplicateParam: searchParams.get('reviewDuplicate'),
  });

  const hideCollectionResults = search.searchActive
    ? !search.searchData
    : (browse.isInitialLoading || browse.loadError) && browse.recipes.length === 0;

  const canShowResults = !hideCollectionResults && browse.visibleRecipes.length > 0;

  return (
    <div
      ref={recipesViewportRef}
      data-testid="browse-all-stack-container"
      className="relative flex h-[calc(100dvh-7.25rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] min-h-0 flex-col bg-cream overflow-x-hidden overflow-y-auto"
    >
      <BackgroundBlobs />

      <RecipesToolbarAndSearch
        addToDay={planningTarget.addToDay}
        weekOffset={planningTarget.weekOffset}
        urlPlanningDayLabel={planningTarget.urlPlanningDayLabel}
        planningCalendarError={planningTarget.planningCalendarError}
        onRetryPlanningCalendar={planningTarget.retryPlanningCalendar}
        onCancelPlanningMode={() => slotAssignment.router.push('/planner')}
        searchActive={search.searchActive}
        searchControlsExpanded={search.searchControlsExpanded}
        isDiscoverableOnly={search.isDiscoverableOnly}
        gotoOnly={search.gotoOnly}
        browseViewMode={browse.browseViewMode}
        query={search.query}
        placeholderSuggestion={search.placeholderSuggestion}
        appliedCount={search.appliedCount}
        similarToRecipeId={search.similarToRecipeId}
        searchTriggerRef={searchTriggerRef}
        searchInputRef={searchInputRef}
        filtersTriggerRef={filtersTriggerRef}
        recycleTriggerRef={recycleTriggerRef}
        onToggleSearchControls={search.handleToggleSearchControls}
        onToggleDiscoverable={search.handleGlobalToggleDiscoverable}
        onToggleGotoOnly={search.handleToggleGotoOnly}
        onChangeViewMode={browse.handleViewModeChange}
        onOpenRecycleBin={() => setIsTrashOpen(true)}
        onSearchQueryChange={search.handleSearchQueryChange}
        onSearchInputKeyDown={search.handleSearchInputKeyDown}
        onOpenFilters={search.handleOpenFilters}
        onRemoveSimilarChip={search.handleRemoveSimilarChip}
        onClearSearch={search.clearSearch}
      />

      {/* Main content area */}
      <div
        data-testid="browse-results-region"
        className={`relative z-10 flex flex-1 flex-col items-center justify-start pt-4 px-3 sm:px-6 ${browse.browseViewMode === 'stack' ? 'pb-2 min-h-[16rem] overflow-y-auto overflow-x-hidden touch-pan-y' : 'pb-[8px] min-h-0'}`}
      >
        <RecipesStatusAndEmptyStates
          searchActive={search.searchActive}
          searchLoading={search.searchLoading}
          hasSearchData={Boolean(search.searchData)}
          searchError={search.searchError}
          isInitialLoading={browse.isInitialLoading}
          recipesCount={browse.recipes.length}
          visibleRecipesCount={browse.visibleRecipes.length}
          loadError={browse.loadError}
          historyRestartRequired={browse.historyRestartRequired}
          isPrefetching={browse.isPrefetching}
          gotoOnly={search.gotoOnly}
          isEmpty={browse.isEmpty}
          activeFilters={search.activeFilters}
          activePreferences={search.activePreferences}
          onRetryBrowse={() => void browse.fetchLibraryData(1, search.isDiscoverableOnly)}
          onRestartFromFirstPage={() =>
            void browse.fetchLibraryData(1, search.isDiscoverableOnly, true, true)
          }
          onClearGotoOnly={() => search.setGotoOnly(false)}
          onRetrySearch={() => void search.runSearch(search.query)}
          onClearSearchFilters={search.clearSearchFilters}
          onClearSearch={search.clearSearch}
        />

        {canShowResults && browse.browseViewMode === 'list' && (
          <RecipesListView
            visibleRecipes={browse.visibleRecipes}
            searchActive={search.searchActive}
            hasSearchData={Boolean(search.searchData)}
            isPrefetching={browse.isPrefetching}
            searchLoadingMore={search.searchLoadingMore}
            searchLoadMoreError={search.searchLoadMoreError}
            listScrollContainerRef={listScrollContainerRef}
            listSentinelRef={listSentinelRef}
            onListScroll={browse.handleListScroll}
            onCardTap={planningTarget.handleCardTap}
            onRetryLoadMoreSearch={() => void search.loadMoreSearch(true)}
          />
        )}

        {canShowResults && browse.browseViewMode === 'stack' && (
          <RecipesStackView
            stackVisibleRecipes={browse.stackVisibleRecipes}
            visibleRecipesCount={browse.visibleRecipes.length}
            currentRecipe={browse.currentRecipe}
            globalIndex={browse.globalIndex}
            displayTotal={browse.displayTotal}
            stackRenderVersion={search.stackRenderVersion}
            searchActive={search.searchActive}
            searchLoading={search.searchLoading}
            searchLoadingMore={search.searchLoadingMore}
            searchLoadMoreError={search.searchLoadMoreError}
            searchIndex={search.searchIndex}
            hasNextSearchCursor={Boolean(search.searchData?.nextCursor)}
            isEndCard={browse.isEndCard}
            isWrappingToEnd={browse.isWrappingToEnd}
            failedNavigation={browse.failedNavigation}
            onSwipeRight={browse.handleSwipeRight}
            onSwipeLeft={browse.handleSwipeLeft}
            onStackCardTap={planningTarget.handleStackCardTap}
            onRetryPageNavigation={(page, last) => void browse.navigatePage(page, last)}
            onToggleIndividualCuration={browse.handleIndividualToggleDiscoverable}
            onRetryLoadMoreSearch={() => void search.loadMoreSearch(true)}
          />
        )}
      </div>

      <RecipesModalsSurface
        isFiltersOpen={search.isFiltersOpen}
        activeFilters={search.activeFilters}
        isDiscoverableOnly={search.isDiscoverableOnly}
        gotoOnly={search.gotoOnly}
        activePreferences={search.activePreferences}
        filterMetadata={search.filterMetadata}
        onApplyFilters={search.applyFilters}
        onCloseFilters={search.handleCloseFilters}
        isTrashOpen={isTrashOpen}
        onCloseTrash={() => setIsTrashOpen(false)}
        recoveryDayChooser={slotAssignment.recoveryDayChooser}
        onCloseRecoveryDayChooser={() => {
          if (!slotAssignment.recoveryDayChooser) return;
          const recipeId = slotAssignment.recoveryDayChooser.recipe.id;
          slotAssignment.setRecoveryDayChooser(null);
          planningTarget.setDetailRecipeId(recipeId);
        }}
        onSelectRecoveryDay={(slot, recipeId) => {
          planningTarget.setChosenDetailTarget({
            entry: planningTarget.entryContextKey,
            slot,
          });
          planningTarget.setDetailRecipeId(recipeId);
          slotAssignment.setRecoveryDayChooser(null);
        }}
        showDayChooserKey={planningTarget.showDayChooser}
        detailTargetKey={planningTarget.detailTargetKey}
        targetReferenceForChooser={planningTarget.targetReferenceForChooser}
        dayChooserWeekOffset={
          planningTarget.visibleTarget?.weekOffset ??
          (planningTarget.validTarget ? planningTarget.targetWeek : 0)
        }
        onCloseDayChooser={() => planningTarget.setShowDayChooser(null)}
        onSelectDayChooser={(slot) => {
          planningTarget.setChosenDetailTarget({
            entry: planningTarget.entryContextKey,
            slot,
          });
          planningTarget.setShowDayChooser(null);
        }}
        nonCookingConfirmation={slotAssignment.nonCookingConfirmation}
        onCloseNonCookingConfirmation={() => slotAssignment.setNonCookingConfirmation(null)}
        onSavedNonCookingReplacement={async (slot) => {
          slotAssignment.router.push(
            `/planner?success=1&dayIndex=${slot.dayIndex}&weekOffset=${slot.weekOffset}&referenceWeekStartDate=${slot.referenceWeekStartDate}`
          );
        }}
        onReviewNonCookingSlot={(slot) => slotAssignment.reviewDetailTarget(slot)}
        detailRecipeId={planningTarget.detailRecipeId}
        detailSheetPlanningProps={slotAssignment.detailSheetPlanningProps}
        onCloseDetailSheet={slotAssignment.handleDetailSheetClose}
        onRecipeDeleted={search.handleRecipeDeleted}
        onUseForDay={slotAssignment.handleSelectForPlanner}
        onFindSimilar={(recipeId) => {
          planningTarget.setDetailRecipeId(null);
          search.handleFindSimilar(recipeId);
        }}
        pendingRecovery={slotAssignment.pendingRecovery}
        recovery={slotAssignment.recovery}
      />
    </div>
  );
}
