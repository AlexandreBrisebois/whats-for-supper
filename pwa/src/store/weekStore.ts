import { create } from 'zustand';
import {
  readCalendar,
  absoluteMonday,
  weekOffsetFor,
  calendarTime,
  type CalendarContext,
} from '@/lib/deployment-calendar';
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
import { useDiscoveryStore } from '@/store/discoveryStore';
import type {
  GroceryLineItemDto,
  GroceryExtraDto,
  ScheduleRecipeDto,
  SmartDefaultsDto,
  NonCookingPlanDto,
} from '@/lib/api/generated/models';
import type { ScheduleDay } from '@/lib/api/planner';
import type { ScheduleDays } from '@/lib/api/generated/models';
import type { GrocerySection } from '@/lib/grocery/aisleMapper';

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
  calendar: CalendarContext | null;
  weekStartDate: string | null;
  votingRoundId: string | null;
  weekOffset: number;
  schedule: UILocalScheduleDay[];
  /** Pre-computed grocery items from the API, grouped by section for display */
  groceryItems: GroceryLineItemDto[];
  /** Identity-bearing household-entered rows, kept separate from recipe groceries. */
  groceryExtras: GroceryExtraDto[];
  pendingGroceryExtraIds: Set<string>;
  /** 0 = Draft, 1 = VotingOpen, 2 = Locked — seeded from WeeklyPlan.Status */
  status: 0 | 1 | 2;
  isLoading: boolean;
  lastSyncedAt: number | null;
  /**
   * Timestamp (ms) of the most recent optimistic write.
   * sync() will not overwrite schedule while this is within the 10-second window.
   */
  optimisticWriteAt: number | null;
  optimisticWeekStartDate: string | null;

  // Derived (not stored):
  // isVotingOpen = status === 1
  // isLocked     = status === 2

  // Actions
  init: (weekOffset: number, referenceWeekStartDate?: string) => Promise<void>;
  assignRecipe: (
    dayIndex: number,
    recipe: { id: string; name: string | null; image: string },
    target?: { weekOffset: number; referenceWeekStartDate?: string }
  ) => Promise<void>;
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
  reclassifyGroceryItem: (normalizedKey: string, section: GrocerySection) => void;
  upsertGroceryExtra: (extra: GroceryExtraDto) => void;
  removeGroceryExtra: (id: string) => void;
  setGroceryExtraPending: (id: string, pending: boolean) => void;
  applyGroceryExtrasUpdate: (weekStartDate: string, extras: GroceryExtraDto[]) => void;

  // SSE-driven actions
  applySnapshot: (schedule: ScheduleDays, echoSeq?: number) => void;
  applySlotUpdate: (update: {
    date: string;
    recipe: any;
    status: number;
    nonCooking?: NonCookingPlanDto | null;
  }) => void;
  applyVoteUpdate: (update: { recipeId: string; voteCount: number }) => void;
  applySmartDefaultsUpdate: (defaults: SmartDefaultsDto) => void;
}

// ─── Helper ─────────────────────────────────────────────────────────────────

const generateUiId = (): string =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(7);

const reconcileExtras = (
  existing: GroceryExtraDto[],
  incoming: GroceryExtraDto[],
  pending: Set<string>,
  selectedWeek: string | null,
  currentWeek: string | null
) => {
  // Checked incoming rows still carry a version that can lose to a newer unchecked row.
  const eligibleIncoming = eligibleExtras(incoming, selectedWeek, currentWeek, true).filter(
    (item) => !item.id || !pending.has(item.id)
  );
  const byId = new Map(eligibleIncoming.filter((item) => item.id).map((item) => [item.id!, item]));
  const preserved = eligibleExtras(existing, selectedWeek, currentWeek).filter((item) => {
    if (!item.id) return true;
    if (pending.has(item.id)) return true;
    const next = byId.get(item.id);
    return next !== undefined && (item.version ?? 0) > (next.version ?? 0);
  });
  const ids = new Set(preserved.map((item) => item.id));
  return eligibleExtras(
    [...preserved, ...eligibleIncoming.filter((item) => !ids.has(item.id))],
    selectedWeek,
    currentWeek
  );
};

const extraIsEligibleForView = (
  extra: GroceryExtraDto,
  selectedWeek: string | null,
  currentWeek: string | null,
  includeChecked = false
) => {
  const selected = absoluteMonday(selectedWeek);
  const current = absoluteMonday(currentWeek);
  const occurrence = absoluteMonday(String(extra.occurrenceWeekStartDate ?? ''));
  if (!selected || !current || !occurrence) return false;
  if (occurrence === selected && selected <= current) return true;
  return selected > current && occurrence === current && (includeChecked || !extra.checked);
};

const eligibleExtras = (
  extras: GroceryExtraDto[],
  selectedWeek: string | null,
  currentWeek: string | null,
  includeChecked = false
) =>
  extras.filter((extra) =>
    extraIsEligibleForView(extra, selectedWeek, currentWeek, includeChecked)
  );

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
  const session = useDiscoveryStore.getState().session;
  if (
    session?.smartDefaults &&
    absoluteMonday(session.weekStartDate) === absoluteMonday(scheduleData.weekStartDate)
  )
    defaultsData =
      scheduleData.status === 1 && session.roundId === scheduleData.votingRoundId
        ? session.smartDefaults
        : undefined;

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

    if (day.status === 3)
      return { ...day, recipe: undefined, _isPending: false, _uiId: stableUiId };
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

export const useWeekStore = create<WeekState>((set, get) => {
  let loadingFrame = 0;
  const applyOwnedSession = () => {
    const session = useDiscoveryStore.getState().session;
    if (
      get().status === 1 &&
      session?.smartDefaults &&
      session.roundId === get().votingRoundId &&
      absoluteMonday(session.weekStartDate) === get().weekStartDate
    )
      get().applySmartDefaultsUpdate(session.smartDefaults);
  };
  return {
    calendar: null,
    weekStartDate: null,
    votingRoundId: null,
    weekOffset: 0,
    schedule: [],
    groceryItems: [],
    groceryExtras: [],
    pendingGroceryExtraIds: new Set(),
    status: 0,
    isLoading: false,
    lastSyncedAt: null,
    optimisticWriteAt: null,
    optimisticWeekStartDate: null,

    // ── init ──────────────────────────────────────────────────────────────────
    async init(weekOffset, referenceWeekStartDate) {
      const frame = ++loadingFrame;
      const initialStatus = get().status;
      const initialRound = get().votingRoundId;
      const initialSession = useDiscoveryStore.getState().session;
      set({ weekOffset, isLoading: true });
      try {
        const scheduleData = await getSchedule(weekOffset, referenceWeekStartDate);

        if (get().weekOffset !== weekOffset || loadingFrame !== frame) return;

        if (!scheduleData) {
          set({ isLoading: false });
          return;
        }

        const calendar = readCalendar(scheduleData.calendar);
        const weekStartDate = absoluteMonday(scheduleData.weekStartDate);
        if (!calendar || !weekStartDate) return;
        if (
          get().calendar?.timeZone === calendar.timeZone &&
          get().calendar!.today > calendar.today
        )
          return;
        const status = (scheduleData.status ?? 0) as 0 | 1 | 2;

        // Smart defaults are only fetched when voting is open (status === 1).
        // Loading them unconditionally pre-fills the planner before mom has asked
        // the family — breaking the Ask → Vote → Lock flow entirely.
        // When status === 0 (draft), the planner starts blank and mom controls it.
        // When status === 1 (voting open), the family's votes surface as pending suggestions.
        const candidateDefaults =
          status === 1 ? await getSmartDefaults(weekOffset, calendar.referenceWeekStartDate) : null;
        const defaultsData =
          candidateDefaults && absoluteMonday(candidateDefaults.weekStartDate) === weekStartDate
            ? candidateDefaults
            : null;
        if (candidateDefaults && !absoluteMonday(candidateDefaults.weekStartDate))
          void get().sync();

        if (get().weekOffset !== weekOffset || loadingFrame !== frame) return;

        const session = useDiscoveryStore.getState().session;
        if (
          (get().status !== initialStatus && get().status !== status) ||
          (get().votingRoundId !== initialRound &&
            get().votingRoundId !== (scheduleData.votingRoundId ?? null)) ||
          (session !== initialSession &&
            status === 1 &&
            session &&
            (session.phase === 'unowned' || session.roundId !== scheduleData.votingRoundId))
        )
          return;

        const mergedDays = buildScheduleDays(
          scheduleData,
          defaultsData ?? undefined,
          get().schedule
        );

        // Restore persisted grocery state from API if present.
        // groceryState is a Kiota AdditionalDataHolder — the actual key/value pairs
        // live in .additionalData (typed as Record<string, unknown> by Kiota).
        const serverGroceryState = scheduleData.groceryState?.additionalData as
          Record<string, boolean> | undefined;
        if (serverGroceryState && typeof serverGroceryState === 'object') {
          usePlannerStore.getState().setGroceryState(serverGroceryState);
        }

        set({
          calendar,
          weekStartDate,
          ...(get().weekStartDate !== weekStartDate
            ? { optimisticWriteAt: null, optimisticWeekStartDate: null }
            : {}),
          votingRoundId: scheduleData.votingRoundId ?? null,
          schedule: mergedDays,
          groceryItems: scheduleData.groceryItems ?? [],
          groceryExtras: reconcileExtras(
            get().groceryExtras,
            scheduleData.groceryExtras ?? [],
            get().pendingGroceryExtraIds,
            weekStartDate,
            calendar.currentWeekStartDate
          ),
          status,
          lastSyncedAt: calendarTime.instant(),
          isLoading: false,
        });
      } catch {
        // Existing initialization failure leaves the current schedule available.
      } finally {
        if (loadingFrame === frame && get().weekOffset === weekOffset) set({ isLoading: false });
      }
    },

    // ── assignRecipe ──────────────────────────────────────────────────────────
    async assignRecipe(dayIndex, recipe, target) {
      const { calendar } = get();
      const reference = target?.referenceWeekStartDate ?? calendar?.referenceWeekStartDate;
      if (!reference) throw new Error("Could not confirm today's date. Try again.");
      const weekOffset = target?.weekOffset ?? get().weekOffset;
      const weekStartDate = new Date(
        Date.parse(`${reference}T00:00:00Z`) + weekOffset * 7 * 86400000
      )
        .toISOString()
        .slice(0, 10);
      const prev = get().schedule;
      const next = prev.map((d, i) =>
        i === dayIndex
          ? {
              ...d,
              status: 0,
              nonCooking: null,
              recipe: {
                id: recipe.id,
                name: recipe.name ?? '',
                image: recipe.image,
              } as ScheduleRecipeDto,
            }
          : d
      );
      if (get().weekStartDate === weekStartDate)
        set({
          schedule: next,
          optimisticWriteAt: calendarTime.elapsed(),
          optimisticWeekStartDate: get().weekStartDate,
        });
      try {
        await assignRecipeToDay(weekOffset, dayIndex, recipe, reference);
        const data = await getSchedule(weekOffset, reference);
        if (!data || get().weekStartDate !== weekStartDate) return;

        set({
          groceryItems: data.groceryItems ?? [],
          groceryExtras: reconcileExtras(
            get().groceryExtras,
            data.groceryExtras ?? [],
            get().pendingGroceryExtraIds,
            weekStartDate,
            get().calendar?.currentWeekStartDate ?? null
          ),
          status: (data.status ?? 0) as 0 | 1 | 2,
          lastSyncedAt: calendarTime.instant(),
        });
      } catch {
        if (get().weekStartDate === weekStartDate) set({ schedule: prev });
        throw new Error('Failed to assign recipe');
      }
    },

    // ── removeRecipe ──────────────────────────────────────────────────────────
    removeRecipe(dayIndex, date) {
      const prev = get().schedule;
      const prevGroceryItems = get().groceryItems;
      const recipeId = prev[dayIndex]?.recipe?.id;
      const removedRecipeId = typeof recipeId === 'string' ? recipeId : undefined;
      const next = prev.map((d, i) =>
        i === dayIndex
          ? {
              ...d,
              status: 0,
              nonCooking: null,
              recipe: undefined,
              _isPending: false,
              _userCleared: true,
            }
          : d
      );
      set({
        schedule: next,
        groceryItems: removeRecipeFromGroceryItems(prevGroceryItems, removedRecipeId),
        optimisticWriteAt: calendarTime.elapsed(),
        optimisticWeekStartDate: get().weekStartDate,
      });
      removeRecipeFromDay(date).catch(() =>
        set({ schedule: prev, groceryItems: prevGroceryItems })
      );
    },

    // ── reorderLocally ────────────────────────────────────────────────────────
    reorderLocally(from, to, baseSchedule) {
      const prev = baseSchedule ?? get().schedule;
      if (from < 0 || to < 0) return;

      if (from === to) {
        if (baseSchedule) {
          set({
            schedule: [...baseSchedule],
            optimisticWriteAt: calendarTime.elapsed(),
            optimisticWeekStartDate: get().weekStartDate,
          });
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

      set({
        schedule: reconciled,
        optimisticWriteAt: calendarTime.elapsed(),
        optimisticWeekStartDate: get().weekStartDate,
      });
      // No API call — this is intentionally local-only for smooth drag feedback.
    },

    // ── commitMove ────────────────────────────────────────────────────────────
    commitMove(from, to, preDragSnapshot) {
      if (from === to || from < 0 || to < 0) return;

      const recipeToMove = preDragSnapshot[from].recipe;
      if (!recipeToMove?.id) return;

      // Identify the source slot too: the same recipe may be scheduled more than once.
      moveRecipeApi(
        get().weekOffset,
        recipeToMove.id,
        to,
        from,
        get().calendar?.referenceWeekStartDate
      ).catch(() => set({ schedule: preDragSnapshot, optimisticWriteAt: null }));
    },

    // ── moveRecipe ────────────────────────────────────────────────────────────
    /** @deprecated Use reorderLocally + commitMove instead. Kept for callers outside the planner page. */
    moveRecipe(from, to) {
      const prev = get().schedule;
      if (from === to || from < 0 || to < 0) return;

      const recipeToMove = prev[from].recipe;
      if (!recipeToMove?.id) return;

      get().reorderLocally(from, to, prev);

      // Identify the source slot too: the same recipe may be scheduled more than once.
      moveRecipeApi(
        get().weekOffset,
        recipeToMove.id,
        to,
        from,
        get().calendar?.referenceWeekStartDate
      ).catch(() => set({ schedule: prev }));
    },

    // ── openVoting ────────────────────────────────────────────────────────────
    async openVoting() {
      const { weekOffset, calendar, weekStartDate } = get();
      if (!calendar) throw new Error("Could not confirm today's date. Try again.");
      const reference = calendar.referenceWeekStartDate;
      try {
        await openVotingApi(weekOffset, reference);
        const operationRound = get().votingRoundId;
        const operationStatus = get().status;
        const operationSession = useDiscoveryStore.getState().session;
        // Fetch defaults immediately so they appear without waiting for the next sync

        const [scheduleData, defaultsData] = await Promise.all([
          getSchedule(weekOffset, reference),
          getSmartDefaults(weekOffset, reference),
        ]);
        if (
          scheduleData &&
          absoluteMonday(scheduleData.weekStartDate) === weekStartDate &&
          get().weekStartDate === weekStartDate &&
          (get().votingRoundId === operationRound ||
            get().votingRoundId === (scheduleData.votingRoundId ?? null)) &&
          (get().status === operationStatus || get().status === scheduleData.status)
        ) {
          const session = useDiscoveryStore.getState().session;
          if (
            session !== operationSession &&
            session &&
            (session.phase === 'unowned' || session.roundId !== scheduleData.votingRoundId)
          )
            return;
          if (scheduleData.status !== 1) {
            get().applySnapshot(scheduleData);
            return;
          }
          const defaults =
            absoluteMonday(defaultsData?.weekStartDate) === weekStartDate
              ? defaultsData
              : undefined;
          set({
            status: 1,
            votingRoundId: scheduleData.votingRoundId ?? null,
            schedule: buildScheduleDays(scheduleData, defaults, get().schedule),
          });
        }
      } catch {
        void useDiscoveryStore.getState().refreshSession();
        throw new Error('Failed to open voting');
      }
    },

    // ── closeVoting ───────────────────────────────────────────────────────────
    async closeVoting() {
      const { weekOffset, calendar, weekStartDate, votingRoundId } = get();
      if (!calendar) throw new Error("Could not confirm today's date. Try again.");
      const reference = calendar.referenceWeekStartDate;
      const prevStatus = get().status;
      const schedule = get().schedule;

      // AC-1: Suggestion Promotion
      // Identify slots with pending suggestions that need to be committed
      const pendingSlots = schedule
        .map((slot, index) => ({ slot, index }))
        .filter(({ slot }) => slot.status !== 3 && slot._isPending && slot.recipe?.id);

      set({ status: 2 });

      try {
        // Captured targets are guarded and saved one at a time to avoid self-contention.
        for (const { slot, index } of pendingSlots) {
          await assignRecipeToDay(
            weekOffset,
            index,
            {
              id: slot.recipe!.id!,
              name: slot.recipe!.name ?? null,
              image: slot.recipe!.image ?? '',
            },
            reference,
            true
          );
        }

        // Existing round-aware lock follows successful suggestion promotions.
        await lockSchedule(weekOffset, reference, ...(votingRoundId ? [votingRoundId] : []));
        // Own schedule echoes are excluded; session state may already have withdrawn saved suggestions.
        const confirmed = pendingSlots.length
          ? await getSchedule(weekOffset, reference).catch(() => undefined)
          : undefined;
        if (
          get().weekOffset === weekOffset &&
          get().weekStartDate === weekStartDate &&
          get().votingRoundId === votingRoundId
        ) {
          const saved =
            confirmed?.status === 2 &&
            confirmed.votingRoundId === votingRoundId &&
            absoluteMonday(confirmed.weekStartDate) === weekStartDate
              ? confirmed
              : undefined;
          set({
            schedule: saved
              ? buildScheduleDays(saved, undefined, get().schedule)
              : get().schedule.map((day) => (day._isPending ? { ...day, _isPending: false } : day)),
          });
        }
      } catch {
        // Persistence can succeed before publication or the HTTP response fails.
        // Recover only this captured round, never a newer close for the same week.
        const confirmed = await getSchedule(weekOffset, reference).catch(() => undefined);
        void useDiscoveryStore.getState().refreshSession();
        if (
          votingRoundId &&
          confirmed?.votingRoundId === votingRoundId &&
          confirmed.status === 2 &&
          absoluteMonday(confirmed.weekStartDate) === weekStartDate
        ) {
          if (get().weekStartDate === weekStartDate && get().votingRoundId === votingRoundId)
            set({ status: 2, schedule: buildScheduleDays(confirmed, undefined, get().schedule) });
          return;
        }
        if (get().weekStartDate === weekStartDate && get().votingRoundId === votingRoundId) {
          set({
            status: prevStatus,
            ...(confirmed
              ? { schedule: buildScheduleDays(confirmed, undefined, get().schedule) }
              : {}),
          });
          applyOwnedSession();
        }
        throw new Error('Failed to close voting');
      }
    },

    // ── lockWeek ──────────────────────────────────────────────────────────────
    async lockWeek() {
      const { weekOffset, calendar, weekStartDate, votingRoundId } = get();
      if (!calendar) throw new Error("Could not confirm today's date. Try again.");
      const reference = calendar.referenceWeekStartDate;
      const prev = get().status;
      set({ status: 2 });
      try {
        await lockSchedule(weekOffset, reference, ...(votingRoundId ? [votingRoundId] : []));
      } catch {
        const confirmed = await getSchedule(weekOffset, reference).catch(() => undefined);
        void useDiscoveryStore.getState().refreshSession();
        if (
          votingRoundId &&
          confirmed?.votingRoundId === votingRoundId &&
          confirmed.status === 2 &&
          absoluteMonday(confirmed.weekStartDate) === weekStartDate
        ) {
          if (get().weekStartDate === weekStartDate && get().votingRoundId === votingRoundId)
            set({ status: 2, schedule: buildScheduleDays(confirmed, undefined, get().schedule) });
          return;
        }
        if (get().weekStartDate === weekStartDate && get().votingRoundId === votingRoundId)
          set({ status: prev });
        throw new Error('Failed to lock week');
      }
    },

    // ── sync ──────────────────────────────────────────────────────────────────
    async sync() {
      const { weekOffset, calendar, weekStartDate } = get();
      const initialStatus = get().status;
      const initialSession = useDiscoveryStore.getState().session;
      const initialRound = get().votingRoundId;
      set({ isLoading: true });
      try {
        const data = await getSchedule(weekOffset, calendar?.referenceWeekStartDate);
        if (
          !data ||
          get().weekOffset !== weekOffset ||
          get().weekStartDate !== weekStartDate ||
          (get().status !== initialStatus && get().status !== data.status) ||
          (get().votingRoundId !== initialRound &&
            get().votingRoundId !== (data.votingRoundId ?? null))
        )
          return;
        const monday = absoluteMonday(data.weekStartDate);
        const context = readCalendar(data.calendar);
        if (!monday || !context || (weekStartDate && monday !== weekStartDate)) return;
        if (get().calendar?.timeZone === context.timeZone && get().calendar!.today > context.today)
          return;
        set({
          calendar: context,
          weekStartDate: monday,
          votingRoundId: data.votingRoundId ?? null,
          groceryItems: data.groceryItems ?? [],
          groceryExtras: reconcileExtras(
            get().groceryExtras,
            data.groceryExtras ?? [],
            get().pendingGroceryExtraIds,
            monday,
            context.currentWeekStartDate
          ),
        });

        const { optimisticWriteAt } = get();
        const optimisticIsRecent =
          optimisticWriteAt !== null &&
          calendarTime.elapsed() - optimisticWriteAt >= 0 &&
          calendarTime.elapsed() - optimisticWriteAt < 10_000 &&
          get().optimisticWeekStartDate === get().weekStartDate;

        const status = ((data as any).status ?? 0) as 0 | 1 | 2;

        if (!optimisticIsRecent) {
          const defaultsData =
            status === 1
              ? await getSmartDefaults(weekOffset, context.referenceWeekStartDate)
              : undefined;
          const session = useDiscoveryStore.getState().session;
          if (
            get().weekStartDate !== monday ||
            get().votingRoundId !== (data.votingRoundId ?? null) ||
            (get().status !== initialStatus && get().status !== status) ||
            (session !== initialSession &&
              status === 1 &&
              session &&
              (session.phase === 'unowned' || session.roundId !== data.votingRoundId))
          )
            return;
          const defaults =
            defaultsData && absoluteMonday(defaultsData.weekStartDate) === monday
              ? defaultsData
              : undefined;
          set({
            schedule: buildScheduleDays(data, defaults, get().schedule),
            status,
            lastSyncedAt: calendarTime.instant(),
          });
        } else {
          // Protect optimistic schedule; still update status (authoritative)
          set({
            status,
            lastSyncedAt: calendarTime.instant(),
          });
        }
      } catch {
        // silent
      } finally {
        set({ isLoading: false });
      }
    },

    reclassifyGroceryItem(normalizedKey, section) {
      set((state) => ({
        groceryItems: state.groceryItems.map((item) =>
          item.normalizedKey === normalizedKey && item.section !== section
            ? { ...item, section }
            : item
        ),
      }));
    },

    upsertGroceryExtra(extra) {
      if (!extra.id) return;
      set((state) => {
        if (
          !extraIsEligibleForView(
            extra,
            state.weekStartDate,
            state.calendar?.currentWeekStartDate ?? null
          )
        )
          return state;
        const existing = state.groceryExtras.find((item) => item.id === extra.id);
        if ((existing?.version ?? -1) > (extra.version ?? -1)) return state;
        return {
          groceryExtras: existing
            ? state.groceryExtras.map((item) => (item.id === extra.id ? extra : item))
            : [...state.groceryExtras, extra],
        };
      });
    },

    removeGroceryExtra(id) {
      set((state) => ({ groceryExtras: state.groceryExtras.filter((item) => item.id !== id) }));
    },

    setGroceryExtraPending(id, pending) {
      set((state) => {
        const next = new Set(state.pendingGroceryExtraIds);
        if (pending) next.add(id);
        else next.delete(id);
        return { pendingGroceryExtraIds: next };
      });
    },

    applyGroceryExtrasUpdate(occurrenceWeek, extras) {
      const state = get();
      const selected = absoluteMonday(state.weekStartDate);
      const current = absoluteMonday(state.calendar?.currentWeekStartDate);
      if (!selected || !current || !absoluteMonday(occurrenceWeek)) {
        void state.sync();
        return;
      }
      const eligible = occurrenceWeek === current && selected >= current;
      if (!eligible) return;
      if (
        extras.some(
          (extra) =>
            !extra.id ||
            !absoluteMonday(String(extra.occurrenceWeekStartDate ?? '')) ||
            absoluteMonday(String(extra.occurrenceWeekStartDate ?? '')) !== occurrenceWeek
        )
      ) {
        void state.sync();
        return;
      }
      set((latest) => ({
        groceryExtras: reconcileExtras(
          latest.groceryExtras,
          extras,
          latest.pendingGroceryExtraIds,
          selected,
          current
        ),
      }));
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
        if (!absoluteMonday(schedule.weekStartDate)) void get().sync();
        return;
      }

      const monday = absoluteMonday(schedule.weekStartDate);
      if (!monday) {
        void get().sync();
        return;
      }
      if (!get().weekStartDate) {
        const context = readCalendar(schedule.calendar);
        if (!context || weekOffsetFor(monday, context.referenceWeekStartDate) !== get().weekOffset)
          return;
        set({ calendar: context, weekStartDate: monday });
      }
      if (
        monday !== get().weekStartDate ||
        weekOffsetFor(monday, get().calendar?.referenceWeekStartDate) !== get().weekOffset
      )
        return;

      // Another family member's update — only apply when we have no unconfirmed
      // moves in flight. This replaces the wall-clock window entirely.
      const hasPendingMoves =
        plannerStore.localMoveSeq > plannerStore.confirmedMoveSeq || plannerStore.isDragActive;

      // Authoritative status update (always apply)
      const nextStatus = (schedule.status ?? 0) as 0 | 1 | 2;
      const previousRound = get().votingRoundId;
      set({ votingRoundId: schedule.votingRoundId ?? null });

      if (hasPendingMoves) {
        plannerStore.setDeferredWeekSnapshot(schedule);
        set({ status: nextStatus, lastSyncedAt: calendarTime.instant() });
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
        if (day.recipe || day.status === 3) return day; // persisted recipe or non-cooking plan
        const prevDay = prev.find((p) => p.date === day.date);
        if (
          prevDay?._isPending &&
          nextStatus !== 2 &&
          previousRound === (schedule.votingRoundId ?? null)
        ) {
          return {
            ...day,
            recipe: prevDay.recipe,
            _isPending: prevDay._isPending,
            _voteCount: prevDay._voteCount,
            _unanimousVote: prevDay._unanimousVote,
          };
        }
        if (snapshotIsEmpty && prevDay?.recipe && !prevDay._isPending) {
          return { ...day, recipe: prevDay.recipe, status: prevDay.status ?? day.status };
        }
        return day;
      });

      const incomingGroceryState = (schedule.groceryState?.additionalData ??
        schedule.groceryState) as Record<string, boolean> | undefined;

      const reconciledExtras = reconcileExtras(
        get().groceryExtras,
        schedule.groceryExtras ?? [],
        get().pendingGroceryExtraIds,
        monday,
        get().calendar?.currentWeekStartDate ?? null
      );

      set({
        schedule: preserved,
        status: nextStatus,
        groceryItems: schedule.groceryItems ?? [],
        groceryExtras: reconciledExtras,
        lastSyncedAt: calendarTime.instant(),
      });

      applyOwnedSession();
      if (incomingGroceryState && typeof incomingGroceryState === 'object') {
        usePlannerStore.getState().setGroceryState(incomingGroceryState);
      }
    },

    // ── applySlotUpdate ───────────────────────────────────────────────────────
    applySlotUpdate({
      date,
      recipe,
      status,
      nonCooking,
    }: {
      date: string;
      recipe: any;
      status: number;
      nonCooking?: NonCookingPlanDto | null;
    }) {
      const prev = get().schedule;
      if (prev.length === 0) return;
      const inCurrentWeek = prev.some((d) => d.date === date);
      if (!inCurrentWeek) return;
      const next = prev.map((d) =>
        d.date === date
          ? {
              ...d,
              recipe: recipe ?? undefined,
              status,
              nonCooking: status === 3 ? (nonCooking ?? null) : null,
              _isPending: false,
            }
          : d
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
      const monday = absoluteMonday(defaults.weekStartDate);
      if (!monday) {
        void get().sync();
        return;
      }
      if (
        monday !== get().weekStartDate ||
        weekOffsetFor(monday, get().calendar?.referenceWeekStartDate) !== get().weekOffset
      )
        return;

      const prev = get().schedule;
      const defaultsByDayIndex = new Map(
        defaults.preSelectedRecipes?.map((r) => [r.dayIndex, r]) ?? []
      );

      const next = prev.map((d, index) => {
        if (d.status === 3 || (d.recipe && !d._isPending)) return d;

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
  };
});
