import { create } from 'zustand';
import type { ScheduleDays } from '@/lib/api/generated/models';

interface PlannerState {
  currentWeekOffset: number;
  activeTab: 'planner' | 'grocery';
  isVotingOpen: boolean;
  isLocked: boolean;
  isDragActive: boolean;
  deferredWeekSnapshot: ScheduleDays | null;
  sseConnectionId: string | null;
  /**
   * Monotonic counter incremented on every move API call.
   * Sent as X-Move-Seq request metadata. Incoming sequences may belong to
   * another connection and cannot acknowledge local requests.
   */
  localMoveSeq: number;
  pendingMoveSeqs: number[];
  /**
   * The contiguous move sequence settled by captured HTTP completion.
   * When localMoveSeq > confirmedMoveSeq there is at least
   * one unconfirmed move in flight and applySnapshot must not clobber the store.
   */
  confirmedMoveSeq: number;
  cookProgress: Record<string, number>;
  groceryState: Record<string, boolean>;
  setWeekOffset: (offset: number) => void;
  setActiveTab: (tab: 'planner' | 'grocery') => void;
  setVotingOpen: (open: boolean) => void;
  setIsLocked: (locked: boolean) => void;
  setIsDragActive: (active: boolean) => void;
  setDeferredWeekSnapshot: (snapshot: ScheduleDays | null) => void;
  setSseConnectionId: (id: string | null) => void;
  /** Increment localMoveSeq and return the new value to stamp on the request. */
  nextMoveSeq: () => number;
  /** Settle one captured request without releasing other in-flight moves. */
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
  isDragActive: false,
  deferredWeekSnapshot: null,
  sseConnectionId: null,
  localMoveSeq: 0,
  pendingMoveSeqs: [],
  confirmedMoveSeq: 0,
  cookProgress: {},
  groceryState: {},
  setWeekOffset: (offset) =>
    set({ currentWeekOffset: offset, isVotingOpen: false, isLocked: false }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setVotingOpen: (open) => set({ isVotingOpen: open }),
  setIsLocked: (locked) => set({ isLocked: locked }),
  setIsDragActive: (active) => set({ isDragActive: active }),
  setDeferredWeekSnapshot: (snapshot) => set({ deferredWeekSnapshot: snapshot }),
  setSseConnectionId: (id) => set({ sseConnectionId: id }),
  nextMoveSeq: () => {
    const state = get();
    const next = state.localMoveSeq + 1;
    set({ localMoveSeq: next, pendingMoveSeqs: [...state.pendingMoveSeqs, next] });
    return next;
  },
  confirmMoveSeq: (seq) =>
    set((state) => {
      const pending = state.pendingMoveSeqs.filter((value) => value !== seq);
      // HTTP responses may finish out of order. Do not unblock snapshots until
      // every earlier request has settled, even if a newer response arrived first.
      const confirmed = pending.length
        ? Math.min(...pending) - 1
        : state.pendingMoveSeqs.length
          ? state.localMoveSeq
          : seq;
      return {
        pendingMoveSeqs: pending,
        confirmedMoveSeq: Math.max(state.confirmedMoveSeq, confirmed),
      };
    }),
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
