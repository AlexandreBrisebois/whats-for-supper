# Phase-12 baseline reconciliation — R12

## Final consolidation — 2026-10-16

The subsequent independent audit found and generated two supported omissions.
The user then approved both drafts (15 requirements /34 scenarios) and archival
of all98 changes. Current inventory is17 main capabilities /648 requirements /
1559 scenarios, zero active changes. See [completion](backlog/consolidation-completion.md)
and [coverage](backlog/coverage-matrix.md). Prior completeness and active-change
counts below are historical checkpoints; known defects remain in the backlog.

## Current checkpoint — DBR-P01, 2026-10-16

The user subsequently instructed “promote”, accepting the six identified reviewed
backup/recovery drafts and authorizing their documentation-only main-spec sync.
The [main backup/recovery spec](../../openspec/specs/data-backup-and-recovery/spec.md)
now contains their unchanged 31 requirements / 76 scenarios. All 17 approved
capabilities have promoted main specs, totaling **633 requirements / 1,525 scenarios**;
96 source changes remain active. No supported generation or human-review/promotion
item remains in this reconciled inventory. The documented baseline scope is
accepted/promoted, with the exclusions and qualifications recorded here and in each
owner; this does not establish whole-application runtime acceptance.

DBR-U01–U08, U12 and A34 remain unchanged. No excluded defect, complete recovery,
AI/provider/device/deployment or concurrency guarantee is newly accepted. The six
deltas, designs, proposals and metadata are unchanged; only their task follow-up
status is updated. No archival or application work. See the
[DBR-P01 record](data-backup-and-recovery.md#dbr-p01--acceptance-and-promotion-2026-10-16).
Earlier R12 counts, review queue and no-promotion statements below describe R12's
historical outcome; DBR-P01 supersedes only their current lifecycle/inventory status.
Final post-promotion checks are reported in the response and its unique run record.

## Historical R12 outcome and remaining-work inventory

Reconciled on 2026-10-16 at HEAD
`04a1c4570f9bbb01b47436790d4248635ac3179a`, branch `moving-to-openspec`.
The user's attached request authorizes documentation-only generation across all
17 approved capabilities and final reconciliation, stopping before human acceptance,
promotion or archival. A10 source-supported extraction and A34 remain unchanged.

No genuinely missing evidence-supported generation remains within the inventoried
scope. Six backup/recovery drafts already existed and remain awaiting review;
they are not a generation gap. The other 16 capabilities already have promoted
main specs. No new OpenSpec change, normative assertion, implementation task,
acceptance, promotion or archival was needed or performed here. Reuse the existing
artifacts and their ten-field discovery records, BSL mappings and explicit limits.
The overall baseline is **not accepted or baseline-complete** while backup/recovery
review and promotion remain pending.

Inventory: **96 active changes**, **16 main specs**, **602 promoted requirements /
1,449 scenarios**. The six backup/recovery drafts contain **31 requirements /
76 scenarios**; their main spec is absent. Counts measure documents, not qualified
application behavior. Current checkpoints supersede older “not started”, draft-only
and next-slice recommendations; those records and their IDs are preserved.

## Capability coverage in extraction order

Each linked plan retains its discovery, exact requirement/scenario evidence mapping,
uncertainties and historical lifecycle authority. “Promoted” below records earlier
work; R12 does not independently accept it. Active changes include older superseded
wording and are not safe to replay blindly.

| Capability and scoped workflows | Current main requirements/scenarios | Active changes | Remaining generation / lifecycle |
| --- | --- | --- | --- |
| [household-identity](household-identity.md): Shared access, invites, members, selection, transport and capture attribution; creation provenance and real uniqueness qualification remain open. | 42/105 | 6 | None; earlier promoted scope retained |
| [recipe-library](recipe-library.md): Browse/list/stack, detail/facts/editing, notes/ratings, originals/heroes, deletion/restore/purge and API providers; earlier correction blocks take precedence. | 92/201 | 19 | None; earlier promoted scope retained |
| [background-processing](background-processing.md): Persisted acceptance/states, dependency promotion, retry/reaping, diagnostics/reset, processor results, child cron and history pruning; no exactly-once guarantee. | 30/98 | 2 | None; earlier promoted scope retained |
| [household-live-updates](household-live-updates.md): Connection/snapshot/reconnect, schedule/move/slot, grocery/lifecycle and discovery dispatch; no durable replay or cross-replica convergence. | 30/79 | 4 | None; earlier promoted scope retained |
| [meal-planning](meal-planning.md): Week reads, assignment/replacement/movement/defer/remove, recipe-free plans, voting/lock, day validation, overdue finalization and direct suggestions; partial saves retained. | 93/214 | 8 | None; earlier promoted scope retained |
| [grocery-shopping](grocery-shopping.md): Scheduled supply, normalization/unit quantities, sections/corrections, individual checks, API bulk/map and refresh/default processing; canonical UUID and concurrent atomic merge excluded. | 37/82 | 7 | None; earlier promoted scope retained |
| [cooking](cooking.md): Entry/preparation, instruction shapes and presentation, position/ingredients, edit/report handoffs and recipe-specific completion/retry; generic fallback correctness excluded. | 26/58 | 4 | None; earlier promoted scope retained |
| [tonight-meal-decisions](tonight-meal-decisions.md): Home states, GOTO reads/selection/acquisition handoff and changed-plan recovery; unreachable pending-GOTO transitions excluded. | 27/57 | 3 | None; earlier promoted scope retained |
| [recipe-discovery](recipe-discovery.md): Supper queue, broader API filters, voting/counts/events, majority/unanimity suggestions and assignment handoff; match, consensus and persisted assignment remain distinct. | 21/47 | 3 | None; earlier promoted scope retained |
| [recipe-search](recipe-search.md): Entry/detail return, filter draft/state/vocabulary, browse/lexical/semantic/Similar, ranking/promotion and continuation/freshness; server eligibility remains authoritative. | 39/90 | 5 | None; earlier promoted scope retained |
| [recipe-capture](recipe-capture.md): URL/photo/description/enabled PDF, intake/dispatch/readiness, completion advice and processing-language requests; acceptance does not certify delivery or output language. | 41/110 | 7 | None; earlier promoted scope retained |
| [recipe-quality](recipe-quality.md): Issue input, server contextual retry policy, review/resolution, failed capture, cooking feedback, reference copying, bulk import/status; polling attribution asymmetry retained. | 44/111 | 6 | None; earlier promoted scope retained |
| [recipe-sharing](recipe-sharing.md): Bundle export/share/download/import, validation/privacy, pending-action suppression and recovery; no atomic filesystem/database or all-device synchronization guarantee. | 11/37 | 2 | None; earlier promoted scope retained |
| [member-preferences](member-preferences.md): Language/browse choices and persistence, preview controls, member/deployment resolution and consumer selection; language-only contract exception and null schema remain qualified. | 26/57 | 5 | None; earlier promoted scope retained |
| [app-installation](app-installation.md): Ordinary identity/manifest/shortcuts, conditional worker share transport and token staging/recovery; OS installation, offline availability and flag propagation unqualified. | 17/41 | 3 | None; earlier promoted scope retained |
| [data-backup-and-recovery](data-backup-and-recovery.md): Management acceptance/status, incremental export, merge/retained assets, issue-report recovery, search sidecars/reconciliation and scheduled maintenance; full disaster recovery excluded. | Absent | 6 | None; review six validated drafts (31/76), then authorized promotion |
| [demo-household](demo-household.md): Activation/access, snapshot capture/restore/clearing, automatic schedule, workflow observation and narrow AI bypass; no complete reset, atomic restore or zero-cost guarantee. | 26/62 | 6 | None; earlier promoted scope retained |

## Shared ownership, overlap and scenario review

- **Access/context/attribution:** Household identity retains shared authentication
  and syntax-only member binding. Capture and sharing persist attribution; quality
  retains its narrower import-ID polling predicate. A selected member is not a
  personal account, exclusive recipe ownership or universal polling entitlement.
- **Recipe lifecycle:** Library owns stored readiness, deletion/provenance and facts.
  Capture owns intake, processing-language requests and readiness finalization;
  sharing owns bundle acquisition. Restore merges existing deletion markers and
  retained assets; it does not bypass readiness predicates in ordinary library reads.
- **Calendar and decisions:** Meal planning owns dates, assignment, movement,
  validation and overdue finalization. Tonight and cooking consume those operations.
  Discovery suggestions/unanimity metadata and search Top Pick are not assignments
  or persisted locks. Cooking completion names the viewed recipe; it does not
  complete a different supper. Detailed preview gesture thresholds remain the
  explicit X-MP03 exclusion, not an invented shared-owner requirement.
- **Groceries:** Shopping owns normalized-name/unit aggregation, display-name checks,
  sections/corrections and stored needs. Planning owns calendar mutations and their
  recomputation boundaries. Live updates owns received event representation and
  dispatch; map-only events and sync gaps do not establish complete grocery refresh.
  Backup owns category/plan export and merge. No canonical UUID or atomic concurrent
  JSON-map guarantee is introduced.
- **Background and delivery:** Background processing owns persisted states, retry,
  dependency promotion, child cron and pruning. Capture/quality/management acceptance
  remains distinct from delivery and completion. Household live updates owns process-
  local connections, exclusion identity and received-event reconciliation. Maintenance
  reports depend on launch tasks, not successful completion of their child workflows.
- **Search and recovery:** Search owns retrieval, hard filters, ranking, server
  promotion eligibility, continuation and materialization policy. Backup owns
  sidecar export/restore and bounded repair dispatch. Compatible schema/model/
  fingerprint/status checks do not prove valid vectors or eventual convergence.
- **Preferences and transport:** Member preferences owns loaded-member language,
  browsing and effective preview resolution. Cooking's stale “No accepted main spec
  exists” owner row is replaced with actual accepted requirements “Resolve language
  for the selected loaded member” and “Select consumer experience using effective
  preview enablement”. Installation owns advertisement/worker/browser staging;
  capture owns acquisition eligibility and explicit Save. UI locale is not the
  requested AI processing language. Process PDF advertisement and API/member gating
  are independent configuration seams.
- **Demo and ordinary recovery:** Demo snapshot/restore/clearing and narrow AI
  bypasses stay in demo-household. Ordinary backup does not acquire demo reset
  semantics, complete media recovery or infrastructure backup duties. Neither
  owner promises atomic file/database rollback or universal no-AI-cost behavior.

Requirement-title inventory found no missing active-delta title in the 16 promoted
main specs. Normalized block comparison found only the **15 known superseded
blocks**: ten original URL/photo capture blocks replaced by the accepted RC-P1
intake/completion corrections, and five original library View Original/deletion/
restore/purge blocks replaced by the accepted claim corrections. These differences
were read, not overwritten. All other active blocks in promoted capabilities match
main text modulo whitespace. Original active additions must not override those
later modifications during a future sync/archive. The six unpromoted backup deltas
have distinct titles and complete scenario mappings to BSL-data-backup-and-recovery-
001–020. Their CLI-reported proposal, specs, design and tasks all exist; no artifact
or prerequisite is missing and no implementation task needs to be invented.

The accepted main meal-planning Purpose and early evidence paragraphs still describe
its initial week-reading slice. Later promotion paragraphs explicitly expand it to
93/214 and preserve that earlier text. Treat those early slice exclusions as
historical boundaries, not absence of the appended mutation/suggestion requirements.
Likewise, old “uncreated” search/preference references in historical extraction
records are not current owner status. Current owner specs and the inventory above
resolve those dependencies. No accepted normative wording is edited in R12.

## Evidence identity and drift reconciliation

Before writes, captured HEAD, full staged/unstaged binary patches, status including
all untracked files, and SHA-256 identities for 1,908 existing tracked/untracked
paths under `/tmp/wfs-baseline-20261016/`. Entry status had 196 staged, 17 unstaged
and 213 untracked paths (categories can overlap), and no staged/unstaged deletion.
The previously removed navigation capability remains absent; nothing is restored.
All pre-existing work, including harness/CI/Taskfile and overlapping plan edits,
is retained. During read-only auditing, external staging changed the index to 424
staged paths without changing any file bytes or HEAD. R12 ran no staging command;
`prewrite-staged` preserves that externally updated index for final comparison.

Rechecked **1,044 recorded plan path/hash pairs** (last recorded digest per path
within each plan), including fenced discovery identities and Markdown-linked tables.
No executable source, test, contract or SQL drift was found. Fifteen distinct
OpenSpec documentation inputs differ from older identity/library snapshots:
eight main specs advanced through recorded promotions/corrections, and seven old
library delta preambles migrated into designs under BSL-recipe-library-038. The
original digest tables remain historical; current main digests are recorded in
each capability's R12 checkpoint. Current digests for the seven migrated deltas:

| Existing delta under openspec/changes | Current SHA-256 |
| --- | --- |
| [baseline-recipe-library-deletion-restore-purge](../../openspec/changes/archive/2026-10-16-baseline-recipe-library-deletion-restore-purge/specs/recipe-library/spec.md) | `b898cf358c3144e3c38bc5c1e6895e4f0208026cc937e045850825c487f02b5c` |
| [baseline-recipe-library-detail-discoverability](../../openspec/changes/archive/2026-10-16-baseline-recipe-library-detail-discoverability/specs/recipe-library/spec.md) | `162a660c206bbd6290c271ae7c65704091ceb944c3564b09f01672bea700085f` |
| [baseline-recipe-library-detail-editing](../../openspec/changes/archive/2026-10-16-baseline-recipe-library-detail-editing/specs/recipe-library/spec.md) | `36aba25b63d438a1146e1bf9c83c3bc5628d563b8faa72ca138596928038295c` |
| [baseline-recipe-library-detail-reading](../../openspec/changes/archive/2026-10-16-baseline-recipe-library-detail-reading/specs/recipe-library/spec.md) | `35ed6664da5f8a311894743137c418f338b2204af910b809dc78fe0e196bc955` |
| [baseline-recipe-library-list-visibility](../../openspec/changes/archive/2026-10-16-baseline-recipe-library-list-visibility/specs/recipe-library/spec.md) | `9cce83375ef7c2bcf59bf578a65e77a59ab2865b23ee146e08128d1a0987b13b` |
| [baseline-recipe-library-ratings-notes](../../openspec/changes/archive/2026-10-16-baseline-recipe-library-ratings-notes/specs/recipe-library/spec.md) | `b67c33d51ed78c3133c90cf1a06071782567b9bd5e142cccf3eee7b4285e7f22` |
| [baseline-recipe-library-view-original](../../openspec/changes/archive/2026-10-16-baseline-recipe-library-view-original/specs/recipe-library/spec.md) | `a9196c79b92a3e90a8ec284552dacfd946ec5c01256f9e8efc9e27ccc1821a9b` |

Re-read the promoted capture/library differences and immediate shared requirements
rather than inheriting old owner hashes. Backup/recovery's 48 recorded inputs still
match. Re-read management acceptance/status, backup selection and restore sidecar
logic, SearchReconciliationWorkflow, production dreaming dependencies and actual
SearchIndexBackupRestoreTests assertions. This confirms the existing evidence
boundary, not runtime execution: fixture vector/model values, conditional assertions,
separate saves and background launches still qualify the draft claims.

For additional path-level identity, resolved 556 existing source/test/contract/
configuration references from the capability plans into the private
`/tmp/wfs-baseline-20261016/source-inputs.json` manifest. SHA-256:
`3778a88ab67109947d965f47877f98613b92fc61a29fbfecdcebc7a35eab1974`.
App-installation has no old public digest table; its named sources remain clean
against the recorded HEAD and are represented in this current manifest. Grocery's
five public hashes identify shared owners; its executable paths likewise remain
clean against HEAD. Rechecking file identity is not rerunning their prior tests.

## Unresolved, excluded and deferred work

No consequential unresolved decision prevents the supported generation inventory.
Existing limitations are not accepted as desired product behavior:

- Preserve A34 and identity creation provenance/real PostgreSQL uniqueness,
  concurrency, collation and compatibility qualification.
- Preserve contract/implementation discrepancies: member-binding/security metadata,
  language-only preference payload and nullable language schema, undocumented errors,
  source markers and narrower endpoint eligibility. Do not repair contracts here.
- Preserve U12 and all capability-local exclusions for separate filesystem/database/
  enqueue/broadcast failure, request races, incomplete refresh, identity recovery,
  eligibility, weak/mocked assertions and unsupported retries or convergence.
- Backup DBR-U01–U08 remain non-normative: incomplete disaster helper, incremental
  stale exports, partial merge/media recovery, CSV culture/newlines, dangling report
  linkage, embedding/vector limits and maintenance child/cleanup failure boundaries.
- Demo U07/DH-U01–DH-U09 retain incomplete reset, asset, custom-root and AI-bypass
  limits. Member preview configuration and enabled PDF/cooking paths already have
  bounded evidence; that does not qualify deployment or every preview variant.
- Synology/deployment qualification, real OS installation/share/cold-warm handoff,
  native PDF rendering, offline behavior, provider/model output, multireplica delivery
  and real household recovery remain explicitly deferred or excluded. No placeholder
  requirements, infrastructure backup implementation or broad qualification is added.

The human-review queue is the six `baseline-data-backup-and-recovery-` changes,
in their existing dependency order: management-entry-observation → application-export
→ restore-merge-assets → import-report-recovery → search-recovery → scheduled-maintenance.
Review their 31/76 claims, evidence and DBR-U01–U08; separately authorize promotion
if accepted. Other capabilities retain their previously recorded acceptance/
promotion, including app installation's AI-D01 scope without inventing a separate
human review event. No lifecycle action is performed by this reconciliation.

## Verification and task ownership

- **Passed:** six selected backup/recovery strict validations and artifact status
  checks; pre-edit global `openspec validate --all --strict --no-interactive`
  reported 112 passed / 0 failed. Evidence identity, title/block and ownership
  reconciliation are static checks only.
- **Final required checks:** after these documentation edits, repeat global strict
  validation and `task verify -- <all 20 task-owned documentation paths>`. Report
  final outcomes and the invocation-specific `.task/agent-finish/runs/` record in
  the final response, without mutating the verified documents to claim future success.
- **Failed/blocked:** no unresolved selected generation/grammar blocker at this
  checkpoint; final command failures, if any, must be reported explicitly.
- **Not-run:** application/unit/API/browser/PostgreSQL/database/device/provider/
  model/runtime qualification under the user's boundary and A34. No services,
  dependency installation, database setup or household-data operations.
- **Not-applicable:** application TDD, client generation, migrations, preparation
  for documentation-only edits, acceptance/promotion/archive/deployment checks.

R12 owns only this report, the shared workflow, the index and the 17 capability
checkpoint additions, plus the single current cooking owner-row correction. Review
the actual task-local diff against saved before-images, compare the index with
`prewrite-staged`, and verify every other existing file against the entry manifest.
All 96 change directories and 16 main specs remain byte-for-byte unchanged by R12;
the deleted navigation capability remains absent. No stage, commit, publish or deploy.
