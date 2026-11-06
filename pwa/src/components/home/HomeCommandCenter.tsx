'use client';
import { PreparationStatus } from '@/components/planner/PreparationStatus';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Check } from 'lucide-react';
import { NonCookingIcon } from '../planner/NonCookingIcon';
import { QuickCaptureTrigger, CookedSuccessCard, VotingNudgeCard } from './HomeSections';
import { TonightMenuCard, TonightCardBase } from './TonightMenuCard';
import { TonightPivotCard } from './TonightPivotCard';
import { SkipRecoveryDialog } from './SkipRecoveryDialog';
import { QuickFindModal } from '../planner/QuickFindModal';
import { CooksMode } from '../planner/CooksMode';
import { AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/api-client';
import { getSchedule, normalizeScheduleRecipe, saveNonCookingDay } from '@/lib/api/planner';
import { RetryHandlerOptions } from '@microsoft/kiota-http-fetchlibrary';
import { DateOnly } from '@microsoft/kiota-abstractions';
import { absoluteMonday, calendarDayIndex, type CalendarContext } from '@/lib/deployment-calendar';
import {
  moveTomorrow,
  deferToFollowingWeek,
  disposeReplacementOriginal,
  getPlannerSlot,
  type PlannerSlot,
} from '@/lib/planner/slotAssignment';
import {
  continueReplacementSession,
  createReplacementSession,
  type ReplacementSession,
  type ReplacementFeedback,
} from '@/lib/planner/replacementSession';
import { rememberPlanningResult } from '@/lib/planner/planningResult';
import { SolarLoader } from '../ui/SolarLoader';
import { useFamilyStore } from '@/store/familyStore';
import { useTodayStore } from '@/store/todayStore';
import { useGotoStore } from '@/store/gotoStore';
import { useWeekStore } from '@/store/weekStore';
import { useUiStore } from '@/store/uiStore';
import { useDiscoveryStore } from '@/store/discoveryStore';
import { usePlannerStore } from '@/store/plannerStore';
import { t } from '@/locales';
import { nonCookingLabel, nonCookingNote } from '@/lib/planner/nonCooking';
import { ROUTES } from '@/lib/constants/routes';
import type { GoToItem } from '@/lib/api/generated/models/index';

interface HomeCommandCenterProps {
  todaysRecipe: any;
  todayStatus?: 0 | 2 | 3;
}

type RecoveryFlowState =
  | { kind: 'closed' }
  | { kind: 'step1' }
  | { kind: 'quick_find'; intent: 'pick_else' | null }
  | { kind: 'step2'; intent: 'order_in'; pendingRecipe: any }
  | { kind: 'step2'; intent: 'pick_else'; pendingRecipe: any };

function getMondayBasedDayIndex(dateString: string) {
  return (new Date(`${dateString}T00:00:00Z`).getUTCDay() + 6) % 7;
}

export function HomeCommandCenter({ todaysRecipe, todayStatus }: HomeCommandCenterProps) {
  // ── UI-only state (not domain state) ──────────────────────────────────────
  const [showCooksMode, setShowCooksMode] = useState(false);
  const [cookingContext, setCookingContext] =
    useState<import('@/lib/api/recipes').IngredientContext>();
  const [cookingRecipe, setCookingRecipe] = useState<any>(null);
  const [actionContext, setActionContext] = useState<CalendarContext | null>(null);
  const [actionRecipe, setActionRecipe] = useState<any>(null);
  const actionStatus = useRef<number>(0);
  const openingSlot = useRef<Promise<PlannerSlot | null> | null>(null);
  const [retryStart, setRetryStart] = useState<(() => void) | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [recoveryFlow, setRecoveryFlow] = useState<RecoveryFlowState>({
    kind: 'closed',
  });
  const takeOutSubmission = useRef(false);
  const [takeOutPending, setTakeOutPending] = useState(false);
  const [takeOutError, setTakeOutError] = useState<{
    date?: string;
    recipe: any;
    kind?: string;
  } | null>(null);
  const [cookedDismissed, setCookedDismissed] = useState(false);
  const session = useDiscoveryStore((state) => state.session);
  const sessionStatus = useDiscoveryStore((state) => state.sessionStatus);
  const refreshSession = useDiscoveryStore((state) => state.refreshSession);
  const votingPhase =
    session?.roundId &&
    absoluteMonday(session.weekStartDate) &&
    (session.phase === 'collecting' || session.phase === 'converged')
      ? session.phase
      : null;
  const votingStatus =
    sessionStatus === 'unknown' || sessionStatus === 'loading'
      ? 'checking'
      : sessionStatus === 'unavailable' || (session?.phase !== 'unowned' && !votingPhase)
        ? 'unavailable'
        : null;

  // ── Domain state from todayStore ──────────────────────────────────────────
  // NOTE: init() is intentionally excluded here — TodayStoreInitializer is the sole initialiser.
  const {
    calendar,
    calendarError,
    currentRecipe,
    occurrenceId,
    preparation,
    status,
    nonCooking,
    isLoading,
    assignRecipe,
    saveRecoveryRecipe,
    markOrderedIn,
    sync,
  } = useTodayStore();

  const isCooked = status === 2;
  const isSkipped = status === 3;
  const sessionDone = status === 2 || status === 3;
  const isMysteryNight = isSkipped && nonCooking?.kind === 'mystery';
  const showSupperChoices = !currentRecipe && !isCooked && (!sessionDone || isMysteryNight);

  if (
    takeOutError &&
    (takeOutError.date !== calendar?.today ||
      takeOutError.recipe !== currentRecipe ||
      takeOutError.kind !== nonCooking?.kind)
  ) {
    setTakeOutError(null);
  }

  // ── Family / GOTO settings ────────────────────────────────────────────────
  const { loadActiveGoTo } = useFamilyStore();
  const [activeGoto, setActiveGoto] = useState<GoToItem | null>(null);
  const [hasCheckedActive, setHasCheckedActive] = useState(false);

  const gotoDescription = activeGoto?.description ?? null;
  const gotoRecipeId = activeGoto?.recipeId ?? null;
  const gotoImageUrl = activeGoto?.imageUrl ?? null;
  const gotoStatus = hasCheckedActive ? (activeGoto?.status ?? null) : null;
  const gotoReady = useGotoStore((state) =>
    gotoRecipeId ? state.readyRecipeIds.has(gotoRecipeId) : false
  );

  // ── Mount: load active GOTO and background sync ──────────────────────────
  useEffect(() => {
    loadActiveGoTo().then((item) => {
      setActiveGoto(item);
      setHasCheckedActive(true);
    });

    // Background sync — non-blocking; reconciles stale SSR data
    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── SSE-driven transition: recipe_ready event ─────────────────────────────
  // Fires when synthesis completes after this page was already loaded.
  // Re-fetches the active GOTO to transition from pending → ready.
  useEffect(() => {
    if (!gotoReady || activeGoto?.status !== 'pending') return;

    void loadActiveGoTo().then(setActiveGoto);
  }, [activeGoto?.status, gotoRecipeId, gotoReady, loadActiveGoTo]);

  // ── Reset cookedDismissed when no longer cooked ───────────────────────────
  // Note: cookedDismissed is only visually meaningful when isCooked is true.
  // Both badge conditions already gate on isCooked, so no explicit reset effect is needed.

  // Reuse the shared read; the app layout owns reconnect and resume reconciliation.
  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const router = useRouter();

  const handleCookMode = () => {
    const saved = useTodayStore.getState();
    setCookingContext(
      saved.calendar
        ? {
            context: 'assigned',
            supperDate: saved.calendar.today,
            occurrenceId: saved.occurrenceId ?? '',
          }
        : undefined
    );
    setCookingRecipe(currentRecipe);
    setShowCooksMode(true);
  };

  const recoverySubmissionRef = useRef(false);
  const tomorrowSourceRef = useRef<PlannerSlot | null>(null);
  const [recoveryPending, setRecoveryPending] = useState(false);

  const replacementSession = useRef<(ReplacementSession & { context: CalendarContext }) | null>(
    null
  );
  const [replacementFeedback, setReplacementFeedback] = useState<ReplacementFeedback | null>(null);
  const reviewOnAbandon = useRef(false);
  const [confirmAbandon, setConfirmAbandon] = useState(false);

  const startAction = async (kind: 'step1' | 'quick_find') => {
    try {
      const state = useTodayStore.getState();
      const context = state.calendarIsFresh() ? state.calendar! : await state.ensureCalendar();
      tomorrowSourceRef.current = null;
      replacementSession.current = null;
      setReplacementFeedback(null);
      setActionContext(context);
      const capturedRecipe = useTodayStore.getState().currentRecipe;
      setActionRecipe(capturedRecipe);
      actionStatus.current = useTodayStore.getState().status;
      // Capture when recovery opens; never adopt a newer same-recipe snapshot at deletion time.
      openingSlot.current =
        kind === 'step1' && capturedRecipe?.id
          ? getPlannerSlot(0, calendarDayIndex(context), context.referenceWeekStartDate).catch(
              () => null
            )
          : null;
      setRetryStart(null);
      setSearchError(null);
      setRecoveryFlow(kind === 'step1' ? { kind } : { kind, intent: null });
    } catch {
      setRetryStart(() => () => {
        void startAction(kind);
      });
    }
  };
  const handleSkipTrigger = () => {
    void startAction('step1');
  };

  const continueReplacement = useCallback(async () => {
    const session = replacementSession.current;
    if (!session || recoverySubmissionRef.current) return;
    recoverySubmissionRef.current = true;
    setRecoveryPending(true);
    const active = () => replacementSession.current === session;
    const { context, recipe, slot } = session;
    const read = async () => {
      const snapshot = await getSchedule(slot.weekOffset, slot.referenceWeekStartDate, true);
      const day = snapshot?.days?.find((day) => day.date === slot.date);
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
      setRecoveryFlow({ kind: 'closed' });
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
  }, [router, saveRecoveryRecipe, sync]);

  const closeRecovery = () => {
    reviewOnAbandon.current = false;
    if (recoverySubmissionRef.current) return;
    if (replacementSession.current?.saved) {
      replacementSession.current = null;
      setReplacementFeedback(null);
      void sync();
    }
    if (replacementSession.current) {
      setConfirmAbandon(true);
      return;
    }
    setRecoveryFlow({ kind: 'closed' });
  };
  const abandonReplacement = () => {
    replacementSession.current = null;
    setConfirmAbandon(false);
    setReplacementFeedback(null);
    setRecoveryFlow({ kind: 'closed' });
    void sync();
    if (reviewOnAbandon.current)
      router.push(
        `${ROUTES.PLANNER}?weekOffset=0&referenceWeekStartDate=${actionContext?.referenceWeekStartDate}`
      );
    reviewOnAbandon.current = false;
  };

  const openPlannedSearch = useCallback(
    async function openPlannedSearch() {
      if (recoverySubmissionRef.current || !actionContext || !actionRecipe?.id) return;
      recoverySubmissionRef.current = true;
      setRecoveryPending(true);
      setSearchError(null);
      try {
        const fresh = await useTodayStore.getState().ensureCalendar();
        const displayed = useTodayStore.getState().currentRecipe;
        if (
          fresh.today !== actionContext.today ||
          fresh.referenceWeekStartDate !== actionContext.referenceWeekStartDate ||
          displayed?.id !== actionRecipe.id ||
          currentRecipe?.id !== actionRecipe.id
        ) {
          setRecoveryFlow({ kind: 'closed' });
          setActionContext(null);
          setRetryStart(null);
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
        const params = new URLSearchParams({
          focus: 'search',
          addToDay: String(calendarDayIndex(actionContext)),
          weekOffset: '0',
          referenceWeekStartDate: actionContext.referenceWeekStartDate,
        });
        setRetryStart(null);
        setRecoveryFlow({ kind: 'closed' });
        router.push(`/recipes?${params}`);
      } catch {
        setSearchError(t('home.searchCalendarRetry', 'Could not confirm today’s plan. Try again.'));
        setRetryStart(() => () => void openPlannedSearch());
      } finally {
        recoverySubmissionRef.current = false;
        setRecoveryPending(false);
      }
    },
    [actionContext, actionRecipe, currentRecipe, router, sync]
  );

  const handleRecoveryAction = useCallback(
    async (action: string) => {
      if (recoverySubmissionRef.current) return;
      if (action === 'search' && recoveryFlow.kind === 'step1') {
        await openPlannedSearch();
        return;
      }
      if (
        recoveryFlow.kind === 'step2' &&
        recoveryFlow.intent === 'pick_else' &&
        (action === 'tomorrow' || action === 'next_week' || action === 'drop')
      ) {
        if (!actionContext || !actionRecipe) return;
        replacementSession.current ??= {
          ...createReplacementSession(
            {
              weekOffset: 0,
              dayIndex: calendarDayIndex(actionContext),
              date: actionContext.today,
              referenceWeekStartDate: actionContext.referenceWeekStartDate,
              recipe: actionRecipe,
              status: actionStatus.current,
            },
            recoveryFlow.pendingRecipe,
            action
          ),
          context: actionContext,
        };
        await continueReplacement();
        return;
      }
      recoverySubmissionRef.current = true;
      setRecoveryPending(true);
      try {
        const context = actionContext;
        if (!context) throw new Error("Could not confirm today's date. Try again.");
        const todayStr = context.today;
        const todayDate = DateOnly.parse(todayStr);
        if (!todayDate) return;

        const finalizeOrderedIn = async () => {
          useTodayStore.getState().applyServerUpdate({ date: todayStr, recipe: null, status: 3 });
          useWeekStore.getState().applySlotUpdate({
            date: todayStr,
            recipe: null,
            status: 3,
          });
          await apiClient.api.schedule.day.byDate(todayDate).validate.post({ status: 3 });
        };

        if (action === 'order_in') {
          if (!actionRecipe) {
            markOrderedIn(context);
            useWeekStore.getState().applySlotUpdate({
              date: todayStr,
              recipe: null,
              status: 3,
            });
            return;
          }

          setRecoveryFlow({
            kind: 'step2',
            intent: 'order_in',
            pendingRecipe: actionRecipe,
          });
        } else if (action === 'pick_else') {
          setRecoveryFlow({
            kind: 'quick_find',
            intent: 'pick_else',
          });
        } else if (action === 'tomorrow') {
          const recipeId = actionRecipe?.id;
          if (!recipeId) {
            setRecoveryFlow({ kind: 'closed' });
            return;
          }
          const fromIndex = getMondayBasedDayIndex(todayStr);
          tomorrowSourceRef.current ??= {
            weekOffset: 0,
            dayIndex: fromIndex,
            date: todayStr,
            recipe: actionRecipe,
            referenceWeekStartDate: context.referenceWeekStartDate,
          };
          await moveTomorrow(
            tomorrowSourceRef.current,
            recoveryFlow.kind === 'step2' && recoveryFlow.intent === 'order_in'
              ? 'order_in'
              : undefined
          );
          if (recoveryFlow.kind === 'step2' && recoveryFlow.intent === 'order_in') {
            useTodayStore.getState().applyServerUpdate({ date: todayStr, recipe: null, status: 3 });
            useWeekStore.getState().applySlotUpdate({ date: todayStr, recipe: null, status: 3 });
          }

          setRecoveryFlow({ kind: 'closed' });
          if (
            !useWeekStore.getState().weekStartDate ||
            useWeekStore.getState().weekStartDate === context.currentWeekStartDate
          )
            await useWeekStore.getState().init(0, context.referenceWeekStartDate);
          if (recoveryFlow.kind === 'step2' && recoveryFlow.intent === 'order_in') {
            useWeekStore.getState().applySlotUpdate({
              date: todayStr,
              recipe: null,
              status: 3,
            });
          }
          sync();
          router.push(
            `${ROUTES.PLANNER}?weekOffset=0&referenceWeekStartDate=${context.referenceWeekStartDate}`
          );
        } else if (action === 'next_week') {
          const recipeId = actionRecipe?.id;
          if (!recipeId) {
            setRecoveryFlow({ kind: 'closed' });
            return;
          }
          if (recoveryFlow.kind === 'step2' && recoveryFlow.intent === 'order_in') {
            await finalizeOrderedIn();
          }
          tomorrowSourceRef.current ??= {
            weekOffset: 0,
            dayIndex: calendarDayIndex(context),
            date: todayStr,
            referenceWeekStartDate: context.referenceWeekStartDate,
            recipe: actionRecipe,
          };
          const deferResult = await deferToFollowingWeek(tomorrowSourceRef.current);
          if (deferResult?.data?.message) {
            useUiStore.getState().addToast(deferResult.data.message);
          }

          setRecoveryFlow({ kind: 'closed' });
          if (
            !useWeekStore.getState().weekStartDate ||
            useWeekStore.getState().weekStartDate === context.currentWeekStartDate
          )
            await useWeekStore.getState().init(0, context.referenceWeekStartDate);
          if (recoveryFlow.kind === 'step2' && recoveryFlow.intent === 'order_in') {
            useWeekStore.getState().applySlotUpdate({
              date: todayStr,
              recipe: null,
              status: 3,
            });
          }
          sync();
        } else if (action === 'drop') {
          if (recoveryFlow.kind === 'step2' && recoveryFlow.intent === 'order_in') {
            await finalizeOrderedIn();
          } else {
            await apiClient.api.schedule.day.byDate(todayDate).remove.delete();
            // Reset today's slot so the user can re-plan after dropping
            useTodayStore.getState().applyServerUpdate({ date: todayStr, recipe: null, status: 0 });
          }
          setRecoveryFlow({ kind: 'closed' });
          if (
            !useWeekStore.getState().weekStartDate ||
            useWeekStore.getState().weekStartDate === context.currentWeekStartDate
          )
            await useWeekStore.getState().init(0, context.referenceWeekStartDate);
          if (recoveryFlow.kind === 'step2' && recoveryFlow.intent === 'order_in') {
            useWeekStore.getState().applySlotUpdate({
              date: todayStr,
              recipe: null,
              status: 3,
            });
          }
          sync();
          router.push(
            `${ROUTES.PLANNER}?weekOffset=0&referenceWeekStartDate=${context.referenceWeekStartDate}`
          );
        }
      } catch (error) {
        console.warn('Recovery action stopped:', error instanceof Error ? error.message : error);
        if (action === 'tomorrow') await sync();
        useUiStore.getState().addToast({
          type: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'This meal could not be moved. Please refresh your plan.',
        });
      } finally {
        recoverySubmissionRef.current = false;
        setRecoveryPending(false);
      }
    },
    [
      markOrderedIn,
      sync,
      recoveryFlow,
      router,
      actionContext,
      actionRecipe,
      continueReplacement,
      openPlannedSearch,
    ]
  );

  const handleQuickFindSelect = async (recipe: any) => {
    const quickFindIntent = recoveryFlow.kind === 'quick_find' ? recoveryFlow.intent : null;
    setRecoveryFlow({ kind: 'closed' });
    if (!recipe) return;
    if (quickFindIntent === 'pick_else') {
      setRecoveryFlow({
        kind: 'step2',
        intent: 'pick_else',
        pendingRecipe: recipe,
      });
    } else {
      assignRecipe(
        {
          id: recipe.id,
          name: recipe.name ?? null,
          image: recipe.image ?? '',
        },
        actionContext ?? undefined
      );
    }
  };

  const openTodaySearch = async () => {
    try {
      const context = await useTodayStore.getState().ensureCalendar();
      const params = new URLSearchParams({
        focus: 'search',
        addToDay: String(calendarDayIndex(context)),
        weekOffset: '0',
        referenceWeekStartDate: context.referenceWeekStartDate,
      });
      setRetryStart(null);
      router.push(`/recipes?${params}`);
    } catch {
      // The existing calendar notice retries the same navigation intent.
      setRetryStart(() => () => void openTodaySearch());
    }
  };

  const replaceMysteryWithTakeOut = async () => {
    if (takeOutSubmission.current) return;
    const source = useTodayStore.getState();
    const sourceDate = source.calendar?.today;
    if (source.currentRecipe || source.status !== 3 || source.nonCooking?.kind !== 'mystery')
      return;
    const sameSource = () => {
      const current = useTodayStore.getState();
      return (
        current.calendar?.today === sourceDate &&
        !current.currentRecipe &&
        current.status === 3 &&
        current.nonCooking?.kind === 'mystery'
      );
    };
    takeOutSubmission.current = true;
    setTakeOutPending(true);
    setTakeOutError(null);
    try {
      const context = await source.ensureCalendar();
      if (context.today !== sourceDate || !sameSource()) return;
      const plan = { kind: 'order_in' as const, customLabel: null };
      await saveNonCookingDay(context.today, plan);
      // The captured date is committed. Do not replace a newer local plan or recipe.
      if (!sameSource()) return;
      const update = { date: context.today, recipe: null, status: 3, nonCooking: plan };
      useTodayStore.getState().applyServerUpdate(update);
      useWeekStore.getState().applySlotUpdate(update);
    } catch {
      if (sameSource()) {
        // A save may have committed before a later publication failure. Reread
        // rather than claiming rollback or falling back to status-only validation.
        await sync();
        if (sameSource())
          setTakeOutError({
            date: sourceDate,
            recipe: source.currentRecipe,
            kind: source.nonCooking?.kind,
          });
      }
    } finally {
      takeOutSubmission.current = false;
      setTakeOutPending(false);
    }
  };

  useEffect(
    () => () => {
      replacementSession.current = null;
    },
    []
  );

  const showRecovery = recoveryFlow.kind === 'step1' || recoveryFlow.kind === 'step2';
  const showQuickFind = recoveryFlow.kind === 'quick_find';
  const recoveryStep = recoveryFlow.kind === 'step2' ? 2 : 1;

  return (
    <div className="flex flex-col gap-5 pt-3 pb-12 max-w-[27rem] mx-auto w-full px-4 sm:gap-8 sm:px-0 sm:pt-4 sm:max-w-sm">
      {takeOutError && (
        <div
          role="alert"
          data-testid="take-out-save-error"
          className="rounded-2xl bg-cream p-4 text-base text-charcoal"
        >
          <p>{t('planner.nonCookingSaveError', 'Could not save this plan. Try again.')}</p>
          <button
            onClick={() => void replaceMysteryWithTakeOut()}
            className="mt-2 min-h-12 px-3 font-semibold text-terracotta-700 focus-visible:outline-2 focus-visible:outline-charcoal"
          >
            {t('errors.tryAgain', 'Try again')}
          </button>
        </div>
      )}
      {calendarError && (
        <div role="alert" className="rounded-2xl bg-terracotta/10 p-4 text-sm text-charcoal">
          <p>{calendarError}</p>
          <button
            className="mt-2 min-h-11 font-bold"
            onClick={() =>
              retryStart ? retryStart() : useTodayStore.getState().retryCalendarAction()
            }
          >
            Try again
          </button>
        </div>
      )}
      <QuickCaptureTrigger />
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20" data-testid="home-loader">
          <SolarLoader label={t('home.aligningDay', 'Aligning your day...')} />
        </div>
      ) : (
        <>
          {isSkipped && !isMysteryNight && !currentRecipe && (
            <TonightCardBase
              data-testid="today-non-cooking-plan"
              className="flex min-w-0 flex-col gap-5 p-6 [overflow-wrap:anywhere]"
            >
              <h2 className="px-1 font-heading text-base font-medium text-charcoal-600">
                {t('home.tonight', 'Tonight')}
              </h2>
              <div
                data-testid="saved-plan-illustration"
                className="flex h-28 items-center justify-center rounded-[1.5rem] bg-cream text-sage-700 sm:h-40"
                aria-hidden="true"
              >
                <NonCookingIcon kind={nonCooking?.kind} size={104} strokeWidth={1.25} />
              </div>
              <div className="space-y-2 px-1">
                <h3
                  data-testid="today-non-cooking-label"
                  className="whitespace-pre-wrap break-words font-heading text-3xl font-black leading-snug text-charcoal"
                >
                  {nonCookingLabel(nonCooking)}
                </h3>
                {nonCookingNote(nonCooking) && (
                  <p
                    data-testid="today-non-cooking-note"
                    className="whitespace-pre-wrap break-words text-base leading-relaxed text-charcoal-600"
                  >
                    {nonCookingNote(nonCooking)}
                  </p>
                )}
              </div>
              <button
                aria-label={`${t('home.tonight', 'Tonight')} ${[nonCookingLabel(nonCooking), nonCookingNote(nonCooking)].filter(Boolean).join(' ')} ${t('planner.editSupperPlan', 'Edit supper plan')}`}
                onClick={() =>
                  router.push(
                    `${ROUTES.PLANNER}?weekOffset=0&referenceWeekStartDate=${calendar?.referenceWeekStartDate ?? ''}&planDate=${calendar?.today ?? ''}`
                  )
                }
                className="flex min-h-14 items-center justify-center rounded-[1.5rem] border border-terracotta-200 px-4 py-3 text-base font-semibold text-terracotta-700 transition-colors hover:bg-terracotta-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-charcoal"
              >
                {t('planner.editSupperPlan', 'Edit supper plan')}
              </button>
            </TonightCardBase>
          )}
          {showSupperChoices && (
            <TonightPivotCard
              actionPending={takeOutPending}
              hasCheckedActive={hasCheckedActive}
              gotoDescription={gotoDescription}
              gotoRecipeId={gotoRecipeId}
              gotoImageUrl={gotoImageUrl}
              gotoStatus={gotoStatus}
              nonCookingLabel={isMysteryNight ? nonCookingLabel(nonCooking) : null}
              nonCookingKind={isMysteryNight ? nonCooking?.kind : null}
              onConfirmGoto={() => {
                if (gotoRecipeId) {
                  assignRecipe({
                    id: gotoRecipeId,
                    name: gotoDescription || null,
                    image: gotoImageUrl || '',
                  });
                } else {
                  void startAction('quick_find');
                }
              }}
              onDiscover={() => {
                if (isMysteryNight) {
                  void startAction('quick_find');
                  return;
                }
                void openTodaySearch();
              }}
              onOrderIn={async () => {
                if (isMysteryNight) {
                  await replaceMysteryWithTakeOut();
                  return;
                }
                if (!currentRecipe) {
                  // B5: No recipe — write status:3 unconditionally via store
                  try {
                    const state = useTodayStore.getState();
                    const context = state.calendarIsFresh()
                      ? state.calendar!
                      : await state.ensureCalendar();
                    markOrderedIn(context);
                    useWeekStore
                      .getState()
                      .applySlotUpdate({ date: context.today, recipe: null, status: 3 });
                  } catch {
                    /* The calendar notice retains the action for retry. */
                    useTodayStore.getState().markOrderedIn();
                  }
                } else {
                  // B6: Recipe exists — open recovery dialog first
                  void startAction('step1');
                }
              }}
            />
          )}

          {isCooked && preparation && (
            <button
              type="button"
              onClick={handleCookMode}
              className="w-full rounded-2xl border border-sage/30 bg-sage/10 p-5 text-left"
            >
              <PreparationStatus preparation={preparation} />
            </button>
          )}
          {isCooked && !preparation && !cookedDismissed && (
            <CookedSuccessCard onDismiss={() => setCookedDismissed(true)} />
          )}

          {isCooked && !preparation && cookedDismissed && (
            <button
              data-testid="cooked-compact-badge"
              onClick={handleCookMode}
              className="flex items-center gap-3 w-full bg-sage/10 border border-sage/30 rounded-2xl px-5 py-4 transition-all active:scale-[0.98] hover:bg-sage/15"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sage/20 text-sage flex-shrink-0">
                <Check size={20} strokeWidth={3} />
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-sm font-black text-sage leading-none">Cooked tonight!</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-sage/60">
                  Tap to open Cook&apos;s Mode
                </span>
              </div>
            </button>
          )}

          {currentRecipe &&
            currentRecipe.id &&
            currentRecipe.name &&
            !isSkipped &&
            !isCooked &&
            !sessionDone && (
              <TonightMenuCard
                recipeId={currentRecipe.id!}
                recipeName={currentRecipe.name!}
                description={
                  currentRecipe.description ||
                  t('home.defaultDescription', 'A delicious meal planned for tonight.')
                }
                imageUrl={currentRecipe.image || undefined}
                ingredients={currentRecipe.ingredients || []}
                ingredientContext={
                  calendar && occurrenceId
                    ? {
                        context: 'assigned',
                        supperDate: calendar.today,
                        occurrenceId,
                      }
                    : null
                }
                totalTime={currentRecipe.totalTime || undefined}
                onCookMode={handleCookMode}
                onSkip={handleSkipTrigger}
              />
            )}
        </>
      )}

      {(votingPhase || votingStatus) && (
        <VotingNudgeCard
          phase={votingPhase}
          status={votingStatus}
          onRetry={() => void refreshSession()}
          onNavigate={() => {
            const current = useDiscoveryStore.getState().session;
            const monday = absoluteMonday(current?.weekStartDate);
            if (!current?.roundId || !monday) return;
            if (current.phase === 'collecting') {
              router.push(ROUTES.DISCOVERY);
            } else if (current.phase === 'converged') {
              usePlannerStore.getState().setActiveTab('planner');
              const params = new URLSearchParams({
                weekOffset: '0',
                referenceWeekStartDate: monday,
              });
              router.push(`${ROUTES.PLANNER}?${params.toString()}`);
            }
          }}
        />
      )}

      <AnimatePresence>
        {showCooksMode && cookingRecipe && cookingRecipe.id && (
          <CooksMode
            ingredientContext={cookingContext}
            recipe={{
              id: cookingRecipe.id,
              name: cookingRecipe.name || null,
              image: cookingRecipe.image || '',
            }}
            onClose={() => {
              setShowCooksMode(false);
            }}
          />
        )}
      </AnimatePresence>

      {showRecovery && (
        <SkipRecoveryDialog
          pending={recoveryPending}
          isOpen={showRecovery}
          step={recoveryStep}
          source={
            actionContext && actionRecipe
              ? {
                  weekOffset: 0,
                  dayIndex: calendarDayIndex(actionContext),
                  date: actionContext.today,
                  referenceWeekStartDate: actionContext.referenceWeekStartDate,
                  recipe: actionRecipe,
                }
              : undefined
          }
          replacement={replacementFeedback}
          searchError={searchError}
          onRetrySearch={() => void openPlannedSearch()}
          onRetryReplacement={() => void continueReplacement()}
          confirmAbandon={confirmAbandon}
          onCancelAbandon={() => {
            reviewOnAbandon.current = false;
            setConfirmAbandon(false);
          }}
          onAbandon={abandonReplacement}
          onReviewPlan={() => {
            if (replacementSession.current && !replacementSession.current.saved) {
              reviewOnAbandon.current = true;
              setConfirmAbandon(true);
            } else
              router.push(
                `${ROUTES.PLANNER}?weekOffset=0&referenceWeekStartDate=${actionContext?.referenceWeekStartDate}`
              );
          }}
          onClose={closeRecovery}
          onBack={() => {
            if (!replacementSession.current && !recoverySubmissionRef.current)
              setRecoveryFlow({ kind: 'step1' });
          }}
          onAction={handleRecoveryAction}
        />
      )}

      <AnimatePresence>
        {showQuickFind && (
          <QuickFindModal
            onClose={() => setRecoveryFlow({ kind: 'closed' })}
            onSelect={handleQuickFindSelect}
            dayIndex={actionContext ? calendarDayIndex(actionContext) : null}
            referenceWeekStartDate={actionContext?.referenceWeekStartDate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
