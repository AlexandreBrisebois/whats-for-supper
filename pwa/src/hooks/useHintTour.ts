'use client';

import { useMemo, useCallback } from 'react';

import { useTourStore } from '@/store/tourStore';
import { getHints, completeTour as completeTourApi, shouldAutoPlayTour } from '@/lib/hintService';
import { getLocale } from '@/locales';
import type { HintStep } from '@/types/domain';

interface UseHintTourReturn {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  nextStep: () => void;
  completeTour: () => void;
  getCurrentHint: () => HintStep | null;
  skipTour: () => void;
  start: () => void;
}

export function useHintTour(tourId: string): UseHintTourReturn {
  const {
    activeTourId,
    currentStep,
    completedTours,
    startTour,
    nextStep: storeNextStep,
    completeTour: storeCompleteTour,
    isTourComplete,
  } = useTourStore();

  const isActive = activeTourId === tourId;
  const locale = getLocale();
  const tourConfig = useMemo(() => getHints(tourId, locale), [tourId, locale]);
  const totalSteps = tourConfig.steps.length;

  const start = useCallback(() => {
    if (shouldAutoPlayTour(completedTours, tourId)) {
      startTour(tourId);
    }
  }, [completedTours, tourId, startTour]);

  const completeTour = useCallback(() => {
    storeCompleteTour(tourId);
    // Fire-and-forget API sync — identity may not be available yet during onboarding
    const memberId =
      typeof window !== 'undefined' ? localStorage.getItem('selectedMemberId') : null;
    if (memberId) {
      void completeTourApi(memberId, tourId);
    }
  }, [tourId, storeCompleteTour]);

  const nextStep = useCallback(() => {
    if (currentStep >= totalSteps - 1) {
      completeTour();
    } else {
      storeNextStep();
    }
  }, [currentStep, totalSteps, completeTour, storeNextStep]);

  const skipTour = useCallback(() => {
    completeTour();
  }, [completeTour]);

  const getCurrentHint = useCallback((): HintStep | null => {
    if (!isActive) return null;
    return tourConfig.steps[currentStep] ?? null;
  }, [isActive, tourConfig.steps, currentStep]);

  return {
    isActive,
    currentStep,
    totalSteps,
    nextStep,
    completeTour,
    getCurrentHint,
    skipTour,
    start,
  };
}
