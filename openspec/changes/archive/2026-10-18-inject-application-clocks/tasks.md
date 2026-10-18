# Tasks

## 1. Cooked civil-date cooldown

**Outcome and scenarios:** recipe-rotation civil-date requirements; cutoff, Toronto/UTC, DST, legacy provenance and preserved exclusions.
**Owners and boundaries:** ScheduleService finalization → PostgreSQL cooked state → Dreaming; fake time only.
**Dependencies and prerequisites:** pinned .NET SDK and disposable PostgreSQL/pgvector.
**Acceptance boundary:** real schedule and reconciliation services; no production data.

- [x] 1.1 Add the schedule/finalization-to-Dreaming regression; run `task test:database -- --filter FullyQualifiedName~ClockCooldown` and observe intended boundary failure.
- [x] 1.2 Preserve matched event civil dates and legacy timestamp interpretation; rerun the focused test green including UTC/Toronto, before/on/after cutoff, DST/week rollover and Human OFF.
- [x] 1.3 Run WeeklyInterestPostgresTests and deterministic current-plan Discovery coverage; record evidence and compatibility notes.

## 2. Operational timestamps and scheduling

**Outcome and scenarios:** application-time fixed-instant and scheduling requirements.
**Owners and boundaries:** controllers, services, processors and timestamp creation owners; preserve SQL defaults and monotonic durations.
**Acceptance boundary:** fixed-clock behavioral tests through production DI and direct worker/service tests.

- [x] 2.1 Add fixed-instant regression coverage for health, workflow reset and representative create/update timestamps; run focused `task test:api` red before each consumer slice.
- [x] 2.2 Inject required clocks, remove model real-time defaults and stamp creation owners; run focused coverage and affected API tests green, documenting the complete inventory and exceptions.

## 3. Search and history dependency seams

**Outcome and scenarios:** deterministic new-recipe cutoff and continuation expiration, configured complete-week historical windows.
**Owners and boundaries:** search predicate/lexical/semantic/service/continuation and recipe-history consumers.

- [x] 3.1 Add fixed-clock cutoff/expiration and configured-calendar tests; observe focused `task test:api` behavioral red.
- [x] 3.2 Require clock/history dependencies and pass supplied time consistently; run affected search/history API and relational tests green, preserving continuation Monday token and no-history behavior.

## 4. Final integration

- [x] 4.1 Reconcile inventory, scope and scenario evidence; run preparation and complete `task verify` with reviewed paths and record results, skips and failures honestly.

## Workflow follow-up

- Publish recoverable checkpoints through GitHub connector, create draft PR referencing #268, update issue coverage truthfully.
- Synchronize and archive completed OpenSpec change, validate/verify resulting state, and verify exact final-head CI before any review-ready claim. No merge/deploy/release.
