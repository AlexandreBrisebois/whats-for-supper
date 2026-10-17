import { create } from 'zustand';
import {
  calendarDayIndex,
  calendarTime,
  calendarAnchorIsFresh,
  calendarIdentity,
  loadCalendarSnapshot,
  CalendarUnavailableError,
  CALENDAR_ERROR,
  type CalendarAnchor,
  type CalendarContext,
} from '@/lib/deployment-calendar';
import { apiClient } from '@/lib/api/api-client';
import { DateOnly, type Guid } from '@microsoft/kiota-abstractions';
import { assignRecipeToDay, normalizeScheduleRecipe } from '@/lib/api/planner';
import type { NonCookingPlanDto, ScheduleRecipeDto } from '@/lib/api/generated/models';

// ─── State shape ────────────────────────────────────────────────────────────

export interface TodayState {
  calendar: CalendarContext | null;
  calendarAnchor: CalendarAnchor | null;
  calendarVersion: number;
  calendarError: string | null;
  optimisticDate: string | null;
  pendingCalendarAction:
    | { kind: 'assign'; recipe: { id: string; name: string | null; image: string } }
    | { kind: 'order_in' }
    | null;
  calendarIsFresh: () => boolean;
  ensureCalendar: (force?: boolean) => Promise<CalendarContext>;
  invalidateCalendar: () => void;
  retryCalendarAction: () => void;
  /** The recipe assigned to today's slot, or null if none. */
  currentRecipe: ScheduleRecipeDto | null;
  nonCooking: NonCookingPlanDto | null;
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
  init: (
    recipe: ScheduleRecipeDto | null,
    status: 0 | 2 | 3,
    nonCooking?: NonCookingPlanDto | null,
    calendar?: CalendarContext | null
  ) => void;

  /**
   * Optimistically set currentRecipe and record the write timestamp, then fire
   * POST /api/schedule/assign in the background.
   * Does NOT call router.refresh().
   */
  assignRecipe: (
    recipe: { id: string; name: string | null; image: string },
    capturedCalendar?: CalendarContext
  ) => void;

  /** Await guarded persistence; the recovery session owns applying confirmed display state. */
  saveRecoveryRecipe: (
    recipe: { id: string; name: string | null; image: string },
    capturedCalendar: CalendarContext
  ) => Promise<void>;

  /**
   * Record cooking for a specific recipe. Complete today's slot only if its recipe matches.
   */
  markCooked: (recipeId: string) => Promise<void>;

  /**
   * Optimistically set status = 3 (ordered in / skipped), then fire
   * POST /api/schedule/day/{date}/validate with { status: 3 } in the background.
   */
  markOrderedIn: (capturedCalendar?: CalendarContext) => void;

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
  applyServerUpdate: (update: {
    date?: string;
    recipe: ScheduleRecipeDto | null;
    status: number;
    nonCooking?: NonCookingPlanDto | null;
  }) => void;

  /**
   * Clear optimisticWriteAt unconditionally. Called on SSE reconnect so the
   * server snapshot is treated as authoritative regardless of write age.
   */
  clearOptimisticGuard: () => void;
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useTodayStore = create<TodayState>((set, get) => {
  let refresh: Promise<CalendarContext> | null = null;
  const acceptCalendar = (snapshot: Awaited<ReturnType<typeof loadCalendarSnapshot>>) => {
    const state = get();
    const next = snapshot.calendar;
    if (state.calendar?.timeZone === next.timeZone && state.calendar.today > next.today)
      return false;
    const changed = !state.calendar || calendarIdentity(state.calendar) !== calendarIdentity(next);
    const entry = snapshot.schedule?.days?.find((day) => day.date === next.today);
    set({
      calendar: next,
      calendarAnchor: snapshot.anchor,
      calendarVersion: state.calendarVersion + (changed ? 1 : 0),
      ...(!state.pendingCalendarAction ? { calendarError: null } : {}),
      ...(changed
        ? {
            currentRecipe: normalizeScheduleRecipe(entry?.recipe),
            status: entry?.status === 2 ? 2 : entry?.status === 3 ? 3 : 0,
            nonCooking: entry?.status === 3 ? (entry.nonCooking ?? null) : null,
            optimisticWriteAt: null,
            optimisticDate: null,
            skipCookedCelebration: false,
          }
        : {}),
    });
    return true;
  };
  return {
    calendar: null,
    calendarAnchor: null,
    calendarVersion: 0,
    calendarError: null,
    pendingCalendarAction: null,
    optimisticDate: null,
    calendarIsFresh: () => get().calendar !== null && calendarAnchorIsFresh(get().calendarAnchor),
    invalidateCalendar() {
      set({ calendarAnchor: null, calendarVersion: get().calendarVersion + 1 });
      refresh = null;
    },
    ensureCalendar(force = false) {
      if (!force && get().calendarIsFresh()) return Promise.resolve(get().calendar!);
      if (refresh) return refresh;
      const version = get().calendarVersion;
      const pending = loadCalendarSnapshot()
        .then((snapshot) => {
          if (version !== get().calendarVersion) {
            if (get().calendarIsFresh()) return get().calendar!;
            throw new CalendarUnavailableError();
          }
          if (!calendarAnchorIsFresh(snapshot.anchor)) throw new CalendarUnavailableError();
          if (!acceptCalendar(snapshot)) {
            if (get().calendarIsFresh()) return get().calendar!;
            throw new CalendarUnavailableError();
          }
          return get().calendar!;
        })
        .catch((error) => {
          set({ calendarError: CALENDAR_ERROR });
          throw error instanceof CalendarUnavailableError
            ? error
            : new CalendarUnavailableError(error);
        })
        .finally(() => {
          if (refresh === pending) refresh = null;
        });
      refresh = pending;
      return pending;
    },
    retryCalendarAction() {
      const pending = get().pendingCalendarAction;
      if (pending?.kind === 'assign') get().assignRecipe(pending.recipe);
      else if (pending?.kind === 'order_in') get().markOrderedIn();
      else
        void get()
          .ensureCalendar()
          .catch(() => {});
    },
    currentRecipe: null,
    nonCooking: null,
    status: 0,
    isLoading: false,
    lastSyncedAt: null,
    optimisticWriteAt: null,
    skipCookedCelebration: false,

    // ── init ──────────────────────────────────────────────────────────────────
    init(recipe, status, nonCooking, calendar) {
      const previous = get().calendar;
      if (calendar && previous?.timeZone === calendar.timeZone && previous.today > calendar.today)
        return;
      if (calendar && (!previous || calendarIdentity(calendar) !== calendarIdentity(previous))) {
        set({
          calendar,
          calendarAnchor: null,
          calendarVersion: get().calendarVersion + 1,
          currentRecipe: recipe,
          status,
          nonCooking: status === 3 ? (nonCooking ?? null) : null,
          optimisticWriteAt: null,
          optimisticDate: null,
          skipCookedCelebration: false,
        });
        return;
      }
      const { optimisticWriteAt, currentRecipe: existingRecipe, status: existingStatus } = get();
      const optimisticIsRecent =
        optimisticWriteAt !== null &&
        get().optimisticDate === get().calendar?.today &&
        calendarTime.elapsed() - optimisticWriteAt >= 0 &&
        calendarTime.elapsed() - optimisticWriteAt < 20_000;

      if (optimisticIsRecent) {
        // Preserve optimistic state during client-side navigation if a write is recent.
        // EXCEPTION: If the IDs match, allow updating details (description, ingredients)
        // from the server-provided recipe.
        if (recipe && recipe.id === existingRecipe?.id) {
          set({
            currentRecipe: recipe,
            status: existingStatus,
            optimisticWriteAt,
          });
        } else {
          set({
            currentRecipe: existingRecipe,
            status: existingStatus,
            optimisticWriteAt,
          });
        }
      } else if (
        recipe === null &&
        (status === 0 || (status === 3 && nonCooking == null)) &&
        existingStatus === 3 &&
        get().nonCooking !== null
      ) {
        // Empty or metadata-free skipped SSR can arrive after a richer live snapshot.
        // Preserve that occupied plan until the existing client sync reconciles it.
        set({ optimisticWriteAt: null });
      } else if (recipe === null && existingRecipe !== null) {
        // SSR returned null but the store already has a recipe (e.g. from an SSE
        // connected event that raced ahead of TodayStoreInitializer). Preserve it —
        // SSR null means "unknown", not "definitely empty".
        set({
          status,
          nonCooking: status === 3 ? (nonCooking ?? null) : null,
          optimisticWriteAt: null,
        });
      } else {
        // Fresh mount or optimistic window expired: use provided server data.
        set({
          currentRecipe: recipe,
          status,
          nonCooking: status === 3 ? (nonCooking ?? null) : null,
          optimisticWriteAt: null,
        });
      }
    },

    async saveRecoveryRecipe(recipe, context) {
      await assignRecipeToDay(
        0,
        calendarDayIndex(context),
        recipe,
        context.referenceWeekStartDate,
        true
      );
    },

    // ── assignRecipe ──────────────────────────────────────────────────────────
    assignRecipe(recipe, capturedCalendar) {
      const calendar = capturedCalendar ?? (get().calendarIsFresh() ? get().calendar : null);
      if (!calendar) {
        const pending = { kind: 'assign' as const, recipe };
        set({ pendingCalendarAction: pending });
        void get()
          .ensureCalendar()
          .then((context) => get().assignRecipe(recipe, context))
          .catch(() => {});
        return;
      }
      const actionDate = calendar.today;
      const showOptimistic = get().calendar?.today === actionDate;
      set({ calendarError: null, pendingCalendarAction: null });
      // Optimistic update — visible immediately
      const optimistic: ScheduleRecipeDto = {
        id: recipe.id,
        name: recipe.name ?? '',
        image: recipe.image,
      };
      if (showOptimistic)
        set({
          currentRecipe: optimistic,
          nonCooking: null,
          status: 0,
          optimisticWriteAt: calendarTime.elapsed(),
          optimisticDate: actionDate,
        });

      // Background network write — no await, no router.refresh()
      const dayIndex = calendarDayIndex(calendar);
      assignRecipeToDay(0, dayIndex, recipe, calendar.referenceWeekStartDate).catch((err) =>
        console.error('[todayStore] assignRecipe failed:', err)
      );

      // Eager hydration — fetch full details immediately so the card flip side is populated.
      apiClient.api.recipes
        .byId(recipe.id as any)
        .get()
        .then((res) => {
          const full = res?.recipe;
          if (!full) return;

          const { currentRecipe } = get();
          // Only apply if the ID still matches (user hasn't switched to another recipe)
          if (currentRecipe?.id === recipe.id && get().calendar?.today === actionDate) {
            set({
              currentRecipe: {
                ...currentRecipe,
                description: full.description,
                ingredients: full.ingredients,
                totalTime: full.totalTime,
              },
            });
          }
        })
        .catch((err) => console.warn('[todayStore] eager hydration failed:', err));
    },

    // ── markCooked ────────────────────────────────────────────────────────────
    async markCooked(recipeId) {
      const calendar = await get().ensureCalendar(true);
      const todayDate = DateOnly.parse(calendar.today);
      if (!todayDate || !recipeId) throw new Error('A recipe and date are required');

      const result = await apiClient.api.schedule.day
        .byDate(todayDate)
        .validate.post({ status: 2, recipeId: recipeId as Guid });

      if (
        result?.data?.mealMarkedCooked &&
        get().currentRecipe?.id === recipeId &&
        get().calendar?.today === calendar.today
      ) {
        set({ status: 2, nonCooking: null });
      }
    },

    // ── markOrderedIn ─────────────────────────────────────────────────────────
    markOrderedIn(capturedCalendar) {
      const calendar = capturedCalendar ?? (get().calendarIsFresh() ? get().calendar : null);
      if (!calendar) {
        set({ pendingCalendarAction: { kind: 'order_in' } });
        void get()
          .ensureCalendar()
          .then((context) => get().markOrderedIn(context))
          .catch(() => {});
        return;
      }
      set({ calendarError: null, pendingCalendarAction: null });
      if (get().calendar?.today === calendar.today)
        set({
          status: 3,
          nonCooking: get().nonCooking ?? {
            kind: 'order_in',
            customLabel: null,
          },
        });

      const todayDate = DateOnly.parse(calendar.today);
      if (!todayDate) return;

      apiClient.api.schedule.day
        .byDate(todayDate)
        .validate.post({ status: 3 })
        .catch((err) => console.error('[todayStore] markOrderedIn failed:', err));
    },

    // ── sync ──────────────────────────────────────────────────────────────────
    async sync() {
      set({ isLoading: true });
      const version = get().calendarVersion;
      try {
        const snapshot = await loadCalendarSnapshot();
        if (version !== get().calendarVersion || !acceptCalendar(snapshot)) return;
        const calendar = snapshot.calendar;
        const todaysEntry = snapshot.schedule?.days?.find((day) => day.date === calendar.today);

        const { optimisticWriteAt } = get();
        const optimisticIsRecent =
          optimisticWriteAt !== null &&
          get().optimisticDate === get().calendar?.today &&
          calendarTime.elapsed() - optimisticWriteAt >= 0 &&
          calendarTime.elapsed() - optimisticWriteAt < 20_000;

        if (todaysEntry?.status === 2) {
          set({ status: 2, nonCooking: null, lastSyncedAt: calendarTime.instant() });
        } else if (todaysEntry?.status === 3) {
          set({
            currentRecipe: normalizeScheduleRecipe(todaysEntry.recipe),
            status: 3,
            nonCooking: todaysEntry.nonCooking ?? null,
            lastSyncedAt: calendarTime.instant(),
          });
        } else if (optimisticIsRecent) {
          // Optimistic write is recent — usually keep currentRecipe as-is to avoid flickering.
          // EXCEPTION: If the IDs match, allow updating details (description, ingredients)
          // so the card hydrates as soon as the server response is ready.
          const recipe = normalizeScheduleRecipe(todaysEntry?.recipe);
          if (recipe && recipe.id === get().currentRecipe?.id) {
            set({
              currentRecipe: recipe,
              nonCooking: null,
              lastSyncedAt: calendarTime.instant(),
            });
          } else {
            set({ lastSyncedAt: calendarTime.instant() });
          }
        } else {
          // Optimistic window expired — treat server as authoritative
          const recipe = normalizeScheduleRecipe(todaysEntry?.recipe);
          if (recipe) {
            set({
              currentRecipe: recipe,
              status: 0,
              nonCooking: null,
              lastSyncedAt: calendarTime.instant(),
            });
          } else {
            set({
              currentRecipe: null,
              status: 0,
              nonCooking: null,
              lastSyncedAt: calendarTime.instant(),
            });
          }
        }
      } catch (err) {
        console.error('[todayStore] sync failed:', err);
      } finally {
        set({ isLoading: false });
      }
    },

    // ── applyServerUpdate ─────────────────────────────────────────────────────
    applyServerUpdate({ recipe, status, nonCooking, date }) {
      date ??= get().calendar?.today;
      if (!date || date !== get().calendar?.today) return;
      // Server push is authoritative — always apply, even if optimistic write is recent.
      // Exception: if optimisticWriteAt is within 2 seconds, the push may be echoing
      // our own write back to us — skip to avoid flicker UNLESS the ID matches
      // (in which case we want to absorb any extra details from the server).
      const { optimisticWriteAt, currentRecipe } = get();
      const isEcho =
        optimisticWriteAt !== null &&
        get().optimisticDate === date &&
        calendarTime.elapsed() - optimisticWriteAt >= 0 &&
        calendarTime.elapsed() - optimisticWriteAt < 2_000;

      if (isEcho && recipe?.id !== currentRecipe?.id) {
        return;
      }

      set({
        currentRecipe: recipe,
        nonCooking: status === 3 ? (nonCooking ?? null) : null,
        status: status as 0 | 2 | 3,
        optimisticWriteAt: null,
        optimisticDate: null, // clear optimistic guard — server is now authoritative
        // For status:2 pushed from another family member's Cook's Mode completion,
        // skip the CookedSuccessCard celebration — show compact badge directly.
        // The person who cooked sees the card optimistically before this echo arrives.
        skipCookedCelebration: status === 2,
      });
    },

    // ── clearOptimisticGuard ──────────────────────────────────────────────────
    clearOptimisticGuard() {
      // Called on SSE reconnect — server snapshot is authoritative regardless of age.
      set({ optimisticWriteAt: null, optimisticDate: null });
    },
  };
});

// Expose for E2E test access — allows tests to inspect or seed store state directly.
if (typeof window !== 'undefined') {
  (window as any).__todayStore = useTodayStore;
}
