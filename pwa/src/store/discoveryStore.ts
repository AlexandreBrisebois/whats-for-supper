import { create } from 'zustand';
import { getVotingSession, type DiscoveryRecipe } from '@/lib/api/discovery';
import type { VotingSessionSnapshot } from '@/lib/api/generated/models';
import { useWeekStore } from './weekStore';
import { absoluteMonday } from '@/lib/deployment-calendar';

let sessionRead: Promise<void> | null = null;
let sessionGeneration = 0;
let sessionReadAgain = false;

interface DiscoveryState {
  session: VotingSessionSnapshot | null;
  sessionStatus: 'unknown' | 'loading' | 'ready' | 'unavailable';
  refreshSession: () => Promise<void>;
  applySession: (session: VotingSessionSnapshot, authoritative?: boolean) => void;
  hasPendingCards: boolean;
  setHasPendingCards: (hasCards: boolean) => void;
  /**
   * Incremented each time a fill-the-gap invalidation SSE event is received.
   * Discovery consumers watch this global value. Quick Find uses the per-week
   * version below so unrelated planner weeks do not trigger a refetch.
   * BS-7: was missing from the original stub.
   */
  fillTheGapVersion: number;
  allSuggestionsVersion: number;
  invalidateAllSuggestions: () => void;
  /** Per-week invalidation versions for week-scoped Quick Find refreshes. */
  fillTheGapVersions: Record<number, number>;
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
  session: null,
  sessionStatus: 'unknown',
  refreshSession() {
    if (sessionRead) {
      sessionReadAgain = true;
      sessionGeneration++;
      return sessionRead;
    }
    sessionRead = (async () => {
      do {
        sessionReadAgain = false;
        const generation = sessionGeneration;
        set({ sessionStatus: 'loading' });
        try {
          const session = await getVotingSession();
          if (generation === sessionGeneration) get().applySession(session, true);
        } catch {
          if (generation === sessionGeneration) set({ sessionStatus: 'unavailable' });
        }
      } while (sessionReadAgain);
    })().finally(() => {
      sessionRead = null;
    });
    return sessionRead;
  },
  applySession(session, authoritative = false) {
    if (
      !session?.incarnationId ||
      !Number.isSafeInteger(session.revision) ||
      !['unowned', 'collecting', 'converged'].includes(session.phase ?? '') ||
      (session.phase !== 'unowned' &&
        (!session.roundId ||
          !session.weekStartDate ||
          session.requiredSlots == null ||
          session.coveredSlots == null ||
          session.candidateCount == null ||
          !session.smartDefaults))
    )
      return;
    const current = get().session;
    if (!authoritative && (!current || current.incarnationId !== session.incarnationId)) {
      sessionGeneration++;
      // A different host is established by HTTP, never by an unsolicited frame.
      void get().refreshSession();
      return;
    }
    if (
      current?.incarnationId === session.incarnationId &&
      (session.revision ?? -1) <= (current.revision ?? -1)
    ) {
      if (authoritative) set({ sessionStatus: 'ready' });
      return;
    }
    sessionGeneration++;
    set({
      session,
      sessionStatus: 'ready',
      hasPendingCards: session.phase === 'converged' ? false : get().discoveryStack.length > 0,
    });
    const week = useWeekStore.getState();
    if (
      session.smartDefaults &&
      session.roundId === week.votingRoundId &&
      absoluteMonday(session.weekStartDate) === week.weekStartDate
    )
      week.applySmartDefaultsUpdate(session.smartDefaults);
  },
  hasPendingCards: false,
  setHasPendingCards: (hasCards) =>
    set({ hasPendingCards: get().session?.phase !== 'converged' && hasCards }),
  fillTheGapVersion: 0,
  allSuggestionsVersion: 0,
  invalidateAllSuggestions: () =>
    set((s) => ({
      allSuggestionsVersion: s.allSuggestionsVersion + 1,
      fillTheGapVersion: s.fillTheGapVersion + 1,
    })),
  fillTheGapVersions: {},
  invalidateFillTheGap: (weekOffset) =>
    set((s) => ({
      fillTheGapVersion: s.fillTheGapVersion + 1,
      fillTheGapVersions: {
        ...s.fillTheGapVersions,
        [weekOffset]: (s.fillTheGapVersions[weekOffset] ?? 0) + 1,
      },
    })),

  discoveryStack: [],

  setStack(recipes) {
    set({ discoveryStack: recipes.map((recipe, queueOrder) => ({ ...recipe, queueOrder })) });
  },

  applyVoteUpdate({ recipeId, voteCount }) {
    const stack = get().discoveryStack;
    const idx = stack.findIndex((r) => r.id === recipeId);
    if (idx === -1) return; // recipe not in stack — no-op

    const updated = stack.map((recipe) =>
      recipe.id === recipeId ? { ...recipe, voteCount, hasFamilyInterest: voteCount > 0 } : recipe
    );
    const [front, ...tail] = updated;
    if (!front) return;
    tail.sort(
      (left, right) =>
        right.voteCount - left.voteCount || (left.queueOrder ?? 0) - (right.queueOrder ?? 0)
    );
    set({ discoveryStack: [front, ...tail] });
  },

  removeFromStack(recipeId) {
    set((s) => ({
      discoveryStack: s.discoveryStack.filter((r) => r.id !== recipeId),
    }));
  },

  activeCategory: null,
  setActiveCategory: (category) => set({ activeCategory: category }),
}));
