# Planner Finalization Consolidation - Tasks

## Implementation Plan

### Wave 1: Store Logic & TDD
Focus: Move the "promotion" logic from the component into the store.

- [x] 1. **Store - TDD for closeVoting**
    - Modify `pwa/src/store/weekStore.test.ts`.
    - Add a test case where the schedule has `_isPending: true` items.
    - Assert that `assignRecipeToDay` is called for each pending item when `closeVoting()` is executed.
    - Assert that `lockSchedule` is called after the assignments.
    - _Requirements: AC-1, AC-2_

- [x] 2. **Store - Implement Consolidated closeVoting**
    - Update `pwa/src/store/weekStore.ts`.
    - Refactor `closeVoting` to filter `schedule` for `_isPending` items and perform assignments before locking.
    - _Requirements: AC-1, AC-2_

### Wave 2: UI Cleanup & Integration
Focus: Remove the redundant UI and wire the new logic.

- [x] 3. **Component - Remove Redundant UI**
    - Modify `pwa/src/app/(app)/planner/page.tsx`.
    - Delete the `handleFinalize` function.
    - Delete the JSX blocks for `finalize-button` and `finalized-status`.
    - Ensure `handleCloseVoting` remains simple as it calls the now-smarter store method.
    - _Requirements: AC-3, AC-4_

- [x] 4. **Component - Verify Success Feedback**
    - Ensure `handleCloseVoting` in `page.tsx` still triggers `setShowSuccess(true)` upon completion to provide feedback to the user.
    - _Requirements: AC-5_

### Wave 3: E2E Realignment
Focus: Update tests to match the new flow.

- [x] 5. **E2E - Update Planner Specs**
    - Modify `pwa/e2e/planner-full-cycle.spec.ts` and `pwa/e2e/planner.spec.ts`.
    - Remove references to `finalize-button` and `finalized-status`.
    - Update the flow to click `close-voting-btn`.
    - Assert the locked state using `ask-family-cta` or checking that reordering is disabled/hidden.
    - _Requirements: AC-5_

## Task Dependency Graph
```json
{
  "waves": [
    {
      "name": "Logic Consolidation",
      "tasks": [1, 2]
    },
    {
      "name": "UI Removal",
      "tasks": [3, 4],
      "dependencies": [2]
    },
    {
      "name": "Test Realignment",
      "tasks": [5],
      "dependencies": [4]
    }
  ]
}
```
