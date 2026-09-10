# HM-A foundation evidence

Date: 2026-09-09. Status: implemented for review; native host loading **unqualified**.
HM-B has not begun. This record does not adopt or behaviorally qualify the harness.

## Authorization and identity

The user selected HM-A only: shared authority, loading, native shims, adapters and
ontology, with one writer and parallel read-only review. The starting worktree had
only the existing untracked `.kiro/specs/harness-modernization/` package; no tracked
edits. All 17 existing HM-A manifest artifacts matched their frozen baseline
SHA-256 before edits. Baseline/HEAD: `13fcddedffa9c2a07b2498afb530e7906394b006`.

[Candidate content identity](hm-a-content.json) records SHA-256 and byte length for
all 19 foundation artifacts (including unchanged network-topology) and the static
checker. The [frozen manifest](artifact-manifest.yaml) retains its original baseline
fingerprints. The candidate checker verifies that every other manifest artifact
is unchanged, as well as the tracked/untracked path boundary. Spec status updates
and this evidence are the only changes within the existing package; its fixture
payloads, evaluation protocol, manifest and later tasks remain intact.

## Result and ownership review

- `AGENT.md` owns authority, trust and mode meanings. Platform/system constraints
  and host permissions are external; selected scope does not authorize successors.
  Tests, tool output, history and memory supply evidence/context, not authorization.
- Mission owns intent; contract-testing owns correctness policy; execution-harness
  retains commands/completion; context-loading owns conditional loading, scope and
  delegation. Shims and adapters route to those owners without competing checklists.
- Mandatory startup dependencies on future-retired skills, including the stale
  session-review path, are removed. No skill, registry or prompt was retired/edited.
- The ontology distinguishes host/model/role, spec/slice/agent task/Taskfile task/step,
  contract/seam, authoritative/derived/historical artifacts, check/result/evidence,
  content identity and environment. Application `WorkflowTask` remains distinct.
- The former Kiro section 6 is preserved **verbatim** in the new manual-inclusion
  [home E2E reference](../../steering/home-e2e.md). Its newer information is not
  replaced by the older ADR032. This is a loading move, not current product validation.
- `pwa/CLAUDE.md` now resolves explicitly to the root Claude entrypoint. Kiro's
  always-loaded tool-trust shim routes to shared trust boundaries.

Two read-only reviewers checked authority/scope and routing/ontology independently.
Both found no blocking issues; the mission heading-numbering nit was corrected.
Static checks supplement that semantic review; keyword checks alone cannot prove
that instructions are contradiction-free or followed by a model.

Network-topology content and feature-specific contract-testing guidance are retained.
Verified network/memory salvage, specialist consolidation, spec workflow, runtime
source mapping and completion-tool changes remain with HM-B through HM-E. Existing
execution-harness checks are not replaced by a new lightweight gate in this slice.

## Actual checks

Environment: macOS 26.7 arm64; Python 3.9.6; repository Taskfile and tooling unchanged.

| Check | Actual result |
|---|---|
| `python3 .kiro/specs/harness-modernization/evaluation/check-foundation.py` | **Passed**: seven native routes reach AGENT; local links/imports resolve in 19 foundation files; Kiro section preserved; known conflicting foundation clauses removed; scope, unchanged non-HM-A manifest artifacts and candidate identities verified. |
| `python3 .kiro/specs/harness-modernization/evaluation/validate-package.py` | **Passed**: 143 baseline artifacts, 33 target fingerprints, 14 requirements, seven acyclic tasks, eight scenarios, 37 payload hashes; YAML/JSON parsing, Python syntax and package links. This is the existing package checker, not a full JSON Schema validator. |
| `task test:agent` | **Passed**: all 11 existing harness tests. These test tooling, not native discovery or model instruction following. |
| `git diff --check` | **Passed**: no whitespace errors in the tracked diff. Added foundation/checker files also inspected by the static/package checks. |
| Fresh Codex/Astra session loading | **Not run / unqualified**: this session inherited pre-edit instructions; no fresh-session load transcript or token telemetry was captured. Installed CLI presence does not establish the requested host/model/configuration or its loading behavior. |
| Fresh Gemini/Antigravity session loading, including Flash class | **Not run / unqualified**: no controlled fresh Antigravity session/load telemetry available through this task's execution tools. Antigravity.app exists and Gemini CLI is on PATH, but neither is a loading probe and CLI results cannot substitute for Antigravity. |
| Claude, Copilot, Kiro compatibility | **Static routes passed only**; automatic discovery/import and Kiro manual-inclusion behavior remain unqualified. |
| Token/latency measurements and model scenarios | **Not run / unavailable**; no tokenizer conversion, cost or reliability improvement claimed. |
| Application tests, live-service/DB probes, `task agent:finish` | **Not run** under the explicitly selected HM-A static-reference/contradiction and host-loading verification scope. No product, contract, schema, Taskfile or runtime script changes. Existing broad gates can format/generate files and stop shared processes; this record grants no general exemption for future slices. |

## Static loading inventory

These are reproducible **document bytes**, not observed host loading or token counts.
Baseline sets include the native shim, AGENT, mission, contract-testing,
execution-harness, context-loading and active adapter. They exclude recursive skill
expansion. Candidate entry sets include the native shim, AGENT, context-loading and
active adapter. Task-triggered conditional owners and source are additional context;
this is not an equal-work token benchmark.

| Route | Baseline direct mandatory set | Candidate entry set |
|---|---|---|
| Codex | 7 files / 31,420 bytes | 4 files / 7,167 bytes |
| Gemini CLI / Antigravity | 7 files / 30,176 bytes | 4 files / 7,226 bytes |

The soft 1,500-token essential-context target is **unmeasured**. Only fresh pinned
host/model telemetry can establish actual loading and token cost. Missing primary
host observations remain unqualified and must not be inferred from this diff.

## Stop and review

Review the foundation diff and this evidence. HM-A implementation is ready for
review with the host qualification limitation above; task-graph status is
`implemented-unqualified`. HM-B remains planned and unselected. No commit, push,
deployment, skill retirement, host/global memory edit or model evaluation occurred.
