'use client';

import { useState, useEffect, useCallback } from 'react';
import { Check } from 'lucide-react';
import { QuickCaptureTrigger, CookedSuccessCard, VotingNudgeCard } from './HomeSections';
import { TonightMenuCard } from './TonightMenuCard';
import { TonightPivotCard } from './TonightPivotCard';
import { SkipRecoveryDialog } from './SkipRecoveryDialog';
import { QuickFindModal } from '../planner/QuickFindModal';
import { CooksMode } from '../planner/CooksMode';
import { AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/api-client';
import { DateOnly } from '@microsoft/kiota-abstractions';
import { assignRecipeToDay } from '@/lib/api/planner';
import { formatTotalTime } from '@/lib/formatTime';
import { getTodayString } from '@/lib/imageUtils';
import { SolarLoader } from '../ui/SolarLoader';
import { useFamilyStore } from '@/store/familyStore';
import { useTodayStore } from '@/store/todayStore';
import { useGotoStore } from '@/store/gotoStore';
import { useWeekStore } from '@/store/weekStore';
import { t } from '@/locales';
import { ROUTES } from '@/lib/constants/routes';

interface HomeCommandCenterProps {
  todaysRecipe: any;
  todayStatus?: 0 | 2 | 3;
}

type RecoveryFlowState =
  | { kind: 'closed' }
  | { kind: 'step1' }
  | { kind: 'quick_find'; intent: 'pick_else' | null }
  | { kind: 'step2'; intent: 'order_in'; pendingRecipe: null }
  | { kind: 'step2'; intent: 'pick_else'; pendingRecipe: any };

export function HomeCommandCenter({ todaysRecipe, todayStatus }: HomeCommandCenterProps) {
  // ── UI-only state (not domain state) ──────────────────────────────────────
  const [showCooksMode, setShowCooksMode] = useState(false);
  const [recoveryFlow, setRecoveryFlow] = useState<RecoveryFlowState>({ kind: 'closed' });
  const [cookedDismissed, setCookedDismissed] = useState(false);
  const [votingNudge, setVotingNudge] = useState<{ plannedCount: number } | null>(null);
  const [votingNudgeDismissed, setVotingNudgeDismissed] = useState(false);

  // ── Domain state from todayStore ──────────────────────────────────────────
  // NOTE: init() is intentionally excluded here — TodayStoreInitializer is the sole initialiser.
  const { currentRecipe, status, isLoading, assignRecipe, markCooked, markOrderedIn, sync } =
    useTodayStore();

  const isCooked = status === 2;
  const isSkipped = status === 3;
  const sessionDone = status === 2 || status === 3;

  // ── Family / GOTO settings ────────────────────────────────────────────────
  const { loadSetting, familySettings } = useFamilyStore();

  const gotoValue = familySettings['family_goto'] as
    | { description?: string; recipeId?: string; imageUrl?: string }
    | null
    | undefined;

  const gotoDescription = gotoValue?.description ?? null;
  const gotoRecipeId = gotoValue?.recipeId ?? null;
  const gotoImageUrl = gotoValue?.imageUrl ?? null;

  // ── GOTO recipe status — driven by SSE recipe_ready event ─────────────────
  // useScheduleStream calls useGotoStore.getState().markReady(recipeId) when
  // the recipe_ready SSE event arrives. We subscribe here and fetch the recipe
  // detail once when the ID matches, then reset the store.
  const [gotoRecipeStatus, setGotoRecipeStatus] = useState<'pending' | 'ready' | null>(null);
  const [gotoRecipeData, setGotoRecipeData] = useState<any>(null);

  // Track previous GOTO ID to reset status during render pass (avoids cascading effect)
  const [prevGotoId, setPrevGotoId] = useState<string | null>(gotoRecipeId);

  if (gotoRecipeId !== prevGotoId) {
    setPrevGotoId(gotoRecipeId);
    setGotoRecipeStatus(null);
  }

  const { readyRecipeId } = useGotoStore();

  // ── Priming read: check GOTO status once on mount ─────────────────────────
  // SSE only fires recipe_ready for future transitions. If the recipe was
  // already ready before this page load, we need a single status fetch to
  // prime the initial state — otherwise the card shows "Checking your GOTO…"
  // indefinitely until the next SSE event (which never comes for a ready recipe).
  useEffect(() => {
    if (!gotoRecipeId) return;

    let isMounted = true;

    const checkInitialStatus = async () => {
      try {
        const statusRes = await apiClient.api.recipes.byId(gotoRecipeId).status.get();
        if (!isMounted) return;
        const status = statusRes?.data?.status;
        if (status === 'ready') {
          const recipeRes = await apiClient.api.recipes.byId(gotoRecipeId).get();
          if (!isMounted) return;
          if (recipeRes?.recipe) {
            setGotoRecipeData(recipeRes.recipe);
          }
          setGotoRecipeStatus('ready');
        } else if (status === 'pending') {
          setGotoRecipeStatus('pending');
          // SSE recipe_ready will drive the transition when synthesis completes
        }
      } catch {
        // Status check failed — leave as null (isFetching state), SSE will recover
      }
    };

    checkInitialStatus();

    return () => {
      isMounted = false;
    };
  }, [gotoRecipeId]);

  // ── SSE-driven transition: recipe_ready event ─────────────────────────────
  // Fires when synthesis completes after this page was already loaded.
  // Fetches recipe detail and transitions from pending → ready.
  useEffect(() => {
    if (!gotoRecipeId || readyRecipeId !== gotoRecipeId) return;

    let isMounted = true;

    const fetchReadyRecipe = async () => {
      try {
        const recipeRes = await apiClient.api.recipes.byId(gotoRecipeId).get();
        if (!isMounted) return;
        if (recipeRes?.recipe) {
          setGotoRecipeData(recipeRes.recipe);
        }
        setGotoRecipeStatus('ready');
      } catch (err) {
        console.error('Failed to fetch GOTO recipe detail after recipe_ready:', err);
        setGotoRecipeStatus('ready');
      }
    };

    fetchReadyRecipe();

    return () => {
      isMounted = false;
    };
  }, [gotoRecipeId, readyRecipeId]);

  // ── Mount: load settings and background sync ─────────────────────────────
  // NOTE: init() is intentionally NOT called here (BS-1 fix).
  // TodayStoreInitializer (rendered by the home page server component) is the
  // sole initialiser. Calling init() here would create a dual-init race.
  useEffect(() => {
    loadSetting('family_goto');

    // Background sync — non-blocking; reconciles stale SSR data
    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Reset cookedDismissed when no longer cooked ───────────────────────────
  // Note: cookedDismissed is only visually meaningful when isCooked is true.
  // Both badge conditions already gate on isCooked, so no explicit reset effect is needed.

  // ── Voting nudge: fetch next-week status after mount (non-blocking) ───────
  useEffect(() => {
    let isMounted = true;
    const fetchVotingStatus = async () => {
      try {
        const result = await apiClient.api.schedule.get({ queryParameters: { weekOffset: 1 } });
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
    setShowCooksMode(true);
  };

  const handleSkipTrigger = () => {
    setRecoveryFlow({ kind: 'step1' });
  };

  const handleCookedMark = () => {
    markCooked();
  };

  const handleRecoveryAction = useCallback(
    async (action: string) => {
      try {
        const todayStr = getTodayString();
        const todayDate = DateOnly.parse(todayStr);
        if (!todayDate) return;

        if (action === 'order_in') {
          markOrderedIn();
          useWeekStore.getState().applySlotUpdate({
            date: todayStr,
            recipe: null,
            status: 3,
          });
          setRecoveryFlow({ kind: 'step2', intent: 'order_in', pendingRecipe: null });
          // Do NOT close recovery dialog; let Step 2 handle rescheduling
        } else if (action === 'pick_else') {
          setRecoveryFlow({ kind: 'quick_find', intent: 'pick_else' });
        } else if (action === 'tomorrow') {
          const recipeId = currentRecipe?.id;
          if (!recipeId) {
            setRecoveryFlow({ kind: 'closed' });
            return;
          }
          // Reschedule tonight's meal to tomorrow
          await apiClient.api.schedule.move.post({
            weekOffset: 0,
            fromIndex: (new Date().getDay() + 6) % 7,
            toIndex: ((new Date().getDay() + 6) % 7) + 1,
            intent: 'push',
            recipeId,
          });

          if (recoveryFlow.kind === 'step2' && recoveryFlow.intent === 'pick_else') {
            assignRecipe(recoveryFlow.pendingRecipe);
          }

          setRecoveryFlow({ kind: 'closed' });
          await useWeekStore.getState().init(0);
          sync();
        } else if (action === 'next_week') {
          const recipeId = currentRecipe?.id;
          if (!recipeId) {
            setRecoveryFlow({ kind: 'closed' });
            return;
          }
          await apiClient.api.schedule.move.post({
            weekOffset: 0,
            fromIndex: (new Date().getDay() + 6) % 7,
            toIndex: 0,
            targetWeekOffset: 1,
            intent: 'push',
            recipeId,
          });
          if (recoveryFlow.kind === 'step2' && recoveryFlow.intent === 'pick_else') {
            assignRecipe(recoveryFlow.pendingRecipe);
          }
          setRecoveryFlow({ kind: 'closed' });
          await useWeekStore.getState().init(0);
          sync();
        } else if (action === 'drop') {
          await apiClient.api.schedule.day.byDate(todayDate).remove.delete();
          // Reset today's slot so the user can re-plan after dropping
          useTodayStore.getState().applyServerUpdate({ recipe: null, status: 0 });
          if (recoveryFlow.kind === 'step2' && recoveryFlow.intent === 'pick_else') {
            assignRecipe(recoveryFlow.pendingRecipe);
          }
          setRecoveryFlow({ kind: 'closed' });
          await useWeekStore.getState().init(0);
          sync();
        }
      } catch (error) {
        console.error('Failed recovery action:', error);
      }
    },
    [markOrderedIn, sync, recoveryFlow, assignRecipe, currentRecipe]
  );

  const handleQuickFindSelect = async (recipe: any) => {
    const quickFindIntent = recoveryFlow.kind === 'quick_find' ? recoveryFlow.intent : null;
    setRecoveryFlow({ kind: 'closed' });
    if (!recipe) return;
    if (quickFindIntent === 'pick_else') {
      setRecoveryFlow({ kind: 'step2', intent: 'pick_else', pendingRecipe: recipe });
    } else {
      assignRecipe({ id: recipe.id, name: recipe.name ?? null, image: recipe.image ?? '' });
    }
  };

  const showRecovery = recoveryFlow.kind === 'step1' || recoveryFlow.kind === 'step2';
  const showQuickFind = recoveryFlow.kind === 'quick_find';
  const recoveryStep = recoveryFlow.kind === 'step2' ? 2 : 1;

  return (
    <div className="flex flex-col gap-5 pt-3 pb-12 max-w-[27rem] mx-auto w-full px-4 sm:gap-8 sm:px-0 sm:pt-4 sm:max-w-sm">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20" data-testid="home-loader">
          <SolarLoader label={t('home.aligningDay', 'Aligning your day...')} />
        </div>
      ) : (
        <>
          {!currentRecipe && !isSkipped && !sessionDone && !isCooked && (
            <TonightPivotCard
              gotoDescription={gotoRecipeData?.name ?? gotoDescription}
              gotoRecipeId={gotoRecipeId}
              gotoImageUrl={gotoRecipeData?.imageUrl ?? gotoImageUrl}
              gotoStatus={gotoRecipeStatus}
              onConfirmGoto={() => {
                if (gotoRecipeId) {
                  assignRecipe({
                    id: gotoRecipeId,
                    name: gotoRecipeData?.name ?? gotoDescription ?? null,
                    image: gotoRecipeData?.imageUrl ?? gotoImageUrl ?? '',
                  });
                } else {
                  setRecoveryFlow({ kind: 'quick_find', intent: null });
                }
              }}
              onDiscover={() => setRecoveryFlow({ kind: 'quick_find', intent: null })}
              onOrderIn={async () => {
                if (!currentRecipe) {
                  // B5: No recipe — write status:3 unconditionally via store
                  markOrderedIn();
                  useWeekStore.getState().applySlotUpdate({
                    date: getTodayString(),
                    recipe: null,
                    status: 3,
                  });
                } else {
                  // B6: Recipe exists — open recovery dialog first
                  setRecoveryFlow({ kind: 'step1' });
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
              onClick={() => setShowCooksMode(true)}
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
                prepTime={formatTotalTime(currentRecipe.totalTime) ?? undefined}
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

      <AnimatePresence>
        {showCooksMode && currentRecipe && currentRecipe.id && (
          <CooksMode
            recipe={{
              id: currentRecipe.id,
              name: currentRecipe.name || null,
              image: currentRecipe.image || '',
            }}
            onClose={() => {
              setShowCooksMode(false);
            }}
            onCooked={handleCookedMark}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRecovery && (
          <SkipRecoveryDialog
            isOpen={showRecovery}
            step={recoveryStep}
            onClose={() => setRecoveryFlow({ kind: 'closed' })}
            onBack={() => setRecoveryFlow({ kind: 'step1' })}
            onAction={handleRecoveryAction}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showQuickFind && (
          <QuickFindModal
            onClose={() => setRecoveryFlow({ kind: 'closed' })}
            onSelect={handleQuickFindSelect}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
