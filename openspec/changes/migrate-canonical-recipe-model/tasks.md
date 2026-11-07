# Tasks

Planning only; every implementation box remains unchecked. Separate approval is required to apply. Names of new tests below are proposed suites to create; no behavioral test has run in this spec session. Follow [shared corpus](../canonical-ingredient-correction/acceptance-corpus.md) and [CI requirements](../canonical-ingredient-correction/review.md). Resolve consequential holds before finalizing their dependent work; outlines below do not approve an assumption. Contract changes first update `specs/openapi.yaml`, run `task gen:client`, then synchronize generated SDK consumers and method-sensitive `pwa/e2e/mock-api.ts` handlers/builders/state transitions including conflicts, later reads and SSE. Every slice keeps its red/green evidence and usage documentation.

## 1. Rehearse in-place forward conversion on disposable copies

**Outcome/scenarios:** C10–C16, C37–C39, C44, C48; stable IDs and guarded/resumable publication.
**Owners/boundaries:** canonical publication, real PostgreSQL and copied recipe/source/media store. Design depends on all shared contracts; no production resources. Allocation/check-policy holds must be settled before affected conversion is finalized.

- [ ] 1.1 Deliver no-write manifest schema and synthetic before/after protected-field fixtures for live/source hashes, IDs/links, human fields, quantities/notation, basis, steps/coverage, media and check mapping. Verify unsupported/conflict/defer outcomes and inventory every writer, including file-before-DB repair and stale old tabs. Keep absent-ID creation and disk/live precedence unselected.
- [ ] 1.2 Add proposed `CanonicalRecipeMigrationPostgresTests` for atomic per-recipe conversion, no positional associations, null/empty, unknown basis, stop/resume, stale human edit, identical replay and preserved household state. Run `task test:database -- --filter FullyQualifiedName~CanonicalRecipeMigrationPostgresTests` for intended red before conversion logic; implement in-place guarded conversion and run green with actual database/files. Record exact protected hashes/relationship counts and usable deferred recipes, not only processed counts.

## 2. Recover current format and reject unsupported old backups

**Outcome/scenarios:** C19–C25, C40–C42, C48; complete current recovery and distinct forward import.
**Owners/boundaries:** ManagementService/RecipeExportContent/RecipeRepository/disk sync, existing online recovery and durable state. Depends on group 1 plus final persisted identities/step/check contracts.

- [ ] 2.1 Define approved version-2 envelope/manifest and operation preflight/status/error contracts in OpenAPI where public, regenerate client and update method-sensitive management POST/status mocks. Add proposed `CanonicalRecipeRecoveryPostgresTests` for exact values/revisions/bindings/IDs/protection, category/food references, household/prepared state/media, old-format rejection with zero writes, missing artifacts and stale-current merge vs explicit exact replacement. Run that `task test:database` filter before logic; do not introduce permanent legacy restore adapters.
- [ ] 2.2 Implement current-format export/merge/sync/exact preflight and separate bounded one-time converter; run 2.1 green plus `task test:database -- --filter 'FullyQualifiedName~OnlineRecoveryPostgresTests|FullyQualifiedName~GroceryExtraRecoveryPostgresTests'`. Rehearse interruption around file activation/DB commit and verify exact read-back in another isolated destination. Document operation-specific preservation/replacement and unsupported formats; backup dispatch is not completion.

## 3. Qualify client fencing and cutover packet

**Outcome/scenarios:** C20–C21, C32, C36–C39, C43–C44, C48–C50.
**Owners/boundaries:** old browser/worker fences, all-field draft recovery, manifest checkpoints and independent rollback pair. Depends on groups 1–2 and completed step-scaling acceptance; production execution remains separate.

- [ ] 3.1 Add old tab/name-only-full-payload and delayed worker fixtures through real API/generated client/DB and stateful browser mocks; run intended red before fencing logic then green with retained draft fields and no partial mutation. Rehearse owned nonproduction writer drain/restart, fresh-backup read-back and exact old snapshot/application recovery pair; record measured interruption window and actual identity/results in rollout packet.
- [ ] 3.2 Prepare operator-reviewable in-place release packet under `rollout.md`: exact candidate/schema, required first-pass browser/real DB/live results, no-shopping condition, manifests, unresolved/conflicted IDs, pending derived work, recovery proof and approval scope. Verify no implementation task or packet claims success from skipped/not-run stages. Production execution, commit/push/deploy/archive are not tasks authorized by this spec session.

**Unfinalized dependent work:** after actual affected-set assessment and user decision, finalize one-time ambiguous name-check transition and its idempotent fixtures. Recipe-only disk fallback remains conditional; if needed, first approve the concrete disk/live field-precedence manifest, then finalize its implementation tasks. No blanket seed/reset or fallback execution task is approved here.

## 4. Final integration and verification

- [ ] 4.1 Reconcile this unit's corpus outcomes and preservation boundaries, run `task gen:client:check` where APIs changed, review the complete task-owned diff, then `task prepare -- <reviewed paths>` when applicable and `task verify -- <reviewed paths>`. Record invocation-specific record_path and actual passed/failed/blocked/skipped/not-run outcomes. Qualify required real seams with zero required skips and the parity owner's production/hosted-candidate requirements; no completion from mocked-only reads or missing stages.
