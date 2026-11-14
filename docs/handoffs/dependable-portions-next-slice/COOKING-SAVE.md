# Cooking instruction Save repair

Selected on November 14, 2026, on clean local/remote `recipe-view-redesign` at
`c65b799bc8336cb59cc7afe84c5ee84186f8f469`. The user selected the cooking
diagnosis from the attachment after inspection of the newer CI run. This scope
permits the smallest demonstrated repair, regression coverage, independent review,
stable verification and signed delivery. Alex owns hosted CI monitoring.

The evidence and terminal delivery owner is
`.task/cooking-save-20261114/delivery.json`; invocation-specific records retain
their own tested identities. This handoff does not claim terminal checks that are
absent from that receipt.

## Failure and demonstrated cause

The original hosted job at
https://github.com/AlexandreBrisebois/whats-for-supper/actions/runs/43623064491/job/132532869323
tested `6589c18a7073afc3aeacb94dd6a4a6506030eb5a`. Its retained canonical artifact
is `.task/ci-absolute-20261114/artifact.zip`, SHA256
`4526199c33fc3ebfa515cd4176c2144ea10b93a60b35921851e1ac0d5e1973c7`.
The absolute-use owner had two browser passes and one timeout, zero skips/retries;
the editor retained `Use 50 g pasta.` and reported `Instruction save superseded`.
The secondary context-close error did not establish teardown as the cause.
The application and live-test paths were unchanged by the intervening commit.

The newer run at
https://github.com/AlexandreBrisebois/whats-for-supper/actions/runs/43627224625
tested `c65b799b`. All three real API/PostgreSQL cooking partitions passed.
The absolute-use artifact's SHA256 is
`d59cfe8aa997f7a9dbb6f805afad7128f1bdeda136f19b998b8df1626438558a`;
its three browser cases passed without skips/retries. The run's planning failure
and two retry passes remain outside this repair. A later cooking pass did not
explain or repair the earlier failure.

Two controlled unit regressions failed before application changes: a focus or an
actual schedule-owner event during the post-save projection reread produced the
same superseded error. `diagnostic-focus/` then reproduced the transition through
the real generated client/API/PostgreSQL path on a fresh production build. One
instruction PATCH returned 200, and the independently served projection carried
the committed content revision. Injecting focus before delivering that projection
left the draft/error UI open. Two other browser cases passed. A separate traced baseline reproduction recorded
Save generation 3, current generation 4 and an unchanged active draft, with the
returned projection revision equal to the committed PATCH revision. This establishes a
mechanism matching the observed failure; the original hosted artifact lacks the
event chronology needed to identify its exact triggering signal.

The path is `fresh-url-live.spec.ts` → `updateRecipe` → generated guarded PATCH →
`RecipeController.Update` → `RecipeService.UpdateRecipe` → existing canonical
editor/persistence → authoritative detail → ingredient projection → CooksMode.
The application defect is in client reconciliation: background probes advanced
the same generation as foreground Save, and same-version probe installation
retired that generation again when its subscription was replaced.

## Repair and preservation

`CooksMode.tsx` gives background probes a subscription-local sequence while
capturing the foreground generation. A newer probe retires an older probe;
foreground Save/refresh/report/context retirement still rejects obsolete reads.
Successful Save retires outstanding probes before installing its projection.
The original changed-draft and uncertain-write recovery guards remain in place.
No API, backend policy, mock policy or teardown change was made.

The first production mocked repetition retained 314 passes, four failures and 18
conditional skips, zero retries. Three failures were the remainder recovery test
expecting an error after a successful PATCH without a fault. Independent review
confirmed that stale fixture precondition. It now explicitly loses the consumer
reply after the one committed PATCH and requests a focus probe after the retained
draft/error assertions. All recovery read/revision, write-count, binding, quantity,
check and grocery assertions remain. A separate per-item Cook-entry missing-overlay
failure remains retained without an assigned cause. The initial full PostgreSQL
run also reported an owned Program readiness failure; its complete record remains
`.task/database-tests/runs/a525fbb887be4f3aab0feb3b4ef18a47/result.json`. Later
serial terminal qualification is recorded separately without erasing either result.

`CooksMode.sse.test.tsx` covers focus, schedule, a same-version probe, a late older
probe and a changed context. Existing units retain changed typing, conflict,
lost-reply read-before-replay, reports and explicit remote refresh coverage.
The ordinary live URL test now injects a focus hint while the committed Save's
projection awaits delivery and requires editor closure and the success announcement.
All prior original/scaled amounts, replacement binding, uncertain wording, sauce
check, independent shopper refresh and single grocery-demand assertions remain.

Focused units passed 179 cases. Native/preparation/final production, independent
review and full PostgreSQL results belong to the terminal receipt with exact source,
build, runtime and invocation identities. Native macOS ARM evidence is separate
from hosted Ubuntu qualification. Node/npm match 26.12.0/11.21.1; native .NET is
11.0.100, while the full Linux PostgreSQL owner uses the pinned SDK image.
Initial diagnostic failures, the temporary misplaced probe-counter declaration
and the changed-context test's initial preparation-view assumption are retained in
separate logs; they are not successful acceptance or additional product defects.

## Scope and remaining work

This contributes to step tasks 0.3/1.2/2.2 and canonical tasks 2.2/3.2, with parity
4.1–4.2 qualification. No aggregate checkbox is closed. Parity's unrelated cooking
completion work, complete-suite/hosted-final-candidate 6.2–6.3 and release 5.1
retain their existing obligations. No specification was synced or archived.

The separate 46-receipt V1 admission blocker and all retained history remain
unchanged; see [migration acceptance](MIGRATION-ACCEPTANCE.md). No vocabulary
adoption, copied-library migration, activation, DV/production operation, later
intake, Similar, garlic or adjacent UI work is included. Port 3000 and preexisting
containers are reserved. Task-owned resources alone are cleaned up.
