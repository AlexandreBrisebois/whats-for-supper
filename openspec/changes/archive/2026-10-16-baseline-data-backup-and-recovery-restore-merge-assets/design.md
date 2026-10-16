# Design

## Context

See [proposal](proposal.md) for motivation and the [delta](specs/data-backup-and-recovery/spec.md) for observable behavior. Evidence BSL-data-backup-and-recovery-008–012 is recorded in the [capability plan](../../../../docs/openspec-baseline/data-backup-and-recovery.md), at commit 04a1c4570f9bbb01b47436790d4248635ac3179a.

ManagementService.RestoreAsync → family-members.json → IRecipeStore.ListRecipeIdsAsync/ReadInfoAsync/ReadRecipeJsonAsync/ReadSourcePdfAsync → placeholder members → recipe upserts → report/search slices → weekly/calendar JSON → category CSV → BackfillFinishedDishIndicesAsync. LocalRecipeStore enumerates GUID-named directories only.

## Goals / Non-Goals

**Goals:** Extract this existing path, distinguish source support from test assertions, and retain schema-valid drafts for human review. The first observable slice is file-driven merge, compatibility and retained asset recovery; the trace above names its affected entry, storage and workflow boundaries.

**Non-Goals:** No runtime or API changes, new tests, household-data operations, human acceptance, promotion or archival. Demo, preview qualification and Synology variants remain outside scope.

## Decisions

- Use additive requirements in the approved `data-backup-and-recovery` capability path. Separate slices keep each evidence boundary reviewable; a single large delta would obscure different failure surfaces.
- Reference actual shared owners rather than restating their lifecycle/access/delivery policy: [household identity](../../../specs/household-identity/spec.md), “Authenticate protected API requests independently”; [background processing](../../../specs/background-processing/spec.md), “Start child workflows through shared acceptance”, “Resolve child cron schedules against future UTC minutes” and “Prune only old terminal workflow history”. Recipe lifecycle facts remain owned by [recipe library](../../../specs/recipe-library/spec.md), “Represent persisted recipe attribution and readiness”.
- Accept implementation-supported evidence for this draft under A10; tests are inspected assertions with fixture substitutions, not observed current passes. Unsupported guarantees are recorded below rather than repaired or elevated to desired behavior.

## Risks / Trade-offs

No filesystem copying, native PDF rendering, asset integrity scan or missing-asset regeneration occurs. Restore uses multiple saves with no enclosing transaction; aggregate errors are not a complete failure ledger. JSON-only reconstruction restores a limited projection, not all Recipe fields. Invalid top-level JSON/member/plan/event files or final database saves can abort after earlier effects. Existing DeletedAt/AddedBy/CreatedAt are not reset by recipe merge; absence does not delete existing rows. No universal idempotence: timestamps and counts change. CSV reader is line-based despite writer quoting newlines; culture-dependent numeric export versus invariant import prevents a universal CSV round-trip guarantee.

U12 remains open: no inferred atomic file/database changes, durable enqueue or broadcast, exactly-once execution or complete disaster recovery. Check outcomes and test substitutions are in the capability plan.

## Migration Plan

Documentation only: no deployment or data migration. Human review is the next lifecycle step. Main-spec promotion and archival require separate authorization.
