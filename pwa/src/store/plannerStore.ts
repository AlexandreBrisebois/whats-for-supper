import { create } from 'zustand';

interface PlannerState {
  currentWeekOffset: number;
  activeTab: 'planner' | 'grocery';
  isVotingOpen: boolean;
  isLocked: boolean;
  sseConnectionId: string | null;
  /**
   * Monotonic counter incremented on every move API call.
   * Sent as X-Move-Seq request header so the server can echo it back in the
   * week_updated SSE payload, allowing applySnapshot to identify and skip its
   * own echoes without relying on a wall-clock window.
   */
  localMoveSeq: number;
  /**
   * The highest move sequence number confirmed by the server via an echoed
   * week_updated event. When localMoveSeq > confirmedMoveSeq there is at least
   * one unconfirmed move in flight and applySnapshot must not clobber the store.
   */
  confirmedMoveSeq: number;
  cookProgress: Record<string, number>;
  groceryState: Record<string, boolean>;
  setWeekOffset: (offset: number) => void;
  setActiveTab: (tab: 'planner' | 'grocery') => void;
  setVotingOpen: (open: boolean) => void;
  setIsLocked: (locked: boolean) => void;
  setSseConnectionId: (id: string | null) => void;
  /** Increment localMoveSeq and return the new value to stamp on the request. */
  nextMoveSeq: () => number;
  /** Mark the given seq as confirmed (called when the server echoes it back). */
  confirmMoveSeq: (seq: number) => void;
  setCookProgress: (recipeId: string, stepIndex: number) => void;
  resetCookProgress: (recipeId: string) => void;
  setGroceryItemToggle: (ingredientName: string, isToggled: boolean) => void;
  setGroceryState: (state: Record<string, boolean>) => void;
}

export const usePlannerStore = create<PlannerState>((set, get) => ({
  currentWeekOffset: 0,
  activeTab: 'planner',
  isVotingOpen: false,
  isLocked: false,
  sseConnectionId: null,
  localMoveSeq: 0,
  confirmedMoveSeq: 0,
  cookProgress: {},
  groceryState: {},
  setWeekOffset: (offset) =>
    set({ currentWeekOffset: offset, isVotingOpen: false, isLocked: false }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setVotingOpen: (open) => set({ isVotingOpen: open }),
  setIsLocked: (locked) => set({ isLocked: locked }),
  setSseConnectionId: (id) => set({ sseConnectionId: id }),
  nextMoveSeq: () => {
    const next = get().localMoveSeq + 1;
    set({ localMoveSeq: next });
    return next;
  },
  confirmMoveSeq: (seq) =>
    set((state) => ({ confirmedMoveSeq: Math.max(state.confirmedMoveSeq, seq) })),
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
