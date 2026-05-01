import { create } from 'zustand';

interface PlannerState {
  currentWeekOffset: number;
  activeTab: 'planner' | 'grocery';
  isVotingOpen: boolean;
  isLocked: boolean;
  cookProgress: Record<string, number>;
  groceryState: Record<string, boolean>;
  setWeekOffset: (offset: number) => void;
  setActiveTab: (tab: 'planner' | 'grocery') => void;
  setVotingOpen: (open: boolean) => void;
  setIsLocked: (locked: boolean) => void;
  setCookProgress: (recipeId: string, stepIndex: number) => void;
  resetCookProgress: (recipeId: string) => void;
  setGroceryItemToggle: (ingredientName: string, isToggled: boolean) => void;
  setGroceryState: (state: Record<string, boolean>) => void;
}

export const usePlannerStore = create<PlannerState>((set) => ({
  currentWeekOffset: 0,
  activeTab: 'planner',
  isVotingOpen: false,
  isLocked: false,
  cookProgress: {},
  groceryState: {},
  setWeekOffset: (offset) =>
    set({ currentWeekOffset: offset, isVotingOpen: false, isLocked: false }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setVotingOpen: (open) => set({ isVotingOpen: open }),
  setIsLocked: (locked) => set({ isLocked: locked }),
  setCookProgress: (recipeId, stepIndex) =>
    set((state) => {
      if (state.cookProgress[recipeId] === stepIndex) return state;
      return { cookProgress: { ...state.cookProgress, [recipeId]: stepIndex } };
    }),
  resetCookProgress: (recipeId) =>
    set((state) => {
      const { [recipeId]: _, ...rest } = state.cookProgress;
      return { cookProgress: rest };
    }),
  setGroceryItemToggle: (ingredientName, isToggled) =>
    set((state) => ({
      groceryState: {
        ...state.groceryState,
        [ingredientName]: isToggled,
      },
    })),
  setGroceryState: (state) => set({ groceryState: state }),
}));
