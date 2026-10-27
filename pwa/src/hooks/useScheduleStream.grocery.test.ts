import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useScheduleStream } from './useScheduleStream';
import { useWeekStore } from '@/store/weekStore';
import { usePlannerStore } from '@/store/plannerStore';
import { useDiscoveryStore } from '@/store/discoveryStore';

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
const groceryItems = [{ displayName: 'Carrots', normalizedKey: 'carrots', section: 'Produce' }];
const snapshot = (groceryState: Record<string, boolean>, weekStartDate = '2025-01-06') => ({
  calendar,
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
  emitChecks(groceryState: Record<string, boolean>, weekStartDate = '2025-01-06') {
    act(() =>
      this.listeners.get('grocery_updated')?.(
        new MessageEvent('grocery_updated', {
          data: JSON.stringify({ weekStartDate, groceryState }),
        })
      )
    );
  }
  close() {}
}

beforeEach(() => {
  vi.stubGlobal('EventSource', MockEventSource);
  useDiscoveryStore.setState({ session: null, sessionStatus: 'unknown' });
  useWeekStore.setState({
    calendar,
    weekStartDate: '2025-01-06',
    weekOffset: 0,
    schedule: [],
    groceryItems: [],
    groceryExtras: [],
    pendingGroceryExtraIds: new Set(),
  });
  usePlannerStore.setState({
    groceryState: { Old: true },
    pendingMoveSeqs: [],
    localMoveSeq: 0,
    confirmedMoveSeq: 0,
    isDragActive: false,
    deferredWeekSnapshot: null,
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('raw grocery snapshots through the stream and real stores', () => {
  it('applies ordered complete maps including explicit false and empty clear', () => {
    renderHook(() => useScheduleStream());
    MockEventSource.instance.emitChecks({ Carrots: true });
    MockEventSource.instance.emitChecks({ Carrots: true, Onions: true });
    expect(usePlannerStore.getState().groceryState).toEqual({ Carrots: true, Onions: true });
    MockEventSource.instance.emitChecks({ Carrots: false, Onions: true });
    expect(usePlannerStore.getState().groceryState).toEqual({ Carrots: false, Onions: true });
    MockEventSource.instance.emitChecks({});
    expect(usePlannerStore.getState().groceryState).toEqual({});
    MockEventSource.instance.emitChecks({ WrongWeek: true }, '2025-01-13');
    expect(usePlannerStore.getState().groceryState).toEqual({});
  });

  it('documents same-week older snapshot acceptance and fresh reread recovery', () => {
    renderHook(() => useScheduleStream());
    MockEventSource.instance.emitChecks({ Carrots: true, Onions: true });
    MockEventSource.instance.emit('week_updated', snapshot({}));
    expect(usePlannerStore.getState().groceryState).toEqual({});
    MockEventSource.instance.emit('connected', snapshot({ Carrots: true, Onions: true }));
    expect(usePlannerStore.getState().groceryState).toEqual({ Carrots: true, Onions: true });
  });
  it.each(['connected', 'week_updated'])(
    '%s reconciles checks and unchecked values with grocery items',
    (event) => {
      renderHook(() => useScheduleStream());
      MockEventSource.instance.emit(event, snapshot({ Carrots: true, Onions: false }));
      expect(useWeekStore.getState().groceryItems).toEqual(groceryItems);
      expect(usePlannerStore.getState().groceryState).toEqual({ Carrots: true, Onions: false });
    }
  );

  it('a reconnect clears prior checks when the server supplies an empty map', () => {
    renderHook(() => useScheduleStream());
    MockEventSource.instance.emit('connected', snapshot({ Carrots: true }));
    MockEventSource.instance.emit('connected', snapshot({}));
    expect(usePlannerStore.getState().groceryState).toEqual({});
    expect(useWeekStore.getState().groceryItems).toEqual(groceryItems);
  });

  it('rejects another absolute week even with the same numeric offset', () => {
    renderHook(() => useScheduleStream());
    MockEventSource.instance.emit('week_updated', snapshot({ Carrots: false }, '2024-12-30'));
    expect(usePlannerStore.getState().groceryState).toEqual({ Old: true });
    expect(useWeekStore.getState().groceryItems).toEqual([]);
  });

  it.each([{ isDragActive: true }, { localMoveSeq: 1 }])(
    'defers raw adjuncts under an optimistic move guard %j',
    (guard) => {
      usePlannerStore.setState(guard);
      renderHook(() => useScheduleStream());
      MockEventSource.instance.emit('connected', snapshot({ Carrots: true }));
      expect(usePlannerStore.getState().groceryState).toEqual({ Old: true });
      expect(useWeekStore.getState().groceryItems).toEqual([]);
      expect(usePlannerStore.getState().deferredWeekSnapshot?.groceryState).toEqual({
        Carrots: true,
      });
      act(() => {
        usePlannerStore.setState({ isDragActive: false, confirmedMoveSeq: 1 });
        useWeekStore.getState().applySnapshot(usePlannerStore.getState().deferredWeekSnapshot!);
      });
      expect(usePlannerStore.getState().groceryState).toEqual({ Carrots: true });
    }
  );
});

describe('foreign move sequences through the stream and real stores', () => {
  it('applies a sequenced remote schedule without changing HTTP acknowledgement', () => {
    renderHook(() => useScheduleStream());
    MockEventSource.instance.emit('week_updated', snapshot({ Carrots: true }), 42);
    expect(useWeekStore.getState().groceryItems).toEqual(groceryItems);
    expect(usePlannerStore.getState().groceryState).toEqual({ Carrots: true });
    expect(usePlannerStore.getState().confirmedMoveSeq).toBe(0);
  });

  it.each([1, 42])(
    'defers remote sequence %s without settling a pending local request',
    (echoSeq) => {
      const seq = usePlannerStore.getState().nextMoveSeq();
      renderHook(() => useScheduleStream());
      MockEventSource.instance.emit('week_updated', snapshot({ Carrots: true }), echoSeq);
      expect(usePlannerStore.getState().pendingMoveSeqs).toEqual([seq]);
      expect(usePlannerStore.getState().confirmedMoveSeq).toBe(0);
      expect(useWeekStore.getState().groceryItems).toEqual([]);
      expect(usePlannerStore.getState().deferredWeekSnapshot?.groceryState).toEqual({
        Carrots: true,
      });
    }
  );

  it('retains the selected-week and active-drag guards for sequenced remote events', () => {
    renderHook(() => useScheduleStream());
    MockEventSource.instance.emit('week_updated', snapshot({ WrongWeek: true }, '2025-01-13'), 42);
    expect(usePlannerStore.getState().deferredWeekSnapshot).toBeNull();
    usePlannerStore.setState({ isDragActive: true });
    MockEventSource.instance.emit('week_updated', snapshot({ Carrots: true }), 42);
    expect(useWeekStore.getState().groceryItems).toEqual([]);
    expect(usePlannerStore.getState().deferredWeekSnapshot?.groceryState).toEqual({
      Carrots: true,
    });
    expect(usePlannerStore.getState().confirmedMoveSeq).toBe(0);
  });
});
