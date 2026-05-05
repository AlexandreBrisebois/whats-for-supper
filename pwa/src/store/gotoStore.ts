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
  /** The recipeId that has been marked ready via SSE, or null if none. */
  readyRecipeId: string | null;

  /**
   * Called by `useScheduleStream` when a `recipe_ready` event arrives.
   * Sets `readyRecipeId` so any subscriber can react without polling.
   */
  markReady: (recipeId: string) => void;

  /** Reset the ready state (e.g. after the user acts on it). */
  reset: () => void;
}

export const useGotoStore = create<GotoState>((set) => ({
  readyRecipeId: null,

  markReady(recipeId: string) {
    set({ readyRecipeId: recipeId });
  },

  reset() {
    set({ readyRecipeId: null });
  },
}));
