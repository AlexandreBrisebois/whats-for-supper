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
reseed, force push, unrelated merge, garlic-placeholder implementation or Similar
UI work. Selective repair remains superseded. The 2026-11-12 user amendment includes
bilingual identity with a reviewed model-authored vocabulary, durable versioned JSON
on disk and full backup/restore; no external dataset or runtime AI regeneration.
Migration preserves all planned meals/events and rebuilds every grocery list;
checks and checked-demand baselines may reset only in that fenced rebuild.
Manual extras/corrections/history and ordinary later check continuity remain.
Task IDs/checklists remain authoritative; partial slices do not close aggregates.
The operational navigation record is `.task/dependable-portions-coordinator/continuation.md`.


## 0. Produce and maintain relationships through ordinary workflows

Accepted product behavior on 2026-11-10: automatic relationship setup applies to
imports and to saved ingredient/step updates, with an AI workflow task if needed.
No special markup or mandatory linking UI. This missing producer is the next
workstream B dependency; reuse the existing projection engine and qualified UI.
These tasks do not mark the engine, broader change or release complete.

- [ ] 0.1 Define the bounded relationship evidence/validator contract and existing workflow entry points for import and committed ingredient/step edits. Specify affected-dependency revalidation, saved input revisions, stale-result rejection, duplicate delivery, failure and quiet abstention. Explain what proves whole versus partial use without provider-certified labels or numeric/name/position matching alone. Assign canonical Save/publication hooks to workstream A and proposal/validation to B before edits. No public API change is presumed; use the shared contract owner if one is needed.
- [ ] 0.2 Add intended-red ordinary-producer tests through real API/workflow/PostgreSQL with provider doubles only at the external boundary; implement the smallest accepted whole-use path and run green. Cover import, ingredient edit, step edit, human clear, no-op/unrelated edit, stale completion after another edit, duplicate delivery and provider failure. Reuse deterministic validation before scheduling AI. Publish only server-validated current-revision relationships, preserve saved originals and prove groceries count once. Name actual test owners and evidence rather than claiming seeded projection fixtures cover production.
- [ ] 0.3 Qualify a real generated-client/browser journey: import → ingredient correction → eligible reevaluation → step correction → reevaluation → coherent Cook refresh at changed portions, with unchanged original user text and one ingredient demand. Include uncertain fallback, retained cooking state and delayed-result rejection. Reconcile existing supported allocation coverage under groups 1–3 and run the affected checks plus group 4.1 on the integrated candidate; report hosted acceptance separately.

Groups 1–3 retain their task IDs and acceptance obligations, but now reconcile existing implementation rather than prescribe rebuilding it. The original proposed `CookingStepScalingPostgresTests` class was realized by `CookingStepScalingPostgres_*` methods in `CanonicalIngredientEditPostgresTests` partials; use those actual owners. `CookingStepProjectionTests`, `CookingStepAllocationTests`, `LiveBrowser_Cooking*`, CooksMode units and the named browser suites already exist. Add intended-red coverage only for a demonstrated missing behavior or the new group 0 producer; retain original red/green evidence for implemented behavior.

| Tasks | Implementation baseline | Remaining completion evidence |
| --- | --- | --- |
| 0.1–0.3 | Ordinary producer and evidence validator missing | Bounded evidence design, real import/edit/workflow tests and generated-client/Cook tracer; seeded bindings do not qualify |
| 1.1–1.2 | Contract, projection, original editor and live consumer owners exist | Map C01–C03/C12–C18/C46 to actual owners and extend acceptance through group 0 production |
| 2.1–2.3 | Allocation arithmetic, total-edit revalidation and quiet uncertainty behavior exist | Reconcile supported-role/adversarial coverage and only close demonstrated gaps on the integrated candidate |
| 3.1–3.2 | Current-content/prepared-count and explicit refresh consumers exist | Reconcile current owner evidence and preserve context through new relationship publication |
| 5.1–5.2 | Implemented with recorded local acceptance below | Preserve approved UI behavior; no rebuild |
| 4.1 and 5.3 | Required local results exist at their recorded identities | Complete combined and hosted-candidate requirements without treating discovery, skips or older source results as current acceptance |

Unchecked boxes remain open until all their criteria pass; this reconciliation marks none complete. Follow [shared corpus](../canonical-ingredient-correction/acceptance-corpus.md), [release scope](../canonical-ingredient-correction/proposal.md#dependable-portions-delivery-baseline--accepted-2026-11-10) and [CI requirements](../canonical-ingredient-correction/review.md). Allocation, range and split/merge outcomes are settled. Step arithmetic and relationship work do not depend on dictionary coverage; bilingual identity is included in final integrated release qualification using model-authored durable JSON, and the external-dataset adoption path is superseded. Contract changes use the coordinator's sole OpenAPI/generated-client owner and synchronize affected consumers and method-sensitive mocks in the same slice. No product tests run during this specification reconciliation are implied by historical evidence.

## 1. Project one proven whole use coherently

**Outcome/scenarios:** C01–C03, C12–C18, C46; validated step projection without extra demand.
**Owners/boundaries:** existing projection endpoints, canonical IDs/bindings, CooksMode/stepParser, Home/detail/Cook and PostgreSQL. Depends on canonical foundation; independent of dictionary completeness.

- [ ] 1.1 Reconcile existing binding/span/role/coverage/context OpenAPI and generated-client shapes with C01–C03, C12–C18 and C46. Map the actual `CookingStepScalingPostgres_*` methods, CooksMode units and `cooking-step-scaling.spec.ts` to original 200→250 whole use at target eight, one demand, stale/repeated/Unicode/overlap spans and no time/temp/package replacement. Reuse GET projection and guarded instruction PATCH mocks including conflict and later reads. Record any uncovered criterion; add intended-red tests only for that gap before changing logic. Run `task test:database -- --filter FullyQualifiedName~CookingStepScalingPostgres_` and `task test:e2e -- cooking-step-scaling.spec.ts` on owned resources; empty or skipped selection is not acceptance.
- [ ] 1.2 Preserve the implemented whole/absolute original-basis projection, coherent revision install and original draft editing. Close only gaps identified by 1.1 or group 0, with regression-first fixes where needed. Run 1.1 green, `task test:unit -- src/components/planner/CooksMode.test.tsx src/lib/cooking/stepParser.test.ts src/testing/mock-api.test.ts` and client check where affected. Reuse existing `LiveBrowser_CookingStepScaling` via `WFS_CALENDAR_LIVE=1 task test:database -- --filter FullyQualifiedName~LiveBrowser_CookingStepScaling` to prove Home→detail→Cook agrees and groceries count once with actual API/DB; group 0.3 separately proves ordinary production rather than seeded relationships.

## 2. Support bounded allocation forms and quiet uncertainty

**Outcome/scenarios:** C02–C06, C12–C13, C45–C46; supported roles, remainder evidence and nonblocking uncertainty.
**Owners/boundaries:** validated allocation graph and same shared projection/rendering. Depends on group 1; arbitrary formula/recipe nesting excluded.

- [ ] 2.1 Reconcile existing `CookingStepAllocationTests` and `CanonicalIngredientEditPostgresTests` allocation/fraction/remainder/fixed/per-item cases against two 1 tbsp uses, absolute 50 g, half, known/unknown/incompatible/correlated-range remainder, alternatives, fixed/per-item count-dose and over-allocation. Run `task test:api -- --filter FullyQualifiedName~CookingStepAllocationTests` and `task test:database -- --filter FullyQualifiedName~CookingStepScalingPostgres_`. Add intended-red coverage and change role validation/rendering only for missing criteria. Retain proof that grocery demand is independent of binding count and uncertain source text stays unchanged; document actual owners and results.
- [ ] 2.2 Reconcile existing mixed valid/uncertain UI, step-edit conflict, explicit refresh and no-clutter EN/FR cases in cooking and original-source unit/browser owners. Preserve the approved group 5 cleanup. For any gap introduced by group 0, add intended-red coverage before UI logic changes; run focused CooksMode units, `task test:e2e:ci -- cook-mode-steps.spec.ts cooking-instruction-recovery.spec.ts --workers=4 --retries=0`, and actual API/PostgreSQL concurrency. Record retained work, routine-notice absence, completion availability and evidence identity; do not repeat the cleanup as new implementation.

- [ ] 2.3 Reconcile the implemented ingredient-total rule in `CookingStepAllocationTests` and existing PostgreSQL cases: 200→250 keeps explicit 50 original/75 at factor 1.5, half becomes half of corrected total, whole follows total, and reduction below exhaustive uses invalidates affected remainder quietly. Extend those cases through new relationship production where necessary, observing intended red before any missing logic. Run group 2 unit/database/browser commands with guarded PATCH and stateful mocks; assert no redistribution, no extra grocery demand and no cooking/completion block. Retain existing evidence and document only remaining gaps.

## 3. Preserve prepared and active cooking contexts

**Outcome/scenarios:** C17–C21, C43, C49; current recipe at recorded count and report-triggered refresh.
**Owners/boundaries:** context resolver, preparation receipts, CooksMode explicit content refresh and quality submission. Depends on groups 1–2 and unchanged cooked-baseline protections.

- [ ] 3.1 Reconcile existing current-recipe/prepared-count and report-response coherent refresh cases in `PreparedSupperPostgresTests`, `SupperServingsPostgresTests`, `CooksMode.sse.test.tsx`, `prepared-supper.spec.ts` and `supper-servings-context.spec.ts`. Preserve recorded null/original contexts and the absence of a historical recipe snapshot. Map current evidence to C17–C21/C43/C49; add intended-red cases only where ordinary relationship publication introduces an uncovered transition before extending consumers.
- [ ] 3.2 Close only demonstrated consumer gaps from 3.1; otherwise reuse the existing context/refresh implementation. Run the focused database/unit owners, current cooked-baseline/serving movement regression filters and `task test:e2e:ci -- prepared-supper.spec.ts supper-servings-context.spec.ts supper-servings-movement.spec.ts --workers=4 --retries=0`. Prove stale refresh cannot change receipt/date/count, active session installs one revision, reports/repairs remain available and source overlays/bookmarks/drafts/offset survive new binding publication; document current-content historical reading and exact evidence identity.

## 4. Final integration and verification

- [ ] 4.1 Reconcile this unit's corpus outcomes and preservation boundaries, run `task gen:client:check` where APIs changed, review the complete task-owned diff, then `task prepare -- <reviewed paths>` when applicable and `task verify -- <reviewed paths>`. Record invocation-specific record_path and actual passed/failed/blocked/skipped/not-run outcomes. Qualify required real seams with zero required skips and the parity owner's production/hosted-candidate requirements; no completion from mocked-only reads or missing stages.

## 5. Cook mode cleanup amendment — approved 2026-11-09

The 2026-11-09 design/spec amendment and C12 reconciliation were approved for the bounded UI cleanup. Do not mark earlier tasks complete or infer deployment/release readiness. This slice depends on the existing cooking projection and navigation owners, not new API behavior; no OpenAPI, Kiota, mock payload/state, database, migration or recovery change is planned.

- [x] 5.1 After explicit implementation approval, first update CooksMode.test.tsx's two View adjusted ingredients navigation tests (currently lines 865/1597) to use the existing footer Ingredients path, retaining checklist, drafts, bookmark, offset and no-completion assertions. Add routine-notice/link absence cases and rendered group alignment/reflow acceptance in `pwa/e2e/cook-mode-steps.spec.ts`: EN/FR, both reading presentations/preparation, 320/390/430 widths, enlarged text, landscape/safe areas, ≥44×44 targets, order/focus/disabled behavior and unchanged tablet lower-left layout. Run intended-red `task test:unit -- src/components/planner/CooksMode.test.tsx` and `task test:e2e:ci -- cook-mode-steps.spec.ts --workers=4 --retries=0` with owned resources before changing UI; tooling failures do not establish red.
- [x] 5.2 Before UI edits, update stale positive notice assertions in `pwa/e2e/cooking-step-scaling.spec.ts`, `cooking-step-scaling-live.spec.ts`, `cooking-fixed.ts`, `cooking-fraction.ts`, `cooking-remainder.ts`, `cooking-per-item.ts` and `prepared-correction.ts` to absence while retaining amount, original text, completeness, grocery, prepared receipt and completion invariants. Replace removed-link navigation in `prepared-supper.spec.ts`, `prepared-supper-live.spec.ts`, `supper-servings-context.spec.ts` and both uses in `supper-servings-live.spec.ts` with existing footer Ingredients after selecting All steps, or focused Back to prep where appropriate. Keep existing absence assertions in `cooking-report-refresh.ts` and prepared helpers. No test deletion or weakening of retained work assertions. Observe intended-red absence/navigation/alignment checks, then implement the two removals and distinct responsive right action group in CooksMode.tsx, preserving original fallback, actual errors/Refresh and existing navigation owners.
- [ ] 5.3 Run 5.1 green; run `task test:e2e:ci -- cook-mode-steps.spec.ts cooking-step-scaling.spec.ts prepared-supper.spec.ts supper-servings-context.spec.ts --workers=4 --retries=0`, adding the retained original-source and instruction-recovery owners where impact selects them. Requalify changed live assertions via `WFS_CALENDAR_LIVE=1 task test:database -- --filter FullyQualifiedName~LiveBrowser_Cooking` and the affected prepared/supper-servings live owners through their existing isolated harness. Record exact selected names and zero required skips, red/green and rendered geometry/screenshots; no mocked-only claim for real seams. Review full task-owned diff and run applicable preparation/final `task verify -- <reviewed paths>` under group 4.1. Preserve the historical 11/12 report-opacity failure and its separately qualified report-navigation fix, the retained French focus, touch Discovery and Planner timing risks, household/canonical protections and deployment/recovery/release gates; this UI slice does not repair those risks.

## Historical evidence references (not current-candidate acceptance)

| Evidence owner | Accepted results and retained limitations |
| --- | --- |
| `.task/cook-ui-apply-20261109/` | UI red: 3/83 units and phone action alignment; green 83/83 units, later focused browser 20/20 without skips/retries. Initial browser had 16 optional-Edit measurement failures and one report-refresh quantity failure; conditional measurement repair is distinct from product behavior. Required cooking live later passed 12/12; enlarged-text checks 8/8 and settled screenshots reviewed. |
| `.task/fixture-repair-20261109/` | Separately investigated legacy grocery-key SSE failure and report first-request collision; verifier `bf188918c69e4b16ba9ce0f9c41b5339` passed, including original servings/recovery continuation and 12 required cooking journeys without skips/retries. Earlier Turbopack symlink startup failure, SSE timeout and retained 400 g vs intermediate 500 g observation remain historical failures, not erased by retries. |
| `.task/cook-context-ci-20261109/` | Prepared/servings native owners wired sequentially into existing CI; exact result guards retain twelve cooking cases. Inventory/configuration/local execution are not hosted acceptance. |

Preserve the separately qualified report-navigation/opacity repair; it does not
explain the distinct report first-request quantity collision. French focus/navigation,
touch Discovery drag and Planner replacement-dialog timing observations remain
limitations; later passes alone are not repairs. Existing missing-projection feedback,
canonical/household protections and recovery/release gates remain. Tasks 4.1/5.3 stay
open for integrated and hosted acceptance. These references consolidate the earlier
execution narrative without changing scenario IDs or claiming current verification.

## Coordinated slice 1 checkpoint

Bounded deterministic parts of 0.1–0.3 are implemented; original aggregate IDs remain
open for async proposal/failure/stale-completion and broader role-production coverage.
`CookingStepRelationshipProducerTests` passed 26/26 before preparation. A's final
source-proof regression passed 8/8 required PostgreSQL cases at
`.task/database-tests/runs/97a8b4a07e0f48e4bf52f27eceff8e10/result.json`; the earlier
97-case stable owner run predates that source-proof fix. After scoped preparation,
`.task/dependable-portions-slice1/live-attempt2/` passed the native live owner 1/1
and all three real API/PostgreSQL/production-built browser journeys with zero skips
or retries. Ordinary URL production, 200→250, 500 g step/checklist, saved step text,
explicit remote Cook refresh, retained unrelated check and one demand are covered.
Photo production/replay is also covered by the real PostgreSQL owner; the existing
photo/review browser paths remain green. First live attempt lacked an isolated CI
helper and executed no browser cases; its failure remains in `live-attempt1/`.

Implementation, focused verification and real local seams are distinct from final
repository, hosted and DV acceptance, which the coordinator records separately.
Final prepared runtime hashes and worker red/failure evidence are under
`.task/dependable-portions-slice1/`; no whole-change completion/sync/archive follows.

## Coordinated absolute-use slice 2

Selected by the current execution prompt: step tasks 0.1–0.3 (absolute-use subset),
2.1, 2.3 and 4.1; canonical tasks 2.2, 3.2 and 4.1 (integration/qualification subsets).
Prerequisite accepted commit `0ee175e45b38407b87c8a562c2d2f086292464e0` and DV
operation `7efa8202-e5d9-463d-802e-cd26ccc561d6` are preserved by starting commit
`b7054b601c94af4e2a79aba41f0d6f213b5d892d` on recipe-view-redesign.

B owns the bounded producer/unit tests; A owns canonical Save/publication and real
PostgreSQL integration tests; C independently reviews preservation and existing DV
recovery without shared-source writes. Coordinator owns browser/contracts integration,
lifecycle, final verification, commit and exact-commit DV acceptance. This slice reuses
whole-use, all-role projection, categorization journals and the durable RecoveryBoundary
hold; it does not rebuild those foundations.

The explicit measured-use clause binds a positive scalar use below a known scalar total
to one unique saved ingredient, its exact declared unit and current step/source revisions.
A closed affirmative Add/Use/Cook/Boil/Mix clause (bounded French equivalents included)
provides use semantics; numeric/name equality alone cannot prove whole use. Fresh
publication strips supplied proof and independently derives the expected relationship.
Guarded Save revalidates dependencies; total 200→250 retains explicit 50 original,
which renders 75 at six portions from basis four, with one ingredient-derived 375 demand.
Changed step wording replaces proof without rewriting saved facts. Conditional, repeated,
ambiguous, incompatible, package and unsupported clauses abstain quietly. Reduction below
the explicit use invalidates that proof without redistribution or a cooking block.

Primary C03/C45 acceptance crosses ordinary URL/photo extraction, both real categorization
processors, readiness, guarded ingredient/step Save, generated-client Cook explicit refresh
and one grocery demand. Preservation C01–C06, C12–C19/C46 remains assigned to existing
allocation, canonical edit/publication, Cook, prepared and recovery owners. Whole and
absolute live variants remain separate. No public contract/client shape change is needed;
existing role/payload support and stateful mocks remain authoritative. The hosted workflow
requires the new absolute native/browser variant with zero required skips or retries.

Implementation and qualification evidence is recorded separately under
`.task/dependable-portions-slice2/`: producer red/green, real database, browser, integrated
repository gate, hosted exact commit, and DV deployment/recovery. Implementation is in
progress until all required current-candidate gates are reconciled; no result is implied
by this checkpoint. Aggregate checkboxes remain open because other roles, asynchronous
reevaluation, later intake and full-release acceptance are unfinished.

Lifecycle dispositions: canonical correction and step scaling active; migration/recovery
foundation reused with no library conversion; grocery and local/hosted CI qualification
remain active and unfinished; bilingual-shopping-identity and similar-search-filter deferred;
selective-ingredient-repair superseded and unimplemented, with its existing replacement
links retained. No main-spec promotion, synchronization or whole-change archive. Preserve
prior failed DV attempts, soft-deleted fixture histories, failed-capture notices, optional
embedding HTTP422 and French focus/prepared containment/Search navigation limitations.
Stop after one accepted exact-commit DV slice and integration into recipe-view-redesign;
provide one successor prompt but do not launch it. Production/reset/reseed are excluded.

## Coordinated multiple-absolute-use slice 3

Selected 0.1–0.3 multiple-use subset, 2.1/2.3/4.1 build on accepted
`780327550ebbe9e34afa13ccbfb07cec46d0b4e5` / DV
`b4e031e6-54ab-4398-9b1c-0dcafcb9a4c4`. B extends the bounded evidence inlet:
all mentioning steps must independently prove a closed absolute clause for one
unique ingredient. Equality of summed uses never infers exhaustive allocation.
Conditional/ambiguous/duplicate/overlap/unsupported sequences remain original.
Initial producer intended red 5 failed/52 passed, then 57/57 green; preservation
156/156 with zero skips. First broader compile failure retained and repaired.
A qualifies guarded Save/publication and actual URL/photo workflows; coordinator
qualifies generated-client Cook refresh/state and one ingredient-derived demand.
C02 is the new case; prior whole/absolute and all projector roles plus prepared,
serving and recovery seams remain required. Evidence/gates are separately retained
under `.task/dependable-portions-slice3/`; aggregate checkboxes remain open.
Next action: stable integrated local gates, exact-commit hosted/DV acceptance,
integration and one successor prompt, then stop. No main-spec promotion/archive.

Local integrated evidence: focused 3/3 PostgreSQL cases, canonical/recovery 143/143,
prepared/servings 94/94 and source-stable native 3/3 plus browser 9/9 passed with
zero required skips/retries. Invocation identities and retained first failures are
in `.task/dependable-portions-slice3/a/`; the final repository/hosted/DV receipts
remain distinct. Neither these local results nor subsequent bounded acceptance
closes asynchronous reevaluation, later role/input/library work or broader CI.


## Coordinated annotated-half slice 4

Selected step tasks 0.1–0.3 (explicit annotated-half producer subset), 2.1, 2.3
and 4.1; canonical tasks 2.2, 3.2 and 4.1 (integration/qualification subsets).
Prerequisites: accepted `6cc6ead66378f6b1763ba251ca94fbd6859fe08a` and DV operation
`9948fe35-0400-465f-9335-a1debb16cf58`, verified before implementation.

The bounded inlet admits a closed affirmative explicit half clause for one unique
saved ingredient with a compatible parenthesized numeric annotation. Exact source,
UTF-16 relative/annotation spans and current revisions are independently validated;
numeric equality alone is not fractional intent. It reuses the fraction projector,
retains relative wording and saved original text, and replaces only the existing
proven numeric annotation. Basis four/total 200 g/half (100 g) at six projects150 g;
guarded total correction to250 retains original100 g wording, projects187.5 g and
one375 g ingredient-derived grocery demand. Step edits replace affected proof;
clears/no-ops/unrelated saves retain existing semantics. Unsupported, contradictory,
ambiguous, overlapping and conditional evidence abstains quietly.

B owns producer/projector units; A owns guarded Save/publication/PostgreSQL/native
fixtures; C independently reviews preservation and existing DV recovery with no
shared-source writes. Coordinator owns contracts/client/mocks/browser, lifecycle,
source freeze/resources, complete preparation/verification, commit, hosted and DV.
No integrated checks run before explicit RUN on prepared stable source. Evidence
is under `.task/dependable-portions-slice4/`; local, hosted and DV remain separate.
No acceptance is implied until their fresh required gates pass.

C04/C45 is primary; preserve C02 two independent1 tbsp uses at doubled portions,
correction2→3 yielding two2 tbsp uses and one6 tbsp demand, C03/C45 absolute50→75
with corrected250 total/one375 demand, C01–C06/C12–C19/C46 and all existing roles,
prepared/serving/recovery seams. No exhaustive allocation inference, asynchronous
AI, new remainder/fixed/per-item producers or later intake is selected.

Canonical/step/recovery preparation/grocery/CI qualification remain active;
bilingual-shopping-identity and Similar UI deferred; selective-ingredient-repair
superseded and unimplemented. Aggregate checkboxes stay open. No main-spec
promotion/archive, library conversion/list cutover, resets/reseeds or production.
Preserve all prior failed DV/fixture/backup histories and first failures/retries,
including slice3 French geometry/Retry/SSE reread evidence and public version
viewport failures whose root cause remains unknown. Later passes are not repairs.
No real-provider quality or semantic-search qualification is claimed.

Stop after one exact-commit hosted/DV-accepted slice integrated into
recipe-view-redesign; provide exactly one successor prompt and do not launch it.


### Slice 4 local qualification checkpoint

Producer/projector/allocation green179/179, zero skips; intended missing-producer,
annotation and malformed-neighbor reds retained in `b/evidence.json`. Exact fraction
annotation rendering uses bounded integer long division with rational fallback;
other role formatting is unchanged. Stateful mock/contract companions pass89/89
and CI guard regression owners21/21. Generated client documentation follows the
approved optional existing-annotation projection contract.

Actual PostgreSQL focused4/4 (`0108bf0943c24744b0d824a508d7779b`), canonical/edit/
publication/recovery147/147 (`31a008c6b5dc44498934423b72e26c79`) and prepared/servings
94/94 (`6d000275aaf9426887061787ef9d7f4e`) passed with zero required skips. First
focused3/4 failed an invalid direct-identical-PATCH revision oracle; corrected to
existing semantics while retaining original-text/binding and unrelated-save checks.
This was a test correction, not a product repair; original failure remains retained.

The owned same-origin production native run passed17/18 owners; the new photo
browser incorrectly assumed a second instruction. The source-preservation oracle
now compares all unaffected steps with saved content. A fresh focused fraction
native1/1 and URL/photo/retained-review browser3/3 passed without skips or retries,
using rebuilt isolated current production outputs. All prior role native owners
in the first run passed. Exact first/retry source/build/config/runtime identities,
logs and artifacts remain separately under `a/live-attempt1/` and `a/live-attempt2/`.
Port3000 and its existing server were preserved. Task-owned build metadata capture
first failed from an undefined local variable after a successful build; corrected
metadata capture and fresh rebuilt outputs are recorded, with no product change.

Complete final repository verification, exact-commit hosted and DV acceptance
remain separate gates in `.task/dependable-portions-slice4/final-evidence/`.
No current local result closes aggregate checkboxes or establishes release acceptance.
The accepted-slice record there and `completed-slice.md` own subsequent gate outcomes;
first failures/retries and all previously recorded limitations remain retained.


Cross-row preservation review then found a required producer gap: an annotated
half for pasta could remove an unrelated sauce whole-use proof. EN/FR regressions
first failed2/2, then the minimal independent-other-row clause recognition passed
producer/projector/allocation181/181 with zero skips. Initial179 evidence is
retained separately. The first combined gate was deliberately interrupted while
source remained unchanged; only its owned child groups/API/browser/PG resources
were stopped and removed. Its partial results are not acceptance. Fresh full
verification follows the correction; no optional review suggestion released source.


### Annotated-half slice 4 — local DV acceptance, 2026-11-11

Candidate `fc6769c41db1843cdc0df4d4d9bdb861cb5a695e` is accepted on DV under
operation `c8e77683-30da-4d2f-938d-7eb29ecbe35b`. User directed moving forward
locally using completed verification; hosted CI remains failed on Ubuntu package
DNS, explicitly waived only as this slice's deployment prerequisite. It is not a
hosted pass or broader CI closure. Exact local candidate images and completed stable
repository verification `34aa0977b0e24a3084a8162a780de35b` were independently rechecked;
no application source changed or broad local suites were repeated on handoff.

Fresh snapshot/rehearsal/migration and independently verified held backup/read-back
passed. Actual deployed URL/photo workflows completed both real categorization
processors before Ready (84 audit checks); generated-client/browser correction and
coherent Cook refresh retained the half wording/original100 g, projected187.5 g at
six after total200→250, retained the sauce check and one375 g grocery demand.
Guarded fixture cleanup passed. All2094original rows/1457files remain;195fresh finite
startup transitions and two separately reviewed normal fixture-control metadata
transitions are retained, with0unexpected differences. All64newrows/15files were
independently traced; no blanket exclusions or concurrency-version rollback.
Original provider/environment/ports/PostgreSQL/data mount/public routing restored,
hold absent, exact version/health/rendered behavior passed. Maintenance377.449s.
First public version viewport failure, diagnostic pass and unchanged-original retry
pass remain separate; no repair/root-cause claim. Every earlier failure/backup and
soft-deleted fixture remains. Owned temporary resources removed; port3000 preserved.

Evidence: `.task/dependable-portions-slice4/local-acceptance-20261111/acceptance.json`,
`release/`, and `c/` beneath that directory. These newer receipts supersede blocked
acceptance status only; historical blocked/first-attempt receipts remain unchanged.
Selected step0.1–0.3 explicit-half subset/2.1/2.3/4.1 and canonical2.2/3.2/4.1
integration/qualification subsets only. Aggregate checkboxes remain open. Canonical,
step, recovery preparation, grocery and CI qualification remain active; bilingual
shopping identity/Similar UI deferred; selective ingredient repair superseded and
unimplemented. No later role/intake/library conversion, main-spec sync/archive or
production action. No real-provider or semantic-search claim. Candidate already
belongs to recipe-view-redesign; subsequent documentation/harness commits preserved.
Stop after this accepted slice; supply one successor prompt without launching it.


## C05 explicit final-remainder slice 5 progress

Selected step0.1–0.3 explicit-final-remainder subset/2.1/2.3/4.1 and
canonical2.2/3.2/4.1 integration/qualification subsets only. Aggregate boxes remain
open. The new write-time producer uses existing guarded Save/publication hooks and
existing remainder arithmetic. Exact source-bound EN/FR final exhaustive intent,
positive independent extra-step admission and complete graph identity validation
are specified in the step design. Other roles/intakes and aggregate closure remain
outside this slice.

Implementation and focused unit evidence are recorded in
`.task/dependable-portions-slice5/b/unit-evidence.json`. The initial five missing-
producer failures, six branch-cue failures, split-group identity failure and three
positive-admission failures precede their fixes. Focused runs and exact source hashes remain invocation-specific in that
receipt, including the subsequent alternative-subject regression and correction. The first PostgreSQL red retained an invalidated source-stability
record, followed by fresh stable intended red in database invocation
`3f650a0fcad24dc79bd3f5ba8ea2aafe`. Stateful mock tests separately exercise ordinary
Save, subsequent GET/projection, correction, replacement, stale replay and quiet
abstention. No new public payload shape or generated-client field is required.

Prepared integrated database/native browser, complete repository verification,
owned commit, hosted observation and exact-image data-preserving DV acceptance
remain separately recorded under the slice evidence owner. C freshly checked the
accepted baseline before work. The later user instruction to complete without
waiting for CI is a successor-specific authorization, retained in
`local-authorization.json`; hosted results retain their observed status.

Canonical/step/recovery/grocery/CI remain active, bilingual/Similar deferred,
selective repair superseded and unimplemented. Preserve all prior provider/UI/
public viewport limitations and failure histories. No main-spec sync/archive,
resets/reseeds or production. Stop after this one accepted slice and one unlaunched
bounded successor prompt.

### Per-item producer qualification checkpoint

C06 now has dedicated ordinary producer/service tests and real PostgreSQL
publication/edit owners in `CookingStepRelationshipProducerTests.PerItem.cs`,
`CanonicalIngredientPublicationPostgresTests.PerItemRelationships.cs` and
`CanonicalIngredientEditPostgresTests.PerItemRelationships.cs`. The native owner
`LiveBrowser_FreshPerItemCanonicalGroceries` covers ordinary URL/photo ancestry,
generated-client edits and coherent Cook refresh; its explicit recompute consumer
fixture does not qualify autonomous worker or DV operation. Those remain separate
exact-candidate gates. Aggregate tasks stay open pending all required role/corpus
reconciliation and the final hosted campaign. The historical full PostgreSQL run
with 613 passing tests failed its content-stability gate and remains failed; a
complete stable rerun is required before current-candidate acceptance.
