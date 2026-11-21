import { beforeEach, describe, expect, it } from 'vitest';
import { useWeekStore } from './weekStore';
import { usePlannerStore } from './plannerStore';
import { builders } from '@/testing/builders';
import {
  beginGroceryIntent,
  finishGroceryIntent,
  enqueueGroceryIntent,
} from '@/lib/grocery/rowState';

const week = '2026-05-04';
const rows = builders.groceryItems(['Water mass', 'Water volume']);
const [a, b] = rows.map((row) => row.rowId!);
const snapshot = (version: string, checks: Record<string, boolean>) => ({
  weekStartDate: week,
  groceryListVersion: version,
  groceryItems: rows,
  groceryState: checks,
});
beforeEach(() => {
  useWeekStore.setState({
    weekStartDate: week,
    groceryVersionWeek: null,
    groceryListVersion: null,
    groceryItems: [],
    authoritativeGroceryChecks: {},
  });
  usePlannerStore.setState({ groceryState: {} });
});

describe('authoritative grocery versions', () => {
  it('distinguishes an unmaterialized week from version one and rejects a late absent-list read', () => {
    useWeekStore.setState({
      groceryVersionWeek: '2026-04-27',
      groceryListVersion: '5',
      groceryItems: rows,
    });
    const empty = {
      weekStartDate: week,
      groceryListVersion: null,
      groceryItems: [],
      groceryState: {},
    };
    expect(useWeekStore.getState().applyGrocerySnapshot(empty)).toBe(true);
    expect(useWeekStore.getState().groceryItems).toEqual([]);
    expect(useWeekStore.getState().applyGrocerySnapshot(snapshot('1', { [a]: true }))).toBe(true);
    expect(useWeekStore.getState().applyGrocerySnapshot(empty)).toBe(false);
    expect(usePlannerStore.getState().groceryState[a]).toBe(true);
  });
  it('rejects an older snapshot beyond the JavaScript safe-integer boundary', () => {
    expect(
      useWeekStore
        .getState()
        .applyGrocerySnapshot(snapshot('9007199254740993', { [a]: true, [b]: false }))
    ).toBe(true);
    expect(
      useWeekStore
        .getState()
        .applyGrocerySnapshot(snapshot('9007199254740992', { [a]: false, [b]: false }))
    ).toBe(false);
    expect(usePlannerStore.getState().groceryState[a]).toBe(true);
  });

  it('accepts an identical version/check map regardless of JSON object key order', () => {
    useWeekStore.getState().applyGrocerySnapshot(snapshot('7', { [a]: true, [b]: false }));
    expect(
      useWeekStore.getState().applyGrocerySnapshot(snapshot('7', { [b]: false, [a]: true }))
    ).toBe(true);
  });

  it('keeps only the pending row optimistic while applying another row from the server', () => {
    const token = beginGroceryIntent(week, a, false);
    try {
      useWeekStore.getState().applyGrocerySnapshot(snapshot('8', { [a]: true, [b]: true }));
      expect(usePlannerStore.getState().groceryState).toEqual({ [a]: false, [b]: true });
      expect(useWeekStore.getState().authoritativeGroceryChecks[a]).toBe(true);
    } finally {
      finishGroceryIntent(week, a, token);
    }
    useWeekStore.getState().applyGrocerySnapshot(snapshot('8', { [a]: true, [b]: true }));
    expect(usePlannerStore.getState().groceryState[a]).toBe(true);
  });

  it('serializes the same row without blocking a different row', async () => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const order: string[] = [];
    const first = enqueueGroceryIntent(week, a, async () => {
      order.push('a1');
      await held;
    });
    const second = enqueueGroceryIntent(week, a, async () => {
      order.push('a2');
    });
    await enqueueGroceryIntent(week, b, async () => {
      order.push('b');
    });
    expect(order).toEqual(['a1', 'b']);
    release();
    await Promise.all([first, second]);
    expect(order).toEqual(['a1', 'b', 'a2']);
  });
});
