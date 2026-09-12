# HM-Q completion and HM-D/HM-E verification

Date: 2026-09-11. Status: **complete with user waiver**. HM-D and HM-E are also
closed on this basis. This is an acceptance decision, not a model qualification pass.

## Authorization and acceptance decision

The user selected “build out HM-Q, verify HM-D and HM-E”, then instructed:
“i don't have the exact models, you can skip that part and consider it done”.
The assistant explicitly interpreted this as waiving outstanding model runs,
native loading probes and model efficiency comparison. Those checks are not-run
or unmeasured, never passed. The frozen benchmark protocol and scoring thresholds
remain unchanged for any future measurement.

The structural harness is accepted under this waiver. No claim is made that Astra,
Gemini or Flash behavior, automatic native loading, the 1,500-token target, or
baseline-relative efficiency has been demonstrated. HM-Q no longer waits on model
IDs, authentication, disposable host profiles or those measurements.

## Delivered qualification tooling

[qualification.py](evaluation/qualification.py) supplies operator-side tooling:

- A complete 48-slot schedule per configuration: eight scenarios, three paired
  repetitions, counterbalanced baseline/candidate order. Slots start schema-valid
  and not-run, with unknown telemetry represented by null.
- Baseline application export plus a candidate overlay restricted to recorded A–E
  implementation paths. Exports use committed Git blobs, omit the evaluation
  package, preserve executable bits, and create a synthetic local Git history.
  Evidence and exact fixture prompts remain outside the exported workspace.
- Hash verification of fixture payloads, committed-before-dirty setup, and export
  identities. Existing output directories are rejected to preserve prior attempts.
- Full Draft 7 run-record validation and descriptive reports by configuration,
  scenario and variant. Failed-attempt token cost is retained; missing telemetry
  and zero denominators remain null. Reports cannot automatically assert adoption.

These utilities prepare and inspect evidence. They are not a model launcher or
proof of process isolation. Native host adapters, authentication provisioning,
transcript scoring and actual paired runs were not built/executed after the waiver.
Future measurement must still follow the unchanged [protocol](evaluation/README.md),
including invocation wrappers and all loading probes; an export alone is insufficient.

## Verification

Exact commands, output and checker identities are in [check evidence](hm-q-checks.json).

| Check | Result |
|---|---|
| `task test:agent` | Passed: all 30 harness regressions, including cache mutation, unknown impact, timeout handling, evidence boundaries and summary/status separation. |
| Historical HM-E closure checker | Passed before acceptance/status and handover updates: 58 sections/1,325 journal lines, nine retirements, ten retained skills, 55 active route files, provenance/content checks. Its fixed prior-task status assertions describe the historical HM-E slice; do not use it to reject this authorized completion transition. |
| Frozen package and fixture smoke | Passed: 143 artifacts, 33 target fingerprints, 37 payload hashes, all eight seeded/positive controls and negative controls. F05/F07 are operator controls, not model behavior. |
| New operator tooling regressions | Passed: seven tests covering schedule/order, unsafe paths, evidence overwrite, false F05 completion, unsupported pass claims, failed/missing cost and product exclusion. Initial run failed because the implementation was not yet present. |
| Actual baseline/candidate F06 export | Passed: identical application digest, one synthetic commit each, evaluator exclusion, tracked-dirty and untracked payload preservation. See [export evidence](hm-q-export-checks.json). |
| Schedule/report CLI | Passed: 48 schema-valid not-run slots and report produced in temporary storage; no invented token results. |
| Model runs, native loading and efficiency | Not-run/unmeasured; waived by user. |
| Product lint/types/E2E/API/database/build/deployment | Not-applicable to this operator tooling/documentation change; not run and no product readiness claim. |

The applicable real repository gate is the harness regression suite. No application
source, contract, database schema or deployment configuration changed. Static and
fixture evidence closes the implemented D/E mechanisms under the explicit waiver;
it does not retroactively turn their historical blocked model checks into passes.

Preparation and final `agent:finish` follow assembled documentation updates. Their
latest result and tested identity are in `.task/agent-finish/last-run.json`; evidence
above identifies its own earlier test inputs rather than claiming a later digest.

## Environment and reproducibility

Source candidate/rollback reference: `ca048a2b3368f91786646e990b8435a8fc9c3867`.
Baseline: `13fcddedffa9c2a07b2498afb530e7906394b006`.
The starting source worktree was clean. No source commit, push or deployment occurred.
Existing A–E evidence, frozen fixtures, oracles, scoring protocol and manifest remain
unchanged. Only this spec package and the harness checkpoint in HANDOVER are updated.

Docker initially failed sandbox access; approved access then showed the daemon was
stopped. Docker Desktop was started and returned version 29.7.2. No containers,
images, mounts, credentials or model sessions were created. Docker remains running.
Codex CLI reported 0.154.0-alpha.6.1. Antigravity applications were found under
/Applications despite no PATH command. Neither observation qualifies a model host.

The temporary Python environment uses PyYAML 6.0.3 and jsonschema 4.26.0. Sandbox DNS
initially blocked installation; approved network access installed them successfully.
No user-global Python packages, memory, credentials or host settings were changed.
Runner research used official [noninteractive Codex documentation](https://learn.chatgpt.com/docs/non-interactive-mode)
and [authentication documentation](https://learn.chatgpt.com/docs/auth); no host CLI
session was substituted for the required isolated native runs.

Temporary export workspaces and evidence are under `/tmp/wfs-hmq-*`. They contain
synthetic histories and no copied host credentials. Durable export summaries are
recorded in this package. Future rollback must preserve unrelated changes and restore
paired callers/destinations together; do not reset a shared checkout.
