'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { useRouter } from 'next/navigation';
import { getSchedule } from '@/lib/api/planner';
import { readCalendar } from '@/lib/deployment-calendar';
import type { DetailSource, PlannerOverlay } from '@/lib/planner/plannerOverlay';
import type { AssignmentRecipe } from '@/lib/planner/slotAssignment';
import { useWeekStore, type UILocalScheduleDay } from '@/store/weekStore';

export interface DetailReviewState {
  identity: string;
  kind: 'review' | 'retry' | 'completed' | 'voting';
  isPast?: boolean;
  preparedOn?: string;
}

export const isDetailOverlay = (current: PlannerOverlay) => current.kind === 'detail';

interface UsePlannerDetailVerificationParams {
  openDetailRecipeId: string | null;
  detailSource: DetailSource | null;
  schedule: UILocalScheduleDay[];
  calendarVersion: number;
  referenceWeekStartDate: string | undefined;
  closeIfCurrent: (isCurrent: (overlay: PlannerOverlay) => boolean) => void;
  openChooseDay: (recipe: AssignmentRecipe, reference: string, weekOffset: number) => void;
  router: ReturnType<typeof useRouter>;
}

export function usePlannerDetailVerification({
  openDetailRecipeId,
  detailSource,
  schedule,
  calendarVersion,
  referenceWeekStartDate,
  closeIfCurrent,
  openChooseDay,
  router,
}: UsePlannerDetailVerificationParams) {
  const [verifiedDetail, setVerifiedDetail] = useState<string | null>(null);
  const [detailReview, setDetailReview] = useState<DetailReviewState | null>(null);
  const [detailReadAttempt, setDetailReadAttempt] = useState(0);
  const currentDetailDay = detailSource ? schedule[detailSource.dayIndex] : undefined;
  const detailDayVersion = JSON.stringify([
    currentDetailDay?.date,
    currentDetailDay?.recipe?.id,
    currentDetailDay?.occurrenceId,
    currentDetailDay?.status,
    calendarVersion,
  ]);
  const detailIdentity =
    detailSource && openDetailRecipeId
      ? JSON.stringify([openDetailRecipeId, detailSource, detailDayVersion])
      : null;
  const activeDetailIdentity = useRef<string | null>(detailIdentity);

  useLayoutEffect(() => {
    activeDetailIdentity.current = detailIdentity;
    return () => {
      if (activeDetailIdentity.current === detailIdentity) activeDetailIdentity.current = null;
    };
  }, [detailIdentity]);

  useEffect(() => {
    if (
      !detailSource ||
      !openDetailRecipeId ||
      detailSource.context !== 'assigned' ||
      !detailSource.reference
    )
      return;
    let active = true;
    const source = detailSource;
    const recipeId = openDetailRecipeId;
    const identity = detailIdentity;
    void getSchedule(source.weekOffset, source.reference)
      .then((result) => {
        if (!active || !identity) return;
        const returnedCalendar = readCalendar(result?.calendar);
        const day = result?.days?.[source.dayIndex];
        const expectedTime =
          Date.parse(`${source.reference}T00:00:00Z`) +
          (source.weekOffset * 7 + source.dayIndex) * 86400000;
        if (
          source.dayIndex >= 0 &&
          Date.parse(`${source.date}T00:00:00Z`) === expectedTime &&
          returnedCalendar?.referenceWeekStartDate === source.reference &&
          day?.date === source.date &&
          day.recipe?.id === recipeId &&
          (day.status === 0 || day.status === 1) &&
          (!source.occurrenceId || day.occurrenceId === source.occurrenceId)
        ) {
          setVerifiedDetail(identity);
        } else {
          setDetailReview({
            identity,
            kind:
              day?.date === source.date &&
              day.recipe?.id === recipeId &&
              (!source.occurrenceId || day.occurrenceId === source.occurrenceId) &&
              (day.status === 2 || day.status === 4)
                ? day.status === 2
                  ? 'completed'
                  : 'voting'
                : 'review',
            isPast: Boolean(returnedCalendar?.today && source.date < returnedCalendar.today),
            preparedOn: day?.preparation?.preparedOn?.toString() || undefined,
          });
        }
      })
      .catch(() => {
        if (active && identity) setDetailReview({ identity, kind: 'retry' });
      });
    return () => {
      active = false;
    };
  }, [detailIdentity, detailSource, openDetailRecipeId, detailReadAttempt]);

  const openPlannedDay = async () => {
    const source = detailSource;
    const recipeId = openDetailRecipeId;
    const identity = detailIdentity;
    if (!source || !recipeId || verifiedDetail !== identity) return;
    try {
      const result = await getSchedule(source.weekOffset, source.reference);
      if (activeDetailIdentity.current !== identity) return;
      const returnedCalendar = readCalendar(result?.calendar);
      const day = result?.days?.[source.dayIndex];
      const expectedTime =
        Date.parse(`${source.reference}T00:00:00Z`) +
        (source.weekOffset * 7 + source.dayIndex) * 86400000;
      if (
        source.dayIndex < 0 ||
        Date.parse(`${source.date}T00:00:00Z`) !== expectedTime ||
        returnedCalendar?.referenceWeekStartDate !== source.reference ||
        day?.date !== source.date ||
        day.recipe?.id !== recipeId ||
        (day.status !== 0 && day.status !== 1) ||
        (source.occurrenceId && day.occurrenceId !== source.occurrenceId)
      ) {
        setVerifiedDetail(null);
        setDetailReview({
          identity: identity!,
          kind:
            day?.date === source.date &&
            day.recipe?.id === recipeId &&
            (!source.occurrenceId || day.occurrenceId === source.occurrenceId) &&
            (day.status === 2 || day.status === 4)
              ? day.status === 2
                ? 'completed'
                : 'voting'
              : 'review',
        });
        return;
      }
      closeIfCurrent(isDetailOverlay);
      router.push(
        `/planner?dayIndex=${source.dayIndex}&weekOffset=${source.weekOffset}&referenceWeekStartDate=${source.reference}`
      );
    } catch {
      if (activeDetailIdentity.current === identity) {
        setVerifiedDetail(null);
        setDetailReview({ identity: identity!, kind: 'retry' });
      }
    }
  };

  const detailRecipeForChooser: AssignmentRecipe | null = openDetailRecipeId
    ? {
        id: openDetailRecipeId,
        name:
          schedule[detailSource?.dayIndex ?? -1]?.recipe?.id === openDetailRecipeId
            ? (schedule[detailSource!.dayIndex].recipe?.name ?? null)
            : null,
        image:
          schedule[detailSource?.dayIndex ?? -1]?.recipe?.id === openDetailRecipeId
            ? (schedule[detailSource!.dayIndex].recipe?.image ?? '')
            : '',
      }
    : null;

  const openDetailDayChooser = () => {
    if (!detailSource || !detailRecipeForChooser) return;
    const reference =
      detailSource.reference ||
      useWeekStore.getState().calendar?.referenceWeekStartDate ||
      referenceWeekStartDate;
    if (!reference) return;
    openChooseDay(detailRecipeForChooser, reference, detailSource.weekOffset);
  };

  const retryDetailCheck = () => {
    setDetailReview(null);
    setDetailReadAttempt((value) => value + 1);
  };

  return {
    verifiedDetail,
    detailReview,
    detailIdentity,
    openPlannedDay,
    openDetailDayChooser,
    retryDetailCheck,
  };
}
