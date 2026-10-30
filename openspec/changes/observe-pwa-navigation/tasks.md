# Tasks

F2-1 implementation and local qualification are recorded below; later groups remain pending. Select one numbered group/session from the [tracker](../../../docs/telemetry/README.md), not this whole change by default. Read [design](design.md) and the [scenarios](specs/anonymous-navigation-observation/spec.md).

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

- [ ] 2.1 Test-first: add phone, wide, resize, data-loading and hidden/resume cases; run `task test:unit -- src/app/'(app)'/planner/page.test.tsx src/lib/telemetry/navigation.test.ts` and `task test:e2e -- telemetry-navigation.spec.ts --project=chromium`, recording red for missing composition evidence.
- [ ] 2.2 Implement only the shared Planner/Grocery presentation declaration and minimal surface lifecycle needed for the companion pane. Rerun 2.1 green; assert static labels only, no week dates/content, no tab-click inference and preserved week/tab behavior.
- [ ] 2.3 Run `task test:e2e -- planner.spec.ts grocery.spec.ts telemetry-navigation.spec.ts --project=chromium`; extend the F2-1 real-action/disposable-receiver fixture for primary/companion transitions, shared opening-to-surface scope/sequence and protected retained reads. Update integration docs/tracker and record actual phone-layout versus physical-device evidence separately. Review scope and run scoped `task verify`; stop before grocery mutations and general overlay migration.

## 3. F2-3 — One shared surface pilot and coverage debt

**Outcome and scenarios:** Open and close Quick Find, Document disappears, New route contains private segments and Bespoke surface is introduced.
**Owners and boundaries:** Shared surface lifecycle under telemetry, QuickFindModal composition and tests; route classification test and known-overlay inventory. Touch common Modal only if needed by a real consumer; no unused wrapper.
**Dependencies and prerequisites:** F2-2 green. Use existing Quick Find interaction tests and preserve focus/gestures/selection/drafts.
**Acceptance boundary:** One production surface emits bounded presentation cycles through real forwarding; new route or bespoke dialog coverage debt is visible without raw exports or claims of exhaustive static discovery.

- [ ] 3.1 Test-first: add open/close/reopen, effect replay, hidden state, unmount/navigation and identity-injection cases. Run `task test:unit -- src/lib/telemetry/surfaces.test.ts src/lib/telemetry/coverage.test.ts src/components/planner/QuickFindModal.test.tsx` and the real-action `telemetry-navigation.spec.ts` tracer, recording intended behavioral red.
- [ ] 3.2 Adopt the shared declaration in Quick Find, implement route inventory/known-overlay exceptions and rerun 3.1 green. Assert one static declaration per adopted surface, runtime `other` for unknown routes and no translated labels/DOM scraping. Document every existing bespoke exception in the coverage fixture with its source owner; do not migrate those features.
- [ ] 3.3 Rerun `task test:e2e -- planner.spec.ts utility-flows.spec.ts telemetry-navigation.spec.ts --project=chromium`; extend the F2-1 real-action/disposable-receiver fixture for Quick Find open/close/reopen and shared whole-stream sequence, verifying protected retained reads without automatic closure goals. Update `docs/sentrame.md`, inventory baseline columns and tracker with limits and owned exceptions. Review scope and run scoped `task verify`; stop before semantic selection/cancellation/outcome events.

## 4. F2-4 — Receiver qualification and integration reconciliation

**Owners and prerequisites:** Completed F2-1 through F2-3; disposable current local Sentrame build, fresh compatible SQLite, private test credentials. Never reset a retained deployment database.

- [ ] 4.1 Exercise actual WFS browser -> action -> Node JSON/no compression -> local Sentrame -> durable protected reads/reopen. Verify opening plus all three navigation names, shared context/sequence across surfaces, source, service/version, static labels and both timestamp projections; record exact WFS/receiver/version/config identities and payload review without secrets. Keep raw durable receipt independent from configured derivation. Activate reviewed mappings before fresh qualification records, recheck the meaningful disposable reaching-Search goal from F2-1 without turning any surface closure into completion, and verify exact replay/restart. Never use App opened as goal, invent a production completion event or assume historical captured definitions changed. Update docs/tracker with the actual direct-receiver status; leave deployed/phone cells not-run unless separately selected.
- [ ] 4.2 Reconcile scenario acceptance, privacy/volume and revised opening-contract acceptance and preserved opening lifecycle/failure behavior. Run applicable `task prepare -- <complete reviewed paths>`, review the full diff, then `task verify -- <complete reviewed paths>` once. Record returned `record_path` and passed/failed/blocked/not-run/not-applicable evidence; check no custom business event, SDK migration or receiver change slipped in.

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
