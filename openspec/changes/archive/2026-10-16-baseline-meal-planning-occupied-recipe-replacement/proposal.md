# Proposal

## Why

The accepted meal-planning baseline covers empty-day assignment but stops at an occupied target. Extract existing replacement and Quick Find navigation without changing application behavior.

## What Changes

- Draft occupied-date replacement, Sunday displacement and caller-specific recovery.
- Distinguish suggestion Skip from persistence, cover deck read/inspection/invalidation behavior and preserve partial-success limits.
- Record BSL-meal-planning-022–024 and MP-U01–MP-U03 in the capability checkpoint.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `meal-planning`: Add source-supported occupied-recipe replacement requirements alongside the accepted empty-day requirements; no existing requirement is rewritten.

## Impact

Documentation only: this change and the meal-planning checkpoint. Read-only boundaries are planner/Search/Browse, QuickFindModal, slotAssignment, weekStore, generated schedule SDK, OpenAPI, ScheduleController/Service and calendar persistence. No implementation, contract/client/test changes, services, runtime qualification, promotion or archive. Human review remains pending under MP-G01.
