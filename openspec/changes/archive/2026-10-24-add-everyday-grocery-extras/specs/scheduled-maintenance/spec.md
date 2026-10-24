# Spec Delta

## ADDED Requirements

### Requirement: Reconcile extra rollover during Dreaming

Each Dreaming run SHALL reconcile grocery-extra lineages through the deployment-calendar current Monday. It SHALL create exactly one occurrence for each missing elapsed week while the prior occurrence was unchecked and not removed, and SHALL leave checked, removed, current, and already-carried lineages unchanged.

#### Scenario: First Dreaming run after rollover
- **WHEN** Dreaming first runs after the deployment calendar enters a new Monday and an extra remained unchecked
- **THEN** the new current week receives exactly one carried occurrence and the prior occurrence remains an unchanged historical snapshot

#### Scenario: Dreaming runs again
- **WHEN** another Dreaming run reconciles the same current week
- **THEN** it creates no duplicate occurrence for a lineage already carried into that week

#### Scenario: Several weeks were missed
- **WHEN** Dreaming finds an unchecked lineage whose latest occurrence predates several elapsed Mondays
- **THEN** it materializes exactly one immutable snapshot for every missing elapsed week through the current Monday

#### Scenario: Lineage already ended
- **WHEN** the latest occurrence is checked or removed
- **THEN** Dreaming creates no successor for that lineage

### Requirement: Report rollover failure without claiming completion

Dreaming SHALL record the grocery-extra rollover outcome separately from its other maintenance work. A failed rollover SHALL not be reported as completed, shall not undo independently completed Dreaming tasks, and shall remain recoverable by a later Dreaming run or the grocery capability's idempotent current-week read repair.

#### Scenario: Rollover task fails
- **WHEN** grocery-extra rollover throws during Dreaming
- **THEN** its task and report identify failure without claiming that current-week extras were carried

#### Scenario: Later repair succeeds
- **WHEN** a later Dreaming run or current-week grocery read reconciles the same missing occurrences
- **THEN** uniqueness rules yield one occurrence per lineage and week without replaying completed carry-forward

## MODIFIED Requirements

### Requirement: Compose maintenance without waiting for launched child completion

The dreaming workflow SHALL request seven-day shared history pruning, backup launch, maintenance commands, overdue meal finalization, grocery-extra rollover, search reconciliation launch and filter materialization. Materialization SHALL depend on finalization; reporting SHALL depend on those seven tasks; the next scheduled dreaming launch SHALL depend on reporting.

#### Scenario: Report after launch
- **WHEN** backup and reconciliation launch tasks have completed but their children remain active
- **THEN** report dependencies do not require child completion

#### Scenario: Next maintenance request
- **WHEN** the report task completes successfully
- **THEN** rescheduling can request the next dreaming instance through shared child-workflow acceptance

#### Scenario: Grocery-extra rollover completes
- **WHEN** the rollover task reaches a terminal outcome
- **THEN** reporting receives that outcome before the next Dreaming instance is requested
