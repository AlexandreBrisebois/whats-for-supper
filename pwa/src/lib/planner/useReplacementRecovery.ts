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

/** Caller adapters own navigation/store refresh; this hook owns only the mounted two-stage recovery. */
export function useReplacementRecovery(options: {
  slot?: PlannerSlot;
  recipe?: AssignmentRecipe;
  onClosed: (saved?: boolean) => void;
  onSaved: () => Promise<unknown>;
  onReview: () => void;
  observed?: (day: ScheduleDayDto) => void;
}) {
  const sessionRef = useRef<ReplacementSession | null>(null);
  const mounted = useRef(true);
  const submitting = useRef(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<ReplacementFeedback | null>(null);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const reviewOnDeparture = useRef(false);
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
        options.onClosed(true);
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
  const close = (review = false) => {
    if (submitting.current) return;
    if (sessionRef.current && !sessionRef.current.saved) {
      reviewOnDeparture.current = review;
      setConfirmAbandon(true);
      return;
    }
    sessionRef.current = null;
    setFeedback(null);
    options.onClosed();
    if (review) options.onReview();
  };
  return {
    pending,
    feedback,
    confirmAbandon,
    act,
    retry,
    close: () => close(),
    review: () => close(true),
    cancelAbandon: () => setConfirmAbandon(false),
    abandon: () => {
      if (submitting.current) return;
      sessionRef.current = null;
      setFeedback(null);
      setConfirmAbandon(false);
      options.onClosed();
      if (reviewOnDeparture.current) options.onReview();
    },
  };
}
