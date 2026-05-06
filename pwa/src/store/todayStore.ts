import { create } from 'zustand';
import { apiClient } from '@/lib/api/api-client';
import { DateOnly } from '@microsoft/kiota-abstractions';
import { assignRecipeToDay, getSchedule, isScheduleRecipe } from '@/lib/api/planner';
import { getTodayString } from '@/lib/imageUtils';
import type { ScheduleRecipeDto } from '@/lib/api/generated/models';

// ─── State shape ────────────────────────────────────────────────────────────

export interface TodayState {
  /** The recipe assigned to today's slot, or null if none. */
  currentRecipe: ScheduleRecipeDto | null;
  /**
   * Domain status for today's slot:
   *   0 = no action taken
   *   2 = cooked
   *   3 = ordered in / skipped
   */
  status: 0 | 2 | 3;
  /** True while an async operation is in flight. */
  isLoading: boolean;
  /** Timestamp (ms) of the last successful sync() call, or null if never synced. */
  lastSyncedAt: number | null;
  /**
   * Timestamp (ms) of the most recent optimistic write (assignRecipe).
   * sync() will not overwrite currentRecipe while this is within the 20-second window.
   */
  optimisticWriteAt: number | null;
  /**
   * When true, skip the CookedSuccessCard celebration and show the compact cooked
   * badge directly. Set by applyServerUpdate when status === 2 is pushed from
   * another family member's Cook's Mode completion.
   */
  skipCookedCelebration: boolean;

  // ─── Actions ──────────────────────────────────────────────────────────────

  /**
   * Seed the store from SSR props. Idempotent — safe to call on every mount.
   * Clears optimisticWriteAt so a fresh sync can reconcile freely.
   */
  init: (recipe: ScheduleRecipeDto | null, status: 0 | 2 | 3) => void;

  /**
   * Optimistically set currentRecipe and record the write timestamp, then fire
   * POST /api/schedule/assign in the background.
   * Does NOT call router.refresh().
   */
  assignRecipe: (recipe: { id: string; name: string | null; image: string }) => void;

  /**
   * Optimistically set status = 2 (cooked), then fire
   * POST /api/schedule/day/{date}/validate with { status: 2 } in the background.
   */
  markCooked: () => void;

  /**
   * Optimistically set status = 3 (ordered in / skipped), then fire
   * POST /api/schedule/day/{date}/validate with { status: 3 } in the background.
   */
  markOrderedIn: () => void;

  /**
   * Fetch GET /api/schedule?weekOffset=0, find today's entry, and reconcile:
   * - If an optimistic write is in-flight (< 20 s old), keep currentRecipe as-is.
   * - Otherwise, update currentRecipe and status from the server response.
   * Sets lastSyncedAt on success.
   */
  sync: () => Promise<void>;

  /**
   * Apply a server-pushed slot_updated event. Authoritative — always applies,
   * except when optimisticWriteAt is within 2 seconds (echo suppression).
   */
  applyServerUpdate: (update: { recipe: ScheduleRecipeDto | null; status: number }) => void;

  /**
   * Clear optimisticWriteAt unconditionally. Called on SSE reconnect so the
   * server snapshot is treated as authoritative regardless of write age.
   */
  clearOptimisticGuard: () => void;
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useTodayStore = create<TodayState>((set, get) => ({
  currentRecipe: null,
  status: 0,
  isLoading: false,
  lastSyncedAt: null,
  optimisticWriteAt: null,
  skipCookedCelebration: false,

  // ── init ──────────────────────────────────────────────────────────────────
  init(recipe, status) {
    const { optimisticWriteAt, currentRecipe: existingRecipe, status: existingStatus } = get();
    const optimisticIsRecent =
      optimisticWriteAt !== null && Date.now() - optimisticWriteAt < 20_000;

    if (optimisticIsRecent) {
      // Preserve optimistic state during client-side navigation if a write is recent.
      // We keep the existing recipe, status, and the write timestamp.
      set({
        currentRecipe: existingRecipe,
        status: existingStatus,
        optimisticWriteAt,
      });
    } else if (recipe === null && existingRecipe !== null) {
      // SSR returned null but the store already has a recipe (e.g. from an SSE
      // connected event that raced ahead of TodayStoreInitializer). Preserve it —
      // SSR null means "unknown", not "definitely empty".
      set({ status, optimisticWriteAt: null });
    } else {
      // Fresh mount or optimistic window expired: use provided server data.
      set({
        currentRecipe: recipe,
        status,
        optimisticWriteAt: null,
      });
    }
  },

  // ── assignRecipe ──────────────────────────────────────────────────────────
  assignRecipe(recipe) {
    // Optimistic update — visible immediately
    const optimistic: ScheduleRecipeDto = {
      id: recipe.id,
      name: recipe.name ?? '',
      image: recipe.image,
    };
    set({ currentRecipe: optimistic, optimisticWriteAt: Date.now() });

    // Background network write — no await, no router.refresh()
    const dayIndex = (new Date().getDay() + 6) % 7;
    assignRecipeToDay(0, dayIndex, recipe).catch((err) =>
      console.error('[todayStore] assignRecipe failed:', err)
    );
  },

  // ── markCooked ────────────────────────────────────────────────────────────
  markCooked() {
    set({ status: 2 });

    const todayDate = DateOnly.parse(getTodayString());
    if (!todayDate) return;

    apiClient.api.schedule.day
      .byDate(todayDate)
      .validate.post({ status: 2 })
      .catch((err) => console.error('[todayStore] markCooked failed:', err));
  },

  // ── markOrderedIn ─────────────────────────────────────────────────────────
  markOrderedIn() {
    set({ status: 3 });

    const todayDate = DateOnly.parse(getTodayString());
    if (!todayDate) return;

    apiClient.api.schedule.day
      .byDate(todayDate)
      .validate.post({ status: 3 })
      .catch((err) => console.error('[todayStore] markOrderedIn failed:', err));
  },

  // ── sync ──────────────────────────────────────────────────────────────────
  async sync() {
    set({ isLoading: true });
    try {
      const schedule = await getSchedule(0);
      const todayStr = getTodayString();
      const todaysEntry = schedule?.days?.find((d) => d.date === todayStr);

      const { optimisticWriteAt } = get();
      const optimisticIsRecent =
        optimisticWriteAt !== null && Date.now() - optimisticWriteAt < 20_000;

      if (todaysEntry?.status === 2) {
        set({ status: 2, lastSyncedAt: Date.now() });
      } else if (todaysEntry?.status === 3) {
        set({ status: 3, lastSyncedAt: Date.now() });
      } else if (!optimisticIsRecent) {
        // Only reconcile currentRecipe when no optimistic write is in-flight
        if (isScheduleRecipe(todaysEntry?.recipe)) {
          set({ currentRecipe: todaysEntry!.recipe, lastSyncedAt: Date.now() });
        } else {
          set({ currentRecipe: null, lastSyncedAt: Date.now() });
        }
      } else {
        // Optimistic write is recent — keep currentRecipe, still update lastSyncedAt
        set({ lastSyncedAt: Date.now() });
      }
    } catch (err) {
      console.error('[todayStore] sync failed:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  // ── applyServerUpdate ─────────────────────────────────────────────────────
  applyServerUpdate({ recipe, status }) {
    // Server push is authoritative — always apply, even if optimistic write is recent.
    // Exception: if optimisticWriteAt is within 2 seconds, the push may be echoing
    // our own write back to us — skip to avoid flicker.
    const { optimisticWriteAt } = get();
    const isEcho = optimisticWriteAt !== null && Date.now() - optimisticWriteAt < 2_000;
    if (isEcho) return;

    set({
      currentRecipe: recipe,
      status: status as 0 | 2 | 3,
      optimisticWriteAt: null, // clear optimistic guard — server is now authoritative
      // For status:2 pushed from another family member's Cook's Mode completion,
      // skip the CookedSuccessCard celebration — show compact badge directly.
      // The person who cooked sees the card optimistically before this echo arrives.
      skipCookedCelebration: status === 2,
    });
  },

  // ── clearOptimisticGuard ──────────────────────────────────────────────────
  clearOptimisticGuard() {
    // Called on SSE reconnect — server snapshot is authoritative regardless of age.
    set({ optimisticWriteAt: null });
  },
}));

// Expose for E2E test access — allows tests to inspect or seed store state directly.
if (typeof window !== 'undefined') {
  (window as any).__todayStore = useTodayStore;
}
