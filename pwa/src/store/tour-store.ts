import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { CompletionInfo } from '@/types/domain';

interface TourState {
  activeTourId: string | null;
  currentStep: number;
  isComplete: boolean;
  completedTours: Record<string, CompletionInfo>;

  startTour: (tourId: string) => void;
  nextStep: () => void;
  completeTour: (tourId: string) => void;
  loadCompletedTours: (tours: Record<string, CompletionInfo>) => void;
  endTour: () => void;
  isTourComplete: (tourId: string) => boolean;
}

export const useTourStore = create<TourState>()(
  persist(
    (set, get) => ({
      activeTourId: null,
      currentStep: 0,
      isComplete: false,
      completedTours: {},

      startTour: (tourId) => set({ activeTourId: tourId, currentStep: 0, isComplete: false }),

      nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),

      completeTour: (tourId) =>
        set((state) => ({
          activeTourId: null,
          currentStep: 0,
          isComplete: true,
          completedTours: {
            ...state.completedTours,
            [tourId]: {
              completedAt: new Date().toISOString(),
              deviceId: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 32) : undefined,
            },
          },
        })),

      loadCompletedTours: (tours) => set({ completedTours: tours }),

      endTour: () => set({ activeTourId: null, currentStep: 0 }),

      isTourComplete: (tourId) => tourId in get().completedTours,
    }),
    {
      name: 'tour-store-v2',
      partialize: (state) => ({ completedTours: state.completedTours }),
    }
  )
);
