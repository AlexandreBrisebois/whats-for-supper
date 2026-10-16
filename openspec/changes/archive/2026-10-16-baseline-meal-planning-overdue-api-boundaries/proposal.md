# Proposal

## Why

The remaining planning surface includes automatic overdue completion and direct suggestion reads. Document their planning consequences and finish the operation/owner inventory without expanding discovery, grocery, cooking or background policy.

## What Changes

- Add overdue calendar selection, completion persistence and affected-week publication requirements.
- Record direct suggestion-read non-persistence/representation boundaries without extracting ranking or eligibility.
- Reconcile all schedule controller operations and API-only/compatibility paths in BSL-meal-planning-034–036.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `meal-planning`: Add overdue completion and direct planning API read boundaries; preserve accepted requirements unchanged.

## Impact

Documentation only under MP-G01. Read FinalizeOverdueMeals workflow processor, startup backfill, ScheduleService, contract/generated clients and actual tests. Background-processing owns scheduler/retry, discovery owns suggestion policy, cooking owns history, groceries owns PATCH and recomputation, live updates owns delivery. No application edits, services, runtime qualification, promotion, archive or deployment. Human acceptance/promotion remain pending.
