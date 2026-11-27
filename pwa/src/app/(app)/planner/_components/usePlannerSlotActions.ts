'use client';

import { useCallback, useState } from 'react';
import type { useRouter } from 'next/navigation';
import type { PlannerOverlay, RecoverySlot } from '@/lib/planner/plannerOverlay';
import {
  deferToFollowingWeek,
  type AssignmentRecipe,
  type PlannerSlot,
} from '@/lib/planner/slotAssignment';
import { useTodayStore } from '@/store/todayStore';
import { useUiStore } from '@/store/uiStore';
import { useWeekStore, type UILocalScheduleDay } from '@/store/weekStore';

export interface QuickFindSelection {
  id: string;
  name?: string | null;
  image?: string | null;
}

interface UsePlannerSlotActionsParams {
  currentWeekOffset: number;
  referenceWeekStartDate: string | undefined;
  schedule: UILocalScheduleDay[];
  pivotDayIndex: number | null;
  quickFindDayIndex: number | null;
  openReplaceRecovery: (slot: RecoverySlot, recipe: AssignmentRecipe) => void;
  openCookedDefer: (slot: PlannerSlot) => void;
  closeOverlay: () => void;
  closeIfCurrent: (isCurrent: (overlay: PlannerOverlay) => boolean) => void;
  router: ReturnType<typeof useRouter>;
}

export function usePlannerSlotActions({
  currentWeekOffset,
  referenceWeekStartDate,
  schedule,
  pivotDayIndex,
  quickFindDayIndex,
  openReplaceRecovery,
  openCookedDefer,
  closeOverlay,
  closeIfCurrent,
  router,
}: UsePlannerSlotActionsParams) {
  const [showSuccess, setShowSuccess] = useState(false);

  const handleCloseVoting = async () => {
    try {
      await useWeekStore.getState().closeVoting();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error: unknown) {
      console.warn('Failed to close voting:', error instanceof Error ? error.message : error);
    }
  };

  // The dialog keeps its Escape listener through its exit animation; never close a newer overlay.
  const closeNudgeDialog = useCallback(
    () => closeIfCurrent((current) => current.kind === 'nudge'),
    [closeIfCurrent]
  );

  // Quick Find can call back during its exit animation; never close a newer overlay.
  const closeQuickFind = () => closeIfCurrent((current) => current.kind === 'quickFind');

  const handleQuickFindSelect = async (recipe: QuickFindSelection) => {
    const selectedDayIndex = quickFindDayIndex;
    if (selectedDayIndex === null) return;
    const selectedDay = schedule[selectedDayIndex];
    const nextRecipe = {
      id: recipe.id,
      name: recipe.name ?? null,
      image: recipe.image ?? '',
    };

    if (selectedDay?.recipe?.id && selectedDay.date) {
      openReplaceRecovery(
        {
          weekOffset: currentWeekOffset,
          referenceWeekStartDate: useWeekStore.getState().calendar?.referenceWeekStartDate,
          dayIndex: selectedDayIndex,
          date: selectedDay.date,
          recipe: selectedDay.recipe,
          removalToken: selectedDay.removalToken,
        },
        nextRecipe
      );
      return;
    }

    try {
      await useWeekStore.getState().assignRecipe(selectedDayIndex, {
        id: nextRecipe.id,
        name: nextRecipe.name,
        image: nextRecipe.image,
      });

      // Propagate to todayStore if this is today's slot
      const assignedDate = schedule[selectedDayIndex]?.date;
      if (currentWeekOffset === 0 && assignedDate === useTodayStore.getState().calendar?.today) {
        useTodayStore
          .getState()
          .applyServerUpdate({ date: assignedDate, recipe: nextRecipe, status: 0 });
      }

      closeQuickFind();
    } catch {
      await useWeekStore.getState().init(currentWeekOffset, referenceWeekStartDate);
      useUiStore.getState().addToast({
        type: 'error',
        message: 'That recipe could not be added. Your plan was refreshed; please try again.',
      });
    }
  };

  const handleSearchPath = () => {
    if (pivotDayIndex === null) return;
    router.push(
      `/recipes?addToDay=${pivotDayIndex}&weekOffset=${currentWeekOffset}&referenceWeekStartDate=${useWeekStore.getState().calendar?.referenceWeekStartDate ?? ''}`
    );
  };

  const handleAskFamily = async () => {
    try {
      await useWeekStore.getState().openVoting();
      closeIfCurrent((current) => current.kind === 'pivot');
    } catch (error: unknown) {
      console.warn('Failed to open voting:', error instanceof Error ? error.message : error);
    }
  };

  const handleRemoveRecipe = async () => {
    if (pivotDayIndex === null) return;
    const date = schedule[pivotDayIndex].date;
    if (!date) return;
    closeOverlay();
    useWeekStore.getState().removeRecipe(pivotDayIndex, date);
  };

  const executePlanLater = async (slot: PlannerSlot, cookedDisposition?: 'reset' | 'preserve') => {
    let result;
    try {
      result = await deferToFollowingWeek(
        slot,
        undefined,
        cookedDisposition ? { cookedDisposition } : undefined
      );
    } catch (error) {
      const status = (error as { responseStatusCode?: number })?.responseStatusCode;
      useUiStore.getState().addToast({
        type: 'error',
        message:
          status === 404 || status === 409
            ? 'That meal changed. Your plan was refreshed; review it before trying again.'
            : 'Could not move that meal right now. Review your plan before trying again.',
      });
      await Promise.allSettled([
        useWeekStore.getState().init(slot.weekOffset, referenceWeekStartDate),
      ]);
      return;
    }

    let viewRefreshFailed = false;
    try {
      await useWeekStore.getState().init(slot.weekOffset, referenceWeekStartDate);
      if (slot.weekOffset === 0 && slot.date === useTodayStore.getState().calendar?.today) {
        await useTodayStore.getState().sync();
      }
    } catch {
      viewRefreshFailed = true;
    }

    if (result.data.refreshComplete !== false) {
      if (viewRefreshFailed) {
        useUiStore.getState().addToast({
          type: 'warning',
          message: 'Meal moved. Some updates could not refresh. Refresh your plan to check it.',
        });
      } else if (result.data.message) {
        useUiStore.getState().addToast(result.data.message);
      }
    }
  };

  const handlePlanLater = async (dayIndex: number) => {
    const day = schedule[dayIndex];
    const recipeId = day?.recipe?.id;
    if (!recipeId || !day?.date) return;

    closeOverlay();

    const slot: PlannerSlot = {
      weekOffset: currentWeekOffset,
      referenceWeekStartDate: useWeekStore.getState().calendar?.referenceWeekStartDate,
      dayIndex,
      date: day.date,
      recipe: day.recipe ?? null,
      status: day.status,
      removalToken: day.removalToken,
      nonCooking: day.nonCooking,
    };

    if (day.status === 2) {
      openCookedDefer(slot);
      return;
    }

    await executePlanLater(slot);
  };

  return {
    showSuccess,
    handleCloseVoting,
    closeNudgeDialog,
    closeQuickFind,
    handleQuickFindSelect,
    handleSearchPath,
    handleAskFamily,
    handleRemoveRecipe,
    executePlanLater,
    handlePlanLater,
  };
}
