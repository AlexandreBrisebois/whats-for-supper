# Proposal

## Why

The existing baseline already requires automatic placement today or later. Source inspection shows the scan trusts a caller-supplied start index without comparing each eligible date to the returned calendar today; detail target refresh is tied to recipe/context or invalidation, and save rereads the slot without validating automatic-date freshness.

## Outcome and Scope

Correct automatic next-available placement and its lifetime using authoritative deployment calendar facts. Keep explicit historical Planner/day-chooser targets valid under their existing status/conflict rules. No calendar-policy, ranking, assignment API or historical-date prohibition.

## What Changes

- Filter automatic candidates against deployment-local today, including scans anchored to older Mondays.
- Invalidate and refresh automatic suggestions on deployment date rollover and resumption.
- Recheck calendar/date immediately before a new automatic save; show a changed dated suggestion for a new deliberate save rather than silently moving the request.
- Preserve explicit historical dates, uncertain-write reconciliation and bounded scanning.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `meal-assignment`: freshness and lower bound of automatic placement; explicit targets unchanged.

## Impact

`pwa/src/lib/planner/slotAssignment.ts`, RecipesExperience target resolution/save, existing deployment-calendar anchor/time helpers, Today calendar lifecycle and focused tests. Existing schedule calendar fields are sufficient; no new endpoint or migration.
