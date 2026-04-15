'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OnboardingState {
  /** True once the user has selected a family member and landed on /home. */
  hasCompletedOnboarding: boolean;
  /** Controls visibility of the AddFamilyMemberForm inside FamilySelector. */
  showAddForm: boolean;

  completeOnboarding: () => void;
  resetOnboarding: () => void;
  toggleAddForm: () => void;
  setShowAddForm: (show: boolean) => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      showAddForm: false,

      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      resetOnboarding: () => set({ hasCompletedOnboarding: false, showAddForm: false }),
      toggleAddForm: () => set((state) => ({ showAddForm: !state.showAddForm })),
      setShowAddForm: (show) => set({ showAddForm: show }),
    }),
    {
      name: 'onboarding-storage',
      // Only persist the completion flag; form visibility resets each visit.
      partialize: (state) => ({ hasCompletedOnboarding: state.hasCompletedOnboarding }),
    }
  )
);
