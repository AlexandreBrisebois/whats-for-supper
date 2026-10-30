# Tasks

F2-1–F2-3 implementation and acceptance are recorded below; F2-4 reconciles the integrated local baseline. Select one numbered group/session from the [tracker](../../../docs/telemetry/README.md), not this whole change by default. Read [design](design.md) and the [scenarios](specs/anonymous-navigation-observation/spec.md).

## 1. F2-1 — Correlated route presentation through real forwarding

**Outcome and scenarios:** Access redirect, Navigate and backtrack, Hidden navigation, New document or concurrent tab, Warm resume, Arbitrary forwarding attempt, Stale enabled browser and Opening and initial navigation order, Opening preservation under failure, Correlated ordinary log receipt and Prospective synthetic derivation.
**Owners and boundaries:** Existing gate/classifier/shared observer, telemetry context/actions/server/tests; new `pwa/e2e/telemetry-navigation.spec.ts`. Real Server Action and Node exporter; mock only external business APIs via `pwa/e2e/mock-api.ts` and the receiver boundary.
**Dependencies and prerequisites:** Approved navigation and opening deltas; existing implemented F1 gates/classifier/Action/exporter; isolated optimized browser fixture; current disposable Sentrame with compatible fresh storage and private synthetic credentials. Reconcile actual `opening.ts`, OpeningObserver, IdentityValidator, actions and server owners before tests. F1's version-follow-up final gate and old direct-receiver task are still unchecked, not accepted prerequisites. Review the recorded Quick Replace mock-SSE/reload failure and current baseline first; any needed unrelated repair requires its own authorized follow-up and unresolved applicable final checks prevent slice acceptance. Do not require completion of the obsolete stage-only receipt contract: this slice owns actual receipt of the revised envelope. Deployed/device qualification and receiver support for goal-free activation are not prerequisites for the synthetic presentation-goal test. No business API, generated-client or schema change.
**Acceptance boundary:** An isolated App opened -> Home -> Search -> Home stream reaches capture and actual disposable Sentrame through real internal seams. Independently verify durable protected receipt/restart and prospective configured derivation with a synthetic reaching-Search goal. App behavior is unaffected by opt-out, malformed input, rate limiting or receiver failure.

- [x] 1.1 Test-first: add context/classification/closed-input tests and a real-action browser tracer; run `task test:unit -- src/lib/telemetry/navigation.test.ts src/lib/telemetry/opening.test.ts src/lib/telemetry/actions.test.ts src/lib/telemetry/telemetry.test.ts src/lib/telemetry/transport.test.ts src/components/telemetry/OpeningObserver.test.tsx` and `task test:e2e -- telemetry-navigation.spec.ts --project=chromium`, observing intended missing-behavior red. Prove opening/initial/subsequent screens share session/tab; IDs differ and sequence increases across the whole stream; initial order is opening then screen; rerenders/remount/effect replay duplicate neither. Include private sentinels, independent two tabs/reload, hidden/current-visible reconciliation, unchanged warm resume, disabled/no scope generation, malformed/unknown input, timestamp boundaries, rejected/redirected/timed-out delivery, rate/concurrency loss and unchanged application behavior. Update old stage-only assertions to the approved delta without weakening privacy checks.
- [x] 1.2 Implement only the route tracer and privacy/admission boundary through the real action/serializer; rerun 1.1 green and review captured payloads for UUID scope, distinct events, sequence, source/observed times and static labels. Verify the revised opening envelope and browser/forwarding clocks, retaining resource service/version and opening gates/one-attempt/failure isolation. Assert no persistent state, business IDs, arbitrary forwarding or retries; server forwarding time is captured before deferred `after()` export, not at export.
- [x] 1.3 Using fresh compatible disposable Sentrame storage only, activate exact browser/log/service mappings before fresh browser emission: App opened unconditional step, Home and Search disjoint `stage.name` steps; choose reaching Search as an explicitly synthetic presentation goal. Exercise actual browser -> Action -> Node JSON/no compression -> receiver; protected reads must show all context/times, opening as first step, App opened -> Home -> Search completion and Home beginning a later journey without another opening. Preserve exact captured wire bytes for fixture replay; verify no duplicate records/path contributions before and after actual receiver restart/reopen. Separately record receipt versus configured-derivation results, WFS/receiver/config/hash identities and private-sentinel omissions. No production goal/receiver modification, existing-storage reset or graph-only receipt inference.
- [x] 1.4 Run `task test:e2e -- telemetry-opening.spec.ts telemetry-navigation.spec.ts auth-flow.spec.ts onboarding.spec.ts --project=chromium`; update `docs/sentrame.md`, the tracker and this group's evidence with actual status, wire identity and missing qualification. Stop before Planner surfaces and business events; run scoped `task verify` for the complete changed paths before handing off this selected slice.

## 2. F2-2 — Planner and Grocery presentation

**Outcome and scenarios:** Phone tab transition and Wide companion pane; visible composition, not click attribution.
**Owners and boundaries:** Shared telemetry observer/context and `app/(app)/planner/page.tsx`, planner composition tests, the same real-action browser fixture and business API mocks.
**Dependencies and prerequisites:** F2-1 green; existing Planner layout and week state must be preserved.
**Acceptance boundary:** Phone tab changes and wide embedded Grocery produce the expected primary/surface evidence without duplicate Grocery instances or claimed shopping outcomes.

- [x] 2.1 Test-first: add phone, wide, resize, data-loading and hidden/resume cases; run `task test:unit -- src/app/'(app)'/planner/page.test.tsx src/lib/telemetry/navigation.test.ts` and `task test:e2e -- telemetry-navigation.spec.ts --project=chromium`, recording red for missing composition evidence.
- [x] 2.2 Implement only the shared Planner/Grocery presentation declaration and minimal surface lifecycle needed for the companion pane. Rerun 2.1 green; assert static labels only, no week dates/content, no tab-click inference and preserved week/tab behavior.
- [x] 2.3 Run `task test:e2e -- planner.spec.ts grocery.spec.ts telemetry-navigation.spec.ts --project=chromium`; extend the F2-1 real-action/disposable-receiver fixture for primary/companion transitions, shared opening-to-surface scope/sequence and protected retained reads. Update integration docs/tracker and record actual phone-layout versus physical-device evidence separately. Review scope and run scoped `task verify`; stop before grocery mutations and general overlay migration.

## 3. F2-3 — One shared surface pilot and coverage debt

**Outcome and scenarios:** Open and close Quick Find, Document disappears, New route contains private segments and Bespoke surface is introduced.
**Owners and boundaries:** Shared surface lifecycle under telemetry, QuickFindModal composition and tests; route classification test and known-overlay inventory. Touch common Modal only if needed by a real consumer; no unused wrapper.
**Dependencies and prerequisites:** F2-2 green. Use existing Quick Find interaction tests and preserve focus/gestures/selection/drafts.
**Acceptance boundary:** One production surface emits bounded presentation cycles through real forwarding; new route or bespoke dialog coverage debt is visible without raw exports or claims of exhaustive static discovery.

- [x] 3.1 Test-first: add open/close/reopen, effect replay, hidden state, unmount/navigation and identity-injection cases. Run `task test:unit -- src/lib/telemetry/surfaces.test.ts src/lib/telemetry/coverage.test.ts src/components/planner/QuickFindModal.test.tsx` and the real-action `telemetry-navigation.spec.ts` tracer, recording intended behavioral red.
- [x] 3.2 Adopt the shared declaration in Quick Find, implement route inventory/known-overlay exceptions and rerun 3.1 green. Assert one static declaration per adopted surface, runtime `other` for unknown routes and no translated labels/DOM scraping. Document every existing bespoke exception in the coverage fixture with its source owner; do not migrate those features.
- [x] 3.3 Rerun `task test:e2e -- planner.spec.ts utility-flows.spec.ts telemetry-navigation.spec.ts --project=chromium`; extend the F2-1 real-action/disposable-receiver fixture for Quick Find open/close/reopen and shared whole-stream sequence, verifying protected retained reads without automatic closure goals. Update `docs/sentrame.md`, inventory baseline columns and tracker with limits and owned exceptions. Review scope and run scoped `task verify`; stop before semantic selection/cancellation/outcome events.

## 4. F2-4 — Receiver qualification and integration reconciliation

**Owners and prerequisites:** Completed F2-1 through F2-3; disposable current local Sentrame build, fresh compatible SQLite, private test credentials. Never reset a retained deployment database.

- [x] 4.1 Exercise actual WFS browser -> action -> Node JSON/no compression -> local Sentrame -> durable protected reads/reopen. Verify opening plus all three navigation names, shared context/sequence across surfaces, source, service/version, static labels and both timestamp projections; record exact WFS/receiver/version/config identities and payload review without secrets. Keep raw durable receipt independent from configured derivation. Activate reviewed mappings before fresh qualification records, recheck the meaningful disposable reaching-Search goal from F2-1 without turning any surface closure into completion, and verify exact replay/restart. Never use App opened as goal, invent a production completion event or assume historical captured definitions changed. Update docs/tracker with the actual direct-receiver status; leave deployed/phone cells not-run unless separately selected.
- [x] 4.2 Reconcile scenario acceptance, privacy/volume and revised opening-contract acceptance and preserved opening lifecycle/failure behavior. Run applicable `task prepare -- <complete reviewed paths>`, review the full diff, then `task verify -- <complete reviewed paths>` once. Record returned `record_path` and passed/failed/blocked/not-run/not-applicable evidence; check no custom business event, SDK migration or receiver change slipped in.

## Planning revision checkpoint — 2026-10-29

This revision changes contracts and tasks only. All implementation/qualification boxes remain unchecked. Current source identities, document hashes and user-reported deployed receipt are recorded in the tracker; they do not establish revised-runtime acceptance. Separate evidence cells are required for (1) unit/component, (2) actual browser/action/Node capture, (3) durable Sentrame receipt/protected reads/restart, (4) prospective configured derivation/exact replay, (5) deployed route and (6) physical installed device. Report passed/failed/blocked/not-run/not-applicable for each. Production open-ended activation remains receiver work, independently of the meaningful disposable presentation-goal fixture.

F2-1 is tasks 1.1–1.4; no Planner/Quick Find implementation is included. The smallest end-to-end result includes correlated opening plus route presentations, not a standalone context utility. F2-2/F2-3 keep the same shared coordinator and own their real-action/receiver acceptance for newly adopted surfaces; F2-4 reconciles that integrated baseline rather than postponing earlier acceptance. No SDK migration, generic OTLP relay, heartbeat, fake closure or business instrumentation belongs in these groups.


## F2-1 execution evidence — 2026-10-29

Authorized scope: tasks 1.1–1.4 only, confirmed by the user. Starting WFS HEAD
`f6100d13c3a23a4c5be0ca863f2a8017d7ae306d` on `review/profile-settings-home-visuals`;
eight existing planning/telemetry-document edits (including the untracked opening
delta) were baselined and preserved. No branch/commit/deployment/receiver-source
change, collection enablement, sync/archive or successor implementation.

- RED: the exact six-file `task test:unit` command in 1.1 first had four intended
  navigation failures and 114 existing passes. After closed-envelope/clock tests and
  approved old-assertion updates, 47 failed / 92 passed established the revised gaps.
  The real-action `task test:e2e -- telemetry-navigation.spec.ts --project=chromium`
  then reached rendered Home but captured one record instead of opening plus screen.
  Earlier fixture type/body-draining failures are not behavioral red evidence.
- GREEN: the same focused unit command passes 152 tests. The tracer passes through
  the actual observer/Action/Node JSON serializer; opening/Home/Search/Home shares
  session/tab, IDs differ and sequence is 1–4. Reload and a second concurrent tab
  have independent context. Unit/component checks cover hidden/current-visible
  reconciliation, unchanged resume, gates, remount/effect replay, no storage,
  disabled/no scope, local sequence gaps, exact clock limits, strict unknown input,
  failed delivery and independent process rate/concurrency capacity.
- Required acceptance: `WFS_NAV_SENTRAME_BINARY=/tmp/wfs-navigation-sentrame task
  test:e2e -- telemetry-opening.spec.ts telemetry-navigation.spec.ts auth-flow.spec.ts
  onboarding.spec.ts --project=chromium` passed 11/11. Business APIs are mocked at
  their boundary; observer, Action, deferred Node export and actual receiver are real.
  The unchanged Quick Replace relative-next-week/reload case passed its focused
  baseline run; historical failure cause remains unestablished and no repair was made.
- Actual Sentrame: clean HEAD `a506dacbdc0f776238f2b3ebc769e42d2b4b9378`, fresh
  disposable registry/storage, generated private credentials and owner/CSRF access.
  Unauthenticated reads fail. Protected reads retain all eight records and exact
  timestamps/context/service/version; prospective exact mappings plus a synthetic
  Search goal derive App opened → Home → Search, followed by Home in a later journey.
  Exact captured-body replay leaves evidence/journey contributions unchanged both
  before and after an actual receiver process restart, storage reopen and new login.
  Source tree, production receiver/configuration and existing storage are untouched.
- Wire/source/configuration identities and privacy review are preserved in
  `.task/telemetry-navigation/f2-1/identity.json`, `navigation-wire.json` and
  `receiver-qualification.json`; hashes and independent evidence cells are recorded
  in [the integration documentation](../../../docs/sentrame.md#f2-1-local-qualification--2026-10-29).
- Scope review: implementation delivers the revised opening plus route stream using
  one existing document owner; closed Action input and server-only configuration
  preserve browser authority and failure isolation. No persistent scope, arbitrary
  OTLP relay, retries, business data, Planner/surface work or package migration.
  Task preparation formats selected PWA files only. Initial repository gate failed content stability; the stable-tree retry passed as recorded below.
  Deployed-route and physical-device cells: not-run. API contract/schema/client changes:
  not-applicable. Final gate failure/blocker, if any, prevents 1.4 acceptance.


### F2-1 initial final gate checkpoint (historical)

`task verify -- <all 22 reviewed paths>` returned failed record
`.task/agent-finish/runs/6459096adeb84a55b175acbf9c836e6c.json`, identity
`6ecac67e4fe23d5cb726441cf91e013f67e612d15c752c4ead0eceed0accc050`.
Passed: documentation, 38 OpenSpec items, lint, selected formatting, types,
1,426 unit tests, Chromium **600 passed / 47 skipped / zero failed**, API
**1,259 passed / 156 skipped / zero failed**. Failed: content stability after
concurrent edits to `openspec/changes/observe-unexpected-pwa-errors/proposal.md`
and `design.md`. Not-run: `review:contracts` (the runner stopped after mutation).
Not-applicable: harness tests, live endpoint parity and database behavior for
this selected application slice. No final automated success is claimed.

Telemetry implementation hashes still match `.task/telemetry-navigation/f2-1/identity.json`.
The other writer's edits are preserved. At that checkpoint, task 1.4 remained unchecked (F2-1 3/4;
change 3/12). The next action was a fresh scoped final verification after concurrent
writing stopped; no unrelated repair or successor implementation is authorized.
A later scoped documentation check qualifies this evidence update only.


### F2-1 completion — stable-tree retry

The user confirmed the other writer was paused and authorized the verification
retry. All retry inputs stayed unchanged throughout preparation and verification;
qualified telemetry implementation hashes still match the receiver evidence.
The complete 23-path scope includes the earlier reviewed 22 paths plus this task's
handoff. The five unrelated dirty files were excluded and preserved.

Passing application record: `.task/agent-finish/runs/48fdfcc05c60422bbe2247ac1d0e92a9.json`.
Tested identity: `ba49610b4361d7778f01dd261f4f42f13780098df545992271eb070297988061`.
Passed: documentation, all 38 OpenSpec items, lint, formatting, types, **1,426 unit
tests**, Chromium **600 passed / 47 skipped / zero failed**, API **1,259 passed /
156 skipped / zero failed**, static contract/client checks, and content stability.
Failed/blocked/not-run applicable automated checks: none. Harness tests, live API
endpoint parity and real database behavior: not-applicable to this selected slice;
static contract checks do not qualify those runtime boundaries.

Task 1.4 is complete: F2-1 **4/4**, change **4/12**. The required 11-case browser
acceptance and independently qualified disposable Sentrame receipt/derivation/
replay/restart remain supported by their recorded unchanged implementation hashes.
Deployed routes and physical installed-device checks remain not-run. No Planner,
Quick Find, business instrumentation, receiver source/configuration deployment,
SDK migration, enablement, commit or archival was added. Later completion-document
bytes receive a separate documentation-only verification; that record does not
replace the application record above. F2-2 and later groups remain pending.


## F2-2 execution evidence — 2026-10-29

Authorized scope: tasks 2.1–2.3 only. Starting WFS HEAD
`3eb308a1ea58fedbec16eca75e5229b88b5afd2d`; worktree clean at entry.
F2-1 prerequisite: passing application record
`.task/agent-finish/runs/48fdfcc05c60422bbe2247ac1d0e92a9.json`.

- RED: `task test:unit -- 'src/app/(app)/planner/page.test.tsx'
  src/lib/telemetry/navigation.test.ts` produced 4 failures / 81 passes. Intended
  missing-behavior failures: Grocery still observed as `planner`, undeclared
  composition prematurely emitted Planner, and the adopted surface envelope was
  rejected. The missing registration function failure alone is not behavioral red.
  `task test:e2e -- telemetry-navigation.spec.ts --project=chromium` rendered the
  phone Grocery checklist but retained 5 records rather than 6 after the tab change.
- GREEN: the focused two-file command passed 85 tests. Expanded regression run
  adding opening, observer, action, serializer and transport suites passed 233/233
  across seven files. Coverage includes initial/retained loading, no click-only
  inference, one Grocery instance, phone/wide resize with preserved tab/week,
  initial opening/screen/companion ordering, effect replay, hidden intermediate
  compositions, changed versus unchanged resume, strict static identity admission
  and the shared 60 screen/surface budget. No week/content enters the envelope.
- Fixture correction: the first green browser attempt was interrupted after trying
  to click the obscured Planner tab underneath full-screen phone Grocery. The
  fixture now uses the existing accessible Close grocery list control. This was
  a fixture interaction error, not a production behavior failure or passed check.
- Required acceptance: `WFS_NAV_SENTRAME_BINARY=/tmp/wfs-navigation-sentrame task
  test:e2e -- planner.spec.ts grocery.spec.ts telemetry-navigation.spec.ts
  --project=chromium` passed **134/134**. Real browser → Action → Node JSON/no
  compression → actual disposable Sentrame; business API boundary only is mocked.
  Phone viewport 390×844, wide 1280×900 and simulated hidden/resume pass. These
  do not qualify a physical installed device or OS unlock/background behavior.
- Protected raw receipt independently verifies all **16** records, browser/log
  authority, service/version, classification, UUID context and both exact clocks.
  The first document's opening/screens/companion share sequence **1–12**, one
  session/tab and 12 distinct events. Reload and concurrent tab remain independent.
  Unauthenticated snapshot fails. Prospective disjoint primary mappings plus
  companion supporting activities preserve the synthetic reaching-Search goal;
  closure is not a goal. The path is App opened → Home → Search (completed), then
  Home → Planner → Grocery → Planner → Grocery → Planner → Home in a later journey.
  Exact wire replay preserves raw evidence and journey contributions before and
  after actual receiver process restart/storage reopen/new owner login.
- Receiver source: clean `a506dacbdc0f776238f2b3ebc769e42d2b4b9378`, binary SHA-256
  `5f6372edc6dde428a8d6b41fa15e2386e34cb04f480f1d53992c21e62eaa7d39`;
  fresh disposable schema 3 / `structural-v2` / `journey-native-v3` storage.
  `.task/telemetry-navigation/f2-2/` retains exact wire, protected-read qualification,
  command logs and `identity.json` (source/binary/config/wire hashes). Wire file SHA-256
  `3c28840d0d06a442f02df07c9632fc0f2d4a4fabef397f484ddacefda5d27bce`;
  definition SHA-256 `e9d4ca74f0fe51aad5b32093548e9a556a2a4740cafa06e0724c5903c6004268`.
  Payload review: only static labels and the approved five attributes; private
  query sentinel, credentials, week/date/content and business identifiers absent.
- Scope review: eight PWA paths own composition, observer/coordinator admission and
  their unit/real-action/receiver tests; three documentation paths own actual
  integration/tracker/task evidence. No API/client/schema, business rule, Grocery
  mutation, Quick Find/common overlay, receiver source or production change.
  No unrelated worktree edits existed at entry or appeared during the review.
- Stable-tree coordination: user confirmed other writers are paused. Scoped
  preparation passed for all **11** reviewed paths (eight PWA and three docs),
  with no excluded paths. Final application verification passed all applicable
  checks: documentation, OpenSpec (38 items), lint, formatting, types, unit
  (**1,431**), impact E2E (**600 passed / 47 skipped**), API (**1,259 passed /
  156 skipped**) and static contract/client review. Content stability passed.
  Record: `.task/agent-finish/runs/c5e3c887907e482d808caa95213cf7de.json`, identity
  `36a4963e169fa07e37a740b50d8bcceae47763d599d85fb3755058733915e221`.
  Final verification reran the real-action/disposable-receiver tracer successfully
  on prepared source. `.task/telemetry-navigation/f2-2/final/` preserves that
  run's wire/receiver artifacts and prepared source hashes. No production logic
  changed after verification; this checkbox/result update is later documentation
  content, checked separately without attaching the old digest to new documents.
  Physical installed-device and
  deployed-route qualification: **not-run**. Database/live API behavior: **not-applicable**
  to this UI observation slice. No commit/deploy, enablement, sync or archive.

F2-2 tasks **2.1–2.3 complete**; change progress **7/12**. Stop here.
F2-3, F2-4 and all successor business instrumentation remain unselected/pending.


## F2-3 execution evidence — 2026-10-29

Authorized tasks 3.1–3.3 only; clean worktree at entry. F2-2 prerequisite confirmed by passing 134-case acceptance log, final record `c5e3c887907e482d808caa95213cf7de` and all eight matching prepared source hashes.

- RED: specified three-file unit command: **7 failed / 16 passed** after a no-op helper scaffold made lifecycle tests executable. Quick Find rendered without a surface event; cycle/replay/hidden/navigation and closed-envelope assertions failed for missing behavior. Initial missing-module compilation is not behavioral red. Real-action tracer: Quick Find visibly rendered, **11 records instead of 12**. An earlier wrong locator targeted a recipe-change button in an empty plan; interrupted and corrected to Plan supper, not counted as red. Logs: `.task/telemetry-navigation/f2-3/`.

- GREEN: specified unit command **23/23**; seven existing telemetry/Planner regression files **233/233**. Real browser → Action → Node JSON/no compression → actual disposable Sentrame tracer passed. Initial document retains sequence **1–16**, including two Quick Find open/close cycles; **20** total records including independent reload/tab. Protected raw reads verify static labels, shared scope/tab, distinct events and both clocks independently from configured derivation. Supporting Quick Find mappings are not goals; synthetic Search remains the only goal. Exact captured-wire replay and actual receiver restart/reopen preserve evidence and journey contributions. Named exception inventory includes native DemoDialog as well as bespoke fixed/dialog/sheet candidates; no migration.

- Required acceptance: `WFS_NAV_SENTRAME_BINARY=/tmp/wfs-navigation-sentrame task test:e2e -- planner.spec.ts utility-flows.spec.ts telemetry-navigation.spec.ts --project=chromium` **117/117 passed**. Browser phone/wide and simulated visibility are qualified; physical installed-device/OS behavior and deployed routes remain **not-run**. API contract/client/schema/live database behavior: **not-applicable** to this observation slice. Source/receiver/config/wire identities and artifacts are retained in `.task/telemetry-navigation/f2-3/identity.json`, `navigation-wire.json` and `receiver-qualification.json`. Scoped preparation/final verification pending.

- Scope review: 14 reviewed paths (10 PWA, four documentation); no unrelated edits at entry or review. Quick Find changes only an import and one declaration; shared lifecycle/closed admission, tests and owned coverage debt complete the scope. No business API/schema/client/package/receiver-source/production changes. Scoped preparation passed and only formatted selected PWA paths. No unexpected writes. Final verification is running on the prepared stable tree; task 3.3 remains pending until it passes.

- Stable-tree final verification: **passed** all applicable checks for 14 paths,
  with no exclusions or input mutation. Record
  `.task/agent-finish/runs/45a225a3dc2d4070add55b2381549fd0.json`, identity
  `1de50f1c27376224422bafe56f7b8c3bb1d05ab45244828d9ec94dec337caab4`.
  Passed documentation, OpenSpec (38 items), lint, formatting, types, **1,440 unit
  tests**, Chromium **600 passed / 47 skipped / zero failed**, API **1,259 passed /
  156 skipped / zero failed**, static contract/client review and content stability.
  Failed/blocked/not-run applicable automated checks: none. Harness tests, live
  endpoint parity and real database behavior: not-applicable to this slice.
  Prepared-source real-action/Sentrame tracer passed again; its exact wire,
  receiver qualification and matching source hashes are in
  `.task/telemetry-navigation/f2-3/final/`. Only later documentation/checklist bytes
  change after this application gate; they receive separate documentation verification.

F2-3 tasks **3.1–3.3 complete**; change **10/12**. Stop before F2-4 and all
semantic selection/cancellation/outcome events. Deployed/physical-device cells
remain not-run. No commit/deploy, production collection enablement, receiver
source change, sync or archive. No unrelated worktree edits existed or were altered.


## F2-4 execution evidence — 2026-10-29

Authorized tasks 4.1–4.2 only; clean starting WFS
`632cc437d44f0b29027081f336ba6d71e9d60daa`. No unrelated edits existed at entry.
Before qualification, directly inspected F2-1/F2-2/F2-3 passing acceptance and
final application records `48fdfcc05c60422bbe2247ac1d0e92a9`,
`c5e3c887907e482d808caa95213cf7de`, `45a225a3dc2d4070add55b2381549fd0`.
All required checks/content passed; all ten F2-3 prepared-source hashes match.
Audit: `.task/telemetry-navigation/f2-4/prerequisite-audit.json`.

- Task 4.1 **passed**: actual browser → real Server Action → Node JSON/no compression
  → fresh disposable local Sentrame. Protected raw receipt retains 20 records,
  all four names, first-document sequence 1–16/shared session/tab/distinct events,
  browser authority, service/version/static labels and exact source/forwarding times.
  Configured derivation is asserted independently: nine reviewed mappings active
  before fresh records; only synthetic reaching Search completes. Opening/closures
  are not goals; later journey remains incomplete. Exact captured-byte replay adds
  neither evidence nor journey contributions before/after process restart/reopen.
- Acceptance **passed**: 256 tests in ten focused unit/component/HTTP files;
  `WFS_NAV_SENTRAME_BINARY=/tmp/wfs-navigation-sentrame BASE_URL=http://127.0.0.1:1
  PLAYWRIGHT_HTML_OPEN=never task test:e2e -- telemetry-navigation.spec.ts
  telemetry-opening.spec.ts --project=chromium` **2/2**. Opening gates/one attempt,
  hidden/resume/effect replay, invalid/disabled configuration, closed inputs,
  rejection/redirect/timeout, 60/document and 120/producer/process minute limits,
  four active exports, independent server capacity and no retry remain accepted.
- Privacy review **passed**: closed five-attribute payload/fixed envelope, no private
  sentinels/content/business IDs/credentials; complete inspected client responses
  omit endpoint/producer credentials. No storage correlation or SDK/receiver changes.
  Red/green cycle **not-applicable**: qualification/documentation only.
- Exact WFS/receiver/binary/config/wire/runtime identities and source hashes:
  `.task/telemetry-navigation/f2-4/identity.json`; protected reads and replay/restart
  result: `receiver-qualification.json`; original bodies: `navigation-wire.json`.
  Clean receiver `a506dacbdc0f776238f2b3ebc769e42d2b4b9378`; fresh disposable
  schema 3 / structural-v2 / journey-native-v3 only, removed after actual reopen.
  No retained deployment storage was changed. See [integration scenario reconciliation
  and hashes](../../../docs/sentrame.md#f2-4-integrated-local-qualification--2026-10-29).
- Task 4.2: scenario/privacy/volume/opening acceptance reconciled; full selected diff
  review, scoped preparation and final documentation verification passed.
  Reviewed all three paths: integration docs own receipt/derivation/scenario/identity
  evidence, tracker owns current status, tasks own acceptance/checklists. Preparation
  selected documentation only and made no writes; staged/new/deleted/excluded paths
  are empty. No production/test logic needs alteration. Application
  tests above are explicit qualification, separate from documentation verification.
- Failed/blocked selected acceptance checks: **none**. Deployed-route, physical
  installed-device/native handoff: **not-run**. API/client/schema/live database,
  SDK migration/receiver source work: **not-applicable**. Goal-free production
  definition activation remains separate receiver work; no production goal invented.
  No business events, commit, deployment, production enablement, sync or archive.


Task 4.2 **passed**: one scoped `task verify` on the stable reviewed three-path tree.
`record_path`: `.task/agent-finish/runs/0254f1b321aa4e2e84fabe1096fefdeb.json`;
tested identity `1994b658ec5089dfa900397dd0033acb024126520c6906a682963bd5413139cd`.
Passed: changed-document links/whitespace, strict selected OpenSpec validation and
content stability. Failed/blocked/not-run applicable checks: **none**. Application,
harness, live endpoint and database checks are **not-applicable** to this documentation
patch; the separately executed 256-test and two-browser-fixture qualification above
owns runtime acceptance. No excluded paths. Qualification source hashes still match;
receiver source remains clean. This result/checklist update is later documentation
content, checked separately; the record digest is not attributed to these later bytes.

F2-4 tasks **4.1–4.2 complete**; change **12/12**, implemented/locally qualified,
not synced or archived. Deployed/physical-device/native-handoff cells remain **not-run**.
Stop after F2-4. No business event, SDK/receiver change, commit, deployment or
collection enablement outside the authorized disposable fixture.
