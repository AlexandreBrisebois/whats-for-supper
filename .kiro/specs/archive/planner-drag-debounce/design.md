# Planner Drag Debounce Bugfix Design

## Overview

Framer Motion's `Reorder.Group` fires `onReorder` on every intermediate drag position, not just on drop. The current `handleReorder` handler in `pwa/src/app/(app)/planner/page.tsx` calls `useWeekStore.getState().moveRecipe(from, to)` on every invocation, and `moveRecipe` immediately fires `POST /api/schedule/move`. Dragging a card across N slots therefore fires N API calls before the user releases.

The fix decouples the two responsibilities that are currently fused inside `moveRecipe`:

1. **Local state update** — must remain in `onReorder` so the visual reorder stays smooth.
2. **API call** — must be deferred to the `onDragEnd` event on `Reorder.Item`, which fires exactly once when the pointer is released.

No new abstractions are needed. The change is confined to `handleReorder` in `page.tsx` and `moveRecipe` in `weekStore.ts`.

---

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — `onReorder` is called while a drag is still in progress (pointer has not been released).
- **Property (P)**: The desired behavior — `POST /api/schedule/move` fires exactly once per drag gesture, using the final from/to positions.
- **Preservation**: All non-drag interactions (mouse clicks, recipe assignment, removal, validation, locking) and the visual smoothness of the drag itself must be completely unaffected.
- **`handleReorder`**: The `onReorder` callback in `PlannerPage` (`page.tsx` line ~205) that receives the reordered array from Framer Motion on every intermediate drag position.
- **`moveRecipe(from, to)`**: The Zustand action in `weekStore.ts` that updates local state and fires the API call. Currently does both in one step.
- **`moveRecipeApi`**: The `POST /api/schedule/move` API call imported from `pwa/src/lib/api/planner.ts`.
- **`draggedId`**: React state in `PlannerPage` tracking the `_uiId` of the card currently being dragged; set in `onDragStart` and cleared in `onDragEnd` on `Reorder.Item`.
- **`onDragEnd`**: Framer Motion event on `Reorder.Item` that fires exactly once when the pointer is released, regardless of how many positions were crossed.

---

## Bug Details

### Bug Condition

The bug manifests when a user drags a planner card and it passes through one or more intermediate positions before releasing. `Reorder.Group.onReorder` fires on every intermediate position, and the current handler calls `moveRecipe` — which includes the API call — on each invocation.

**Formal Specification:**
```
FUNCTION isBugCondition(event)
  INPUT: event — an onReorder callback invocation from Reorder.Group
  OUTPUT: boolean

  RETURN dragIsStillInProgress(event)
         AND fromIndex != toIndex
         AND moveRecipeApi was called for this intermediate position
END FUNCTION

FUNCTION dragIsStillInProgress(event)
  // True when the pointer has NOT yet been released —
  // i.e., onDragEnd on Reorder.Item has not yet fired.
  RETURN pointerIsDown AND draggedId IS NOT NULL
END FUNCTION
```

### Examples

- **Drag from slot 1 to slot 4**: `onReorder` fires 3 times (positions 2, 3, 4). Current code fires `POST /api/schedule/move` 3 times. Fixed code fires it once, on drop at slot 4.
- **Drag from slot 7 to slot 1**: `onReorder` fires 6 times. Current code fires 6 API calls. Fixed code fires 1.
- **Drag and release at original position**: `onReorder` may fire 0 times (no movement detected). Fixed code fires 0 API calls (requirement 2.3 already satisfied by the `fromIndex !== toIndex` guard).
- **Drag one slot**: `onReorder` fires once. Current code fires 1 API call. Fixed code also fires 1 — behaviour is identical for this edge case.

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- The visual reorder during drag must remain immediate and smooth — `schedule` in `weekStore` must still be updated on every `onReorder` call.
- Mouse clicks on recipe cards, the pivot sheet, and all other planner interactions must continue to work exactly as before.
- `assignRecipe`, `removeRecipe`, `openVoting`, `lockWeek`, and `sync` actions in `weekStore` must be completely unaffected.
- The optimistic revert on API failure must continue to work: if `POST /api/schedule/move` fails, the schedule reverts to its pre-drag state.
- The locked/past-week guard that prevents reordering must remain in place.

**Scope:**
All inputs that do NOT involve a drag gesture (pointer-down → move → pointer-up sequence on a `Reorder.Item`) must be completely unaffected by this fix. This includes:
- Mouse clicks on buttons and recipe cards
- Recipe assignment and removal
- Week navigation
- Voting and locking flows

---

## Hypothesized Root Cause

The root cause is a single architectural decision: `moveRecipe` in `weekStore` was written to do both the local state update and the API call atomically. This was appropriate when `moveRecipe` was only called once per drag (on drop), but `handleReorder` calls it on every intermediate `onReorder` event.

The comment in `weekStore.ts` at line 219 even acknowledges this:
> "In a high-perf scenario, we might debounce this, but for 7 items the local state update is the critical path for 'buttery smooth' feel."

The comment anticipated debouncing but the actual fix is simpler: split the two responsibilities so the API call is only triggered from `onDragEnd`.

**Specific causes:**

1. **`handleReorder` calls `moveRecipe` unconditionally**: Every `onReorder` invocation triggers the full `moveRecipe` action, including the API call.

2. **`moveRecipe` fuses local state update with API call**: There is no way to call one without the other. The fix requires either splitting the action or adding a parameter to suppress the API call.

3. **No drag-end hook for the API call**: `onDragEnd` on `Reorder.Item` currently only clears `draggedId`. It does not trigger any API call. The final from/to positions are not captured at drag-end time.

4. **`draggedId` is cleared before the final position is known**: `onDragEnd` clears `draggedId` to `null`, but the final reordered schedule is only available via `onReorder`. The fix must capture the pre-drag `schedule` snapshot and the final positions before `draggedId` is cleared.

---

## Correctness Properties

Property 1: Bug Condition — API Call Fires Exactly Once Per Drag

_For any_ drag gesture where the user moves a card from position `from` to a different position `to` (isBugCondition returns true for intermediate `onReorder` calls), the fixed code SHALL fire `POST /api/schedule/move` exactly once — when the pointer is released — using the final `from` and `to` indices, not the intermediate ones.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation — Visual Reorder Remains Immediate

_For any_ drag gesture, the fixed code SHALL update `weekStore.schedule` on every `onReorder` call, preserving the smooth visual reorder behaviour that exists in the original code.

**Validates: Requirements 3.1**

Property 3: Preservation — Non-Drag Interactions Unchanged

_For any_ interaction that is NOT a drag gesture (mouse clicks, recipe assignment, removal, voting, locking), the fixed code SHALL produce exactly the same behaviour as the original code.

**Validates: Requirements 3.2, 3.3, 3.4**

---

## Fix Implementation

### Changes Required

The fix splits `moveRecipe` into two actions and wires the API call to `onDragEnd`.

---

**File**: `pwa/src/store/weekStore.ts`

**Changes**:

1. **Add `reorderLocally(from, to)` action** — performs only the local state update (the array splice + day reconciliation + `optimisticWriteAt`). No API call.

2. **Keep `moveRecipe(from, to)` for the API call path** — or rename it to `commitMove(from, to)` to make intent clear. This action calls `reorderLocally` then fires `moveRecipeApi`. It is now only called from `onDragEnd`, not from `onReorder`.

   Alternatively (simpler): add a boolean parameter `apiCall = true` to `moveRecipe` and pass `false` from `onReorder`. This avoids adding a new action but is less explicit.

   **Preferred approach**: two separate actions — `reorderLocally` and `commitMove` — for clarity and testability.

3. **Add `dragStartSnapshot: UILocalScheduleDay[] | null`** to store state — captures the schedule at the moment drag starts, so `commitMove` can revert to it on API failure regardless of intermediate reorders.

---

**File**: `pwa/src/app/(app)/planner/page.tsx`

**Changes**:

1. **`handleReorder`**: Remove the `moveRecipe` call. Replace with `useWeekStore.getState().reorderLocally(fromIndex, toIndex)`. The from/to index calculation logic stays identical.

2. **`onDragStart` on `Reorder.Item`** (inside `PlannerDayCard`): In addition to `setDraggedId(day._uiId)`, call `useWeekStore.getState().snapshotDragStart()` (or capture the pre-drag schedule in a ref in `PlannerPage` and pass it down).

   **Preferred approach**: capture the pre-drag schedule in a `useRef` in `PlannerPage` and pass a `onDragStart` callback to `PlannerDayCard`. This keeps the store lean.

3. **`onDragEnd` on `Reorder.Item`**: After clearing `draggedId`, compute the final from/to positions by comparing the pre-drag snapshot (ref) with the current `schedule`, then call `useWeekStore.getState().commitMove(from, to, preDragSnapshot)`. If `from === to`, do nothing (satisfies requirement 2.3).

   The `commitMove` action receives the pre-drag snapshot so it can revert to it (not to an intermediate state) if the API call fails.

---

### Pseudocode for the Fixed Flow

```
// onDragStart (Reorder.Item)
preDragSnapshotRef.current = weekStore.schedule  // capture before any reorder
setDraggedId(day._uiId)

// onReorder (Reorder.Group) — fires N times during drag
handleReorder(newSchedule):
  compute fromIndex, toIndex using draggedId
  if fromIndex != toIndex:
    weekStore.reorderLocally(fromIndex, toIndex)  // local state only, no API

// onDragEnd (Reorder.Item) — fires exactly once on pointer-up
setDraggedId(null)
finalFrom = preDragSnapshotRef.current.findIndex(d => d._uiId === day._uiId)
finalTo   = weekStore.schedule.findIndex(d => d._uiId === day._uiId)
if finalFrom != finalTo:
  weekStore.commitMove(finalFrom, finalTo, preDragSnapshotRef.current)
preDragSnapshotRef.current = null
```

---

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behaviour.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm the root cause: that `moveRecipeApi` is called multiple times per drag gesture.

**Test Plan**: Mock `moveRecipeApi` and simulate multiple `onReorder` calls in sequence (as Framer Motion would fire them during a drag). Assert that `moveRecipeApi` is called more than once. Run these tests on the UNFIXED code to observe failures and confirm the root cause.

**Test Cases**:
1. **Multi-step drag test**: Call `handleReorder` 3 times with different intermediate positions, then call `onDragEnd`. Assert `moveRecipeApi` was called 3 times on unfixed code. (Will fail on fixed code — expected to be called once.)
2. **Single-step drag test**: Call `handleReorder` once, then `onDragEnd`. Assert `moveRecipeApi` was called once. (Should pass on both unfixed and fixed code — edge case.)
3. **No-movement drag test**: Call `onDragEnd` without any `onReorder` call (card returned to original position). Assert `moveRecipeApi` was called 0 times.
4. **Race condition test**: Simulate two overlapping drags (second drag starts before first API call resolves). Assert the schedule is consistent after both complete.

**Expected Counterexamples**:
- `moveRecipeApi` call count equals the number of `onReorder` invocations, not 1.
- Confirmed cause: `handleReorder` calls `moveRecipe` (which calls `moveRecipeApi`) on every intermediate position.

### Fix Checking

**Goal**: Verify that for all drag gestures where the card moves to a new position, the fixed code fires `POST /api/schedule/move` exactly once with the correct final positions.

**Pseudocode:**
```
FOR ALL drag gesture WHERE isBugCondition(intermediateOnReorderCall) DO
  simulate N onReorder calls (intermediate positions)
  simulate onDragEnd (pointer released)
  ASSERT moveRecipeApi.callCount === 1
  ASSERT moveRecipeApi.calledWith(weekOffset, finalFrom, finalTo)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed code produces the same result as the original code.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalBehaviour(input) === fixedBehaviour(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many random schedule configurations and drag scenarios automatically.
- It catches edge cases (e.g., 7-slot schedules with empty days, locked weeks) that manual tests miss.
- It provides strong guarantees that local state updates remain correct across all configurations.

**Test Plan**: Observe behaviour on UNFIXED code first for non-drag interactions, then write property-based tests capturing that behaviour.

**Test Cases**:
1. **Local state preservation**: For any `onReorder` call, verify `weekStore.schedule` is updated immediately (visual smoothness preserved).
2. **Optimistic revert preservation**: Simulate `commitMove` where `moveRecipeApi` rejects. Verify schedule reverts to the pre-drag snapshot, not an intermediate state.
3. **Non-drag action preservation**: Verify `assignRecipe`, `removeRecipe`, `openVoting`, and `lockWeek` are completely unaffected by the new `reorderLocally` / `commitMove` split.
4. **No-movement preservation**: Verify that dropping a card at its original position fires 0 API calls (requirement 2.3).

### Unit Tests

- Test `reorderLocally(from, to)` updates `weekStore.schedule` correctly without calling `moveRecipeApi`.
- Test `commitMove(from, to, snapshot)` calls `moveRecipeApi` exactly once with correct arguments.
- Test `commitMove` reverts to the provided snapshot (not current schedule) on API failure.
- Test `handleReorder` with multiple intermediate calls followed by `onDragEnd` — assert API call count is 1.
- Test edge cases: drag to same position, drag on a 1-item schedule, drag on a locked week.

### Property-Based Tests

- Generate random 7-element schedule arrays and random drag paths (sequences of intermediate positions). Verify `moveRecipeApi` is called exactly once per drag gesture regardless of path length.
- Generate random schedule configurations and verify that `reorderLocally` always produces a valid 7-element schedule with the same set of `_uiId` values (no items lost or duplicated).
- Generate random non-drag interactions and verify the schedule state after each is identical between original and fixed code.

### Integration Tests

- Full drag flow in the planner: drag a card from slot 1 to slot 5, verify exactly one network request to `POST /api/schedule/move`.
- Drag and release at original position: verify zero network requests.
- Drag followed by API failure: verify the schedule visually reverts to the pre-drag order.
- Rapid successive drags: verify each drag fires exactly one API call and the final schedule matches the last drop position.
