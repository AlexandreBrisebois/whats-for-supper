# Proposal

## Why

Grocery check events and lifecycle hints use the same household stream but have different consumer scope from snapshots. Extract those shared consequences while retaining capture presentation/recovery and worker lifecycle ownership.

## What Changes

- Document supported grocery publication boundaries and loaded-week check-map replacement.
- Document shared ready-hint fan-out and available notification context forwarded to the existing capture journey.
- Retain capture's accepted readiness/failure behavior and background-processing's failure/retry rules by reference; record missing/repeated/missed event limitations without adding guarantees.
- Add BSL-household-live-updates-010/011 evidence and extraction/validation tasks only.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `household-live-updates`: missing grocery event and lifecycle dispatch consequences, without redefining journey behavior.

## Impact

Documentation only. Inspected boundaries: grocery ScheduleService/recompute, RecipeReadyProcessor/WorkflowWorker → publisher/manager → raw hook → planner check map, capture notification queue and GOTO ready set → existing journey consumers. No application, API/client, tests, dependencies or configuration edits; no runtime qualification, promotion or archive. U95–U101/A34 and incremental qualifications remain. No unresolved product decision blocks the conditional extraction.
