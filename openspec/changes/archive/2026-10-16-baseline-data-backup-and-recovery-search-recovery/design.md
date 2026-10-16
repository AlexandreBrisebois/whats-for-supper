# Design

## Context

See [proposal](proposal.md) for motivation and the [delta](specs/data-backup-and-recovery/spec.md) for observable behavior. Evidence BSL-data-backup-and-recovery-015–017 is recorded in the [capability plan](../../../../docs/openspec-baseline/data-backup-and-recovery.md), at commit 04a1c4570f9bbb01b47436790d4248635ac3179a.

ManagementService.BackupAsync joins ready search docs to visible recipes → search.index.json on disk. RestoreAsync rebuilds lexical content with RecipeSearchDocumentBuilder/SearchFingerprintService. SearchReconciliationWorkflow → index-recipe-search → SearchIndexWorkflow. ManagementController.BackfillSearch launches search-reconciliation in Task.Run.

## Goals / Non-Goals

**Goals:** Extract this existing path, distinguish source support from test assertions, and retain schema-valid drafts for human review. The first observable slice is search sidecar compatibility and bounded derived-state repair; the trace above names its affected entry, storage and workflow boundaries.

**Non-Goals:** No runtime or API changes, new tests, household-data operations, human acceptance, promotion or archival. Demo, preview qualification and Synology variants remain outside scope.

## Decisions

- Use additive requirements in the approved `data-backup-and-recovery` capability path. Separate slices keep each evidence boundary reviewable; a single large delta would obscure different failure surfaces.
- Reference actual shared owners rather than restating their lifecycle/access/delivery policy: [household identity](../../../specs/household-identity/spec.md), “Authenticate protected API requests independently”; [background processing](../../../specs/background-processing/spec.md), “Start child workflows through shared acceptance”, “Resolve child cron schedules against future UTC minutes” and “Prune only old terminal workflow history”. Recipe lifecycle facts remain owned by [recipe library](../../../specs/recipe-library/spec.md), “Represent persisted recipe attribution and readiness”.
- Accept implementation-supported evidence for this draft under A10; tests are inspected assertions with fixture substitutions, not observed current passes. Unsupported guarantees are recorded below rather than repaired or elevated to desired behavior.

## Risks / Trade-offs

Legacy sidecar text is not authoritative. Compatible schema is not proof of valid vector dimensions/nonempty data; current restore ready checks do not validate vector length. Malformed sidecars are logged without guaranteed pending fallback or SeedResult.Errors increment. Export skips non-ready docs without deleting stale disk sidecars. Active-job check/save/trigger are not atomic. Reconciliation sees only ready non-deleted recipes, does not guarantee convergence for all embedding states/models, and does not remove orphan docs. Ranking/eligibility policy belongs to recipe search; lifecycle/delivery belongs to background processing. Backfill response precedes persisted workflow acceptance and returns no taskId.

U12 remains open: no inferred atomic file/database changes, durable enqueue or broadcast, exactly-once execution or complete disaster recovery. Check outcomes and test substitutions are in the capability plan.

## Migration Plan

Documentation only: no deployment or data migration. Human review is the next lifecycle step. Main-spec promotion and archival require separate authorization.
