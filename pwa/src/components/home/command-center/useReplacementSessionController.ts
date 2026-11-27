import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { useRouter } from 'next/navigation';
import { getSchedule, normalizeScheduleRecipe } from '@/lib/api/planner';
import { calendarDayIndex, type CalendarContext } from '@/lib/deployment-calendar';
import {
  disposeReplacementOriginal,
  getPlannerSlot,
  type AssignmentRecipe,
  type PlannerSlot,
} from '@/lib/planner/slotAssignment';
import {
  continueReplacementSession,
  createReplacementSession,
  type ReplacementAction,
  type ReplacementFeedback,
  type ReplacementSession,
} from '@/lib/planner/replacementSession';
import { rememberPlanningResult } from '@/lib/planner/planningResult';
import { useTodayStore } from '@/store/todayStore';
import { useWeekStore } from '@/store/weekStore';
import { useUiStore } from '@/store/uiStore';
import { t } from '@/locales';
import { ROUTES } from '@/lib/constants/routes';
import type { ScheduleRecipeDto } from '@/lib/api/generated/models/index';
import { needsAbandonConfirm, type DayChooserState } from './types';

interface UseReplacementSessionControllerParams {
  router: ReturnType<typeof useRouter>;
  saveRecoveryRecipe: (
    recipe: { id: string; name: string | null; image: string },
    capturedCalendar: CalendarContext
  ) => Promise<void>;
  sync: () => Promise<void>;
  recoverySubmissionRef: MutableRefObject<boolean>;
  setRecoveryPending: (pending: boolean) => void;
  closeRecoveryFlow: () => void;
}

export function useReplacementSessionController({
  router,
  saveRecoveryRecipe,
  sync,
  recoverySubmissionRef,
  setRecoveryPending,
  closeRecoveryFlow,
}: UseReplacementSessionControllerParams) {
  const openingSlot = useRef<Promise<PlannerSlot | null> | null>(null);
  const replacementSession = useRef<(ReplacementSession & { context: CalendarContext }) | null>(
    null
  );
  const [replacementFeedback, setReplacementFeedback] = useState<ReplacementFeedback | null>(null);
  const reviewOnAbandon = useRef(false);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [dayChooserState, setDayChooserState] = useState<DayChooserState | null>(null);

  useEffect(
    () => () => {
      replacementSession.current = null;
    },
    []
  );

  const resetForOpening = useCallback(
    (
      kind: 'step1' | 'quick_find',
      context: CalendarContext,
      capturedRecipe: ScheduleRecipeDto | null
    ) => {
      replacementSession.current = null;
      setReplacementFeedback(null);
      // Capture when recovery opens; never adopt a newer same-recipe snapshot at deletion time.
      openingSlot.current =
        kind === 'step1' && capturedRecipe?.id
          ? getPlannerSlot(0, calendarDayIndex(context), context.referenceWeekStartDate).catch(
              () => null
            )
          : null;
    },
    []
  );

  const continueReplacement = useCallback(async () => {
    const session = replacementSession.current;
    if (!session || recoverySubmissionRef.current) return;
    recoverySubmissionRef.current = true;
    setRecoveryPending(true);
    const active = () => replacementSession.current === session;
    const { context, recipe, slot } = session;
    const read = async () => {
      const snapshot = await getSchedule(slot.weekOffset, slot.referenceWeekStartDate, true);
      const day = snapshot?.days?.find((entry) => entry.date === slot.date);
      if (!day) throw new Error('Plan refresh failed');
      return day;
    };
    const observed = (day: Awaited<ReturnType<typeof read>>) => {
      const update = {
        date: slot.date,
        recipe: normalizeScheduleRecipe(day.recipe),
        status: day.status ?? 0,
        nonCooking: day.nonCooking,
      };
      useTodayStore.getState().applyServerUpdate(update);
      useWeekStore.getState().applySlotUpdate(update);
    };
    try {
      const ready = await continueReplacementSession(session, {
        active,
        read,
        observed,
        feedback: setReplacementFeedback,
        dispose: async () => {
          if (session.action === 'drop') {
            const original = await openingSlot.current;
            if (!active()) throw new Error('Recovery closed.');
            if (
              !original?.removalToken ||
              original.recipe?.id !== slot.recipe?.id ||
              original.status !== slot.status
            )
              throw Object.assign(new Error('The original supper changed. Review your plan.'), {
                responseStatusCode: 409,
              });
            slot.removalToken = original.removalToken;
          }
          return disposeReplacementOriginal(slot, session.action);
        },
        save: () => saveRecoveryRecipe(recipe, context),
      });
      if (!ready || !active()) return;
      if (session.saveReconciled)
        useUiStore.getState().addToast({
          type: 'error',
          message: t(
            'planning.replacement.reconciled',
            'Your new meal is saved. Some plan updates could not be confirmed. Refresh your plan if needed.'
          ),
        });
      const day = await read();
      if (!active()) return;
      observed(day);
      if (
        !useWeekStore.getState().weekStartDate ||
        useWeekStore.getState().weekStartDate === context.currentWeekStartDate
      )
        await useWeekStore.getState().init(0, context.referenceWeekStartDate);
      if (!active()) return;
      rememberPlanningResult({
        weekOffset: slot.weekOffset,
        dayIndex: slot.dayIndex,
        referenceWeekStartDate: context.referenceWeekStartDate,
        date: slot.date,
        recipeId: recipe.id,
        recipeName: recipe.name ?? '',
        original: session.disposition,
      });
      closeRecoveryFlow();
      setReplacementFeedback(null);
      replacementSession.current = null;
      void sync();
      router.push(
        `${ROUTES.PLANNER}?success=1&dayIndex=${slot.dayIndex}&weekOffset=${slot.weekOffset}&referenceWeekStartDate=${context.referenceWeekStartDate}`
      );
    } catch {
      if (active())
        setReplacementFeedback({
          phase: 'refresh',
          original: session.disposition,
          message: t(
            'planning.replacement.refresh',
            'Your new meal is saved, but your plan could not refresh.'
          ),
          recipeName: recipe.name,
        });
    } finally {
      if (active() || replacementSession.current === null) {
        recoverySubmissionRef.current = false;
        setRecoveryPending(false);
      }
    }
  }, [
    closeRecoveryFlow,
    recoverySubmissionRef,
    router,
    saveRecoveryRecipe,
    setRecoveryPending,
    sync,
  ]);

  const startOrContinueReplacement = useCallback(
    async (params: {
      actionContext: CalendarContext;
      actionRecipe: ScheduleRecipeDto;
      actionStatus: number;
      pendingRecipe: AssignmentRecipe;
      action: ReplacementAction;
    }) => {
      const { actionContext, actionRecipe, actionStatus, pendingRecipe, action } = params;
      replacementSession.current ??= {
        ...createReplacementSession(
          {
            weekOffset: 0,
            dayIndex: calendarDayIndex(actionContext),
            date: actionContext.today,
            referenceWeekStartDate: actionContext.referenceWeekStartDate,
            recipe: actionRecipe,
            status: actionStatus,
          },
          pendingRecipe,
          action
        ),
        context: actionContext,
      };
      await continueReplacement();
    },
    [continueReplacement]
  );

  const closeRecovery = useCallback(() => {
    reviewOnAbandon.current = false;
    if (recoverySubmissionRef.current) return;
    if (replacementSession.current?.saved) {
      replacementSession.current = null;
      setReplacementFeedback(null);
      void sync();
    }
    if (needsAbandonConfirm(replacementSession.current)) {
      setConfirmAbandon(true);
      return;
    }
    replacementSession.current = null;
    setReplacementFeedback(null);
    closeRecoveryFlow();
  }, [closeRecoveryFlow, recoverySubmissionRef, sync]);

  const abandonReplacement = useCallback(
    (actionContext: CalendarContext | null) => {
      replacementSession.current = null;
      setConfirmAbandon(false);
      setReplacementFeedback(null);
      closeRecoveryFlow();
      void sync();
      if (reviewOnAbandon.current) {
        const dayIndexParam = actionContext ? `dayIndex=${calendarDayIndex(actionContext)}&` : '';
        router.push(
          `${ROUTES.PLANNER}?${dayIndexParam}weekOffset=0&referenceWeekStartDate=${actionContext?.referenceWeekStartDate ?? ''}`
        );
      }
      reviewOnAbandon.current = false;
    },
    [closeRecoveryFlow, router, sync]
  );

  const cancelAbandon = useCallback(() => {
    reviewOnAbandon.current = false;
    setConfirmAbandon(false);
  }, []);

  const reviewPlan = useCallback(
    (actionContext: CalendarContext | null) => {
      if (needsAbandonConfirm(replacementSession.current)) {
        reviewOnAbandon.current = true;
        setConfirmAbandon(true);
        return;
      }
      const dayIndexParam = actionContext ? `dayIndex=${calendarDayIndex(actionContext)}&` : '';
      const refParam = actionContext?.referenceWeekStartDate ?? '';
      replacementSession.current = null;
      setReplacementFeedback(null);
      closeRecoveryFlow();
      router.push(
        `${ROUTES.PLANNER}?${dayIndexParam}weekOffset=0&referenceWeekStartDate=${refParam}`
      );
    },
    [closeRecoveryFlow, router]
  );

  const chooseAnotherDay = useCallback(
    (pendingRecipe: AssignmentRecipe, actionContext: CalendarContext) => {
      const retained: AssignmentRecipe = {
        id: pendingRecipe.id,
        name: pendingRecipe.name ?? null,
        image: pendingRecipe.image ?? '',
      };
      const reference = actionContext.referenceWeekStartDate;
      replacementSession.current = null;
      setReplacementFeedback(null);
      setConfirmAbandon(false);
      closeRecoveryFlow();
      setDayChooserState({ recipe: retained, reference });
    },
    [closeRecoveryFlow]
  );

  const hasStartedReplacement = useCallback(() => replacementSession.current !== null, []);

  const closeDayChooser = useCallback(() => setDayChooserState(null), []);

  const selectDayChooserSlot = useCallback(
    (slot: { dayIndex: number; weekOffset: number; referenceWeekStartDate?: string }) => {
      if (!dayChooserState) return;
      const recipeId = dayChooserState.recipe.id;
      const fallbackReference = dayChooserState.reference;
      setDayChooserState(null);
      router.push(
        `/recipes?open=${encodeURIComponent(recipeId)}&addToDay=${slot.dayIndex}&weekOffset=${slot.weekOffset}&referenceWeekStartDate=${slot.referenceWeekStartDate ?? fallbackReference}`
      );
    },
    [dayChooserState, router]
  );

  return {
    replacementFeedback,
    confirmAbandon,
    dayChooserState,
    resetForOpening,
    continueReplacement,
    startOrContinueReplacement,
    closeRecovery,
    abandonReplacement,
    cancelAbandon,
    reviewPlan,
    chooseAnotherDay,
    hasStartedReplacement,
    closeDayChooser,
    selectDayChooserSlot,
  };
}
