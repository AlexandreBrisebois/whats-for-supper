# Proposal

## Why

Home changed-plan recovery combines separate planning operations differently from Planner. Extract its supported request order and visible outcomes without importing Planner’s stronger pending/retry behavior.

## What Changes

- Draft empty-night Order In, planned-meal recovery, replacement choice, move tomorrow, defer and drop.
- Describe cancellation before mutation and supported completion/navigation boundaries.
- Retain partial success, date mismatch, stale identity and concurrency limits in the capability evidence plan.

## Capabilities

### New Capabilities

- `tonight-meal-decisions`: Additional nonoverlapping Home recovery requirements for the same capability introduced by baseline-tonight-meal-decisions-home-states. Review with that draft and goto-choices.

### Modified Capabilities

None.

## Impact

Documentation only. Read HomeCommandCenter, SkipRecoveryDialog, todayStore, weekStore, generated schedule SDK/OpenAPI, ScheduleController/Service, calendar persistence and actual Home/schedule test assertions. BSL-tonight-meal-decisions-009/011/012 map evidence; TM-U01/TM-U02/TM-U07–TM-U09 qualify multi-request behavior. Shared date/mutation policy remains meal-planning-owned. No application edits, runtime qualification, acceptance, promotion or archival.
