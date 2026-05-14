import { create } from 'zustand';

/**
 * Minimal store for GOTO recipe synthesis status.
 * Receives `recipe_ready` SSE events via `useScheduleStream`.
 * `HomeCommandCenter` subscribes to `readyRecipeId` to transition from
 * polling-pending to ready state without a poll.
 *
 * This is a Phase 1 stub — Task 21 will wire it into HomeCommandCenter
 * to replace the 5-second polling interval.
 */
interface GotoState {
  /** Set of recipeIds that have been marked ready via SSE. */
  readyRecipeIds: Set<string>;

  /**
   * Called by `useScheduleStream` when a `recipe_ready` event arrives.
   * Adds `recipeId` to the set so any subscriber can react without polling.
   */
  markReady: (recipeId: string) => void;

  /** Check if a recipe is marked as ready in this session. */
  isReady: (recipeId: string) => boolean;

  /** Reset the ready state (e.g. after the user acts on it). */
  reset: () => void;
}

export const useGotoStore = create<GotoState>((set, get) => ({
  readyRecipeIds: new Set<string>(),

  markReady(recipeId: string) {
    set((state) => {
      const next = new Set(state.readyRecipeIds);
      next.add(recipeId);
      return { readyRecipeIds: next };
    });
  },

  isReady(recipeId: string) {
    return get().readyRecipeIds.has(recipeId);
  },

  reset() {
    set({ readyRecipeIds: new Set() });
  },
}));

// Expose for E2E test access — allows tests to trigger markReady after confirming pending state.
if (typeof window !== 'undefined') {
  (window as any).__gotoStore = useGotoStore;
}
