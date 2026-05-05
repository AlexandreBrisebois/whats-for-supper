# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - API Fires Multiple Times Per Drag
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate `moveRecipeApi` is called more than once per drag gesture
  - **Scoped PBT Approach**: Scope the property to the concrete failing case — simulate N `onReorder` calls (intermediate positions) followed by `onDragEnd`, assert `moveRecipeApi.callCount === 1`
  - Mock `moveRecipeApi` in `pwa/src/lib/api/planner.ts`
  - Simulate `handleReorder` being called 3 times with different intermediate positions (as Framer Motion fires during a drag from slot 1 to slot 4), then call `onDragEnd`
  - Assert `moveRecipeApi` was called exactly 1 time (test FAILS on unfixed code — it will be called 3 times)
  - Also test: simulate 6 `onReorder` calls (drag from slot 7 to slot 1), assert `moveRecipeApi.callCount === 1`
  - Document counterexamples found (e.g., "moveRecipeApi called 3 times for a 3-step drag instead of 1")
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct — it proves the bug exists)
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Visual Reorder and Non-Drag Interactions Unchanged
  - **IMPORTANT**: Follow observation-first methodology — observe UNFIXED code behaviour first
  - Observe: calling `handleReorder` with a new schedule immediately updates `weekStore.schedule` (visual smoothness)
  - Observe: `assignRecipe`, `removeRecipe`, `openVoting`, `lockWeek` actions are unaffected by drag state
  - Observe: dropping a card at its original position fires 0 API calls
  - Write property-based test: for any sequence of `onReorder` calls, `weekStore.schedule` is updated on every call (visual reorder preserved)
  - Write property-based test: for any non-drag interaction, behaviour is identical before and after the fix
  - Write test: simulate `commitMove` where `moveRecipeApi` rejects — verify schedule reverts to pre-drag snapshot, not an intermediate state
  - Write test: `onDragEnd` with `finalFrom === finalTo` (no net movement) — assert `moveRecipeApi` call count is 0
  - Verify all these tests PASS on UNFIXED code (they capture existing correct behaviour)
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behaviour to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix: decouple local reorder from API call

  - [x] 3.1 Split `moveRecipe` in `weekStore.ts` into `reorderLocally` and `commitMove`
    - Add `reorderLocally(from, to)` action — performs only the local state update (array splice + day reconciliation + `optimisticWriteAt`), no API call
    - Add `commitMove(from, to, preDragSnapshot)` action — calls `reorderLocally` then fires `moveRecipeApi` exactly once; on API failure, reverts to `preDragSnapshot` (not current schedule)
    - Keep existing `moveRecipe` signature or deprecate it — do not break any callers outside the planner page
    - _Bug_Condition: isBugCondition(event) where `onReorder` fires while pointer is still down and `moveRecipeApi` is called for an intermediate position_
    - _Expected_Behavior: `moveRecipeApi` fires exactly once per drag gesture, using final `from`/`to` indices, called only from `onDragEnd`_
    - _Preservation: `weekStore.schedule` must still be updated on every `onReorder` call; `assignRecipe`, `removeRecipe`, `openVoting`, `lockWeek`, `sync` must be completely unaffected_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

  - [x] 3.2 Update `handleReorder` and drag lifecycle in `page.tsx`
    - In `handleReorder`: replace `useWeekStore.getState().moveRecipe(fromIndex, toIndex)` with `useWeekStore.getState().reorderLocally(fromIndex, toIndex)` — keep the from/to index calculation logic identical
    - Add a `preDragSnapshotRef = useRef(null)` in `PlannerPage` to capture the schedule at drag start
    - In `onDragStart` on `Reorder.Item`: set `preDragSnapshotRef.current = useWeekStore.getState().schedule` before calling `setDraggedId(day._uiId)`
    - In `onDragEnd` on `Reorder.Item`: compute `finalFrom` and `finalTo` by comparing `preDragSnapshotRef.current` with current `weekStore.schedule`; if `finalFrom !== finalTo`, call `useWeekStore.getState().commitMove(finalFrom, finalTo, preDragSnapshotRef.current)`; clear `preDragSnapshotRef.current = null`
    - _Bug_Condition: isBugCondition(event) where `onReorder` fires while pointer is still down_
    - _Expected_Behavior: `commitMove` called once in `onDragEnd` with final positions; `reorderLocally` called in `onReorder` for visual updates only_
    - _Preservation: locked/past-week guard in `handleReorder` must remain in place; `draggedId` state management unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.4_

  - [x] 3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - API Fires Exactly Once Per Drag
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior: `moveRecipeApi.callCount === 1` after N `onReorder` calls + `onDragEnd`
    - When this test passes, it confirms the fix is correct
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2_

  - [x] 3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Visual Reorder and Non-Drag Interactions Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Checkpoint — Ensure all tests pass
  - Run `task test` (or `task agent:test:impact`) and confirm all tests pass
  - Run `task agent:drift` to confirm no schema drift was introduced
  - Run `task review` to confirm formatting, linting, and type-checking pass
  - Ensure all tests pass; ask the user if questions arise
