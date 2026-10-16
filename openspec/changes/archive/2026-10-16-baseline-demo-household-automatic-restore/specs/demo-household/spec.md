# Demo household delta

## Purpose

Describe the existing resettable showcase, its access presentation, snapshot effects, scheduling and bounded AI suppression so operators and household visitors can distinguish supported behavior from unqualified guarantees.

Shared rule owners: [household identity](../../../../../specs/household-identity/spec.md) and
[background processing](../../../../../specs/background-processing/spec.md). Named
requirements below refer to those owners without changing their shared policy.

## ADDED Requirements

### Requirement: Seed an initial restore only for eligible demo startup

On hosted startup with demo enabled, the seeder SHALL schedule demo-restore only when no demo-restore instance is Pending or Processing. Disabled demo mode SHALL skip seeding. The eligible startup SHALL use empty parameters and the next configured UTC cron occurrence as its root-task schedule.

#### Scenario: Disabled startup
- **WHEN** demo mode is disabled when seeding starts
- **THEN** no demo restore is seeded

#### Scenario: Existing active restore
- **WHEN** a demo-restore instance is Pending or Processing
- **THEN** seeding returns without creating another initial restore

#### Scenario: Eligible startup
- **WHEN** demo mode is enabled with no Pending or Processing demo-restore and cron calculation and acceptance succeed
- **THEN** a demo-restore instance is accepted with its root scheduled at the next configured UTC occurrence

#### Scenario: Only paused history
- **WHEN** only Paused or terminal demo-restore instances exist and other prerequisites succeed
- **THEN** those instances do not suppress the initial seed

### Requirement: Default the automatic restore schedule to daily UTC

Blank or absent DEMO_RESTORE_CRON_UTC SHALL select 0 3 * * *. Nonblank configuration SHALL supply the restore cron. Scheduling SHALL follow background-processing requirement `Resolve child cron schedules against future UTC minutes`, using a future whole UTC minute rather than an immediate catch-up run.

#### Scenario: Before daily target
- **WHEN** the default cron is resolved at 02:30 UTC
- **THEN** the next restore root schedule is 03:00 UTC that day

#### Scenario: At daily target
- **WHEN** the default cron is resolved at exactly 03:00 UTC
- **THEN** the next restore root schedule is 03:00 UTC the following day

#### Scenario: Custom daily target
- **WHEN** a valid configured cron selects 04:30 UTC and the clock is before that target
- **THEN** that configured target supplies the next eligible UTC schedule

### Requirement: Contain startup restore seeding failures

If cron calculation fails, initial seeding SHALL log INVALID_CRON and return without scheduling a restore. Other startup seeding exceptions SHALL be caught and logged by the hosted seeding boundary. These outcomes SHALL NOT imply a successful seed or a background seeding retry.

#### Scenario: Invalid cron
- **WHEN** the seeder cannot calculate the configured next occurrence
- **THEN** it logs a warning with INVALID_CRON and creates no restore through this seed

#### Scenario: Trigger fails
- **WHEN** workflow acceptance raises an exception during hosted seeding
- **THEN** the hosted boundary logs the failure and does not rethrow it as a seeder startup failure

### Requirement: Schedule recurrence after successful restore dependency

The demo-restore workflow SHALL place reschedule after the restore task. After successful dependency promotion, reschedule SHALL start another demo-restore using DEMO_RESTORE_CRON_UTC with the daily fallback. Child acceptance and retries SHALL follow background-processing requirements `Start child workflows through shared acceptance` and `Classify automatic retry eligibility at the attempt boundary`.

#### Scenario: Restore dependency succeeds
- **WHEN** restore completes and shared dependency promotion succeeds
- **THEN** reschedule can launch a child restore scheduled at the next configured occurrence

#### Scenario: Restore dependency fails
- **WHEN** restore has not completed successfully
- **THEN** the dependent reschedule remains ineligible through dependency promotion

#### Scenario: Child scheduling fails
- **WHEN** reschedule cannot calculate its cron or accept the child workflow
- **THEN** the task enters shared failure handling without certifying a future restore
