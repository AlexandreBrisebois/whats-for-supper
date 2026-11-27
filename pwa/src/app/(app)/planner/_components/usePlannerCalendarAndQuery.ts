'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReadonlyURLSearchParams, useRouter } from 'next/navigation';
import type { DetailSource } from '@/lib/planner/plannerOverlay';
import {
  absoluteMonday,
  calendarAnchorIsFresh,
  calendarTime,
  readCalendar,
} from '@/lib/deployment-calendar';
import { useDiscoveryStore } from '@/store/discoveryStore';
import { useTodayStore } from '@/store/todayStore';
import { useWeekStore, type UILocalScheduleDay } from '@/store/weekStore';

interface UsePlannerCalendarAndQueryParams {
  currentWeekOffset: number;
  setWeekOffset: (offset: number) => void;
  setActiveTab: (tab: 'planner' | 'grocery') => void;
  schedule: UILocalScheduleDay[];
  weekCalendarReference: string | undefined;
  isLoading: boolean;
  status: 0 | 1 | 2;
  weekStartDate: string | null;
  votingRoundId: string | null;
  planDate: string | null;
  referenceWeekStartDate: string | undefined;
  searchParams: ReadonlyURLSearchParams;
  router: ReturnType<typeof useRouter>;
  openPivot: (dayIndex: number) => void;
  openDetail: (recipeId: string, source: DetailSource | null) => void;
  openPortions: () => Promise<unknown>;
  requestPortionsDeparture: (onDepart: () => void) => void;
}

export function usePlannerCalendarAndQuery({
  currentWeekOffset,
  setWeekOffset,
  setActiveTab,
  schedule,
  weekCalendarReference,
  isLoading,
  status,
  weekStartDate,
  votingRoundId,
  planDate,
  referenceWeekStartDate,
  searchParams,
  router,
  openPivot,
  openDetail,
  openPortions,
  requestPortionsDeparture,
}: UsePlannerCalendarAndQueryParams) {
  const calendar = useTodayStore((s) => s.calendar);
  const calendarAnchor = useTodayStore((s) => s.calendarAnchor);
  const calendarVersion = useTodayStore((s) => s.calendarVersion);
  const ensureCalendar = useTodayStore((s) => s.ensureCalendar);
  const [, expireCalendar] = useState(0);
  const authoritativeToday = calendarAnchorIsFresh(calendarAnchor)
    ? (readCalendar(calendar)?.today ?? null)
    : null;

  useEffect(() => {
    const refresh = () => {
      void ensureCalendar().catch(() => {});
    };
    if (!calendar || !calendarAnchor || !calendarAnchorIsFresh(calendarAnchor)) {
      refresh();
      return;
    }
    // One timer for the shared monotonic anchor. Replacements retire the old timer;
    // a failed refresh leaves retained meals usable with neutral date presentation.
    const remaining =
      calendarAnchor.expiresAfterMs - (calendarTime.elapsed() - calendarAnchor.receivedAtElapsed);
    const timer = window.setTimeout(
      () => {
        expireCalendar((revision) => revision + 1);
        refresh();
      },
      Math.max(0, Math.ceil(remaining))
    );
    return () => window.clearTimeout(timer);
  }, [calendar, calendarAnchor, calendarVersion, ensureCalendar]);

  const { setHasPendingCards, session: votingSession } = useDiscoveryStore();
  const isVotingOpen = status === 1;
  // Only confirmed household convergence for the loaded round and week; never inferred
  // from this member having no cards left.
  const isConvergedWeek =
    isVotingOpen &&
    votingSession?.phase === 'converged' &&
    Boolean(votingRoundId && votingSession.roundId === votingRoundId) &&
    absoluteMonday(votingSession.weekStartDate) === weekStartDate;
  const hasPendingSuggestions = schedule.some(
    (day) => day.status !== 3 && day._isPending && Boolean(day.recipe?.id)
  );

  const portionEntry = searchParams.get('portions') === 'true' ? searchParams.toString() : null;
  const enteredPortions = useRef<string | null>(null);
  useEffect(() => {
    if (!portionEntry) {
      enteredPortions.current = null;
      return;
    }
    if (enteredPortions.current === portionEntry || !schedule.some((day) => day.date === planDate))
      return;
    let active = true;
    void Promise.resolve().then(() => {
      if (!active || enteredPortions.current === portionEntry) return;
      enteredPortions.current = portionEntry;
      void openPortions();
    });
    return () => {
      active = false;
    };
    // The captured query owns this single entry; ordinary editor state updates do not reopen it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portionEntry, schedule, planDate]);

  const detailEntry = searchParams.get('detailRecipe');
  const enteredDetail = useRef<string | null>(null);
  useEffect(() => {
    if (!detailEntry) {
      enteredDetail.current = null;
      return;
    }
    if (enteredDetail.current === detailEntry || !planDate) return;
    const day = schedule.find((item) => item.date === planDate);
    if (!day) return;
    let active = true;
    void Promise.resolve().then(() => {
      if (!active || enteredDetail.current === detailEntry) return;
      enteredDetail.current = detailEntry;
      openDetail(detailEntry, {
        date: planDate,
        dayIndex: schedule.findIndex((item) => item.date === planDate),
        reference: referenceWeekStartDate ?? '',
        weekOffset: currentWeekOffset,
        occurrenceId: searchParams.get('detailOccurrence') ?? undefined,
        context: searchParams.get('detailContext') === 'proposed' ? 'proposed' : 'assigned',
      });
    });
    return () => {
      active = false;
    };
  }, [
    detailEntry,
    schedule,
    planDate,
    referenceWeekStartDate,
    currentWeekOffset,
    searchParams,
    openDetail,
  ]);

  const openedPlanDate = useRef<string | null>(null);
  const [prevOffset, setPrevOffset] = useState(currentWeekOffset);

  useEffect(() => {
    setHasPendingCards(isVotingOpen);
  }, [isVotingOpen, setHasPendingCards]);

  useEffect(() => {
    const weekOffsetParam = searchParams.get('weekOffset');
    const parsed = weekOffsetParam === null ? 0 : Number.parseInt(weekOffsetParam, 10);
    if (!Number.isFinite(parsed)) return;
    if (parsed === currentWeekOffset) return;

    setWeekOffset(parsed);
  }, [searchParams, currentWeekOffset, setWeekOffset]);

  useEffect(() => {
    useWeekStore.getState().init(currentWeekOffset, referenceWeekStartDate);
  }, [currentWeekOffset, referenceWeekStartDate]);

  useEffect(() => {
    if (!planDate) {
      openedPlanDate.current = null;
      return;
    }
    if (isLoading || currentWeekOffset !== 0 || openedPlanDate.current === planDate) return;
    const day = schedule.find((item) => item.date === planDate);
    if (!day || day.status !== 3 || day.recipe?.id) return;
    openedPlanDate.current = planDate;
    setActiveTab('planner');
    openPivot(schedule.indexOf(day));
  }, [planDate, isLoading, currentWeekOffset, schedule, setActiveTab, openPivot]);

  // Update prevOffset during render for animation direction (not in effect to avoid lint warning)
  if (currentWeekOffset !== prevOffset) {
    setPrevOffset(currentWeekOffset);
  }

  const [reviewDay, setReviewDay] = useState<number | null>(null);
  const [reviewSeq, setReviewSeq] = useState(0);
  const [reviewFadedSeq, setReviewFadedSeq] = useState<number | null>(null);
  const consumedReviewTarget = useRef<string | null>(null);
  const clearConsumedReviewTarget = useCallback(() => {
    consumedReviewTarget.current = null;
  }, []);
  const reviewDayParam = searchParams.get('dayIndex');
  const reviewSuccessParam = searchParams.get('success');
  const reviewContext = `${currentWeekOffset}/${referenceWeekStartDate ?? ''}/${reviewDayParam ?? ''}/${reviewSuccessParam ?? ''}`;
  const [previousReviewContext, setPreviousReviewContext] = useState(reviewContext);
  if (previousReviewContext !== reviewContext) {
    setPreviousReviewContext(reviewContext);
    setReviewDay(null);
  }

  useEffect(() => {
    consumedReviewTarget.current = null;
  }, [reviewContext]);

  useEffect(() => {
    if (reviewDay === null) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fade = reduced ? undefined : window.setTimeout(() => setReviewFadedSeq(reviewSeq), 2500);
    const clear = window.setTimeout(() => setReviewDay(null), 3000);
    return () => {
      if (fade !== undefined) window.clearTimeout(fade);
      window.clearTimeout(clear);
    };
  }, [reviewDay, reviewSeq]);

  useEffect(() => {
    if (reviewSuccessParam || reviewDayParam === null || !/^\d+$/.test(reviewDayParam)) return;
    const parsedDay = Number.parseInt(reviewDayParam, 10);
    if (!Number.isInteger(parsedDay) || parsedDay < 0 || parsedDay > 6) return;
    if (isLoading || schedule.length !== 7) return;
    const weekOffsetParam = searchParams.get('weekOffset');
    const requestedOffset = weekOffsetParam === null ? 0 : Number.parseInt(weekOffsetParam, 10);
    if (Number.isFinite(requestedOffset) && requestedOffset !== currentWeekOffset) return;
    if (
      referenceWeekStartDate &&
      weekCalendarReference &&
      weekCalendarReference !== referenceWeekStartDate
    )
      return;
    const reviewKey = `${currentWeekOffset}/${referenceWeekStartDate ?? weekCalendarReference ?? ''}/${parsedDay}`;
    if (consumedReviewTarget.current === reviewKey) return;
    const card = document.getElementById(`day-card-${parsedDay}`);
    if (!card) return;
    consumedReviewTarget.current = reviewKey;
    // Focus and ring highlight synchronize after the matching week renders.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReviewDay(parsedDay);
    setReviewSeq((seq) => seq + 1);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    card.scrollIntoView?.({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'center',
    });
    card.focus?.();
  }, [
    reviewSuccessParam,
    reviewDayParam,
    isLoading,
    schedule.length,
    searchParams,
    currentWeekOffset,
    referenceWeekStartDate,
    weekCalendarReference,
  ]);

  const navigateToWeekOffset = (nextWeekOffset: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextWeekOffset === 0) {
      params.delete('weekOffset');
    } else {
      params.set('weekOffset', nextWeekOffset.toString());
    }
    const query = params.toString();
    requestPortionsDeparture(() => router.replace(query ? `/planner?${query}` : '/planner'));
  };

  const handlePrevWeek = () => navigateToWeekOffset(currentWeekOffset - 1);
  const handleNextWeek = () => navigateToWeekOffset(currentWeekOffset + 1);

  const weekIsPast = useMemo(() => {
    if (schedule.length < 7) return false;
    return (schedule[6].date ?? '') < (useTodayStore.getState().calendar?.today ?? '');
  }, [schedule]);
  const canOpenVoting = !weekIsPast && (status === 0 || status === 2);

  return {
    authoritativeToday,
    calendarVersion,
    isVotingOpen,
    isConvergedWeek,
    hasPendingSuggestions,
    canOpenVoting,
    prevOffset,
    reviewDay,
    reviewFading: reviewDay !== null && reviewFadedSeq === reviewSeq,
    clearConsumedReviewTarget,
    navigateToWeekOffset,
    handlePrevWeek,
    handleNextWeek,
  };
}
