# Telemetry work tracker

Planning baseline: 2026-10-29. Related [issue #326](https://github.com/AlexandreBrisebois/whats-for-supper/issues/326). Start with shared instrumentation, validate the [journey inventory](journey-inventory.md), then add one journey's missing semantic evidence at a time. Use the [reusable session prompt](../../.agents/prompts/telemetry-session.md).

## Current checkpoint

- Authorized work completed here: planning artifacts, source-backed inventory seeds, tracker and reusable prompt.
- Application instrumentation, package changes, deployment, collection enablement and receiver changes: **not performed**.
- Existing opening-only change: preserved unchanged; all its application tasks remain pending.
- Recommended next session: **F1-1**, the existing fresh Search opening tracer. Select I1 instead for investigation-only work; it has no implementation prerequisite.
- Foundation successors are specified with dependencies; they are not claims that F1 exists or that any runtime path is qualified.
- No branch creation, commit, sync/archive, public aggregate release or real household data collection is included.

## Session tracking

Change `tasks.md` checkboxes are the task authority. This table is a navigation/checkpoint index; do not maintain a second independent count of completed tasks. `planned` means artifacts exist, `active` means a session was selected, `partial` means work/evidence remains, and `accepted` means the selected tasks' actual acceptance passed. A change can remain incomplete after one accepted session. Record blockers and qualification cells separately.

| Session | Change and exact task scope | Dependency / small result | State |
| --- | --- | --- | --- |
| F1-1 | [Opening](../../openspec/changes/centralize-pwa-opening-observation/tasks.md), 1.1–1.3 | None; fresh Search -> real action -> captured opening; no later navigation records | planned; next |
| F1-2 | Same change, 2.1–2.3 | F1-1; gates, hidden/resume, fallback and unknown screen behavior | planned |
| F1-3 | Same change, 3.1–3.2 | F1-2; closed-input, runtime opt-out and loss containment | planned |
| F1-4 | Same change, 4.1–4.2 | F1-3; actual local durable receiver reads and prospective screen mapping | planned |
| F1-D | Same change, 4.3 | F1-4 plus selected disposable deployed/physical fixture; separate route/device cells | planned |
| F1-V | Same change, 5.1 | Reconcile the opening change's required evidence; do not mark unrun phone work complete | planned |
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
| WFS | `e4f61229d5bb765c286e1db9ceec28dd2f95e11c`; initially clean on `review/profile-settings-home-visuals`; planning adds only new docs/change artifacts |
| Installed PWA | Next 16.4.2, React/React DOM 19.3.1, transitive OTel API 1.9.1; no configured PWA OTel SDK/exporter |
| Local Sentrame | `/Users/alex/Code/sentrame`, clean `5a2646fc053af7ddf12bd9d13717adf060ea525f`; schema 3, projection `structural-v2`, computation `journey-native-v3` in inspected source |
| Receiver documents | Local DEVELOPER-GUIDE, OTEL-CONTRACT, AGENT-INTEGRATION, USER-GUIDE and standard-otel ledger; all five hashes match the [opening design snapshot](../../openspec/changes/centralize-pwa-opening-observation/design.md#local-sentrame-compatibility-target). Its older HEAD/dirty-tree description is historical, not today's identity |
| Receiver sample qualification | Local ledger records separate sample .NET/Next/browser Protobuf cells. These are not WFS JSON, deployed-route or phone passes |

Recheck source/configuration identity before each implementation or qualification. Use current local receiver implementation/docs, not an older GitHub guide or published image. No Sentrame files or storage were modified for this plan.

Sentrame supports named-log discovery, explicit mappings, scoped ordered paths, graph aggregation, rare paths, endings and diagnostics. The current definition requires one operational goal; goal closure and 30-minute mapped inactivity are separate from a WFS document lifetime. Inactive means unknown outcome. A long cooking visit can span receiver captures without becoming another WFS opening. Do not send heartbeats to conceal this distinction.

A future common Discovery result event can support one goal with distinct reasons, but personal exhaustion must not be mislabeled as family success. Other experiences may require receiver work for independent outcome views; inventory the gap before assuming it exists. Sentrame's recovery highlight is diagnostic evidence plus captured completion, not proof of same-operation repair. Graph edges can combine paths nobody followed end to end. Rare/incomplete paths, missing detail, retention and opt-in bias constrain claims. Public aggregate privacy/release remains outside these changes.

## Evidence ledger and handoff

Planning checkpoint, 2026-10-29: three new changes have complete planning artifacts; inventory intentionally skips runtime spec deltas. Strict full OpenSpec validation passed 39 items, and the 17 new owned files passed local link/anchor and whitespace checks. Application and walkthrough task boxes remain unchecked. Final scoped documentation/prompt-harness verification is recorded independently by the repository harness; its result does not qualify collection or any journey.

For each session append a compact dated record here or link its task evidence: selected session/tasks; WFS and receiver identity; changed owners; actual red/green commands; acceptance results; scoped verification `record_path`; next action/blocker. Do not store credentials, content, raw payload diagnostics or persistent business IDs. Update the table only to reflect that evidence.

| Qualification cell | Initial status | Required evidence |
| --- | --- | --- |
| Source/document review | inspected | Named files/versions and source-supported limits; no execution claim |
| Unit/component/mock checks | not-run | Exact red/green commands for the selected implementation |
| Browser -> real action -> Node capture receiver | not-run | Actual captured minimized payload; mocks only at external boundaries |
| WFS -> actual local Sentrame | not-run | Exact exporter/encoding, durable protected reads and storage reopen |
| Business API / real persistence | not-run | Selected journey's contract/client/mock and actual commit/recovery tests |
| Isolated deployed container/proxy/tunnel | not-run | Exact tested route/config/build and protected receipt |
| Physical installed phone / native sharing | not-run | Device/browser/install identity and fresh/resume/unlock/share evidence |

Use passed, failed, blocked, not-run and not-applicable accurately. Planning validation does not populate runtime cells. Receiver SDK drop fields, projection omissions and read truncation do not measure all WFS exporter loss. Current per-process budgets multiply across deployment processes; they are not a global limiter.
