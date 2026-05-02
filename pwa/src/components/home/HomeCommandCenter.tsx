'use client';

import { useState, useEffect } from 'react';
import { QuickCaptureTrigger, CookedSuccessCard } from './HomeSections';
import { TonightMenuCard } from './TonightMenuCard';
import { TonightPivotCard } from './TonightPivotCard';
import { SkipRecoveryDialog } from './SkipRecoveryDialog';
import { QuickFindModal } from '../planner/QuickFindModal';
import { CooksMode } from '../planner/CooksMode';
import { AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/api-client';
import { DateOnly } from '@microsoft/kiota-abstractions';
import { assignRecipeToDay, getSchedule } from '@/lib/api/planner';
import { ScheduleRecipeDto } from '@/lib/api/generated/models';
import { getTodayString } from '@/lib/imageUtils';
import { SolarLoader } from '../ui/SolarLoader';
import { useFamilyStore } from '@/store/familyStore';
import { t } from '@/locales';

interface HomeCommandCenterProps {
  todaysRecipe: any;
}

export function HomeCommandCenter({ todaysRecipe }: HomeCommandCenterProps) {
  const [showCooksMode, setShowCooksMode] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [showQuickFind, setShowQuickFind] = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);
  const [isCooked, setIsCooked] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [currentRecipe, setCurrentRecipe] = useState(todaysRecipe);
  const [isLoading, setIsLoading] = useState(!todaysRecipe); // Show loader only when SSR had nothing
  const router = useRouter();
  const { loadSetting, saveSetting, familySettings } = useFamilyStore();

  // Extract GOTO fields from the stored setting value
  const gotoValue = familySettings['family_goto'] as
    | { description?: string; recipeId?: string; status?: string }
    | null
    | undefined;

  // Phase D4: pass status through to TonightPivotCard which gates the Confirm GOTO button.
  // Backward compat: existing values without a status field are treated as 'ready'.
  // We always pass recipeId/description so the pending state ("being prepared") is visible.
  const gotoStatus = gotoValue?.status ?? null;
  const gotoDescription = gotoValue?.description ?? null;
  const gotoRecipeId = gotoValue?.recipeId ?? null;

  useEffect(() => {
    let mounted = true;

    // Load family GOTO setting (runs regardless of recipe state)
    loadSetting('family_goto');

    // Always fetch on mount to reconcile stale SSR data.
    // SSR prop is an optimistic initial value only — the client fetch is the source of truth.
    // This fixes "Preparing recipe…" showing after a planner move.
    if (!sessionDone && !isCooked) {
      const syncRecipe = async () => {
        // Only show spinner when SSR had nothing — otherwise reconcile silently
        if (!todaysRecipe) setIsLoading(true);
        try {
          const schedule = await getSchedule(0);
          if (!mounted) return;

          const todayStr = getTodayString();
          const todaysEntry = schedule?.days?.find((d) => d.date === todayStr);

          // Only update if it's not already cooked or skipped
          if (todaysEntry?.status === 2) {
            setIsCooked(true);
            setSessionDone(true);
          } else if (todaysEntry?.status === 3) {
            setIsSkipped(true);
            setSessionDone(true);
          } else if (todaysEntry?.recipe) {
            console.log('SYNC: setting recipe from API', todaysEntry.recipe.name);
            setCurrentRecipe(todaysEntry.recipe);
          } else {
            console.log('SYNC: setting recipe to NULL');
            setCurrentRecipe(null);
          }
        } catch (error) {
          console.error("Failed to sync today's recipe:", error);
        } finally {
          if (mounted) {
            console.log('SYNC: done, setIsLoading(false)');
            setIsLoading(false);
          }
        }
      };
      syncRecipe();
    } else {
      // Defer state update to avoid cascading render error
      const timer = setTimeout(() => {
        if (mounted) setIsLoading(false);
      }, 0);
      return () => {
        mounted = false;
        clearTimeout(timer);
      };
    }

    return () => {
      mounted = false;
    };
  }, [todaysRecipe, sessionDone, isCooked, loadSetting]);

  const handleCookMode = () => {
    setShowCooksMode(true);
  };

  const handleSkipTrigger = () => {
    setShowRecovery(true);
  };

  const handleCookedMark = async () => {
    if (isCooked) return;
    try {
      const todayDate = DateOnly.parse(getTodayString());
      if (!todayDate) return;
      await apiClient.api.schedule.day.byDate(todayDate).validate.post({ status: 2 });
      setIsCooked(true);
      setSessionDone(true);
      router.refresh();
    } catch (error) {
      console.error('Failed to mark recipe as cooked:', error);
    }
  };

  const handleRecoveryAction = async (action: string) => {
    try {
      const todayStr = getTodayString();
      const todayDate = DateOnly.parse(todayStr);
      if (!todayDate) return;

      if (action === 'order_in') {
        await apiClient.api.schedule.day.byDate(todayDate).validate.post({
          status: 3, // Skipped
        });
        setIsSkipped(true);
        setSessionDone(true);
      } else if (action === 'pick_else') {
        setShowRecovery(false);
        setShowQuickFind(true);
      } else if (action === 'tomorrow') {
        // Global Domino Shift (Push tonight to tomorrow)
        await apiClient.api.schedule.move.post({
          weekOffset: 0,
          fromIndex: (new Date().getDay() + 6) % 7, // Convert 0-6 (Sun-Sat) to 0-6 (Mon-Sun)
          toIndex: ((new Date().getDay() + 6) % 7) + 1,
          intent: 'push',
        });
        setShowRecovery(false);
        setIsSkipped(true);
        router.refresh();
      } else if (action === 'next_week') {
        await apiClient.api.schedule.move.post({
          weekOffset: 0,
          fromIndex: (new Date().getDay() + 6) % 7,
          toIndex: 0, // First slot of next week
          targetWeekOffset: 1,
          intent: 'push',
        });
        setShowRecovery(false);
        setIsSkipped(true);
        router.refresh();
      } else if (action === 'drop') {
        await apiClient.api.schedule.day.byDate(todayDate).remove.delete();
        setShowRecovery(false);
        setIsSkipped(true);
        router.refresh();
      }
    } catch (error) {
      console.error('Failed recovery action:', error);
    }
  };

  const handleQuickFindSelect = async (recipe: any) => {
    setCurrentRecipe(recipe as ScheduleRecipeDto);
    console.log('OPTIMISTIC: handleQuickFindSelect start', recipe.name);
    setIsSkipped(false);
    setShowQuickFind(false);
    try {
      const dayIndex = (new Date().getDay() + 6) % 7;
      await assignRecipeToDay(0, dayIndex, recipe);
      router.refresh();
    } catch (error) {
      console.error('Failed to assign quick find recipe:', error);
    }
  };

  return (
    <div className="flex flex-col gap-8 pt-4 pb-12 max-w-md mx-auto w-full px-6 sm:px-0">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <SolarLoader label={t('home.aligningDay', 'Aligning your day...')} />
        </div>
      ) : (
        <>
          {(!currentRecipe || isSkipped || sessionDone) && !isCooked && (
            <TonightPivotCard
              gotoDescription={gotoDescription}
              gotoRecipeId={gotoRecipeId}
              gotoStatus={gotoStatus}
              onConfirmGoto={() => {
                if (gotoRecipeId) {
                  setCurrentRecipe({
                    id: gotoRecipeId,
                    name: gotoDescription ?? '',
                    image: '',
                  } as ScheduleRecipeDto);
                  const dayIndex = (new Date().getDay() + 6) % 7;
                  assignRecipeToDay(0, dayIndex, {
                    id: gotoRecipeId,
                    name: gotoDescription ?? '',
                    image: '',
                  })
                    .then(() => router.refresh())
                    .catch((err) => console.error('Failed to confirm GOTO:', err));
                } else {
                  setShowQuickFind(true);
                }
              }}
              onDiscover={() => setShowQuickFind(true)}
              onOrderIn={() => handleRecoveryAction('order_in')}
            />
          )}

          {isCooked && <CookedSuccessCard onDismiss={() => setIsCooked(false)} />}

          {currentRecipe && !isSkipped && !isCooked && !sessionDone && (
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

      <QuickCaptureTrigger />

      <AnimatePresence>
        {showCooksMode && currentRecipe && (
          <CooksMode
            recipe={{
              id: currentRecipe.id,
              name: currentRecipe.name,
              image: currentRecipe.image,
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
