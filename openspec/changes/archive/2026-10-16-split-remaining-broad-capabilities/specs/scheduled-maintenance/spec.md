# Spec Delta

## Purpose

Schedule and compose recurring application maintenance, process due maintenance commands and write local reports, distinguishing launch acceptance from child workflow completion and cleanup outcomes.

## ADDED Requirements

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

The dreaming workflow SHALL request seven-day shared history pruning, backup launch, maintenance commands, overdue meal finalization, search reconciliation launch and filter materialization. Materialization SHALL depend on finalization; reporting SHALL depend on those six tasks; the next scheduled dreaming launch SHALL depend on reporting.

#### Scenario: Report after launch
- **WHEN** backup and reconciliation launch tasks have completed but their children remain active
- **THEN** report dependencies do not require child completion

#### Scenario: Next maintenance request
- **WHEN** the report task completes successfully
- **THEN** rescheduling can request the next dreaming instance through shared child-workflow acceptance

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
