import { scalarQuantity, fixtureGroceryId, fixtureGroceryChecks } from '@/testing/grocery-fixtures';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useScheduleStream } from './useScheduleStream';
import { useWeekStore } from '@/store/weekStore';
import { usePlannerStore } from '@/store/plannerStore';
import { useDiscoveryStore } from '@/store/discoveryStore';
import { useTodayStore } from '@/store/todayStore';
import { calendarTime } from '@/lib/deployment-calendar';
import { MOCK_IDS } from '@/testing/mock-ids';
import { getSchedule } from '@/lib/api/planner';

vi.mock('@/lib/api/planner', () => ({
  getSchedule: vi.fn().mockResolvedValue(undefined),
  getSmartDefaults: vi.fn(),
  assignRecipeToDay: vi.fn(),
  removeRecipeFromDay: vi.fn(),
  moveRecipe: vi.fn(),
  openVoting: vi.fn(),
  lockSchedule: vi.fn(),
  normalizeScheduleRecipe: (recipe: unknown) => recipe,
}));

vi.mock('@/lib/api/discovery', () => ({
  getVotingSession: vi.fn().mockRejectedValue(new Error('unavailable')),
}));

const calendar = {
  timeZone: 'UTC',
  today: '2025-01-06',
  capturedAtUtc: '2025-01-06T12:00:00Z',
  currentWeekStartDate: '2025-01-06',
  referenceWeekStartDate: '2025-01-06',
  nextDayAtUtc: '2025-01-07T00:00:00Z',
};
const groceryItems = [
  {
    rowId: fixtureGroceryId('Carrots'),
    rowVersion: '1',
    weekStartDate: '2025-01-06',
    source: 'recipe',
    demandIdentity: 'carrots',
    displayName: 'Carrots',
    normalizedKey: 'carrots',
    section: 'Produce',
  },
];
let snapshotVersion = 0;
const snapshot = (groceryState: Record<string, boolean>, weekStartDate = '2025-01-06') => ({
  calendar,
  groceryListVersion: String(++snapshotVersion),
  weekStartDate,
  weekOffset: 0,
  status: 0,
  days: [],
  groceryItems,
  groceryState,
});

class MockEventSource {
  static instance: MockEventSource;
  private listeners = new Map<string, (event: MessageEvent) => void>();
  constructor() {
    MockEventSource.instance = this;
  }
  addEventListener(name: string, handler: (event: MessageEvent) => void) {
    this.listeners.set(name, handler);
  }
  emit(name: string, schedule: ReturnType<typeof snapshot>, echoSeq?: number) {
    act(() =>
      this.listeners.get(name)?.(
        new MessageEvent(name, {
          data: JSON.stringify({ schedule, echoSeq }),
        })
      )
    );
  }
  emitChecks(
    groceryState: Record<string, boolean>,
    weekStartDate = '2025-01-06',
    items = groceryItems
  ) {
    act(() =>
      this.listeners.get('grocery_updated')?.(
        new MessageEvent('grocery_updated', {
          data: JSON.stringify({
            weekStartDate,
            groceryState,
            groceryItems: items,
            groceryListVersion: String(++snapshotVersion),
          }),
        })
      )
    );
  }
  close() {}
}

beforeEach(() => {
  snapshotVersion = 0;
  vi.mocked(getSchedule).mockReset().mockResolvedValue(undefined);
  vi.stubGlobal('EventSource', MockEventSource);
  useTodayStore.setState({
    calendar,
    calendarAnchor: { receivedAtElapsed: calendarTime.elapsed(), expiresAfterMs: 60000 },
  });
  useDiscoveryStore.setState({ session: null, sessionStatus: 'unknown' });
  useWeekStore.setState({
    calendar,
    weekStartDate: '2025-01-06',
    weekOffset: 0,
    schedule: [],
    status: 0,
    groceryItems: [],
    groceryListVersion: null,
    groceryVersionWeek: null,
    authoritativeGroceryChecks: {},
    groceryRefresh: undefined,
    groceryExtras: [],
    pendingGroceryExtraIds: new Set(),
  });
  usePlannerStore.setState({
    groceryState: { [fixtureGroceryId('Old')]: true },
    pendingMoveSeqs: [],
    localMoveSeq: 0,
    confirmedMoveSeq: 0,
    isDragActive: false,
    deferredWeekSnapshot: null,
  });
});

describe('late completed grocery receipts', () => {
  const extra = {
    id: MOCK_IDS.GROCERY_EXTRA,
    name: 'Coffee',
    occurrenceWeekStartDate: '2025-01-06',
    checked: false,
    version: 2,
  } as any;
  it('keeps an acknowledged manual extra when an old week hint omits it', async () => {
    let resolve!: (value: any) => void;
    vi.mocked(getSchedule).mockReturnValue(new Promise((done) => (resolve = done)));
    useWeekStore.setState({ groceryExtras: [extra] });
    renderHook(() => useScheduleStream());
    MockEventSource.instance.emit('week_updated', {
      ...snapshot({ [fixtureGroceryId('Old')]: true }),
      groceryItems: [],
      groceryExtras: [],
    } as any);
    expect(useWeekStore.getState().groceryExtras).toEqual([extra]);
    expect(getSchedule).toHaveBeenCalledTimes(1);
    await act(async () =>
      resolve({
        ...snapshot({ [fixtureGroceryId('Old')]: true }),
        groceryItems: [],
        groceryExtras: [{ ...extra, version: 3, checked: true }],
      })
    );
    expect(useWeekStore.getState().groceryExtras).toEqual([
      { ...extra, version: 3, checked: true },
    ]);
  });
  it('rejects an older grocery read after a manual extra acknowledgement', async () => {
    let resolve!: (value: any) => void;
    vi.mocked(getSchedule).mockReturnValue(new Promise((done) => (resolve = done)));
    const pending = useWeekStore.getState().refreshGroceries();
    useWeekStore.getState().upsertGroceryExtra(extra);
    await act(async () => {
      resolve({
        ...snapshot({ [fixtureGroceryId('Old')]: true }),
        groceryItems: [],
        groceryExtras: [],
      });
      await pending;
    });
    expect(useWeekStore.getState().groceryExtras).toEqual([extra]);
  });
  it.each(['updating', 'failed'] as const)(
    'treats an older %s receipt as a hint while retaining later checked/reviewed facts',
    async (status) => {
      vi.mocked(getSchedule).mockRejectedValue(new Error('authoritative read unavailable'));
      const items = [{ displayName: 'pasta', quantity: scalarQuantity(600) }];
      useWeekStore.setState({
        groceryItems: items,
        groceryVersionWeek: '2025-01-06',
        groceryListVersion: '2',
        groceryRefresh: { status: 'current', version: 'new-input', workflowId: 'new-job' },
      });
      usePlannerStore.setState({ groceryState: { [fixtureGroceryId('pasta')]: true } });
      renderHook(() => useScheduleStream());
      MockEventSource.instance.emit('week_updated', {
        ...snapshot({ [fixtureGroceryId('pasta')]: false }),
        groceryItems: [
          {
            displayName: 'pasta',
            quantity: scalarQuantity(200),
            checkReviewReason: 'prior_amount_unknown',
          },
        ],
        groceryRefresh: { status, version: 'old-input', workflowId: 'old-job' },
      } as any);
      await act(async () => {
        await Promise.resolve();
      });
      expect(usePlannerStore.getState().groceryState).toEqual({
        [fixtureGroceryId('pasta')]: true,
      });
      expect(useWeekStore.getState().groceryItems).toBe(items);
      expect(useWeekStore.getState().groceryRefresh?.status).toBe(status);
      expect(getSchedule).toHaveBeenCalledTimes(1);
    }
  );
  it.each(['check', 'review'] as const)(
    'retains a later %s acknowledgement after a same-input same-job receipt',
    async (change) => {
      let resolve!: (value: any) => void;
      vi.mocked(getSchedule).mockReturnValue(new Promise((done) => (resolve = done)));
      const freshness = {
        status: 'current' as const,
        version: 'same-input',
        appliedVersion: 'same-input',
        workflowId: 'same-job',
      };
      const items = [{ displayName: 'pasta', quantity: scalarQuantity(600) }];
      useWeekStore.setState({
        groceryRefresh: freshness,
        groceryItems: items,
        groceryVersionWeek: '2025-01-06',
        groceryListVersion: '2',
      });
      usePlannerStore.setState({ groceryState: { [fixtureGroceryId('pasta')]: true } });
      renderHook(() => useScheduleStream());
      MockEventSource.instance.emit('week_updated', {
        ...snapshot({ [fixtureGroceryId('pasta')]: change !== 'check' }),
        groceryRefresh: freshness,
        groceryItems:
          change === 'review'
            ? [{ ...items[0], checkReviewReason: 'prior_amount_unknown' }]
            : items,
      } as any);
      expect(usePlannerStore.getState().groceryState).toEqual({
        [fixtureGroceryId('pasta')]: true,
      });
      expect(useWeekStore.getState().groceryItems).toBe(items);
      expect(getSchedule).toHaveBeenCalledTimes(1);
      await act(async () =>
        resolve({
          ...snapshot({ [fixtureGroceryId('pasta')]: true }),
          groceryListVersion: '3',
          groceryRefresh: freshness,
          groceryItems: items,
        })
      );
      expect(usePlannerStore.getState().groceryState).toEqual({
        [fixtureGroceryId('pasta')]: true,
      });
      expect(useWeekStore.getState().groceryItems[0]).not.toHaveProperty('checkReviewReason');
    }
  );
  it.each([
    ['updating', 'new-input'],
    ['failed', 'new-input'],
    ['updating', 'same-input'],
    ['failed', 'same-input'],
    ['current', 'new-input'],
    ['current', 'same-input'],
  ] as const)('keeps %s for %s until an authoritative derived read', async (status, version) => {
    let resolve!: (value: any) => void;
    vi.mocked(getSchedule).mockReturnValue(new Promise((done) => (resolve = done)));
    const freshness = { status, version, appliedVersion: 'older', workflowId: 'new-job' };
    const items = [
      {
        displayName: 'pasta',
        quantity: scalarQuantity(600),
        checkReviewReason: 'prior_amount_unknown' as const,
      },
    ];
    useWeekStore.setState({
      groceryRefresh: freshness,
      groceryItems: items,
      groceryVersionWeek: '2025-01-06',
      groceryListVersion: '2',
    });
    usePlannerStore.setState({ groceryState: { [fixtureGroceryId('pasta')]: false } });
    renderHook(() => useScheduleStream());
    MockEventSource.instance.emit('week_updated', {
      ...snapshot({ [fixtureGroceryId('pasta')]: true }),
      status: 1,
      groceryItems: [{ displayName: 'pasta', quantity: scalarQuantity(200) }],
      groceryRefresh: {
        status: 'current',
        version: 'same-input',
        appliedVersion: 'same-input',
        workflowId: 'old-job',
      },
    } as any);
    expect(useWeekStore.getState().status).toBe(1);
    expect(useWeekStore.getState().groceryRefresh).toBe(freshness);
    expect(useWeekStore.getState().groceryItems).toBe(items);
    expect(usePlannerStore.getState().groceryState).toEqual({ [fixtureGroceryId('pasta')]: false });
    expect(getSchedule).toHaveBeenLastCalledWith(0, calendar.referenceWeekStartDate);
    await act(async () =>
      resolve({
        ...snapshot({ [fixtureGroceryId('pasta')]: true }),
        groceryListVersion: '3',
        groceryItems: [{ displayName: 'pasta', quantity: scalarQuantity(800) }],
        groceryRefresh: {
          status: 'current',
          version: 'authoritative',
          appliedVersion: 'authoritative',
          workflowId: 'latest-job',
        },
      })
    );
    expect(useWeekStore.getState().groceryItems[0].quantity).toEqual(scalarQuantity(800));
    expect(useWeekStore.getState().groceryRefresh?.workflowId).toBe('latest-job');
    expect(usePlannerStore.getState().groceryState).toEqual({ [fixtureGroceryId('pasta')]: true });
    expect(useWeekStore.getState().status).toBe(1);
  });

  it('a remote check map clears review only from authoritative item metadata and retains optimistic calendar', async () => {
    let resolve!: (value: any) => void;
    vi.mocked(getSchedule).mockReturnValue(new Promise((done) => (resolve = done)));
    const items = [
      {
        displayName: 'pasta',
        quantity: scalarQuantity(600),
        checkReviewReason: 'prior_amount_unknown' as const,
      },
    ];
    useWeekStore.setState({ groceryItems: items });
    usePlannerStore.setState({ isDragActive: true });
    renderHook(() => useScheduleStream());
    MockEventSource.instance.emitChecks(
      { [fixtureGroceryId('pasta')]: true },
      '2025-01-06',
      items as any
    );
    expect(useWeekStore.getState().groceryItems).toEqual(items);
    await act(async () =>
      resolve({
        ...snapshot({ [fixtureGroceryId('pasta')]: true }),
        status: 2,
        groceryItems: [{ displayName: 'pasta', quantity: scalarQuantity(600) }],
      })
    );
    expect(useWeekStore.getState().groceryItems[0]).not.toHaveProperty('checkReviewReason');
    expect(usePlannerStore.getState().groceryState).toEqual({ [fixtureGroceryId('pasta')]: true });
    expect(usePlannerStore.getState().isDragActive).toBe(true);
    expect(useWeekStore.getState().status).toBe(0);
    expect(usePlannerStore.getState().deferredWeekSnapshot).toBeNull();
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('raw grocery snapshots through the stream and real stores', () => {
  it('applies ordered complete maps including explicit false and empty clear', () => {
    renderHook(() => useScheduleStream());
    MockEventSource.instance.emitChecks({ [fixtureGroceryId('Carrots')]: true });
    MockEventSource.instance.emitChecks({
      [fixtureGroceryId('Carrots')]: true,
      [fixtureGroceryId('Onions')]: true,
    });
    expect(usePlannerStore.getState().groceryState).toEqual({
      [fixtureGroceryId('Carrots')]: true,
      [fixtureGroceryId('Onions')]: true,
    });
    MockEventSource.instance.emitChecks({
      [fixtureGroceryId('Carrots')]: false,
      [fixtureGroceryId('Onions')]: true,
    });
    expect(usePlannerStore.getState().groceryState).toEqual({
      [fixtureGroceryId('Carrots')]: false,
      [fixtureGroceryId('Onions')]: true,
    });
    MockEventSource.instance.emitChecks({});
    expect(usePlannerStore.getState().groceryState).toEqual({});
    MockEventSource.instance.emitChecks({ [fixtureGroceryId('WrongWeek')]: true }, '2025-01-13');
    expect(usePlannerStore.getState().groceryState).toEqual({});
  });

  it('rejects a same-week older snapshot and accepts a newer reconnect', () => {
    renderHook(() => useScheduleStream());
    MockEventSource.instance.emitChecks({
      [fixtureGroceryId('Carrots')]: true,
      [fixtureGroceryId('Onions')]: true,
    });
    MockEventSource.instance.emit('week_updated', { ...snapshot({}), groceryListVersion: '1' });
    expect(usePlannerStore.getState().groceryState).toEqual({
      [fixtureGroceryId('Carrots')]: true,
      [fixtureGroceryId('Onions')]: true,
    });
    MockEventSource.instance.emit(
      'connected',
      snapshot({ [fixtureGroceryId('Carrots')]: true, [fixtureGroceryId('Onions')]: true })
    );
    expect(usePlannerStore.getState().groceryState).toEqual({
      [fixtureGroceryId('Carrots')]: true,
      [fixtureGroceryId('Onions')]: true,
    });
  });
  it.each(['connected', 'week_updated'])(
    '%s reconciles checks and unchecked values with grocery items',
    (event) => {
      renderHook(() => useScheduleStream());
      MockEventSource.instance.emit(
        event,
        snapshot({ [fixtureGroceryId('Carrots')]: true, [fixtureGroceryId('Onions')]: false })
      );
      expect(useWeekStore.getState().groceryItems).toEqual(groceryItems);
      expect(usePlannerStore.getState().groceryState).toEqual({
        [fixtureGroceryId('Carrots')]: true,
        [fixtureGroceryId('Onions')]: false,
      });
    }
  );

  it('a reconnect clears prior checks when the server supplies an empty map', () => {
    renderHook(() => useScheduleStream());
    MockEventSource.instance.emit('connected', snapshot({ [fixtureGroceryId('Carrots')]: true }));
    MockEventSource.instance.emit('connected', snapshot({}));
    expect(usePlannerStore.getState().groceryState).toEqual({});
    expect(useWeekStore.getState().groceryItems).toEqual(groceryItems);
  });

  it('rejects another absolute week even with the same numeric offset', () => {
    renderHook(() => useScheduleStream());
    MockEventSource.instance.emit(
      'week_updated',
      snapshot({ [fixtureGroceryId('Carrots')]: false }, '2024-12-30')
    );
    expect(usePlannerStore.getState().groceryState).toEqual({ [fixtureGroceryId('Old')]: true });
    expect(useWeekStore.getState().groceryItems).toEqual([]);
  });

  it.each([{ isDragActive: true }, { localMoveSeq: 1 }])(
    'defers raw adjuncts under an optimistic move guard %j',
    (guard) => {
      usePlannerStore.setState(guard);
      renderHook(() => useScheduleStream());
      MockEventSource.instance.emit('connected', snapshot({ [fixtureGroceryId('Carrots')]: true }));
      expect(usePlannerStore.getState().groceryState).toEqual({ [fixtureGroceryId('Old')]: true });
      expect(useWeekStore.getState().groceryItems).toEqual([]);
      expect(usePlannerStore.getState().deferredWeekSnapshot?.groceryState).toEqual({
        [fixtureGroceryId('Carrots')]: true,
      });
      act(() => {
        usePlannerStore.setState({ isDragActive: false, confirmedMoveSeq: 1 });
        useWeekStore.getState().applySnapshot(usePlannerStore.getState().deferredWeekSnapshot!);
      });
      expect(usePlannerStore.getState().groceryState).toEqual({
        [fixtureGroceryId('Carrots')]: true,
      });
    }
  );
});

describe('foreign move sequences through the stream and real stores', () => {
  it('applies a sequenced remote schedule without changing HTTP acknowledgement', () => {
    renderHook(() => useScheduleStream());
    MockEventSource.instance.emit(
      'week_updated',
      snapshot({ [fixtureGroceryId('Carrots')]: true }),
      42
    );
    expect(useWeekStore.getState().groceryItems).toEqual(groceryItems);
    expect(usePlannerStore.getState().groceryState).toEqual({
      [fixtureGroceryId('Carrots')]: true,
    });
    expect(usePlannerStore.getState().confirmedMoveSeq).toBe(0);
  });

  it.each([1, 42])(
    'defers remote sequence %s without settling a pending local request',
    (echoSeq) => {
      const seq = usePlannerStore.getState().nextMoveSeq();
      renderHook(() => useScheduleStream());
      MockEventSource.instance.emit(
        'week_updated',
        snapshot({ [fixtureGroceryId('Carrots')]: true }),
        echoSeq
      );
      expect(usePlannerStore.getState().pendingMoveSeqs).toEqual([seq]);
      expect(usePlannerStore.getState().confirmedMoveSeq).toBe(0);
      expect(useWeekStore.getState().groceryItems).toEqual([]);
      expect(usePlannerStore.getState().deferredWeekSnapshot?.groceryState).toEqual({
        [fixtureGroceryId('Carrots')]: true,
      });
    }
  );

  it('retains the selected-week and active-drag guards for sequenced remote events', () => {
    renderHook(() => useScheduleStream());
    MockEventSource.instance.emit(
      'week_updated',
      snapshot({ [fixtureGroceryId('WrongWeek')]: true }, '2025-01-13'),
      42
    );
    expect(usePlannerStore.getState().deferredWeekSnapshot).toBeNull();
    usePlannerStore.setState({ isDragActive: true });
    MockEventSource.instance.emit(
      'week_updated',
      snapshot({ [fixtureGroceryId('Carrots')]: true }),
      42
    );
    expect(useWeekStore.getState().groceryItems).toEqual([]);
    expect(usePlannerStore.getState().deferredWeekSnapshot?.groceryState).toEqual({
      [fixtureGroceryId('Carrots')]: true,
    });
    expect(usePlannerStore.getState().confirmedMoveSeq).toBe(0);
  });
});

describe('grocery events invalidate derived quantities', () => {
  it('rereads the matching week after applying a check map without requiring a reload', () => {
    const reread = vi.fn().mockResolvedValue(undefined);
    const old = useWeekStore.getState().refreshGroceries;
    useWeekStore.setState({ refreshGroceries: reread });
    try {
      renderHook(() => useScheduleStream());
      MockEventSource.instance.emitChecks({ [fixtureGroceryId('pasta')]: false });
      expect(usePlannerStore.getState().groceryState).toEqual({
        [fixtureGroceryId('pasta')]: false,
      });
      expect(reread).toHaveBeenCalledTimes(1);
      MockEventSource.instance.emitChecks({ [fixtureGroceryId('other')]: true }, '2025-01-13');
      expect(reread).toHaveBeenCalledTimes(1);
    } finally {
      useWeekStore.setState({ refreshGroceries: old });
    }
  });
});
