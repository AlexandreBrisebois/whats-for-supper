'use client';

import { useEffect, useRef, useState } from 'react';
import { getSchedule } from '@/lib/api/planner';
import type { ScheduleDayDto } from '@/lib/api/generated/models/index';
import {
  assignRecipeToEmptySlot,
  disposeReplacementOriginal,
  type AssignmentRecipe,
  type PlannerSlot,
} from './slotAssignment';
import {
  continueReplacementSession,
  createReplacementSession,
  type ReplacementAction,
  type ReplacementFeedback,
  type ReplacementSession,
} from './replacementSession';
import { rememberPlanningResult } from './planningResult';
import { t } from '@/locales';

export type ReplacementDepartureReason = 'dismiss' | 'saved' | 'review' | 'chooseDay';

/** Caller adapters own navigation/store refresh; this hook owns only the mounted two-stage recovery. */
export function useReplacementRecovery(options: {
  slot?: PlannerSlot;
  recipe?: AssignmentRecipe;
  onClosed: (saved?: boolean, reason?: ReplacementDepartureReason) => void;
  onSaved: () => Promise<unknown>;
  onReview: () => void;
  onChooseAnotherDay?: () => void;
  observed?: (day: ScheduleDayDto) => void;
}) {
  const sessionRef = useRef<ReplacementSession | null>(null);
  const mounted = useRef(true);
  const submitting = useRef(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<ReplacementFeedback | null>(null);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const departureReasonRef = useRef<'dismiss' | 'review' | 'chooseDay'>('dismiss');
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      sessionRef.current = null;
    };
  }, []);
  const [previousSlot, setPreviousSlot] = useState(options.slot);
  if (previousSlot !== options.slot) {
    setPreviousSlot(options.slot);
    setFeedback(null);
    setConfirmAbandon(false);
  }
  useEffect(() => {
    sessionRef.current = null;
  }, [options.slot]);
  const retry = async () => {
    const session = sessionRef.current;
    if (!session || submitting.current) return;
    submitting.current = true;
    setPending(true);
    const active = () => mounted.current && sessionRef.current === session;
    const { slot, recipe } = session;
    try {
      const ready = await continueReplacementSession(session, {
        active,
        feedback: setFeedback,
        observed: options.observed,
        read: async () => {
          const week = await getSchedule(slot.weekOffset, slot.referenceWeekStartDate, true);
          const day = week?.days?.find((day) => day.date === slot.date);
          if (!day) throw new Error('Plan refresh failed');
          return day;
        },
        dispose: () => disposeReplacementOriginal(slot, session.action),
        save: () =>
          assignRecipeToEmptySlot(
            slot.weekOffset,
            slot.dayIndex,
            recipe,
            slot.referenceWeekStartDate
          ),
      });
      if (!ready || !active()) return;
      if (!slot.referenceWeekStartDate) throw new Error('Missing calendar');
      rememberPlanningResult({
        weekOffset: slot.weekOffset,
        dayIndex: slot.dayIndex,
        date: slot.date,
        referenceWeekStartDate: slot.referenceWeekStartDate,
        recipeId: recipe.id,
        recipeName: recipe.name ?? '',
        original: session.disposition,
      });
      await options.onSaved();
      if (active()) {
        sessionRef.current = null;
        setFeedback(null);
        options.onClosed(true, 'saved');
      }
    } catch {
      if (active())
        setFeedback({
          phase: 'refresh',
          recipeName: recipe.name,
          original: session.disposition,
          message: t(
            'planning.replacement.refresh',
            'Your new meal is saved, but your plan could not refresh.'
          ),
        });
    } finally {
      submitting.current = false;
      if (mounted.current) setPending(false);
    }
  };
  const act = async (action: string) => {
    if (action !== 'tomorrow' && action !== 'next_week' && action !== 'drop') return;
    if (!options.slot || !options.recipe || submitting.current) return;
    sessionRef.current ??= createReplacementSession(
      options.slot,
      options.recipe,
      action as ReplacementAction
    );
    await retry();
  };
  const close = (reason: 'dismiss' | 'review' | 'chooseDay' = 'dismiss') => {
    if (submitting.current) return;
    const session = sessionRef.current;
    // Only completed or uncertain changes need an explicit abandon choice. Before
    // anything committed (for example a plan conflict), leaving is simply leaving.
    if (
      session &&
      !session.saved &&
      (session.disposed || session.dispositionUnknown || session.saveUnknown)
    ) {
      departureReasonRef.current = reason;
      setConfirmAbandon(true);
      return;
    }
    sessionRef.current = null;
    setFeedback(null);
    options.onClosed(false, reason);
    if (reason === 'review') options.onReview();
    else if (reason === 'chooseDay') options.onChooseAnotherDay?.();
  };
  return {
    pending,
    feedback,
    confirmAbandon,
    act,
    retry,
    close: () => close('dismiss'),
    review: () => close('review'),
    chooseAnotherDay: () => close('chooseDay'),
    cancelAbandon: () => {
      departureReasonRef.current = 'dismiss';
      setConfirmAbandon(false);
    },
    abandon: () => {
      if (submitting.current) return;
      const reason = departureReasonRef.current;
      departureReasonRef.current = 'dismiss';
      sessionRef.current = null;
      setFeedback(null);
      setConfirmAbandon(false);
      options.onClosed(false, reason);
      if (reason === 'review') options.onReview();
      else if (reason === 'chooseDay') options.onChooseAnotherDay?.();
    },
  };
}
