'use client';

import { useState, useEffect } from 'react';
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
import { assignRecipeToDay, isScheduleRecipe } from '@/lib/api/planner';
import { ScheduleRecipeDto } from '@/lib/api/generated/models';
import { getTodayString } from '@/lib/imageUtils';
import { SolarLoader } from '../ui/SolarLoader';
import { useFamilyStore } from '@/store/familyStore';
import { useTodayStore } from '@/store/todayStore';
import { t } from '@/locales';
import { ROUTES } from '@/lib/constants/routes';

interface HomeCommandCenterProps {
  todaysRecipe: any;
  todayStatus?: 0 | 2 | 3;
}

export function HomeCommandCenter({ todaysRecipe, todayStatus }: HomeCommandCenterProps) {
  // ── UI-only state (not domain state) ──────────────────────────────────────
  const [showCooksMode, setShowCooksMode] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [showQuickFind, setShowQuickFind] = useState(false);
  const [cookedDismissed, setCookedDismissed] = useState(false);
  const [votingNudge, setVotingNudge] = useState<{ plannedCount: number } | null>(null);
  const [votingNudgeDismissed, setVotingNudgeDismissed] = useState(false);

  // ── Domain state from todayStore ──────────────────────────────────────────
  const { currentRecipe, status, isLoading, init, assignRecipe, markCooked, markOrderedIn, sync } =
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

  // ── GOTO recipe status polling ────────────────────────────────────────────
  const [gotoRecipeStatus, setGotoRecipeStatus] = useState<'pending' | 'ready' | null>(null);
  const [gotoRecipeData, setGotoRecipeData] = useState<any>(null);

  // Track previous GOTO ID to reset status during render pass (avoids cascading effect)
  const [prevGotoId, setPrevGotoId] = useState<string | null>(gotoRecipeId);

  if (gotoRecipeId !== prevGotoId) {
    setPrevGotoId(gotoRecipeId);
    setGotoRecipeStatus(null);
  }

  useEffect(() => {
    if (!gotoRecipeId) return;

    let isMounted = true;
    let pollInterval: NodeJS.Timeout | null = null;

    const fetchStatus = async () => {
      try {
        const response = await apiClient.api.recipes.byId(gotoRecipeId).status.get();
        if (!isMounted) return;

        const recipeStatus = response?.data?.status as 'pending' | 'ready';
        setGotoRecipeStatus(recipeStatus);

        if (recipeStatus === 'ready') {
          if (pollInterval) clearInterval(pollInterval);

          const recipeRes = await apiClient.api.recipes.byId(gotoRecipeId).get();
          if (isMounted && recipeRes?.recipe) {
            setGotoRecipeData(recipeRes.recipe);
          }
        }
      } catch (err) {
        console.error('Failed to fetch GOTO recipe status:', err);
      }
    };

    fetchStatus();
    pollInterval = setInterval(fetchStatus, 5000);

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [gotoRecipeId]);

  // ── Mount: seed store from SSR props, load settings, background sync ──────
  useEffect(() => {
    // Resolve the SSR recipe to a plain ScheduleRecipeDto (or null)
    const ssrRecipe: ScheduleRecipeDto | null = isScheduleRecipe(todaysRecipe)
      ? 'data' in todaysRecipe
        ? (todaysRecipe.data as ScheduleRecipeDto)
        : (todaysRecipe as ScheduleRecipeDto)
      : null;

    init(ssrRecipe, todayStatus ?? 0);
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
    setShowRecovery(true);
  };

  const handleCookedMark = () => {
    markCooked();
  };

  const handleRecoveryAction = async (action: string) => {
    try {
      const todayStr = getTodayString();
      const todayDate = DateOnly.parse(todayStr);
      if (!todayDate) return;

      if (action === 'order_in') {
        markOrderedIn();
        setShowRecovery(false);
      } else if (action === 'pick_else') {
        setShowRecovery(false);
        setShowQuickFind(true);
      } else if (action === 'tomorrow') {
        // Global Domino Shift (Push tonight to tomorrow)
        await apiClient.api.schedule.move.post({
          weekOffset: 0,
          fromIndex: (new Date().getDay() + 6) % 7,
          toIndex: ((new Date().getDay() + 6) % 7) + 1,
          intent: 'push',
        });
        setShowRecovery(false);
        // Sync store to reflect the move
        sync();
      } else if (action === 'next_week') {
        await apiClient.api.schedule.move.post({
          weekOffset: 0,
          fromIndex: (new Date().getDay() + 6) % 7,
          toIndex: 0,
          targetWeekOffset: 1,
          intent: 'push',
        });
        setShowRecovery(false);
        sync();
      } else if (action === 'drop') {
        await apiClient.api.schedule.day.byDate(todayDate).remove.delete();
        setShowRecovery(false);
        sync();
      }
    } catch (error) {
      console.error('Failed recovery action:', error);
    }
  };

  const handleQuickFindSelect = async (recipe: any) => {
    setShowQuickFind(false);
    assignRecipe({ id: recipe.id, name: recipe.name ?? null, image: recipe.image ?? '' });
  };

  return (
    <div className="flex flex-col gap-8 pt-4 pb-12 max-w-md mx-auto w-full px-6 sm:px-0">
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
                  setShowQuickFind(true);
                }
              }}
              onDiscover={() => setShowQuickFind(true)}
              onOrderIn={async () => {
                if (!currentRecipe) {
                  // B5: No recipe — write status:3 unconditionally via store
                  markOrderedIn();
                } else {
                  // B6: Recipe exists — open recovery dialog first
                  setShowRecovery(true);
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
                prepTime="30-45 mins"
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
        {showCooksMode && currentRecipe && (
          <CooksMode
            recipe={{
              id: currentRecipe.id!,
              name: currentRecipe.name || null,
              image: currentRecipe.image!,
            }}
            onClose={() => setShowCooksMode(false)}
            onCooked={handleCookedMark}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRecovery && (
          <SkipRecoveryDialog
            isOpen={showRecovery}
            onClose={() => setShowRecovery(false)}
            onAction={handleRecoveryAction}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showQuickFind && (
          <QuickFindModal
            onClose={() => setShowQuickFind(false)}
            onSelect={handleQuickFindSelect}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
