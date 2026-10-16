# Design

## Context

See [proposal](proposal.md) for motivation and the [delta](specs/data-backup-and-recovery/spec.md) for observable behavior. Evidence BSL-data-backup-and-recovery-018–020 is recorded in the [capability plan](../../../../docs/openspec-baseline/data-backup-and-recovery.md), at commit 04a1c4570f9bbb01b47436790d4248635ac3179a.

Program registers DreamingWorkflowSeederHostedService → DreamingWorkflowSeeder.SeedAsync → CronScheduleCalculator/shared acceptance; dreaming.yaml → prune/backup/maintenance/finalize/reconcile/materialize/report/reschedule → ManagementProcessor → ManagementService. StartWorkflow returns child acceptance without awaiting child completion.

## Goals / Non-Goals

**Goals:** Extract this existing path, distinguish source support from test assertions, and retain schema-valid drafts for human review. The first observable slice is scheduled orchestration, cleanup batches and recovery reports; the trace above names its affected entry, storage and workflow boundaries.

**Non-Goals:** No runtime or API changes, new tests, household-data operations, human acceptance, promotion or archival. Demo, preview qualification and Synology variants remain outside scope.

## Decisions

- Use additive requirements in the approved `data-backup-and-recovery` capability path. Separate slices keep each evidence boundary reviewable; a single large delta would obscure different failure surfaces.
- Reference actual shared owners rather than restating their lifecycle/access/delivery policy: [household identity](../../../specs/household-identity/spec.md), “Authenticate protected API requests independently”; [background processing](../../../specs/background-processing/spec.md), “Start child workflows through shared acceptance”, “Resolve child cron schedules against future UTC minutes” and “Prune only old terminal workflow history”. Recipe lifecycle facts remain owned by [recipe library](../../../specs/recipe-library/spec.md), “Represent persisted recipe attribution and readiness”.
- Accept implementation-supported evidence for this draft under A10; tests are inspected assertions with fixture substitutions, not observed current passes. Unsupported guarantees are recorded below rather than repaired or elevated to desired behavior.

## Risks / Trade-offs

Pruning policy is already owned by background-processing “Prune only old terminal workflow history”; do not duplicate it. Meal finalization/search-filter semantics remain with meal planning/search. YAML dependencies wait for launch tasks, not backup/search child completion; report may precede backup completion. No guaranteed recurring schedule or uninterrupted scheduler uptime. Maintenance may delete a referenced workflow before recipe safety checking; a skipped recipe does not guarantee workflow preservation. Files are deleted before database save; failed/processing maintenance commands are not selected by the pending batch query. Reports are local files, not delivered notifications, and prune-before-report may remove history.

U12 remains open: no inferred atomic file/database changes, durable enqueue or broadcast, exactly-once execution or complete disaster recovery. Check outcomes and test substitutions are in the capability plan.

## Migration Plan

Documentation only: no deployment or data migration. Human review is the next lifecycle step. Main-spec promotion and archival require separate authorization.
