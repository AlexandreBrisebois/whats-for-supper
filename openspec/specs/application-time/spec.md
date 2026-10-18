# application-time Specification

## Purpose

Make API application time-dependent behavior deterministic while preserving UTC operational timestamps and established scheduling semantics.

## Requirements

### Requirement: Use supplied application time

API application timestamps, time-based eligibility, continuation expiry and workflow due/retry/reclamation decisions SHALL use supplied current time. Operational timestamps and UTC cron schedules SHALL retain UTC semantics. Production SHALL supply real time at composition; application consumers SHALL NOT silently fall back to system time.

#### Scenario: Fixed operational instant
- **WHEN** application time is fixed while an operation creates or updates timestamped state
- **THEN** generated timestamps and time-based decisions use that supplied instant, preserving explicit imported timestamps

#### Scenario: Expiration boundary
- **WHEN** supplied current time reaches a search continuation's expiration
- **THEN** the continuation expires at the inclusive boundary without waiting for real time

#### Scenario: Scheduling boundary
- **WHEN** supplied time is before, at or after a scheduled workflow instant
- **THEN** existing due-time, retry and stale-cutoff comparisons retain their operators using supplied time

#### Scenario: Independent elapsed time
- **WHEN** wall-clock time changes during measured work
- **THEN** diagnostic durations retain monotonic measurement and timers retain their existing scheduling behavior
