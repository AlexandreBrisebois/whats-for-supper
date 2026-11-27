import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { useRouter } from 'next/navigation';
import { DateOnly } from '@microsoft/kiota-abstractions';
import { calendarDayIndex, type CalendarContext } from '@/lib/deployment-calendar';
import type { AssignmentRecipe, PlannerSlot } from '@/lib/planner/slotAssignment';
import { useTodayStore, type TodayState } from '@/store/todayStore';
import { useWeekStore } from '@/store/weekStore';
import { useUiStore } from '@/store/uiStore';
import { t } from '@/locales';
import type { NonCookingPlanDto, ScheduleRecipeDto } from '@/lib/api/generated/models/index';
import type { SkipRecoveryBackupIntent } from '@/components/home/SkipRecoveryDialog';
import { executeRecoveryDisposition, runPlannedSearchNavigation } from './recoveryMutations';
import type { QuickFindSelection, RecoveryAction, RecoveryFlowState } from './types';
import { useReplacementSessionController } from './useReplacementSessionController';

interface UseTonightRecoveryFlowParams {
  router: ReturnType<typeof useRouter>;
  currentRecipe: ScheduleRecipeDto | null;
  assignRecipe: TodayState['assignRecipe'];
  saveRecoveryRecipe: TodayState['saveRecoveryRecipe'];
  markOrderedIn: TodayState['markOrderedIn'];
  sync: TodayState['sync'];
  setRetryStart: Dispatch<SetStateAction<(() => void) | null>>;
}

export function useTonightRecoveryFlow({
  router,
  currentRecipe,
  assignRecipe,
  saveRecoveryRecipe,
  markOrderedIn,
  sync,
  setRetryStart,
}: UseTonightRecoveryFlowParams) {
  const [actionContext, setActionContext] = useState<CalendarContext | null>(null);
  const [actionRecipe, setActionRecipe] = useState<ScheduleRecipeDto | null>(null);
  const actionStatus = useRef<number>(0);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [recoveryFlow, setRecoveryFlow] = useState<RecoveryFlowState>({ kind: 'closed' });
  const recoverySubmissionRef = useRef(false);
  const tomorrowSourceRef = useRef<PlannerSlot | null>(null);
  const [recoveryPending, setRecoveryPending] = useState(false);

  const closeRecoveryFlow = useCallback(() => setRecoveryFlow({ kind: 'closed' }), []);

  const replacement = useReplacementSessionController({
    router,
    saveRecoveryRecipe,
    sync,
    recoverySubmissionRef,
    setRecoveryPending,
    closeRecoveryFlow,
  });

  const startAction = useCallback(
    async (kind: 'step1' | 'quick_find') => {
      try {
        const state = useTodayStore.getState();
        const context = state.calendarIsFresh() ? state.calendar! : await state.ensureCalendar();
        tomorrowSourceRef.current = null;
        const capturedRecipe = useTodayStore.getState().currentRecipe;
        replacement.resetForOpening(kind, context, capturedRecipe);
        setActionContext(context);
        setActionRecipe(capturedRecipe);
        actionStatus.current = useTodayStore.getState().status;
        setRetryStart(null);
        setSearchError(null);
        setRecoveryFlow(kind === 'step1' ? { kind } : { kind, intent: null });
      } catch {
        setRetryStart(() => () => {
          void startAction(kind);
        });
      }
    },
    [replacement, setRetryStart]
  );

  const handleSkipTrigger = useCallback(() => {
    void startAction('step1');
  }, [startAction]);

  const openPlannedSearch = useCallback(
    async function openPlannedSearch() {
      if (recoverySubmissionRef.current || !actionContext || !actionRecipe?.id) return;
      recoverySubmissionRef.current = true;
      setRecoveryPending(true);
      setSearchError(null);
      try {
        await runPlannedSearchNavigation({
          actionContext,
          actionRecipe,
          currentRecipe,
          router,
          sync,
          onStaleTarget: () => {
            setRecoveryFlow({ kind: 'closed' });
            setActionContext(null);
            setRetryStart(null);
          },
          onSuccess: () => {
            setRetryStart(null);
            setRecoveryFlow({ kind: 'closed' });
          },
        });
      } catch {
        setSearchError(t('home.searchCalendarRetry', 'Could not confirm today’s plan. Try again.'));
        setRetryStart(() => () => void openPlannedSearch());
      } finally {
        recoverySubmissionRef.current = false;
        setRecoveryPending(false);
      }
    },
    [actionContext, actionRecipe, currentRecipe, router, setRetryStart, sync]
  );

  const handleRecoveryAction = useCallback(
    async (action: RecoveryAction) => {
      if (recoverySubmissionRef.current) return;
      if (action === 'search') {
        if (recoveryFlow.kind === 'step1') await openPlannedSearch();
        return;
      }
      if (
        recoveryFlow.kind === 'step2' &&
        recoveryFlow.intent === 'pick_else' &&
        (action === 'tomorrow' || action === 'next_week' || action === 'drop')
      ) {
        if (!actionContext || !actionRecipe) return;
        await replacement.startOrContinueReplacement({
          actionContext,
          actionRecipe,
          actionStatus: actionStatus.current,
          pendingRecipe: recoveryFlow.pendingRecipe,
          action,
        });
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

        if (action === 'order_in' || action === 'eating_out') {
          const selectedPlan: NonCookingPlanDto = { kind: action, customLabel: null };
          if (!actionRecipe) {
            if (action === 'order_in') {
              markOrderedIn(context);
              useWeekStore.getState().applySlotUpdate({ date: todayStr, recipe: null, status: 3 });
            }
            return;
          }
          setRecoveryFlow({
            kind: 'step2',
            intent: 'non_cooking',
            nonCooking: selectedPlan,
            pendingRecipe: actionRecipe,
          });
        } else if (action === 'pick_else') {
          setRecoveryFlow({ kind: 'quick_find', intent: 'pick_else' });
        } else {
          await executeRecoveryDisposition({
            action,
            context,
            todayDate,
            actionRecipe,
            recoveryFlow,
            tomorrowSourceRef,
            sync,
            router,
            setRecoveryFlow,
          });
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
      actionContext,
      actionRecipe,
      markOrderedIn,
      openPlannedSearch,
      recoveryFlow,
      replacement,
      router,
      sync,
    ]
  );

  const handleQuickFindSelect = useCallback(
    async (recipe: QuickFindSelection | null | undefined) => {
      const quickFindIntent = recoveryFlow.kind === 'quick_find' ? recoveryFlow.intent : null;
      setRecoveryFlow({ kind: 'closed' });
      if (!recipe?.id) return;
      const selectedRecipe: AssignmentRecipe = {
        id: recipe.id,
        name: recipe.name ?? null,
        image: recipe.image ?? '',
      };
      if (quickFindIntent === 'pick_else') {
        setRecoveryFlow({
          kind: 'step2',
          intent: 'pick_else',
          pendingRecipe: selectedRecipe,
        });
      } else {
        assignRecipe(selectedRecipe, actionContext ?? undefined);
      }
    },
    [actionContext, assignRecipe, recoveryFlow]
  );

  const handleBack = useCallback(() => {
    if (!replacement.hasStartedReplacement() && !recoverySubmissionRef.current) {
      setRecoveryFlow({ kind: 'step1' });
    }
  }, [replacement]);

  const handleCustomPlan = useCallback(
    (customLabel: string) => {
      if (recoverySubmissionRef.current || !actionRecipe) return;
      setRecoveryFlow({
        kind: 'step2',
        intent: 'non_cooking',
        nonCooking: { kind: 'custom', customLabel },
        pendingRecipe: actionRecipe,
      });
    },
    [actionRecipe]
  );

  const backupIntent: SkipRecoveryBackupIntent | null =
    recoveryFlow.kind === 'step2'
      ? recoveryFlow.intent === 'non_cooking'
        ? { kind: 'non_cooking', nonCooking: recoveryFlow.nonCooking }
        : { kind: 'pick_else' }
      : null;

  const recoverySource: PlannerSlot | undefined =
    actionContext && actionRecipe
      ? {
          weekOffset: 0,
          dayIndex: calendarDayIndex(actionContext),
          date: actionContext.today,
          referenceWeekStartDate: actionContext.referenceWeekStartDate,
          recipe: actionRecipe,
        }
      : undefined;

  const onChooseAnotherDay =
    recoveryFlow.kind === 'step2' && recoveryFlow.intent === 'pick_else' && actionContext
      ? () => replacement.chooseAnotherDay(recoveryFlow.pendingRecipe, actionContext)
      : undefined;

  return {
    showRecovery: recoveryFlow.kind === 'step1' || recoveryFlow.kind === 'step2',
    showQuickFind: recoveryFlow.kind === 'quick_find',
    recoveryStep: (recoveryFlow.kind === 'step2' ? 2 : 1) as 1 | 2,
    recoveryPending,
    backupIntent,
    recoverySource,
    searchError,
    actionContext,
    replacementFeedback: replacement.replacementFeedback,
    confirmAbandon: replacement.confirmAbandon,
    dayChooserState: replacement.dayChooserState,
    startAction,
    handleSkipTrigger,
    onRetrySearch: () => void openPlannedSearch(),
    onRetryReplacement: () => void replacement.continueReplacement(),
    onCancelAbandon: replacement.cancelAbandon,
    onAbandon: () => replacement.abandonReplacement(actionContext),
    onReviewPlan: () => replacement.reviewPlan(actionContext),
    onChooseAnotherDay,
    onCloseRecovery: replacement.closeRecovery,
    onBack: handleBack,
    onCustomPlan: handleCustomPlan,
    onAction: handleRecoveryAction,
    onCloseQuickFind: closeRecoveryFlow,
    onSelectQuickFind: handleQuickFindSelect,
    onCloseDayChooser: replacement.closeDayChooser,
    onSelectDayChooserSlot: replacement.selectDayChooserSlot,
  };
}
