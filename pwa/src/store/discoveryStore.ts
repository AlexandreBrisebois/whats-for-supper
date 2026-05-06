import { create } from 'zustand';
import type { DiscoveryRecipe } from '@/lib/api/discovery';

interface DiscoveryState {
  hasPendingCards: boolean;
  setHasPendingCards: (hasCards: boolean) => void;
  /**
   * Incremented each time a fill-the-gap invalidation SSE event is received.
   * QuickFindModal watches this value and silently refetches its recipe list
   * when it changes, ensuring already-planned recipes are removed from the list.
   * BS-7: was missing from the original stub.
   */
  fillTheGapVersion: number;
  invalidateFillTheGap: (weekOffset: number) => void;

  // ── Live stack management (Task 29) ──────────────────────────────────────
  /**
   * The current discovery stack. Lifted from Discovery page's local useState
   * so SSE events can update it without the page needing to be mounted.
   * `hasPendingCards` is derived from `discoveryStack.length > 0`.
   */
  discoveryStack: DiscoveryRecipe[];

  /** Replaces the full stack. Called by the Discovery page after each fetch. */
  setStack: (recipes: DiscoveryRecipe[]) => void;

  /**
   * Updates `hasFamilyInterest` on the matching recipe and re-ranks it
   * toward the front of the stack when interest flips to true.
   *
   * Re-rank rule:
   * - Only applies to positions 1–3 (position 0 is the top card and is LOCKED).
   * - Move up by at most 2 positions, never to position 0.
   * - Cards at position 4+ are updated in-place but NOT re-ranked.
   */
  applyVoteUpdate: (update: { recipeId: string; voteCount: number }) => void;

  /** Removes a recipe from the stack by ID. Called after fill-the-gap refetch diff. */
  removeFromStack: (recipeId: string) => void;

  /**
   * The current active category filter. Set by the Discovery page or by
   * a discovery_nudge SSE event. When null, the first available category is used.
   */
  activeCategory: string | null;
  setActiveCategory: (category: string | null) => void;
}

/**
 * Lightweight store to track discovery queue state and fill-the-gap invalidation.
 * Used by the Navigation component (hasPendingCards pulse signal),
 * QuickFindModal (fillTheGapVersion refetch trigger), and the Discovery page
 * (discoveryStack live updates via SSE).
 */
export const useDiscoveryStore = create<DiscoveryState>((set, get) => ({
  hasPendingCards: false,
  setHasPendingCards: (hasCards) => set({ hasPendingCards: hasCards }),
  fillTheGapVersion: 0,
  // weekOffset is accepted for future use (e.g. per-week invalidation),
  // but currently the version counter is global — QuickFindModal refetches
  // regardless of which week was affected.
  invalidateFillTheGap: (_weekOffset: number) =>
    set((s) => ({ fillTheGapVersion: s.fillTheGapVersion + 1 })),

  discoveryStack: [],

  setStack(recipes) {
    set({ discoveryStack: recipes });
  },

  applyVoteUpdate({ recipeId }) {
    const stack = get().discoveryStack;
    const idx = stack.findIndex((r) => r.id === recipeId);
    if (idx === -1) return; // recipe not in stack — no-op

    const recipe = stack[idx];
    const wasInterested = recipe.hasFamilyInterest ?? false;
    const updated = { ...recipe, hasFamilyInterest: true };

    // If interest didn't flip, just update in-place
    if (wasInterested) {
      const next = stack.map((r) => (r.id === recipeId ? updated : r));
      set({ discoveryStack: next });
      return;
    }

    // Interest flipped to true — apply re-rank rule
    // Position 0 is locked (top card). Positions 1–3 can move up by at most 2.
    // Positions 4+ are updated in-place only.
    if (idx === 0 || idx >= 4) {
      // Top card locked, or outside visible stack — update in-place only
      const next = stack.map((r) => (r.id === recipeId ? updated : r));
      set({ discoveryStack: next });
      return;
    }

    // idx is 1, 2, or 3 — move up by at most 2, never to position 0
    const targetIdx = Math.max(1, idx - 2);
    const next = [...stack];
    next.splice(idx, 1);
    next.splice(targetIdx, 0, updated);
    set({ discoveryStack: next });
  },

  removeFromStack(recipeId) {
    set((s) => ({
      discoveryStack: s.discoveryStack.filter((r) => r.id !== recipeId),
    }));
  },

  activeCategory: null,
  setActiveCategory: (category) => set({ activeCategory: category }),
}));
