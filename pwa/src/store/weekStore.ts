import { create } from 'zustand';
import {
  getSchedule,
  assignRecipeToDay,
  removeRecipeFromDay,
  moveRecipe as moveRecipeApi,
  openVoting as openVotingApi,
  lockSchedule,
  isScheduleRecipe,
  getSmartDefaults,
} from '@/lib/api/planner';
import { usePlannerStore } from '@/store/plannerStore';
import type { ScheduleRecipeDto, SmartDefaultsDto } from '@/lib/api/generated/models';
import type { ScheduleDay } from '@/lib/api/planner';
import type { ScheduleDays } from '@/lib/api/generated/models';

// Re-export the type so the planner page can import it from here
export type UILocalScheduleDay = Omit<ScheduleDay, 'recipe'> & {
  recipe?: ScheduleRecipeDto | null;
  _uiId: string;
  _isPending?: boolean;
  _voteCount?: number | null;
  _unanimousVote?: boolean | null;
  _userCleared?: boolean;
  status?: number;
};

export interface WeekState {
  weekOffset: number;
  schedule: UILocalScheduleDay[];
  /** 0 = Draft, 1 = VotingOpen, 2 = Locked — seeded from WeeklyPlan.Status */
  status: 0 | 1 | 2;
  isLoading: boolean;
  lastSyncedAt: number | null;
  /**
   * Timestamp (ms) of the most recent optimistic write.
   * sync() will not overwrite schedule while this is within the 10-second window.
   */
  optimisticWriteAt: number | null;

  // Derived (not stored):
  // isVotingOpen = status === 1
  // isLocked     = status === 2

  // Actions
  init: (weekOffset: number) => Promise<void>;
  assignRecipe: (
    dayIndex: number,
    recipe: { id: string; name: string | null; image: string }
  ) => void;
  removeRecipe: (dayIndex: number, date: string) => void;
  /**
   * Performs only the local state update (array splice + day reconciliation +
   * optimisticWriteAt). No API call. Use this from onReorder for smooth visual
   * feedback during a drag gesture.
   */
  reorderLocally: (from: number, to: number) => void;
  /**
   * Calls reorderLocally then fires moveRecipeApi exactly once. On API failure,
   * reverts to preDragSnapshot (not the current intermediate schedule).
   * Call this from onDragEnd — once per drag gesture.
   */
  commitMove: (from: number, to: number, preDragSnapshot: UILocalScheduleDay[]) => void;
  /** @deprecated Use reorderLocally (for onReorder) + commitMove (for onDragEnd) instead. */
  moveRecipe: (from: number, to: number) => void;
  openVoting: () => Promise<void>;
  closeVoting: () => Promise<void>;
  lockWeek: () => Promise<void>;
  sync: () => Promise<void>;

  // SSE-driven actions
  applySnapshot: (schedule: ScheduleDays) => void;
  applySlotUpdate: (update: { date: string; recipe: any; status: number }) => void;
  applyVoteUpdate: (update: { recipeId: string; voteCount: number }) => void;
  applySmartDefaultsUpdate: (defaults: SmartDefaultsDto) => void;
}

// ─── Helper ─────────────────────────────────────────────────────────────────

const generateUiId = (): string =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(7);

/**
 * Merges schedule data with optional smart defaults into UILocalScheduleDay[].
 * Replicates the merge logic from the planner page's loadData function.
 */
function buildScheduleDays(
  scheduleData: NonNullable<Awaited<ReturnType<typeof getSchedule>>>,
  defaultsData?: Awaited<ReturnType<typeof getSmartDefaults>>
): UILocalScheduleDay[] {
  if (!scheduleData.days) return [];

  const defaultsByDayIndex = new Map(
    defaultsData?.preSelectedRecipes?.map((r) => [r.dayIndex, r]) ?? []
  );

  return scheduleData.days.map((day: any, index: number) => {
    // Narrow the oneOf union — only treat as a recipe if it has an id
    if (isScheduleRecipe(day.recipe)) {
      return { ...day, recipe: day.recipe, _uiId: generateUiId() };
    }

    const smartDefault = defaultsByDayIndex.get(index);
    if (smartDefault) {
      return {
        ...day,
        recipe: {
          id: smartDefault.recipeId ?? '',
          name: smartDefault.name ?? '',
          image: smartDefault.heroImageUrl ?? '',
          voteCount: smartDefault.voteCount ?? 0,
        },
        _uiId: generateUiId(),
        _isPending: true,
        _voteCount: smartDefault.voteCount,
        _unanimousVote: smartDefault.unanimousVote,
      };
    }

    return { ...day, recipe: undefined, _uiId: generateUiId() };
  });
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useWeekStore = create<WeekState>((set, get) => ({
  weekOffset: 0,
  schedule: [],
  status: 0,
  isLoading: false,
  lastSyncedAt: null,
  optimisticWriteAt: null,

  // ── init ──────────────────────────────────────────────────────────────────
  async init(weekOffset) {
    set({ weekOffset, isLoading: true });
    try {
      const scheduleData = await getSchedule(weekOffset);

      if (!scheduleData) {
        set({ isLoading: false });
        return;
      }

      const status = (scheduleData.status ?? 0) as 0 | 1 | 2;

      // Smart defaults are only fetched when voting is open (status === 1).
      // Loading them unconditionally pre-fills the planner before mom has asked
      // the family — breaking the Ask → Vote → Lock flow entirely.
      // When status === 0 (draft), the planner starts blank and mom controls it.
      // When status === 1 (voting open), the family's votes surface as pending suggestions.
      const defaultsData =
        weekOffset === 0 && status === 1 ? await getSmartDefaults(weekOffset) : null;

      const mergedDays = buildScheduleDays(scheduleData, defaultsData ?? undefined);

      // Restore persisted grocery state from API if present.
      // groceryState is a Kiota AdditionalDataHolder — the actual key/value pairs
      // live in .additionalData (typed as Record<string, unknown> by Kiota).
      const serverGroceryState = scheduleData.groceryState?.additionalData as
        | Record<string, boolean>
        | undefined;
      if (serverGroceryState && typeof serverGroceryState === 'object') {
        usePlannerStore.getState().setGroceryState(serverGroceryState);
      }

      set({
        schedule: mergedDays,
        status,
        lastSyncedAt: Date.now(),
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  // ── assignRecipe ──────────────────────────────────────────────────────────
  assignRecipe(dayIndex, recipe) {
    const prev = get().schedule;
    const next = prev.map((d, i) =>
      i === dayIndex
        ? {
            ...d,
            recipe: {
              id: recipe.id,
              name: recipe.name ?? '',
              image: recipe.image,
            } as ScheduleRecipeDto,
          }
        : d
    );
    set({ schedule: next, optimisticWriteAt: Date.now() });
    assignRecipeToDay(get().weekOffset, dayIndex, recipe).catch(() => set({ schedule: prev }));
  },

  // ── removeRecipe ──────────────────────────────────────────────────────────
  removeRecipe(dayIndex, date) {
    const prev = get().schedule;
    const next = prev.map((d, i) =>
      i === dayIndex ? { ...d, recipe: undefined, _isPending: false, _userCleared: true } : d
    );
    set({ schedule: next, optimisticWriteAt: Date.now() });
    removeRecipeFromDay(date).catch(() => set({ schedule: prev }));
  },

  // ── reorderLocally ────────────────────────────────────────────────────────
  reorderLocally(from, to) {
    const prev = get().schedule;
    if (from === to || from < 0 || to < 0) return;

    const next = [...prev];
    // 1. Physically move the item in the array so framer-motion's Reorder.Group
    // sees the tracked _uiId move to the new position.
    const [movedItem] = next.splice(from, 1);
    next.splice(to, 0, movedItem);

    // 2. Reconcile: the user wants to move the CONTENT (recipe) but the DAYS
    // (Mon, Tue...) must remain fixed at their respective indices.
    const reconciled = next.map((item, index) => ({
      ...item,
      day: prev[index].day,
      date: prev[index].date,
    }));

    set({ schedule: reconciled, optimisticWriteAt: Date.now() });
    // No API call — this is intentionally local-only for smooth drag feedback.
  },

  // ── commitMove ────────────────────────────────────────────────────────────
  commitMove(from, to, preDragSnapshot) {
    if (from === to || from < 0 || to < 0) return;

    // Apply the final local reorder using the authoritative from/to positions.
    get().reorderLocally(from, to);

    // Fire the API exactly once. On failure, revert to the pre-drag snapshot
    // (not the current intermediate schedule) so the user sees a clean rollback.
    moveRecipeApi(get().weekOffset, from, to).catch(() =>
      set({ schedule: preDragSnapshot, optimisticWriteAt: null })
    );
  },

  // ── moveRecipe ────────────────────────────────────────────────────────────
  /** @deprecated Use reorderLocally + commitMove instead. Kept for callers outside the planner page. */
  moveRecipe(from, to) {
    const prev = get().schedule;
    if (from === to || from < 0 || to < 0) return;

    const next = [...prev];
    // 1. Physically move the item in the array so framer-motion's Reorder.Group
    // sees the tracked _uiId move to the new position.
    const [movedItem] = next.splice(from, 1);
    next.splice(to, 0, movedItem);

    // 2. Reconcile: the user wants to move the CONTENT (recipe) but the DAYS
    // (Mon, Tue...) must remain fixed at their respective indices.
    const reconciled = next.map((item, index) => ({
      ...item,
      day: prev[index].day,
      date: prev[index].date,
    }));

    set({ schedule: reconciled, optimisticWriteAt: Date.now() });

    // 3. API Call: Trigger the backend move. Note: if this fails, we revert to prev.
    moveRecipeApi(get().weekOffset, from, to).catch(() => set({ schedule: prev }));
  },

  // ── openVoting ────────────────────────────────────────────────────────────
  async openVoting() {
    const prev = get().status;
    set({ status: 1 });
    try {
      await openVotingApi(get().weekOffset);
    } catch {
      set({ status: prev });
      throw new Error('Failed to open voting');
    }
  },

  // ── closeVoting ───────────────────────────────────────────────────────────
  async closeVoting() {
    const prev = get().status;
    set({ status: 2 });
    try {
      await lockSchedule(get().weekOffset);
    } catch {
      set({ status: prev });
      throw new Error('Failed to close voting');
    }
  },

  // ── lockWeek ──────────────────────────────────────────────────────────────
  async lockWeek() {
    const prev = get().status;
    set({ status: 2 });
    try {
      await lockSchedule(get().weekOffset);
    } catch {
      set({ status: prev });
      throw new Error('Failed to lock week');
    }
  },

  // ── sync ──────────────────────────────────────────────────────────────────
  async sync() {
    set({ isLoading: true });
    try {
      const data = await getSchedule(get().weekOffset);
      if (!data) return;

      const { optimisticWriteAt } = get();
      const optimisticIsRecent =
        optimisticWriteAt !== null && Date.now() - optimisticWriteAt < 10_000;

      const status = ((data as any).status ?? 0) as 0 | 1 | 2;

      if (!optimisticIsRecent) {
        set({
          schedule: buildScheduleDays(data),
          status,
          lastSyncedAt: Date.now(),
        });
      } else {
        // Protect optimistic schedule; still update status (authoritative)
        set({ status, lastSyncedAt: Date.now() });
      }
    } catch {
      // silent
    } finally {
      set({ isLoading: false });
    }
  },

  // ── applySnapshot ─────────────────────────────────────────────────────────
  applySnapshot(schedule: ScheduleDays) {
    const mergedDays = buildScheduleDays(schedule);
    const prev = get().schedule;

    // Preserve smart-defaults metadata for pending slots that the snapshot does not
    // have a server-assigned recipe for. Without this, a reconnect strips all
    // _isPending/_voteCount/_unanimousVote fields, causing visible flicker on the planner.
    //
    // Also preserve REST-loaded recipes when the SSE snapshot is empty (all recipe: null).
    // The `connected` event sends a week-0 snapshot that may be empty if the SSE mock
    // returns a blank schedule. If the store was already populated by a REST fetch, the
    // SSE empty snapshot must not overwrite it — the REST data is more specific.
    // Guard: only preserve if the incoming snapshot has NO recipes at all (all null).
    const snapshotIsEmpty = mergedDays.every((d) => !d.recipe);

    const preserved = mergedDays.map((day) => {
      if (day.recipe) return day; // server has a real recipe — use it
      const prevDay = prev.find((p) => p.date === day.date);
      if (prevDay?._isPending) {
        return {
          ...day,
          recipe: prevDay.recipe,
          _isPending: prevDay._isPending,
          _voteCount: prevDay._voteCount,
          _unanimousVote: prevDay._unanimousVote,
        };
      }
      // If the incoming snapshot is entirely empty but the store already has a recipe
      // for this day (loaded via REST), keep the existing recipe. An empty SSE snapshot
      // is a seed event, not an authoritative clear.
      if (snapshotIsEmpty && prevDay?.recipe) {
        return { ...day, recipe: prevDay.recipe, status: prevDay.status ?? day.status };
      }
      return day;
    });

    // Extract grocery state from the typed field (AdditionalDataHolder pattern).
    // Setting it here — in the same synchronous tick as schedule — eliminates the
    // two-render gap that caused grocery-list jitter on SSE reconnect.
    const incomingGroceryState = schedule.groceryState?.additionalData as
      | Record<string, boolean>
      | undefined;

    set({
      schedule: preserved,
      // If the incoming snapshot is entirely empty, preserve the existing status
      // (e.g. locked=2) rather than resetting it to 0. An empty SSE snapshot is
      // a seed event, not an authoritative state reset.
      status:
        snapshotIsEmpty && prev.length > 0 ? get().status : ((schedule.status ?? 0) as 0 | 1 | 2),
      lastSyncedAt: Date.now(),
      optimisticWriteAt: null,
    });

    // Apply grocery state atomically after the schedule update.
    // weekStore and plannerStore are separate Zustand slices, so setGroceryState
    // is called on plannerStore directly. Both updates happen synchronously in the
    // same JS tick (no await, no setTimeout), so React batches them into a single
    // render in concurrent mode — no two-render gap.
    if (incomingGroceryState && typeof incomingGroceryState === 'object') {
      usePlannerStore.getState().setGroceryState(incomingGroceryState);
    }
  },

  // ── applySlotUpdate ───────────────────────────────────────────────────────
  applySlotUpdate({ date, recipe, status }: { date: string; recipe: any; status: number }) {
    const prev = get().schedule;
    // If schedule is empty, silently return (pre-init SSE event drop case — BS-2)
    if (prev.length === 0) return;
    const inCurrentWeek = prev.some((d) => d.date === date);
    if (!inCurrentWeek) return;
    const next = prev.map((d) =>
      d.date === date ? { ...d, recipe: recipe ?? undefined, status } : d
    );
    set({ schedule: next });
  },

  // ── applyVoteUpdate ───────────────────────────────────────────────────────
  applyVoteUpdate({ recipeId, voteCount }: { recipeId: string; voteCount: number }) {
    const prev = get().schedule;
    const next = prev.map((d) =>
      d.recipe?.id === recipeId ? { ...d, recipe: { ...d.recipe, voteCount } } : d
    );
    set({ schedule: next });
  },

  // ── applySmartDefaultsUpdate ──────────────────────────────────────────────
  applySmartDefaultsUpdate(defaults: SmartDefaultsDto) {
    // Only update slots that are still pending (no confirmed recipe assigned by a user).
    // Confirmed slots (_isPending === false and recipe present) are left untouched.
    const prev = get().schedule;
    const defaultsByDayIndex = new Map(
      defaults.preSelectedRecipes?.map((r) => [r.dayIndex, r]) ?? []
    );

    const next = prev.map((d, index) => {
      // Never overwrite a user-confirmed slot
      if (d.recipe && !d._isPending) return d;

      const smartDefault = defaultsByDayIndex.get(index);
      if (smartDefault) {
        return {
          ...d,
          recipe: {
            id: smartDefault.recipeId ?? '',
            name: smartDefault.name ?? '',
            image: smartDefault.heroImageUrl ?? '',
            voteCount: smartDefault.voteCount ?? 0,
          },
          _isPending: true,
          _voteCount: smartDefault.voteCount,
          _unanimousVote: smartDefault.unanimousVote,
          _isLocked: smartDefault.isLocked,
        };
      }

      // Recipe dropped below threshold — clear the pending slot
      if (d._isPending) {
        return {
          ...d,
          recipe: undefined,
          _isPending: false,
          _voteCount: null,
          _unanimousVote: null,
        };
      }

      return d;
    });

    set({ schedule: next });
  },
}));
