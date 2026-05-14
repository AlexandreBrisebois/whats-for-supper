'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Check } from 'lucide-react';
import {
  QuickCaptureTrigger,
  CookedSuccessCard,
  VotingNudgeCard,
  BrowseLibraryTrigger,
} from './HomeSections';
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
  return (new Date(`${dateString}T00:00:00`).getDay() + 6) % 7;
}

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
  const { loadActiveGoTo } = useFamilyStore();
  const [activeGoto, setActiveGoto] = useState<GoToItem | null>(null);
  const [hasCheckedActive, setHasCheckedActive] = useState(false);

  const { isReady } = useGotoStore();

  const gotoDescription = activeGoto?.description ?? null;
  const gotoRecipeId = activeGoto?.recipeId ?? null;
  const gotoImageUrl = activeGoto?.imageUrl ?? null;
  const gotoStatus = hasCheckedActive ? (activeGoto?.status ?? null) : null;

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
    if (activeGoto?.recipeId && activeGoto.status === 'pending' && isReady(activeGoto.recipeId)) {
      loadActiveGoTo().then(setActiveGoto);
    }
  }, [activeGoto, isReady, loadActiveGoTo]);

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

        const finalizeOrderedIn = async () => {
          useTodayStore.getState().applyServerUpdate({ recipe: null, status: 3 });
          useWeekStore.getState().applySlotUpdate({
            date: todayStr,
            recipe: null,
            status: 3,
          });
          await apiClient.api.schedule.day.byDate(todayDate).validate.post({ status: 3 });
        };

        if (action === 'order_in') {
          if (!currentRecipe) {
            markOrderedIn();
            useWeekStore.getState().applySlotUpdate({
              date: todayStr,
              recipe: null,
              status: 3,
            });
            return;
          }

          setRecoveryFlow({ kind: 'step2', intent: 'order_in', pendingRecipe: currentRecipe });
        } else if (action === 'pick_else') {
          setRecoveryFlow({ kind: 'quick_find', intent: 'pick_else' });
        } else if (action === 'tomorrow') {
          const recipeToReassign =
            recoveryFlow.kind === 'step2' ? recoveryFlow.pendingRecipe : null;
          const recipeId = currentRecipe?.id;
          if (!recipeId) {
            setRecoveryFlow({ kind: 'closed' });
            return;
          }
          if (recoveryFlow.kind === 'step2' && recoveryFlow.intent === 'order_in') {
            await finalizeOrderedIn();
          }
          // Reschedule tonight's meal to tomorrow
          const fromIndex = getMondayBasedDayIndex(todayStr);
          const targetDayIndex = fromIndex + 1;
          await apiClient.api.schedule.move.post({
            weekOffset: 0,
            fromIndex,
            toIndex: targetDayIndex <= 6 ? targetDayIndex : 0,
            targetWeekOffset: targetDayIndex <= 6 ? 0 : 1,
            intent: 'push',
            recipeId,
          });

          if (recoveryFlow.kind === 'step2' && recoveryFlow.intent === 'pick_else') {
            assignRecipe(recoveryFlow.pendingRecipe);
          }

          setRecoveryFlow({ kind: 'closed' });
          await useWeekStore.getState().init(0);
          if (recoveryFlow.kind === 'step2' && recoveryFlow.intent === 'order_in') {
            useWeekStore.getState().applySlotUpdate({
              date: todayStr,
              recipe: null,
              status: 3,
            });
          }
          sync();
          router.push(ROUTES.PLANNER);
        } else if (action === 'next_week') {
          const recipeToReassign =
            recoveryFlow.kind === 'step2' ? recoveryFlow.pendingRecipe : null;
          const recipeId = currentRecipe?.id;
          if (!recipeId) {
            setRecoveryFlow({ kind: 'closed' });
            return;
          }
          if (recoveryFlow.kind === 'step2' && recoveryFlow.intent === 'order_in') {
            await finalizeOrderedIn();
          }
          const fromIndex = getMondayBasedDayIndex(todayStr);
          await apiClient.api.schedule.move.post({
            weekOffset: 0,
            fromIndex,
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
          if (recoveryFlow.kind === 'step2' && recoveryFlow.intent === 'order_in') {
            useWeekStore.getState().applySlotUpdate({
              date: todayStr,
              recipe: null,
              status: 3,
            });
          }
          sync();
          router.push(ROUTES.PLANNER);
        } else if (action === 'drop') {
          if (recoveryFlow.kind === 'step2' && recoveryFlow.intent === 'order_in') {
            await finalizeOrderedIn();
          } else {
            await apiClient.api.schedule.day.byDate(todayDate).remove.delete();
            // Reset today's slot so the user can re-plan after dropping
            useTodayStore.getState().applyServerUpdate({ recipe: null, status: 0 });
          }
          if (recoveryFlow.kind === 'step2' && recoveryFlow.intent === 'pick_else') {
            assignRecipe(recoveryFlow.pendingRecipe);
          }
          setRecoveryFlow({ kind: 'closed' });
          await useWeekStore.getState().init(0);
          if (recoveryFlow.kind === 'step2' && recoveryFlow.intent === 'order_in') {
            useWeekStore.getState().applySlotUpdate({
              date: todayStr,
              recipe: null,
              status: 3,
            });
          }
          sync();
          router.push(ROUTES.PLANNER);
        }
      } catch (error) {
        console.error('Failed recovery action:', error);
      }
    },
    [markOrderedIn, sync, recoveryFlow, assignRecipe, currentRecipe, router]
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
            dayIndex={(new Date().getDay() + 6) % 7}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
