'use client';

import React, { useState } from 'react';
import {
  TonightMenuCard,
  SmartPivotCard,
  NextPrepStepCard,
  QuickCaptureTrigger,
} from './HomeSections';
import { CooksMode } from '../planner/CooksMode';
import { AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/api-client';
import { DateOnly } from '@microsoft/kiota-abstractions';

interface HomeCommandCenterProps {
  todaysRecipe: any;
  nextTask: any;
  isPrepActive: boolean;
}

export function HomeCommandCenter({
  todaysRecipe,
  nextTask,
  isPrepActive,
}: HomeCommandCenterProps) {
  const [showCooksMode, setShowCooksMode] = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);
  const router = useRouter();

  const handleCookMode = () => {
    setShowCooksMode(true);
  };

  const handleSkip = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const todayDate = DateOnly.parse(todayStr);
      if (!todayDate) return;

      await apiClient.api.schedule.day.byDate(todayDate).validate.post({
        status: 3, // Skipped
      });
      setIsSkipped(true);
      router.refresh();
    } catch (error) {
      console.error('Failed to skip meal:', error);
    }
  };

  return (
    <div className="flex flex-col gap-8 pt-4 pb-12 max-w-md mx-auto w-full">
      {(!todaysRecipe || isSkipped) && <SmartPivotCard />}

      {isPrepActive && !isSkipped && <NextPrepStepCard task={nextTask} />}

      {todaysRecipe && !isSkipped && (
        <TonightMenuCard
          recipeId={todaysRecipe.id!}
          recipeName={todaysRecipe.name!}
          description={todaysRecipe.description || 'A delicious meal planned for tonight.'}
          imageUrl={todaysRecipe.image || undefined}
          ingredients={todaysRecipe.ingredients || []}
          prepTime="30-45 mins"
          onCookMode={handleCookMode}
          onSkip={handleSkip}
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
    </div>
  );
}
