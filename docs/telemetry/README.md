# Telemetry work tracker

Planning baseline: 2026-10-29. Related [issue #326](https://github.com/AlexandreBrisebois/whats-for-supper/issues/326). Start with shared instrumentation, validate the [journey inventory](journey-inventory.md), then add one journey's missing semantic evidence at a time. Use the [reusable session prompt](../../.agents/prompts/telemetry-session.md).

## Current checkpoint

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
- Foundation successors retain their dependencies; F1-1 capture acceptance does not qualify the remaining F1 behavior or receiver/deployment/device paths.
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
| F2-1 | [Navigation](../../openspec/changes/observe-pwa-navigation/tasks.md), 1.1–1.3 | F1 groups 1–3 and 4.1; correlated Home -> Search -> Home | planned |
| F2-2 | Same change, 2.1–2.3 | F2-1; correct phone/wide Planner and Grocery presentation | planned |
| F2-3 | Same change, 3.1–3.3 | F2-2; Quick Find surface pilot, route/overlay coverage debt | planned |
| F2-4 | Same change, 4.1–4.2 | F2-3; durable local baseline receipt and integration reconciliation | planned |
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

| Source | Inspected identity / current claim |
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
| Unit/component/mock checks | passed for F1-1 focused 21 tests, F1-2 focused 27 tests and F1-3 focused 92 tests | Exact red/green commands for the selected implementation |
| Browser -> real action -> Node capture receiver | passed for Search/navigation/reload plus F1-2 entry matrix/all 15 combined preservation checks and F1-3 real-action configuration/failure/adversarial matrix | Actual captured minimized payload; mocks only at external boundaries |
| WFS -> actual local Sentrame | not-run | Exact exporter/encoding, durable protected reads and storage reopen |
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
