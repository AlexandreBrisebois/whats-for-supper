'use client';

import { useState } from 'react';
import { SmartPivotCard, QuickCaptureTrigger, CookedSuccessCard } from './HomeSections';
import { TonightMenuCard } from './TonightMenuCard';
import { SkipRecoveryDialog } from './SkipRecoveryDialog';
import { QuickFindModal } from '../planner/QuickFindModal';
import { CooksMode } from '../planner/CooksMode';
import { AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/api-client';
import { DateOnly } from '@microsoft/kiota-abstractions';
import { assignRecipeToDay } from '@/lib/api/planner';
import { getTodayString } from '@/lib/imageUtils';

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
  const router = useRouter();

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
    try {
      const dayIndex = (new Date().getDay() + 6) % 7;
      await assignRecipeToDay(0, dayIndex, recipe);
      setShowQuickFind(false);
      setIsSkipped(false); // Reset skipped state because we picked a new meal
      router.refresh();
    } catch (error) {
      console.error('Failed to assign quick find recipe:', error);
    }
  };

  return (
    <div className="flex flex-col gap-8 pt-4 pb-12 max-w-md mx-auto w-full px-6 sm:px-0">
      {(!todaysRecipe || isSkipped || sessionDone) && !isCooked && (
        <SmartPivotCard
          onSelect={(choice) => {
            if (choice === 'quick-find') setShowQuickFind(true);
          }}
        />
      )}

      {isCooked && <CookedSuccessCard onDismiss={() => setIsCooked(false)} />}

      {todaysRecipe && !isSkipped && !isCooked && !sessionDone && (
        <TonightMenuCard
          recipeId={todaysRecipe.id!}
          recipeName={todaysRecipe.name!}
          description={todaysRecipe.description || 'A delicious meal planned for tonight.'}
          imageUrl={todaysRecipe.image || undefined}
          ingredients={todaysRecipe.ingredients || []}
          prepTime="30-45 mins"
          onCookMode={handleCookMode}
          onSkip={handleSkipTrigger}
          onCooked={handleCookedMark}
        />
      )}

      <QuickCaptureTrigger />

      <AnimatePresence>
        {showCooksMode && todaysRecipe && (
          <CooksMode
            recipe={{
              id: todaysRecipe.id,
              name: todaysRecipe.name,
              image: todaysRecipe.image,
            }}
            onClose={() => setShowCooksMode(false)}
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
