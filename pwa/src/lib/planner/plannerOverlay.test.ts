import { describe, expect, it } from 'vitest';
import {
  closedOverlay,
  plannerOverlayReducer,
  type DetailSource,
  type NonCookingTarget,
  type PlannerOverlay,
  type PlannerOverlayAction,
  type RecoverySlot,
} from './plannerOverlay';
import type { AssignmentRecipe, PlannerSlot } from './slotAssignment';

const nonCookingFromPivot: NonCookingTarget = {
  date: '2026-05-13',
  weekOffset: 0,
  existing: false,
  fromPivotDayIndex: 2,
};
const nonCookingDirect: NonCookingTarget = { date: '2026-05-14', weekOffset: 1, existing: true };
const cookedSlot: PlannerSlot = {
  weekOffset: 0,
  dayIndex: 3,
  date: '2026-05-14',
  recipe: null,
  status: 2,
};
const detailSource: DetailSource = {
  date: '2026-05-15',
  dayIndex: 4,
  context: 'assigned',
  reference: '2026-05-11',
  weekOffset: 0,
};
const recoverySlot: RecoverySlot = {
  weekOffset: 0,
  dayIndex: 5,
  date: '2026-05-16',
  recipe: { id: 'original' },
};
const replacement: AssignmentRecipe = { id: 'replacement', name: 'Replacement', image: '' };

const states: Record<string, PlannerOverlay> = {
  none: closedOverlay,
  pivot: { kind: 'pivot', dayIndex: 2 },
  quickFind: { kind: 'quickFind', dayIndex: 4 },
  nonCooking: { kind: 'nonCooking', target: nonCookingFromPivot },
  cookedDefer: { kind: 'cookedDefer', slot: cookedSlot, submitting: false },
  cookedDeferSubmitting: { kind: 'cookedDefer', slot: cookedSlot, submitting: true },
  nudge: { kind: 'nudge' },
  detail: { kind: 'detail', recipeId: 'recipe-1', source: detailSource },
  replaceRecovery: { kind: 'replaceRecovery', slot: recoverySlot, recipe: replacement },
};

// Invariants 1 and 4: any open* replaces whatever is open with exactly that variant.
const opens: Array<[PlannerOverlayAction, PlannerOverlay]> = [
  [
    { type: 'openPivot', dayIndex: 1 },
    { kind: 'pivot', dayIndex: 1 },
  ],
  [
    { type: 'openQuickFind', dayIndex: 3 },
    { kind: 'quickFind', dayIndex: 3 },
  ],
  [
    { type: 'openNonCooking', target: nonCookingDirect },
    { kind: 'nonCooking', target: nonCookingDirect },
  ],
  [
    { type: 'openCookedDefer', slot: cookedSlot },
    { kind: 'cookedDefer', slot: cookedSlot, submitting: false },
  ],
  [{ type: 'openNudge' }, { kind: 'nudge' }],
  [
    { type: 'openDetail', recipeId: 'recipe-2', source: null },
    { kind: 'detail', recipeId: 'recipe-2', source: null },
  ],
  [
    { type: 'openReplaceRecovery', slot: recoverySlot, recipe: replacement },
    { kind: 'replaceRecovery', slot: recoverySlot, recipe: replacement },
  ],
];

describe('plannerOverlayReducer', () => {
  describe.each(Object.entries(states))('from %s', (name, state) => {
    it.each(opens)('%o yields %o', (action, expected) => {
      expect(plannerOverlayReducer(state, action)).toEqual(expected);
    });

    // Invariant 3: a submitting cooked-defer ignores close.
    it('close', () => {
      expect(plannerOverlayReducer(state, { type: 'close' })).toEqual(
        name === 'cookedDeferSubmitting' ? state : closedOverlay
      );
    });

    // Invariant 2: closeIfCurrent never closes a different overlay than the one it names.
    it('closeIfCurrent with a matching predicate closes it', () => {
      expect(
        plannerOverlayReducer(state, {
          type: 'closeIfCurrent',
          isCurrent: (overlay) => overlay.kind === state.kind,
        })
      ).toEqual(closedOverlay);
    });

    it('closeIfCurrent with a non-matching predicate leaves it open', () => {
      expect(plannerOverlayReducer(state, { type: 'closeIfCurrent', isCurrent: () => false })).toBe(
        state
      );
    });

    it('backToPivot', () => {
      expect(plannerOverlayReducer(state, { type: 'backToPivot' })).toEqual(
        name === 'nonCooking' ? { kind: 'pivot', dayIndex: 2 } : state
      );
    });

    it('setCookedDeferSubmitting', () => {
      const next = plannerOverlayReducer(state, {
        type: 'setCookedDeferSubmitting',
        submitting: true,
      });
      expect(next).toEqual(state.kind === 'cookedDefer' ? { ...state, submitting: true } : state);
    });
  });

  it('carries the pivot day straight into Quick Find in one transition', () => {
    const pivot = plannerOverlayReducer(closedOverlay, { type: 'openPivot', dayIndex: 5 });
    expect(plannerOverlayReducer(pivot, { type: 'openQuickFind', dayIndex: 5 })).toEqual({
      kind: 'quickFind',
      dayIndex: 5,
    });
  });

  it('keeps a non-cooking sheet without a pivot origin open on backToPivot', () => {
    const state: PlannerOverlay = { kind: 'nonCooking', target: nonCookingDirect };
    expect(plannerOverlayReducer(state, { type: 'backToPivot' })).toBe(state);
  });

  it('lets a stale non-cooking save close only the sheet for its own date', () => {
    const newer: PlannerOverlay = { kind: 'nonCooking', target: nonCookingDirect };
    const staleSave = (overlay: PlannerOverlay) =>
      overlay.kind === 'nonCooking' &&
      overlay.target.date === nonCookingFromPivot.date &&
      overlay.target.weekOffset === nonCookingFromPivot.weekOffset;
    expect(plannerOverlayReducer(newer, { type: 'closeIfCurrent', isCurrent: staleSave })).toBe(
      newer
    );
  });

  it('moves an unsaved replace-recovery into the replacement recipe detail', () => {
    const next = plannerOverlayReducer(states.replaceRecovery, {
      type: 'openDetail',
      recipeId: replacement.id,
      source: null,
    });
    expect(next).toEqual({ kind: 'detail', recipeId: 'replacement', source: null });
  });

  it('clears submitting, then closes the finished cooked-defer', () => {
    const done = plannerOverlayReducer(states.cookedDeferSubmitting, {
      type: 'setCookedDeferSubmitting',
      submitting: false,
    });
    expect(done).toEqual({ kind: 'cookedDefer', slot: cookedSlot, submitting: false });
    expect(plannerOverlayReducer(done, { type: 'close' })).toEqual(closedOverlay);
  });
});
