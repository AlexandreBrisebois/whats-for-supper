# Tasks

Original planning checkpoint: all boxes began unchecked. F3-1 apply evidence below supersedes that checkpoint for tasks 1.1–1.3 only. Select one [tracked session](../../../../docs/telemetry/README.md) under the [telemetry prompt](../../../../.agents/prompts/telemetry-session.md). The [design](design.md) records current source identity, field ownership, integration recipe and receiver gaps; the [delta](specs/anonymous-error-observation/spec.md) owns acceptance. No implementation, receiver edit, deployment, enablement, sync/archive or commit is authorized by this revision.

## 1. F3-1 — Correlated script/rejection diagnostic and continued presentation

**Outcome and scenarios:** Opening through error to later presentation; Early error without context; Existing context without a presented screen; Screen changes before deferred export; Script and promise failures; Private thrown content; Strict browser admission; Same-episode overlap; Receiver exact replay; Standalone diagnostic without a goal or mapping; Linked supporting diagnostic; Continue after error; Error storm; Pipeline rejection; Disabled server with stale client.

**Owners and boundaries:** Existing `opening.ts` document coordinator, `navigation.ts` closed input patterns, new minimal `errors.ts`/`instrumentation-client.ts`, `actions.ts`, `server.ts` transport/admission and their tests. New `pwa/e2e/telemetry-errors.spec.ts` reuses real optimized-app and `telemetry-receiver.ts` fixture patterns. Business APIs alone remain mocked via `pwa/e2e/mock-api.ts`; no business method/path/schema, generated-client or API persistence change. The telemetry seam is same-origin Next Server Action POST with a closed error input, not a new public OTLP API.

**Actual prerequisites (reconciled 2026-10-29):** F2-1 stable final verification passed in `.task/agent-finish/runs/48fdfcc05c60422bbe2247ac1d0e92a9.json` (`automated_checks_passed=true`, content and applicable checks passed). Its older `6459096adeb84a55b175acbf9c836e6c` mutation-blocked attempt is historical and is not a current prerequisite blocker. Current F1 config/transport and F2 correlated opening/navigation deltas were inspected; this does not promote other groups or archived F1 work to complete. Add the shared snapshot/allocator within this slice without moving first-presentation allocation. Require an owned optimized WFS fixture, explicit reviewed disposable Sentrame binary plus UI assets, fresh separate standalone/path apps and storage, synthetic credentials and protected reads. F2-2/F2-3, stage-only F1 receipt, deployed/device qualification and production goal-free definition activation are not prerequisites.

**Acceptance boundary:** Actual browser error -> real registered handler -> real Action -> deferred Node JSON exporter -> capture and actual disposable Sentrame -> protected diagnostic/evidence reads/reopen. Opening -> Home -> error -> Search has one scope/tab and sequence, and the error is linked supporting evidence without being mapped. Standalone no-definition diagnostic discovery is a separate fixture assertion. Capture-only execution cannot satisfy required durable-read/derivation cells.

- [x] 1.1 Test-first: add snapshot/sequence/closed-envelope/identity/admission tests plus the real-handler browser tracer. Run `task test:unit -- src/lib/telemetry/errors.test.ts src/lib/telemetry/navigation.test.ts src/lib/telemetry/opening.test.ts src/lib/telemetry/actions.test.ts src/lib/telemetry/telemetry.test.ts src/lib/telemetry/transport.test.ts` and `task test:e2e -- telemetry-errors.spec.ts --project=chromium`, recording intended missing-behavior red before production edits. Assert opening/Home/error/Search distinct event IDs, shared scope/tab and increasing sequence; delayed export retains original screen/time/context; enabled early standalone and existing-context/no-stage cases; initial disabled/no buffering; exact input shape, invalid clock/UUID/extra/accessor/partial-context rejection; private sentinels; demonstrable overlap suppression versus distinct dispatch episodes; ten/document lifetime cap including minute rollover and two tabs; 20-error/100-ordinary per producer, concurrency, outage and recursive-failure containment. Preserve existing F2 assertions and resource version/privacy checks.
- [x] 1.2 Implement only initialized native script/rejection hooks and the shared snapshot/allocator plus strict browser error Action/serializer/admission path. Rerun 1.1 green; verify fixed ERROR 17/name/scope/body/services/version, required random event/occurrence identity and optional existing context, original browser and Action-acceptance clocks. Browser forwarding stays deferred with `after()` so stalled receiver export does not serialize normal Server Actions. Prove callbacks cannot initialize session/tab, scope survives ordinary observer remounts, sequence is shared rather than colliding and state remains bounded/in-memory. Verify telemetry failures never re-enter native observation or leak rejected input, tokens or endpoint.
- [x] 1.3 Extend `telemetry-errors.spec.ts` to require an explicit disposable Sentrame binary when running durable acceptance; use the reviewed F2 `WFS_NAV_SENTRAME_BINARY` fixture input or an equivalently explicit error-fixture input recorded with the command. Run `WFS_NAV_SENTRAME_BINARY=<reviewed-disposable-binary> task test:e2e -- telemetry-errors.spec.ts telemetry-opening.spec.ts telemetry-navigation.spec.ts --project=chromium`. In a no-mapping/no-goal receiver app, verify actual standalone browser errors in protected `GET /api/errors` and Errors & exceptions Whole application; unauthenticated reads fail. In a separate fresh app, activate exact opening/Home/Search steps with a synthetic reaching-Search presentation goal before browser emission; leave errors unmapped. Verify error supporting linkage to App opened -> Home -> Search, active status after error, later presentation and completion only at Search. Inspect original reason/stage/occurrence through protected fields, record UI/search limitations without claiming unsupported category search, replay exact captured bytes with no duplicates, restart receiver/reopen storage/re-authenticate and assert identities/categories/context/path survive. Exercise receiver outage/opt-out/private sentinels and unchanged navigation; inspect complete client bundles/Action responses for tokens/endpoint. Record independent capture, durable-read and derivation evidence with build/config/definition/wire hashes. Update `docs/sentrame.md`, tracker and this group's evidence, run scoped `task verify -- <complete reviewed changed paths>` and retain `record_path`. Stop before root/render/server hooks and business events.

## 2. F3-2 — Render/root episodes and honest standalone Next server errors

**Outcome and scenarios:** Route or root render failure; Boundary or provider replacement; Same-episode overlap; Distinct failed retry or request; Server failure without a browser scope; Server error reaches a browser fallback; Server hook export is interrupted or fails; Unknown cross-producer overlap; Pipeline rejection; Continue after error.

**Owners and boundaries:** Existing `app/error.tsx`, new `app/global-error.tsx`, `src/instrumentation.ts`, shared document/error owner, strict Action and existing `server.ts`. Real temporary fixture routes/Server Actions induce failures only in a disposable copied app; never ship diagnostic production routes. Installed Next/React docs and Node runtime hooks must be checked again. External business API mocks remain at their existing boundary; no business contract/client/schema change.

**Dependencies and prerequisites:** F3-1 accepted, current runtime source/docs reconciled. Root replacement must not require LocaleProvider, IdentityValidator or surviving observer. Existing module/document state is retained if present; absent context is standalone. Use existing server-derived enabled handoff; if root initialization requires another Next read, it is boolean-only, bounded and same-origin, never context reconstruction. No anonymous request propagation is approved. Next docs require awaited `onRequestError` async work; do not apply the browser Action's deferred semantics to that hook without supported lifecycle evidence.

**Acceptance boundary:** Real client route/root render failures -> boundaries -> same real browser Action/exporter -> actual disposable receiver, plus real Next Route Handler/Server Action/render-hook failures -> awaited bounded Node exporter -> standalone server diagnostics. Test protected reads/reopen, unchanged reset/fallback/navigation and distinct retry/request occurrences.

- [x] 2.1 Test-first: add `errors.test.ts`, `src/app/error.test.tsx`, `src/app/global-error.test.tsx` and `src/instrumentation.test.ts` cases, run them via `task test:unit -- src/lib/telemetry/errors.test.ts src/app/error.test.tsx src/app/global-error.test.tsx src/instrumentation.test.ts` and `task test:e2e -- telemetry-errors.spec.ts --project=chromium`, recording behavioral red at real missing boundaries/hooks. Cover provider/root replacement with retained versus absent context, effect replay, boundary/native same-episode overlap, reset then failure reusing the same Error, independent server requests reusing an Error/category, framework-marked server ownership, no digest export/hash, original context before fallback presentation and no invented server correlation. Add actual hook lifecycle/outage and safe recursion tests rather than asserting detached delivery.
- [x] 2.2 Integrate minimal browser boundaries and Node-only `onRequestError`, fixed server routeType categories and bounded awaited export per installed docs, with caught telemetry failures and original exception semantics. Rerun 2.1 green; browser boundary forwarding remains deferred while server hook work is awaited within the existing two-second timeout. Verify independent per-request occurrence IDs, effect replay suppression, fresh identities after reset/retry, standalone server name/service/version/severity/reason/time and absence of session/tab/stage/sequence. Do not read cookies/household/URL/time/digest to link server failures; do not add request propagation. Preserve localized accessible html/body/styles/reset/navigation without root providers and without changing recovery APIs.
- [x] 2.3 Run `WFS_NAV_SENTRAME_BINARY=<reviewed-disposable-binary> task test:e2e -- telemetry-errors.spec.ts telemetry-navigation.spec.ts auth-flow.spec.ts --project=chromium`. Exercise actual route/root boundaries and real failing Next render/Route Handler/Server Action in the disposable fixture, through protected errors reads/reopen and related context where supported. Verify server errors discoverable without mappings/goal, separate browser/server credentials, exact replay, framework ownership limits, retry independence, early standalone behavior, retained document scope, original timestamps/stage, later presentation, keyboard fallback/reset and cap/outage/recursion/privacy invariants. Capture Node hook completion/timeout behavior without promising Edge/serverless/abrupt-exit delivery. Update integration docs/tracker/evidence and scoped `task verify` with `record_path`; stop before .NET, request propagation, raw diagnostics and business recovery.

## 3. F3-3 — Integrated receiver interpretation and evidence reconciliation

**Dependencies and prerequisites:** F3-1 and F3-2 accepted against recorded identities, current local Sentrame docs/source/binary/assets and fresh disposable storage/tokens. Earlier slices already own receipt/reopen; this group checks their combination and interpretation, not first delivery. Deployed-route and physical-device work remain separately selected, not implicit prerequisites for local acceptance.

- [x] 3.1 Run the combined real-handler/boundary/Next-hook fixture with the explicit reviewed disposable receiver binary. Independently verify standalone diagnostics without mappings/goal, unmapped supporting browser diagnostics on the intended captured path, absent server linkage, later navigation and no severity-driven completion/exit or mapped-inactivity refresh. In a separate prospective definition fixture deliberately add one exact browser error Kind step with reviewed reason condition and timing unavailable; verify visible step without making error an exit/goal/activity or a discovery prerequisite. Test exact captured-wire replay and changed-projection identity conflict according to actual source/signal/event identity; distinct event IDs sharing exception occurrence are not receipt deduplication. Reopen actual storage and recheck protected identities/categories/context/authority; record source-supported versus executed UI/search/related-journey behavior and receiver usability gaps separately. Update `docs/sentrame.md`, tracker and task evidence with exact source/build/config/definition/wire identities and distinct qualification cells; no receiver source/configuration/storage changes outside the owned disposable fixture.
- [x] 3.2 Reconcile all delta scenarios, no raw diagnostics, ten/document lifetime cap, process partitions, bounded suppression, unchanged reset/navigation and no invented business recovery. Review current prerequisite evidence and the complete task-owned diff; run applicable `task prepare -- <complete reviewed paths>` then one `task verify -- <complete reviewed changed paths>` and retain actual `record_path`. Report passed/failed/blocked/not-run/not-applicable independently for unit/mock, capture, durable-read, journey-derivation, deployed-route and physical-device cells. Missing required local acceptance leaves tasks unchecked; leave unselected deployment/phone, propagation and business event work explicitly unqualified. Do not sync/archive, deploy, enable collection or commit.

## Planning revision checkpoint — 2026-10-29

Only this change's four existing artifacts are revised. F3 application code and runtime tests are not run; red/green is not-applicable to this documentation revision. Current F2 prerequisite status and source/document hashes are in the design; F2's local opening/navigation success does not qualify error collection. The plan replaces the former always-standalone Early error rule with availability-based correlation, moves actual error receipt/linkage into F3-1, retains standalone server authority and explicitly tightens the older ten/minute/document draft to the requested ten attempts/document lifetime. WFS implementation, receiver requirements/usability gaps and deferred business observations remain separate. Documentation validation and scoped repository verification are reported in the session handoff, without checking any implementation box.


## F3-1 apply evidence — 2026-10-29

Scope: tasks 1.1–1.3 only, initially clean worktree at WFS
`bc38df83753ddb98a9ea38b814da9913b7b875bc`. F2-1 stable gate
`.task/agent-finish/runs/48fdfcc05c60422bbe2247ac1d0e92a9.json` passed; its older
mutation-blocked note is superseded. Other groups are not inferred accepted.

- Behavioral red before production: the specified unit command showed 102 ordinary
  exports where the new 100 partition was required (`red-unit.log`); the specified
  Chromium tracer received zero native errors where one was required (`red-e2e.log`).
  Missing new module/export errors do not count as behavioral red. Primitive script
  throws were separately red before correcting the cross-origin filter (`red-primitive.log`).
- Green: the specified six-file unit command plus observer-remount tests passes
  180 tests in seven files (`unit-stable.log`). Real HTTP reject/redirect/two-second
  timeout, slots/budgets and safe scheduler/submission/recursion failures pass.
- Combined acceptance: explicit reviewed binary `/tmp/wfs-navigation-sentrame`,
  copied assets `/Users/alex/Code/sentrame/web/dist`, `WFS_ERROR_DURABLE=1` and
  unused `BASE_URL=http://127.0.0.1:1`; `task test:e2e -- telemetry-errors.spec.ts
  telemetry-opening.spec.ts telemetry-navigation.spec.ts --project=chromium`
  passed 3/3 (`acceptance-qualified.log`). Business APIs alone are mocked.
- Capture, durable protected reads, standalone no-definition discovery, prospective
  synthetic-goal derivation, actual UI and exact replay/restart are independently
  passed. Original script/rejection reason, stage, occurrence and clocks survive.
  Errors remain unmapped, active after the Home error, completed only at Search;
  later rejection does not invent business recovery. Unauthorized reads return 401.
- Complete 62 client assets, 79 script responses and 33 Action responses omit
  credentials/endpoint; wire and Action responses omit thrown-content sentinels.
  Framework query echoes are distinguished using a separate route sentinel.
- [Integration docs](../../../../docs/sentrame.md#f3-1-independent-qualification-cells-and-identities)
  and [tracker](../../../../docs/telemetry/README.md#f3-1-implementation-checkpoint--2026-10-29)
  retain ownership, exact hashes and limitations. Artifacts live in
  `.task/telemetry-errors/f3-1/`. Reviewed receiver source remains clean at
  `a506dacbdc0f776238f2b3ebc769e42d2b4b9378`; binary SHA-256
  `5f6372edc6dde428a8d6b41fa15e2386e34cb04f480f1d53992c21e62eaa7d39`.
- Finalization: task records/docs are finalized before scoped preparation, complete
  diff review and one stable-tree `task verify`. The actual returned `record_path`
  and passed/failed/blocked/not-run/not-applicable check cells are reported in the
  session handoff, without a later edit attaching its success to changed content.
- Deployed/physical-device cells: not-run. New API/database qualification:
  not-applicable. F3-2/F3-3 remain unchecked. No root/render/server hook, business
  event, raw diagnostic, receiver source change, existing storage mutation,
  deployment, real enablement, commit, sync or archive.


## F3-2 apply evidence — 2026-10-30

Scope: tasks 2.1–2.3 only. Before edits, inspected F3-1's actual 180-test unit log,
3/3 combined durable acceptance and stable passed final record
`.task/agent-finish/runs/360c410a63c7439eb185b3a1a3378eda.json`. Every file in its
final manifest matched the initial tree. All pre-existing F3-1 work is retained;
an unrelated `scripts/ci/e2e-suites.cjs` edit is preserved/excluded from selection.

- Read installed Next 16.4.2 error/instrumentation/after docs, current config and
  React/React DOM 19.3.1 with the React effect/boundary references. Root replacement
  supplies html/body/styles; no surviving providers/observer are required. Browser
  Actions remain deferred; the Node hook awaits bounded export, never `after()`.
- Test-first: `red-unit.log` shows the existing route boundary emits zero render
  reports and the strict parser rejects render. `red-e2e-route.log` induces a real
  copied-app render failure and receives zero render reports. Missing new-module
  failures are separate, not behavioral evidence. Additional named red logs cover
  committed fallback presentation, independent native dispatch, original absent
  context, bounded microtask cleanup and multiple same-turn overlaps.
- Required four-file unit command passes 33/33 (`unit-acceptance.log`). Actual HTTP
  release/timeout, server partitions/four slots and recursive exporter failure are
  executed. Replay tokens and same-turn object identity suppress demonstrable
  overlap; reset and independent hook requests have fresh random identities.
- Required combined command uses explicit `/tmp/wfs-navigation-sentrame`, assets
  `/Users/alex/Code/sentrame/web/dist`, `WFS_ERROR_DURABLE=1` and unsets the fixture-only
  `BASE_URL`. Errors/navigation/auth Chromium passes 6/6 (`acceptance-stable.log`).
  Source hashes from the copied optimized app match current production inputs;
  only copied fixture routes/layout wrapper differ intentionally. Real server
  render/Route Handler/Server Action failures execute in that copy only.
- Actual receiver: 22 boundary/server diagnostics survive protected reads, exact
  replay, restart/reopen/re-authentication and replay again without duplicates.
  Standalone server records require no mappings/goal and omit all browser context.
  Separate synthetic render path stays active after the unmapped root error and
  completes only on Search. UI and related-context inspection execute separately.
- Node stalled receiver delays the real Route Handler failure response 2,004 ms;
  rejection causes one attempt, and process error admission stops at 20. The hook
  reads no exception/request data for correlation. Separate token/service authority,
  French/global document fallback, keyboard reset, navigation, document caps,
  opt-out, private sentinel and complete client/Action privacy assertions pass.
- The receiver assigns source from credentials and accepts contradictory service
  labels; isolated disposable swap probes verify this property. WFS uses distinct
  credentials and cannot obtain server authority through its browser Action.
- Earlier fixture failures came from navigating away before complete response
  inspection; response drain assertions were retained and transitions corrected.
  The first combined auth attempt used an unused BASE_URL and failed setup; the
  correctly managed-server run supersedes it without auth changes.
- [Integration evidence](../../../../docs/sentrame.md#f3-2-renderroot-and-next-node-errors--2026-10-30)
  records exact wire/build/config/assets/definition identities and qualification
  cells. Artifacts, hashes, red/green logs and source/prerequisite audit are retained
  in `.task/telemetry-errors/f3-2/`. Finalize task/docs before scoped preparation,
  full scope review and stable-tree `task verify`; its actual returned `record_path`
  and check results belong to the session handoff, without a post-gate content edit.
- Edge/serverless/abrupt-exit, deployed routes and physical devices: not-run and
  unqualified. New business API/database qualification: not-applicable. F3-3 stays
  unchecked. No .NET instrumentation, request propagation, raw diagnostics,
  business recovery, receiver source/existing storage change, deployment, real
  enablement, commit, sync or archive.


F3-2 final-gate reconciliation: stable-content record
`.task/agent-finish/runs/c07dfed9459049cfa62e6087e390d394.json` passed docs/spec,
lint/format/types, 1,482 unit cases, API tests (1,259 passed; 156 existing skips)
and static contract checks, but failed broad impact E2E: 597 passed, 47 skipped,
four Action Pivot/Browse All Stack timeout/swipe cases failed. All four pass on
the unchanged tree in `gate-failure-recheck.log` (4/4). This supports transient
suite failure, not a proven causal diagnosis. No unrelated UI/test was changed.
A new stable scoped final-gate invocation follows; its returned record owns the
final result and does not erase the failed attempt. Required durable acceptance
remains separately passed (6/6); its source identity still matches.


## F3-3 apply evidence — 2026-10-30

Prerequisite acceptance and passing final records were inspected; F3-2 final
source manifest matched the initial tree. The combined 6/6 and extended fresh
prospective 1/1 Chromium runs, 33/33 focused unit results, receipt/reopen, exact
replay, identity conflict and distinct occurrence records are documented with
identities in [integration evidence](../../../../docs/sentrame.md#f3-3-integrated-disposable-qualification--2026-10-30).
The first fresh prospective run failed because the new document was English; its
corrected retry passed. `.task/telemetry-errors/f3-3/` retains artifacts and logs.
F3-3 repository verification is separate and its actual `record_path` belongs
to the invocation. Deployed routes and physical devices remain not-run.
