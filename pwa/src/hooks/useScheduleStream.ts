'use client';

import { useEffect } from 'react';
import { useTodayStore } from '@/store/todayStore';
import { useWeekStore } from '@/store/weekStore';
import { useDiscoveryStore } from '@/store/discoveryStore';
import { useGotoStore } from '@/store/gotoStore';
import { useCaptureStore } from '@/store/captureStore';
import { useLibraryStore } from '@/store/libraryStore';
import { usePlannerStore } from '@/store/plannerStore';
import { useSearchPromotionStore } from '@/store/searchPromotionStore';
import {
  absoluteMonday,
  civilDate,
  weekOffsetFor,
  type CalendarContext,
} from '@/lib/deployment-calendar';

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

    const withCalendar = (apply: (calendar: CalendarContext | null) => void) => {
      const state = useTodayStore.getState();
      if (state.calendarIsFresh()) {
        apply(state.calendar);
        return;
      }
      void state
        .ensureCalendar()
        .then(apply)
        .catch(() => apply(null));
    };
    const offerToday = (schedule: any) => {
      if (!absoluteMonday(schedule?.weekStartDate)) {
        void useTodayStore.getState().sync();
        return;
      }
      withCalendar((calendar) => {
        if (!calendar) return;
        const entry = schedule?.days?.find((day: { date: string }) => day.date === calendar.today);
        if (entry !== undefined)
          useTodayStore.getState().applyServerUpdate({
            date: entry.date,
            recipe: entry.recipe ?? null,
            status: entry.status ?? 0,
            nonCooking: entry.nonCooking ?? null,
          });
      });
    };
    const onResume = () => {
      useTodayStore.getState().invalidateCalendar();
      void useTodayStore.getState().sync();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') onResume();
    };
    window.addEventListener('pageshow', onResume);
    document.addEventListener('visibilitychange', onVisibility);

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

      offerToday(schedule);
    });

    // ── slot_updated ───────────────────────────────────────────────────────
    // A single day's slot changed (assign, validate, remove).
    // Update todayStore if the date is today; always pass to weekStore
    // (applySlotUpdate's inCurrentWeek guard handles the filtering).
    source.addEventListener('slot_updated', (e: MessageEvent) => {
      console.log('[SSE] Received "slot_updated" event');
      const { date, recipe, status, nonCooking } = JSON.parse(e.data);
      const finish = (calendar: CalendarContext | null) => {
        if (calendar && date === calendar.today)
          useTodayStore.getState().applyServerUpdate({ date, recipe, status, nonCooking });
        useWeekStore.getState().applySlotUpdate({ date, recipe, status, nonCooking });
        useSearchPromotionStore.getState().invalidate();
      };
      if (!civilDate(date)) {
        void useTodayStore.getState().sync();
        return;
      }
      withCalendar(finish);
    });

    // ── week_updated ───────────────────────────────────────────────────────
    // The whole week changed (lock, voting open, move).
    // echoSeq is present when the server is reflecting our own move back — pass
    // it to applySnapshot so it can confirm the sequence and skip the update.
    source.addEventListener('week_updated', (e: MessageEvent) => {
      console.log('[SSE] Received "week_updated" event');
      const { schedule, echoSeq } = JSON.parse(e.data);
      useWeekStore.getState().applySnapshot(schedule, echoSeq);
      useSearchPromotionStore.getState().invalidate();

      offerToday(schedule);
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
      const state = useWeekStore.getState();
      if (!absoluteMonday(defaults?.weekStartDate)) {
        void state.sync();
        return;
      }
      if (defaults.weekStartDate === state.weekStartDate) state.applySmartDefaultsUpdate(defaults);
    });

    // ── fill_the_gap_invalidated ───────────────────────────────────────────
    // A recipe was assigned or removed — any open QuickFindModal should
    // refetch so already-planned recipes disappear from the list.
    source.addEventListener('fill_the_gap_invalidated', (e: MessageEvent) => {
      console.log('[SSE] Received "fill_the_gap_invalidated" event');
      const { weekStartDate } = JSON.parse(e.data);
      if (!absoluteMonday(weekStartDate)) {
        void useWeekStore.getState().sync();
        return;
      }
      const offsets = new Set([
        weekOffsetFor(weekStartDate, useWeekStore.getState().calendar?.referenceWeekStartDate),
        weekOffsetFor(weekStartDate, useTodayStore.getState().calendar?.referenceWeekStartDate),
      ]);
      for (const offset of offsets)
        if (offset !== null) useDiscoveryStore.getState().invalidateFillTheGap(offset);
      useSearchPromotionStore.getState().invalidate();
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
      const { recipeId, workflowInstanceId, errorMessage, failedStep, partialData } = JSON.parse(
        e.data
      );
      const captureStore = useCaptureStore.getState();
      const pending = captureStore.getPending(recipeId);
      if (pending) {
        captureStore.removePending(recipeId);
        useLibraryStore.getState().pushNotification({
          recipeId,
          workflowInstanceId,
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
      const { weekStartDate, groceryState } = JSON.parse(e.data);
      const state = useWeekStore.getState();
      if (!absoluteMonday(weekStartDate)) {
        void state.sync();
        return;
      }
      if (
        weekStartDate === state.weekStartDate &&
        weekOffsetFor(weekStartDate, state.calendar?.referenceWeekStartDate) === state.weekOffset
      ) {
        usePlannerStore.getState().setGroceryState(groceryState);
      }
    });

    // ── cleanup ────────────────────────────────────────────────────────────
    return () => {
      console.log('[SSE] Hook effect cleanup (closing connection)');
      window.removeEventListener('pageshow', onResume);
      document.removeEventListener('visibilitychange', onVisibility);
      source.close();
    };
  }, []);
}
