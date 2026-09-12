# Specification workflow

Use directly for specification work or through the
[writer](../prompts/spec-writer.md) and [reviewer](../prompts/spec-reviewer.md).
[AGENT.md](../../AGENT.md) owns authority and modes;
[context loading](context-loading.md) owns scope, clarification and delegation.
This procedure and its packets do not authorize implementation.

## Establish the outcome

Identify the requested mode, selected spec or bounded maintenance request,
authorized effects, acceptance and stopping point. Reuse existing authorization.
Read selected requirements, design, tasks and immediate dependencies, then only
the contracts and source needed to resolve affected seams. Verify technical facts
from current files before asking the user; history is evidence, not a requirement.

Clarify consequential unknowns about intent, scope, contract behavior or acceptance
before dependent work. Explain the decision, viable options, a recommendation and
downstream effects. Continue independent work while waiting. Resolve routine
details from evidence and state reasonable assumptions. Do not force an interview,
a question for every branch or repeated model selection. Unresolved consequential
decisions remain explicit blockers to affected tasks, not guessed requirements.

## Write or revise

Use `.kiro/specs/<feature-slug>/` with three artifacts. Existing grouped spec
locations may remain.

- `requirements.md`: intended outcome, scope/non-goals, stable acceptance IDs,
  observable success/failure behavior, decisions and consequential open questions.
- `design.md`: how acceptance is met, ownership and affected interfaces, relevant
  alternatives/tradeoffs, failure/recovery behavior and verification strategy.
  Specify exact paths, fields and transitions needed for execution; verify them
  rather than inventing precision.
- `tasks.md`: dependency-ordered bounded tasks with requirement IDs, outcome,
  authorized files/effects, required context, checks and stop conditions. Record
  actual evidence and remaining blockers here or in linked evidence.

Prefer vertical slices for application behavior. Bounded documentation, harness,
maintenance or client-state changes need not invent API, database or UI work to
cross a seam. Preserve the three artifacts for feature specifications; a small
explicit maintenance request can use one execution packet without an artificial
feature specification.

Trace contracts and ownership through the affected execution path. For API/schema
work, cover affected SQL/install/compatibility, runtime models, generated clients,
mocks and consumers as applicable. Follow [contract/testing](contract-testing.md)
for approved contract → tests → implementation. Describe meaningful test assertions
and existing Taskfile commands; prose alone need not have application tests.

Check relevant failure modes: empty/error/loading states, retries, concurrency,
late async results, navigation and partial persistence. Time-dependent work needs
a controllable clock and deterministic mock dates. For UI work, specify interaction,
recovery, accessibility, state ownership and stable test IDs; use
[designer](../skills/designer/SKILL.md) only when its UX procedure is needed.
Non-UI work has no UI/persona requirement. Specialists are conditional, not a
mandatory skill chain.

Order dependent tasks sequentially; identify shared-file/contract ownership before
proposing parallel work. Independent review can be read-only. A workstream map is
useful for complex dependencies, not required for every change. Use the
[execution packet](../templates/execution-packet.md) for selected task handoffs.
Present the specification, decisions and unresolved blockers; stop before code
implementation unless separately authorized in the current scope.

## Review

Review can finish with findings only, without editing files, resolving every
branch, conducting an interview or obtaining approval to build. Report findings
by severity with source locations, concrete consequences and the smallest useful
correction. Distinguish defects from questions and optional suggestions; report
no findings when warranted. Do not manufacture a blind spot.

Check acceptance coverage, contract/semantic consistency, ownership, cross-spec
handshakes, dependencies, failure paths, unnecessary complexity and testability.
Use product/UX lenses where relevant. Divergent tests or code do not authorize
rewriting an approved contract.

For large cross-spec reviews, a branch manifest may track issue, affected specs,
status, decision and next action. Preserve explicitly requested one-branch
conversations: when a consequential decision is needed, present options and wait
before applying that decision. Existing authorization to apply a resolved
correction remains valid. Findings-only review needs neither a persisted manifest
nor spec patches. If updates are requested, patch only authorized specs and affected
acceptance/design/task references. Generating a build packet does not authorize
its execution.

## Deliver and stop

Report artifacts or findings, actual checks and limits, decisions/blockers and
the selected stopping point. Use the existing [execution harness](execution-harness.md)
for applicable command/completion work; this is not a second finish path. Keep
mandatory constraints separate from optional advice in every handoff.
