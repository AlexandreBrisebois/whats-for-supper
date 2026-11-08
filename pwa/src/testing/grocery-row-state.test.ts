import { describe, expect, it } from 'vitest';
import { createGroceryRowState } from '../../e2e/grocery-row-state';
import { scalarQuantity } from './grocery-fixtures';

const range = (min: number, max: number) => ({
  kind: 'range',
  min: { n: String(min), d: '1' },
  max: { n: String(max), d: '1' },
});
const week = '2026-10-05';
function fixture() {
  const state = createGroceryRowState();
  const schedule = (amount: unknown) => ({
    weekStartDate: week,
    groceryItems: [
      {
        displayName: 'pasta',
        normalizedKey: 'pasta',
        quantity: amount,
        quantityComplete: true,
        unitText: 'g',
        recipeIds: [],
      },
    ],
  });
  const project = (amount: unknown) => state.decorate(schedule(amount));
  let sequence = 0;
  const mutationId = () => `05000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`;
  const check = (value: boolean) => {
    const row = state.snapshot(week).groceryItems[0];
    const body = {
      rowId: row.rowId,
      expectedRowVersion: row.rowVersion,
      weekStartDate: week,
      checked: value,
      clientMutationId: mutationId(),
    };
    expect(state.mutate(week, 'item', body).status).toBe(200);
    return body;
  };
  return {
    state,
    project,
    check,
    mutationId,
    checked: () => Object.values(state.snapshot(week).groceryState)[0],
  };
}

describe('stateful grocery mock retained demand', () => {
  it('preserves the snapshot when the same source rows are decorated repeatedly', () => {
    const state = createGroceryRowState();
    const sourceRows = [
      {
        displayName: 'pasta',
        normalizedKey: 'pasta',
        quantity: 600,
        quantityComplete: true,
        unitText: 'g',
        recipeIds: [],
      },
    ];
    const decorate = () => state.decorate({ weekStartDate: week, groceryItems: sourceRows });
    decorate();
    const before = state.snapshot(week);
    decorate();
    decorate();
    expect(state.snapshot(week)).toEqual(before);
  });

  it.each(['unchanged', 'true', 'bulk', 'replay'])(
    'keeps the original range baseline across %s and cumulative overlap',
    (action) => {
      const f = fixture();
      f.project(range(2, 3));
      const receipt = f.check(true);
      f.project(range(3, 4));
      expect(f.checked()).toBe(true);
      if (action === 'true') f.check(true);
      if (action === 'replay') expect(f.state.mutate(week, 'item', receipt).status).toBe(200);
      if (action === 'bulk') {
        const snapshot = f.state.snapshot(week);
        expect(
          f.state.mutate(week, 'bulk', {
            weekStartDate: week,
            expectedListVersion: snapshot.groceryListVersion,
            checks: snapshot.groceryState,
            clientMutationId: f.mutationId(),
          }).status
        ).toBe(200);
      }
      f.project(range(4, 5));
      expect(f.checked()).toBe(false);
      f.check(true);
      f.project(range(4, 5));
      expect(f.checked()).toBe(true);
      f.project(range(6, 7));
      expect(f.checked()).toBe(false);
    }
  );
  it('never promotes an unknown baseline to a known acknowledgement', () => {
    const f = fixture();
    f.project(null);
    f.check(true);
    f.project(scalarQuantity(5));
    f.check(true);
    f.project(scalarQuantity(10));
    expect(f.checked()).toBe(true);
    f.check(false);
    f.check(true);
    f.project(scalarQuantity(11));
    expect(f.checked()).toBe(false);
  });
});
