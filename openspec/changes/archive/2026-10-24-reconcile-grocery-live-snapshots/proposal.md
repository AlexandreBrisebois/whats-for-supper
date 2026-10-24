# Proposal

## Why

Raw connected and week_updated snapshots replace grocery lines while retaining old checks because the store only reads the generated GET dictionary wrapper (#249).

## Outcome and Scope

Eligible snapshots reconcile both supported check-map representations, including empty maps, under existing absolute-week and optimistic-move guards. No check identity, grouping, conflict policy, server contract or publication changes.

## What Changes

- Reconcile raw live check dictionaries consistently with generated schedule reads.
- Preserve absent-map retention, wrong-week rejection and deferred optimistic snapshots.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `household-live-updates`: apply available snapshot adjuncts from raw or generated dictionaries.

## Impact

`weekStore.applySnapshot` and focused store/stream regressions. Existing ScheduleDays wire contract already declares a boolean dictionary; no generated client or backend changes.
