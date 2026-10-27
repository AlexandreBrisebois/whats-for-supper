# Proposal

## Why

The Planner's `1/7` badge counts displayed recipe IDs, including pending suggestions, but excludes intentional non-cooking plans. Human designer feedback questions its usefulness when the seven days are already visible; the count can also suggest a completion meaning it does not support.

## Outcome and Scope

Remove the weekly recipe-count badge entirely, with no replacement progress indicator or reserved centre slot. Keep existing week navigation, day content, voting actions and grocery behavior. This is a bounded presentation removal; drag behavior, date layout, contrast improvements and the grocery-view transition are separate work.

## What Changes

- Stop showing the weekly `n/7` badge across Planner states and viewports.
- Remove its decorative pulse, derived count and unused English/French translation keys.
- Collapse its dedicated layout slot while retaining the existing voting actions and their availability.
- Update the meal-planning requirement and affected unit/browser expectations.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `meal-planning`: render day content without a weekly recipe-count indicator.

## Impact

- `pwa/src/app/(app)/planner/page.tsx`: count derivation, badge and action-row layout.
- `pwa/src/locales/{en,fr}/common.json`: `planner.plannedCount` only.
- `pwa/src/app/(app)/planner/page.test.tsx` and `pwa/e2e/planner.spec.ts`: existing badge assertions and focused preservation checks.
- No API, persistence, generated client, mock-handler or dependency changes are needed. Existing schedule and voting semantics remain owned by their current capabilities.

No consequential unresolved decisions remain for this removal. Source inspection establishes the insertion points; rendered behavior has not been tested during planning.
