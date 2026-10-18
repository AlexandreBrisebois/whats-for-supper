# Proposal

## Why

Issue #268 identifies remaining direct application clock reads that prevent deterministic time-boundary tests. Source inspection also shows schedule-derived cooked civil dates encoded as UTC midnight and then projected into Toronto by Dreaming, potentially moving Monday to Sunday and releasing cooldown a week early; runtime reproduction is pending.

## Outcome and Scope

Implement the authorized API clock cleanup and cooked-date correction on an isolated review branch. Preserve UTC operational instants, UTC cron scheduling, elapsed-time measurements, deployment-calendar weeks, historical ranking, current-plan exclusions and persistent Human OFF. No production data changes, recovery redesign, merge or deployment.

## What Changes

- Supply required IClock dependencies to API application time consumers and remove silent SystemClock/history defaults.
- Remove application model system-time initializers; creation owners must supply timestamps explicitly.
- Preserve schedule-derived civil cooked dates through Dreaming without reinterpreting imported legacy timestamps as civil dates.
- Add deterministic fixed-instant and actual schedule/finalization-to-Dreaming regression coverage, including UTC, Toronto, cutoff and DST/week rollover.

## Capabilities

### New Capabilities

- `application-time`: deterministic UTC application timestamps and scheduling inputs through the established clock seam.

### Modified Capabilities

- `recipe-rotation`: preserve authoritative cooked calendar dates at inclusive cooldown boundaries.

## Impact

API controllers, services, processors, timestamp creation sites and tests; no public payload shape change. ManagementService and ManagementController overlap independent recovery issue #244; changes here are clock-only and require integration coordination. Stopwatch and timer/delay mechanics remain elapsed/scheduling infrastructure. SystemClock remains the production adapter. SQL timestamp defaults remain database defaults. Existing browser calendar clock injection is separate; unrelated browser greeting/auth/upload metadata behavior is not rewritten.
