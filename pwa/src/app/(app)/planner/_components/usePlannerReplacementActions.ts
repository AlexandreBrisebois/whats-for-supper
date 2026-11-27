'use client';

import type { useRouter } from 'next/navigation';
import { normalizeScheduleRecipe } from '@/lib/api/planner';
import { formatShortSupperPlanDate } from '@/lib/planner/nonCooking';
import type { DetailSource, PlannerOverlay, RecoverySlot } from '@/lib/planner/plannerOverlay';
import { rememberPlanningResult } from '@/lib/planner/planningResult';
import {
  assignRecipeToEmptySlot,
  type AssignmentRecipe,
  type PlannerSlot,
} from '@/lib/planner/slotAssignment';
import { useReplacementRecovery } from '@/lib/planner/useReplacementRecovery';
import { t, tWithVars } from '@/locales';
import { useTodayStore } from '@/store/todayStore';
import { useUiStore } from '@/store/uiStore';
import { useWeekStore } from '@/store/weekStore';

interface UsePlannerReplacementActionsParams {
  pendingRecovery: { slot: RecoverySlot; recipe: AssignmentRecipe } | null;
  referenceWeekStartDate: string | undefined;
  clearConsumedReviewTarget: () => void;
  openDetail: (recipeId: string, source: DetailSource | null) => void;
  openChooseDay: (recipe: AssignmentRecipe, reference: string, weekOffset: number) => void;
  openNonCookingReplacement: (slot: PlannerSlot, recipe: AssignmentRecipe) => void;
  openReplaceRecovery: (slot: RecoverySlot, recipe: AssignmentRecipe) => void;
  closeIfCurrent: (isCurrent: (overlay: PlannerOverlay) => boolean) => void;
  router: ReturnType<typeof useRouter>;
}

export function usePlannerReplacementActions({
  pendingRecovery,
  referenceWeekStartDate,
  clearConsumedReviewTarget,
  openDetail,
  openChooseDay,
  openNonCookingReplacement,
  openReplaceRecovery,
  closeIfCurrent,
  router,
}: UsePlannerReplacementActionsParams) {
  const recovery = useReplacementRecovery({
    slot: pendingRecovery?.slot,
    recipe: pendingRecovery?.recipe,
    onClosed: (saved, reason) => {
      if (!saved && reason === 'dismiss' && pendingRecovery)
        openDetail(pendingRecovery.recipe.id, null);
      else closeIfCurrent((current) => current.kind === 'replaceRecovery');
    },
    onSaved: async () => {
      if (!pendingRecovery) return;
      const { slot } = pendingRecovery;
      await useWeekStore.getState().init(slot.weekOffset, slot.referenceWeekStartDate);
      router.push(
        `/planner?success=1&dayIndex=${slot.dayIndex}&weekOffset=${slot.weekOffset}&referenceWeekStartDate=${slot.referenceWeekStartDate}`
      );
    },
    onReview: () => {
      if (!pendingRecovery) return;
      const { slot } = pendingRecovery;
      clearConsumedReviewTarget();
      router.push(
        `/planner?dayIndex=${slot.dayIndex}&weekOffset=${slot.weekOffset}&referenceWeekStartDate=${slot.referenceWeekStartDate}`
      );
    },
    onChooseAnotherDay: () => {
      if (!pendingRecovery) return;
      const reference =
        pendingRecovery.slot.referenceWeekStartDate ??
        useWeekStore.getState().calendar?.referenceWeekStartDate ??
        referenceWeekStartDate;
      if (!reference) return;
      openChooseDay(pendingRecovery.recipe, reference, pendingRecovery.slot.weekOffset);
    },
    observed: (day) => {
      const slot = pendingRecovery?.slot;
      if (!slot) return;
      const update = {
        date: slot.date,
        recipe: normalizeScheduleRecipe(day.recipe),
        status: day.status ?? 0,
        nonCooking: day.nonCooking,
      };
      useWeekStore.getState().applySlotUpdate(update);
      if (slot.date === useTodayStore.getState().calendar?.today)
        useTodayStore.getState().applyServerUpdate(update);
    },
  });

  const handleChooseDaySelect = async (slot: PlannerSlot, retainedRecipe: AssignmentRecipe) => {
    if (slot.status === 2 || slot.status === 4) {
      useUiStore.getState().addToast({
        type: 'error',
        message:
          slot.status === 2
            ? slot.preparation?.preparedOn
              ? tWithVars('recipes.alreadyCookedOn', 'Prepared on {{date}}', {
                  date: formatShortSupperPlanDate(slot.preparation.preparedOn.toString()),
                })
              : tWithVars('recipes.preparedForDate', 'Prepared for {{date}}', {
                  date: formatShortSupperPlanDate(slot.date),
                })
            : tWithVars('recipes.votingOpenOn', 'Your household is still voting on {{date}}.', {
                date: formatShortSupperPlanDate(slot.date),
              }),
      });
      closeIfCurrent((current) => current.kind === 'chooseDay');
      return;
    }
    if (slot.nonCooking) {
      openNonCookingReplacement(slot, retainedRecipe);
      return;
    }
    if (slot.recipe?.id === retainedRecipe.id) {
      closeIfCurrent((current) => current.kind === 'chooseDay');
      router.push(
        `/planner?dayIndex=${slot.dayIndex}&weekOffset=${slot.weekOffset}&referenceWeekStartDate=${slot.referenceWeekStartDate}`
      );
      return;
    }
    if (slot.recipe) {
      openReplaceRecovery(
        {
          weekOffset: slot.weekOffset,
          referenceWeekStartDate: slot.referenceWeekStartDate,
          dayIndex: slot.dayIndex,
          date: slot.date,
          recipe: slot.recipe,
          removalToken: slot.removalToken,
        },
        retainedRecipe
      );
      return;
    }
    if (
      (slot.status !== 0 && slot.status !== 1 && slot.status !== undefined) ||
      slot.removalToken
    ) {
      useUiStore.getState().addToast({
        type: 'error',
        message: t('recipes.planChanged', 'Your plan changed. Review the selected day in Planner.'),
      });
      closeIfCurrent((current) => current.kind === 'chooseDay');
      return;
    }
    try {
      await assignRecipeToEmptySlot(
        slot.weekOffset,
        slot.dayIndex,
        retainedRecipe,
        slot.referenceWeekStartDate
      );
      if (slot.referenceWeekStartDate) {
        rememberPlanningResult({
          weekOffset: slot.weekOffset,
          dayIndex: slot.dayIndex,
          date: slot.date,
          referenceWeekStartDate: slot.referenceWeekStartDate,
          recipeId: retainedRecipe.id,
          recipeName: retainedRecipe.name ?? '',
        });
      }
      await useWeekStore.getState().init(slot.weekOffset, slot.referenceWeekStartDate);
      closeIfCurrent((current) => current.kind === 'chooseDay');
      router.push(
        `/planner?success=1&dayIndex=${slot.dayIndex}&weekOffset=${slot.weekOffset}&referenceWeekStartDate=${slot.referenceWeekStartDate}`
      );
    } catch {
      await useWeekStore
        .getState()
        .init(slot.weekOffset, slot.referenceWeekStartDate)
        .catch(() => {});
      useUiStore.getState().addToast({
        type: 'error',
        message: t('recipes.planChanged', 'Your plan changed. Review the selected day in Planner.'),
      });
      closeIfCurrent((current) => current.kind === 'chooseDay');
    }
  };

  return {
    recovery,
    handleChooseDaySelect,
  };
}
