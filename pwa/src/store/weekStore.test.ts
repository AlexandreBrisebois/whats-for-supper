import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWeekStore } from './weekStore';
import type { UILocalScheduleDay } from './weekStore';
import { usePlannerStore } from './plannerStore';

vi.mock('@/lib/api/planner', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/planner')>();
  return {
    ...actual,
    assignRecipeToDay: vi.fn(),
    lockSchedule: vi.fn(),
    openVoting: vi.fn(),
    getSchedule: vi.fn(),
    getSmartDefaults: vi.fn(),
  };
});

import {
  assignRecipeToDay,
  getSchedule,
  getSmartDefaults,
  lockSchedule,
  openVoting,
} from '@/lib/api/planner';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeDay(overrides: Partial<UILocalScheduleDay> = {}): UILocalScheduleDay {
  return {
    date: '2025-01-06',
    day: 'Mon',
    recipe: undefined,
    _uiId: 'test-ui-id',
    ...overrides,
  };
}

function makeScheduleDays(days: Partial<UILocalScheduleDay>[] = []) {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return {
    weekOffset: 0,
    locked: false,
    status: 0,
    days: days.map((d, i) => ({
      date: d.date ?? `2025-01-0${i + 6}`,
      day: d.day ?? dayNames[i % 7],
      recipe: d.recipe ?? null,
    })),
  } as any;
}

// ─── Reset store before each test ────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  useWeekStore.setState({
    weekOffset: 0,
    schedule: [],
    status: 0,
    isLoading: false,
    lastSyncedAt: null,
    optimisticWriteAt: null,
  });
  usePlannerStore.setState({
    groceryState: {},
    localMoveSeq: 0,
    confirmedMoveSeq: 0,
    isDragActive: false,
    deferredWeekSnapshot: null,
  });
});

// ─── applySnapshot ────────────────────────────────────────────────────────────

describe('weekStore — applySnapshot', () => {
  it('ignores a snapshot for a different week', () => {
    const nextWeekDay = makeDay({ date: '2025-01-13' });
    useWeekStore.setState({ weekOffset: 1, schedule: [nextWeekDay] });

    useWeekStore.getState().applySnapshot(makeScheduleDays([{ date: '2025-01-06' }]));

    expect(useWeekStore.getState().schedule).toEqual([nextWeekDay]);
  });

  it('updates schedule from server snapshot', () => {
    const recipe = { id: 'r1', name: 'Pasta', image: '/img/r1', voteCount: 0 };
    const snapshot = makeScheduleDays([{ date: '2025-01-06', recipe }]);

    useWeekStore.getState().applySnapshot(snapshot);

    const state = useWeekStore.getState();
    expect(state.schedule).toHaveLength(1);
    expect(state.schedule[0].recipe?.id).toBe('r1');
    expect(state.optimisticWriteAt).toBeNull();
    expect(state.lastSyncedAt).not.toBeNull();
  });

  it('preserves _isPending metadata when snapshot has no recipe for that date', () => {
    const pendingRecipe = {
      id: 'pending-1',
      name: 'Smart Default',
      image: '/img/p1',
      voteCount: 2,
    };

    // Seed the store with a pending slot
    useWeekStore.setState({
      schedule: [
        makeDay({
          date: '2025-01-06',
          recipe: pendingRecipe as any,
          _isPending: true,
          _voteCount: 2,
          _unanimousVote: false,
        }),
      ],
    });

    // Snapshot from server has no recipe for that date (empty slot)
    const snapshot = makeScheduleDays([{ date: '2025-01-06', recipe: null }]);

    useWeekStore.getState().applySnapshot(snapshot);

    const state = useWeekStore.getState();
    expect(state.schedule[0]._isPending).toBe(true);
    expect(state.schedule[0]._voteCount).toBe(2);
    expect(state.schedule[0]._unanimousVote).toBe(false);
    expect(state.schedule[0].recipe?.id).toBe('pending-1');
  });

  it('does NOT preserve _isPending when snapshot has a real recipe for that date', () => {
    const pendingRecipe = {
      id: 'pending-1',
      name: 'Smart Default',
      image: '/img/p1',
      voteCount: 2,
    };
    const serverRecipe = { id: 'server-1', name: 'Server Recipe', image: '/img/s1', voteCount: 0 };

    useWeekStore.setState({
      schedule: [
        makeDay({
          date: '2025-01-06',
          recipe: pendingRecipe as any,
          _isPending: true,
          _voteCount: 2,
        }),
      ],
    });

    const snapshot = makeScheduleDays([{ date: '2025-01-06', recipe: serverRecipe }]);

    useWeekStore.getState().applySnapshot(snapshot);

    const state = useWeekStore.getState();
    expect(state.schedule[0].recipe?.id).toBe('server-1');
    // _isPending is not set by buildScheduleDays for a real recipe
    expect(state.schedule[0]._isPending).toBeUndefined();
  });

  it('applies snapshot when no pending moves (localMoveSeq === confirmedMoveSeq)', () => {
    // Both seq counters equal — no move in flight, snapshot should apply
    usePlannerStore.setState({ localMoveSeq: 3, confirmedMoveSeq: 3 });

    const snapshot = makeScheduleDays([{ date: '2025-01-06', recipe: { id: 'new' } as any }]);
    useWeekStore.getState().applySnapshot(snapshot);

    expect(useWeekStore.getState().schedule[0].recipe?.id).toBe('new');
  });

  it('skips schedule update when there are pending unconfirmed moves', () => {
    const initialSchedule = [makeDay({ date: '2025-01-06', _uiId: 'old' })];
    useWeekStore.setState({ schedule: initialSchedule });
    // localMoveSeq ahead of confirmed — one move in flight
    usePlannerStore.setState({ localMoveSeq: 5, confirmedMoveSeq: 4 });

    const snapshot = makeScheduleDays([{ date: '2025-01-06', recipe: { id: 'new' } as any }]);
    useWeekStore.getState().applySnapshot(snapshot);

    expect(useWeekStore.getState().schedule).toBe(initialSchedule); // not clobbered
  });

  it('skips schedule update while a local drag is active but still applies status', () => {
    const initialSchedule = [makeDay({ date: '2025-01-06', _uiId: 'old' })];
    useWeekStore.setState({ schedule: initialSchedule, status: 0 });
    usePlannerStore.setState({ isDragActive: true, localMoveSeq: 0, confirmedMoveSeq: 0 });

    const snapshot = makeScheduleDays([{ date: '2025-01-06', recipe: { id: 'new' } as any }]);
    snapshot.status = 1;

    useWeekStore.getState().applySnapshot(snapshot);

    expect(useWeekStore.getState().schedule).toBe(initialSchedule);
    expect(useWeekStore.getState().status).toBe(1);
  });

  it('skips update and confirms seq when echoSeq matches own move', () => {
    const initialSchedule = [makeDay({ date: '2025-01-06', _uiId: 'old' })];
    useWeekStore.setState({ schedule: initialSchedule });
    usePlannerStore.setState({ localMoveSeq: 7, confirmedMoveSeq: 6 });

    const snapshot = makeScheduleDays([{ date: '2025-01-06', recipe: { id: 'new' } as any }]);
    useWeekStore.getState().applySnapshot(snapshot, 7);

    // Schedule unchanged — this was our own echo
    expect(useWeekStore.getState().schedule).toBe(initialSchedule);
    // Sequence confirmed
    expect(usePlannerStore.getState().confirmedMoveSeq).toBe(7);
  });

  it('flushes a deferred remote snapshot after confirming the local move echo', () => {
    const initialSchedule = [makeDay({ date: '2025-01-06', _uiId: 'old' })];
    useWeekStore.setState({ schedule: initialSchedule });

    const deferredSnapshot = makeScheduleDays([
      { date: '2025-01-06', recipe: { id: 'queued-remote' } as any },
    ]);

    usePlannerStore.setState({
      localMoveSeq: 8,
      confirmedMoveSeq: 7,
      deferredWeekSnapshot: deferredSnapshot,
      isDragActive: false,
    });

    const ownEchoSnapshot = makeScheduleDays([
      { date: '2025-01-06', recipe: { id: 'local' } as any },
    ]);
    useWeekStore.getState().applySnapshot(ownEchoSnapshot, 8);

    expect(usePlannerStore.getState().confirmedMoveSeq).toBe(8);
    expect(usePlannerStore.getState().deferredWeekSnapshot).toBeNull();
    expect(useWeekStore.getState().schedule[0].recipe?.id).toBe('queued-remote');
  });

  it('applySnapshot sets groceryState atomically — same tick as schedule', () => {
    // Arrange: snapshot carries groceryState in additionalData (Kiota AdditionalDataHolder pattern)
    const snapshot = {
      ...makeScheduleDays([{ date: '2025-01-06', recipe: null }]),
      groceryState: {
        additionalData: { Carrots: true, Onions: false },
      },
    } as any;

    // Track the order of state updates
    const updateOrder: string[] = [];
    const unsubWeek = useWeekStore.subscribe(() => updateOrder.push('week'));
    const unsubPlanner = usePlannerStore.subscribe(() => updateOrder.push('planner'));

    useWeekStore.getState().applySnapshot(snapshot);

    unsubWeek();
    unsubPlanner();

    // Both stores must have been updated
    expect(useWeekStore.getState().schedule).toHaveLength(1);
    expect(usePlannerStore.getState().groceryState).toEqual({ Carrots: true, Onions: false });

    // Both updates must have fired (week first, then planner — same synchronous tick)
    expect(updateOrder).toContain('week');
    expect(updateOrder).toContain('planner');
    // week update fires before planner (schedule set before groceryState)
    expect(updateOrder.indexOf('week')).toBeLessThan(updateOrder.indexOf('planner'));
  });

  it('applySnapshot does not call setGroceryState when groceryState is absent', () => {
    const setGrocerySpy = vi.spyOn(usePlannerStore.getState(), 'setGroceryState');

    const snapshot = makeScheduleDays([{ date: '2025-01-06', recipe: null }]);
    // No groceryState field on snapshot
    useWeekStore.getState().applySnapshot(snapshot);

    expect(setGrocerySpy).not.toHaveBeenCalled();
    setGrocerySpy.mockRestore();
  });
});

// ─── applySlotUpdate ──────────────────────────────────────────────────────────

describe('weekStore — applySlotUpdate', () => {
  it('updates matching day with new recipe and status', () => {
    useWeekStore.setState({
      schedule: [
        makeDay({ date: '2025-01-06', recipe: undefined }),
        makeDay({ date: '2025-01-07', recipe: undefined }),
      ],
    });

    const recipe = { id: 'r1', name: 'Pasta', image: '/img/r1', voteCount: 0 };
    useWeekStore.getState().applySlotUpdate({ date: '2025-01-06', recipe, status: 1 });

    const state = useWeekStore.getState();
    expect(state.schedule[0].recipe?.id).toBe('r1');
    expect(state.schedule[0].status).toBe(1);
    // Other day unchanged
    expect(state.schedule[1].recipe).toBeUndefined();
  });

  it('is a no-op when schedule is [] (BS-2 pre-init SSE event drop)', () => {
    useWeekStore.setState({ schedule: [] });

    const recipe = { id: 'r1', name: 'Pasta', image: '/img/r1', voteCount: 0 };
    useWeekStore.getState().applySlotUpdate({ date: '2025-01-06', recipe, status: 1 });

    expect(useWeekStore.getState().schedule).toHaveLength(0);
  });

  it('is a no-op when date is not in current week', () => {
    const existingRecipe = { id: 'r-existing', name: 'Existing', image: '/img/e', voteCount: 0 };
    useWeekStore.setState({
      schedule: [makeDay({ date: '2025-01-06', recipe: existingRecipe as any })],
    });

    const newRecipe = { id: 'r-new', name: 'New', image: '/img/n', voteCount: 0 };
    // Date not in current week
    useWeekStore.getState().applySlotUpdate({ date: '2025-02-10', recipe: newRecipe, status: 1 });

    // Schedule unchanged
    expect(useWeekStore.getState().schedule[0].recipe?.id).toBe('r-existing');
  });

  it('clears recipe when recipe is null', () => {
    const existingRecipe = { id: 'r1', name: 'Pasta', image: '/img/r1', voteCount: 0 };
    useWeekStore.setState({
      schedule: [makeDay({ date: '2025-01-06', recipe: existingRecipe as any })],
    });

    useWeekStore.getState().applySlotUpdate({ date: '2025-01-06', recipe: null, status: 0 });

    expect(useWeekStore.getState().schedule[0].recipe).toBeUndefined();
  });
});

// ─── applyVoteUpdate ──────────────────────────────────────────────────────────

describe('weekStore — applyVoteUpdate', () => {
  it('updates voteCount on matching recipe', () => {
    const recipe = { id: 'r1', name: 'Pasta', image: '/img/r1', voteCount: 1 };
    useWeekStore.setState({
      schedule: [
        makeDay({ date: '2025-01-06', recipe: recipe as any }),
        makeDay({ date: '2025-01-07', recipe: undefined }),
      ],
    });

    useWeekStore.getState().applyVoteUpdate({ recipeId: 'r1', voteCount: 3 });

    const state = useWeekStore.getState();
    expect(state.schedule[0].recipe?.voteCount).toBe(3);
    // Other day unchanged
    expect(state.schedule[1].recipe).toBeUndefined();
  });

  it('is a no-op when recipeId does not match any day', () => {
    const recipe = { id: 'r1', name: 'Pasta', image: '/img/r1', voteCount: 1 };
    useWeekStore.setState({
      schedule: [makeDay({ date: '2025-01-06', recipe: recipe as any })],
    });

    useWeekStore.getState().applyVoteUpdate({ recipeId: 'r-unknown', voteCount: 99 });

    expect(useWeekStore.getState().schedule[0].recipe?.voteCount).toBe(1);
  });
});

// ─── applySmartDefaultsUpdate ─────────────────────────────────────────────────

describe('weekStore — applySmartDefaultsUpdate', () => {
  it('merges pre-selected recipes into pending slots', () => {
    useWeekStore.setState({
      schedule: [
        makeDay({ date: '2025-01-06', recipe: undefined }),
        makeDay({ date: '2025-01-07', recipe: undefined }),
      ],
    });

    const defaults = {
      weekOffset: 0,
      familySize: 4,
      consensusThreshold: 3,
      consensusRecipesCount: 1,
      openSlots: [],
      preSelectedRecipes: [
        {
          dayIndex: 0,
          recipeId: 'smart-1',
          name: 'Smart Pasta',
          heroImageUrl: '/img/smart-1',
          voteCount: 3,
          unanimousVote: false,
          isLocked: false,
        },
      ],
    } as any;

    useWeekStore.getState().applySmartDefaultsUpdate(defaults);

    const state = useWeekStore.getState();
    expect(state.schedule[0].recipe?.id).toBe('smart-1');
    expect(state.schedule[0].recipe?.name).toBe('Smart Pasta');
    expect(state.schedule[0]._isPending).toBe(true);
    expect(state.schedule[0]._voteCount).toBe(3);
    // Day 1 unchanged
    expect(state.schedule[1].recipe).toBeUndefined();
  });

  it('does not overwrite confirmed (non-pending) slots', () => {
    const confirmedRecipe = {
      id: 'confirmed-1',
      name: 'Confirmed Meal',
      image: '/img/c1',
      voteCount: 0,
    };
    useWeekStore.setState({
      schedule: [
        // Confirmed slot: has recipe, _isPending is falsy
        makeDay({ date: '2025-01-06', recipe: confirmedRecipe as any, _isPending: false }),
      ],
    });

    const defaults = {
      weekOffset: 0,
      familySize: 4,
      consensusThreshold: 3,
      consensusRecipesCount: 1,
      openSlots: [],
      preSelectedRecipes: [
        {
          dayIndex: 0,
          recipeId: 'smart-1',
          name: 'Smart Pasta',
          heroImageUrl: '/img/smart-1',
          voteCount: 3,
          unanimousVote: false,
          isLocked: false,
        },
      ],
    } as any;

    useWeekStore.getState().applySmartDefaultsUpdate(defaults);

    // Confirmed slot must not be overwritten
    const state = useWeekStore.getState();
    expect(state.schedule[0].recipe?.id).toBe('confirmed-1');
    expect(state.schedule[0]._isPending).toBe(false);
  });

  it('clears a pending slot when its recipe drops below threshold (not in defaults)', () => {
    const pendingRecipe = { id: 'pending-1', name: 'Pending Meal', image: '/img/p1', voteCount: 1 };
    useWeekStore.setState({
      schedule: [
        makeDay({
          date: '2025-01-06',
          recipe: pendingRecipe as any,
          _isPending: true,
          _voteCount: 1,
          _unanimousVote: false,
        }),
      ],
    });

    // Empty preSelectedRecipes — recipe dropped below threshold
    const defaults = {
      weekOffset: 0,
      familySize: 4,
      consensusThreshold: 3,
      consensusRecipesCount: 0,
      openSlots: [],
      preSelectedRecipes: [],
    } as any;

    useWeekStore.getState().applySmartDefaultsUpdate(defaults);

    const state = useWeekStore.getState();
    expect(state.schedule[0].recipe).toBeUndefined();
    expect(state.schedule[0]._isPending).toBe(false);
    expect(state.schedule[0]._voteCount).toBeNull();
    expect(state.schedule[0]._unanimousVote).toBeNull();
  });
});

// ─── closeVoting ─────────────────────────────────────────────────────────────

describe('weekStore — closeVoting', () => {
  it('promotes pending suggestions to official assignments before locking', async () => {
    const mockedAssign = vi.mocked(assignRecipeToDay);
    const mockedLock = vi.mocked(lockSchedule);

    mockedAssign.mockResolvedValue({ success: true } as any);
    mockedLock.mockResolvedValue({ success: true } as any);

    const pendingRecipe = { id: 'p1', name: 'Pasta', image: '/img/p1', voteCount: 2 };
    const confirmedRecipe = { id: 'c1', name: 'Curry', image: '/img/c1', voteCount: 0 };

    useWeekStore.setState({
      weekOffset: 0,
      status: 1, // Voting Open
      schedule: [
        makeDay({ date: '2025-01-06', recipe: pendingRecipe as any, _isPending: true }),
        makeDay({ date: '2025-01-07', recipe: confirmedRecipe as any, _isPending: false }),
        makeDay({ date: '2025-01-08', recipe: undefined }), // empty
      ],
    });

    await useWeekStore.getState().closeVoting();

    // Should have called assignRecipeToDay for the pending item ONLY
    expect(mockedAssign).toHaveBeenCalledTimes(1);
    expect(mockedAssign).toHaveBeenCalledWith(0, 0, expect.objectContaining({ id: 'p1' }));

    // Should have called lockSchedule AFTER assignments
    expect(mockedLock).toHaveBeenCalledTimes(1);
    expect(mockedLock).toHaveBeenCalledWith(0);

    // Status should be 2 (Locked)
    expect(useWeekStore.getState().status).toBe(2);
  });
});

describe('weekStore — active voting week smart-defaults regression (red)', () => {
  it('ignores an older init response after navigation to another week', async () => {
    const mockedGetSchedule = vi.mocked(getSchedule);
    let resolveCurrentWeek!: (value: ReturnType<typeof makeScheduleDays>) => void;
    const currentWeekResponse = new Promise<ReturnType<typeof makeScheduleDays>>((resolve) => {
      resolveCurrentWeek = resolve;
    });
    const nextWeekSchedule = makeScheduleDays([{ date: '2025-01-13' }]);
    nextWeekSchedule.weekOffset = 1;

    mockedGetSchedule
      .mockReturnValueOnce(currentWeekResponse as any)
      .mockResolvedValueOnce(nextWeekSchedule as any);

    const currentWeekInit = useWeekStore.getState().init(0);
    await useWeekStore.getState().init(1);
    resolveCurrentWeek(makeScheduleDays([{ date: '2025-01-06' }]));
    await currentWeekInit;

    expect(useWeekStore.getState().weekOffset).toBe(1);
    expect(useWeekStore.getState().schedule[0]?.date).toBe('2025-01-13');
  });

  it('init(1) with status=1 requests getSmartDefaults(1), not getSmartDefaults(0)', async () => {
    const mockedGetSchedule = vi.mocked(getSchedule);
    const mockedGetSmartDefaults = vi.mocked(getSmartDefaults);

    const scheduleData = makeScheduleDays([{ date: '2025-01-06', recipe: null }]);
    scheduleData.status = 1;
    scheduleData.weekOffset = 1;

    mockedGetSchedule.mockResolvedValue(scheduleData as any);
    mockedGetSmartDefaults.mockResolvedValue({
      weekOffset: 1,
      preSelectedRecipes: [],
      openSlots: [],
    } as any);

    await useWeekStore.getState().init(1);

    expect(mockedGetSchedule).toHaveBeenCalledWith(1);
    expect(mockedGetSmartDefaults).toHaveBeenCalledWith(1);
    expect(mockedGetSmartDefaults).not.toHaveBeenCalledWith(0);
  });

  it('openVoting() at weekOffset=1 requests getSchedule(1) and getSmartDefaults(1), not week 0', async () => {
    const mockedOpenVoting = vi.mocked(openVoting);
    const mockedGetSchedule = vi.mocked(getSchedule);
    const mockedGetSmartDefaults = vi.mocked(getSmartDefaults);

    useWeekStore.setState({ weekOffset: 1, status: 0, schedule: [makeDay()] });

    const scheduleData = makeScheduleDays([{ date: '2025-01-06', recipe: null }]);
    scheduleData.status = 1;
    scheduleData.weekOffset = 1;

    mockedOpenVoting.mockResolvedValue({ success: true } as any);
    mockedGetSchedule.mockResolvedValue(scheduleData as any);
    mockedGetSmartDefaults.mockResolvedValue({
      weekOffset: 1,
      preSelectedRecipes: [],
      openSlots: [],
    } as any);

    await useWeekStore.getState().openVoting();

    expect(mockedOpenVoting).toHaveBeenCalledWith(1);
    expect(mockedGetSchedule).toHaveBeenCalledWith(1);
    expect(mockedGetSmartDefaults).toHaveBeenCalledWith(1);
    expect(mockedGetSchedule).not.toHaveBeenCalledWith(0);
    expect(mockedGetSmartDefaults).not.toHaveBeenCalledWith(0);
  });

  it('sync() at weekOffset=1 with status=1 requests getSmartDefaults(1), not getSmartDefaults(0)', async () => {
    const mockedGetSchedule = vi.mocked(getSchedule);
    const mockedGetSmartDefaults = vi.mocked(getSmartDefaults);

    useWeekStore.setState({ weekOffset: 1, schedule: [makeDay()], optimisticWriteAt: null });

    const scheduleData = makeScheduleDays([{ date: '2025-01-06', recipe: null }]);
    scheduleData.status = 1;
    scheduleData.weekOffset = 1;

    mockedGetSchedule.mockResolvedValue(scheduleData as any);
    mockedGetSmartDefaults.mockResolvedValue({
      weekOffset: 1,
      preSelectedRecipes: [],
      openSlots: [],
    } as any);

    await useWeekStore.getState().sync();

    expect(mockedGetSchedule).toHaveBeenCalledWith(1);
    expect(mockedGetSmartDefaults).toHaveBeenCalledWith(1);
    expect(mockedGetSmartDefaults).not.toHaveBeenCalledWith(0);
  });
});

describe('weekStore — applySmartDefaultsUpdate week guard', () => {
  it('applies smart defaults when defaults.weekOffset matches current weekOffset', () => {
    useWeekStore.setState({
      weekOffset: 1,
      schedule: [makeDay({ date: '2025-01-06', day: 'Mon' })],
    });

    useWeekStore.getState().applySmartDefaultsUpdate({
      weekOffset: 1,
      preSelectedRecipes: [
        {
          dayIndex: 0,
          recipeId: 'r1',
          name: 'Pasta',
          heroImageUrl: '/api/recipes/r1/hero',
          voteCount: 3,
          familySize: 4,
          unanimousVote: false,
          isLocked: false,
        },
      ],
      openSlots: [],
      familySize: 4,
      consensusThreshold: 3,
      consensusRecipesCount: 1,
    } as any);

    const state = useWeekStore.getState();
    expect(state.schedule[0]._isPending).toBe(true);
    expect(state.schedule[0].recipe?.id).toBe('r1');
  });

  it('ignores smart defaults when defaults.weekOffset differs from current weekOffset', () => {
    useWeekStore.setState({
      weekOffset: 0,
      schedule: [makeDay({ date: '2025-01-06', day: 'Mon' })],
    });

    useWeekStore.getState().applySmartDefaultsUpdate({
      weekOffset: 1,
      preSelectedRecipes: [
        {
          dayIndex: 0,
          recipeId: 'r1',
          name: 'Pasta',
          heroImageUrl: '/api/recipes/r1/hero',
          voteCount: 3,
          familySize: 4,
          unanimousVote: false,
          isLocked: false,
        },
      ],
      openSlots: [],
      familySize: 4,
      consensusThreshold: 3,
      consensusRecipesCount: 1,
    } as any);

    const state = useWeekStore.getState();
    expect(state.schedule[0]._isPending).toBeUndefined();
    expect(state.schedule[0].recipe).toBeUndefined();
  });
});
