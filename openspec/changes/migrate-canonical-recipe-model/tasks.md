# Tasks

## Current coordinated release policy — 2026-11-11

The user authorized completing the remaining accepted dependable-portions release
after predecessor C05 at `74f0a48b47ffd6eccb52d3710de58c384c2b6aaa`.
Local tests and exact-candidate data-preserving DV acceptance gate runtime slices;
applicable checks gate documentation slices. Commit accepted owned work locally
and continue the dependency queue without per-slice pushes. After full integrated
local/DV qualification, make one consolidated push, resolve required hosted CI
failures with justified repairs/follow-up pushes, then sync/archive only fully
completed in-scope changes. Required exact-final-candidate hosted acceptance stays
open until observed. Historical single-slice stopping and hosted-before-DV rules
below describe their original operations and are superseded prospectively by this
policy; historical failures/retries/limits remain unchanged. No production, reset,
reseed, force push, unrelated merge, garlic-placeholder implementation, bilingual
catalogue adoption or Similar UI work. Selective repair remains superseded.
Task IDs/checklists remain authoritative; partial slices do not close aggregates.
The operational navigation record is `.task/dependable-portions-coordinator/continuation.md`.


Unchecked combined tasks remain open until all their criteria pass; they do not
mean the underlying foundations are absent. Reuse existing Dreaming/management
backup, seed, sync and online-recovery owners. No parallel recovery API/package,
legacy canonical-write adapter or bilingual catalogue adoption is required.
Follow the [shared corpus](../canonical-ingredient-correction/acceptance-corpus.md)
and [CI requirements](../canonical-ingredient-correction/review.md). Contract changes
first update `specs/openapi.yaml`, regenerate the client and synchronize affected
consumers and method-sensitive mocks. Each selected increment records its own
red/green evidence and usage documentation; existing passing behavior is a
regression baseline, not an instruction to rebuild it.

| Task area | Implemented foundation to reuse | Remaining completion evidence |
| --- | --- | --- |
| 1.1–1.2 | Guarded per-recipe `ConvertAsync`, codec and `CanonicalRecipePersistencePostgresTests` | Selected-ID manifest and actual resumable invocation, deferred/conflict outcomes and protected-state read-back |
| 2.1–2.2 | Canonical backup/seed/sync in `CanonicalIngredientPublicationPostgresTests.ExistingFlows`; current-recovery inspection; existing exact snapshot/recovery | Final baseline inventory/publication, current-only activation and interrupted independent recovery |
| 3.1–3.3 | Canonical old-writer conflicts, draft recovery, recovery leases and grocery identity/check behavior | Coordinated deployment across restart, stale-tab refresh, no-active-list/new-list proof and operator packet |
| 4.1 | Earlier candidate-specific local evidence | Integrated final candidate and required hosted acceptance |

The bounded existing-operation checkpoint is
`.task/canonical-existing-flows-20261110/outcome.json` (126 required PostgreSQL
cases passed with zero skips at that checkpoint). It does not complete these
combined tasks. Proposed migration/recovery suite names below may be implemented
as focused extensions of existing owners; record actual selected names and reject
empty or skipped required selections. Task IDs remain stable for handoffs.

## 1. Rehearse in-place forward conversion on disposable copies

**Outcome/scenarios:** C10–C16, C37–C39, C44, C48; stable IDs and guarded/resumable publication.
**Owners/boundaries:** canonical publication, real PostgreSQL and copied recipe/source/media store. Freeze the baseline contracts exercised by each increment; no dependency on deferred catalogue adoption and no production resources. Workstream C owns orchestration and coordinates shared store hooks with A. Allocation/range/split-merge decisions are settled; next-list creation preserves historical data and conditional fallback stops on unexpected mismatches.

- [ ] 1.1 Deliver no-write manifest schema and synthetic before/after protected-field fixtures for live/source hashes, IDs/links, human fields, quantities/notation, basis, steps/coverage, media, historical list/check preservation and unchecked new-list creation. Verify unsupported/conflict/defer outcomes and inventory every writer, including file-before-DB repair and stale old tabs. For conditional fallback, compare stable IDs/content and stop/report unexpected missing IDs or fact mismatches before writes; do not add a per-recipe edit-conflict workflow solely for absent UI edits.
- [ ] 1.2 Add the missing selected-ID invocation/resume behavior to a focused `CanonicalRecipeMigrationPostgresTests` owner, reusing `CanonicalRecipePersistencePostgresTests` for atomic conversion, no positional associations, null/empty, unknown basis, stale human edit and identical replay. Run `task test:database -- --filter FullyQualifiedName~CanonicalRecipeMigrationPostgresTests` for intended red before implementing the operational path around the existing converter; run green with actual database/files and retain the existing persistence regressions. Document the actual invocation, input/checkpoint identities, exact protected hashes/relationship counts and usable deferred recipes, not only processed counts.

## 2. Recover current format and reject unsupported old backups

**Outcome/scenarios:** C19–C21, C40–C42, C48 and the preservation aspects of C22–C25; complete baseline recovery and distinct forward import. New bilingual mapping/translation behavior remains deferred.
**Owners/boundaries:** ManagementService/RecipeExportContent/RecipeRepository/disk sync, existing online recovery and durable state. Existing-operation work can proceed alongside group 1; final acceptance requires the baseline's persisted step/check/identity contracts and every reference actually present, not deployment of a new catalogue.

- [ ] 2.1 Extend the existing version-2 codec, backup/seed integrity preflight and current-recovery inspection only for missing baseline acceptance. Reuse `CanonicalIngredientPublicationPostgresTests.ExistingFlows` and add focused `CanonicalRecipeRecoveryPostgresTests` where needed for exact values/revisions/bindings/IDs/protection, present category/food references, absent optional mappings, household/prepared state/media, old-format rejection with zero writes, missing mandatory artifacts and stale-current merge vs explicit exact replacement. Run `task test:database -- --filter FullyQualifiedName~CanonicalRecipeRecoveryPostgresTests` on the actual new owner for intended red before missing behavior, then green. Keep the existing operation routes/layout; update public contract/client/mocks only if their behavior changes. Document the declared current-format inventory and pre-cutover versus activated boundaries, without a permanent legacy restore adapter.
- [ ] 2.2 Extend the already-qualified real edit → existing backup → independent seed → compare → repeat path to the final baseline, including ordinarily produced bindings and every persisted reference. Retain guarded canonical export, seed merge and retry-safe recipe-only sync; household restore remains separate from forward conversion. Run the selected 2.1 owner and existing publication cases plus `task test:database -- --filter 'FullyQualifiedName~OnlineRecoveryPostgresTests|FullyQualifiedName~GroceryExtraRecoveryPostgresTests'`. Add intended-red coverage for any missing file activation/DB commit interruption behavior before changes, then prove exact read-back in another isolated destination. Document operation-specific preservation/replacement and unsupported formats; backup dispatch is not completion.

## 3. Qualify client fencing and cutover packet

Accepted deployment premise: frontend/backend/database ship together. Rehearse one
coordinated release and stale-tab refresh, not independently rolling version pairs.
Include a legacy ingredient/instruction payload carrying a current revision: it
must still conflict on canonical records with no partial mutation. Retain recoverable
drafts, delayed-worker guards and matched application/schema rollback evidence.
No permanent legacy-write adapter is part of these tasks.

Planned maintenance is accepted and must reuse the existing demo/online-recovery
coordination owners. Task 3.1 must qualify the write/worker hold across process
restarts and failure/recovery before reopening, with measured duration. It must
preserve household/history/extras and recoverable drafts; demo activity-clearing
and client draft-discard behavior are not the migration policy. Existing lease and
reset tests are reusable regression evidence, not proof of the deployment sequence.

**Outcome/scenarios:** C20–C21, C32, C36–C39, C43–C44, C48–C50.
**Owners/boundaries:** old browser/worker fences, all-field draft recovery, manifest checkpoints and independent rollback pair. Prepare maintenance and client fixtures alongside groups 1–2; the final cutover rehearsal requires their accepted baseline and the persisted step-scaling contract. Production execution remains separate.

- [ ] 3.1 Extend existing stale-editor/draft and recovery tests through real API/generated client/DB and stateful browser mocks for current-revision legacy payload rejection, delayed workers and refresh with all recoverable draft fields. Observe intended red for missing behavior before changing it. Rehearse the accepted maintenance path with the existing recovery boundary: drain/hold writes and workers, shut down, deploy frontend/backend/schema together, restart with the hold intact, read back, then reopen; inject interruption and prove recovery before reopening. Reuse snapshot owners without demo household reset or draft discard. Record green selected cases, fresh-backup read-back, exact old snapshot/application recovery pair and measured interruption window in the rollout packet.
- [ ] 3.2 Complete the operator-reviewable in-place release packet in [the existing shared rollout owner](../canonical-ingredient-correction/rollout.md): exact candidate/schema, required first-pass browser/real DB/live results, maintenance procedure, no-active-list condition, fresh unchecked recipe-list behavior with retained history/extras, manifests, unexpected mismatches/deferred IDs, pending derived work, recovery proof and approval scope. Verify no implementation task or packet claims success from skipped/not-run stages. Production execution, commit/push/deploy/archive are separate from completing this specification and its nonproduction rehearsal.

- [ ] 3.3 Add intended-red migration/API/PostgreSQL and stateful browser fixtures for no active list → first new unchecked recipe-derived rows with no inherited baseline, ambiguous historical names retained without reinterpretation, unchanged extra history/lifecycle, retry idempotency and unexpected active list stop/report. Run `task test:database -- --filter FullyQualifiedName~CanonicalRecipeMigrationPostgresTests` plus relevant grocery browser cases before upgrade logic, then green; document no historical deletion or household reset.

**Conditional fallback task, only if in-place assessment requires it:** prepare stable-ID/content comparison and input-preservation manifest; verify matching inputs can stage reviewed conversion, while missing IDs/unexpected fact differences stop/report before any fallback write. Test actual concurrent-change revision rejection and unchanged household hashes using disposable DB/files. No disk/live winner selector, per-recipe UI-edit resolution workflow, blanket seed/reset or production execution is authorized.

## 4. Final integration and verification

- [ ] 4.1 Reconcile this unit's corpus outcomes and preservation boundaries, run `task gen:client:check` where APIs changed, review the complete task-owned diff, then `task prepare -- <reviewed paths>` when applicable and `task verify -- <reviewed paths>`. Record invocation-specific record_path and actual passed/failed/blocked/skipped/not-run outcomes. Qualify required real seams with zero required skips and the parity owner's production/hosted-candidate requirements; no completion from mocked-only reads or missing stages.

## Coordinated slice 1 checkpoint

The user explicitly extended 3.1 with a durable hold in existing RecoveryBoundary;
no separate recovery API or reset path was added. Two real PostgreSQL maintenance
cases failed before implementation, then passed within the stable 97-case owner
run `.task/database-tests/runs/49206f479da343a489542b45ec78bbce/result.json`.
`.task/dependable-portions-slice1/c/assessment.md` owns the copied-DV migration,
31-table preservation, 1,400-file independent read-back, operator-script guards and
198-ID no-write inventory. Earlier concurrent-source failure remains separately
recorded; copied/source qualification does not establish deployed acceptance.

DV currently has 28 active current-format grocery rows, all unchecked, so the old
no-active-list assumption is not satisfied for conversion. This slice preserves
all lists and does not convert the 198 legacy recipes. Candidate-image restart,
locked recovery pair and actual DV acceptance remain separate coordinator gates.
Tasks 1.1/3.1 stay open: selected-ID conversion, full protected-field/synthetic
fixtures, stale-tab drafts, final binding recovery and fresh-list cutover remain.
