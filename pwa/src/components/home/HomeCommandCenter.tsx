'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { NonCookingIcon } from '../planner/NonCookingIcon';
import {
  QuickCaptureTrigger,
  CookedSuccessCard,
  VotingNudgeCard,
  BrowseLibraryTrigger,
} from './HomeSections';
import { TonightMenuCard } from './TonightMenuCard';
import { TonightPivotCard } from './TonightPivotCard';
import { SkipRecoveryDialog, type ReplacementFeedback } from './SkipRecoveryDialog';
import { QuickFindModal } from '../planner/QuickFindModal';
import { CooksMode } from '../planner/CooksMode';
import { AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/api-client';
import { getSchedule, normalizeScheduleRecipe } from '@/lib/api/planner';
import { RetryHandlerOptions } from '@microsoft/kiota-http-fetchlibrary';
import { DateOnly } from '@microsoft/kiota-abstractions';
import { calendarDayIndex, type CalendarContext } from '@/lib/deployment-calendar';
import { moveTomorrow, type PlannerSlot } from '@/lib/planner/slotAssignment';
import { referenceRequest } from '@/lib/api/planner';
import { formatTotalTime } from '@/lib/formatTime';
import { SolarLoader } from '../ui/SolarLoader';
import { useFamilyStore } from '@/store/familyStore';
import { useTodayStore } from '@/store/todayStore';
import { useGotoStore } from '@/store/gotoStore';
import { useWeekStore } from '@/store/weekStore';
import { useUiStore } from '@/store/uiStore';
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
  const [cookingRecipe, setCookingRecipe] = useState<any>(null);
  const [actionContext, setActionContext] = useState<CalendarContext | null>(null);
  const actionRecipe = useRef<any>(null);
  const [retryStart, setRetryStart] = useState<(() => void) | null>(null);
  const [recoveryFlow, setRecoveryFlow] = useState<RecoveryFlowState>({
    kind: 'closed',
  });
  const [cookedDismissed, setCookedDismissed] = useState(false);
  const [votingNudge, setVotingNudge] = useState<{
    plannedCount: number;
  } | null>(null);
  const [votingNudgeDismissed, setVotingNudgeDismissed] = useState(false);

  // ── Domain state from todayStore ──────────────────────────────────────────
  // NOTE: init() is intentionally excluded here — TodayStoreInitializer is the sole initialiser.
  const {
    calendar,
    calendarError,
    currentRecipe,
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

  // ── Voting nudge: fetch next-week status after mount (non-blocking) ───────
  useEffect(() => {
    let isMounted = true;
    const fetchVotingStatus = async () => {
      try {
        const result = await apiClient.api.schedule.get({
          queryParameters: { weekOffset: 1 },
        });
        const data = result?.data;
        if (!isMounted) return;
        if (data?.status === 1 && data.days) {
          const plannedCount = data.days.filter((d: any) => d.recipe != null).length;
          setVotingNudge({ plannedCount });
        }
      } catch {
        // AC8: fetch failure → no card shown, no error surfaced
      }
    };
    fetchVotingStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  const router = useRouter();

  const handleCookMode = () => {
    setCookingRecipe(currentRecipe);
    setShowCooksMode(true);
  };

  const startAction = async (kind: 'step1' | 'quick_find') => {
    try {
      const state = useTodayStore.getState();
      const context = state.calendarIsFresh() ? state.calendar! : await state.ensureCalendar();
      tomorrowSourceRef.current = null;
      replacementSession.current = null;
      setReplacementFeedback(null);
      setActionContext(context);
      actionRecipe.current = useTodayStore.getState().currentRecipe;
      setRetryStart(null);
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

  const recoverySubmissionRef = useRef(false);
  const tomorrowSourceRef = useRef<PlannerSlot | null>(null);
  const [recoveryPending, setRecoveryPending] = useState(false);

  const replacementSession = useRef<{
    context: CalendarContext;
    original: any;
    recipe: any;
    action: 'tomorrow' | 'next_week' | 'drop';
    disposed: boolean;
    saved: boolean;
    saveUnknown?: boolean;
    blocked?: boolean;
  } | null>(null);
  const [replacementFeedback, setReplacementFeedback] = useState<ReplacementFeedback | null>(null);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  useEffect(
    () => () => {
      replacementSession.current = null;
    },
    []
  );

  const continueReplacement = useCallback(
    async function continueSession(): Promise<void> {
      const session = replacementSession.current;
      if (!session || recoverySubmissionRef.current) return;
      recoverySubmissionRef.current = true;
      setRecoveryPending(true);
      const active = () => replacementSession.current === session;
      const feedback = (phase: ReplacementFeedback['phase'], message: string) => {
        if (active()) setReplacementFeedback({ phase, message, recipeName: session.recipe.name });
      };
      const { context, recipe, action } = session;
      let finishReconciledSave = false;
      const reconcileSave = async () => {
        try {
          const snapshot = await getSchedule(0, context.referenceWeekStartDate, true);
          const day = snapshot?.days?.find((day) => day.date === context.today);
          if (!day) throw new Error('No authoritative slot');
          if (!active()) return;
          const persisted = normalizeScheduleRecipe(day.recipe);
          useTodayStore.getState().applyServerUpdate({
            date: context.today,
            recipe: persisted,
            status: day.status ?? 0,
            nonCooking: day.nonCooking,
          });
          useWeekStore.getState().applySlotUpdate({
            date: context.today,
            recipe: persisted,
            status: day.status ?? 0,
            nonCooking: day.nonCooking,
          });
          session.saveUnknown = false;
          if (persisted?.id === recipe.id && day.status === 0 && !day.nonCooking?.kind) {
            session.saved = true;
          } else if (!persisted && !day.nonCooking?.kind && day.status === 0) {
            feedback('retry', "Your original meal was updated. Your new meal wasn't saved.");
          } else {
            session.blocked = true;
            feedback('conflict', 'Your plan changed. Review it before replacing this meal.');
          }
        } catch {
          session.saveUnknown = true;
          feedback(
            'unknown',
            'Your new meal could not be confirmed. Check your plan before saving again.'
          );
        }
      };
      try {
        if (session.blocked) return;
        if (session.saveUnknown) {
          await reconcileSave();
          if (!session.saved) return;
        }
        if (!session.disposed) {
          feedback('moving', 'Updating your original meal…');
          if (action === 'tomorrow') {
            tomorrowSourceRef.current ??= {
              weekOffset: 0,
              dayIndex: calendarDayIndex(context),
              date: context.today,
              recipe: session.original,
              referenceWeekStartDate: context.referenceWeekStartDate,
            };
            await moveTomorrow(tomorrowSourceRef.current);
          } else if (action === 'next_week') {
            const result = await apiClient.api.schedule.defer.post(
              { sourceDate: DateOnly.parse(context.today)!, recipeId: session.original.id },
              {
                ...referenceRequest(context.referenceWeekStartDate),
                options: [new RetryHandlerOptions({ maxRetries: 0 })],
              }
            );
            if (active() && result?.data?.message)
              useUiStore.getState().addToast(result.data.message);
          } else {
            await apiClient.api.schedule.day
              .byDate(DateOnly.parse(context.today)!)
              .remove.delete({ options: [new RetryHandlerOptions({ maxRetries: 0 })] });
          }
          session.disposed = true;
          if (!active()) return;
          useTodayStore
            .getState()
            .applyServerUpdate({ date: context.today, recipe: null, status: 0 });
          useWeekStore.getState().applySlotUpdate({ date: context.today, recipe: null, status: 0 });
        }
        if (!session.saved) {
          feedback('saving', 'Saving your new meal…');
          await saveRecoveryRecipe(recipe, context);
          session.saved = true;
        }
        if (!active()) return;
        // A confirmed write remains confirmed even if this separate refresh fails.
        const snapshot = await getSchedule(0, context.referenceWeekStartDate, true);
        if (!snapshot?.days) throw new Error('Plan refresh failed');
        if (!active()) return;
        const day = snapshot.days.find((day) => day.date === context.today);
        if (!day) throw new Error('Plan refresh failed');
        useTodayStore.getState().applyServerUpdate({
          date: context.today,
          recipe: normalizeScheduleRecipe(day.recipe),
          status: day.status ?? 0,
          nonCooking: day.nonCooking,
        });
        if (
          !useWeekStore.getState().weekStartDate ||
          useWeekStore.getState().weekStartDate === context.currentWeekStartDate
        )
          await useWeekStore.getState().init(0, context.referenceWeekStartDate);
        if (!active()) return;
        setRecoveryFlow({ kind: 'closed' });
        setReplacementFeedback(null);
        replacementSession.current = null;
        void sync();
        if (action !== 'next_week')
          router.push(
            `${ROUTES.PLANNER}?weekOffset=0&referenceWeekStartDate=${context.referenceWeekStartDate}`
          );
      } catch {
        if (!active()) return;
        if (session.saved)
          feedback('refresh', 'Your new meal is saved, but your plan could not refresh.');
        else if (session.disposed) {
          session.saveUnknown = true;
          await reconcileSave();
          // A follow-up error can be returned after persistence, even for a 4xx response.
          if (session.saved && active()) {
            finishReconciledSave = true;
            useUiStore.getState().addToast({
              type: 'error',
              message:
                'Your new meal is saved. Some plan updates could not be confirmed. Refresh your plan if needed.',
            });
            setReplacementFeedback({
              phase: 'refresh',
              message: 'Your new meal is saved. Refreshing your plan…',
              recipeName: recipe.name,
            });
          }
        } else {
          session.blocked = true;
          feedback(
            'disposition_unknown',
            'The original meal could not be confirmed. Review your plan before choosing again.'
          );
        }
      } finally {
        if (active() || replacementSession.current === null) {
          recoverySubmissionRef.current = false;
          setRecoveryPending(false);
        }
      }
      if (active() && finishReconciledSave) await continueSession();
    },
    [router, saveRecoveryRecipe, sync]
  );

  const closeRecovery = () => {
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
  };

  const handleRecoveryAction = useCallback(
    async (action: string) => {
      if (recoverySubmissionRef.current) return;
      if (
        recoveryFlow.kind === 'step2' &&
        recoveryFlow.intent === 'pick_else' &&
        (action === 'tomorrow' || action === 'next_week' || action === 'drop')
      ) {
        if (!actionContext || !actionRecipe.current) return;
        replacementSession.current ??= {
          context: actionContext,
          original: actionRecipe.current,
          recipe: recoveryFlow.pendingRecipe,
          action,
          disposed: false,
          saved: false,
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
          if (!actionRecipe.current) {
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
            pendingRecipe: actionRecipe.current,
          });
        } else if (action === 'pick_else') {
          setRecoveryFlow({
            kind: 'quick_find',
            intent: 'pick_else',
          });
        } else if (action === 'tomorrow') {
          const recipeId = actionRecipe.current?.id;
          if (!recipeId) {
            setRecoveryFlow({ kind: 'closed' });
            return;
          }
          const fromIndex = getMondayBasedDayIndex(todayStr);
          tomorrowSourceRef.current ??= {
            weekOffset: 0,
            dayIndex: fromIndex,
            date: todayStr,
            recipe: actionRecipe.current,
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
          const recipeId = actionRecipe.current?.id;
          if (!recipeId) {
            setRecoveryFlow({ kind: 'closed' });
            return;
          }
          if (recoveryFlow.kind === 'step2' && recoveryFlow.intent === 'order_in') {
            await finalizeOrderedIn();
          }
          const sourceDate = DateOnly.parse(todayStr);
          if (!sourceDate) return;
          const deferResult = await apiClient.api.schedule.defer.post(
            { sourceDate, recipeId },
            referenceRequest(context.referenceWeekStartDate)
          );
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
    [markOrderedIn, sync, recoveryFlow, router, actionContext, continueReplacement]
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

  const showRecovery = recoveryFlow.kind === 'step1' || recoveryFlow.kind === 'step2';
  const showQuickFind = recoveryFlow.kind === 'quick_find';
  const recoveryStep = recoveryFlow.kind === 'step2' ? 2 : 1;

  return (
    <div className="flex flex-col gap-5 pt-3 pb-12 max-w-[27rem] mx-auto w-full px-4 sm:gap-8 sm:px-0 sm:pt-4 sm:max-w-sm">
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
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20" data-testid="home-loader">
          <SolarLoader label={t('home.aligningDay', 'Aligning your day...')} />
        </div>
      ) : (
        <>
          {isSkipped && !isMysteryNight && !currentRecipe && (
            <button
              data-testid="today-non-cooking-plan"
              aria-label={`${t('home.tonight', 'Tonight')} ${[nonCookingLabel(nonCooking), nonCookingNote(nonCooking)].filter(Boolean).join(' ')} ${t('planner.editSupperPlan', 'Edit supper plan')}`}
              onClick={() =>
                router.push(
                  `${ROUTES.PLANNER}?weekOffset=0&referenceWeekStartDate=${calendar?.referenceWeekStartDate ?? ''}&planDate=${calendar?.today ?? ''}`
                )
              }
              className="flex w-full items-center gap-4 rounded-[2rem] border border-sage/20 bg-sage/10 p-5 text-left transition-colors hover:bg-sage/15 focus-visible:outline-2 focus-visible:outline-sage-700"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sage/15 text-sage-700">
                <NonCookingIcon kind={nonCooking?.kind} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block mb-1 text-xs font-bold text-charcoal/70">
                  {t('home.tonight', 'Tonight')}
                </span>
                <span
                  data-testid="today-non-cooking-label"
                  className="line-clamp-2 break-words font-heading text-lg font-bold text-charcoal"
                >
                  {nonCookingLabel(nonCooking)}
                </span>
                {nonCookingNote(nonCooking) && (
                  <span
                    data-testid="today-non-cooking-note"
                    title={nonCookingNote(nonCooking) ?? undefined}
                    className="block line-clamp-2 break-words text-sm text-charcoal/70"
                  >
                    {nonCookingNote(nonCooking)}
                  </span>
                )}
                <span className="sr-only">{t('planner.editSupperPlan', 'Edit supper plan')}</span>
              </span>
              <ChevronRight size={20} aria-hidden="true" className="shrink-0 text-charcoal/60" />
            </button>
          )}
          {showSupperChoices && (
            <TonightPivotCard
              gotoDescription={gotoDescription}
              gotoRecipeId={gotoRecipeId}
              gotoImageUrl={gotoImageUrl}
              gotoStatus={gotoStatus}
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
                void startAction('quick_find');
              }}
              onOrderIn={async () => {
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

          {isCooked && !cookedDismissed && (
            <CookedSuccessCard onDismiss={() => setCookedDismissed(true)} />
          )}

          {isCooked && cookedDismissed && (
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
                totalTime={formatTotalTime(currentRecipe.totalTime) ?? undefined}
                onCookMode={handleCookMode}
                onSkip={handleSkipTrigger}
              />
            )}
        </>
      )}

      {votingNudge && !votingNudgeDismissed && (
        <VotingNudgeCard
          plannedCount={votingNudge.plannedCount}
          onVote={() => router.push(ROUTES.DISCOVERY as any)}
          onDismiss={() => setVotingNudgeDismissed(true)}
        />
      )}

      <QuickCaptureTrigger />
      <BrowseLibraryTrigger testId="home-browse-all-trigger" />

      <AnimatePresence>
        {showCooksMode && cookingRecipe && cookingRecipe.id && (
          <CooksMode
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
          replacement={replacementFeedback}
          onRetryReplacement={() => void continueReplacement()}
          confirmAbandon={confirmAbandon}
          onCancelAbandon={() => setConfirmAbandon(false)}
          onAbandon={abandonReplacement}
          onReviewPlan={() =>
            router.push(
              `${ROUTES.PLANNER}?weekOffset=0&referenceWeekStartDate=${actionContext?.referenceWeekStartDate}`
            )
          }
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
