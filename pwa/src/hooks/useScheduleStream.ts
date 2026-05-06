'use client';

import { useEffect } from 'react';
import { useTodayStore } from '@/store/todayStore';
import { useWeekStore } from '@/store/weekStore';
import { useDiscoveryStore } from '@/store/discoveryStore';
import { useGotoStore } from '@/store/gotoStore';
import { useCaptureStore } from '@/store/captureStore';
import { useLibraryStore } from '@/store/libraryStore';
import { usePlannerStore } from '@/store/plannerStore';
import { getTodayString } from '@/lib/imageUtils';

/**
 * Singleton SSE hook — mount once at the app layout level.
 *
 * Establishes a persistent EventSource connection to the .NET API's
 * `/api/stream` endpoint and dispatches incoming events to the appropriate
 * Zustand stores. The hook survives page navigation because it lives at the
 * layout level, not inside individual page components.
 *
 * Auth: EventSource cannot send custom headers. The `x-family-member-id` and
 * `h_access` cookies are sent automatically via `withCredentials: true` (BS-4).
 *
 * URL: if `NEXT_PUBLIC_API_BASE_URL` is set, the connection goes to
 * `${NEXT_PUBLIC_API_BASE_URL}/api/stream`. If it is unset (the normal case
 * when Traefik routes `/api/` directly), the hook connects to the relative
 * path `/api/stream` — no warning, no skip.
 *
 * Reconnect: EventSource reconnects automatically on disconnect — no manual
 * handling is needed in `onerror`.
 */
export function useScheduleStream() {
  useEffect(() => {
    console.log('[SSE] Hook effect mounting');
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

    // When NEXT_PUBLIC_API_BASE_URL is set, use it as the origin.
    // When it is unset (Traefik routes /api/ directly), fall back to the
    // relative path — EventSource accepts relative URLs in browser contexts.
    const url = baseUrl ? `${baseUrl}/api/stream` : '/api/stream';
    console.log('[SSE] Attempting connection to:', url);

    let source: EventSource;
    try {
      source = new EventSource(url, { withCredentials: true });
    } catch (err) {
      console.error('[SSE] Failed to construct EventSource:', err);
      return;
    }

    source.onopen = () => console.log('[SSE] Connection opened successfully');
    source.onerror = (e) => console.error('[SSE] Connection error:', e);
    // Expose for E2E tests that need to trigger a reconnect after swapping the route mock.
    if (typeof window !== 'undefined') (window as any).__sseSource = source;

    // ── connected ──────────────────────────────────────────────────────────
    // Server sends the current week-0 schedule snapshot on every connect or
    // reconnect. We capture the connectionId for echo suppression (BS-11).
    // Note: We no longer clear optimistic guards on every reconnect to prevent
    // UI jitter during network flickers.
    source.addEventListener('connected', (e: MessageEvent) => {
      console.log('[SSE] Received "connected" event');
      const { schedule, connectionId } = JSON.parse(e.data);
      if (connectionId) {
        usePlannerStore.getState().setSseConnectionId(connectionId);
      }
      useWeekStore.getState().applySnapshot(schedule);
    });

    // ── slot_updated ───────────────────────────────────────────────────────
    // A single day's slot changed (assign, validate, remove).
    // Update todayStore if the date is today; always pass to weekStore
    // (applySlotUpdate's inCurrentWeek guard handles the filtering).
    source.addEventListener('slot_updated', (e: MessageEvent) => {
      console.log('[SSE] Received "slot_updated" event');
      const { date, recipe, status } = JSON.parse(e.data);
      const today = getTodayString();

      if (date === today) {
        useTodayStore.getState().applyServerUpdate({ recipe, status });
      }

      useWeekStore.getState().applySlotUpdate({ date, recipe, status });
    });

    // ── week_updated ───────────────────────────────────────────────────────
    // The whole week changed (lock, voting open, move).
    source.addEventListener('week_updated', (e: MessageEvent) => {
      console.log('[SSE] Received "week_updated" event');
      const { schedule } = JSON.parse(e.data);
      useWeekStore.getState().applySnapshot(schedule);
    });

    // ── vote_updated ───────────────────────────────────────────────────────
    // A vote was cast or purged — update vote counts on the planner and
    // re-rank the discovery stack if family interest flipped.
    source.addEventListener('vote_updated', (e: MessageEvent) => {
      console.log('[SSE] Received "vote_updated" event');
      const { recipeId, voteCount } = JSON.parse(e.data);
      useWeekStore.getState().applyVoteUpdate({ recipeId, voteCount });
      useDiscoveryStore.getState().applyVoteUpdate({ recipeId, voteCount });
    });

    // ── smart_defaults_updated ─────────────────────────────────────────────
    // Vote crossed the consensus threshold — merge pre-selected recipes into
    // pending slots only (confirmed slots are left untouched).
    source.addEventListener('smart_defaults_updated', (e: MessageEvent) => {
      console.log('[SSE] Received "smart_defaults_updated" event');
      const { defaults } = JSON.parse(e.data);
      useWeekStore.getState().applySmartDefaultsUpdate(defaults);
    });

    // ── fill_the_gap_invalidated ───────────────────────────────────────────
    // A recipe was assigned or removed — any open QuickFindModal should
    // refetch so already-planned recipes disappear from the list.
    source.addEventListener('fill_the_gap_invalidated', (e: MessageEvent) => {
      console.log('[SSE] Received "fill_the_gap_invalidated" event');
      const { weekOffset } = JSON.parse(e.data);
      useDiscoveryStore.getState().invalidateFillTheGap(weekOffset);
    });

    // ── recipe_ready ───────────────────────────────────────────────────────
    // Recipe synthesis workflow completed.
    // If this recipe was submitted from this session (captureStore has it),
    // remove it from the pending queue and push a 'ready' notification so
    // LibraryToast can surface it to the user.
    // Always notify the GOTO store so HomeCommandCenter can transition from
    // pending to ready without polling.
    source.addEventListener('recipe_ready', (e: MessageEvent) => {
      console.log('[SSE] Received "recipe_ready" event');
      const { recipeId, name, imageUrl } = JSON.parse(e.data);
      const captureStore = useCaptureStore.getState();
      const pending = captureStore.getPending(recipeId);
      if (pending) {
        captureStore.removePending(recipeId);
        useLibraryStore.getState().pushNotification({
          recipeId,
          name: name ?? pending.name ?? recipeId,
          imageUrl,
          type: 'ready',
        });
      }
      useGotoStore.getState().markReady(recipeId);
    });

    // ── recipe_failed ──────────────────────────────────────────────────────
    // Recipe synthesis workflow failed (all retries exhausted).
    // If this recipe was submitted from this session, remove it from the
    // pending queue and push a 'failed' notification so RecipeFailureBanner
    // can surface it to the user.
    source.addEventListener('recipe_failed', (e: MessageEvent) => {
      console.log('[SSE] Received "recipe_failed" event');
      const { recipeId, errorMessage, failedStep, partialData } = JSON.parse(e.data);
      const captureStore = useCaptureStore.getState();
      const pending = captureStore.getPending(recipeId);
      if (pending) {
        captureStore.removePending(recipeId);
        useLibraryStore.getState().pushNotification({
          recipeId,
          name: (partialData as { name?: string } | undefined)?.name ?? pending.name ?? recipeId,
          imageUrl: (partialData as { imageUrl?: string } | undefined)?.imageUrl,
          type: 'failed',
          errorMessage,
          failedStep,
          partialData,
        });
      }
    });

    // ── grocery_updated ────────────────────────────────────────────────────
    // Grocery check-state changed (item toggled by another family member).
    // Only apply if the event is for the currently-loaded week.
    source.addEventListener('grocery_updated', (e: MessageEvent) => {
      console.log('[SSE] Received "grocery_updated" event');
      const { weekOffset, groceryState } = JSON.parse(e.data);
      if (weekOffset === useWeekStore.getState().weekOffset) {
        usePlannerStore.getState().setGroceryState(groceryState);
      }
    });

    // ── discovery_nudge ────────────────────────────────────────────────────
    // A food group reached its target during plan recomputation.
    // Update the active category filter in the discovery store to steer
    // the user toward under-represented food groups.
    source.addEventListener('discovery_nudge', (e: MessageEvent) => {
      console.log('[SSE] Received "discovery_nudge" event');
      const { nextFoodGroup } = JSON.parse(e.data);
      useDiscoveryStore.getState().setActiveCategory(nextFoodGroup);
    });

    // ── cleanup ────────────────────────────────────────────────────────────
    return () => {
      console.log('[SSE] Hook effect cleanup (closing connection)');
      source.close();
    };
  }, []);
}
