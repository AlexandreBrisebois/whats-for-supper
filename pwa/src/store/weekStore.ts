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
import type { ScheduleRecipeDto } from '@/lib/api/generated/models';
import type { ScheduleDay } from '@/lib/api/planner';

// Re-export the type so the planner page can import it from here
export type UILocalScheduleDay = Omit<ScheduleDay, 'recipe'> & {
  recipe?: ScheduleRecipeDto | null;
  _uiId: string;
  _isPending?: boolean;
  _voteCount?: number | null;
  _unanimousVote?: boolean | null;
  _userCleared?: boolean;
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
  moveRecipe: (from: number, to: number) => void;
  openVoting: () => Promise<void>;
  closeVoting: () => Promise<void>;
  lockWeek: () => Promise<void>;
  sync: () => Promise<void>;
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
      const unwrapped = 'data' in day.recipe ? day.recipe.data : day.recipe;
      return { ...day, recipe: unwrapped, _uiId: generateUiId() };
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
      const [scheduleData, defaultsData] = await Promise.all([
        getSchedule(weekOffset),
        weekOffset === 0 ? getSmartDefaults(weekOffset) : Promise.resolve(null),
      ]);

      if (!scheduleData) {
        set({ isLoading: false });
        return;
      }

      const mergedDays = buildScheduleDays(scheduleData, defaultsData ?? undefined);
      const status = ((scheduleData as any).status ?? 0) as 0 | 1 | 2;

      // Restore persisted grocery state from API if present
      const serverGroceryState =
        (scheduleData as any).groceryState ?? (scheduleData as any).additionalData?.groceryState;
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

  // ── moveRecipe ────────────────────────────────────────────────────────────
  moveRecipe(from, to) {
    const prev = get().schedule;
    const next = [...prev];
    // Swap recipes, keep day/date fixed at their indices
    const fromRecipe = next[from].recipe;
    next[from] = { ...next[from], recipe: next[to].recipe };
    next[to] = { ...next[to], recipe: fromRecipe };
    set({ schedule: next, optimisticWriteAt: Date.now() });
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
}));
