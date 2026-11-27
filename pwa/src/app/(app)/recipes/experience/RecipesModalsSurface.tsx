'use client';

import { SkipRecoveryDialog } from '@/components/home/SkipRecoveryDialog';
import { NonCookingReplacementConfirmation } from '@/components/recipes/NonCookingReplacementConfirmation';
import { PlanningDayChooser } from '@/components/recipes/PlanningDayChooser';
import { RecipeDetailSheet } from '@/components/recipes/RecipeDetailSheet';
import {
  RecipeFiltersSheet,
  type RecipeFilterDraft,
} from '@/components/recipes/RecipeFiltersSheet';
import { RecycleBinSheet } from '@/components/recipes/RecycleBinSheet';
import type {
  RecipeSearchFilterDiscoveryDto,
  RecipeSearchFiltersDto,
  RecipeSearchPreferencesDto,
} from '@/lib/api/generated/models/index';
import type { Recipe } from '@/lib/api/recipes';
import type { AssignmentRecipe, PlannerSlot } from '@/lib/planner/slotAssignment';
import type { useReplacementRecovery } from '@/lib/planner/useReplacementRecovery';
import type { buildDetailSheetPlanningProps } from './recipesDetailPlanningProps';

interface RecipesModalsSurfaceProps {
  isFiltersOpen: boolean;
  activeFilters: RecipeSearchFiltersDto;
  isDiscoverableOnly: boolean;
  gotoOnly: boolean;
  activePreferences: RecipeSearchPreferencesDto;
  filterMetadata: RecipeSearchFilterDiscoveryDto | null;
  onApplyFilters: (draft: RecipeFilterDraft) => void;
  onCloseFilters: () => void;
  isTrashOpen: boolean;
  onCloseTrash: () => void;
  recoveryDayChooser: {
    recipe: AssignmentRecipe;
    reference: string;
    weekOffset: number;
  } | null;
  onCloseRecoveryDayChooser: () => void;
  onSelectRecoveryDay: (slot: PlannerSlot, recipeId: string) => void;
  showDayChooserKey: string | null;
  detailTargetKey: string;
  targetReferenceForChooser: string | undefined;
  dayChooserWeekOffset: number;
  onCloseDayChooser: () => void;
  onSelectDayChooser: (slot: PlannerSlot) => void;
  nonCookingConfirmation: {
    key: string;
    slot: PlannerSlot;
    recipe: AssignmentRecipe;
  } | null;
  onCloseNonCookingConfirmation: () => void;
  onSavedNonCookingReplacement: (slot: PlannerSlot) => Promise<void>;
  onReviewNonCookingSlot: (slot: PlannerSlot) => void;
  detailRecipeId: string | null;
  detailSheetPlanningProps: ReturnType<typeof buildDetailSheetPlanningProps>;
  onCloseDetailSheet: () => void;
  onRecipeDeleted: () => void;
  onUseForDay: (recipe: Recipe) => Promise<void>;
  onFindSimilar: (recipeId: string) => void;
  pendingRecovery: {
    slot: PlannerSlot;
    recipe: AssignmentRecipe;
  } | null;
  recovery: ReturnType<typeof useReplacementRecovery>;
}

export function RecipesModalsSurface({
  isFiltersOpen,
  activeFilters,
  isDiscoverableOnly,
  gotoOnly,
  activePreferences,
  filterMetadata,
  onApplyFilters,
  onCloseFilters,
  isTrashOpen,
  onCloseTrash,
  recoveryDayChooser,
  onCloseRecoveryDayChooser,
  onSelectRecoveryDay,
  showDayChooserKey,
  detailTargetKey,
  targetReferenceForChooser,
  dayChooserWeekOffset,
  onCloseDayChooser,
  onSelectDayChooser,
  nonCookingConfirmation,
  onCloseNonCookingConfirmation,
  onSavedNonCookingReplacement,
  onReviewNonCookingSlot,
  detailRecipeId,
  detailSheetPlanningProps,
  onCloseDetailSheet,
  onRecipeDeleted,
  onUseForDay,
  onFindSimilar,
  pendingRecovery,
  recovery,
}: RecipesModalsSurfaceProps) {
  return (
    <>
      {isFiltersOpen && (
        <RecipeFiltersSheet
          activeFilters={{ ...activeFilters, discoverableOnly: isDiscoverableOnly, gotoOnly }}
          activePreferences={activePreferences}
          filterMetadata={filterMetadata}
          onApply={onApplyFilters}
          onClose={onCloseFilters}
        />
      )}

      {isTrashOpen && <RecycleBinSheet onClose={onCloseTrash} />}

      {recoveryDayChooser && (
        <PlanningDayChooser
          reference={recoveryDayChooser.reference}
          weekOffset={recoveryDayChooser.weekOffset}
          onClose={onCloseRecoveryDayChooser}
          onSelect={(slot) => onSelectRecoveryDay(slot, recoveryDayChooser.recipe.id)}
        />
      )}

      {showDayChooserKey === detailTargetKey && targetReferenceForChooser && (
        <PlanningDayChooser
          reference={targetReferenceForChooser}
          weekOffset={dayChooserWeekOffset}
          onClose={onCloseDayChooser}
          onSelect={onSelectDayChooser}
        />
      )}

      {nonCookingConfirmation?.key === detailTargetKey && (
        <NonCookingReplacementConfirmation
          slot={nonCookingConfirmation.slot}
          recipe={nonCookingConfirmation.recipe}
          onClose={onCloseNonCookingConfirmation}
          onSaved={() => onSavedNonCookingReplacement(nonCookingConfirmation.slot)}
          onReview={() => onReviewNonCookingSlot(nonCookingConfirmation.slot)}
        />
      )}

      {detailRecipeId && (
        <RecipeDetailSheet
          recipeId={detailRecipeId}
          {...detailSheetPlanningProps}
          onClose={onCloseDetailSheet}
          onDeleted={onRecipeDeleted}
          onUseForDay={onUseForDay}
          onFindSimilar={onFindSimilar}
        />
      )}

      {pendingRecovery && (
        <SkipRecoveryDialog
          pending={recovery.pending}
          isOpen={true}
          step={2}
          canGoBack={false}
          source={pendingRecovery.slot}
          replacement={recovery.feedback}
          confirmAbandon={recovery.confirmAbandon}
          onCancelAbandon={recovery.cancelAbandon}
          onAbandon={recovery.abandon}
          onRetryReplacement={recovery.retry}
          onReviewPlan={recovery.review}
          onChooseAnotherDay={recovery.chooseAnotherDay}
          onClose={recovery.close}
          onBack={recovery.close}
          onAction={recovery.act}
        />
      )}
    </>
  );
}
