import { create } from 'zustand';
import { getCaptureActivity, type CaptureActivityItem } from '@/lib/api/captures';

interface PendingRecipe {
  recipeId: string;
  name?: string;
  submittedAt: number;
}

interface CaptureState {
  pendingRecipes: PendingRecipe[];
  activityItems: CaptureActivityItem[];
  activityLoaded: boolean;
  activityLoading: boolean;
  activityError: string | null;

  /**
   * Called after a successful recipe submit, before navigation.
   * Adds the recipe to the pending queue so optimistic Home activity
   * appears immediately until server hydration picks it up.
   */
  addPending: (entry: { recipeId: string; name?: string }) => void;

  /**
   * Called when a `recipe_ready` or `recipe_failed` SSE event arrives
   * for this recipe. Removes it from the optimistic pending queue.
   */
  removePending: (recipeId: string) => void;

  /**
   * Returns the pending entry for the given recipeId, or undefined if
   * the recipe is not in the pending queue.
   */
  getPending: (recipeId: string) => PendingRecipe | undefined;

  /**
   * Fetches the authoritative household capture activity feed from
   * `GET /api/captures/activity`.
   */
  hydrate: () => Promise<void>;

  /** Directly sets server activity items (used by tests and optimistic updates). */
  applyActivityItems: (items: CaptureActivityItem[]) => void;

  /** Removes a cleared item from the loaded activity list by item or workflow ID. */
  removeActivityItem: (id: string) => void;
}

let inflightHydrate: Promise<void> | null = null;

export const useCaptureStore = create<CaptureState>((set, get) => ({
  pendingRecipes: [],
  activityItems: [],
  activityLoaded: false,
  activityLoading: false,
  activityError: null,

  addPending({ recipeId, name }) {
    set((s) => ({
      pendingRecipes: s.pendingRecipes.some((r) => r.recipeId === recipeId)
        ? s.pendingRecipes
        : [...s.pendingRecipes, { recipeId, name, submittedAt: Date.now() }],
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

  applyActivityItems(items) {
    set({ activityItems: items, activityLoaded: true, activityError: null });
  },

  removeActivityItem(id) {
    set((s) => ({
      activityItems: s.activityItems.filter(
        (item) => item.id !== id && item.workflowInstanceId !== id
      ),
    }));
  },

  async hydrate() {
    if (inflightHydrate) return inflightHydrate;
    set({ activityLoading: true, activityError: null });
    inflightHydrate = (async () => {
      try {
        const items = await getCaptureActivity();
        set({ activityItems: items, activityLoaded: true, activityLoading: false });
      } catch (err) {
        set({
          activityLoading: false,
          activityError: err instanceof Error ? err.message : 'Failed to load capture activity',
        });
      } finally {
        inflightHydrate = null;
      }
    })();
    return inflightHydrate;
  },
}));
