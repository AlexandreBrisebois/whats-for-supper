import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { useRouter } from 'next/navigation';
import { saveNonCookingDay } from '@/lib/api/planner';
import type { IngredientContext } from '@/lib/api/recipes';
import { calendarDayIndex, type CalendarContext } from '@/lib/deployment-calendar';
import { ROUTES } from '@/lib/constants/routes';
import { useFamilyStore } from '@/store/familyStore';
import { useGotoStore } from '@/store/gotoStore';
import { useTodayStore, type TodayState } from '@/store/todayStore';
import { useWeekStore } from '@/store/weekStore';
import type {
  GoToItem,
  NonCookingPlanDto,
  ScheduleRecipeDto,
} from '@/lib/api/generated/models/index';
import type { TakeOutSaveError } from './types';

interface UseHomeTonightActionsParams {
  router: ReturnType<typeof useRouter>;
  calendar: CalendarContext | null | undefined;
  currentRecipe: ScheduleRecipeDto | null;
  nonCooking: NonCookingPlanDto | null | undefined;
  isMysteryNight: boolean;
  assignRecipe: TodayState['assignRecipe'];
  markOrderedIn: TodayState['markOrderedIn'];
  sync: TodayState['sync'];
  startAction: (kind: 'step1' | 'quick_find') => Promise<void>;
  setRetryStart: Dispatch<SetStateAction<(() => void) | null>>;
}

export function useHomeTonightActions({
  router,
  calendar,
  currentRecipe,
  nonCooking,
  isMysteryNight,
  assignRecipe,
  markOrderedIn,
  sync,
  startAction,
  setRetryStart,
}: UseHomeTonightActionsParams) {
  // ── UI-only state (not domain state) ──────────────────────────────────────
  const [showCooksMode, setShowCooksMode] = useState(false);
  const [cookingContext, setCookingContext] = useState<IngredientContext>();
  const [cookingRecipe, setCookingRecipe] = useState<ScheduleRecipeDto | null>(null);
  const takeOutSubmission = useRef(false);
  const [takeOutPending, setTakeOutPending] = useState(false);
  const [takeOutError, setTakeOutError] = useState<TakeOutSaveError | null>(null);
  const [cookedDismissed, setCookedDismissed] = useState(false);

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

  const handleConfirmGoto = () => {
    if (gotoRecipeId) {
      assignRecipe({
        id: gotoRecipeId,
        name: gotoDescription || null,
        image: gotoImageUrl || '',
      });
    } else {
      void startAction('quick_find');
    }
  };

  const handleDiscover = () => {
    if (isMysteryNight) {
      void startAction('quick_find');
      return;
    }
    void openTodaySearch();
  };

  const handleOrderIn = async () => {
    if (isMysteryNight) {
      await replaceMysteryWithTakeOut();
      return;
    }
    if (!currentRecipe) {
      // B5: No recipe — write status:3 unconditionally via store
      try {
        const state = useTodayStore.getState();
        const context = state.calendarIsFresh() ? state.calendar! : await state.ensureCalendar();
        markOrderedIn(context);
        useWeekStore.getState().applySlotUpdate({ date: context.today, recipe: null, status: 3 });
      } catch {
        /* The calendar notice retains the action for retry. */
        useTodayStore.getState().markOrderedIn();
      }
    } else {
      // B6: Recipe exists — open recovery dialog first
      void startAction('step1');
    }
  };

  const handleEditNonCookingPlan = () => {
    router.push(
      `${ROUTES.PLANNER}?weekOffset=0&referenceWeekStartDate=${calendar?.referenceWeekStartDate ?? ''}&planDate=${calendar?.today ?? ''}`
    );
  };

  return {
    showCooksMode,
    cookingContext,
    cookingRecipe,
    cookedDismissed,
    takeOutPending,
    takeOutError,
    hasCheckedActive,
    gotoDescription,
    gotoRecipeId,
    gotoImageUrl,
    gotoStatus,
    handleCookMode,
    closeCooksMode: () => setShowCooksMode(false),
    dismissCookedCelebration: () => setCookedDismissed(true),
    replaceMysteryWithTakeOut,
    handleConfirmGoto,
    handleDiscover,
    handleOrderIn,
    handleEditNonCookingPlan,
  };
}
