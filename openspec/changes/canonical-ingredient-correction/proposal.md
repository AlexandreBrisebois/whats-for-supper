# Canonical recipe facts and original-basis correction

## Dependable portions delivery baseline — accepted 2026-11-10

This is the release entry point for the existing capability changes, not a new
competing recipe model. Alex accepted dependable portions as the first complete
release and requested coordinated parallel delivery. Capability requirements and
implementation task authority remain in their existing owners.

**Release outcome:** a person can import or correct a recipe, choose servings,
read consistent ingredient and supported instruction quantities, and obtain
grocery demand exactly once. Saved originals, human corrections and household
data survive. Uncertain instruction references remain original and readable;
they are never guessed merely to complete scaling. English and French recipes
and UI remain supported.

**Deferred from this release:** automatic cross-language food equivalence,
catalogue adoption and the dependent bilingual mapping/category feature.
Similar-search layout is an independent follow-up. The superseded selective
ingredient-repair proposal is not executable work. Deferred work is retained,
not declared implemented or archived. Recovery must preserve every identity and
reference actually persisted; an optional catalogue not introduced by this
release is not a prerequisite for portions delivery.

**Accepted delivery order:** the first usable increment builds on URL/photo
intake and manual correction, concentrating next on instruction scaling. PDF,
synthesis and shared-recipe intake follow as separate bounded increments. Their
existing behavior remains available meanwhile; this sequencing does not remove
their requirements or authorize unsafe canonical writes. General protected
reimport remains separately unfinished. Migration/recovery work proceeds in
parallel, with its safety gates required before activating existing-library
conversion. The trusted instruction-binding producer still needs a bounded
evidence design before its dependent code.

**Accepted automatic relationship maintenance:** users keep the ordinary recipe
editor; no special markup or ingredient-to-step confirmation screen is required.
Import and saved ingredient/step changes both reevaluate affected relationships.
Reuse valid deterministic relationships first; an AI task in the existing workflow
system may propose new relationships when necessary. A proposal is not proof:
server validation and current-revision guards control publication. Uncertain
relationships retain readable original wording. See the step companion's
automatic-reevaluation requirements and tasks; this behavior remains to be built.

**Accepted AI authority boundary:** reevaluation maintains scaling relationships
only. It does not rewrite saved ingredient descriptions, amounts, units or
instruction wording. Human edits remain authoritative. Automatic recipe rewriting
is outside the first release; it is not an implicit prerequisite of relationship
validation.

**Accepted deployment and client boundary:** frontend, backend and database are
deployed as one coordinated release. There is no requirement for independently
rolling application/schema versions. Older browser tabs must refresh before editing
upgraded canonical recipes; preserve recoverable drafts and reconcile them against
current originals. Reject old string-based ingredient/instruction writes to
canonical records even if they carry a current revision. No permanent legacy-write
adapter is required. Reading or correcting not-yet-converted/review material through
the current application is a separate supported path, not old-client compatibility.

**Accepted maintenance boundary:** planned downtime is allowed for this coordinated
upgrade. Reuse the existing demo/online-recovery coordination and workflow owners;
do not create a parallel maintenance subsystem. Preserve application data and
recoverable drafts rather than invoking demo reset's data-clearing policy. Rehearse
write/worker quiescence, verified recovery point, coordinated update, read-back and
reopening, including the hold across process restarts. Measure the maintenance
duration; existing recovery infrastructure alone is not upgrade qualification.

### Coordinated slice 1 — selected 2026-11-10

User authorization includes one completed slice commit, exact-commit DV deployment
and acceptance, and a successor prompt; production, resets and unrelated changes
remain excluded. Stop after this slice, or report an unresolved required gate;
do not advance the queue on a blocked acceptance.

| Change | Disposition | Authoritative remaining task owner |
| --- | --- | --- |
| Canonical correction | Active; URL/photo and guarded editor foundations implemented | This change 2.1–2.2 and 3.2 for integration; 3.3–3.6 are later intake slices |
| Step scaling | Active; projection/allocation/Cook foundations implemented; cleanup 5.1–5.2 complete | Step 0.1–0.3 for ordinary production, 1–3 for preservation, 4.1/5.3 for qualification |
| Migration/recovery | Active preparation; conversion not activated | Migration 1.1 inventory and 3.1 assessment; remaining tasks retain conversion/recovery gates |
| Grocery interactions | Active qualification; implemented foundations reused | Grocery 4.1 remains authoritative for unfinished acceptance |
| Local/hosted CI parity | Active qualification | Its existing unchecked tasks retain hosted and complete-candidate obligations |
| Bilingual shopping identity | Deferred, requirements retained | Its existing tasks; not a prerequisite for this slice |
| Similar-search filter | Deferred independent UI work, requirements retained | Its existing tasks; outside this queue |
| Selective ingredient repair | Superseded, unimplemented | No delivery owner; historical unchecked tasks retained, replacement owners above |

**User-visible outcome:** fresh URL/photo intake and ordinary canonical ingredient/
step Save establish supported explicit whole-use relationships. Changed portions
project those relationships coherently after explicit active-Cook refresh, while
groceries count each ingredient once. Ambiguous wording stays original. This is a
bounded deterministic producer, not completion of every ordinary relationship.

**Task mapping and dependencies:** step 0.1's deterministic evidence inlet and the
synchronous whole-use portions of 0.2–0.3; canonical 2.1–2.2/3.2 integration; migration
1.1 no-write assessment and 3.1 durable maintenance hold/deployment rehearsal. Reuse the a666a64f URL/photo
foundation, existing revision guards, roles and generated-client consumers. Async
proposal delivery/provider failure and broader supported-role producer acceptance
remain outstanding under the original IDs; aggregate boxes remain unchecked.
No shared contract or required consumer is deferred from the deployed behavior.

**One writer per path:** B owns the new pure relationship producer and its unit
tests. A owns CanonicalRecipeContentStore, RecipeAgent, RecipeFilePublicationStore
and new relationship PostgreSQL test partials. C owns disposable inventory, the existing RecoveryBoundary maintenance hold and
its restart/recovery tests; this migration 3.1 extension was explicitly approved
after preflight found no durable hold. Coordinator owns browser/live harness
integration, contracts/mocks if affected, lifecycle files, combined verification,
commit and DV. Shared interfaces are agreed directly before dependent edits.

**Acceptance:** intended-red then green deterministic and actual API/workflow/
PostgreSQL cases, real generated-client/browser edit→Cook→grocery tracer, EN/FR,
ambiguous/repeated/Unicode source and unrelated-number abstention, human clears,
unchanged/unrelated saves, stale edits/replay, existing-role preservation and retained
Cook state. Run applicable scoped preparation/verification on stable integrated
source; record local, hosted and DV results separately. DV requires copied-database
migration and recovery preflight, exact image/commit and schema identity, health and
actual user-visible acceptance without converting/resetting the existing library.

**Stopping boundary:** commit only completed owned work, deploy that exact commit
and verify DV, then provide the next prompt. Existing-library conversion, bilingual
mapping, Similar UI, later intake, full-change archival and production stay outside
this slice. Sync/archive only a change whose full criteria are satisfied; none is
presumed complete from this first tracer.

### Delivery order and parallel ownership

| Workstream | Observable outcome and next work | Existing owner |
| --- | --- | --- |
| A: intake and correction | Reuse locally qualified URL/photo intake and correction; widen remaining channels individually while preserving original edit/reopen, correctly scaled ingredients and one grocery demand | This change |
| B: usable instruction scaling | Produce the first trusted ingredient-use binding through ordinary intake; qualify edit → scaled Cook → one demand, then the remaining supported allocation cases | [Step scaling](../scale-cooking-step-ingredients/proposal.md) |
| C: existing library and recovery | Inventory without writes, deliver selected resumable conversion, preserve deferred recipes, rehearse current backup/read-back and the safe list transition | [Migration/recovery](../migrate-canonical-recipe-model/proposal.md) |
| Coordinator: integration and evidence | Maintain scope, interface decisions, shared-file ownership, task/evidence reconciliation and final candidate qualification | This baseline, [groceries](../restore-dependable-grocery-interactions/proposal.md), and [CI parity](../restore-local-ci-browser-parity/proposal.md) |

Use one coordinator and up to three workers when the host supports them. Workers
communicate directly about dependencies and propose interface changes; the
coordinator resolves scope and assigns one writer per shared file. A owns the
canonical store, recipe service and publication changes; B owns projection/Cook
changes; C owns migration/management recovery changes. Shared OpenAPI, generated
clients, stateful mocks and CI edits require an explicit writer assignment in
the same vertical slice, not a separate deferred integration phase. Honor any
active assignment until explicit handoff; the photo slice is now completed and
committed, so it is reusable foundation rather than a pending writer dependency.

B can design and exercise binding validation while A extends remaining intake. C can
inventory and test existing conversion/recovery before B finishes, but its final
round-trip acceptance waits for the persisted binding contract. Shared persistence
hooks are requests to their owner, not concurrent edits. Each worker gets a
bounded task, outcome, owned paths, prerequisites, acceptance and stopping point,
plus isolated ports/databases/build outputs. The coordinator integrates completed
slices and runs broad verification on a stable candidate; parallel focused passes
alone do not constitute integrated acceptance. This organization does not grant
deployment, production migration, archive or unrelated implementation authority.

Deliver working vertical increments: reliable saved ingredients first; an
ordinarily produced scalable instruction next; safe existing-library adoption;
then the complete accepted release. Whole-use is the first binding tracer, not
an implicit removal of already specified absolute, fraction, remainder or
per-item behavior. Do not rebuild qualified arithmetic or UI foundations.

### Honest progress and remaining reconciliation

Keep implementation state separate from evidence: not started / in progress /
implemented / deferred / superseded, alongside not run / focused passed / local
integration passed / hosted passed / failed / blocked. Each bounded task records
its scenario IDs, owner, prerequisite, next action and candidate-specific evidence.
The existing owner tasks remain the single completion checklist; reconcile their
coarse entries into bounded slices rather than creating a competing checklist.
An unchecked combined task does not mean none of its behavior exists.

At reviewed HEAD `c2727584`, canonical storage, guarded editors, fresh URL intake,
exact quantities, much of instruction projection and dependable grocery behavior
exist. Fresh URL producer qualification is recorded in
`.task/canonical-fresh-retention-20261110/handoff.md`; it does not qualify other
channels. Photo work completed in `a666a64f`: inspected records confirm 3/3
focused PostgreSQL cases, 1/1 native live owner and 3/3 producer-backed browser
journeys with zero required skips/retries. The combined local verifier
`.task/agent-finish/runs/f5e09ac8323045639231181f25897b5f.json` passed its selected
checks; `.task/photo-canonical-20261111/handoff.md` records the exact boundaries.
Hosted acceptance was not run. PDF/synthesis/share and general existing-recipe
repair are still unfinished; do not assign completed URL/photo work again. Ordinary binding
production, bilingual mapping and the operational conversion workflow remain
unfinished. Local evidence and hosted acceptance remain distinct.

The accepted decisions are reconciled into the owner requirements, designs and
tasks. The ordinary relationship evidence validator remains an explicit engineering
deliverable, not an assumed capability. Corpus C01–C53 retains its stable IDs and
release dispositions. Historical source checkpoints remain in design/evidence;
use the current task status and candidate-specific records for execution.

## Why

The canonical foundation now exists, but ordinary instruction relationships, remaining intake channels and operational library migration are incomplete. Finish those connections so portions, cooking and groceries consistently use the same saved facts without losing human edits.

## Outcome and Scope

Evolve this existing foundation, rather than replace it. One original-basis recipe content revision owns ordered ingredient rows, steps and their associations. Amount/unit remain independently nullable; exact fractions and ranges survive. The ordinary three-field editor stays quiet. Alex has approved absolute-allocation preservation, range comparison and new split/merge row behavior. Contract qualification remains a release gate; dataset adoption gates only the deferred bilingual work. Artifact existence is not implementation approval or readiness.

## What Changes

- **BREAKING:** lossless scalar/range quantities, stable line/step IDs and `contentRevision` replace the proposed scalar-only, ingredient-only revision contract.
- Save original facts from every context; preserve human edits, explicit clearing, retained sources and existing serving protections.
- **BREAKING:** guarded atomic writes for ingredients, basis, instructions and shopping corrections; reject unversioned old editors before any field changes.
- Capture/import/reprocessing publish through the same guarded owner; preserve existing user reporting and eligible repair triggers. No selective candidate endpoint or dashboard.
- Share one server projection across Home, detail, Cook and grocery demand. Mandatory step scaling is owned by the companion below, not omitted from the release.
- Split the earlier cooking, grocery and recovery deltas into their companion owners; no main capability sync or archive in this session.

## Capabilities

### New Capabilities

- `recipe-ingredients`: canonical original facts, exact quantities, identity and publication.

### Modified Capabilities

- `recipe-editing`: original-basis drafts and coherent guarded Save.
- `recipe-library`: original canonical DTO and independent nullable basis.
- `recipe-capture`: coherent new capture and protected reprocessing publication.
- `recipe-sharing`: lower-fidelity text sharing remains distinct from backups.
- `supper-servings`: canonical original facts feed the existing shared projector.

## Impact

Existing owners are RecipeService, SupperIngredientProjection, import/synthesis/publication, generated clients, editor, stateful mocks and PostgreSQL persistence. Reuse implemented behavior; future code work follows the selected owner tasks. Shared shapes live in [contracts.md](contracts.md); [review](review.md) and the [acceptance corpus](acceptance-corpus.md) distinguish this release from deferred bilingual work. Companions: [groceries](../restore-dependable-grocery-interactions/proposal.md), [bilingual identity](../bilingual-shopping-identity/proposal.md), [steps](../scale-cooking-step-ingredients/proposal.md), [migration/recovery](../migrate-canonical-recipe-model/proposal.md).


Fresh URL/photo qualification, retained review-material repair, ordinary original
editing, clear protection and report semantics are documented in [design](design.md)
and their capability deltas. [Tasks](tasks.md) maps those implemented foundations
to remaining work and evidence; no completed slice must be rebuilt solely because
its containing aggregate task is unchecked.

## Coordinated absolute-use slice 2

The accepted whole-use deployment remains the prerequisite. The next selected slice
adds ordinary explicit absolute-use production through existing URL/photo and guarded
Save hooks: total 200→250 preserves explicit 50, six portions from basis four displays
75 in Cook and one 375 grocery demand. Step edits replace proof; ambiguous associations
abstain quietly. Existing whole and allocation roles remain preservation requirements.

Selected tasks, sole-writer ownership, dependencies, scenario mapping, evidence and
unchanged lifecycle dispositions are recorded in
[tasks](tasks.md#coordinated-absolute-use-slice-2). Commit, push and exact-commit DV
deployment are explicitly authorized for this one completed slice. Stop after accepted
DV integration into recipe-view-redesign and provide the next prompt without launching
it. Unfinished aggregates remain open; no archival or main-spec promotion follows.

## Coordinated multiple-absolute-use slice 3

The selected successor of accepted `780327550ebbe9e34afa13ccbfb07cec46d0b4e5`
(DV `b4e031e6-54ab-4398-9b1c-0dcafcb9a4c4`) admits separate independently
explicit absolute uses of one unique ingredient across separate steps. C02 starts
with oil 2 tbsp and two 1 tbsp steps; eight portions from basis four show two
2 tbsp steps and one 4 tbsp ingredient-derived demand. Correcting the total to
3 tbsp retains both absolute uses and produces one 6 tbsp demand. Summing to a
total never establishes exhaustive allocation. Unsupported sequences remain quiet
original wording. Whole-use and prior absolute-use behavior remain required.

Scope: step 0.1–0.3 multiple-use subset, 2.1/2.3/4.1; canonical 2.2/3.2/4.1
integration/qualification subsets. B owns producer/unit proof, A owns guarded
Save/publication/native fixtures, C independently reviews preservation/recovery,
and coordinator owns browser/contracts/lifecycle/source freeze and final gates.
Lifecycle dispositions remain unchanged. No new role producer, asynchronous AI,
later intake, conversion, protected reimport, catalogue or Similar UI is included.
Commit, push, exact-commit frontend/backend/database DV acceptance and integration
are authorized for this slice only; stop after accepted DV and provide one bounded
successor prompt. No main-spec promotion/archive or broader CI completion claim.
