# Tasks

Task boxes below own investigation progress. The [inventory](../../../../docs/telemetry/journey-inventory.md) began as a source-backed planning seed; dated coverage cards distinguish completed source traces from unrun walkthroughs. This change uses `skip_specs: true` because it changes no application behavior. Documentation checks replace TDD. Use the [session prompt](../../../../.agents/prompts/telemetry-session.md), mode `investigate`, for one group only.

## 1. I1 — Planning and multi-vote Discovery

**Outcome and scenarios:** Inventory rows J02–J04: open, participate, personal exhaustion, family convergence, close promotion/commit and lost-response recovery.
**Owners and boundaries:** Canonical `planning-lifecycle`, `recipe-discovery`, `meal-planning` and `household-live-updates`; Planner/Discovery pages, week/discovery stores, API wrappers/OpenAPI, Schedule/Discovery controllers/services/VotingSession, current tests named in the inventory.
**Dependencies and prerequisites:** None for source work. Isolated UI/synthetic data for a live walkthrough; absence remains not-run. F1–F3 are not required to document current behavior.
**Acceptance boundary:** Exact source/contract/commit/presentation chain for each row, proposed event owners and one bounded successor candidate; no instrumentation.

- [x] 1.1 Trace J02–J04 in current specs/source/tests, including in-flight votes after convergence and partial promotion before failed close. Update every coverage-card field, source identity and exact owner references; verify cited contract methods and tests exist, with no claim that reading them ran them.
- [x] 1.2 Walk the selected paths and one failure/recovery path using an existing isolated UI with synthetic data when available; record actual environment/steps/results or explicit not-run/blocked cells. Reconcile observed contradictions as findings, without editing product behavior. Deliver one recommended next proposal boundary in the inventory and run scoped `task verify` for owned docs.

## 2. I2 — Assignment, non-cooking and movement

**Owners and prerequisites:** J05–J07; `meal-assignment`, `meal-rescheduling`, `non-cooking-plans`, `tonight-meal-decisions`, planner/Home/Quick Find/recovery components, week/today stores, generated wrappers, ScheduleService and its Assignment/Tomorrow parts. Read I1 only where round/plan state affects a selected scenario.

- [x] 2.1 Fill J05–J07 coverage cards after tracing assign/replace, no-cook save/clear, move/swap/defer/remove, cancellation and recoverable partial success to actual trusted boundaries. Verify contracts and targeted tests; document proposed emitters without business IDs, dates or notes and name each unresolved semantic decision.
- [x] 2.2 Record isolated UI success and failure/recovery walkthroughs or explicit unavailable statuses; verify no movement/assignment is inferred from a preview or later failed read. Update inventory/tracker, recommend one bounded successor and run scoped documentation verification; stop before any emitter or contract change.

## 3. I3 — Grocery checks and extras

**Owners and prerequisites:** J08–J09; `grocery-shopping`, GroceryList, useSchedule/week/planner stores, ScheduleController/ScheduleService grocery methods, GroceryCheckCoordinator/GroceryExtraService, grocery check/extras tests. Review concurrent writes and future/historical extra semantics.

- [x] 3.1 Fill J08–J09 cards for presented lists, check/uncheck, extras add/check/rename/category/delete and failure/reconciliation. Separate optimistic state, persisted map/extra state and publication failure; verify cited API methods, concurrency rules and tests. Record that no saved shopping-trip completion exists.
- [x] 3.2 Walk synthetic phone/wide presentation and persisted/rejected changes where available; record actual statuses. Propose a precise all-current-items-checked observation with pending writes, extras, empty lists, unchecking, list changes and remote updates considered; leave its emitter unapproved until semantics are resolved. Update tracker and run scoped documentation verification; stop before adding completion behavior.

## 4. I4 — Entry, finding recipes and cooking

**Owners and prerequisites:** J01, J10–J12; `household-identity`, `member-context`, `household-members`, `recipe-search`, `recipe-library`, `cooking`, `tonight-meal-decisions`; exact UI/API/store/test owners in the inventory.

- [x] 4.1 Trace invitation/login/member recovery, Search/Browse/detail, GOTO/tonight decisions and cooking/return-to-original/finish. Fill cards with actual trust boundaries, handled failures and interruption/long-pause behavior. Verify source/test/contract links and identify missing event owners without collecting queries, recipe/person IDs or content.
- [x] 4.2 Record available isolated walkthroughs and unknown/device cells honestly; distinguish automatic overnight finalization from a user cooking completion. Update inventory/tracker and one successor recommendation; run scoped docs verification. No cookies, authentication behavior, preference policy or cooking UI changes.

## 5. I5 — Capture, repair, sharing and library maintenance

**Owners and prerequisites:** J13–J16; `recipe-capture`, `capture-recovery`, `recipe-quality`, `recipe-sharing`, `recipe-recycle-bin`, background processing; current feature/API/workflow/test owners in the inventory. Do not enable real AI/provider collection or use household content.

- [x] 5.1 Trace acceptance versus readiness/failure, retained-work retry, issue-save/reimport/review/resolve, export/import and bin/restore. Fill coverage cards; identify bounded async operation correlation and any restart/cross-document privacy conflict before proposing a mechanism. Verify each test/source/contract boundary; do not reuse persistent business IDs as telemetry identity.
- [x] 5.2 Record available synthetic UI evidence and receiver gaps, with real provider, deployed sharing and physical-phone cells separate. Update tracker/inventory and recommend one bounded successor; run scoped docs verification. Stop before instrumentation, package/deployment changes, mass successor generation or receiver implementation.

## 6. Investigation reconciliation

- [x] 6.1 Reconcile inventory source identity and evidence states across selected groups; task boxes remain unchecked for missing required source/owner work or required walkthrough evidence. Validate this change with `openspec validate inventory-telemetry-journeys --strict --no-interactive`, review scope and run `task verify -- <complete reviewed docs>`. Report exact status and `record_path`; propose future journey changes separately rather than embedding their implementation here.

## I1 investigation evidence — 2026-10-30

Selection: I1 tasks 1.1–1.2, mode `investigate`, one group per the change design.
I2–I5 and reconciliation task 6.1 remain unselected. The deliverable is the
[J02–J04 coverage cards](../../../../docs/telemetry/journey-inventory.md#i1--planning-and-multi-vote-discovery--2026-10-30)
and tracker checkpoint. All runtime, API contract, receiver, collection and
deployment files remain outside the edit scope.

Identity: WFS HEAD `bc38df83753ddb98a9ea38b814da9913b7b875bc`, branch
`review/profile-settings-home-visuals`; existing tracked/untracked telemetry and
archive edits were baselined before writes. The private before-images/status and
50-file source manifest are under `.task/telemetry-inventory/i1/`.
`source.json` SHA-256 is
`439ab428b3f4747ad24d59b3c5a7423baf1d99e447344acc718130e7ce5fb699`.
The inventory records local receiver HEAD, dirty state, exact package versions
and five inspected guide hashes. No receiver files/storage were changed.

Acceptance: source tracing distinguishes optimistic intent, per-request persistence,
round-close atomicity, post-commit failure, live publication and guarded presentation.
Exact approved methods/paths, generated builders and named test bodies were checked;
reading tests is not execution. Late votes can commit after convergence; successful
promotions persist before another promotion/close fails; receipt replay preserves
later early votes. No new product semantics or emitter contract was approved.

Findings retained without product repair:

- `planning-lifecycle` says failed open/follow-up restores captured local days/status;
  current `weekStore.openVoting` catch refreshes session and throws, with no explicit
  rollback. Existing live state can have changed independently. No exact rollback
  or automatic recovery guarantee is inferred.
- `DiscoveryPage` catches initial queue/category read failures and clears loading;
  its empty branch lacks successful-load evidence. Optimistic last-card removal
  can also reach empty while a vote is pending. Empty presentation cannot prove
  successfully exhausted persisted voting; an observer needs separate guards.
- `PlannerPage.handleCloseVoting` shows success after any resolved close, without
  checking that the captured week/round is still presented. Store guards protect
  plan state; they do not prove this feedback belongs to the current week. This
  is a source discrepancy against the current-week presentation requirement,
  not a reproduced runtime defect.
- The vote controller's missing-member/body 400 is not listed on the OpenAPI vote
  operation. No contract/client/mock changes are made by this investigation.
- Current local Sentrame `validateDefinition`/navigation tests and USER-GUIDE allow
  goal-free navigation; inventory/tracker mandatory-goal planning claims were
  corrected. Untracked loop-aware-view plans/source are not runtime support.
- Existing .NET Serilog/OTel registration differs from the receiver's qualified
  sample. Named-log bridge/export, opt-in, budgets and shutdown need WFS-specific
  qualification before any trusted API emitter. Browser/API correlation is absent.

Walkthrough availability: `cua.getState()` returned no browsers with browser access
host unavailable. Existing local listeners were not identified as disposable
synthetic journey fixtures. No UI was selected/launched/mutated, and no failure
was induced. Inventory cells list the exact proposed success and partial-success/
lost-response recovery steps as **not-run** with the environment blocker. Tasks
1.1–1.2 explicitly allow recording unavailable UI evidence; their investigation
completion must not be reported as an executed walkthrough or runtime qualification.

Checks: source/contract/test-symbol and link consistency are documentation acceptance.
`.venv/bin/python -B .task/telemetry-inventory/i1/check-source.py` passed: 50 WFS
file hashes, seven receiver hashes with reviewed drift, nine method/generated-builder
pairs and 24 named tests located, not executed. Result: `.task/telemetry-inventory/i1/source-check.json`.
An initial source-identity check failed on concurrent Sentrame USER-GUIDE edits;
the nine-line view-description addition was reviewed and recorded separately.
It does not change the inspected goal/trust boundaries or qualify those views.
Behavior TDD/preparation are not-applicable. Unit/mock, real API/PostgreSQL, actual
exporter/receiver reads/replay/reopen, deployed and physical-device qualification
are not-run. Strict change validation and scoped repository verification results
are recorded in the session handoff using the actual invocation `record_path`;
the final verifier record owns the tested document identity.

Strict `openspec validate inventory-telemetry-journeys --strict --no-interactive`
passed. Initial scoped verification record
`.task/agent-finish/runs/070e49d698544daf9f8dd8c3e47b64f5.json` failed documentation
link parsing at three parenthesized app-route paths; spec validation/content
stability passed. References now link the app directory and spell the exact
route filenames separately. Fresh scoped verification owns the corrected result.
Corrected scoped record `.task/agent-finish/runs/9b26b35199064aa78297edccf0b09af2.json`
passed documentation, selected strict OpenSpec validation and content stability;
application checks were not-applicable. Task 1.2 is complete through its explicit
unavailable-walkthrough branch. This subsequent checkbox/evidence update receives
its own final scoped verification, reported directly in the handoff.

Scope review: only inventory, tracker and this task record are owned. Existing
tracker text is preserved apart from the selected I1 checkpoint/status, corrected
receiver assumption and links to the already present navigation archive. No
application/source/test/provider or other group's tasks are changed.
Full local-link/heading review located one additional stale historical F2-2 link;
it now points to that same archive. All 108 local links and referenced Markdown
headings in the three owned documents resolve. The proposed emitters retain
operation ownership, post-commit failure distinctions and explicit unresolved
semantics; no product fix or implementation guarantee is substituted for evidence.

Next proposal recommendation: `observe-discovery-results`, browser result evidence
only; settle occurrence/freshness/pending-write semantics, then test the closed
reason vocabulary and actual action/Node/receiver path. No successor is created.
Next inventory session: I2 tasks 2.1–2.2, assignment/non-cooking/movement; do not
instrument from this checkpoint or treat the I1 source findings as repair authority.

## I2 investigation evidence — 2026-10-30

Selection: `inventory-telemetry-journeys`, schema `wfs`, mode `investigate`, tasks
2.1–2.2 only (J05–J07). Initial apply progress 2/11; tasks 2.1–2.2 are accepted below, bringing progress
to 4/11. No other session is selected. Deliverables:
[I2 coverage cards](../../../../docs/telemetry/journey-inventory.md#i2--assignment-non-cooking-and-movement--2026-10-30)
and the existing tracker. The three owned paths are `docs/telemetry/journey-inventory.md`,
`docs/telemetry/README.md` and this file. Runtime, contract, test, receiver and
all other planning files are outside the edit scope.

I1 reconciliation: read final record
`.task/agent-finish/runs/da058edf416342a0b0f0c3b7f64d414c.json`;
`automated_checks_passed=true`, selected-documentation scope, documentation /
selected strict OpenSpec validation / content stability passed, application checks
not-applicable. Its source-only/UI-not-run limitation remains. No I1 runtime
qualification or repair is inferred. Earlier I1 checkpoint records remain historical.

Identity: WFS HEAD `bc38df83753ddb98a9ea38b814da9913b7b875bc`, branch
`review/profile-settings-home-visuals`. Before-images, staged/unstaged baseline
and status are private artifacts in `.task/telemetry-inventory/i2/`; staged diff
was empty. The 46-file inspected WFS manifest and five local receiver guide hashes
are in `source.json`, SHA-256
`6522979be54e5890e3df77ffc8f0eb4c82c82d36744eb0ae308f53be90c8fd31`.
Receiver HEAD is `c4d0204b4891da15ae4b020d37682e48052e1879`, with existing
USER-GUIDE/query/UI edits and untracked loop-view plans/source/tests. No running
receiver/config/storage was selected; local documented versions and exact WFS
package pins are recorded in the inventory. No receiver files changed here.

Task 2.1 acceptance: J05–J07 contain every coverage-card field, including entry,
intent/preview, optimistic state, commit, fallible publication/read, cancellation,
retry/partial recovery, automatic coverage limits, exact proposed emitter symbols,
standard carrier, safe fixed fields, correlation/volume/loss limits, receiver
mapping and unresolved decisions. Exact UI/store/wrapper/generated/OpenAPI/
controller/service/persistence and targeted test owners are recorded. Persistence
observations belong at actual save/commit, not a late response or restored local
snapshot. Tomorrow/cross-week moved=true with incomplete refresh differs from
legacy message-only/no-op 200 and from assignment/non-cooking/defer/delete errors
after commit. Home and Planner retain different recovery state; Search/Browse
legacy next-week completion does not independently confirm movement.

Findings recorded without repair: current captured-target assignment read and local
Today update differ from selected canonical wording; EF non-cooking constraint
text differs from install SQL's optional preset notes. Source/model drift is not
a reproduced deployed database defect. Optimistic removal restores a captured
snapshot on rejection, without movement's newer-state guards or its own authoritative
reread. Guarded Home recovery is distinct from helpers whose names say empty slot
but call legacy assignment. No new concurrency, rollback or delivery guarantee is
inferred. No product/spec/API/client/mock/source change is authorized by findings.

Task 2.2 acceptance branch: `cua.getState()` returned zero browsers and
`Browsers: Error: The browser access host is unavailable`. Local listeners include
older telemetry fixtures, but no available isolated synthetic business UI was
identified. None was selected, launched or mutated. Every J05–J07 success,
cancellation and failure/recovery walkthrough has explicit proposed steps and
**not-run** status with that blocker. This fulfills the task's explicit unavailable
branch, not an executed walkthrough. No assignment/move was inferred from preview,
HTTP message, optimistic state or a later failed read.

Checks: `.venv/bin/python -B .task/telemetry-inventory/i2/check-source.py`
**passed**, checking 46 source hashes, five receiver guide hashes, six exact
OpenAPI method/generated-builder pairs and 23 named tests located, not executed.
`source-check.json` is the result. Strict
`openspec validate inventory-telemetry-journeys --strict --no-interactive`
**passed** (skip_specs, no deltas). Behavior red/green and preparation are
**not-applicable** for documentation-only work. Unit/component/browser mock,
real API/PostgreSQL, actual Action/Node/exporter-to-receiver protected durable reads,
replay/reopen, deployed/proxy/tunnel and physical installed-device checks are
**not-run**, each independently. Browser access is **blocked**; no automated test
failure has been observed because no runtime suite ran. Final scoped `task verify`
uses all three reviewed changed documentation paths; its invocation record and
actual status are reported in the handoff. The verifier owns tested-document
identity and does not evaluate task acceptance or qualify business behavior.

Scope review: compare all three paths to captured before-images, preserve existing
I1/F-series evidence and every other task checkbox. Existing I1 tracker state is
made historical only to reconcile I2; J08–J16 and I-V are unchanged. No collection,
instrumentation, behavior/contract change, Sentrame modification, commit, deploy,
sync, archive or I3–I5/I-V progression occurred. Application preparation/gates are
not applicable to the owned documentation delta; excluded dirty work is unverified.

One successor recommendation: `observe-tomorrow-results`, a browser-authority
result of a retained shared Tomorrow attempt. Settle helper-versus-presentation
trigger, closed reasons, lifetime, duplicate calls, rejection/unknown classification
and ≤10-attempt document budget before implementation. Actual protected receiver
receipt/replay/reopen would be separate from mapping assertions. No successor
proposal was created. Next inventory session is I3 tasks 3.1–3.2, separately selected.

I2 completion checkpoint: first complete three-path scoped verification **passed**,
record `.task/agent-finish/runs/caf53618bcf84742a4bebb50517526c7.json`:
documentation, selected strict OpenSpec validation and content stability passed;
application/harness gates not-applicable, 48 unrelated changed paths excluded.
Task 2.2 is now checked using its unavailable-walkthrough acceptance branch;
I2 2/2, change 4/11. I3–I5/I-V remain unchecked. This checkbox/checkpoint update
is later documentation content, so a final scoped invocation verifies these bytes
and reports its own `record_path` directly in the handoff. No runtime qualification
is implied. Scope comparison confirms all unrelated tracked diffs, staged state
and the original tracked/untracked status path set are preserved.

## I3 investigation evidence — 2026-10-30

Selection: `inventory-telemetry-journeys`, schema `wfs`, mode `investigate`, tasks
3.1–3.2 only, J08–J09. Read AGENTS.md → AGENT.md, loading rules/Codex adapter,
OpenSpec apply context and `.agents/prompts/telemetry-session.md`. I2's supplied
final record `.task/agent-finish/runs/529ceafac9a1411f959f2aaab069fd27.json`
passed documentation, selected OpenSpec validation and stable selected content;
it did not evaluate task acceptance. I2 remains complete through source traces
and explicit unavailable-walkthrough cells, without UI/runtime qualification.
Starting change progress: 4/11. I4–I5 and reconciliation 6.1/I-V are not selected.

Deliverable: [J08–J09 cards](../../../../docs/telemetry/journey-inventory.md#i3--grocery-checks-and-extras--2026-10-30),
tracker checkpoint and this evidence only. WFS HEAD
`bc38df83753ddb98a9ea38b814da9913b7b875bc`, branch
`review/profile-settings-home-visuals`; pre-existing staged/unstaged/untracked
state and shared-document edits were inspected before editing. Private
before-images/status/diff and source/preservation manifests are under
`.task/telemetry-inventory/i3/`. `source.json` SHA-256:
`a98ef765496f2774a191ad7b518de850879f6793fe97ed78c91ca4ace9010266`.
It records 51 WFS source/spec/test/config hashes, local receiver HEAD/dirty state
and five initial guide hashes. Receiver HEAD
`c4d0204b4891da15ae4b020d37682e48052e1879` has existing guide/query/UI and
untracked loop-view work; no receiver/config/storage changed. Exact package
versions and unqualified bridge/export distinctions are in the inventory.

Task 3.1 acceptance: both cards contain question/entry, ordered intent/optimistic/
save/publication/presentation boundaries, cancellation/retry/recovery, exact source/
generated/contract/test owners, baseline-versus-custom gaps, proposed owner/name/
carrier/fixed fields/times, budgets/loss, receiver mapping and qualification gaps.
The actual recipe check wrapper uses handwritten demoFetch rather than its existing
generated counterpart; extras use generated operations. Persisted recipe map and
occurrence check/version/tombstone state remain distinct. The single-instance
coordinator orders map mutations and publication attempts, not click order or
independent snapshots. Extra creates replay original binding; concurrent inserts
reread it; expected-version mutations have one winner; future projections mutate
current occurrences; history is read-only and rollover preserves snapshots.

Findings retained without repair:

- Recipe `SaveChangesAsync` precedes awaited publication, which can throw after
  persistence. UI rollback on rejection is not evidence no check was saved.
- Recipe checkbox writes have no pending/version/initiating-absolute-week guard.
  Same-row overlaps, remote updates and navigation can outlive captured callbacks.
  These are source risks, not runtime-reproduced defects.
- Older independently obtained same-week recipe snapshots can replace newer check
  events. `weekStore.sync()` refreshes lines/extras but does not replace the recipe
  map; resolved sync alone also does not prove a successful recovery read.
- Extras suppress pending snapshot replacement and reject older versions in
  reconciliation/upsert, but projected-checked mutation success removes directly
  without comparing versions. These guards do not establish collection-wide
  revision ordering or every response path's freshness. Their publication failures
  are caught after save, unlike recipe-map publication errors.
- Aisle completion includes optimistic recipe/extras state and duplicate recipe
  row counts. No persisted shopping-trip completion command/entity exists in the
  inspected contract/controller/service/model chain. Purchase is unobserved.

Task 3.2 acceptance branch: `cua.getState()` returned zero browser surfaces and
`Browsers: Error: The browser access host is unavailable`. Listener inspection
found older telemetry fixtures, but no available isolated synthetic grocery
business UI/database was identified. No shared fixture was attached or mutated,
no product process launched and no failure induced. The inventory supplies
explicit phone/wide presentation, check/uncheck, extra add/edit/category/delete,
concurrent/failure/recovery and future/history proposed steps with **not-run**
statuses and reasons, as allowed by tasks 3.1–3.2. This is investigation completion
through unavailable evidence, not executed UI acceptance or runtime qualification.

The unapproved all-current-items-checked predicate requires a visible current-week
view, a nonempty accepted list/map/extras, exact true for every represented row,
settled known writes and successful reconciliation. It considers pending additions/
deletions, duplicate rows, unchecking, empty lists, list replacement, remote causes,
already-complete entry, navigation/rollover and bounded document-local dedup.
Entry-versus-transition, rearming, provenance and the actual settlement owner remain
unresolved; no existing `completedAisles`/sync success can satisfy it on its own.
Its emitter and any saved shopping-completion semantics remain unapproved.

Checks: `.venv/bin/python -B .task/telemetry-inventory/i3/check-source.py`
**passed**: 51 WFS file hashes, five local receiver guide hashes, seven exact
OpenAPI method/generated-builder pairs and 37 named tests located, **not executed**.
Result: `.task/telemetry-inventory/i3/source-check.json`. A subsequent stability
recheck **failed** on concurrent receiver USER-GUIDE edits. Mapping/optional-goal/
trust sections and the full Git diff against receiver HEAD were reviewed; loop-view
wording changes do not alter I3 semantics or qualify runtime views. The initial
receiver bytes were not captured, so no exact before-image comparison is claimed.
`source-drift.json` retains initial/reviewed hashes; the source check now verifies
that one reviewed guide hash and the unchanged remaining inputs. Documentation acceptance
uses source/link/meaning consistency and scoped verification. Behavior red/green
and preparation are **not-applicable**. Unit/component/browser mock, real
API/PostgreSQL, browser/Action/Node exporter-to-receiver protected durable reads,
replay/reopen, deployed/proxy/tunnel and physical installed-phone checks are each
**not-run**. Browser access is **blocked**. No runtime test failure is reported
because those suites did not run. Scoped `task verify` uses the complete reviewed
three-document path set; the invocation record owns tested-byte identity and its
actual `record_path` is reported in the final handoff. It does not evaluate task
acceptance or qualify excluded application work.

Scope review compares selected files to their before-images and preserves prior
I1/I2/F-series evidence, existing edits and all unselected task checkboxes. Only
I3 cards, current checkpoint/row and task evidence/progress are owned. No product,
API/client/mock/test, collection/credential, Sentrame, commit, deployment, sync,
archive or I4–I5/I-V work is performed. All other existing tracked/untracked work
remains outside verification scope.

Recommend one bounded successor, `observe-grocery-extra-add-results`: browser
identity-matched Add result evidence only, with confirmed/unconfirmed semantics,
retry/retained-attempt lifetime and ≤10-attempt document budget to settle before
proposal authoring. The inventory records candidate files, test-first/privacy/
volume and actual receiver acceptance, excluding saved-state/all-checked emitters
and product recovery changes. No proposal is created. Next inventory session:
I4 tasks 4.1–4.2, only if separately selected; stop here.

I3 completion checkpoint: scoped record
`.task/agent-finish/runs/3b34040923cf48ff8ff7f9d3fe3716ee.json` **passed**
documentation, selected strict OpenSpec validation and content stability; 48 other
changed paths were excluded and application/harness gates were not-applicable.
After reviewing the receiver-guide drift, source consistency passed again against
unchanged WFS inputs plus the explicitly reviewed guide hash. Task 3.2 completes
through the permitted unavailable-walkthrough branch. I3 is **2/2**, change **6/11**;
I4–I5/I-V remain unchecked. This subsequent evidence/checkbox update receives its
own final scoped verification; the final handoff reports that invocation's exact
`record_path`. No runtime qualification or automatic task acceptance is inferred.

## I4 investigation evidence — 2026-10-30

Selection: **I4 tasks 4.1–4.2 only**, mode `investigate`, J01 and J10–J12.
Only existing inventory, tracker and this task evidence are edited. OpenSpec
schema `wfs` was ready at **6/11**. Task 4.1 completed source acceptance and its
checkbox was re-read through apply instructions at **7/11** before task 4.2.
The [I4 cards](../../../../docs/telemetry/journey-inventory.md#i4--entry-finding-recipes-goto-and-cooking--2026-10-30)
record exact canonical/source/wrapper/generated/contract/controller/service/
persistence/fallible-follow-up boundaries, candidate owners, privacy/volume limits,
missing owners, unresolved semantics and the permitted unavailable walkthrough cells.

I3 reconciliation came first: final scoped record
`.task/agent-finish/runs/f0668cc9326f4e769c2a5368ae715add.json` reports passed
documentation, selected strict OpenSpec and content stability on the complete
three-document set. It did not evaluate task acceptance. I3 tasks 3.1–3.2 remain
complete through source investigation and explicit unavailable cells, with UI/runtime
not-run. Its unapproved all-checked semantics and receiver-guide drift reconciliation
(including absent initial receiver bytes) remain unchanged. No historical telemetry
qualification is reused as I4 journey evidence.

Identity: WFS HEAD `bc38df83753ddb98a9ea38b814da9913b7b875bc`, branch
`review/profile-settings-home-visuals`. Private before-images/status and staged/
unstaged patches are under `.task/telemetry-inventory/i4/`. `source.json` SHA-256
`9a4f942faa94f2911cc4e08f5094b80d787a781b0edf9899301302c1427aec39`
records 87 WFS inputs, five local receiver guides and three receiver source/config
inputs. Receiver HEAD remains `c4d0204b4891da15ae4b020d37682e48052e1879`, with
existing USER-GUIDE/query/UI and untracked loop-view work; no Sentrame edits/storage
access occurred. Exact package/version and five guide hashes are recorded, not a
running receiver identity. Current USER-GUIDE was inspected without rewriting I3's
prior drift evidence. Source snapshot is not a build/deployed/device identity.

Acceptance findings:

- Access action/cookie acknowledgment, usable verified member context and destination
  presentation have different owners. Invite/onboarding's second async selection is
  not awaited; failed list loading sets hasLoaded; GET me errors collapse to null.
  The existing readiness gate alone cannot prove verified membership. Member creation
  saves before voting refresh; failure/lost response may hide persisted creation.
  The cookie writer does not validate its token; acceptance belongs to validating
  actions/gates. GET me missing-member 404 is absent from its OpenAPI responses.
- Search's actual wrapper is raw demoFetch POST even though a generated builder exists.
  Accepted response/current-generation rendering, successful Browse page/detail load,
  inspecting a recipe and actual guarded assignment remain separate. Initial failure
  is not empty; continuation failure retains cards; obsolete suppression isn't network
  cancellation. Existing search technical logging is not qualified journey emission.
- GOTO-list whole-setting save differs from active random ready suggestion and Tonight's
  background optimistic assignment. The seed's FamilyGOTOSettings component/test no
  longer exists; current stars and canonical retirement own membership. Existing
  legacy E2E comments/labels don't prove component ownership or ready-service pending
  results. Concurrent whole-list replacement/retry semantics remain unresolved.
- Cooking finish uses todayStore directly, not a planner cooking wrapper. Viewed-recipe
  rotation save differs from matching planned-meal cooked status; post-save publication
  can fail. A void resolved caller/celebration doesn't validate a matched-meal result.
  Automatic overdue finalization is a separate owner invoked by Dreaming/filter
  materialization; later cooked status/feedback cannot prove a user's completion.
- Original launch, actual source rendering and return differ. Mounted image-modal
  return preserves work; external launch cannot prove reading/return. Memory bookmarks,
  checks and drafts don't guarantee survival after OS discard. Warm unlock/long pauses
  don't rearm document opening. Receiver inactivity may split captures without proving
  failure or authorizing cross-document identity/heartbeats.
- Retained Tonight recovery distinguishes saved, disposed, unknown and refresh-needed;
  failed authoritative read remains unknown, without blind replay or inferred rollback.
  Existing J05/J07 commit owners remain responsible; no duplicate GOTO completion.

Walkthrough availability: `cua.getState()` returned no browsers and browser access
host unavailable (**blocked**). No existing disposable synthetic journey UI/database
was identified; no shared fixture was attached/mutated and no auth/failure experiment
was run. Cards supply explicit **not-run** synthetic success/rejection/retry/recovery,
phone/wide, Original/return, matching/unscheduled finish, long-pause/midnight and
process-discard steps/reasons. Task 4.2 permits this unavailable-evidence branch;
investigation completion is not executed UI acceptance or runtime qualification.

Checks: `.venv/bin/python -B .task/telemetry-inventory/i4/check-source.py`
**passed**: 87 WFS hashes, five receiver-guide hashes, three other receiver hashes,
14 approved method/generated-builder pairs and 23 exact test symbols located,
**not executed**. Output: `.task/telemetry-inventory/i4/source-check.json`.
Local link/heading and before-image preservation check also **passed**: 224 local
links/headings resolve; previous shared-file content outside I4 edits, unrelated
tracked diffs and the staged diff are unchanged. Result:
`.task/telemetry-inventory/i4/docs-check.json`. Strict
`openspec validate inventory-telemetry-journeys --strict --no-interactive` **passed**.
Initial mechanical path assertion failed on Kiota's escaped `{%2Did}` placeholder;
the check now normalizes placeholder names and optional query expansions while
checking literal route/method agreement. This was a checker issue, not a failed
product/runtime test. No code or contract was repaired to satisfy the check.

Unit/component/browser mock suites, real API/PostgreSQL, actual browser/Action/Node
exporter-to-receiver protected durable reads/replay/reopen, trusted .NET export,
deployed container/proxy/tunnel and physical installed-phone/tablet evidence are
independently **not-run**. Behavior TDD/preparation and application test gates are
**not-applicable** to these documentation edits. No runtime failure is asserted
because those suites did not run. Source/link/instruction meaning checks plus
scoped documentation verification cover documentation acceptance only.

Scope review compares changes against the three before-images and preserves I1–I3,
F-series and all unselected task evidence, including shared-file prior edits. Complete
reviewed paths: `docs/telemetry/journey-inventory.md`, `docs/telemetry/README.md`,
`openspec/changes/inventory-telemetry-journeys/tasks.md`. Inventory owns four I4 cards,
chain, test/evidence cells and one recommendation; tracker owns the I4 checkpoint/row;
this task record owns 4.1–4.2 checkboxes and evidence. Both review questions are
satisfied for the authorized investigation: all selected boundaries/gaps are recorded,
and proposed observations preserve owner authority, failure/retry distinctions,
privacy and boundedness without implementing product changes. Qualification remains
explicitly open. Prior unrelated tracked/untracked work is outside this scope.

Recommend only **`observe-search-result-presentation`**: guarded initial/replacement
Search presentation/handled-read result through the existing bounded browser transport.
Settle current-response validity, occurrence/dedup/rearming for automatic invalidations
versus explicit retries and the proposed ≤10-record document budget before authoring;
then test privacy, stale/pending/failure/empty behavior and actual fresh disposable
receiver path. No successor is created; assignment/auth/GOTO/cooking/backend changes
are excluded. Next inventory session is **I5 tasks 5.1–5.2** only if separately selected;
I-V/6.1 remains unchecked. No instrumentation, product/contracts/cookies/auth/preferences/
cooking UI, collection, Sentrame, commit, deployment, sync or archive changes.

Task 4.2 is complete through source acceptance plus its explicit unavailable branch:
I4 **2/2**, overall **8/11**; I5/6.1 remain unchecked. Final verification uses
`task verify -- docs/telemetry/journey-inventory.md docs/telemetry/README.md openspec/changes/inventory-telemetry-journeys/tasks.md`
after complete task-owned diff review. The actual final invocation owns tested-byte
identity; its exact checks/status/`record_path` are reported in the handoff, without
editing evidence after the final gate or implying automated task acceptance.


## I5 investigation evidence — 2026-10-30

Selected tasks 5.1–5.2, mode investigate, J13–J16. I4 reconciled first from final
record `.task/agent-finish/runs/9025c791e0ac45dcb88f18eb6f400769.json`:
documentation, strict selected OpenSpec and content stability passed; 8/11 at entry.
I3 all-checked semantics/receiver-guide drift and I4's distinct outcome boundaries
remain preserved. I4 recommendation was not created; no historical telemetry pass
is borrowed for these journeys.

[Four I5 cards](../../../../docs/telemetry/journey-inventory.md#i5--capture-repair-sharing-and-library-maintenance--2026-10-30)
cover canonical owners → actual UI/store → wrappers/generated client → OpenAPI →
controller/service/workflow → persistence and fallible follow-ups. WFS HEAD
`bc38df83753ddb98a9ea38b814da9913b7b875bc`, branch
`review/profile-settings-home-visuals`; before-images/patches/status under
`.task/telemetry-inventory/i5/before/`. Source manifest `.task/telemetry-inventory/i5/source.json`
SHA-256 `be2218b8050fffefe5cfa18fda28ae04e55e188d7417de4880c4606f856489e4`.
Read-only receiver HEAD `c4d0204b4891da15ae4b020d37682e48052e1879`, existing dirty
query/UI/guide/untracked loop-view state; five current guide hashes recorded without
rewriting historical drift. No receiver storage/config changes.

Task 5.1 acceptance: all card fields filled; exact boundaries/tests/contracts checked.
`.venv/bin/python -B .task/telemetry-inventory/i5/check-source.py` passed 86 WFS hashes,
five receiver guides, 16 method/builder pairs and 14 named tests located, not executed.
Task checkbox then reread through OpenSpec apply: 9/11. Findings include durable URL
initialization versus caught dispatch without equivalent sentinel elsewhere; conditional
discoverability and readiness saved before metadata/publication; separate report save/
launch/link/review/resolve; attribution-limited polling; void share handoff ambiguity;
ready bundle row saved before asset writes; filesystem-first purge/cleanup; local UI
pending guards versus concurrency, lost-response and restart limits. No product repair.
No identity/content/URL/note/hash export proposed; durable random scope has unresolved
lifetime/restart/privacy conflicts and is not selected as a mechanism.

Task 5.2 acceptance uses the permitted unavailable branch: `cua.getState()` returned
zero browsers and browser access host unavailable (blocked). No verified disposable
synthetic business UI/database identified; no shared service/fixture mutated. Cards
record proposed phone/wide success/reject/cancel/retry/concurrent/lost-response/partial-
save/restart walkthrough steps with concrete not-run reasons. Unit/component/browser
mock, real API/PostgreSQL/filesystem, real provider, browser/Action/Node receiver,
trusted .NET exporter, deployed proxy/tunnel/sharing and physical-phone cells remain
independently not-run. No runtime test failed because no such suite ran. Documentation
source/link/meaning checks replace behavior TDD; preparation/application gates are
not-applicable. Scoped verification covers all three owned docs only, not task acceptance.

One I5 recommendation: `observe-recipe-issue-save-results`, foreground browser response
facts only, ≤10 result records/document proposed; settle stale response/category/dedup
and privacy acceptance before authoring. No successor created. Complete task-owned
diff reviewed against before-images; prior edits and unrelated tracked/untracked/staged
state preserved. Changes limited to existing inventory, tracker and this selected task
evidence. No instrumentation/product/API/auth/cookie/preferences/cooking UI/collection,
Sentrame, commit, deploy, sync or archive changes. I-V 6.1 starts only after I5 scoped
verification; final reconciliation keeps unavailable evidence distinct from runtime.


I5 completion checkpoint: scoped verification record
`.task/agent-finish/runs/b5b93b1160f540d0bbe9c2c78bb3fddb.json` passed documentation,
selected strict OpenSpec and content stability; application/harness gates not-applicable.
5.2 is now complete through its permitted unavailable-walkthrough branch: I5 2/2,
overall 10/11. The checkbox/checkpoint updates are later bytes requiring final scoped
verification with I-V. Runtime qualification remains not-run. Begin selected I-V/6.1
only now; its reconciliation will preserve prior source/checkpoint identities.


## I-V reconciliation evidence — 2026-10-30

Task 6.1 followed I5's scoped pass and confirmed 10/11 through OpenSpec apply.
[Reconciliation](../../../../docs/telemetry/journey-inventory.md#i-v--investigation-reconciliation--2026-10-30)
compares I1–I4 WFS manifests to current sources: 50/46/51/87 inputs, zero drift;
I5 86-input/five-guide check also passed. Original manifest identities are unchanged.
All five final checkpoint records were read and passed documentation/selected strict
OpenSpec/content, with task acceptance explicitly not evaluated by the verifier.
Historical I1 and I3 guide drift/absent before-bytes and prior checker failures remain
unchanged; receiver HEAD/dirty state do not imply running receiver qualification.
Only reconciliation-needed source identities/evidence were refreshed; no journey
implementation or prior runtime suite was reopened.

Every J01–J16 has source/owner chains, exact reference evidence and explicit permitted
unavailable walkthrough cells. No selected required source/owner work is missing.
Remaining semantic decisions, canonical/contract/source mismatches, unapproved I3
all-checked emitter, I4 distinct outcomes and I5 lifetime/restart/privacy/partial-
success boundaries are retained, not silently accepted for instrumentation. Browser
access blocked; UI, mock, API/database/filesystem/provider, browser/Node/.NET exporter/
receiver, deployed and physical-device cells independently not-run. Behavior TDD,
preparation and application gates not-applicable. Historical F-series passes do not
qualify journeys. No current runtime test failure claimed.

One overall successor recommendation is `observe-recipe-issue-save-results`, bounded
foreground response only; settle categories/stale-result guards/occurrence and ≤10
record budget before separately authoring. I4 recommendation remains historical and
uncreated. No successor artifacts or implementation. Selected 5.1/5.2/6.1 now satisfy
the investigation acceptance boundary: this session 3/3, total 11/11; UI/runtime
qualification remains open. Final strict validation, complete before-image diff review
and scoped `task verify -- docs/telemetry/journey-inventory.md docs/telemetry/README.md openspec/changes/inventory-telemetry-journeys/tasks.md`
verify these updated bytes; exact statuses and actual final record_path are reported
in the handoff with no subsequent evidence edit. Scope review answers: authorized
source/reconciliation work is complete, and proposed observations respect trusted
owners, boundedness and privacy while unresolved semantics remain explicit. All
unrelated tracked diffs/staged state/status paths and prior shared-file content are
preserved. Stop after this authorized investigation; no commit/deploy/sync/archive.


Final documentation review: complete task-owned diff compared with all three private
before-images. `.venv/bin/python -B .task/telemetry-inventory/i5/check-docs.py` passed
266 local links/headings, exact preservation of prior shared-document content outside
the selected additions/status/checkboxes, unchanged unrelated tracked patches/staged
bytes and unchanged tracked/untracked status paths. Source consistency passed again;
strict selected change validation passed. The final scoped gate below is the last
repository check; its actual invocation record is reported directly, without editing
these evidence bytes afterward. These checks establish documentation properties only.
