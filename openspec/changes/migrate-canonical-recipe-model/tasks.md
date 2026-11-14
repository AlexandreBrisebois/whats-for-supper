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
policy; historical failures/retries/limits remain unchanged. No production,
household reset, reseed, force push, unrelated merge, garlic-placeholder implementation or Similar
UI work. The 2026-11-12 user amendment includes model-authored bilingual identity
and durable vocabulary JSON in this release, without an external dataset dependency.
Selective repair remains superseded.
Task IDs/checklists remain authoritative; partial slices do not close aggregates.
The operational navigation record is `.task/dependable-portions-coordinator/continuation.md`.


Unchecked combined tasks remain open until all their criteria pass; they do not
mean the underlying foundations are absent. Reuse existing Dreaming/management
backup, seed, sync and online-recovery owners. No parallel recovery API/package,
legacy canonical-write adapter or external dataset adoption is required. The final
release does require the app-owned durable bilingual JSON and complete saved-reference
recovery. Migration preserves every plan/event and rebuilds all grocery lists;
checks/baselines may reset only within its fenced operation, not ordinary recomputation.
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
| 3.1–3.3 | Canonical old-writer conflicts, draft recovery, recovery leases and grocery identity/check behavior | Coordinated deployment across restart, stale-tab refresh, complete plan/event preservation and all-list rebuild/reset-epoch proof |
| 4.1 | Earlier candidate-specific local evidence | Integrated final candidate and required hosted acceptance |

The bounded existing-operation checkpoint is
`.task/canonical-existing-flows-20261110/outcome.json` (126 required PostgreSQL
cases passed with zero skips at that checkpoint). It does not complete these
combined tasks. Proposed migration/recovery suite names below may be implemented
as focused extensions of existing owners; record actual selected names and reject
empty or skipped required selections. Task IDs remain stable for handoffs.

## 1. Rehearse in-place forward conversion on disposable copies

**Outcome/scenarios:** C10–C16, C37–C39, C44, C48; stable IDs and guarded/resumable publication.
**Owners/boundaries:** canonical publication, real PostgreSQL and copied recipe/source/media store. Freeze the contracts exercised by each increment; final acceptance includes the adopted model-authored bilingual JSON and saved mappings, with no production resources. Workstream C owns orchestration and coordinates shared store hooks with A. Allocation/range/split-merge decisions remain settled for ordinary operations; the authorized migration-only reset preserves every plan/event, extras and history while rebuilding all lists. Conditional fallback stops on unexpected mismatches.

- [x] 1.1 Deliver no-write manifest schema and synthetic before/after protected-field fixtures for live/source hashes, IDs/links, human fields, quantities/notation, basis, steps/coverage, media, complete plan/event/assignment/servings/prepared-cooked preservation, every persisted or assignment-implied week, durable vocabulary revision/hash and exact allowed grocery-derived changes/reset checkpoints. Verify unsupported/conflict/defer outcomes and inventory every writer, including file-before-DB repair and stale old tabs. For conditional fallback, compare stable IDs/content and stop/report unexpected missing IDs or fact mismatches before writes; do not add a per-recipe edit-conflict workflow solely for absent UI edits.
- [x] 1.2 Add the missing selected-ID invocation/resume behavior to a focused `CanonicalRecipeMigrationPostgresTests` owner, reusing `CanonicalRecipePersistencePostgresTests` for atomic conversion, no positional associations, null/empty, unknown basis, stale human edit and identical replay. Run `task test:database -- --filter FullyQualifiedName~CanonicalRecipeMigrationPostgresTests` for intended red before implementing the operational path around the existing converter; run green with actual database/files and retain the existing persistence regressions. Document the actual invocation, input/checkpoint identities, exact protected hashes/relationship counts and usable deferred recipes, not only processed counts.

## 2. Recover current format and reject unsupported old backups

**Outcome/scenarios:** C19–C21, C40–C42, C48 and the preservation aspects of C22–C25; complete final recovery and distinct forward import, including durable bilingual JSON and all persisted mapping/category references.
**Owners/boundaries:** ManagementService/RecipeExportContent/RecipeRepository/disk sync, existing online recovery and durable state. Existing-operation work can proceed alongside group 1; final acceptance requires the release's persisted step/check/identity contracts, durable versioned UTF-8 vocabulary JSON and every saved reference, with no AI regeneration or external dependency.

- [ ] 2.1 Extend the existing version-2 codec, backup/seed integrity preflight and current-recovery inspection only for missing baseline acceptance. Reuse `CanonicalIngredientPublicationPostgresTests.ExistingFlows` and add focused `CanonicalRecipeRecoveryPostgresTests` where needed for exact values/revisions/bindings/IDs/protection, durable vocabulary IDs/EN-FR labels/aliases/qualifiers/revisions/model-authored provenance, saved mappings/overrides, honest null mappings, household/prepared state/media, old-format rejection with zero writes, missing/corrupt mandatory JSON or dangling references, stale dictionary replacement and stale-current merge vs explicit exact replacement. Extend existing full snapshot capture/restore artifact inventories and storage publication only where missing; archive validators alone do not prove disk-file inclusion. Retain historical pre-adoption inspection without promising full restoration of incomplete old backups. Run `task test:database -- --filter FullyQualifiedName~CanonicalRecipeRecoveryPostgresTests` on the actual new owner for intended red before missing behavior, then green. Keep the existing operation routes/layout; update public contract/client/mocks only if their behavior changes. Document the declared current-format inventory and pre-cutover versus activated boundaries, without a permanent legacy restore adapter.
- [ ] 2.2 Extend the already-qualified real edit → existing backup → independent seed → compare → repeat path to the final baseline, including ordinarily produced bindings, the durable vocabulary file and every persisted reference. Prove full backup → isolated exact restore → re-export preserves the JSON and saved identity/protection without AI/network regeneration or blind reseeding. Retain guarded canonical export, seed merge and retry-safe recipe-only sync; household restore remains separate from forward conversion. Run the selected 2.1 owner and existing publication cases plus `task test:database -- --filter 'FullyQualifiedName~OnlineRecoveryPostgresTests|FullyQualifiedName~GroceryExtraRecoveryPostgresTests'`. Add intended-red coverage for any missing file activation/DB commit interruption behavior before changes, then prove exact read-back in another isolated destination. Document operation-specific preservation/replacement and unsupported formats; backup dispatch is not completion.

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
**Owners/boundaries:** old browser/worker fences, all-field draft recovery, manifest checkpoints and independent rollback pair. Prepare maintenance and client fixtures alongside groups 1–2; the final cutover rehearsal requires their accepted baseline and the persisted step-scaling and bilingual identity contracts. Production execution remains separate.

- [ ] 3.1 Extend existing stale-editor/draft and recovery tests through real API/generated client/DB and stateful browser mocks for current-revision legacy payload rejection, delayed workers and refresh with all recoverable draft fields. Observe intended red for missing behavior before changing it. Rehearse the accepted maintenance path with the existing recovery boundary: drain/hold writes and workers, shut down, deploy frontend/backend/schema together, restart with the hold intact, read back, then reopen; inject interruption and prove recovery before reopening. Reuse snapshot owners without demo household reset or draft discard. Record green selected cases, fresh-backup read-back, exact old snapshot/application recovery pair and measured interruption window in the rollout packet.
- [ ] 3.2 Complete the operator-reviewable in-place release packet in [the existing shared rollout owner](../canonical-ingredient-correction/rollout.md): exact candidate/schema, required first-pass browser/real DB/live results, maintenance procedure, complete preserved plan/event inventory, all-list rebuild and operation-bound reset disposition with retained extras/corrections/history, durable vocabulary/required references, manifests, unexpected mismatches/deferred IDs, pending derived work, recovery proof and approval scope. Verify no implementation task or packet claims success from skipped/not-run stages. Production execution, commit/push/deploy/archive are separate from completing this specification and its nonproduction rehearsal.

- [x] 3.3 Add intended-red migration/API/PostgreSQL and stateful browser fixtures with populated past/current/future weeks: preserve every planned meal/calendar event and its IDs/date/status/recipe/servings/prepared-cooked facts; rebuild every persisted or assignment-implied grocery week under the new model; reset checks/baselines only within the fenced migration epoch; preserve extras/content/corrections/history/removal links and other data. Prove complete week accounting, exact allowed derived-column/version changes, interrupted resume before reopen, no repeated reset of later human checks and unchanged ordinary split/merge/proven-increase continuity. Run `task test:database -- --filter FullyQualifiedName~CanonicalRecipeMigrationPostgresTests` plus relevant grocery browser cases before upgrade logic, then green; no empty-list prerequisite, plan/event clearing or household reset.

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

At that historical checkpoint DV had 28 active current-format grocery rows, all
unchecked; the then-current no-active-list assumption was unsatisfied. That slice
preserved all lists and did not convert the 198 legacy recipes. These observations
and its unexecuted gates remain historical, not current inventory or new acceptance.
The 2026-11-12 user amendment supersedes the prospective idle-list gate: preserve
every plan/event and rebuild all lists, with migration-only check/baseline reset.
Tasks remain open for selected-ID conversion, protected-field/rebuild fixtures,
stale-tab drafts, final binding/vocabulary recovery and coordinated cutover.


## Disposable executor checkpoint — 2026-11-14

Tasks 1.1, 1.2 and 3.3 have their bounded disposable-copy acceptance. The
[executor handoff](../../../docs/handoffs/dependable-portions-next-slice/MIGRATION-EXECUTOR.md)
owns the source-admission, preservation/writer inventory, exact invocation,
receipt/prune/retry, evaluation-date and operator boundary details.

Real PostgreSQL RED receipts are retained for missing source admission, executor,
operator-session revocation, atomicity/protected deltas, actual HTTP old-request
and outcome replay, partial bulk input, selected fact validation, timestamp
precision, canonical no-op and midnight/resume behavior. Integrated migration,
maintenance and ordinary concurrency acceptance passed 79 cases with zero skips
in `.task/database-tests/runs/6649fb4d97164aa8a67373bca632d4f8/result.json`;
subsequent business-date cases passed 3/3 with zero skips in
`.task/database-tests/runs/998a61bb459b40e5bbc3c38848d1a902/result.json`.
The exact original four-portion 1/3 quantity/notation, source/media, 32-table
protected inventory and all four fixture weeks are checked. Independent review
is retained with immutable source artifacts under `.task/migration-executor-20261113/review/`.

Stateful row/mock controls passed 49 cases; manifest/receipt/reference controls
passed 56. All three focused production-build bilingual/migration browser cases
passed with zero retries in `focused-browser-v5.log` under the same evidence
owner. The final applicable gate follows preparation of this complete source/task
path set; its exact invocation record and outcomes are retained in
`final-verification-v2/runtime.json` and reported at delivery. These local claims
remain separate from required final-candidate hosted/release qualification.

Tasks 2.1/2.2, 3.1/3.2 and 4.1 remain open for their combined final producer,
adoption, coordinated restart/recovery, current-date cutover packet and integrated
release/hosted acceptance. Operator contributions here do not close those
aggregates. No actual copied household library was activated, no vocabulary was
adopted and no DV/production operation occurred. Conditional disk fallback was
unnecessary. No fully completed change is archive-eligible at this checkpoint.


The first full gate `8767b46de3b6410e99a82995219ee807` was not accepted:
Tomorrow's assertions completed but teardown created competing route owners;
required PostgreSQL completion exceeded the runner's 180-second compile/test
budget. The preserved failure/blocked receipts are in the handoff. The bounded
verification maintenance waits for exact affected-week notifications and uses a
finite 600-second relational budget with the same cleanup/no-retry semantics.
The complete gate is rerun for the revised source identity.

The repaired Tomorrow and migration browser files passed 16/16 across two
repetitions with zero retries in `focused-browser-v6.log`. All 18 existing
relational-runner unit/cleanup controls passed. The final gate retains its own
complete stable-content record rather than reusing the failed/blocked run.
