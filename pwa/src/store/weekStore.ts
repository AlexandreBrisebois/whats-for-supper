import { create } from 'zustand';
import {
  getSchedule,
  assignRecipeToDay,
  removeRecipeFromDay,
  moveRecipe as moveRecipeApi,
  openVoting as openVotingApi,
  lockSchedule,
  normalizeScheduleRecipe,
  getSmartDefaults,
} from '@/lib/api/planner';
import { usePlannerStore } from '@/store/plannerStore';
import type {
  GroceryLineItemDto,
  ScheduleRecipeDto,
  SmartDefaultsDto,
  WeeklyBalanceSummaryDto,
} from '@/lib/api/generated/models';
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
  /** Pre-computed grocery items from the API, grouped by section for display */
  groceryItems: GroceryLineItemDto[];
  /** 0 = Draft, 1 = VotingOpen, 2 = Locked — seeded from WeeklyPlan.Status */
  status: 0 | 1 | 2;
  isLoading: boolean;
  lastSyncedAt: number | null;
  /**
   * Timestamp (ms) of the most recent optimistic write.
   * sync() will not overwrite schedule while this is within the 10-second window.
   */
  optimisticWriteAt: number | null;
  /** Summary of Canada's Food Guide balance for the week's dinner slots */
  balanceSummary: WeeklyBalanceSummaryDto | null;

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
   * Performs only the local state update (slot swap + day reconciliation +
   * optimisticWriteAt). No API call. Use this from onReorder for smooth visual
   * feedback during a drag gesture.
   */
  reorderLocally: (from: number, to: number, baseSchedule?: UILocalScheduleDay[]) => void;
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
  applySnapshot: (schedule: ScheduleDays, echoSeq?: number) => void;
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
  defaultsData?: Awaited<ReturnType<typeof getSmartDefaults>>,
  existingDays?: UILocalScheduleDay[]
): UILocalScheduleDay[] {
  if (!scheduleData.days) return [];

  const defaultsByDayIndex = new Map(
    defaultsData?.preSelectedRecipes?.map((r) => [r.dayIndex, r]) ?? []
  );

  return scheduleData.days.map((day: any, index: number) => {
    // Narrow the oneOf union — only treat as a recipe if it has an id
    // Must be a random UUID, NOT derived from date. After reorderLocally reconciles
    // day/date back to fixed slots, a date-based _uiId would end up at the wrong
    // slot index, causing Framer Motion to remount items and snap them back visually.
    // However, we reuse the existing ID if available at this index to prevent
    // unnecessary "flashing" during server syncs (BS-20).
    const stableUiId = existingDays?.[index]?._uiId ?? generateUiId();
    const recipe = normalizeScheduleRecipe(day.recipe);

    if (recipe) {
      return { ...day, recipe, _uiId: stableUiId };
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
        _uiId: stableUiId,
        _isPending: true,
        _voteCount: smartDefault.voteCount,
        _unanimousVote: smartDefault.unanimousVote,
      };
    }

    return { ...day, recipe: undefined, _uiId: stableUiId };
  });
}

function removeRecipeFromGroceryItems(
  groceryItems: GroceryLineItemDto[],
  recipeId: string | undefined
): GroceryLineItemDto[] {
  if (!recipeId) return groceryItems;

  return groceryItems
    .map((item) => {
      const remainingRecipeIds = (item.recipeIds ?? []).filter((id) => id !== recipeId);
      return {
        ...item,
        recipeIds: remainingRecipeIds,
      };
    })
    .filter((item) => (item.recipeIds ?? []).length > 0);
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useWeekStore = create<WeekState>((set, get) => ({
  weekOffset: 0,
  schedule: [],
  groceryItems: [],
  status: 0,
  isLoading: false,
  lastSyncedAt: null,
  optimisticWriteAt: null,
  balanceSummary: null,

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

      const mergedDays = buildScheduleDays(
        scheduleData,
        defaultsData ?? undefined,
        get().schedule
      );

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
        groceryItems: scheduleData.groceryItems ?? [],
        status,
        balanceSummary: scheduleData.balanceSummary ?? null,
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
            status: 0,
            recipe: {
              id: recipe.id,
              name: recipe.name ?? '',
              image: recipe.image,
            } as ScheduleRecipeDto,
          }
        : d
    );
    set({ schedule: next, optimisticWriteAt: Date.now() });
    assignRecipeToDay(get().weekOffset, dayIndex, recipe)
      .then(async () => {
        const data = await getSchedule(get().weekOffset);
        if (!data) return;

        set({
          groceryItems: data.groceryItems ?? [],
          balanceSummary: data.balanceSummary ?? null,
          status: (data.status ?? 0) as 0 | 1 | 2,
          lastSyncedAt: Date.now(),
        });
      })
      .catch(() => set({ schedule: prev }));
  },

  // ── removeRecipe ──────────────────────────────────────────────────────────
  removeRecipe(dayIndex, date) {
    const prev = get().schedule;
    const prevGroceryItems = get().groceryItems;
    const recipeId = prev[dayIndex]?.recipe?.id;
    const removedRecipeId = typeof recipeId === 'string' ? recipeId : undefined;
    const next = prev.map((d, i) =>
      i === dayIndex ? { ...d, recipe: undefined, _isPending: false, _userCleared: true } : d
    );
    set({
      schedule: next,
      groceryItems: removeRecipeFromGroceryItems(prevGroceryItems, removedRecipeId),
      optimisticWriteAt: Date.now(),
    });
    removeRecipeFromDay(date).catch(() => set({ schedule: prev, groceryItems: prevGroceryItems }));
  },

  // ── reorderLocally ────────────────────────────────────────────────────────
  reorderLocally(from, to, baseSchedule) {
    const prev = baseSchedule ?? get().schedule;
    if (from < 0 || to < 0) return;

    if (from === to) {
      if (baseSchedule) {
        set({ schedule: [...baseSchedule], optimisticWriteAt: Date.now() });
      }
      return;
    }

    const next = [...prev];
    // Swap the dragged recipe with the destination day instead of shifting the
    // intermediate stack. This matches the backend's default swap semantics.
    [next[from], next[to]] = [next[to], next[from]];

    // Reconcile only the two affected slots so unaffected cards keep their
    // object identity during drag and do not all re-render on each midpoint.
    const reconciled = [...prev];
    reconciled[from] = {
      ...next[from],
      day: prev[from].day,
      date: prev[from].date,
    };
    reconciled[to] = {
      ...next[to],
      day: prev[to].day,
      date: prev[to].date,
    };

    set({ schedule: reconciled, optimisticWriteAt: Date.now() });
    // No API call — this is intentionally local-only for smooth drag feedback.
  },

  // ── commitMove ────────────────────────────────────────────────────────────
  commitMove(from, to, preDragSnapshot) {
    if (from === to || from < 0 || to < 0) return;

    const recipeToMove = preDragSnapshot[from].recipe;
    if (!recipeToMove?.id) return;

    // BS-10: Deterministic Move API using RecipeId instead of fromIndex.
    moveRecipeApi(get().weekOffset, recipeToMove.id, to).catch(() =>
      set({ schedule: preDragSnapshot, optimisticWriteAt: null })
    );
  },

  // ── moveRecipe ────────────────────────────────────────────────────────────
  /** @deprecated Use reorderLocally + commitMove instead. Kept for callers outside the planner page. */
  moveRecipe(from, to) {
    const prev = get().schedule;
    if (from === to || from < 0 || to < 0) return;

    const recipeToMove = prev[from].recipe;
    if (!recipeToMove?.id) return;

    get().reorderLocally(from, to, prev);

    // BS-10: Deterministic Move API using RecipeId instead of fromIndex.
    moveRecipeApi(get().weekOffset, recipeToMove.id, to).catch(() => set({ schedule: prev }));
  },

  // ── openVoting ────────────────────────────────────────────────────────────
  async openVoting() {
    const prevStatus = get().status;
    const prevSchedule = get().schedule;
    set({ status: 1 });
    try {
      await openVotingApi(get().weekOffset);
      // Fetch defaults immediately so they appear without waiting for the next sync
      if (get().weekOffset === 0) {
        const [scheduleData, defaultsData] = await Promise.all([
          getSchedule(0),
          getSmartDefaults(0),
        ]);
        if (scheduleData) {
          set({ schedule: buildScheduleDays(scheduleData, defaultsData, get().schedule) });
        }
      }
    } catch {
      set({ status: prevStatus, schedule: prevSchedule });
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
          schedule: buildScheduleDays(
            data,
            get().weekOffset === 0 && status === 1 ? await getSmartDefaults(0) : undefined,
            get().schedule
          ),
          status,
          lastSyncedAt: Date.now(),
        });
      } else {
        // Protect optimistic schedule; still update status (authoritative)
        set({
          status,
          balanceSummary: data.balanceSummary ?? null,
          lastSyncedAt: Date.now(),
        });
      }
    } catch {
      // silent
    } finally {
      set({ isLoading: false });
    }
  },

  // ── applySnapshot ─────────────────────────────────────────────────────────
  applySnapshot(schedule: ScheduleDays, echoSeq?: number) {
    const plannerStore = usePlannerStore.getState();

    // If the server echoed back a move sequence number, this event is our own
    // response — confirm it and skip the schedule update (our optimistic state
    // is already correct). Still fall through for non-move SSE events (no echoSeq).
    if (echoSeq !== undefined) {
      plannerStore.confirmMoveSeq(echoSeq);
      const refreshedPlannerStore = usePlannerStore.getState();
      const deferredSnapshot = refreshedPlannerStore.deferredWeekSnapshot;
      if (
        deferredSnapshot &&
        !refreshedPlannerStore.isDragActive &&
        refreshedPlannerStore.localMoveSeq === refreshedPlannerStore.confirmedMoveSeq
      ) {
        refreshedPlannerStore.setDeferredWeekSnapshot(null);
        get().applySnapshot(deferredSnapshot);
      }
      return;
    }

    // Another family member's update — only apply when we have no unconfirmed
    // moves in flight. This replaces the wall-clock window entirely.
    const hasPendingMoves =
      plannerStore.localMoveSeq > plannerStore.confirmedMoveSeq || plannerStore.isDragActive;

    // Authoritative status update (always apply)
    const nextStatus = (schedule.status ?? 0) as 0 | 1 | 2;

    if (hasPendingMoves) {
      plannerStore.setDeferredWeekSnapshot(schedule);
      set({ status: nextStatus, lastSyncedAt: Date.now() });
      return;
    }

    if (plannerStore.deferredWeekSnapshot) {
      plannerStore.setDeferredWeekSnapshot(null);
    }

    const mergedDays = buildScheduleDays(schedule, undefined, get().schedule);
    const prev = get().schedule;

    // Preserve smart-defaults metadata for pending slots that the snapshot does not
    // have a server-assigned recipe for. Without this, a reconnect strips all
    // _isPending/_voteCount/_unanimousVote fields, causing visible flicker on the planner.
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
      if (snapshotIsEmpty && prevDay?.recipe) {
        return { ...day, recipe: prevDay.recipe, status: prevDay.status ?? day.status };
      }
      return day;
    });

    const incomingGroceryState = schedule.groceryState?.additionalData as
      | Record<string, boolean>
      | undefined;

    set({
      schedule: preserved,
      status:
        snapshotIsEmpty && prev.length > 0 ? get().status : ((schedule.status ?? 0) as 0 | 1 | 2),
      balanceSummary: schedule.balanceSummary ?? null,
      groceryItems: schedule.groceryItems ?? [],
      lastSyncedAt: Date.now(),
    });

    if (incomingGroceryState && typeof incomingGroceryState === 'object') {
      usePlannerStore.getState().setGroceryState(incomingGroceryState);
    }
  },

  // ── applySlotUpdate ───────────────────────────────────────────────────────
  applySlotUpdate({ date, recipe, status }: { date: string; recipe: any; status: number }) {
    const prev = get().schedule;
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
    const prev = get().schedule;
    const defaultsByDayIndex = new Map(
      defaults.preSelectedRecipes?.map((r) => [r.dayIndex, r]) ?? []
    );

    const next = prev.map((d, index) => {
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
