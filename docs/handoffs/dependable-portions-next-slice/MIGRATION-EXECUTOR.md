# Disposable-copy migration executor handoff

This handoff describes the bounded executor for `migrate-canonical-recipe-model`
tasks 1.1, 1.2 and 3.3, with maintenance/operator contributions to 3.1/3.2.
The application baseline was `b47fc540ed5a02fabfd5e1908125378ed89722bc`, directly
following recovery application `71b56bc5945f0be770eeb02bc5759578faf0582f`.
The workspace was clean and the remote branch matched on entry. The six existing
containers and the process on port 3000 were reserved throughout this work.

## Delivered behavior

The diagnostic inventory is read-only. Source-admitted capture additionally uses
the existing snapshot owner's validated tables, typed history and protected file
projection. Execution rechecks the complete captured table/key/column and file
inventory under the actual revocable maintenance capability and recovery Write
lease. Selected revisions, original-field hashes, operation IDs, artifact/schema/
model/source references and the complete stored-or-assignment-implied week set
must agree before the inert plan receipt is written. Unsupported and deferred
selections return an incomplete report with zero conversion/reset/receipt writes.

The inventory binds one deployment-calendar evaluation date. Migration recompute
uses that date across interruption and midnight; demand and serving versions come
from the same projection. Completion describes this captured date. The later
cutover must audit current-date freshness before reopening.

The converter has one implementation. Ordinary calls retain their existing
refresh scheduling. The internal migration call uses the same guarded V2
conversion/replay owner and search invalidation while deferring redundant queued
refresh work because all inventoried weeks are rebuilt synchronously. Canonical
no-op conversion retains its original legacy shadow fields.

Each unfinished week runs through the existing grocery coordinator, transaction,
advisory locks and recompute owner. The recipe-row checks/baselines reset and the
completed immutable week receipt commit together. Interrupted transactions retain
neither. Receipt lookup precedes recomputation; completed weeks return their
recorded disposition. Their historical digests never restore cleared checks.
Later valid item and partial/empty bulk checks are verified through the immutable
check outcome chain and retained exactly on retry.

New grocery mutation outcomes retain their exact submitted input in a closed V2
JSON envelope in the existing `outcome` column. IDs and input hashes keep their
existing owner. Raw V1 historical outcomes remain readable; no stored historical
row is rewritten. This supplies the partial bulk-map evidence that a resulting
full check map cannot reconstruct.

Live and validated pruned maintenance observations share one receipt codec.
Consistent copies must agree, including result and metadata; malformed or
conflicting proof stops resume. Typed vocabulary-reference extraction includes
both forms. The existing grocery presentation epoch also binds the retained plan
receipts, so an old request is rejected before mutation-outcome replay even when
row identity/demand did not change. Pruning and retries retain the same epoch.
An inert plan supplies a writer fence, never campaign completion or reopening
permission.

## Preservation and writer inventory

The fixtures include 32 actual PostgreSQL tables, populated past/current/future
weeks, stored-only and assignment-only weeks, planned/locked/skipped/cooked and
non-cooking events, preserved voting/identity/date/servings/preparation facts,
checked and removed extras, recurrence links, protected household correction,
original/hero media and durable reviewed vocabulary bytes. The four-portion legacy
recipe retains exact `⅓ cup` notation and a scalar 1/3 after conversion.

Protected facts are compared by complete row/key/column and file descriptors.
Permitted changes are selected converter-owned fields and journals/search
sidecars, and the explicitly receipted grocery-derived fields. Existing plans,
calendar/serving facts, extras/checks/history/removal links, corrections, original
media, vocabulary and unrelated history retain their captured facts.

| Writer | Admission/fence owner |
| --- | --- |
| Recipe edits, old tabs and manual corrections | Existing revision/legacy-payload guards and recovery Write boundary |
| Web/photo/PDF intake, repair and file-before-DB publication | Captured publication/repair journals, typed retained references and guarded publication |
| Recipe sync, seed/merge and exact restore | Existing distinct publication/recovery owners; no implicit batch conversion |
| Vocabulary and household/category changes | Existing membership/revision, presentation and publication owners |
| Planner, portions, grocery rows/bulk and extras | Existing transaction/check coordinators and recovery Write participation |
| Workflow/Dreaming/refresh work | Existing worker Write boundary; held maintenance blocks ordinary dispatch/mutation |
| Privileged SQL/schema and container operations | Stopped-app operator procedure and independent recovery pair; application leases do not authorize these tools |

## Operator invocation

Use an explicitly selected disposable database named `wfs_*`, its copied recipe
root, the actual executing assembly SHA256, reviewed full catalog schema hash,
model `canonical-v2/food-policy-1`, protected current-format snapshot and preallocated
operation/recipe IDs. Git commit identity is 40 hex; assembly artifact, schema,
manifest and reference digests are separate 64-hex domains. A `schema.sql` file hash
is not the live catalog fingerprint. The captured inventory includes its evaluation
date and exact source/selection/week bindings.

Install and verify this operation's durable hold through the existing operator
procedure first. Source snapshots/copies and the old executable/schema recovery
pair remain independent prerequisites. The CLI validates the exact hold, target,
executing assembly and actual lock-owning PostgreSQL session. Its process path
returns before host, workers, workflow seeding or startup reconciliation.

```sh
dotnet /exact/build/RecipeApi.dll --canonical-migration capture \
  --input /operator/request.json --output /operator/inventory.json \
  --candidate-commit <40-hex-reviewed-commit> --marker-sha256 <64-hex-marker> \
  --disposable-database wfs_<owned-copy> --recipes-root /absolute/copied/recipes

dotnet /exact/build/RecipeApi.dll --canonical-migration execute \
  --input /operator/inventory.json --output /operator/result.json \
  --candidate-commit <same-commit> --marker-sha256 <same-marker> \
  --disposable-database wfs_<same-copy> --recipes-root /absolute/copied/recipes
```

Exit 0 means the requested capture/completion report was written, 3 means an
incomplete deferred/unsupported report, and 2 means stopped/invalid invocation.
Use a new output path on every attempt. After interruption or lost output, reread
and retry the same immutable inventory/IDs under the verified hold. Database
receipts own progress; output files do not fence resets. A changed request, foreign
receipt, missing pruned proof, revoked marker or lost operator session stops work.
The hold remains installed after success and failure.

## Evidence and qualification

Evidence directory: `.task/migration-executor-20261113/`. Its date is the session's
November 13 start; delivery continued on November 14 Toronto time.

- Reusable foundation: 8 PostgreSQL cases, zero skips, `bb9de956cc714a05ba724e1bbec36d2f`.
- Intended source-admission RED: `d924bc43fc74479ba02b8ed4b9244ecb`.
- Valid-fixture missing executor RED: `785795245695489bba0ae996027850b7`.
- Lost operator session RED: `f2a79f6fa96c41faaa56d152ea103fba`.
- Source/reset/write-lease review RED: `8440ab403f6f474a852d306867738c88`.
- Actual sent HTTP old-write and saved-receipt replay RED: `1292c62537c14459a3bb4ef516f045fe`.
- Partial bulk/selected-fact/no-op/precision RED: `021e576fd8c943c990405360afd1836b`.
- Business-date/midnight RED: `a2a5f83345f44088ae1ae114695a657c`.
- Integrated selected PostgreSQL and ordinary concurrency GREEN: 79 passed,
  zero skips, `6649fb4d97164aa8a67373bca632d4f8`. Business-date acceptance passed three cases with zero skips in
  `998a61bb459b40e5bbc3c38848d1a902`; the complete final suite has its own receipt.
- Pure manifest/receipt/retained-reference controls: 56 passed, zero skips,
  `pure-api/pure.trx`; stateful row/mock controls: 49 passed in `epoch-mock-unit.log`.
- Immutable independent reviews: `review/source-v1.json`, `review/source-v2.json`, `review/source-v3.json`
  and the final prepared delta. Review findings were reproduced before fixes.

Complete database receipts live at `.task/database-tests/runs/<id>/result.json`.
`rehearsal-observations.json` extracts actual per-scenario manifests, hashes and
live/pruned receipt observations from the named GREEN TRX; the final full suite
retains its own observations. Fixture commit `aaaa...` is synthetic test identity,
not a claim about deployed Git provenance. Assembly bytes and every database/file
observation are from each actual disposable run.

The final gate is run after source and this handoff are finalized. Its exact
`record_path`, input identity, check outcomes, runtime build identities and owned
cleanup are retained in `final-verification-v2/runtime.json` under the evidence
directory. Standalone receipts above qualify their own inputs, not later edits.
Earlier fixture, output-location, browser setup and content-mutation failures
remain retained separately; they are not converted into acceptance.

The first complete gate `8767b46de3b6410e99a82995219ee807` retained stable
content and passed specification, harness, formatting/types, units, API,
contract/client and live endpoint checks. Browser results were 1,007 passed,
101 conditional skips and one preexisting Tomorrow teardown ownership failure.
The full PostgreSQL process was blocked by its 180-second compile/test deadline
(`c807fbfdf76844e387b23e80e200d507`), with owned cleanup; it is not a passing suite.
The test-only repair waits for all four actual move notifications while retaining
page mocks. The runner deadline is now a bounded 600 seconds for the expanded
suite, retaining every assertion, zero-skip requirement and stop/reap behavior.
Independent deterministic failing/corrected routing experiments are retained in
`review/route-ownership/`. The repaired Tomorrow and migration browser files passed both repetitions: 16
tests, zero retries, in `focused-browser-v6.log`. All 18 runner unit/cleanup
controls passed in `database-harness-unit.log`. The final gate reruns the complete
path union.

The predecessor PR workflow for exact application `71b56bc5` passed; its separate
push workflow was cancelled. Alex owns subsequent CI monitoring. Hosted acceptance
of this executor candidate is a separate stage.

## Stopping boundary and next operator work

This slice delivers source, disposable rehearsal, reviewed receipts and the
operator handoff. Vocabulary adoption, migration activation, DV changes,
production deployment, adjacent intake/garlic/Similar/UI work and reopening remain
outside the executed scope. Conditional recipe-only fallback was unnecessary.

The next selected work must bind an actual copied-library candidate/configuration,
review corpus conflicts/deferred IDs and current-date freshness, verify the exact
old recovery pair, rehearse coordinated frontend/backend/schema shutdown/restart
and independent post-conversion backup/read-back, and obtain the applicable
cutover authority before activation. Search sidecars may remain pending: synchronous
grocery completion does not certify search/index release readiness.

Task and lifecycle reconciliation is recorded in the selected tasks and shared
rollout owner. Fully completed qualified changes alone may sync/archive; open
aggregate release/producer/cutover requirements retain their changes.
