# Recipe Detail Action Labels Refresh

## Summary

Standardize the Recipe Detail Sheet primary actions using the Mere-Designer recommendation:

- `Cook This`
- `Cook Tonight`
- `Plan for Later`
- `Plan for {day}`

Also refresh the secondary action area so `Ask the Family` uses the Stack Browser-style discovery toggle.

## Key Changes

- In `RecipeDetailSheet`, replace current visible labels:
  - `Cook this` -> `Cook This`
  - `Cook it tonight` -> `Cook Tonight`
  - `Plan for later` -> `Plan for Later`
  - `Add it to {plannerDayLabel}` -> `Plan for {plannerDayLabel}`
- Keep behavior unchanged:
  - `Cook This` opens the pivot when no planner day is active.
  - `Cook Tonight` assigns to today and returns home.
  - `Plan for Later` starts the later-planning flow.
  - `Plan for {day}` assigns directly to the planner-origin day.
- Replace the plain `Show / Hide from Discovery` button with the Stack Browser-style `Ask the Family` toggle card.
- Keep `Find Similar` in the bottom action area after the primary action/pivot and before `Ask the Family`.
- Use lucide `Search` for `Find Similar`.

## Test Plan

- Update Recipe page tests to assert the new labels.
- Preserve existing behavior-oriented test IDs:
  - `action-cook-this`
  - `action-cook-tonight`
  - `action-plan-later`
  - `action-add-to-day`
  - `action-find-similar`
  - `action-toggle-discovery`
- Verify `Find Similar` still searches with `similarToRecipeId`.
- Verify `Ask the Family` still PATCHes `isDiscoverable`.
- Run targeted recipe page tests, then `task gate`.

## Assumptions

- `Plan for {day}` uses the existing `plannerDayLabel`, such as `Monday` or fallback `Day 1`.
- No API, contract, or route changes are needed.
