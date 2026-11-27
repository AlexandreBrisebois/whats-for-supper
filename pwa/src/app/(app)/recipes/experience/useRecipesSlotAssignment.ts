'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Recipe } from '@/lib/api/recipes';
import {
  calendarAnchorIsFresh,
  CalendarUnavailableError,
  type loadCalendarSnapshot,
} from '@/lib/deployment-calendar';
import { rememberPlanningResult } from '@/lib/planner/planningResult';
import {
  assignRecipeToEmptySlot,
  getPlannerSlot,
  type AssignmentRecipe,
  type PlannerSlot,
} from '@/lib/planner/slotAssignment';
import { usePlannerStore } from '@/store/plannerStore';
import { t } from '@/locales';
import { buildDetailSheetPlanningProps } from './recipesDetailPlanningProps';
import type { useRecipesPlanningTarget } from './useRecipesPlanningTarget';
import { useRecipesReplacementRecoveryFlow } from './useRecipesReplacementRecoveryFlow';

const toAssignmentRecipe = (recipe: Recipe): AssignmentRecipe => ({
  id: recipe.id,
  name: recipe.name ?? null,
  image: recipe.imageUrl ?? '',
});

interface UseRecipesSlotAssignmentParams {
  planningTarget: ReturnType<typeof useRecipesPlanningTarget>;
  reviewDuplicateParam: string | null;
}

export function useRecipesSlotAssignment({
  planningTarget,
  reviewDuplicateParam,
}: UseRecipesSlotAssignmentParams) {
  const router = useRouter();
  const {
    openRecipeId,
    sourceGroceryReturn,
    grocerySourceEntry,
    setSourcePlanningEntry,
    detailRecipeId,
    setDetailRecipeId,
    originalSourceReview,
    restoreDetailReturnFocus,
    setChosenDetailTarget,
    setTargetRead,
    setTargetReadAttempt,
    readAutomaticCalendar,
    setShowDayChooser,
    uncertainAssignment,
    setUncertainAssignment,
    detailTargetKey,
    isCurrentDetailContext,
    getTargetReadGeneration,
    bumpTargetReadGeneration,
    assignmentNeedsCheck,
    automaticTarget,
    visibleTarget,
    targetReadError,
    targetChecking,
    planningDayLabel,
    targetCompleted,
    targetVoting,
    targetReview,
    identicalTarget,
    confirmedPlannedTarget,
    targetReferenceForChooser,
    refreshDetailTarget,
  } = planningTarget;

  const [nonCookingConfirmation, setNonCookingConfirmation] = useState<{
    key: string;
    slot: PlannerSlot;
    recipe: AssignmentRecipe;
  } | null>(null);

  const {
    pendingRecovery,
    setPendingRecovery,
    recoveryDayChooser,
    setRecoveryDayChooser,
    recovery,
  } = useRecipesReplacementRecoveryFlow({
    router,
    targetReferenceForChooser,
    setDetailRecipeId,
  });

  const handleDetailSheetClose = useCallback(() => {
    setDetailRecipeId(null);
    setSourcePlanningEntry(null);
    setShowDayChooser(null);
    setNonCookingConfirmation(null);
    if (grocerySourceEntry && detailRecipeId === openRecipeId && sourceGroceryReturn) {
      usePlannerStore.getState().setActiveTab('grocery');
      router.replace(sourceGroceryReturn);
      return;
    }
    restoreDetailReturnFocus();
  }, [
    setDetailRecipeId,
    setSourcePlanningEntry,
    setShowDayChooser,
    grocerySourceEntry,
    detailRecipeId,
    openRecipeId,
    sourceGroceryReturn,
    router,
    restoreDetailReturnFocus,
  ]);

  const reviewDetailTarget = useCallback(
    (slot: PlannerSlot) => {
      router.push(
        `/planner?dayIndex=${slot.dayIndex}&weekOffset=${slot.weekOffset}&referenceWeekStartDate=${slot.referenceWeekStartDate}`
      );
    },
    [router]
  );

  const handleSelectForPlanner = async (recipe: Recipe) => {
    const key = detailTargetKey;
    const active = () => isCurrentDetailContext(key);
    if (targetChecking)
      throw new Error(
        t('recipes.checkPlanFailed', 'Could not confirm this meal. Retry check before saving.')
      );
    if (targetReadError) throw new Error(targetReadError);
    if (!visibleTarget)
      throw new Error(
        t('recipes.checkPlanFailed', 'Could not confirm this meal. Retry check before saving.')
      );
    const previous = uncertainAssignment?.key === key ? uncertainAssignment : null;
    if (previous) {
      const checked = await getPlannerSlot(
        previous.slot.weekOffset,
        previous.slot.dayIndex,
        previous.slot.referenceWeekStartDate
      );
      if (!active()) return;
      if (!checked)
        throw new Error(
          t('recipes.checkPlanFailed', 'Could not confirm this meal. Retry check before saving.')
        );
      if (checked.recipe?.id === previous.recipe.id) {
        rememberPlanningResult({
          ...checked,
          referenceWeekStartDate: checked.referenceWeekStartDate!,
          recipeId: previous.recipe.id,
          recipeName: previous.recipe.name ?? '',
        });
        setUncertainAssignment(null);
        router.push(
          `/planner?success=1&dayIndex=${checked.dayIndex}&weekOffset=${checked.weekOffset}&referenceWeekStartDate=${checked.referenceWeekStartDate}`
        );
        return;
      }
      setUncertainAssignment(null);
      if (
        automaticTarget &&
        !checked.recipe &&
        checked.status === 0 &&
        !checked.nonCooking &&
        !checked.removalToken
      )
        refreshDetailTarget();
      else setTargetRead({ key, slot: checked });
      throw new Error(
        checked.recipe || checked.status !== 0
          ? t('recipes.planChanged', 'Your plan changed. Review the selected day in Planner.')
          : t('recipes.notSaved', 'This meal was not saved. Try saving again.')
      );
    }
    if (targetReview || identicalTarget) {
      reviewDetailTarget(visibleTarget);
      return;
    }
    const captured = visibleTarget;
    const generation = getTargetReadGeneration();
    let fresh: Awaited<ReturnType<typeof loadCalendarSnapshot>> | undefined;
    if (automaticTarget) {
      try {
        fresh = await readAutomaticCalendar();
      } catch (error) {
        if (active() && getTargetReadGeneration() === generation)
          setTargetRead({
            key,
            slot: captured,
            error: error instanceof Error ? error.message : new CalendarUnavailableError().message,
          });
        return;
      }
      if (!active() || getTargetReadGeneration() !== generation) return;
      if (!calendarAnchorIsFresh(fresh.anchor) || captured.date < fresh.calendar.today) {
        refreshDetailTarget();
        return;
      }
    }
    let slot: PlannerSlot | null;
    try {
      slot = await getPlannerSlot(
        captured.weekOffset,
        captured.dayIndex,
        captured.referenceWeekStartDate
      );
    } catch (error) {
      if (active() && getTargetReadGeneration() === generation)
        setTargetRead({
          key,
          slot: captured,
          error: error instanceof Error ? error.message : new CalendarUnavailableError().message,
        });
      return;
    }
    if (!active() || getTargetReadGeneration() !== generation) return;
    if (fresh && !calendarAnchorIsFresh(fresh.anchor)) {
      refreshDetailTarget();
      return;
    }
    if (!slot || slot.referenceWeekStartDate !== captured.referenceWeekStartDate) {
      setTargetRead({
        key,
        slot: captured,
        error: t(
          'recipes.checkPlanFailed',
          'Could not confirm this meal. Retry check before saving.'
        ),
      });
      return;
    }
    if (slot.status === 2 || slot.status === 4 || slot.recipe?.id === recipe.id) {
      setTargetRead({ key, slot });
      return;
    }
    const assignmentRecipe = toAssignmentRecipe(recipe);
    if (slot.nonCooking) {
      setNonCookingConfirmation({ key, slot, recipe: assignmentRecipe });
      return;
    }
    if (slot.status !== 0 && slot.status !== 1 && slot.status !== undefined)
      throw new Error(
        t('recipes.planChanged', 'Your plan changed. Review the selected day in Planner.')
      );
    if (slot.recipe) {
      setDetailRecipeId(null);
      setPendingRecovery({ slot, recipe: assignmentRecipe });
      return;
    }
    if (slot.removalToken)
      throw new Error(
        t('recipes.planChanged', 'Your plan changed. Review the selected day in Planner.')
      );
    try {
      await assignRecipeToEmptySlot(
        slot.weekOffset,
        slot.dayIndex,
        assignmentRecipe,
        slot.referenceWeekStartDate
      );
    } catch (error) {
      if (!active()) return;
      const status = (error as { responseStatusCode?: number })?.responseStatusCode;
      if (![400, 401, 403, 409].includes(status ?? 0)) {
        bumpTargetReadGeneration();
        setTargetRead({ key, slot });
        setUncertainAssignment({ key, slot, recipe: assignmentRecipe });
        throw new Error(
          t(
            'recipes.checkPlanRequired',
            'The save could not be confirmed. Activate again to check the selected day before another save.'
          )
        );
      }
      throw new Error(
        t('recipes.planChanged', 'Your plan changed. Review the selected day in Planner.')
      );
    }
    if (!active()) return;
    rememberPlanningResult({
      ...slot,
      referenceWeekStartDate: slot.referenceWeekStartDate!,
      recipeId: recipe.id,
      recipeName: recipe.name ?? '',
    });
    router.push(
      `/planner?success=1&dayIndex=${slot.dayIndex}&weekOffset=${slot.weekOffset}&referenceWeekStartDate=${slot.referenceWeekStartDate}`
    );
  };

  const detailSheetPlanningProps = buildDetailSheetPlanningProps({
    detailRecipeId,
    openRecipeId,
    reviewDuplicateParam,
    originalSourceReview,
    planningDayLabel,
    visibleTarget,
    assignmentNeedsCheck,
    targetReadError,
    confirmedPlannedTarget,
    detailTargetKey,
    targetChecking,
    targetCompleted,
    targetVoting,
    identicalTarget,
    targetReferenceForChooser,
    grocerySourceEntry,
    isCurrentDetailContext,
    getTargetReadGeneration,
    setTargetRead,
    setTargetReadAttempt,
    setShowDayChooser,
    setSourcePlanningEntry,
    setChosenDetailTarget,
    reviewDetailTarget,
  });

  return {
    router,
    nonCookingConfirmation,
    setNonCookingConfirmation,
    pendingRecovery,
    recoveryDayChooser,
    setRecoveryDayChooser,
    recovery,
    handleDetailSheetClose,
    reviewDetailTarget,
    handleSelectForPlanner,
    detailSheetPlanningProps,
  };
}
