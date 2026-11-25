# Proposal

## Why

`PlannerPage` (`pwa/src/app/(app)/planner/page.tsx`) is a single 1,390-line
component and the most frequently changed page (110 commits). Whether one of its
seven overlays is open is tracked by eight independent `useState` values. Their
transitions are coordinated through timers and render-time resets:

- `showPivot`, `selectedDayIndex`, `showQuickFind`, `pendingQuickFindDayIndex`,
  `nonCookingTarget`, `pendingCookedDefer` (+ `cookedDeferSubmitting`),
  `showNudgeDialog`, `openDetailRecipeId` (+ `detailSource`) and `pendingRecovery`.
- Pivot → Quick Find closes the pivot, stores a pending day index, then opens
  Quick Find from an effect after a 240 ms `setTimeout`. Observed in source:
  `PlanningPivotSheet` returns `null` when closed, outside any `AnimatePresence`,
  so no exit animation runs. The delay waits for nothing visible.
- A `planDate` deep link opens the pivot through a 0 ms `setTimeout`.
- Non-cooking saves guard their close with an `activeNonCookingDate` ref so a
  stale save does not close a newer sheet.
- Every close handler must remember to reset the same three or four flags. Many
  repeat `setShowPivot(null); setSelectedDayIndex(null); setPendingQuickFindDayIndex(null)`.

Every overlay opens one after another: each is a modal with a backdrop and is
reached from the previous one. Even so, nothing in the code prevents two of them
being flagged open at once. Each new planner feature adds more flags and more
reset sites.

The post-planning confirmation receipt is a second mixed-in concern. It covers
`planningConfirmation`, `confirmationRetry`, the success ring
(`successDay`/`successSeq`/`fadedSeq`), its context reset during render, its
auto-dismiss timer and the planning-result read effect, about 190 lines in total.

## Outcome and Scope

Success means:

1. Overlay state for the Planner page is a single value that can name at most one
   open overlay, with transitions defined in one pure reducer that has its own
   unit tests.
2. The planning-confirmation receipt and success ring live in their own hook.
3. Every existing Planner unit and E2E scenario passes unchanged, apart from the
   one timing expectation below.
4. Test reliability does not regress, measured by repeated runs with retries
   disabled before and after the change. Removing the two handoff timers takes
   away races between the tests and this page. Observed: recent flake fixes
   (`ea68272d`, `b062993a`, `a3232949`) were in other areas, so this change
   is not expected to fix the flakes currently seen in CI.

**Decided (user, 2026-11-24):** losing the handoff delays is acceptable; the goal
is more reliable tests.

**Single observable change (decided):** choosing Quick Find from the pivot opens
Quick Find in the same interaction instead of about 240 ms later. Nothing is
animating during that gap (see Why), and no spec requires the delay.

**Focus return (decided, user, 2026-11-24):** when Quick Find closes, focus
returns to the page, not to a specific day card. This matches the behavior before
this change (see design → User Experience). A test asserts it.

**In scope:** `pwa/src/app/(app)/planner/page.tsx`, new hooks under
`pwa/src/lib/planner/` or alongside the page, and `pwa/src/app/(app)/planner/page.test.tsx`.

**Out of scope:** recipe-detail verification state (`verifiedDetail`,
`detailReview`, `detailReadAttempt`), the supper-servings editor, drag-and-drop,
the close-voting `showSuccess` banner, `PlannerDayCard`, the sheet components'
props and markup, adding an exit animation to `PlanningPivotSheet`, and any
API, contract or store change.

## What Changes

- Quick Find opens immediately when chosen from the planning pivot (previously
  after about 240 ms).
- No other user-visible change. Every overlay's content, actions, focus
  behavior, deep links (`planDate`, `detailRecipe`, `portions`) and error recovery
  stay the same.
- Internal: overlay flags, the 240 ms and 0 ms handoff timers and the
  `activeNonCookingDate` ref are replaced by a reducer-backed overlay hook, and
  the confirmation logic moves to its own hook.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The change sets `skip_specs: true`. `meal-assignment` already owns the
observable behaviors this refactor must preserve:

- carrying an empty planner day into recipe selection,
- finishing or recovering the Quick Find selection,
- entering recovery before replacing an occupied day, including resuming the
  replacement after dismissal,
- completing recovery after awaited assignment.

None of them specify the handoff delay. The scenario wording "pending pivot
handoff state clear" refers to internal state this change removes. It remains
trivially satisfied and is noted in design.md as a candidate wording cleanup, not
part of this change.

## Impact

- Code: `pwa/src/app/(app)/planner/page.tsx`, plus two new hook modules and their tests.
- Tests: `pwa/src/app/(app)/planner/page.test.tsx` (75 existing tests act as the
  preservation net) and the Playwright specs `pwa/e2e/action-pivot.spec.ts`,
  `pwa/e2e/planner.spec.ts`, `pwa/e2e/planner-non-cooking-days.spec.ts` and
  `pwa/e2e/recipe-recovery.spec.ts`.
- No OpenAPI, generated client, mock API, backend or database impact.
