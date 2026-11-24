# Spec Delta

## MODIFIED Requirements

### Requirement: Select due pending tasks for processor dispatch

Worker selection SHALL consider Pending tasks whose schedule is absent or due and whose parent instance is not Paused, select at most ten per batch ordered by scheduled time, and dispatch selected work subject to its processor throttle and active recovery write boundary without requiring a captured launch-authority payload on the parent instance. A task rescheduled into the future while awaiting its slot SHALL be skipped on reload. Selection SHALL NOT promise immediate execution or exclusive delivery.

#### Scenario: Due and future work coexist

- **WHEN** Pending tasks have absent, past and future scheduled times
- **THEN** selection admits absent or due schedules and excludes future schedules

#### Scenario: Pre-existing or restore-queued pending task without launch capture

- **WHEN** a due Pending task belongs to a non-Paused workflow instance whose `recipe_publication_capture` is null (such as a pre-upgrade task or a restore-queued search reconciliation workflow)
- **THEN** worker selection admits and dispatches the task instead of refusing it for missing launch authority

#### Scenario: Throttle wait changes eligibility

- **WHEN** a selected task is rescheduled into the future before its processor slot becomes available
- **THEN** the reloaded task is skipped without processor execution in that attempt
