# Planner Week Voting Actions Plan

## Goal

Standardize planner voting actions so whole-week voting is controlled from the planner week action area, not from an individual meal-slot popup.

## User Intent

Mom can open or reopen the whole week for voting from the planner. Even if the action originated while looking at a meal slot, voting applies to the entire week, not the individual meal. When voting is already open, keep the existing Nudge family features intact, but present them as week-level planner actions.

## Current Behavior

- `planner/page.tsx` shows `Ask the Family` in the planner action row when `status === 0` and the week is not past.
- `PlanningPivotSheet.tsx` also shows `Ask the family` when voting is not open.
- `PlanningPivotSheet.tsx` shows `Nudge family` when voting is open.
- The Nudge flow currently lives in `PlanningPivotSheet.tsx` and includes:
  - generated voting link via `getVotingLink`
  - copy to clipboard
  - native share
  - copied feedback

## Desired Behavior

- The meal-slot popup focuses only on meal-slot actions:
  - Quick find
  - Search library
  - Remove recipe, when applicable
- The planner action row is the single home for week voting actions.
- Show `Ask the Family` when the week can be opened or reopened for voting:
  - draft week: `status === 0`
  - finalized/locked week: `status === 2`
  - not a past week
- When voting is open (`status === 1`):
  - show `Voting live`
  - keep `Close Voting`
  - show `Nudge family`
  - keep the current Nudge copy/share behavior intact

## Design Rationale

### Why

Voting is a whole-week state. Putting `Ask the family` inside a meal-slot popup creates an affordance mismatch: the user may reasonably think they are asking about only that slot.

### How

Moving Ask/Nudge to the planner action row makes the scope obvious. The slot popup becomes lower-cognitive-load and thumb-friendly: choose a recipe, search, or clear the slot. The week-level action area handles family coordination.

## Proposed Implementation

1. Update tests first.
   - In `pwa/src/components/planner/PlanningPivotSheet.test.tsx`, replace voting-action expectations with assertions that Ask/Nudge are absent from the slot pivot.
   - Add or update planner page coverage for:
     - draft week shows `Ask the Family`
     - locked/reopenable week shows `Ask the Family`
     - voting-open week hides Ask and shows `Nudge family`
     - `Nudge family` opens the copy/share dialog

2. Move Nudge UI behavior to planner-level code.
   - Extract the existing nudge dialog logic from `PlanningPivotSheet.tsx`.
   - Prefer a small component if keeping it inside `planner/page.tsx` makes the page too bulky.
   - Preserve existing test IDs where practical, or add planner-scoped equivalents.

3. Simplify `PlanningPivotSheet.tsx`.
   - Remove `onAskFamily` and `isVotingOpen` props if no longer needed.
   - Remove `getVotingLink`, share, clipboard, and nudge dialog state from the pivot.
   - Keep `dayIndex`, `onQuickFind`, `onSearchLibrary`, `onRemoveRecipe`, and `hasRecipe`.

4. Update `planner/page.tsx`.
   - Introduce `canOpenVoting = !weekIsPast && (status === 0 || status === 2)`.
   - Show `Ask the Family` from the action row when `canOpenVoting`.
   - Show `Nudge family` from the action row when `isVotingOpen`.
   - Keep `Close Voting` when `isVotingOpen`.
   - Remove voting props from `PlanningPivotSheet`.

## Validation

Run the smallest relevant loop first:

```sh
task agent:test:impact
```

Then run the standard gate before completion:

```sh
task gate
```

If the changed surface expands beyond planner UI/tests, run:

```sh
task agent:drift
task review
```

## Definition of Done

- No meal-slot popup item suggests opening or nudging whole-week voting.
- Planner action row owns Ask/Nudge behavior.
- Opening/reopening voting still calls the existing week voting flow.
- Nudge still supports generated link, copy, share, and copied feedback.
- Relevant tests pass.
