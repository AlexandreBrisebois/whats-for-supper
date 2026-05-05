import { create } from 'zustand';

interface PendingRecipe {
  recipeId: string;
  name?: string;
  submittedAt: number;
}

interface CaptureState {
  pendingRecipes: PendingRecipe[];

  /**
   * Called after a successful recipe submit, before navigation.
   * Adds the recipe to the pending queue so SSE handlers can match
   * incoming `recipe_ready` / `recipe_failed` events to this session.
   */
  addPending: (entry: { recipeId: string; name?: string }) => void;

  /**
   * Called when a `recipe_ready` or `recipe_failed` SSE event arrives
   * for this recipe. Removes it from the pending queue.
   */
  removePending: (recipeId: string) => void;

  /**
   * Returns the pending entry for the given recipeId, or undefined if
   * the recipe is not in the pending queue.
   */
  getPending: (recipeId: string) => PendingRecipe | undefined;
}

export const useCaptureStore = create<CaptureState>((set, get) => ({
  pendingRecipes: [],

  addPending({ recipeId, name }) {
    set((s) => ({
      pendingRecipes: [...s.pendingRecipes, { recipeId, name, submittedAt: Date.now() }],
    }));
  },

  removePending(recipeId) {
    set((s) => ({
      pendingRecipes: s.pendingRecipes.filter((r) => r.recipeId !== recipeId),
    }));
  },

  getPending(recipeId) {
    return get().pendingRecipes.find((r) => r.recipeId === recipeId);
  },
}));
