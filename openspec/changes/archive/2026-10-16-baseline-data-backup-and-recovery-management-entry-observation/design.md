# Design

## Context

See [proposal](proposal.md) for motivation and the [delta](specs/data-backup-and-recovery/spec.md) for observable behavior. Evidence BSL-data-backup-and-recovery-001–003 is recorded in the [capability plan](../../../../docs/openspec-baseline/data-backup-and-recovery.md), at commit 04a1c4570f9bbb01b47436790d4248635ac3179a.

ManagementController.Backup/Restore/DisasterRecovery → IWorkflowOrchestrator.TriggerAsync → db-backup/db-restore/db-disaster-recovery YAML → ManagementProcessor → ManagementService. GetStatus reads persisted instances/tasks. Program applies global household authorization and SkipWrapping preserves the flat management response.

## Goals / Non-Goals

**Goals:** Extract this existing path, distinguish source support from test assertions, and retain schema-valid drafts for human review. The first observable slice is management request acceptance and latest-result observation; the trace above names its affected entry, storage and workflow boundaries.

**Non-Goals:** No runtime or API changes, new tests, household-data operations, human acceptance, promotion or archival. Demo, preview qualification and Synology variants remain outside scope.

## Decisions

- Use additive requirements in the approved `data-backup-and-recovery` capability path. Separate slices keep each evidence boundary reviewable; a single large delta would obscure different failure surfaces.
- Reference actual shared owners rather than restating their lifecycle/access/delivery policy: [household identity](../../../specs/household-identity/spec.md), “Authenticate protected API requests independently”; [background processing](../../../specs/background-processing/spec.md), “Start child workflows through shared acceptance”, “Resolve child cron schedules against future UTC minutes” and “Prune only old terminal workflow history”. Recipe lifecycle facts remain owned by [recipe library](../../../specs/recipe-library/spec.md), “Represent persisted recipe attribution and readiness”.
- Accept implementation-supported evidence for this draft under A10; tests are inspected assertions with fixture substitutions, not observed current passes. Unsupported guarantees are recorded below rather than repaired or elevated to desired behavior.

## Risks / Trade-offs

GetStatus also considers demo workflows: ordinary results are conditional on the selected latest instance being ordinary. Demo health fields are excluded. OpenAPI omits the implemented missing-history 404; record it without a normative error response. No role/admin/member/PIN gate is implemented here; reuse household authentication ownership. DisasterRecoveryAsync only merges missing attribution placeholders into family-members.json; its direct Recipe deserialization can fail for array-valued ingredients. It does not restore database state or assets.

U12 remains open: no inferred atomic file/database changes, durable enqueue or broadcast, exactly-once execution or complete disaster recovery. Check outcomes and test substitutions are in the capability plan.

## Migration Plan

Documentation only: no deployment or data migration. Human review is the next lifecycle step. Main-spec promotion and archival require separate authorization.
