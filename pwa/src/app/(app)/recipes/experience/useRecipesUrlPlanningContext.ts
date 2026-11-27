'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { formatSupperPlanDate } from '@/lib/planner/nonCooking';
import {
  absoluteMonday,
  loadDeploymentCalendar,
  type CalendarContext,
} from '@/lib/deployment-calendar';
import { t } from '@/locales';
import { buildRecipesEntryContext, plannerDayName } from './recipesSearchHelpers';

export function useRecipesUrlPlanningContext(searchParams: Pick<URLSearchParams, 'get' | 'has'>) {
  const addToDay = searchParams.get('addToDay');
  const weekOffset = searchParams.get('weekOffset');
  const hasPlanningTarget = addToDay !== null || weekOffset !== null;
  const entryContext = buildRecipesEntryContext(searchParams);
  const entryContextKey = JSON.stringify(entryContext);

  const [planningCalendar, setPlanningCalendar] = useState<CalendarContext | null>(null);
  const [planningCalendarError, setPlanningCalendarError] = useState(false);

  const targetDay = addToDay?.trim() ? Number(addToDay) : NaN;
  const targetWeek = weekOffset?.trim() ? Number(weekOffset) : NaN;
  const suppliedReference = searchParams.get('referenceWeekStartDate');
  const targetReference = suppliedReference ?? planningCalendar?.referenceWeekStartDate;
  const validTarget =
    Number.isInteger(targetDay) &&
    targetDay >= 0 &&
    targetDay <= 6 &&
    Number.isSafeInteger(targetWeek) &&
    (suppliedReference === null || absoluteMonday(suppliedReference) !== null);
  const targetInstant =
    targetReference && absoluteMonday(targetReference)
      ? Date.parse(`${targetReference}T00:00:00Z`) + (targetWeek * 7 + targetDay) * 86400000
      : NaN;
  const targetDate = new Date(targetInstant);
  const urlPlanningDayLabel = hasPlanningTarget
    ? validTarget &&
      Number.isFinite(targetInstant) &&
      targetDate.getUTCFullYear() >= 1 &&
      targetDate.getUTCFullYear() <= 9999
      ? formatSupperPlanDate(targetDate.toISOString().slice(0, 10))
      : (plannerDayName(addToDay) ?? t('recipes.chooseDay', 'Choose a day'))
    : null;

  useEffect(() => {
    if (addToDay === null || weekOffset === null) return;
    let active = true;
    void loadDeploymentCalendar()
      .then((calendar) => {
        if (active) {
          setPlanningCalendar(calendar);
          setPlanningCalendarError(false);
        }
      })
      .catch(() => {
        if (active) setPlanningCalendarError(true);
      });
    return () => {
      active = false;
    };
  }, [addToDay, weekOffset]);

  const retryPlanningCalendar = useCallback(() => {
    void loadDeploymentCalendar()
      .then((calendar) => {
        setPlanningCalendar(calendar);
        setPlanningCalendarError(false);
      })
      .catch(() => {});
  }, [setPlanningCalendar, setPlanningCalendarError]);

  const openRecipeId = searchParams.get('open');
  const sourceGroceryOffset = searchParams.get('sourceGroceryWeekOffset');
  const sourceGroceryReference = searchParams.get('sourceGroceryReferenceWeekStartDate');
  const parsedSourceGroceryOffset =
    sourceGroceryOffset === null ? NaN : Number(sourceGroceryOffset);
  const sourceGroceryReturn =
    sourceGroceryOffset !== null &&
    /^-?\d+$/.test(sourceGroceryOffset) &&
    Number.isSafeInteger(parsedSourceGroceryOffset) &&
    Math.abs(parsedSourceGroceryOffset) <= 520 &&
    sourceGroceryReference !== null &&
    absoluteMonday(sourceGroceryReference) !== null
      ? `/planner?${new URLSearchParams({ weekOffset: String(parsedSourceGroceryOffset), referenceWeekStartDate: sourceGroceryReference })}`
      : null;
  const grocerySourceEntry = searchParams.has('reviewAmounts')
    ? JSON.stringify([openRecipeId, sourceGroceryOffset, sourceGroceryReference])
    : null;

  const [sourcePlanningEntry, setSourcePlanningEntry] = useState<string | null>(null);
  const [detailRecipeId, setDetailRecipeId] = useState<string | null>(() => openRecipeId);
  const detailReturnFocusRef = useRef<HTMLElement | null>(null);
  const originalSourceReview = Boolean(
    grocerySourceEntry &&
    detailRecipeId === openRecipeId &&
    sourcePlanningEntry !== grocerySourceEntry
  );

  // Route detail context is an external navigation source for the mounted session.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setDetailRecipeId(openRecipeId), [openRecipeId]);

  const handleCardTap = useCallback(
    (recipeId: string) => {
      setDetailRecipeId(recipeId);
    },
    [setDetailRecipeId]
  );

  const handleStackCardTap = useCallback(
    (recipeId: string) => {
      detailReturnFocusRef.current = document.querySelector<HTMLElement>(
        '[data-testid="stack-card-front"]'
      );
      setDetailRecipeId(recipeId);
    },
    [setDetailRecipeId]
  );

  const restoreDetailReturnFocus = useCallback(() => {
    const target = detailReturnFocusRef.current;
    detailReturnFocusRef.current = null;
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (
        target?.isConnected &&
        (!active || active === document.body || active === target || !active.isConnected)
      )
        target.focus();
    });
  }, []);

  return {
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
  };
}
