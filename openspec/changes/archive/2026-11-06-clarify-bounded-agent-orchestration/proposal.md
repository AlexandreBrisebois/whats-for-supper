# Proposal

## Why

Substantial work can remain too serial or accumulate unrelated context even though the harness already permits bounded delegation. The current guidance does not clearly explain when to split work, reuse a worker, start a fresh one, or reassess elapsed time and shared test-resource contention.

## Outcome and Scope

Make substantial authorized work easier to coordinate without prescribing agents for trivial or dependent tasks. Extend the existing shared guidance with a small set of practical decisions: bounded assignments and useful independent work, minimum sufficient context, worker continuity versus fresh context, meaningful progress/elapsed-time checks, and coordinated ownership of concurrent test resources.

Preserve required OpenSpec artifacts and dependency context, authorization and host restrictions, one writer per shared file, exact verification evidence and final integration responsibility. Keep the Codex adapter a mechanics router; do not copy shared policy into it. This proposal changes guidance only, not Taskfile behavior, product contracts or verification selection.

Alex subsequently authorized implementation of this proposal on 6 November 2026. Apply only the shared guidance and scoped completion records. Custom-agent definitions, Codex configuration/hooks, new remote sessions, commit, push, deployment and production tests remain outside scope. Existing Planner edits are unrelated and must remain intact.

## What Changes

- Extend the shared decomposition section with proportionate criteria for substantial work, clear dependency boundaries and useful authorized parallel assignments, including cases where direct execution is better.
- Clarify reuse of relevant, valid worker context versus a fresh bounded assignment when old context is unrelated, stale or would bias an independent review. Neither choice expands authorization or starts a new remote session implicitly.
- Keep handoffs concise and complete: reuse the existing required scope/ownership/acceptance/stopping-point fields and include required specification dependencies, rather than copying whole conversation histories or omitting needed context.
- Add elapsed-time awareness at meaningful boundaries: inspect actual activity, progress and resource contention, communicate blockers, and adapt the plan without abandoning running checks or cutting acceptance to meet a deadline.
- Add practical coordination for shared test ports, databases, processes and heavy concurrent checks in the execution-harness owner, referencing existing invocation-specific evidence and integration rules.
- Assess optional Codex specialists from official documentation and local inventory. Recommend no conversion of deterministic Taskfile targets into agents; at most consider a bounded scope reviewer later, once compatible discovery and actual benefit are qualified.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is internal documentation guidance with no application requirement change. `skip_specs: true` applies; do not create an artificial canonical agent capability.

## Impact

Proposed implementation is limited to `.agents/core/context-loading.md` and the concurrent-resource guidance in `.agents/core/execution-harness.md`, plus scoped task/evidence bookkeeping. `.agents/adapters/codex.md`, Taskfile commands, gate scripts, OpenSpec configuration, skills and `.codex` definitions remain unchanged unless a separately reviewed concrete gap requires revisiting scope.

[Design](design.md) contains the gap map, owner decisions, representative acceptance review and trade-offs. [Agent assessment](agent-assessment.md) distinguishes official guidance, local observations and recommendations. [Tasks](tasks.md) record implementation and qualification progress.
