'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { formatSupperPlanDate } from '@/lib/planner/nonCooking';
import { subscribeIngredientProjectionInvalidation } from '@/lib/ingredient-projection-invalidation';
import {
  calendarAnchorIsFresh,
  CalendarUnavailableError,
  calendarTime,
  loadCalendarSnapshot,
  type CalendarAnchor,
} from '@/lib/deployment-calendar';
import {
  findFirstOpenPlannerSlot,
  getPlannerSlot,
  type AssignmentRecipe,
  type PlannerSlot,
} from '@/lib/planner/slotAssignment';
import { t } from '@/locales';
import { useRecipesUrlPlanningContext } from './useRecipesUrlPlanningContext';

export interface TargetReadState {
  key: string;
  slot?: PlannerSlot;
  error?: string;
  checking?: boolean;
  anchor?: CalendarAnchor;
}

export interface UncertainSlotAssignment {
  key: string;
  slot: PlannerSlot;
  recipe: AssignmentRecipe;
}

export function useRecipesPlanningTarget(searchParams: Pick<URLSearchParams, 'get' | 'has'>) {
  const urlContext = useRecipesUrlPlanningContext(searchParams);
  const {
    addToDay,
    weekOffset,
    hasPlanningTarget,
    entryContext,
    entryContextKey,
    planningCalendar,
    setPlanningCalendar,
    planningCalendarError,
    retryPlanningCalendar,
    targetDay,
    targetWeek,
    suppliedReference,
    validTarget,
    urlPlanningDayLabel,
    openRecipeId,
    sourceGroceryReturn,
    grocerySourceEntry,
    sourcePlanningEntry,
    setSourcePlanningEntry,
    detailRecipeId,
    setDetailRecipeId,
    originalSourceReview,
    handleCardTap,
    handleStackCardTap,
    restoreDetailReturnFocus,
  } = urlContext;

  const [uncertainAssignment, setUncertainAssignment] = useState<UncertainSlotAssignment | null>(
    null
  );
  const [chosenDetailTarget, setChosenDetailTarget] = useState<{
    entry: string;
    slot: PlannerSlot;
  } | null>(null);
  const [targetRead, setTargetRead] = useState<TargetReadState | null>(null);
  const automaticCalendarRead = useRef<Pick<
    Awaited<ReturnType<typeof loadCalendarSnapshot>>,
    'calendar' | 'anchor'
  > | null>(null);

  const readAutomaticCalendar = useCallback(async () => {
    const snapshot = await loadCalendarSnapshot();
    const previous = automaticCalendarRead.current;
    if (previous?.calendar.timeZone === snapshot.calendar.timeZone) {
      if (
        snapshot.calendar.today < previous.calendar.today ||
        (!calendarAnchorIsFresh(previous.anchor) &&
          snapshot.calendar.today === previous.calendar.today)
      )
        throw new CalendarUnavailableError();
      if (
        Date.parse(snapshot.calendar.capturedAtUtc) <= Date.parse(previous.calendar.capturedAtUtc)
      )
        snapshot.anchor = previous.anchor;
    }
    if (!calendarAnchorIsFresh(snapshot.anchor)) throw new CalendarUnavailableError();
    automaticCalendarRead.current = { calendar: snapshot.calendar, anchor: snapshot.anchor };
    return snapshot;
  }, []);

  const [targetReadAttempt, setTargetReadAttempt] = useState(0);
  const targetReadGeneration = useRef(0);
  const [showDayChooser, setShowDayChooser] = useState<string | null>(null);

  const chosenTarget =
    chosenDetailTarget?.entry === entryContextKey ? chosenDetailTarget.slot : null;
  const detailTargetKey = JSON.stringify([
    detailRecipeId,
    entryContextKey,
    chosenTarget,
    grocerySourceEntry,
    sourcePlanningEntry,
  ]);
  const detailContextRef = useRef<string | null>(detailTargetKey);
  useLayoutEffect(() => {
    detailContextRef.current = detailTargetKey;
    return () => {
      detailContextRef.current = null;
    };
  }, [detailTargetKey]);

  const isCurrentDetailContext = useCallback((key: string) => detailContextRef.current === key, []);
  const getTargetReadGeneration = useCallback(() => targetReadGeneration.current, []);
  const bumpTargetReadGeneration = useCallback(() => ++targetReadGeneration.current, []);

  const assignmentNeedsCheck = uncertainAssignment?.key === detailTargetKey;
  const automaticTarget = !chosenTarget && !hasPlanningTarget;
  const visibleTarget = targetRead?.key === detailTargetKey ? targetRead.slot : undefined;
  const targetReadError = targetRead?.key === detailTargetKey ? targetRead.error : undefined;
  const targetChecking = targetRead?.key === detailTargetKey && Boolean(targetRead.checking);
  const planningDayLabel = visibleTarget
    ? formatSupperPlanDate(visibleTarget.date)
    : urlPlanningDayLabel;
  const targetCompleted = !targetChecking && visibleTarget?.status === 2;
  const targetVoting = !targetChecking && visibleTarget?.status === 4;
  const targetReview = targetCompleted || targetVoting;
  const identicalTarget = !!visibleTarget?.recipe?.id && visibleTarget.recipe.id === detailRecipeId;
  const confirmedPlannedTarget =
    identicalTarget &&
    !targetChecking &&
    !targetReadError &&
    !assignmentNeedsCheck &&
    !targetReview &&
    (visibleTarget?.status === 0 || visibleTarget?.status === 1);
  const targetReferenceForChooser =
    chosenTarget?.referenceWeekStartDate ??
    suppliedReference ??
    planningCalendar?.referenceWeekStartDate;
  const visibleTargetDate = visibleTarget?.date;

  const refreshDetailTarget = useCallback(() => {
    targetReadGeneration.current += 1;
    setTargetRead((current) =>
      current?.key === detailTargetKey
        ? { ...current, checking: true, error: undefined, anchor: undefined }
        : current
    );
    setTargetReadAttempt((attempt) => attempt + 1);
  }, [detailTargetKey, setTargetRead, setTargetReadAttempt]);

  useEffect(() => {
    if (!detailRecipeId || originalSourceReview || assignmentNeedsCheck || !visibleTargetDate)
      return;
    return subscribeIngredientProjectionInvalidation(
      !automaticTarget ? { context: 'proposed', supperDate: visibleTargetDate } : undefined,
      refreshDetailTarget
    );
  }, [
    detailRecipeId,
    originalSourceReview,
    assignmentNeedsCheck,
    automaticTarget,
    visibleTargetDate,
    refreshDetailTarget,
  ]);

  const automaticAnchor =
    automaticTarget && targetRead?.key === detailTargetKey ? targetRead.anchor : undefined;
  useEffect(() => {
    if (!automaticAnchor || assignmentNeedsCheck) return;
    const remaining =
      automaticAnchor.expiresAfterMs - (calendarTime.elapsed() - automaticAnchor.receivedAtElapsed);
    const timer = window.setTimeout(refreshDetailTarget, Math.max(0, Math.ceil(remaining)));
    return () => window.clearTimeout(timer);
  }, [automaticAnchor, assignmentNeedsCheck, refreshDetailTarget]);

  useEffect(() => {
    if (!detailRecipeId || originalSourceReview) return;
    let active = true;
    const generation = ++targetReadGeneration.current;
    const key = detailTargetKey;
    const current = () =>
      active && targetReadGeneration.current === generation && detailContextRef.current === key;
    void (async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        const snapshot = await (automaticTarget ? readAutomaticCalendar() : loadCalendarSnapshot());
        if (!current()) return;
        const { calendar, anchor } = snapshot;
        setPlanningCalendar(calendar);
        if (hasPlanningTarget && !validTarget && !chosenTarget)
          throw new Error(
            t(
              'recipes.invalidPlanningDay',
              'Invalid planning day. Choose a day in Planner and try again.'
            )
          );
        let slot: PlannerSlot | null;
        if (chosenTarget)
          slot = await getPlannerSlot(
            chosenTarget.weekOffset,
            chosenTarget.dayIndex,
            chosenTarget.referenceWeekStartDate
          );
        else if (hasPlanningTarget)
          slot = await getPlannerSlot(
            targetWeek,
            targetDay,
            suppliedReference ?? calendar.referenceWeekStartDate
          );
        else {
          const candidate = await findFirstOpenPlannerSlot(
            0,
            0,
            520,
            calendar.referenceWeekStartDate
          );
          if (!candidate)
            throw new Error(
              t('recipes.noOpenDay', 'No open supper found. Choose a day to review your plan.')
            );
          slot = await getPlannerSlot(
            candidate.weekOffset,
            candidate.dayIndex,
            candidate.referenceWeekStartDate
          );
        }
        if (!current()) return;
        if (!slot)
          throw new Error(
            t('recipes.checkPlanFailed', 'Could not confirm this meal. Retry check before saving.')
          );
        if (automaticTarget && (!calendarAnchorIsFresh(anchor) || slot.date < calendar.today))
          continue;
        setTargetRead({ key, slot, ...(automaticTarget ? { anchor } : {}) });
        return;
      }
      throw new Error(
        t('recipes.checkPlanFailed', 'Could not confirm this meal. Retry check before saving.')
      );
    })().catch((error) => {
      if (current())
        setTargetRead((previous) => ({
          key,
          slot: previous?.key === key ? previous.slot : undefined,
          error:
            error instanceof Error
              ? error.message
              : t(
                  'recipes.weekReadFailed',
                  'Could not read this week. Retry before choosing a day.'
                ),
        }));
    });
    return () => {
      active = false;
    };
  }, [
    detailRecipeId,
    originalSourceReview,
    detailTargetKey,
    chosenTarget,
    hasPlanningTarget,
    validTarget,
    targetWeek,
    targetDay,
    suppliedReference,
    targetReadAttempt,
    automaticTarget,
    readAutomaticCalendar,
    setPlanningCalendar,
  ]);

  return {
    addToDay,
    weekOffset,
    entryContext,
    entryContextKey,
    planningCalendarError,
    retryPlanningCalendar,
    validTarget,
    targetWeek,
    urlPlanningDayLabel,
    openRecipeId,
    sourceGroceryReturn,
    grocerySourceEntry,
    setSourcePlanningEntry,
    detailRecipeId,
    setDetailRecipeId,
    originalSourceReview,
    handleCardTap,
    handleStackCardTap,
    restoreDetailReturnFocus,
    setChosenDetailTarget,
    targetRead,
    setTargetRead,
    setTargetReadAttempt,
    readAutomaticCalendar,
    showDayChooser,
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
  };
}
