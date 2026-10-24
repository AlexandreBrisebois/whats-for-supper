# Scheduled maintenance Specification

## Purpose

Schedule and compose recurring application maintenance, process due maintenance commands and write local reports, distinguishing launch acceptance from child workflow completion and cleanup outcomes.

## Relocation provenance (non-normative)

These requirements were relocated unchanged from their original capability owners. All applicable BSL/U/A qualifications, partial-success boundaries and deferred runtime/API/browser/database/model evidence transfer with them. Relocation establishes no new behavioral guarantee.

- [data-backup-and-recovery evidence record](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/data-backup-and-recovery.md) and [preserved qualification text](../data-backup-and-recovery/spec.md#evidence-and-qualifications-non-normative)

## Capability dependencies (non-normative)

Preserved references to the former combined owners resolve through these current capability links. Each requirement retains its original normative text.

- [Repair derived search state in bounded batches](../search-indexing/spec.md#requirement-repair-derived-search-state-in-bounded-batches)
- [Persist filter snapshot and facts as one materialization](../search-indexing/spec.md#requirement-persist-filter-snapshot-and-facts-as-one-materialization)
- [Finalize only overdue planned or locked recipe assignments](../planning-lifecycle/spec.md#requirement-finalize-only-overdue-planned-or-locked-recipe-assignments)
- [Protect usable recipe content during failed-capture cleanup](../capture-recovery/spec.md#requirement-protect-usable-recipe-content-during-failed-capture-cleanup)
- [Start child workflows through shared acceptance](../background-processing/spec.md#requirement-start-child-workflows-through-shared-acceptance)
- [Resolve child cron schedules against future UTC minutes](../background-processing/spec.md#requirement-resolve-child-cron-schedules-against-future-utc-minutes)
- [Prune only old terminal workflow history](../background-processing/spec.md#requirement-prune-only-old-terminal-workflow-history)

## Requirements

### Requirement: Seed the maintenance schedule when no active instance exists

At startup, maintenance seeding SHALL skip when a dreaming instance is Pending or Processing. Otherwise it SHALL request dreaming at the next configured DREAMING_CRON_UTC occurrence, defaulting to 06:00 UTC daily through the shared background-processing cron rules.

#### Scenario: No active maintenance
- **WHEN** startup seeding finds no Pending or Processing dreaming instance
- **THEN** it requests the next configured maintenance occurrence

#### Scenario: Active maintenance
- **WHEN** startup seeding finds a Pending dreaming instance
- **THEN** it does not seed another instance

#### Scenario: Seed failure
- **WHEN** the hosted seeding attempt throws
- **THEN** the failure is logged by the hosted startup boundary

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

### Requirement: Process due pending maintenance commands with recorded outcomes

Maintenance SHALL select at most 50 pending commands due at its clock time, ordered by creation time. It SHALL mark each processing, increment attempts and persist started time before handling it, then record completed, skipped or failed outcomes and batch counts.

#### Scenario: Unsupported command
- **WHEN** a selected command type is unsupported
- **THEN** it is recorded skipped with unsupported-command-type

#### Scenario: Handler failure
- **WHEN** handling a selected command throws and failure persistence succeeds
- **THEN** it is recorded failed with error details while later selected commands can proceed

#### Scenario: Future or nonpending command
- **WHEN** a command is scheduled in the future or has failed/processing status
- **THEN** the due pending selection leaves it unselected

### Requirement: Clean failed-capture residue subject to the current recipe guard

For a failed-capture residue command, maintenance SHALL retain a recipe that is discoverable or has a nonblank name with images or synthesis. Otherwise, when the recipe exists, it SHALL delete its retained directory and remove the database recipe, recording the outcome.

#### Scenario: Safe residue
- **WHEN** the command targets a non-ready-shaped undiscoverable recipe and successful persistence is possible
- **THEN** its directory and recipe are removed and the command completes

#### Scenario: Recipe became ready-shaped
- **WHEN** the target recipe has a nonblank name and positive image count
- **THEN** the recipe is retained and the command is skipped

#### Scenario: Missing recipe
- **WHEN** the target recipe no longer exists
- **THEN** the command completes with recipe-not-found

### Requirement: Write a dated local maintenance report

Reporting SHALL write reports/dreaming-YYYY-MM-DD.md under the data root with prune and maintenance summaries, latest backup status by update time, failures updated in the last 24 hours, and Pending/Processing workflows older than one hour, or 24 hours for dreaming. It SHALL return path and failure/stuck counts.

#### Scenario: Stuck thresholds
- **WHEN** ordinary work is over one hour old while Pending dreaming is only two hours old
- **THEN** the ordinary work appears as stuck and that dreaming instance does not

#### Scenario: Old dreaming
- **WHEN** a Processing dreaming instance is older than 24 hours
- **THEN** it appears in the stuck list

#### Scenario: Daily replacement
- **WHEN** another report is generated for the same clock date
- **THEN** it overwrites that day’s local report path

### Requirement: Schedule recipe rotation reconciliation in Dreaming

The existing Dreaming workflow SHALL include recipe-rotation reconciliation and record its own outcome. Launching child work SHALL not be reported as completed reconciliation. Existing maintenance responsibilities and workflow retry/diagnostic ownership SHALL remain intact.

#### Scenario: Launch versus completion
- **WHEN** Dreaming dispatches reconciliation but the child fails
- **THEN** the parent launch does not establish that recipes were reconciled

#### Scenario: Recover nightly failure
- **WHEN** a nightly pass fails and a later pass succeeds
- **THEN** the later pass uses current dates/configuration and restores eligible recipes then

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
