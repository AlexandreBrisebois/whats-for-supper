import { calendarTime } from '@/lib/deployment-calendar';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWeekStore } from './weekStore';
import type { UILocalScheduleDay } from './weekStore';
import { usePlannerStore } from './plannerStore';
import { useDiscoveryStore } from './discoveryStore';
vi.mock('@/lib/api/discovery', () => ({
  getVotingSession: vi.fn().mockRejectedValue(new Error('unavailable')),
}));
import { builders } from '@/testing/builders';

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

const calendar = {
  timeZone: 'UTC',
  today: '2025-01-06',
  capturedAtUtc: '2025-01-06T12:00:00Z',
  currentWeekStartDate: '2025-01-06',
  referenceWeekStartDate: '2025-01-06',
  nextDayAtUtc: '2025-01-07T00:00:00Z',
};

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
    calendar,
    weekStartDate: '2025-01-06',
    votingRoundId: null,
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
  useDiscoveryStore.setState({ session: null, sessionStatus: 'unknown' });
  useWeekStore.setState({
    calendar,
    weekStartDate: '2025-01-06',
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
    optimisticWeekStartDate: '2025-01-06',
  });
  usePlannerStore.setState({
    groceryState: {},
    localMoveSeq: 0,
    confirmedMoveSeq: 0,
    isDragActive: false,
    deferredWeekSnapshot: null,
  });
});

describe('weekStore — grocery extra identity and version', () => {
  it('reconciles current extras into the next-week view without overwriting newer or pending rows', () => {
    const current = '2026-10-19';
    const older = builders.groceryExtra({
      id: '11111111-1111-4111-8111-111111111111',
      occurrenceWeekStartDate: current as any,
      version: 5,
    });
    const pending = builders.groceryExtra({
      id: '22222222-2222-4222-8222-222222222222',
      occurrenceWeekStartDate: current as any,
      version: 1,
    });
    useWeekStore.setState({
      weekStartDate: '2026-10-26',
      calendar: { currentWeekStartDate: current, referenceWeekStartDate: current } as any,
      groceryExtras: [older, pending],
      pendingGroceryExtraIds: new Set([pending.id!]),
    });

    useWeekStore.getState().applyGroceryExtrasUpdate(current, [
      { ...older, name: 'Stale', version: 4 },
      { ...pending, name: 'Server value', version: 2 },
      builders.groceryExtra({
        id: '33333333-3333-4333-8333-333333333333',
        occurrenceWeekStartDate: current as any,
        version: 1,
      }),
    ]);

    expect(useWeekStore.getState().groceryExtras.map((item) => item.name)).toEqual([
      older.name,
      pending.name,
      'Coffee',
    ]);
  });
  it('retains an outstanding current occurrence when navigating two weeks ahead', async () => {
    const extra = builders.groceryExtra({ occurrenceWeekStartDate: '2025-01-06' as any });
    useWeekStore.setState({
      groceryExtras: [extra],
      pendingGroceryExtraIds: new Set([extra.id!]),
      weekOffset: 2,
    });
    vi.mocked(getSchedule).mockResolvedValue({
      ...makeScheduleDays(),
      weekOffset: 2,
      weekStartDate: '2025-01-20',
      groceryExtras: [],
    });
    await useWeekStore.getState().init(2);
    expect(useWeekStore.getState().weekStartDate).toBe('2025-01-20');
    expect(useWeekStore.getState().groceryExtras).toEqual([extra]);
  });

  it('upserts by occurrence identity without allowing an older response to win', () => {
    const base = {
      id: '11111111-1111-4111-8111-111111111111' as any,
      name: 'Coffee',
      version: 5,
      occurrenceWeekStartDate: '2025-01-06' as any,
    };
    useWeekStore.setState({ groceryExtras: [base] });
    useWeekStore.getState().upsertGroceryExtra({ ...base, name: 'Old coffee', version: 4 });
    expect(useWeekStore.getState().groceryExtras[0]?.name).toBe('Coffee');
    useWeekStore.getState().upsertGroceryExtra({ ...base, name: 'Beans', version: 6 });
    expect(useWeekStore.getState().groceryExtras[0]?.name).toBe('Beans');
  });

  it('removes only the selected duplicate occurrence', () => {
    useWeekStore.setState({
      groceryExtras: [
        { id: '11111111-1111-4111-8111-111111111111' as any, name: 'Milk', version: 1 },
        { id: '22222222-2222-4222-8222-222222222222' as any, name: 'Milk', version: 1 },
      ],
    });
    useWeekStore.getState().removeGroceryExtra('11111111-1111-4111-8111-111111111111');
    expect(useWeekStore.getState().groceryExtras.map((item) => item.id)).toEqual([
      '22222222-2222-4222-8222-222222222222',
    ]);
  });

  it('does not resurrect a pending optimistic deletion from a snapshot', () => {
    const extra = {
      id: '11111111-1111-4111-8111-111111111111' as any,
      name: 'Milk',
      version: 1,
      checked: false,
      occurrenceWeekStartDate: '2025-01-06' as any,
    };
    useWeekStore.setState({ groceryExtras: [], pendingGroceryExtraIds: new Set([extra.id]) });
    useWeekStore.getState().applyGroceryExtrasUpdate('2025-01-06', [extra]);
    expect(useWeekStore.getState().groceryExtras).toEqual([]);
  });

  it('removes checked current occurrences from the immediately-next-week projection', () => {
    const extra = {
      id: '11111111-1111-4111-8111-111111111111' as any,
      name: 'Milk',
      version: 1,
      checked: false,
      occurrenceWeekStartDate: '2025-01-06' as any,
    };
    useWeekStore.setState({ weekStartDate: '2025-01-13', weekOffset: 1, groceryExtras: [extra] });
    useWeekStore
      .getState()
      .applyGroceryExtrasUpdate('2025-01-06', [{ ...extra, checked: true, version: 2 }]);
    expect(useWeekStore.getState().groceryExtras).toEqual([]);
  });

  it('refreshes instead of guessing when an event item lacks occurrence identity', () => {
    const originalSync = useWeekStore.getState().sync;
    const sync = vi.fn().mockResolvedValue(undefined);
    useWeekStore.setState({ sync });
    try {
      useWeekStore
        .getState()
        .applyGroceryExtrasUpdate('2025-01-06', [
          { name: 'Unidentified', occurrenceWeekStartDate: '2025-01-06' as any } as any,
        ]);

      expect(sync).toHaveBeenCalledOnce();
      expect(useWeekStore.getState().groceryExtras).toEqual([]);
    } finally {
      useWeekStore.setState({ sync: originalSync });
    }
  });
});

describe('weekStore — assignment rollback', () => {
  it.each(['closeVoting', 'lockWeek'] as const)(
    'does not roll back a newly viewed week after failed %s',
    async (action) => {
      let rejectClose!: (reason: Error) => void;
      vi.mocked(lockSchedule).mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectClose = reject;
          })
      );
      vi.mocked(getSchedule).mockResolvedValue(makeScheduleDays([]));
      const pending = useWeekStore.getState()[action]();
      await Promise.resolve();
      useWeekStore.setState({ weekOffset: 1, weekStartDate: '2025-01-13', status: 1 });
      rejectClose(new Error('Lost old response'));
      await expect(pending).rejects.toThrow();
      expect(useWeekStore.getState().status).toBe(1);
      expect(useWeekStore.getState().weekStartDate).toBe('2025-01-13');
    }
  );

  it('recovers a committed close after publication or response failure', async () => {
    const data = makeScheduleDays([]);
    data.status = 1;
    data.votingRoundId = '01111111-1111-4111-8111-111111111111';
    vi.mocked(getSchedule)
      .mockResolvedValueOnce(data)
      .mockResolvedValue({ ...data, status: 2, locked: true });
    vi.mocked(getSmartDefaults).mockResolvedValue(null);
    vi.mocked(lockSchedule).mockRejectedValueOnce(new Error('Lost response'));
    await useWeekStore.getState().init(0);
    const refresh = vi
      .spyOn(useDiscoveryStore.getState(), 'refreshSession')
      .mockResolvedValue(undefined);
    try {
      await expect(useWeekStore.getState().closeVoting()).resolves.toBeUndefined();
      expect(useWeekStore.getState().status).toBe(2);
      expect(refresh).toHaveBeenCalled();
    } finally {
      refresh.mockRestore();
    }
  });

  it('closes using the round identity captured with the loaded schedule', async () => {
    const data = makeScheduleDays([]);
    data.status = 1;
    data.votingRoundId = '01111111-1111-4111-8111-111111111111';
    vi.mocked(getSchedule).mockResolvedValue(data);
    vi.mocked(getSmartDefaults).mockResolvedValue(null);
    await useWeekStore.getState().init(0);
    await useWeekStore.getState().closeVoting();
    expect(lockSchedule).toHaveBeenCalledWith(0, '2025-01-06', data.votingRoundId);
  });

  it('restores the optimistic slot when assignment fails', async () => {
    const existingDay = makeDay({ _uiId: 'existing-day' });
    useWeekStore.setState({ schedule: [existingDay] });
    vi.mocked(assignRecipeToDay).mockRejectedValue(new Error('assignment failed'));

    await expect(
      useWeekStore.getState().assignRecipe(0, {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Replacement recipe',
        image: '',
      })
    ).rejects.toThrow('Failed to assign recipe');

    expect(useWeekStore.getState().schedule).toEqual([existingDay]);
  });
});

describe('weekStore — grocery reclassification', () => {
  it('immutably replaces only the matching item section by normalizedKey', () => {
    const tomato = {
      displayName: 'Tomato',
      normalizedKey: 'tomato',
      section: 'Produce',
      quantity: 2,
      unitText: 'each',
      recipeIds: ['recipe-1'],
      additionalData: {},
    };
    const rice = {
      displayName: 'Rice',
      normalizedKey: 'rice',
      section: 'Pantry',
      quantity: 1,
      unitText: 'bag',
      recipeIds: ['recipe-2'],
      additionalData: {},
    };
    const previous = [tomato, rice];
    useWeekStore.setState({ groceryItems: previous });

    useWeekStore.getState().reclassifyGroceryItem('tomato', 'Pantry');

    const next = useWeekStore.getState().groceryItems;
    expect(next).not.toBe(previous);
    expect(next).toEqual([{ ...tomato, section: 'Pantry' }, rice]);
    expect(next[0]).not.toBe(tomato);
    expect(next[1]).toBe(rice);
  });

  it('lets an authoritative snapshot overwrite a locally reclassified section', () => {
    const item = {
      displayName: 'Tomato',
      normalizedKey: 'tomato',
      section: 'Produce',
      additionalData: {},
    };
    useWeekStore.setState({ groceryItems: [item] });
    useWeekStore.getState().reclassifyGroceryItem('tomato', 'Pantry');

    useWeekStore.getState().applySnapshot({
      ...makeScheduleDays([]),
      groceryItems: [{ ...item, section: 'Grocery' }],
    } as any);

    expect(useWeekStore.getState().groceryItems[0].section).toBe('Grocery');
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

  it('clears prior checks from an empty generated-client dictionary', () => {
    usePlannerStore.setState({ groceryState: { Old: true } });
    useWeekStore.getState().applySnapshot({
      ...makeScheduleDays(),
      groceryState: { additionalData: {} },
    });
    expect(usePlannerStore.getState().groceryState).toEqual({});
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
      weekStartDate: '2025-01-06' as any,
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
      weekStartDate: '2025-01-06' as any,
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
      weekStartDate: '2025-01-06' as any,
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
      weekStartDate: '2025-01-06' as any,
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
    expect(mockedAssign).toHaveBeenCalledWith(
      0,
      0,
      expect.objectContaining({ id: 'p1' }),
      '2025-01-06',
      true
    );

    // Should have called lockSchedule AFTER assignments
    expect(mockedLock).toHaveBeenCalledTimes(1);
    expect(mockedLock).toHaveBeenCalledWith(0, '2025-01-06');

    // Status should be 2 (Locked)
    expect(useWeekStore.getState().status).toBe(2);
    expect(useWeekStore.getState().schedule[0]._isPending).toBe(false);
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
      weekStartDate: '2025-01-13' as any,
      preSelectedRecipes: [],
      openSlots: [],
    } as any);

    await useWeekStore.getState().init(1);

    expect(mockedGetSchedule).toHaveBeenCalledWith(1, undefined);
    expect(mockedGetSmartDefaults).toHaveBeenCalledWith(1, '2025-01-06');
    expect(mockedGetSmartDefaults).not.toHaveBeenCalledWith(0, expect.anything());
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
      weekStartDate: '2025-01-13' as any,
      preSelectedRecipes: [],
      openSlots: [],
    } as any);

    await useWeekStore.getState().openVoting();

    expect(mockedOpenVoting).toHaveBeenCalledWith(1, '2025-01-06');
    expect(mockedGetSchedule).toHaveBeenCalledWith(1, '2025-01-06');
    expect(mockedGetSmartDefaults).toHaveBeenCalledWith(1, '2025-01-06');
    expect(mockedGetSchedule).not.toHaveBeenCalledWith(0, expect.anything());
    expect(mockedGetSmartDefaults).not.toHaveBeenCalledWith(0, expect.anything());
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
      weekStartDate: '2025-01-13' as any,
      preSelectedRecipes: [],
      openSlots: [],
    } as any);

    await useWeekStore.getState().sync();

    expect(mockedGetSchedule).toHaveBeenCalledWith(1, '2025-01-06');
    expect(mockedGetSmartDefaults).toHaveBeenCalledWith(1, '2025-01-06');
    expect(mockedGetSmartDefaults).not.toHaveBeenCalledWith(0, expect.anything());
  });
});

describe('weekStore — applySmartDefaultsUpdate week guard', () => {
  it('applies smart defaults when defaults.weekOffset matches current weekOffset', () => {
    useWeekStore.setState({
      weekOffset: 1,
      calendar,
      weekStartDate: '2025-01-13',
      schedule: [makeDay({ date: '2025-01-06', day: 'Mon' })],
    });

    useWeekStore.getState().applySmartDefaultsUpdate({
      weekOffset: 1,
      weekStartDate: '2025-01-13' as any,
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
      weekStartDate: '2025-01-06' as any,
      schedule: [makeDay({ date: '2025-01-06', day: 'Mon' })],
    });

    useWeekStore.getState().applySmartDefaultsUpdate({
      weekOffset: 1,
      weekStartDate: '2025-01-13' as any,
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

it('keeps a skipped day occupied when stale smart defaults and snapshots arrive', async () => {
  const date = '2025-01-06';
  vi.mocked(getSchedule).mockResolvedValue({
    weekOffset: 0,
    weekStartDate: '2025-01-06' as any,
    calendar: {
      timeZone: 'UTC',
      today: date,
      capturedAtUtc: '2025-01-06T12:00:00Z',
      currentWeekStartDate: date,
      referenceWeekStartDate: date,
      nextDayAtUtc: '2025-01-07T00:00:00Z',
    } as any,
    status: 1,
    locked: false,
    days: [
      {
        date,
        day: 'Mon',
        status: 3,
        recipe: null,
        nonCooking: { kind: 'custom', customLabel: 'Supper at Grandma’s' },
      },
    ],
  });
  vi.mocked(getSmartDefaults).mockResolvedValue({
    weekOffset: 0,
    weekStartDate: '2025-01-06' as any,
    familySize: 3,
    consensusThreshold: 2,
    consensusRecipesCount: 0,
    openSlots: [],
    preSelectedRecipes: [
      { dayIndex: 0, recipeId: '550e8400-e29b-41d4-a716-446655440001', name: 'Pasta' },
    ],
  });
  await useWeekStore.getState().init(0);
  expect(useWeekStore.getState().schedule[0].recipe).toBeUndefined();
  useWeekStore.getState().applySmartDefaultsUpdate({
    weekOffset: 0,
    weekStartDate: '2025-01-06' as any,
    familySize: 3,
    consensusThreshold: 2,
    consensusRecipesCount: 0,
    openSlots: [],
    preSelectedRecipes: [{ dayIndex: 0, recipeId: '550e8400-e29b-41d4-a716-446655440001' }],
  });
  expect(useWeekStore.getState().schedule[0].recipe).toBeUndefined();
});

describe('weekStore deployment reference', () => {
  it('retains the loaded reference for assignment and its follow-up read', async () => {
    vi.mocked(getSchedule).mockResolvedValue({
      weekOffset: 1,
      weekStartDate: '2026-10-12',
      status: 0,
      calendar: {
        timeZone: 'America/Toronto',
        today: '2026-10-11',
        capturedAtUtc: '2026-10-12T01:30:00Z',
        currentWeekStartDate: '2026-10-05',
        referenceWeekStartDate: '2026-10-05',
        nextDayAtUtc: '2026-10-12T04:00:00Z',
      },
      days: [{ date: '2026-10-12', day: 'Mon', recipe: null }],
    } as any);
    vi.mocked(assignRecipeToDay).mockResolvedValue(undefined);
    await useWeekStore.getState().init(1);
    const recipe = { id: '660e8400-e29b-41d4-a716-446655440011', name: 'Monday', image: '' };
    await useWeekStore.getState().assignRecipe(0, recipe);
    expect(assignRecipeToDay).toHaveBeenCalledWith(1, 0, recipe, '2026-10-05');
    expect(getSchedule).toHaveBeenLastCalledWith(1, '2026-10-05');
  });
});

describe('weekStore absolute Monday identity', () => {
  const context = {
    timeZone: 'America/Toronto',
    today: '2026-10-12',
    capturedAtUtc: '2026-10-12T04:30:00Z',
    currentWeekStartDate: '2026-10-12',
    referenceWeekStartDate: '2026-10-12',
    nextDayAtUtc: '2026-10-13T04:00:00Z',
  };
  const current = {
    day: 'Mon',
    date: '2026-10-12',
    recipe: null,
    _uiId: 'current-monday',
    status: 0,
  };
  beforeEach(() =>
    useWeekStore.setState({
      weekOffset: 0,
      weekStartDate: '2026-10-12',
      calendar: context,
      schedule: [current],
    })
  );

  it('rejects an old October 5 snapshot despite offset zero', () => {
    useWeekStore.getState().applySnapshot({
      weekOffset: 0,
      weekStartDate: '2026-10-05',
      days: [{ day: 'Mon', date: '2026-10-05', recipe: mockRecipeForCalendar() }],
    } as any);
    expect(useWeekStore.getState().schedule[0].date).toBe('2026-10-12');
  });

  it('maps October 12 from another reference before checking numeric offsets', () => {
    useWeekStore.getState().applySnapshot({
      weekOffset: 1,
      weekStartDate: '2026-10-12',
      days: [{ day: 'Mon', date: '2026-10-12', recipe: mockRecipeForCalendar() }],
    } as any);
    expect(useWeekStore.getState().schedule[0].recipe?.id).toBe(
      '660e8400-e29b-41d4-a716-446655440011'
    );
  });

  it('refreshes a snapshot without identity instead of applying it to week zero', () => {
    const sync = vi.spyOn(useWeekStore.getState(), 'sync').mockResolvedValue(undefined);
    try {
      useWeekStore.getState().applySnapshot({
        weekOffset: 0,
        days: [{ day: 'Mon', date: '2026-10-05', recipe: mockRecipeForCalendar() }],
      } as any);
      expect(sync).toHaveBeenCalledOnce();
      expect(useWeekStore.getState().schedule[0].date).toBe('2026-10-12');
    } finally {
      sync.mockRestore();
    }
  });

  it('does not overlay old-week smart defaults onto a new Monday', () => {
    useWeekStore.getState().applySmartDefaultsUpdate({
      weekOffset: 0,
      weekStartDate: '2026-10-05',
      preSelectedRecipes: [
        { recipeId: '660e8400-e29b-41d4-a716-446655440011', name: 'Old candidate', dayIndex: 0 },
      ],
    } as any);
    expect(useWeekStore.getState().schedule[0].recipe).toBeFalsy();
  });
});

function mockRecipeForCalendar() {
  return { id: '660e8400-e29b-41d4-a716-446655440011', name: 'Pinned Monday', image: '' };
}

it('uses elapsed time for the loaded-week optimistic window', async () => {
  const { calendarTime } = await import('@/lib/deployment-calendar');
  const elapsed = vi.spyOn(calendarTime, 'elapsed').mockReturnValue(1500);
  const recipe = mockRecipeForCalendar();
  useWeekStore.setState({
    schedule: [makeDay({ recipe })],
    optimisticWriteAt: 1000,
    optimisticWeekStartDate: '2025-01-06',
  } as any);
  vi.mocked(getSchedule).mockResolvedValueOnce(makeScheduleDays([{ recipe: undefined }]));
  await useWeekStore.getState().sync();
  expect(useWeekStore.getState().schedule[0].recipe?.id).toBe(recipe.id);
  elapsed.mockRestore();
});

it('does not merge a delayed HTTP response after the loaded absolute week changes', async () => {
  let resolve!: (value: any) => void;
  vi.mocked(getSchedule).mockReturnValueOnce(
    new Promise((complete) => {
      resolve = complete;
    })
  );
  const pending = useWeekStore.getState().sync();
  useWeekStore.setState({
    weekOffset: 0,
    weekStartDate: '2026-10-12',
    schedule: [makeDay({ date: '2026-10-12' })],
  });
  resolve(makeScheduleDays([{ date: '2025-01-06' }]));
  await pending;
  expect(useWeekStore.getState().schedule[0].date).toBe('2026-10-12');
});

describe('session pending suggestion authority', () => {
  const session = (revision: number, recipes: any[] = []) =>
    ({
      incarnationId: '00000000-0000-4000-8000-000000000001',
      revision,
      roundId: '00000000-0000-4000-8000-000000000002',
      weekStartDate: '2025-01-06',
      phase: 'collecting',
      requiredSlots: 7,
      coveredSlots: recipes.length,
      candidateCount: recipes.length,
      smartDefaults: {
        weekStartDate: '2025-01-06',
        weekOffset: 0,
        preSelectedRecipes: recipes,
        openSlots: [],
      },
    }) as any;
  it('an obsolete initialization result cannot restore a withdrawn pending recipe', async () => {
    let resolve!: (value: any) => void;
    vi.mocked(getSchedule).mockResolvedValue({
      ...makeScheduleDays([{}]),
      status: 1,
      votingRoundId: '00000000-0000-4000-8000-000000000002',
    });
    vi.mocked(getSmartDefaults).mockReturnValue(
      new Promise((r) => {
        resolve = r;
      })
    );
    const init = useWeekStore.getState().init(0);
    await vi.waitFor(() => expect(getSmartDefaults).toHaveBeenCalled());
    useDiscoveryStore.getState().applySession(session(2), true);
    resolve({
      weekStartDate: '2025-01-06',
      preSelectedRecipes: [{ dayIndex: 0, recipeId: 'old', name: 'Old' }],
    });
    await init;
    expect(useWeekStore.getState().schedule[0].recipe).toBeUndefined();
  });
  it('an ordinary week snapshot cannot resurrect replaced pending suggestions', () => {
    useWeekStore.setState({
      status: 1,
      votingRoundId: '00000000-0000-4000-8000-000000000002',
      schedule: [makeDay({ recipe: { id: 'old' } as any, _isPending: true })],
    });
    useDiscoveryStore.getState().applySession(session(2), true);
    // An old snapshot contains no pending assignments; accepted session remains authoritative.
    useWeekStore.getState().applySnapshot({
      ...makeScheduleDays([{}]),
      status: 1,
      votingRoundId: '00000000-0000-4000-8000-000000000002',
    });
    expect(useWeekStore.getState().schedule[0].recipe).toBeUndefined();
  });
  it('reconciles successful promotions after another target conflicts, without locking', async () => {
    useWeekStore.setState({
      status: 1,
      schedule: [
        makeDay({ recipe: { id: 'a', name: 'A' } as any, _isPending: true }),
        makeDay({ date: '2025-01-07', recipe: { id: 'b', name: 'B' } as any, _isPending: true }),
      ],
    });
    vi.mocked(assignRecipeToDay)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('occupied'));
    const persisted = makeScheduleDays([
      { recipe: { id: 'a', name: 'A' } as any },
      { date: '2025-01-07' },
    ]);
    persisted.days[1] = {
      ...persisted.days[1],
      status: 3,
      nonCooking: { kind: 'custom', customLabel: 'Party' },
    };
    vi.mocked(getSchedule).mockResolvedValue({ ...persisted, status: 1 });
    await expect(useWeekStore.getState().closeVoting()).rejects.toThrow('Failed to close voting');
    expect(lockSchedule).not.toHaveBeenCalled();
    expect(useWeekStore.getState().schedule[0]._isPending).not.toBe(true);
    expect(useWeekStore.getState().schedule[1].status).toBe(3);
  });
});

it('serializes guarded promotions and locks only after they all succeed', async () => {
  let resolve!: (value: any) => void;
  useWeekStore.setState({
    status: 1,
    schedule: [
      makeDay({ recipe: { id: 'a' } as any, _isPending: true }),
      makeDay({ date: '2025-01-07', recipe: { id: 'b' } as any, _isPending: true }),
    ],
  });
  vi.mocked(assignRecipeToDay)
    .mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      })
    )
    .mockResolvedValueOnce(undefined);
  vi.mocked(lockSchedule).mockResolvedValue(undefined);
  const closing = useWeekStore.getState().closeVoting();
  await Promise.resolve();
  expect(assignRecipeToDay).toHaveBeenCalledTimes(1);
  expect(lockSchedule).not.toHaveBeenCalled();
  resolve(undefined);
  await closing;
  expect(assignRecipeToDay).toHaveBeenCalledTimes(2);
  expect(lockSchedule).toHaveBeenCalledTimes(1);
});
it('does not apply an earlier round session defaults when the same week reopens', async () => {
  const oldRound = '00000000-0000-4000-8000-000000000002';
  const newRound = '00000000-0000-4000-8000-000000000003';
  useWeekStore.setState({ status: 1, votingRoundId: oldRound });
  useDiscoveryStore.getState().applySession(
    {
      incarnationId: '00000000-0000-4000-8000-000000000001',
      revision: 2,
      roundId: oldRound,
      weekStartDate: '2025-01-06',
      phase: 'converged',
      requiredSlots: 1,
      coveredSlots: 1,
      candidateCount: 1,
      smartDefaults: {
        weekStartDate: '2025-01-06',
        preSelectedRecipes: [{ dayIndex: 0, recipeId: 'old' }],
      },
    } as any,
    true
  );
  vi.mocked(getSchedule).mockResolvedValue({
    ...makeScheduleDays([{}]),
    status: 1,
    votingRoundId: newRound,
  });
  vi.mocked(getSmartDefaults).mockResolvedValue({
    weekStartDate: '2025-01-06',
    preSelectedRecipes: [{ dayIndex: 0, recipeId: 'old' }],
  } as any);
  await useWeekStore.getState().init(0);
  expect(useWeekStore.getState().schedule[0].recipe).toBeUndefined();
});
it('confirmed close removes prior pending suggestion retention', () => {
  useWeekStore.setState({
    status: 1,
    schedule: [makeDay({ recipe: { id: 'old' } as any, _isPending: true })],
  });
  useWeekStore.getState().applySnapshot({ ...makeScheduleDays([{}]), status: 2 });
  expect(useWeekStore.getState().schedule[0].recipe).toBeUndefined();
});

it('a delayed initialization cannot reopen a confirmed closed round', async () => {
  const oldRound = '00000000-0000-4000-8000-000000000002';
  let resolve!: (value: any) => void;
  useWeekStore.setState({ status: 1, votingRoundId: oldRound });
  vi.mocked(getSchedule).mockResolvedValue({
    ...makeScheduleDays([{}]),
    status: 1,
    votingRoundId: oldRound,
  });
  vi.mocked(getSmartDefaults).mockReturnValue(
    new Promise((r) => {
      resolve = r;
    })
  );
  const init = useWeekStore.getState().init(0);
  await vi.waitFor(() => expect(getSmartDefaults).toHaveBeenCalled());
  useWeekStore
    .getState()
    .applySnapshot({ ...makeScheduleDays([{}]), status: 2, votingRoundId: oldRound });
  useDiscoveryStore.getState().applySession(
    {
      incarnationId: '00000000-0000-4000-8000-000000000001',
      revision: 3,
      roundId: '00000000-0000-4000-8000-000000000003',
      weekStartDate: null,
      phase: 'unowned',
      requiredSlots: null,
      coveredSlots: null,
      candidateCount: null,
      smartDefaults: null,
    } as any,
    true
  );
  resolve({ weekStartDate: '2025-01-06', preSelectedRecipes: [{ dayIndex: 0, recipeId: 'old' }] });
  await init;
  expect(useWeekStore.getState().status).toBe(2);
  expect(useWeekStore.getState().schedule[0].recipe).toBeUndefined();
  expect(useWeekStore.getState().isLoading).toBe(false);
});

it('a delayed sync cannot restore the previous round identity after reopening', async () => {
  const oldRound = '00000000-0000-4000-8000-000000000002';
  const newRound = '00000000-0000-4000-8000-000000000003';
  let resolve!: (value: any) => void;
  useWeekStore.setState({ status: 1, votingRoundId: oldRound, schedule: [makeDay()] });
  vi.mocked(getSchedule).mockReturnValue(
    new Promise((r) => {
      resolve = r;
    })
  );
  vi.mocked(getSmartDefaults).mockResolvedValue(null);
  const syncing = useWeekStore.getState().sync();
  useWeekStore
    .getState()
    .applySnapshot({ ...makeScheduleDays([{}]), status: 1, votingRoundId: newRound });
  resolve({ ...makeScheduleDays([{}]), status: 1, votingRoundId: oldRound });
  await syncing;
  expect(useWeekStore.getState().votingRoundId).toBe(newRound);
});

it('delayed open results cannot restore a round closed by another member', async () => {
  const round = '00000000-0000-4000-8000-000000000002';
  let resolve!: (value: any) => void;
  vi.mocked(openVoting).mockResolvedValue(undefined);
  vi.mocked(getSchedule).mockResolvedValue({
    ...makeScheduleDays([{}]),
    status: 1,
    votingRoundId: round,
  });
  vi.mocked(getSmartDefaults).mockReturnValue(
    new Promise((r) => {
      resolve = r;
    })
  );
  const opening = useWeekStore.getState().openVoting();
  await vi.waitFor(() => expect(getSmartDefaults).toHaveBeenCalled());
  useWeekStore
    .getState()
    .applySnapshot({ ...makeScheduleDays([{}]), status: 2, votingRoundId: round });
  resolve({ weekStartDate: '2025-01-06', preSelectedRecipes: [{ dayIndex: 0, recipeId: 'old' }] });
  await opening;
  expect(useWeekStore.getState().status).toBe(2);
  expect(useWeekStore.getState().schedule[0].recipe).toBeUndefined();
});

it('failed old open completion cannot roll back a later confirmed round', async () => {
  let reject!: (error: Error) => void;
  vi.mocked(openVoting).mockReturnValue(
    new Promise((_, r) => {
      reject = r;
    })
  );
  const opening = useWeekStore.getState().openVoting();
  const round = '00000000-0000-4000-8000-000000000003';
  useWeekStore
    .getState()
    .applySnapshot({ ...makeScheduleDays([{}]), status: 1, votingRoundId: round });
  reject(new Error('lost old response'));
  await expect(opening).rejects.toThrow();
  expect(useWeekStore.getState().status).toBe(1);
  expect(useWeekStore.getState().votingRoundId).toBe(round);
});

it('a recovered old close receipt cannot replace a subsequently reopened round', async () => {
  const oldRound = '00000000-0000-4000-8000-000000000002';
  const newRound = '00000000-0000-4000-8000-000000000003';
  let reject!: (error: Error) => void;
  useWeekStore.setState({ status: 1, votingRoundId: oldRound });
  vi.mocked(lockSchedule).mockReturnValue(
    new Promise((_, r) => {
      reject = r;
    })
  );
  vi.mocked(getSchedule).mockResolvedValue({
    ...makeScheduleDays([{}]),
    status: 2,
    votingRoundId: oldRound,
  });
  const closing = useWeekStore.getState().closeVoting();
  useWeekStore.setState({
    status: 1,
    votingRoundId: newRound,
    schedule: [makeDay({ recipe: { id: 'new-pending' } as any, _isPending: true })],
  });
  reject(new Error('old close response lost'));
  await closing;
  expect(useWeekStore.getState().status).toBe(1);
  expect(useWeekStore.getState().votingRoundId).toBe(newRound);
  expect(useWeekStore.getState().schedule[0].recipe?.id).toBe('new-pending');
  expect(useWeekStore.getState().schedule[0]._isPending).toBe(true);
});

it.each(['init', 'sync', 'openVoting'] as const)(
  'accepts compatible bootstrap data when SSE establishes the same round during %s',
  async (action) => {
    const round = '00000000-0000-4000-8000-000000000002';
    let resolve!: (value: any) => void;
    vi.mocked(openVoting).mockResolvedValue(undefined);
    vi.mocked(getSchedule).mockReturnValue(
      new Promise((r) => {
        resolve = r;
      })
    );
    vi.mocked(getSmartDefaults).mockResolvedValue(null);
    const pending =
      action === 'init' ? useWeekStore.getState().init(0) : useWeekStore.getState()[action]();
    await vi.waitFor(() => expect(getSchedule).toHaveBeenCalled());
    const status = action === 'openVoting' ? 1 : 0;
    useWeekStore
      .getState()
      .applySnapshot({ ...makeScheduleDays([{}]), status, votingRoundId: round });
    resolve({
      ...makeScheduleDays([{ recipe: { id: 'saved', name: 'Saved supper' } as any }]),
      status,
      votingRoundId: round,
    });
    await pending;
    expect(useWeekStore.getState().schedule[0].recipe?.id).toBe('saved');
  }
);

it('shows persisted promotions after session updates withdraw their pending suggestions', async () => {
  const round = '00000000-0000-4000-8000-000000000002';
  const saved = { id: 'saved', name: 'Saved supper', image: '' };
  useWeekStore.setState({
    status: 1,
    votingRoundId: round,
    schedule: [makeDay({ recipe: saved as any, _isPending: true })],
  });
  vi.mocked(assignRecipeToDay).mockImplementation(async () => {
    // The initiating connection is excluded from ordinary schedule echo, but receives session state.
    useWeekStore.getState().applySmartDefaultsUpdate({
      weekStartDate: '2025-01-06',
      weekOffset: 0,
      preSelectedRecipes: [],
    } as any);
    return undefined;
  });
  vi.mocked(lockSchedule).mockResolvedValue(undefined);
  vi.mocked(getSchedule).mockResolvedValue({
    ...makeScheduleDays([{ recipe: saved as any }]),
    status: 2,
    votingRoundId: round,
  });
  await useWeekStore.getState().closeVoting();
  expect(useWeekStore.getState().schedule[0].recipe?.id).toBe(saved.id);
  expect(useWeekStore.getState().schedule[0]._isPending).not.toBe(true);
});
