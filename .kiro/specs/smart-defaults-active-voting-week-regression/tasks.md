# Tasks: Smart Defaults On Active Voting Week (Regression Fix)

## Implementation Plan

- Wave 1 establishes failing tests (Red) for all impacted weekStore paths.
- Wave 2 applies minimal store logic fixes (Green).
- Wave 3 adds an end-to-end behavioral guard for non-zero active voting weeks.
- Wave 4 runs drift + impacted tests to close regression surface.

## Tasks

- [x] 1. WeekStore Unit Tests - Red Cases For Non-Zero Voting Week
  - Update `pwa/src/store/weekStore.test.ts`.
  - Add failing tests for:
    - `init(1)` with `status=1` must request `getSmartDefaults(1)`.
    - `openVoting()` at `weekOffset=1` must request `getSchedule(1)` + `getSmartDefaults(1)`.
    - `sync()` at `weekOffset=1` with `status=1` must request `getSmartDefaults(1)`.
  - Add explicit assertions that hardcoded week `0` is not requested in those scenarios.
  - Run targeted unit tests and confirm red state before implementation.
  - _Requirements: AC-1, AC-2, AC-3, AC-4_

- [x] 2. WeekStore Logic Fix - Replace Week-0 Hardcoding With Current Week
  - Update `pwa/src/store/weekStore.ts` only.
  - Change smart-default gating to status-based (`status === 1`) in `init`.
  - In `openVoting()`, fetch schedule/defaults using current store week offset.
  - In `sync()`, request defaults for current store week offset when status is voting open.
  - Preserve all existing merge/build logic and optimistic guards.
  - _Requirements: AC-1, AC-2, AC-3_

- [x] 3. WeekStore Unit Tests - Green Verification
  - Re-run updated `weekStore` unit test suite.
  - Ensure all newly added regression tests pass.
  - Confirm existing voting and pending-slot behavior tests remain green.
  - _Requirements: AC-4_

- [x] 4. Planner E2E Regression Guard - Non-Zero Active Voting Week
  - Create or extend planner E2E spec:
    - Deterministic clock set to Monday.
    - Mock `weekOffset=1` schedule as `status=1`.
    - Mock `GET /api/schedule/1/smart-defaults` with at least one pre-selected recipe.
    - Navigate with `getByTestId('next-week')`.
    - Assert pending vote signal renders using `getByTestId('vote-count')`.
  - Ensure all selectors use `data-testid` only.
  - _Requirements: AC-4_

- [x] 5. Validation Gate
  - Run `task agent:drift`.
  - Run `task agent:test:impact`.
  - If impact is uncertain, run `task review`.
  - Record outcome in task notes.
- _Requirements: AC-4_

## Task Notes

- Task 3 validation: `task test:unit` passed (`437 passed`, `4 skipped`).
- Task 4 implementation: added `pwa/e2e/planner-smart-defaults-week-offset.spec.ts` with weekOffset=1 voting-open smart-defaults guard using `getByTestId('next-week')` and `getByTestId('vote-count')`.
- Task 5 validation:
  - `task agent:drift` passed (no route/schema/mock drift; Tier 0 skipped because API endpoint was not reachable in sandbox).
  - `task agent:test:impact` passed (`160 passed`, `4 skipped`) after adding family identity seeding in the new E2E spec.

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": [1],
      "goal": "Establish red tests that expose current regression"
    },
    {
      "wave": 2,
      "tasks": [2],
      "dependsOn": [1],
      "goal": "Apply minimal fix in weekStore"
    },
    {
      "wave": 3,
      "tasks": [3, 4],
      "dependsOn": [2],
      "goal": "Prove green at unit + behavioral layers"
    },
    {
      "wave": 4,
      "tasks": [5],
      "dependsOn": [3, 4],
      "goal": "Close validation gates and drift checks"
    }
  ]
}
```
