# Telemetry work tracker

Planning baseline: 2026-10-29. Related [issue #326](https://github.com/AlexandreBrisebois/whats-for-supper/issues/326). Start with shared instrumentation, validate the [journey inventory](journey-inventory.md), then add one journey's missing semantic evidence at a time. Use the [reusable session prompt](../../.agents/prompts/telemetry-session.md).

## Current checkpoint

Navigation revision, 2026-10-29: [observe-pwa-navigation](../../openspec/changes/observe-pwa-navigation/proposal.md)
now explicitly revises the opening contract through an active delta. Opening,
screens and adopted surfaces will share document-local session/tab, event identity
and sequence with browser/forwarding observation clocks. This is planning only;
all F2 tasks and revised runtime qualification remain unchecked. Main opening specs
and archived evidence retain their existing contract until a separately selected
sync. See the [mapping recipe](../sentrame.md#planned-navigation-mapping-recipe) and
[current source record](#navigation-revision-source-record).


The opening change was synced and archived on 2026-10-29 at the user's request,
with five tasks still unchecked. Its [main capability contract](../../openspec/specs/anonymous-pwa-telemetry/spec.md)
is synced; [archived tasks/evidence](../../openspec/changes/archive/2026-10-29-centralize-pwa-opening-observation/tasks.md#archive-disposition-2026-10-29)
preserve unfinished verification and qualification. Archival does not establish acceptance.

- F1-1 tasks 1.1–1.3 accepted at the real browser/action/Node capture boundary; see the [dated task evidence](../../openspec/changes/archive/2026-10-29-centralize-pwa-opening-observation/tasks.md#f1-1-evidence-2026-10-29). Shared opening instrumentation is implemented; collection remains default-off.
- Package changes, deployment, existing-deployment collection enablement and receiver changes: **not performed**.
- F1-2 tasks 2.1–2.3 accepted at unit/component and real-action capture boundaries; [evidence](../../openspec/changes/archive/2026-10-29-centralize-pwa-opening-observation/tasks.md#f1-2-evidence-2026-10-29) records 27 focused tests and 15 Chromium preservation checks.
- F1-3 initial tasks 3.1–3.2 accepted (historical pre-version identity): 92 focused tests, 147 combined Chromium checks and all applicable scoped final checks passed (602 Chromium passed / 47 skipped; 1,384 unit tests). Grocery synchronization is preserved; reconciliation interceptor cleanup has retained regression coverage. Historical touch/Home teardown failures did not reproduce and remain unchanged. See [repair evidence](../../openspec/changes/archive/2026-10-29-centralize-pwa-opening-observation/tasks.md#f1-3-verification-blocker-repair-evidence-2026-10-29).
- App-version follow-up implemented: resource `service.version` uses deployment `WFS_VERSION`. Passed 97 focused tests and 147 combined Chromium checks, including complete capture/privacy inspection. Final gate: 601 Chromium passed / 47 skipped / one unrelated Quick Replace mock-SSE/reload failure; all other applicable checks passed, including 1,389 units and 183 PostgreSQL tests. Task 3.2 remains unchecked; see [version evidence](../../openspec/changes/archive/2026-10-29-centralize-pwa-opening-observation/tasks.md#app-version-follow-up-2026-10-29).
- Unfinished archived work: Quick Replace mock-SSE/reload diagnosis, F1-3 final verification, and F1-4/F1-D/F1-V qualification/reconciliation remain separately selectable. Resume only through an explicitly restored change or a separately authorized follow-up; no successor was created. Deployed routing, native sharing and physical-phone qualification remain separate.
- Foundation successors require evidence reconciliation; F2-1 now owns revised-envelope receipt/derivation rather than assuming the archived stage-only receiver task passed. F1-1 capture acceptance does not qualify remaining F1 behavior or receiver/deployment/device paths.
- Sync/archive was explicitly requested and performed. No branch creation, commit, public aggregate release, deployment or real household data collection was performed.

## Session tracking

Change `tasks.md` checkboxes are the task authority. This table is a navigation/checkpoint index; do not maintain a second independent count of completed tasks. `planned` means artifacts exist, `active` means a session was selected, `partial` means work/evidence remains, and `accepted` means the selected tasks' actual acceptance passed. A change can remain incomplete after one accepted session. Record blockers and qualification cells separately.

| Session | Change and exact task scope | Dependency / small result | State |
| --- | --- | --- | --- |
| F1-1 | [Opening](../../openspec/changes/archive/2026-10-29-centralize-pwa-opening-observation/tasks.md), 1.1–1.3 | None; fresh Search -> real action -> captured opening; no later navigation records | accepted; capture boundary only |
| F1-2 | Same change, 2.1–2.3 | F1-1; gates, hidden/resume, fallback and unknown screen behavior | accepted; component/capture boundary only |
| F1-3 | Same change, 3.1–3.2 | F1-2; closed-input, runtime opt-out and loss containment | archived unfinished; version acceptance passed, final gate failed on Quick Replace |
| F1-4 | Same change, 4.1–4.2 | F1-3; actual local durable receiver reads and prospective screen mapping | archived unchecked; not-run |
| F1-D | Same change, 4.3 | F1-4 plus selected disposable deployed/physical fixture; separate route/device cells | archived unchecked; not-run |
| F1-V | Same change, 5.1 | Reconcile the opening change's required evidence; do not mark unrun phone work complete | archived unchecked; not-run |
| F2-1 | [Navigation](../../openspec/changes/observe-pwa-navigation/tasks.md), 1.1–1.4 | Implemented F1 gates/transport plus baseline-gate reconciliation and disposable receiver; correlated App opened -> Home -> Search -> Home with durable receipt and separate synthetic-goal derivation | F2-1 complete; local capture/receiver qualification and stable final gate passed |
| F2-2 | Same change, 2.1–2.3 | F2-1; correct phone/wide Planner and Grocery presentation | complete; local capture/receiver acceptance and stable scoped final verification passed |
| F2-3 | Same change, 3.1–3.3 | F2-2; Quick Find surface pilot, route/overlay coverage debt | complete; 117-case acceptance, disposable receiver and stable final verification passed |
| F2-4 | Same change, 4.1–4.2 | F2-3; four-name/surface durable receipt and prospective derivation reconciliation | planned |
| F3-1 | [Unexpected errors](../../openspec/changes/observe-unexpected-pwa-errors/tasks.md), 1.1–1.3 | F1 local receipt and F2-1; minimized script/rejection reports and storm caps | planned |
| F3-2 | Same change, 2.1–2.3 | F3-1; render/root/server hooks, source ownership and standalone errors | planned |
| F3-3 | Same change, 3.1–3.2 | F3-2; real protected receiver diagnostics and integration reconciliation | planned |
| I1 | [Inventory](../../openspec/changes/inventory-telemetry-journeys/tasks.md), 1.1–1.2 | No foundation dependency; trace planning/voting J02–J04 | planned |
| I2 | Same change, 2.1–2.2 | Trace assignment/no-cook/movement J05–J07 | planned |
| I3 | Same change, 3.1–3.2 | Trace groceries/extras J08–J09; resolve completion evidence | planned |
| I4 | Same change, 4.1–4.2 | Trace entry, finding recipes, GOTO and cooking J01/J10–J12 | planned |
| I5 | Same change, 5.1–5.2 | Trace capture/repair/sharing/library J13–J16 | planned |
| I-V | Same change, 6.1 | Reconcile selected investigation evidence; no runtime instrumentation | planned |

Every implementation session owns its tests, integration docs, scenario evidence and scoped final verification. The last group reconciles integration; it does not postpone earlier groups' tests. If a group exceeds the available session, stop at its actual checkpoint with unchecked work rather than widening scope or claiming completion.

## First-session starters

The opening example below is historical: that change is archived. Do not apply
its archived task set without explicit restoration or selection of a follow-up.

Implementation, when explicitly selected in a new session:

```text
Read and follow .agents/prompts/telemetry-session.md.
Session: F1-1
Mode: apply
Authorized scope: centralize-pwa-opening-observation tasks 1.1–1.3 only.
Preserve the remaining tasks and all unrelated work. Stop after this slice's
acceptance, documentation and scoped verification; do not enable a deployment.
```

Investigation alternative:

```text
Read and follow .agents/prompts/telemetry-session.md.
Session: I1
Mode: investigate
Authorized scope: inventory-telemetry-journeys tasks 1.1–1.2 only.
Update the existing inventory/tracker with source evidence and any available
isolated synthetic walkthrough. Do not instrument, enable collection or create
successor changes. Stop with one recommended next proposal boundary.
```

## Settled semantics and platform boundaries

- A fresh document/reload begins a new opening and fresh anonymous scope. Warm resume, phone unlock and time cooking do not create another opening. No telemetry storage, cross-document handoff or person/device/household identity is added.
- Welcome is the entry when access redirects there. A route shell is presentation evidence, not loaded data or attention. Unknown routes export only `other` and remain visible as coverage debt in source checks.
- Discovery is a multi-vote process. Persisted votes are intermediate facts; personal feed exhaustion and presented household convergence are different results. Convergence stops the UI but does not itself close the persisted voting round or assign meals. Late submitted votes can still commit.
- Browser forwarding uses browser authority. Server commitment evidence belongs at the owning API/workflow boundary with server authority. The browser's anonymous context is untrusted correlation, never authorization.
- Shared route/surface observations are distinct from click capture. No DOM scraping, translated-label identity, arbitrary URLs, console monkey patching or client workflow engine.
- Runtime collection stays server-controlled, private-env configured and off by default. Old browser state cannot bypass server disablement. PWA collection and any future .NET collection need independently verified server acceptance.
- The foundation keeps the current small JSON transport. No package migration, generic browser OTLP relay or Collector is assumed. Review actual installed providers/versions and measure the selected semantic stream before a separate SDK/exporter change.
- Baseline and semantic logs start unsampled. Trace sampling does not sample named logs or complete business visits. If later necessary, choose whole-scope admission with disclosed missing evidence; never independently sample steps and claim a complete funnel.

## Source and qualification record

| Source | Historical F1 inspected identity / claim (superseded for F2 by the current record below) |
| --- | --- |
| WFS | F1-1 baseline `6ec14b503b3d855db6b20793e9ad1cd486ab1547`, initially clean on `review/profile-settings-home-visuals`; current slice adds opening instrumentation, tests and docs |
| Installed PWA | Next 16.4.2, React/React DOM 19.3.1, transitive OTel API 1.9.1; no configured PWA OTel SDK/exporter |
| Local Sentrame | `/Users/alex/Code/sentrame`, `5a2646fc053af7ddf12bd9d13717adf060ea525f`, now dirty in receiver/app/workspace source and UI at F1-1 review; schema 3, projection `structural-v2`, computation `journey-native-v3` in inspected source |
| Receiver documents | F1-2: four guides changed for multi-app configuration; standard-otel ledger hash unchanged. Current hashes and source reconciliation are in the [F1-2 evidence](../../openspec/changes/archive/2026-10-29-centralize-pwa-opening-observation/tasks.md#f1-2-evidence-2026-10-29); earlier snapshots remain historical. No changed receiver runtime was qualified |
| Receiver sample qualification | Local ledger records separate sample .NET/Next/browser Protobuf cells. These are not WFS JSON, deployed-route or phone passes |

Recheck source/configuration identity before each implementation or qualification. Use current local receiver implementation/docs, not an older GitHub guide or published image. No Sentrame files or storage were modified for this plan.

Sentrame supports named-log discovery, explicit mappings, scoped ordered paths, graph aggregation, rare paths, endings and diagnostics. The current definition requires one operational goal; goal closure and 30-minute mapped inactivity are separate from a WFS document lifetime. Inactive means unknown outcome. A long cooking visit can span receiver captures without becoming another WFS opening. Do not send heartbeats to conceal this distinction.

A future common Discovery result event can support one goal with distinct reasons, but personal exhaustion must not be mislabeled as family success. Other experiences may require receiver work for independent outcome views; inventory the gap before assuming it exists. Sentrame's recovery highlight is diagnostic evidence plus captured completion, not proof of same-operation repair. Graph edges can combine paths nobody followed end to end. Rare/incomplete paths, missing detail, retention and opt-in bias constrain claims. Public aggregate privacy/release remains outside these changes.

## Evidence ledger and handoff

Planning checkpoint, 2026-10-29: three new changes have complete planning artifacts; inventory intentionally skips runtime spec deltas. Strict full OpenSpec validation passed 39 items, and the 17 new owned files passed local link/anchor and whitespace checks. Application and walkthrough task boxes remain unchecked. Final scoped documentation/prompt-harness verification is recorded independently by the repository harness; its result does not qualify collection or any journey.

For each session append a compact dated record here or link its task evidence: selected session/tasks; WFS and receiver identity; changed owners; actual red/green commands; acceptance results; scoped verification `record_path`; next action/blocker. Do not store credentials, content, raw payload diagnostics or persistent business IDs. Update the table only to reflect that evidence.

| Qualification cell | Current status | Required evidence |
| --- | --- | --- |
| Source/document review | inspected | Named files/versions and source-supported limits; no execution claim |
| Unit/component/mock checks | passed F2-3 focused 23 and telemetry/Planner regressions 233; historical F1 evidence below | Exact red/green commands for the selected implementation |
| Browser -> real action -> Node capture receiver | passed for Search/navigation/reload plus F1-2 entry matrix/all 15 combined preservation checks and F1-3 real-action configuration/failure/adversarial matrix | Actual captured minimized payload; mocks only at external boundaries |
| WFS -> actual local Sentrame | passed F2-1/F2-2 and F2-3 Quick Find tracer; disposable receipt, protected reads, replay/restart and separate synthetic-goal derivation | Exact exporter/encoding, durable protected reads and storage reopen |
| Business API / real persistence | not-run | Selected journey's contract/client/mock and actual commit/recovery tests |
| Isolated deployed container/proxy/tunnel | not-run | Exact tested route/config/build and protected receipt |
| Physical installed phone / native sharing | not-run | Device/browser/install identity and fresh/resume/unlock/share evidence |

Use passed, failed, blocked, not-run and not-applicable accurately. Planning validation does not populate runtime cells. Receiver SDK drop fields, projection omissions and read truncation do not measure all WFS exporter loss. Current per-process budgets multiply across deployment processes; they are not a global limiter.

F1-1 checkpoint, 2026-10-29: authorized opening tasks 1.1–1.3 only. Initial WFS `6ec14b503b3d855db6b20793e9ad1cd486ab1547`, clean on `review/profile-settings-home-visuals`; source/config identity and red/green results are in the [task evidence](../../openspec/changes/archive/2026-10-29-centralize-pwa-opening-observation/tasks.md#f1-1-evidence-2026-10-29). Changed owners: shared root/identity observation readiness, opening observer/registry/document claim, closed Server Action, existing Node serializer, focused unit/real-action E2E tests and integration docs. Unit RED: three missing-opening failures, 18 existing passes. Browser RED: presented Search, zero captured records. GREEN: 21 focused tests and one actual browser/action/Node tracer; one fresh Search, none on same-document Search → Home → Search, another on reload. Actual JSON payload and browser HTML/scripts/action responses passed privacy/producer review. Test fixture uses owned temporary application/ports and synthetic credentials; no private env file or existing receiver storage. Scoped verification evidence lives in this session's generated `.task/agent-finish/runs/` record, with exact `record_path` reported in the handoff. No successor, durable receiver/UI/deployment/physical-phone qualification, commit or collection enablement is claimed. Next: F1-2 for the remaining gate/lifecycle/classification cases.

Initial F1-1 repository verification record: `.task/agent-finish/runs/c054dda5a1d5465cb981952c9e9cb2bd.json`. Lint failed on the new effect reset; other completed checks passed, including 1,299 unit tests. Broad E2E was intentionally interrupted after that known failure and is recorded blocked. The readiness reset was corrected; scoped lint and 21 focused tests passed. An action-response body collection race then failed a focused browser rerun; explicit body-completion/read barriers corrected the fixture and the exact browser command passed again. Final verification against the corrected paths has its own generated record, reported in the handoff; the initial failed/interrupted invocation is not promoted to a pass.


F1-2 checkpoint, 2026-10-29: authorized tasks 2.1–2.3 only. Readiness now rejects
changed identity inputs as well as departed paths; shared fallback composition
supplies fixed `error`/`not.found` identity to the central observer. RED/GREEN,
receiver-guide drift and fixture failure diagnosis are in the linked F1-2 evidence.
The exact four-suite Chromium command passed 15/15 against owned optimized production fixtures; 27
focused unit/component tests passed. Thirteen captured minimized records include
Search/reload, access/member redirects, Home, both invitation variants/rejection,
Capture text/share/restart queries and not-found. No per-page calls, storage,
identity generation, inactivity boundary, default change or receiver edit was added.
Existing F1-1 root/observer/action/transport files were preserved byte-for-byte.
Final scoped preparation/verification covers the 11 reviewed task-owned paths;
the generated invocation record supplies actual results and `record_path` in the
session handoff, without implying completion of task 5.1. F1-3 and all actual
Sentrame/deployment/physical-phone qualification remain pending.

F1-2 fixture follow-up: initial scoped record `.task/agent-finish/runs/092421a411cb431a839a6c94a97fe86d.json` passed completed checks (including 1,323 unit tests), with impact E2E blocked after dev-refresh failures and an intentional stop. The fixture now builds/starts an isolated optimized app and drains a clone of real action responses for complete CDP privacy inspection; clone/CDP errors fail. Final exact combined acceptance passed 15/15 in 44.1s. A fresh scoped verification record, reported in the handoff, owns final repository evidence. No actual Sentrame, deployment or physical-device cell was promoted.


F1-3 checkpoint, 2026-10-29: task 3.1 complete, task 3.2 implemented with focused acceptance passed but unchecked pending final gate; exact red/green,
fixture corrections, source/config identity and reviewed capture hash are in the
linked task evidence. Four intended unit reds and a copied pre-change Chromium unsafe-token
red establish the missing behavior. Focused GREEN: 92/92 unit/transport tests and the real
browser/action/Node capture matrix. Disabled/invalid and malformed calls produce
zero intake; failures never rearm a document; concurrent and rate-limited browser
traffic preserves independent server capacity. Login/member selection/navigation
survive receiver rejection, redirect and timeout. Complete action-response privacy
inspection now covers every matrix document. Nine task-owned paths passed scoped
preparation and diff review; the generated final scoped verification record,
reported in the session handoff, owns repository check results and `record_path`.
The F1-2 record `.task/agent-finish/runs/34337969949548f8ad4da88d0a3ba9e9.json`
was reviewed as prerequisite evidence. No collection enablement, receiver edit,
commit, deployment or successor implementation. Actual Sentrame durable reads/reopen,
prospective mapping, deployed routing, native sharing and physical installed-phone
qualification remain not-run.

Final F1-3 application record:
`.task/agent-finish/runs/20b4018168c24f12a04fd5124581c0af.json` (**failed**).
All other applicable checks passed, including 1,384 unit tests and API/static
contract checks; Chromium had 601 passed, 47 skipped and one failed grocery
keyboard-toggle assertion at `pwa/e2e/grocery.spec.ts:560`. The telemetry matrix
passed again. The grocery case failed both alone on current code and on a rebuilt
owned fixture restoring only the two F1-3 production owners to their F1-2
before-images. No grocery edits were made. Completion remains partial; the
subsequent documentation-only verification cannot promote the application gate.
Next is F1-3 completion verification after separately authorized baseline repair,
then separately selected F1-4.

F1-3 completion checkpoint, 2026-10-29: the authorized grocery prerequisite repair
is test synchronization: wait for the optimistic first toggle save to re-enable
the row before Enter. No application or mock behavior changed; all existing
assertions remain. Focused regression 1/1, telemetry unit/transport 92/92 and
combined grocery/real-action telemetry Chromium 20/20 passed. Complete response
privacy inspection and minimized capture review passed. Final application verification
failed: `.task/agent-finish/runs/d86e29d211fa409cbe4074b31f538a61.json`.
Passed: lint/types/format, all 1,384 unit tests, API/static contract checks and content
stability. Chromium: 599 passed / 47 skipped / 3 failed. Grocery and telemetry passed
again. Failures: planner reconciliation expected one refresh read, got two; held
touch move expected one request, got zero; Home/Tomorrow teardown aborted an already
handled route. Causes are unestablished; those files were not modified or retried.
Task 3.2 remains unchecked; see the
[completion evidence](../../openspec/changes/archive/2026-10-29-centralize-pwa-opening-observation/tasks.md#f1-3-completion-evidence-2026-10-29).
No durable Sentrame, deployed-route, native sharing or physical-device cell is promoted.

The passing initial documentation record `.task/agent-finish/runs/f81ad7d9c86342f7b08bf2d55bc7e171.json` belongs to the prior checkpoint; the latest generated documentation record owns this reconciliation only. Further planner/Home repairs require a separately selected scope.


F1-3 verification-blocker follow-up, 2026-10-29: a stale reconciliation test
interceptor was reproduced by post-reload resume and corrected with one shared
registration/removal predicate; all original assertions remain. Both reconciliation
cases pass; the full three-suite trace run passed 127 checks, and telemetry
unit/transport passed 92. The touch and Home teardown failures remain unreproduced
and unchanged, without a telemetry-causation claim. Combined acceptance passed 147/147; scoped final application verification passed
all applicable checks and task 3.2 is complete (8/12 overall). See
[repair evidence](../../openspec/changes/archive/2026-10-29-centralize-pwa-opening-observation/tasks.md#f1-3-verification-blocker-repair-evidence-2026-10-29).


Passing F1-3 application `record_path`: `.task/agent-finish/runs/1058d82e9c204594b9ea64fbaae4efa9.json`
(content `c436843f5daa04226e0b542cbf2d69d03deddbcc424fd050dd81f315a63aeaa5`).
Chromium 602 passed / 47 skipped / zero failures; unit 1,384 passed; API 1,259
passed / 156 skipped. Documentation/spec/lint/format/types/static contracts/content
stability passed; blocked/failed/not-run applicable automated checks: none.
Harness-only/live endpoint/database checks: not-applicable. Later completion-document
bytes have separate documentation verification, reported in the handoff. Historical
failed records remain historical; the two unreproduced causes are not declared fixed.
All receiver/deployment/native-sharing/physical-phone cells remain not-run; tasks
4.1–4.3 and 5.1 are unchecked. No commit, deploy or collection enablement.


App-version follow-up result: `.task/agent-finish/runs/9d77169ae5a245c6ba1e39ee018a9f63.json`
(content `587f2dd80de619668177e465400c7f39f9c740aea178adcce4d14badb194e9e3`).
Resource version export is confirmed in both producer HTTP tests and all 18 real
browser/action/Node captures. Final Chromium had 601 passes / 47 skips / one
unrelated failure at `planner.spec.ts:1900`: post-response mock SSE evaluation
lost its context during reload. It was recorded without repair or retry. All other
applicable final checks passed, including endpoint parity and 183 zero-skip real
PostgreSQL tests. No automated check was blocked or not-run. Task 3.2 remains
unchecked until the applicable gate passes. Durable Sentrame projection, deployed
routing, native sharing and physical-phone cells remain unqualified; tasks 4–5
remain unchecked. Later documentation bytes have their own verification record.

## Navigation revision source record

2026-10-29 planning source inspection supersedes the older tracker identities for
this revision only. WFS HEAD `f6100d13c3a23a4c5be0ca863f2a8017d7ae306d`, clean
before these eight planning/documentation edits; Next 16.4.2, React 19.3.1,
transitive OTel API 1.9.1. Actual owners: `opening.ts` document WeakMap/classifier,
OpeningObserver, IdentityValidator readiness, `actions.ts` closed `{ screen }`
input/deferred `after()` and `server.ts` manual JSON exporter. No correlation
context module is implemented yet. Current opening has only `stage.name` and
export-time `timeUnixNano`; the active delta deliberately changes that behavior.

Local Sentrame HEAD `873bff1ddc83cb7b5c24056b09c8a7de14565572`; schema 3,
projection `structural-v2`, computation `journey-native-v3`. Dirty files at inspection:
`CONTRACT.md`, `docs/USER-GUIDE.md`, `internal/app/query.go`, and Graph/Traces/Workspace,
i18n/style/types/workspace UI/test source. Untracked mapping-preview and standalone-log
tests plus MappingEvidence UI/test source were present. HEAD alone is insufficient
identity; inspected SHA-256 values follow. No receiver file, configuration or storage
was changed. Current source, including dirty query validation, is used rather than
older GitHub/public-image or tracker snapshots.

| Inspected local Sentrame path | SHA-256 |
| --- | --- |
| `docs/DEVELOPER-GUIDE.md` | `781cb9552dde612eafb1478dd30777f2761547046b00c7ef296f8b6da26ee961` |
| `docs/integration/OTEL-CONTRACT.md` | `e2ebc1a72b1d700bcf04ed3c8faec6e0ebf6eca0390e9159398a51dcd5feaaf7` |
| `docs/integration/AGENT-INTEGRATION.md` | `3f9e407be5fdb235061fc1e979ac1e6f7e4513755535aa6dcb413bb70183e346` |
| `docs/USER-GUIDE.md` | `95d706ba997bfd6577eebd35535d7fae5828682f7f24bbf94fb874b13d4aaf93` |
| `docs/verification/standard-otel.md` | `1a2aa4acfb17830fbb08da0021c7c76c95e7b449de8530e07b69d36faf6aa35e` |
| `internal/app/intake.go` | `07049e6329d3e748ef22ec8f35c0281a572b17f797fb6f7ae31cb52e5274385c` |
| `internal/app/journey.go` | `98c29655733199a866f52778f89a877d567d36fc13ff3803a5e9b5705523e714` |
| `internal/app/query.go` | `09f2a157d5aa0cd168ca01b81be7266f58390bc20579ab97fbbb3aa26f6392ad` |
| `internal/app/store.go` | `45356b6742647ca275fd0c92b6c0b62cf46183c32e477f2614049c80a8c47fd4` |

Source checks: intake retains session/tab/event/sequence and source/observed times;
derivation leaves browser records without session/tab unassigned and uses first
mapped occurrence / goal / 30-minute inactivity; current nonempty definition
activation requires a goal. Source inspection is not runtime qualification.

User-reported deployed evidence: openings and checks were retained as browser/logs,
not assigned without session/tab. Empty journey graph was not failed ingestion;
standalone logs without trace IDs do not appear in Traces. This report does not
qualify the planned revised envelope or change historical F1 task status.

| Revised evidence cell | Current status |
| --- | --- |
| Source/artifact reconciliation | Source inspected; documentation verification recorded separately in handoff |
| Unit/component behavioral red/green | Not-run; implementation not authorized in this session |
| Actual browser -> Action -> Node capture | Not-run for revised envelope |
| Actual Sentrame durable protected receipt/restart | Not-run for revised envelope |
| Prospective configured derivation/exact replay | Not-run; disposable reaching-Search presentation goal only |
| Deployed route | Not-run for revised envelope |
| Physical installed device/native handoff | Not-run |

**Separate Sentrame-agent requirement:** permit explicit open-ended navigation
definition activation and inspection without a completion goal. Review validation,
owner controls, status/derivation and goal-dependent summaries; preserve captured
prospective definitions. App opened is a beginning, never a workaround goal.
This receiver requirement blocks claiming production open-ended configuration
readiness, not WFS emission or the meaningful disposable Search-goal fixture.

**Next implementation boundary:** F2-1 tasks 1.1–1.4 only, after separate selection.
Reconcile implemented F1 prerequisites and recorded unresolved Quick Replace
mock-SSE/reload final-gate failure before claiming readiness/acceptance; unrelated
repair needs its own authorized scope. Have fresh compatible disposable Sentrame,
synthetic app credentials and protected owner/viewer reads available. Old F1-4
receipt is unchecked and does not need to be rerun merely to establish an obsolete
uncorrelated envelope: F2-1 owns its new receipt and derivation. Stop before Planner,
Quick Find, business instrumentation, sync/archive, deployment and enablement.


## F2-1 implementation checkpoint — 2026-10-29

Selected scope is navigation tasks 1.1–1.4 only. Shared opening/route correlation,
strict browser admission and separate observation clocks are implemented. Tasks
1.1–1.4 are complete after the stable-tree retry recorded below. The unchanged historical
Quick Replace failure case passed its focused baseline run; no planner/mock repair
or telemetry-causation claim was made.

Passed: 152 focused unit/component/HTTP tests; required opening/navigation/auth/
onboarding Chromium command 11/11; actual browser/Action/Node capture and actual
fresh-storage Sentrame protected receipt, prospective synthetic reaching-Search
derivation, exact-wire replay and process restart/reopen. Durable receipt and
configured derivation are independently asserted; eight records span the first
Home/Search/Home document, reload and concurrent second tab. Unknown input and
private query sentinels do not reach intake; complete inspected client responses
and scripts omit endpoint/producer credentials.

Current receiver is clean HEAD `a506dacbdc0f776238f2b3ebc769e42d2b4b9378`,
schema 3 / `structural-v2` / `journey-native-v3`; this supersedes the earlier
planning inspection identity for this local qualification only. Exact binary,
definition and captured-wire hashes, reproduction instructions and preserved
`.task/telemetry-navigation/f2-1/` artifacts are in
[the integration evidence](../sentrame.md#f2-1-local-qualification--2026-10-29).

Initial application verification failed content stability after concurrent unrelated
`observe-unexpected-pwa-errors` proposal/design edits. Record:
`.task/agent-finish/runs/6459096adeb84a55b175acbf9c836e6c.json` (identity
`6ecac67e4fe23d5cb726441cf91e013f67e612d15c752c4ead0eceed0accc050`).
All executed checks passed: 1,426 unit, Chromium 600 passed / 47 skipped, API
1,259 passed / 156 skipped, docs/spec/lint/format/types. Static contract checks
were not-run after mutation. At that checkpoint, task 1.4 remained unchecked; the implementation hashes
still match local qualification. Preserve the other writer's edits and rerun the
scoped application gate after the tree is stable. Documentation-only verification
cannot promote this failed application record.
Deployed routes and physical installed-device/native sharing are not-run. Planner,
Quick Find, business events, SDK migration, receiver source changes, production
mapping/goal changes, deployment, enablement and archival are outside this slice.
Existing journey-inventory and planning edits were preserved.


F2-1 completion: the user confirmed the other writer was paused; the fresh scoped
application gate passed with stable content. Record:
`.task/agent-finish/runs/48fdfcc05c60422bbe2247ac1d0e92a9.json`, identity
`ba49610b4361d7778f01dd261f4f42f13780098df545992271eb070297988061`.
Passed: 1,426 unit tests; Chromium 600 passed / 47 skipped; API 1,259 passed /
156 skipped; documentation/spec/lint/format/types/static contract/client checks.
Failed/blocked/not-run applicable automated checks: none. Live endpoint/database/
harness checks: not-applicable. Task 1.4 is now complete (F2-1 4/4, change 4/12).
The earlier failed mutation record is preserved as historical evidence. A separate
documentation check covers these completion bytes; application and receiver evidence
remain tied to their recorded identities. F2-2 and later groups remain unimplemented.


## F2-2 implementation checkpoint — 2026-10-29

Selected tasks: navigation 2.1–2.3 only, starting clean at WFS
`3eb308a1ea58fedbec16eca75e5229b88b5afd2d`. F2-1 prerequisite record:
`.task/agent-finish/runs/48fdfcc05c60422bbe2247ac1d0e92a9.json`.
Planner declares the rendered primary and wide companion to the existing shared
coordinator, preserving week/tab/loading/interaction behavior. Phone Grocery is
primary `planner.grocery`; wide remains primary `planner` plus companion
`planner.grocery`. Static labels only; no shopping/business event or click inference.

Test-first red reproduced missing primary/companion evidence in unit/component
and real-action browser capture. Focused green passed 85 tests; expanded seven-file
opening/navigation regression passed 233/233. Required Planner/Grocery/navigation Chromium acceptance passed **134/134**.
Actual browser → Action → Node → fresh disposable Sentrame retains 16 records;
protected reads independently confirm shared opening-to-companion context/sequence
and exact timestamps. Prospective synthetic Search-goal derivation and exact replay
before/after restart pass separately. Source/config/wire/binary hashes and artifacts:
`.task/telemetry-navigation/f2-2/identity.json`. After user-confirmed writer pause, scoped preparation and final verification passed
for all 11 reviewed paths (zero excluded). Application record:
`.task/agent-finish/runs/c5e3c887907e482d808caa95213cf7de.json`, identity
`36a4963e169fa07e37a740b50d8bcceae47763d599d85fb3755058733915e221`.
Docs/OpenSpec, lint/format/types, unit 1,431, E2E 600 (47 skipped), API 1,259
(156 skipped), static contract/client checks and content stability passed. Prepared
source also passed the real-action/disposable-receiver tracer again; artifacts are
in `.task/telemetry-navigation/f2-2/final/`. This result update is later documentation
content, separately checked, and does not change verified application bytes.
**F2-2 tasks 2.1–2.3 complete; change 7/12. Stop before F2-3.** See the [task evidence](../../openspec/changes/observe-pwa-navigation/tasks.md#f2-2-execution-evidence--2026-10-29)
and [integration notes](../sentrame.md#f2-2-plannergrocery-composition--2026-10-29).

Physical installed-device and deployed-route qualification: **not-run**. Phone
viewport and simulated document visibility coverage do not qualify OS unlock or
installed-device lifecycle. Quick Find, general overlay adoption, Grocery mutations
and business events remain outside this slice. No commit/deploy, collection
activation, production receiver/storage change, spec sync or archive.


## F2-3 implementation checkpoint — 2026-10-29

Selected tasks 3.1–3.3 only. Clean starting tree at WFS
`6e23c47617b6637437a4d155b9b44486eabc49f3`. F2-2 acceptance (134/134), final
verification record and prepared source hashes were checked before edits.
Quick Find adds one static shared declaration; one document coordinator still owns
all emissions. No focus/gesture/draft/selection handlers were changed. Named
coverage exceptions and their source owners live in
[`coverage.test.ts`](../../pwa/src/lib/telemetry/coverage.test.ts); baseline columns
and static search limits are in the [inventory](journey-inventory.md#f2-3-baseline-coverage-limits).

RED: unit 7 failed/16 passed; real-action browser rendered Quick Find with 11
rather than 12 records. GREEN: 23 focused tests and 233 existing telemetry/Planner
regressions. The actual disposable receiver tracer passed with whole-stream
sequence 1–16 and 20 retained records overall. Protected reads, source/forwarding
clocks, service/version, UUID context, exact replay and actual receiver restart
passed independently from configured derivation. Quick Find mappings are supporting
activities; closure is never cancellation/completion or a fixture goal.

Required Planner/utility/navigation acceptance: **117/117 passed** with the actual
disposable receiver enabled. Scoped preparation and final verification passed on a stable tree. Deployed routes/physical installed device: not-run.
API contract/client/schema/live database changes: not-applicable. No receiver
source/production configuration change, collection enablement, business events,
commit, deployment, sync/archive or F2-4 implementation.


F2-3 completion: tasks 3.1–3.3 accepted; change 10/12. Scoped preparation passed
for 14 paths with no excluded edits. Passing application record:
`.task/agent-finish/runs/45a225a3dc2d4070add55b2381549fd0.json`, identity
`1de50f1c27376224422bafe56f7b8c3bb1d05ab45244828d9ec94dec337caab4`.
All applicable checks and content stability passed: OpenSpec 38 items, lint,
formatting, types, 1,440 unit tests, Chromium 600 passed/47 skipped, API 1,259
passed/156 skipped and static contract/client checks. No applicable automated
failure/blocker remains. Prepared-source tracer wire/receiver artifacts and matching
source hashes are retained in `.task/telemetry-navigation/f2-3/final/`.
Final evidence/checklist updates are later documentation bytes, checked separately.
F2-4 remains pending. No production enablement, deployment, commit or sync/archive.
