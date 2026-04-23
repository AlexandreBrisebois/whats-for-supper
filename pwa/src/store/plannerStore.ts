import { create } from 'zustand';

interface PlannerState {
  currentWeekOffset: number;
  activeTab: 'planner' | 'grocery';
  setWeekOffset: (offset: number) => void;
  setActiveTab: (tab: 'planner' | 'grocery') => void;
}

export const usePlannerStore = create<PlannerState>((set) => ({
  currentWeekOffset: 0,
  activeTab: 'planner',
  setWeekOffset: (offset) => set({ currentWeekOffset: offset }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
