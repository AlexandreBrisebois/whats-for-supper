import type { MutableRefObject } from 'react';
import type { useRouter } from 'next/navigation';
import type { DateOnly } from '@microsoft/kiota-abstractions';
import { apiClient } from '@/lib/api/api-client';
import { saveNonCookingDay } from '@/lib/api/planner';
import { calendarDayIndex, type CalendarContext } from '@/lib/deployment-calendar';
import { moveTomorrow, deferToFollowingWeek, type PlannerSlot } from '@/lib/planner/slotAssignment';
import { useTodayStore, type TodayState } from '@/store/todayStore';
import { useWeekStore } from '@/store/weekStore';
import { useUiStore } from '@/store/uiStore';
import { t } from '@/locales';
import { ROUTES } from '@/lib/constants/routes';
import type { NonCookingPlanDto, ScheduleRecipeDto } from '@/lib/api/generated/models/index';
import { getMondayBasedDayIndex, type RecoveryFlowState } from './types';

export async function runPlannedSearchNavigation(params: {
  actionContext: CalendarContext;
  actionRecipe: ScheduleRecipeDto;
  currentRecipe: ScheduleRecipeDto | null;
  router: ReturnType<typeof useRouter>;
  sync: TodayState['sync'];
  onStaleTarget: () => void;
  onSuccess: () => void;
}): Promise<void> {
  const { actionContext, actionRecipe, currentRecipe, router, sync, onStaleTarget, onSuccess } =
    params;
  const fresh = await useTodayStore.getState().ensureCalendar();
  const displayed = useTodayStore.getState().currentRecipe;
  if (
    fresh.today !== actionContext.today ||
    fresh.referenceWeekStartDate !== actionContext.referenceWeekStartDate ||
    displayed?.id !== actionRecipe.id ||
    currentRecipe?.id !== actionRecipe.id
  ) {
    onStaleTarget();
    try {
      await sync();
    } catch {
      /* The stale target is still closed; the next Home read can retry. */
    }
    useUiStore.getState().addToast({
      type: 'error',
      message: t(
        'home.planChangedRetry',
        'Tonight’s plan changed. Choose again from the current card.'
      ),
    });
    return;
  }
  const searchParams = new URLSearchParams({
    focus: 'search',
    addToDay: String(calendarDayIndex(actionContext)),
    weekOffset: '0',
    referenceWeekStartDate: actionContext.referenceWeekStartDate,
  });
  onSuccess();
  router.push(`/recipes?${searchParams}`);
}

export async function executeRecoveryDisposition(params: {
  action: 'tomorrow' | 'next_week' | 'drop';
  context: CalendarContext;
  todayDate: DateOnly;
  actionRecipe: ScheduleRecipeDto | null;
  recoveryFlow: RecoveryFlowState;
  tomorrowSourceRef: MutableRefObject<PlannerSlot | null>;
  sync: TodayState['sync'];
  router: ReturnType<typeof useRouter>;
  setRecoveryFlow: (next: RecoveryFlowState) => void;
}): Promise<void> {
  const {
    action,
    context,
    todayDate,
    actionRecipe,
    recoveryFlow,
    tomorrowSourceRef,
    sync,
    router,
    setRecoveryFlow,
  } = params;
  const todayStr = context.today;
  const activeNonCooking =
    recoveryFlow.kind === 'step2' && recoveryFlow.intent === 'non_cooking'
      ? recoveryFlow.nonCooking
      : undefined;

  const applyConfirmedNonCooking = (plan: NonCookingPlanDto) => {
    const update = { date: todayStr, recipe: null, status: 3, nonCooking: plan };
    useTodayStore.getState().applyServerUpdate(update);
    useWeekStore.getState().applySlotUpdate(update);
  };

  const refreshCurrentWeekAndSync = async (confirmedPlan?: NonCookingPlanDto) => {
    if (
      !useWeekStore.getState().weekStartDate ||
      useWeekStore.getState().weekStartDate === context.currentWeekStartDate
    )
      await useWeekStore.getState().init(0, context.referenceWeekStartDate);
    if (confirmedPlan) {
      useWeekStore.getState().applySlotUpdate({
        date: todayStr,
        recipe: null,
        status: 3,
        nonCooking: confirmedPlan,
      });
    }
    sync();
  };

  if (action === 'tomorrow') {
    if (!actionRecipe?.id) {
      setRecoveryFlow({ kind: 'closed' });
      return;
    }
    tomorrowSourceRef.current ??= {
      weekOffset: 0,
      dayIndex: getMondayBasedDayIndex(todayStr),
      date: todayStr,
      recipe: actionRecipe,
      referenceWeekStartDate: context.referenceWeekStartDate,
    };
    await moveTomorrow(tomorrowSourceRef.current, activeNonCooking);
    if (activeNonCooking) applyConfirmedNonCooking(activeNonCooking);
    setRecoveryFlow({ kind: 'closed' });
    await refreshCurrentWeekAndSync(activeNonCooking);
    router.push(
      `${ROUTES.PLANNER}?weekOffset=0&referenceWeekStartDate=${context.referenceWeekStartDate}`
    );
  } else if (action === 'next_week') {
    if (!actionRecipe?.id) {
      setRecoveryFlow({ kind: 'closed' });
      return;
    }
    tomorrowSourceRef.current ??= {
      weekOffset: 0,
      dayIndex: calendarDayIndex(context),
      date: todayStr,
      referenceWeekStartDate: context.referenceWeekStartDate,
      recipe: actionRecipe,
    };
    const deferResult = await deferToFollowingWeek(tomorrowSourceRef.current, activeNonCooking);
    if (activeNonCooking) applyConfirmedNonCooking(activeNonCooking);
    if (deferResult?.data?.message && deferResult.data.refreshComplete !== false) {
      useUiStore.getState().addToast(deferResult.data.message);
    }
    setRecoveryFlow({ kind: 'closed' });
    await refreshCurrentWeekAndSync(activeNonCooking);
  } else if (action === 'drop') {
    if (activeNonCooking) {
      await saveNonCookingDay(todayStr, activeNonCooking, { replaceRecipe: true });
      applyConfirmedNonCooking(activeNonCooking);
    } else {
      await apiClient.api.schedule.day.byDate(todayDate).remove.delete();
      // Reset today's slot so the user can re-plan after dropping
      useTodayStore.getState().applyServerUpdate({ date: todayStr, recipe: null, status: 0 });
    }
    setRecoveryFlow({ kind: 'closed' });
    await refreshCurrentWeekAndSync(activeNonCooking);
    router.push(
      `${ROUTES.PLANNER}?weekOffset=0&referenceWeekStartDate=${context.referenceWeekStartDate}`
    );
  }
}
