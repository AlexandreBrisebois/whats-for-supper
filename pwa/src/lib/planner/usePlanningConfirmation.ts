'use client';

import { useEffect, useState } from 'react';
import type { ReadonlyURLSearchParams, useRouter } from 'next/navigation';
import { getSchedule } from '@/lib/api/planner';
import { t, tWithVars } from '@/locales';
import { useWeekStore } from '@/store/weekStore';
import { formatSupperPlanDate } from './nonCooking';
import { readPlanningResult, retirePlanningResult } from './planningResult';
import { describeOriginalDisposition } from './replacementCopy';

/**
 * The post-planning receipt on the Planner page and the day-card success ring.
 * Relocated unchanged from the page: same effects, identity checks and timers.
 */
export function usePlanningConfirmation({
  searchParams,
  currentWeekOffset,
  referenceWeekStartDate,
  router,
}: {
  searchParams: ReadonlyURLSearchParams;
  currentWeekOffset: number;
  referenceWeekStartDate: string | undefined;
  router: ReturnType<typeof useRouter>;
}) {
  const [successDay, setSuccessDay] = useState<number | null>(null);
  const [successSeq, setSuccessSeq] = useState(0);
  const [fadedSeq, setFadedSeq] = useState<number | null>(null);
  const successFading = successDay !== null && fadedSeq === successSeq;
  // The ring is a brief confirmation: fade it, then remove it. A newer highlight or a
  // context change restarts or cancels these timers, so a stale one never clears it.
  useEffect(() => {
    if (successDay === null) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fade = reduced ? undefined : window.setTimeout(() => setFadedSeq(successSeq), 2500);
    const clear = window.setTimeout(() => setSuccessDay(null), 3000);
    return () => {
      if (fade !== undefined) window.clearTimeout(fade);
      window.clearTimeout(clear);
    };
  }, [successDay, successSeq]);
  const [planningConfirmation, setPlanningConfirmation] = useState<{
    context: string;
    identity: string;
    message: string;
    kind: 'replacement' | 'changed' | 'refresh-failed' | 'refreshing';
    persistent?: boolean;
  } | null>(null);
  const [confirmationRetry, setConfirmationRetry] = useState(0);
  const successParam = searchParams.get('success');

  const confirmationDay = searchParams.get('dayIndex');
  const confirmationQuery = searchParams.toString();
  const confirmationContext = `${currentWeekOffset}/${referenceWeekStartDate}/${confirmationDay}`;
  const pendingResult = readPlanningResult();
  const pendingResultIdentity = JSON.stringify(pendingResult);
  const visibleConfirmation =
    planningConfirmation?.context === confirmationContext &&
    (!pendingResult || planningConfirmation.identity === pendingResultIdentity)
      ? planningConfirmation
      : null;
  const [previousConfirmationContext, setPreviousConfirmationContext] =
    useState(confirmationContext);
  // Adjust context-owned state before rendering a different dated destination.
  if (previousConfirmationContext !== confirmationContext) {
    setPreviousConfirmationContext(confirmationContext);
    setPlanningConfirmation(null);
    setSuccessDay(null);
  }

  const clearSuccessUrl = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('success');
    router.replace(`/planner${params.size ? `?${params}` : ''}`, { scroll: false });
  };
  // Routine replacement receipts are calm and clear themselves; spillover and
  // failure/changed states stay until a person acts.
  const routineConfirmationIdentity =
    planningConfirmation?.kind === 'replacement' && !planningConfirmation.persistent
      ? planningConfirmation.identity
      : null;
  useEffect(() => {
    if (!routineConfirmationIdentity) return;
    const timer = window.setTimeout(() => {
      setPlanningConfirmation((current) =>
        current?.identity === routineConfirmationIdentity ? null : current
      );
      clearSuccessUrl();
    }, 5000);
    return () => window.clearTimeout(timer);
    // clearSuccessUrl reads the latest search params when the timer fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routineConfirmationIdentity, confirmationContext]);

  useEffect(() => {
    const result = readPlanningResult();
    if (
      !successParam ||
      !result ||
      result.weekOffset !== currentWeekOffset ||
      String(result.dayIndex) !== confirmationDay ||
      result.referenceWeekStartDate !== referenceWeekStartDate
    )
      return;
    let active = true;
    const isCurrent = () =>
      active && JSON.stringify(readPlanningResult()) === JSON.stringify(result);
    const confirm = (
      kind: NonNullable<typeof planningConfirmation>['kind'],
      message: string,
      persistent = true
    ) =>
      setPlanningConfirmation({
        context: confirmationContext,
        identity: JSON.stringify(result),
        kind,
        message,
        persistent,
      });
    void getSchedule(result.weekOffset, result.referenceWeekStartDate, true)
      .then((fresh) => {
        if (!isCurrent()) return;
        const day = fresh?.days?.[result.dayIndex];
        if (!fresh || !day?.date) throw new Error('Schedule result unavailable');
        useWeekStore.getState().applySnapshot(fresh);
        if (document.activeElement?.getAttribute('data-testid') === 'planner-confirmation-refresh')
          document.getElementById(`day-card-${result.dayIndex}`)?.focus();
        if (day.date !== result.date || day.recipe?.id !== result.recipeId) {
          retirePlanningResult(result);
          confirm(
            'changed',
            t(
              'planner.savedPlanChanged',
              'The saved plan has changed. Review this day before making another change.'
            )
          );
          return;
        }
        const message = tWithVars('planner.recipePlanned', '{{recipe}} is planned for {{date}}.', {
          recipe: day.recipe.name ?? result.recipeName,
          date: formatSupperPlanDate(result.date),
        });
        // Delivery consumes this receipt. Renders, reloads and old URLs cannot replay it.
        retirePlanningResult(result);
        if (result.original) {
          confirm(
            'replacement',
            [message, describeOriginalDisposition(result.original)].filter(Boolean).join(' '),
            result.original.spillover === true
          );
        } else {
          setPlanningConfirmation(null);
          const params = new URLSearchParams(confirmationQuery);
          params.delete('success');
          router.replace(`/planner${params.size ? `?${params}` : ''}`, { scroll: false });
        }
        setSuccessDay(result.dayIndex);
        setSuccessSeq((seq) => seq + 1);
        document.getElementById(`day-card-${result.dayIndex}`)?.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'auto'
            : 'smooth',
          block: 'center',
        });
      })
      .catch(() => {
        if (isCurrent()) {
          setSuccessDay(null);
          confirm(
            'refresh-failed',
            tWithVars(
              'planner.savedRefreshFailed',
              '{{recipe}} was saved for {{date}}, but the plan could not refresh. Retry refresh.',
              { recipe: result.recipeName, date: formatSupperPlanDate(result.date) }
            )
          );
        }
      });
    return () => {
      active = false;
    };
    // Read identity also distinguishes two returns to the same dated destination.
  }, [
    successParam,
    confirmationDay,
    currentWeekOffset,
    referenceWeekStartDate,
    confirmationRetry,
    confirmationContext,
    pendingResultIdentity,
    confirmationQuery,
    router,
  ]);

  const retry = () => {
    if (!visibleConfirmation || visibleConfirmation.kind === 'refreshing') return;
    setPlanningConfirmation({ ...visibleConfirmation, kind: 'refreshing' });
    setConfirmationRetry((value) => value + 1);
  };

  const dismiss = () => {
    setPlanningConfirmation(null);
    clearSuccessUrl();
    document.getElementById(`day-card-${confirmationDay}`)?.focus();
  };

  return { visibleConfirmation, pendingResult, successDay, successFading, retry, dismiss };
}
