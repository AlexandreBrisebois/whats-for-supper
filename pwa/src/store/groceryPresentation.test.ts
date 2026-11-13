import { beforeEach, describe, expect, it } from 'vitest';
import { useWeekStore } from './weekStore';
import { usePlannerStore } from './plannerStore';
import { builders } from '@/testing/builders';

const week = '2026-05-04';
const epoch = 'c87604be-598c-4a36-9c38-9f04a248dc73';
const restoredEpoch = 'bc34397f-b8b6-487f-9d4d-74da9b7cbf66';
const row = builders.groceryItems(['Source onion'])[0];
const snapshot = (
  presentationVersion: string,
  label: string,
  listVersion = '1',
  presentationEpoch = epoch
) => ({
  weekStartDate: week,
  groceryListVersion: listVersion,
  groceryItems: [{ ...row, displayLabels: { en: label, fr: 'Oignon' } }],
  groceryState: { [row.rowId!]: true },
  presentationVersion,
  presentationEpoch,
});

beforeEach(() => {
  useWeekStore.setState({
    weekStartDate: week,
    groceryVersionWeek: null,
    groceryListVersion: null,
    groceryItems: [],
    authoritativeGroceryChecks: {},
    groceryPresentationEpoch: null,
    groceryPresentationVersion: null,
  });
  usePlannerStore.setState({ groceryState: {} });
});

describe('independent grocery presentation fence', () => {
  it('rejects stale equal-demand labels beyond the safe integer boundary', () => {
    const store = useWeekStore.getState();
    expect(store.applyGrocerySnapshot(snapshot('9007199254740993', 'Current onion'))).toBe(true);
    expect(store.applyGrocerySnapshot(snapshot('9007199254740992', 'Old onion'))).toBe(false);
    expect(useWeekStore.getState().groceryItems[0].displayLabels?.en).toBe('Current onion');
    expect(usePlannerStore.getState().groceryState[row.rowId!]).toBe(true);
  });

  it('applies newer check/demand state without downgrading an unchanged row label', () => {
    const store = useWeekStore.getState();
    store.applyGrocerySnapshot(snapshot('8', 'Current onion'));
    const newerDemand = snapshot('7', 'Old onion', '2');
    newerDemand.groceryState[row.rowId!] = false;
    expect(store.applyGrocerySnapshot(newerDemand)).toBe(true);
    expect(useWeekStore.getState().groceryListVersion).toBe('2');
    expect(useWeekStore.getState().groceryItems[0].displayLabels?.en).toBe('Current onion');
    expect(usePlannerStore.getState().groceryState[row.rowId!]).toBe(false);
  });

  it('keeps the newer category section while accepting a later demand response', () => {
    const current = snapshot('8', 'Current onion');
    Object.assign(current.groceryItems[0], {
      section: 'Produce',
      categoryStatus: 'resolved',
      categoryRevision: 'new-revision',
    });
    useWeekStore.getState().applyGrocerySnapshot(current);
    const delayed = snapshot('7', 'Old onion', '2');
    Object.assign(delayed.groceryItems[0], {
      section: 'Grocery',
      categoryStatus: 'conflict',
      categoryRevision: 'old-revision',
    });
    delayed.groceryState[row.rowId!] = false;
    expect(useWeekStore.getState().applyGrocerySnapshot(delayed)).toBe(true);
    expect(useWeekStore.getState().groceryItems[0]).toMatchObject({
      section: 'Produce',
      categoryStatus: 'resolved',
      categoryRevision: 'new-revision',
    });
    expect(usePlannerStore.getState().groceryState[row.rowId!]).toBe(false);
  });

  it('requires a fresh read fence to establish an opaque changed epoch', () => {
    const store = useWeekStore.getState();
    store.applyGrocerySnapshot(snapshot('8', 'Before restore'));
    expect(store.applyGrocerySnapshot(snapshot('1', 'Restored', '1', restoredEpoch))).toBe(false);
    expect(
      store.applyGrocerySnapshot(snapshot('1', 'Restored', '1', restoredEpoch), {
        expectedPresentationEpoch: epoch,
      })
    ).toBe(true);
    expect(
      store.applyGrocerySnapshot(snapshot('9', 'Late old reply'), {
        expectedPresentationEpoch: epoch,
      })
    ).toBe(false);
    expect(useWeekStore.getState().groceryItems[0].displayLabels?.en).toBe('Restored');
  });

  it('rejects a pending next-week read captured before a household epoch change', () => {
    const store = useWeekStore.getState();
    store.applyGrocerySnapshot(snapshot('8', 'Before restore'));
    const pendingEpoch = useWeekStore.getState().groceryPresentationEpoch;
    store.applyGrocerySnapshot(snapshot('1', 'Restored', '1', restoredEpoch), {
      expectedPresentationEpoch: epoch,
    });
    useWeekStore.setState({ weekStartDate: '2026-05-11' });
    const late = { ...snapshot('9', 'Late old household'), weekStartDate: '2026-05-11' };
    expect(store.applyGrocerySnapshot(late, { expectedPresentationEpoch: pendingEpoch })).toBe(
      false
    );
    expect(useWeekStore.getState().groceryPresentationEpoch).toBe(restoredEpoch);
  });

  it.each(['-1', '01', '1.0', '1e3', ''])(
    'rejects a malformed presentation counter %j',
    (counter) => {
      expect(useWeekStore.getState().applyGrocerySnapshot(snapshot(counter, 'Invalid'))).toBe(
        false
      );
      expect(useWeekStore.getState().groceryItems).toEqual([]);
    }
  );
});
