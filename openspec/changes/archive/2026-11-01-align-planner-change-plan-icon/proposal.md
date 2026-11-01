# Proposal

## Why

The home meal card uses opposing horizontal arrows for Change plan, while Planner uses circling arrows for the corresponding recipe-change entry point. Reusing the home icon makes the action easier to recognize across these surfaces.

## Outcome and Scope

Replace only the Planner recipe-row change icon with the home meal card's icon. Preserve Planner's existing accessible names, localization, action availability, sizing, hit targets and pivot-sheet behavior. Implementation was separately approved after review on 2026-10-31.

## What Changes

- Every rendered Planner recipe-row Change action uses opposing horizontal arrows instead of circling arrows, in narrow and wide layouts.
- Navigation, refresh and Save for Next Week icons retain their existing meaning and appearance.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `meal-planning`: consistent icon recognition for the existing recipe-change entry point.

## Impact

Source inspection at `9e0db0e2720ab5abad296f88fdd861a288217bd7` found `ArrowRightLeft` in `TonightMenuCard` and one `RefreshCw` placement in the shared `PlannerDayCard` in `pwa/src/app/(app)/planner/page.tsx`. Expected application edit: replace that import and icon element only. No API, data, dependency or translation changes. There are no unresolved design choices.
