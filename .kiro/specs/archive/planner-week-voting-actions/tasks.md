# Tasks — planner-week-voting-actions

## Overview

This is a PWA-only cleanup. No contract, DB, or generated client work is expected.

Model fit: `SMALL_SAFE`. The work is bounded to planner UI ownership, one existing component, planner page wiring, and tests.

## Task Dependency Graph

```json
{
  "waves": [
    {
      "name": "Wave 1 - Red tests",
      "parallel": false,
      "tasks": ["1", "2"]
    },
    {
      "name": "Wave 2 - Slot pivot cleanup",
      "parallel": false,
      "tasks": ["3"]
    },
    {
      "name": "Wave 3 - Planner voting actions",
      "parallel": false,
      "tasks": ["4", "5"]
    },
    {
      "name": "Wave 4 - E2E and validation",
      "parallel": false,
      "tasks": ["6", "7"]
    }
  ]
}
```

## Implementation Plan

- [x] 1. Tests - Invert PlanningPivotSheet voting expectations
  - File: `pwa/src/components/planner/PlanningPivotSheet.test.tsx`
  - Remove the `@/lib/auth` mock if no longer needed by pivot tests.
  - Remove navigator clipboard/share setup from pivot tests if no longer needed.
  - Update `renderSheet()` props to omit `onAskFamily` and `isVotingOpen`.
  - Replace voting-action tests with assertions that these IDs are absent:
    - `pivot-ask-family`
    - `pivot-nudge-family`
    - `pivot-nudge-dialog`
  - Keep assertions that these IDs are present:
    - `pivot-quick-find`
    - `pivot-search-library`
    - `pivot-remove-recipe` when `hasRecipe` is true
  - Add coverage that `pivot-remove-recipe` is absent when `hasRecipe` is false.
  - Reach red state before editing `PlanningPivotSheet.tsx`.
  - _Requirements: AC1, AC5_

- [x] 2. Tests - Add planner action row voting coverage
  - File: prefer an existing planner page test file if present; otherwise create focused planner page/component coverage near `pwa/src/app/(app)/planner/`.
  - Mock `useWeekStore` or the API fixtures so the planner renders deterministic schedule states.
  - Assert draft non-past week:
    - `ask-family-cta` is visible.
    - `nudge-family-cta` is absent.
  - Assert locked non-past week:
    - `ask-family-cta` is visible.
  - Assert voting-open week:
    - `ask-family-cta` is absent.
    - `voting-status-badge`, `close-voting-btn`, and `nudge-family-cta` are visible.
    - `nudge-family-cta` is the first interactive control in `planner-action-row`, replacing the Ask position.
  - Assert past week:
    - `ask-family-cta` is absent for statuses `0` and `2`.
  - Mock `getVotingLink` and browser share APIs.
  - Assert `nudge-family-cta` opens `planner-nudge-dialog`.
  - Assert `planner-nudge-copy` writes the generated URL and shows `planner-nudge-copied-feedback`.
  - Assert `planner-nudge-share` calls `navigator.share` when available.
  - Reach red state before planner implementation.
  - _Requirements: AC2, AC3, AC4, AC5_

- [x] 3. PlanningPivotSheet - Remove whole-week voting controls
  - File: `pwa/src/components/planner/PlanningPivotSheet.tsx`
  - Remove imports that only support voting/nudge:
    - `Users`
    - `Share2`
    - `Copy`
    - `getVotingLink`
    - `useEffect` if no longer needed
  - Remove props:
    - `onAskFamily`
    - `isVotingOpen`
  - Remove local nudge state and handlers:
    - `shareUrl`
    - `showNudgeDialog`
    - `copied`
    - `canShare`
    - `handleNudge`
    - `handleCopy`
    - `handleShare`
  - Delete the `pivot-ask-family` button.
  - Delete the `pivot-nudge-family` button.
  - Delete the `pivot-nudge-dialog` overlay.
  - Keep slot actions unchanged:
    - `pivot-quick-find`
    - `pivot-search-library`
    - `pivot-remove-recipe` gated by `hasRecipe`
  - _Requirements: AC1_

- [x] 4. Planner Page - Move Nudge behavior to planner action row
  - File: `pwa/src/app/(app)/planner/page.tsx`
  - Reuse the existing nudge dialog markup and behavior from `PlanningPivotSheet`; move it to planner-level code rather than designing a new dialog or creating a new component.
  - Import `Share2`, `Copy`, and `X` if needed for the planner-level nudge dialog.
  - Import `getVotingLink` from `@/lib/auth`.
  - Add planner-local state:
    - `showNudgeDialog`
    - `shareUrl`
    - `copied`
  - Add `canShare = typeof navigator !== 'undefined' && !!navigator.share`.
  - Add an effect that runs when `showNudgeDialog` becomes true:
    - call `getVotingLink(window.location.origin)`.
    - set `shareUrl` to the returned URL or `${window.location.origin}/discovery`.
  - Add planner-level handlers:
    - `handleNudgeFamily`
    - `handleCopyVotingLink`
    - `handleShareVotingLink`
  - Add `nudge-family-cta` as the first interactive control in `planner-action-row` when `isVotingOpen`, before `voting-status-badge` and `close-voting-btn`.
  - Move the existing dialog overlay outside the pivot sheet, rename its root test ID to `planner-nudge-dialog`, and add the remaining planner-scoped test IDs from `design.md`.
  - _Requirements: AC3, AC4, AC5_

- [x] 5. Planner Page - Update Ask visibility and pivot wiring
  - File: `pwa/src/app/(app)/planner/page.tsx`
  - Add:
    ```ts
    const canOpenVoting = !weekIsPast && (status === 0 || status === 2);
    ```
  - Replace the `ask-family-cta` condition with `canOpenVoting`.
  - Keep `handleAskFamily` calling `useWeekStore.getState().openVoting()`.
  - Remove `onAskFamily={handleAskFamily}` from `<PlanningPivotSheet />`.
  - Remove `isVotingOpen={isVotingOpen}` from `<PlanningPivotSheet />`.
  - _Requirements: AC2, AC3_

- [x] 6. E2E - Update planner voting flow ownership coverage
  - File: `pwa/e2e/planner-full-cycle.spec.ts`
  - Rename the existing voting flow test away from "shows Nudge button in pivot sheet".
  - Use `page.getByTestId(...)` for all interactions.
  - After `ask-family-cta` opens voting, assert:
    - `nudge-family-cta` is visible in the planner action row.
    - `nudge-family-cta` is the first button/control in the planner action row, occupying the prior Ask position.
    - opening a day pivot does not reveal `pivot-nudge-family`.
  - Add or update a locked-week fixture test:
    - schedule response `status: 2`.
    - Sunday date not past.
    - assert `ask-family-cta` is visible.
  - Use static dates or fixed Playwright clock. Do not rely on the current real date.
  - _Requirements: AC1, AC2, AC3, AC5_

- [x] 7. Validation - Run impact and gate
  - Run:
    ```sh
    task agent:test:impact
    ```
  - Then run:
    ```sh
    task gate
    ```
  - If any surface expands beyond PWA planner UI/tests, also run:
    ```sh
    task agent:drift
    task review
    ```
  - _Requirements: AC5_

## Escalate If

- The existing generated client cannot express the current voting open/lock calls.
- Planner page tests require broad rewiring of global stores beyond the planner action row.
- The nudge dialog needs a shared component used outside planner.
- Any desired behavior requires changing schedule status semantics or OpenAPI.
