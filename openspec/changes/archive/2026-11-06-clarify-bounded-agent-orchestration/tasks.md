# Tasks

Alex authorized applying this guidance proposal on 6 November 2026. Task markers record qualified progress; custom-agent definitions remain outside scope. The change is documentation-only (`skip_specs: true`), so behavioral red/green, application tests and live/API/database acceptance are not applicable. Use meaning/scope review and documentation verification; do not invent tests mirroring prose.

## 1. Clarify bounded coordination in the existing owners

**Outcome and scenarios:** design's small direct task, independent authorized assignments, shared-contract dependency, reused worker, fresh scoped context, elapsed-time investigation and shared-resource examples.
**Owners and boundaries:** `.agents/core/context-loading.md` owns decomposition/continuity/elapsed judgment; `.agents/core/execution-harness.md` owns test-resource coordination. Existing authority, handoff fields, loading rules, verification evidence and Codex routing are preserved.
**Dependencies and prerequisites:** new explicit apply approval; recheck the current owner files and branch before-images against this proposed insertion text. The custom-agent assessment is background, not an installation task.
**Acceptance boundary:** review the actual instruction meaning against the representative cases; documentation checks establish content/link/format validity, not model compliance or measured speedup.

- [x] 1.1 Integrate the three proposed context-loading paragraphs into the existing decomposition/handoff sections, removing only redundant task-owned phrasing. Retain required OpenSpec dependencies, minimal sufficient context, authorization/host restrictions, one writer and lead reconciliation. Review the small-task, independent-review, shared-contract, reuse/fresh and long-running-check examples in design; record where the actual wording gives each decision without creating a mandatory agent quota, extra handoff document, timeout or permission flow. Verify a focused diff against the before-image and run `task verify:plan -- <current-task-paths>` to confirm the applicable selection.
- [x] 1.2 Integrate concurrent-resource coordination in execution-harness near its existing resource caveat, and add only the necessary context-loading cross-reference. Review the two-shared-port/DB and concurrent-heavy-gate cases: separate owned resources or serialization, inspection before retry/cleanup, no shared process kill, invocation-specific evidence and final integration remain intact. Inspect the actual diff for duplicated verification doctrine or new topology/commands; run documentation checks via `task verify -- <complete-reviewed-documentation-paths>` for this slice, recording its invocation path and limitations without running production or changing test behavior.

## 2. Review and qualify the complete guidance change

- [x] 2.1 Perform the lead's scope review of the selected guidance diff, approved proposal and current owner rules; use a bounded independent read-only reviewer only when useful and authorized, not as a completion requirement. Reconcile all eight representative cases in design with concrete wording, required specification context, scope boundaries and preserved evidence/integration responsibilities. Recheck that the Codex adapter, Taskfile/scripts, skills, config/hooks and custom-agent definitions remain unchanged; preserve unrelated work. Report actual findings, trade-offs and any compatibility claim not established by the local assessment. Do not create a specialist or run a new remote session to satisfy this task.
- [x] 2.2 Finalize scoped evidence/task records, inspect all changed/deleted/new paths and run `openspec validate clarify-bounded-agent-orchestration --strict --no-interactive`, then `task verify -- <complete-reviewed-changed-paths>`. Report the invocation-specific record/identity and actual pass/fail/not-applicable statuses. Honor the classifier's selection; do not reduce it to force a passing result. No preparation/generation is needed for this wording-only scope. Do not claim runtime speedup, custom-agent discovery or future model compliance from these checks.

## Workflow follow-up

- The proposal and insertion text were reviewed and apply was explicitly authorized; sync/archive still require a separate request.
- Named agent definitions, Codex settings/upgrades, new remote sessions, product implementation, commit, push, deployment and production tests remain outside scope. A later definition change needs its own review and actual client compatibility qualification.
