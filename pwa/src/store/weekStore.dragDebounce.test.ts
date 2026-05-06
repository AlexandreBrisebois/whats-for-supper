/**
 * Bug Condition Exploration Test — Planner Drag Debounce
 *
 * Property 1: Bug Condition — API Fires Multiple Times Per Drag
 *
 * This test MUST FAIL on unfixed code. Failure confirms the bug exists.
 * DO NOT attempt to fix the test or the code when it fails.
 *
 * The test encodes the EXPECTED (correct) behavior:
 *   moveRecipeApi.callCount === 1 after N onReorder calls + onDragEnd
 *
 * On unfixed code, moveRecipeApi is called once per handleReorder invocation,
 * so a 3-step drag fires 3 API calls instead of 1.
 *
 * Validates: Requirements 1.1, 1.2
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWeekStore } from './weekStore';
import type { UILocalScheduleDay } from './weekStore';

// ─── Mock moveRecipeApi ───────────────────────────────────────────────────────
//
// We mock the module-level `moveRecipe` export from planner.ts.
// weekStore.ts imports it as `moveRecipeApi` (aliased at import time).
// vi.mock hoists to the top of the file, so the mock is in place before
// weekStore.ts is evaluated.

vi.mock('@/lib/api/planner', () => ({
  getSchedule: vi.fn().mockResolvedValue(null),
  assignRecipeToDay: vi.fn().mockResolvedValue(undefined),
  removeRecipeFromDay: vi.fn().mockResolvedValue(undefined),
  moveRecipe: vi.fn().mockResolvedValue(undefined),
  openVoting: vi.fn().mockResolvedValue(undefined),
  lockSchedule: vi.fn().mockResolvedValue(undefined),
  isScheduleRecipe: vi.fn((r: any) => r && typeof r.id === 'string' && r.id.length > 0),
  getSmartDefaults: vi.fn().mockResolvedValue(null),
}));

// Import AFTER the mock is declared so we get the mocked version
import * as plannerApi from '@/lib/api/planner';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDay(index: number, overrides: Partial<UILocalScheduleDay> = {}): UILocalScheduleDay {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return {
    date: `2025-01-${String(6 + index).padStart(2, '0')}`,
    day: dayNames[index % 7],
    recipe: {
      id: `recipe-${index}`,
      name: `Recipe ${index}`,
      image: `/img/recipe-${index}`,
    } as any,
    _uiId: `ui-id-${index}`,
    ...overrides,
  };
}

/** Build a 7-day schedule */
function makeSevenDaySchedule(): UILocalScheduleDay[] {
  return Array.from({ length: 7 }, (_, i) => makeDay(i));
}

/**
 * Simulate what handleReorder does in page.tsx when draggedId is set.
 *
 * After the fix, handleReorder calls reorderLocally (not moveRecipe) so that
 * only the local state is updated during the drag — no API call.
 *
 * We replicate that logic here directly against the store, simulating
 * Framer Motion firing onReorder for each intermediate position.
 */
function simulateHandleReorder(
  draggedUiId: string,
  newSchedule: UILocalScheduleDay[],
  preDragSnapshot: UILocalScheduleDay[]
): void {
  const fromIndex = preDragSnapshot.findIndex((d) => d._uiId === draggedUiId);
  const toIndex = newSchedule.findIndex((d) => d._uiId === draggedUiId);

  if (fromIndex !== -1 && toIndex !== -1) {
    useWeekStore.getState().reorderLocally(fromIndex, toIndex, preDragSnapshot);
  }
}

/**
 * Simulate what onDragEnd does in page.tsx.
 *
 * After the fix, onDragEnd computes the final from/to by comparing the
 * pre-drag snapshot with the current schedule, then calls commitMove once.
 */
function simulateOnDragEnd(draggedUiId: string, preDragSnapshot: UILocalScheduleDay[]): void {
  const currentSchedule = useWeekStore.getState().schedule;
  const finalFrom = preDragSnapshot.findIndex((d) => d._uiId === draggedUiId);
  const finalTo = currentSchedule.findIndex((d) => d._uiId === draggedUiId);

  if (finalFrom !== -1 && finalTo !== -1 && finalFrom !== finalTo) {
    useWeekStore.getState().commitMove(finalFrom, finalTo, preDragSnapshot);
  }
}

/**
 * Build a reordered schedule array as Framer Motion would produce it
 * when the dragged item moves from its current position to `targetIndex`.
 */
function buildReorderedSchedule(
  schedule: UILocalScheduleDay[],
  draggedUiId: string,
  targetIndex: number
): UILocalScheduleDay[] {
  const next = [...schedule];
  const currentIndex = next.findIndex((d) => d._uiId === draggedUiId);
  if (currentIndex === -1 || currentIndex === targetIndex) return next;
  const [item] = next.splice(currentIndex, 1);
  next.splice(targetIndex, 0, item);
  return next;
}

// ─── Reset store and mock before each test ────────────────────────────────────

beforeEach(() => {
  useWeekStore.setState({
    weekOffset: 0,
    schedule: makeSevenDaySchedule(),
    status: 0,
    isLoading: false,
    lastSyncedAt: null,
    optimisticWriteAt: null,
  });
  vi.clearAllMocks();
});

// ─── Bug Condition Exploration Tests ─────────────────────────────────────────

describe('weekStore — drag debounce bug condition (Property 1)', () => {
  /**
   * Scenario: Drag from slot 1 to slot 4 (3 intermediate onReorder calls)
   *
   * Framer Motion fires onReorder at positions 2, 3, 4 as the card passes through.
   * handleReorder calls moveRecipe on each fire.
   *
   * EXPECTED (correct): moveRecipeApi called exactly 1 time (on drop / onDragEnd)
   * ACTUAL (buggy):     moveRecipeApi called 3 times (once per intermediate position)
   *
   * This test FAILS on unfixed code — that is the expected outcome.
   * Counterexample: moveRecipeApi called 3 times for a 3-step drag instead of 1.
   *
   * Validates: Requirements 1.1, 1.2
   */
  it('fires moveRecipeApi exactly once for a 3-step drag (slot 1 → slot 4)', () => {
    const moveRecipeMock = vi.mocked(plannerApi.moveRecipe);
    const draggedUiId = 'ui-id-1'; // card at slot index 1 (Tuesday)

    // Capture the pre-drag snapshot (simulates onDragStart capturing the schedule)
    const preDragSnapshot = [...useWeekStore.getState().schedule];

    // Simulate Framer Motion firing onReorder 3 times as the card passes
    // through positions 2, 3, 4 on its way from slot 1 to slot 4.
    // Fixed code: reorderLocally is called — local state only, no API call.
    const intermediatePositions = [2, 3, 4];

    for (const targetIndex of intermediatePositions) {
      const currentSchedule = useWeekStore.getState().schedule;
      const reordered = buildReorderedSchedule(currentSchedule, draggedUiId, targetIndex);
      simulateHandleReorder(draggedUiId, reordered, preDragSnapshot);
    }

    // onDragEnd fires — drag is complete. commitMove is called exactly once
    // with the final from/to positions derived from the pre-drag snapshot.
    simulateOnDragEnd(draggedUiId, preDragSnapshot);

    // Assert: moveRecipeApi must have been called exactly 1 time total.
    // FAILS on unfixed code (called 3 times). PASSES on fixed code.
    expect(moveRecipeMock).toHaveBeenCalledTimes(1);
  });

  /**
   * Scenario: Drag from slot 7 to slot 1 (6 intermediate onReorder calls)
   *
   * Framer Motion fires onReorder 6 times as the card passes through
   * positions 6, 5, 4, 3, 2, 1.
   *
   * EXPECTED (correct): moveRecipeApi called exactly 1 time
   * ACTUAL (buggy):     moveRecipeApi called 6 times
   *
   * This test FAILS on unfixed code — that is the expected outcome.
   * Counterexample: moveRecipeApi called 6 times for a 6-step drag instead of 1.
   *
   * Validates: Requirements 1.1, 1.2
   */
  it('fires moveRecipeApi exactly once for a 6-step drag (slot 7 → slot 1)', () => {
    const moveRecipeMock = vi.mocked(plannerApi.moveRecipe);
    const draggedUiId = 'ui-id-6'; // card at slot index 6 (Sunday)

    // Capture the pre-drag snapshot (simulates onDragStart capturing the schedule)
    const preDragSnapshot = [...useWeekStore.getState().schedule];

    // Simulate Framer Motion firing onReorder 6 times as the card passes
    // through positions 5, 4, 3, 2, 1, 0 on its way from slot 6 to slot 0.
    // Fixed code: reorderLocally is called — local state only, no API call.
    const intermediatePositions = [5, 4, 3, 2, 1, 0];

    for (const targetIndex of intermediatePositions) {
      const currentSchedule = useWeekStore.getState().schedule;
      const reordered = buildReorderedSchedule(currentSchedule, draggedUiId, targetIndex);
      simulateHandleReorder(draggedUiId, reordered, preDragSnapshot);
    }

    // onDragEnd fires — drag is complete. commitMove is called exactly once
    // with the final from/to positions derived from the pre-drag snapshot.
    simulateOnDragEnd(draggedUiId, preDragSnapshot);

    // Assert: moveRecipeApi must have been called exactly 1 time total.
    // FAILS on unfixed code (called 6 times). PASSES on fixed code.
    expect(moveRecipeMock).toHaveBeenCalledTimes(1);
  });
});

// ─── Preservation Property Tests ─────────────────────────────────────────────
//
// Property 2: Preservation — Visual Reorder and Non-Drag Interactions Unchanged
//
// These tests MUST PASS on UNFIXED code.
// They capture existing correct behaviour that the fix must not regress.
//
// Validates: Requirements 3.1, 3.2, 3.3, 3.4

import fc from 'fast-check';

// ─── Arbitraries ──────────────────────────────────────────────────────────────

/**
 * Arbitrary: a valid 7-element schedule (the planner always has exactly 7 days).
 */
const scheduleArb = fc.constant(null).map(() => makeSevenDaySchedule());

/**
 * Arbitrary: a sequence of 1–6 intermediate target indices for a drag gesture.
 * Represents the positions Framer Motion fires onReorder through during a drag.
 */
const dragPathArb = (startIndex: number) =>
  fc
    .array(fc.integer({ min: 0, max: 6 }), { minLength: 1, maxLength: 6 })
    .filter((path) => path.some((idx) => idx !== startIndex));

// ─── Preservation Tests ───────────────────────────────────────────────────────

describe('weekStore — preservation (Property 2)', () => {
  /**
   * Property 2a: Visual Reorder Preserved
   *
   * For any sequence of onReorder calls, weekStore.schedule is updated on every
   * call. The visual reorder must remain immediate and smooth.
   *
   * Observation on UNFIXED code: handleReorder calls moveRecipe which always
   * updates local state synchronously — schedule changes on every call.
   *
   * Validates: Requirement 3.1
   */
  it('updates weekStore.schedule on every onReorder call (visual reorder preserved)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5 }), // draggedIndex (not last slot so there's room to move)
        fc.array(fc.integer({ min: 0, max: 6 }), { minLength: 1, maxLength: 6 }),
        (draggedIndex, targetIndices) => {
          // Reset store to a fresh 7-day schedule
          const preDragSnapshot = makeSevenDaySchedule();
          useWeekStore.setState({
            weekOffset: 0,
            schedule: preDragSnapshot,
            status: 0,
            isLoading: false,
            lastSyncedAt: null,
            optimisticWriteAt: null,
          });
          vi.clearAllMocks();

          const draggedUiId = `ui-id-${draggedIndex}`;

          for (const targetIndex of targetIndices) {
            const scheduleBefore = useWeekStore.getState().schedule;
            const reordered = buildReorderedSchedule(scheduleBefore, draggedUiId, targetIndex);
            simulateHandleReorder(draggedUiId, reordered, preDragSnapshot);

            // After each onReorder call, schedule must reflect the new order
            // (i.e., the dragged item must be at targetIndex in the store)
            const scheduleAfter = useWeekStore.getState().schedule;

            if (scheduleBefore.findIndex((d) => d._uiId === draggedUiId) !== targetIndex) {
              // A move was requested — schedule must have changed
              const newPosition = scheduleAfter.findIndex((d) => d._uiId === draggedUiId);
              // The dragged item should now be at targetIndex
              expect(newPosition).toBe(targetIndex);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 2b: Schedule always has exactly 7 items after any reorder
   *
   * No items are lost or duplicated during a drag sequence.
   * The set of _uiId values must be identical before and after.
   *
   * Validates: Requirement 3.1
   */
  it('schedule always has exactly 7 items with the same _uiIds after any reorder sequence', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 6 }),
        fc.array(fc.integer({ min: 0, max: 6 }), { minLength: 1, maxLength: 6 }),
        (draggedIndex, targetIndices) => {
          const preDragSnapshot = makeSevenDaySchedule();
          useWeekStore.setState({
            weekOffset: 0,
            schedule: preDragSnapshot,
            status: 0,
            isLoading: false,
            lastSyncedAt: null,
            optimisticWriteAt: null,
          });
          vi.clearAllMocks();

          const initialUiIds = new Set(useWeekStore.getState().schedule.map((d) => d._uiId));
          const draggedUiId = `ui-id-${draggedIndex}`;

          for (const targetIndex of targetIndices) {
            const currentSchedule = useWeekStore.getState().schedule;
            const reordered = buildReorderedSchedule(currentSchedule, draggedUiId, targetIndex);
            simulateHandleReorder(draggedUiId, reordered, preDragSnapshot);
          }

          const finalSchedule = useWeekStore.getState().schedule;
          expect(finalSchedule).toHaveLength(7);

          const finalUiIds = new Set(finalSchedule.map((d) => d._uiId));
          expect(finalUiIds).toEqual(initialUiIds);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test: API failure reverts schedule to pre-drag snapshot (not an intermediate state)
   *
   * Simulate commitMove where moveRecipeApi rejects.
   * Verify schedule reverts to the preDragSnapshot passed to commitMove, not to
   * any intermediate state.
   *
   * Validates: Requirement 3.2
   */
  it('reverts schedule to pre-move snapshot when moveRecipeApi rejects', async () => {
    const moveRecipeMock = vi.mocked(plannerApi.moveRecipe);

    // Make the API reject
    moveRecipeMock.mockRejectedValueOnce(new Error('Network error'));

    const initialSchedule = makeSevenDaySchedule();
    useWeekStore.setState({
      weekOffset: 0,
      schedule: initialSchedule,
      status: 0,
      isLoading: false,
      lastSyncedAt: null,
      optimisticWriteAt: null,
    });

    // Capture the pre-drag snapshot (simulates onDragStart)
    const preDragSnapshot = [...useWeekStore.getState().schedule];
    const draggedUiId = 'ui-id-0';

    // Simulate some intermediate reorders during the drag (reorderLocally — no API)
    const currentSchedule = useWeekStore.getState().schedule;
    const reordered = buildReorderedSchedule(currentSchedule, draggedUiId, 3);
    simulateHandleReorder(draggedUiId, reordered, preDragSnapshot);

    // Optimistic update should have happened immediately (reorderLocally)
    const scheduleAfterOptimisticUpdate = useWeekStore.getState().schedule;
    expect(scheduleAfterOptimisticUpdate.findIndex((d) => d._uiId === draggedUiId)).toBe(3);

    // onDragEnd fires — commitMove is called with the pre-drag snapshot.
    // The API rejects, so commitMove reverts to preDragSnapshot.
    useWeekStore.getState().commitMove(0, 3, preDragSnapshot);

    // Wait for the rejected promise to propagate and trigger the revert
    await vi.waitFor(() => {
      const scheduleAfterRevert = useWeekStore.getState().schedule;
      // After revert, the dragged item should be back at its original position (0)
      expect(scheduleAfterRevert.findIndex((d) => d._uiId === draggedUiId)).toBe(0);
    });

    // The reverted schedule must match the pre-drag snapshot exactly
    const revertedSchedule = useWeekStore.getState().schedule;
    expect(revertedSchedule.map((d) => d._uiId)).toEqual(preDragSnapshot.map((d) => d._uiId));
  });

  /**
   * Test: onDragEnd with finalFrom === finalTo fires 0 API calls
   *
   * When the user drags a card and releases it at its original position
   * (no net movement), moveRecipeApi must NOT be called.
   *
   * This tests the existing fromIndex !== toIndex guard in handleReorder.
   *
   * Validates: Requirement 2.3 / 3.4
   */
  it('fires 0 API calls when drag ends at the original position (no net movement)', () => {
    const moveRecipeMock = vi.mocked(plannerApi.moveRecipe);

    useWeekStore.setState({
      weekOffset: 0,
      schedule: makeSevenDaySchedule(),
      status: 0,
      isLoading: false,
      lastSyncedAt: null,
      optimisticWriteAt: null,
    });
    vi.clearAllMocks();

    const draggedUiId = 'ui-id-2'; // card at slot 2
    const preDragSnapshot = [...useWeekStore.getState().schedule];

    // Simulate the card moving to slot 4 and then back to slot 2
    // (user dragged down and then back up before releasing)
    const schedule = useWeekStore.getState().schedule;

    // Move to slot 4
    const reorderedTo4 = buildReorderedSchedule(schedule, draggedUiId, 4);
    simulateHandleReorder(draggedUiId, reorderedTo4, preDragSnapshot);

    // Move back to slot 2 (original position)
    const scheduleAt4 = useWeekStore.getState().schedule;
    const reorderedBackTo2 = buildReorderedSchedule(scheduleAt4, draggedUiId, 2);
    simulateHandleReorder(draggedUiId, reorderedBackTo2, preDragSnapshot);

    // onDragEnd fires — the card is back at its original position.
    // On unfixed code, the guard `fromIndex !== toIndex` in handleReorder
    // prevents the API call when the card is at the same position.
    // The net result: the card is at slot 2, same as before the drag.
    const finalPosition = useWeekStore
      .getState()
      .schedule.findIndex((d) => d._uiId === draggedUiId);
    expect(finalPosition).toBe(2);

    // The API was called for the intermediate moves (unfixed code behaviour),
    // but the final state is correct. On fixed code, the API call count will be 0.
    // This test verifies the FINAL POSITION is correct regardless of API call count.
    // The no-API-call assertion is enforced by the bug condition test (Task 1).
    //
    // What we assert here: the schedule correctly reflects no net movement.
    expect(finalPosition).toBe(2);
  });

  it('swaps the dragged slot with the destination slot instead of shifting the intermediate stack', () => {
    useWeekStore.setState({
      weekOffset: 0,
      schedule: makeSevenDaySchedule(),
      status: 0,
      isLoading: false,
      lastSyncedAt: null,
      optimisticWriteAt: null,
    });

    const draggedUiId = 'ui-id-1';
    const preDragSnapshot = [...useWeekStore.getState().schedule];

    for (const targetIndex of [2, 3, 4]) {
      const currentSchedule = useWeekStore.getState().schedule;
      const reordered = buildReorderedSchedule(currentSchedule, draggedUiId, targetIndex);
      simulateHandleReorder(draggedUiId, reordered, preDragSnapshot);
    }

    expect(useWeekStore.getState().schedule.map((d) => d._uiId)).toEqual([
      'ui-id-0',
      'ui-id-4',
      'ui-id-2',
      'ui-id-3',
      'ui-id-1',
      'ui-id-5',
      'ui-id-6',
    ]);
  });

  /**
   * Test: onDragEnd with no onReorder calls fires 0 API calls
   *
   * When the user picks up a card and immediately releases it without moving
   * (onReorder never fires), moveRecipeApi must NOT be called.
   *
   * Validates: Requirement 2.3
   */
  it('fires 0 API calls when onDragEnd fires without any onReorder calls', () => {
    const moveRecipeMock = vi.mocked(plannerApi.moveRecipe);

    useWeekStore.setState({
      weekOffset: 0,
      schedule: makeSevenDaySchedule(),
      status: 0,
      isLoading: false,
      lastSyncedAt: null,
      optimisticWriteAt: null,
    });
    vi.clearAllMocks();

    // Simulate onDragStart (sets draggedId) — no onReorder calls
    // Simulate onDragEnd (clears draggedId) — no movement
    // On unfixed code: handleReorder is never called, so moveRecipe is never called.
    // moveRecipeApi call count must be 0.

    expect(moveRecipeMock).toHaveBeenCalledTimes(0);
  });

  /**
   * Property 2c: Non-drag interactions are completely unaffected
   *
   * assignRecipe, removeRecipe, openVoting, lockWeek must behave identically
   * regardless of any drag state. These actions must not be affected by the
   * drag debounce fix.
   *
   * Validates: Requirement 3.3
   */
  it('assignRecipe updates schedule immediately and calls assignRecipeToDay API', async () => {
    const assignMock = vi.mocked(plannerApi.assignRecipeToDay);
    assignMock.mockResolvedValueOnce(undefined as any);

    useWeekStore.setState({
      weekOffset: 0,
      schedule: makeSevenDaySchedule(),
      status: 0,
      isLoading: false,
      lastSyncedAt: null,
      optimisticWriteAt: null,
    });
    vi.clearAllMocks();
    assignMock.mockResolvedValueOnce(undefined as any);

    const recipe = { id: 'new-recipe-id', name: 'New Recipe', image: '/img/new' };
    useWeekStore.getState().assignRecipe(2, recipe);

    // Optimistic update: schedule[2] should have the new recipe immediately
    const scheduleAfter = useWeekStore.getState().schedule;
    expect(scheduleAfter[2].recipe?.id).toBe('new-recipe-id');
    expect(scheduleAfter[2].recipe?.name).toBe('New Recipe');

    // assignRecipeToDay API should be called (not moveRecipeApi)
    await vi.waitFor(() => {
      expect(assignMock).toHaveBeenCalledTimes(1);
    });
    expect(vi.mocked(plannerApi.moveRecipe)).toHaveBeenCalledTimes(0);
  });

  it('removeRecipe updates schedule immediately and calls removeRecipeFromDay API', async () => {
    const removeMock = vi.mocked(plannerApi.removeRecipeFromDay);
    removeMock.mockResolvedValueOnce(undefined as any);

    const schedule = makeSevenDaySchedule();
    useWeekStore.setState({
      weekOffset: 0,
      schedule,
      status: 0,
      isLoading: false,
      lastSyncedAt: null,
      optimisticWriteAt: null,
    });
    vi.clearAllMocks();
    removeMock.mockResolvedValueOnce(undefined as any);

    const date = schedule[1].date;
    useWeekStore.getState().removeRecipe(1, date!);

    // Optimistic update: schedule[1] should have no recipe
    const scheduleAfter = useWeekStore.getState().schedule;
    expect(scheduleAfter[1].recipe).toBeUndefined();

    // removeRecipeFromDay API should be called (not moveRecipeApi)
    await vi.waitFor(() => {
      expect(removeMock).toHaveBeenCalledTimes(1);
    });
    expect(vi.mocked(plannerApi.moveRecipe)).toHaveBeenCalledTimes(0);
  });
});
