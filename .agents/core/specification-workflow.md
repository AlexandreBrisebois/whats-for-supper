# Specification workflow

Use directly for specification work or through the
[writer](../prompts/spec-writer.md) and [reviewer](../prompts/spec-reviewer.md).
[AGENT.md](../../AGENT.md) owns authority and modes;
[context loading](context-loading.md) owns scope, clarification and delegation.
[ontology](ontology.md) owns the terms used here. Shared policy uses
capability-based terminology rather than product-specific controls or claims.
This procedure and its packets do not authorize implementation.

## Establish the outcome

Identify the requested mode, selected specification or bounded maintenance request,
authorized effects, outcome, success criteria, constraints, acceptance and stopping
point. Reuse existing authorization. Classify new work as a feature specification,
defect-correction specification or maintenance packet using the ontology. For a
feature specification, select and record a behavior-first or design-first derivation
direction, a gated or accelerated approval cadence, and its source artifact.
Before creating a package, search `.kiro/specs/spec-registry.yaml`; determine whether
to revise an existing package, add a dependency, promote an exploration, or create a
new descriptive lowercase kebab-case package. Existing numbered/category paths are
stable legacy names, not a naming scheme for new work. Register active packages and
validate the rendered index with `task spec:check`.
Read selected requirements, design, tasks and immediate dependencies, then only
the contracts and source needed to resolve affected seams. For every new feature
specification, review the current implementation before drafting any of its three
artifacts; a greenfield assumption is not a substitute for checking the repository.
Verify technical facts from current files before asking the user; history is
evidence, not a requirement.
Use the minimum current evidence sufficient to establish a claim. Distinguish
verified facts, user decisions, assumptions and open questions; absence of evidence
is not evidence of absence. Stop exploring when the affected path, ownership,
interfaces and acceptance implications are sufficiently established.

Clarify consequential unknowns about intent, scope, contract behavior or acceptance
before dependent work. Explain the decision, viable options, a recommendation and
downstream effects. Continue independent work while waiting. Resolve routine
details from evidence and state reasonable assumptions. Do not force an interview,
a question for every branch or repeated model selection. Unresolved consequential
decisions remain explicit blockers to affected tasks, not guessed requirements.

## Explore before committing to design

Perform a bounded implementation reconnaissance for every new feature specification.
Trace the affected behavior from its existing entry points through relevant data and
control flow. Identify current ownership, contracts, persistence and external
integrations; the boundaries where representations or responsibility change; and
observable side effects. Review nearby tests, mocks and established patterns that
constrain or enable the change. When the feature is genuinely new, inspect its
intended insertion points and adjacent boundaries rather than declaring that there
is no implementation to review. Record the source paths and facts that support the
resulting integration map, plus material gaps that remain unknown.

Use that evidence throughout the specification, not only as design background:

- requirements preserve or intentionally change verified current behavior and state
  boundary-derived compatibility, failure and ownership constraints;
- design maps the proposed behavior across existing seams, names reused patterns and
  makes any new or changed boundary explicit; and
- tasks follow the actual dependency order across those seams, identify file/effect
  ownership and include checks at the boundaries they change.

When a future task changes a browser/API seam, its task description must name the
unit/API tests, Playwright scenario, mock owner, route/method, and contract envelope.
The mock belongs to the implementation vertical slice. Current capability baselines
may identify relevant coverage but do not need to become command-result reports.

Do not finalize requirements, design or tasks when a material implementation seam is
still assumed. Mark the affected statement as an assumption or open question and
block dependent tasks until the evidence or a user decision resolves it.

In behavior-first work, establish observable behavior before deriving a design from
that evidence. In design-first work, capture the proposed constraints or architecture,
validate them against the current system, then derive requirements. Derived
requirements are proposals to verify, not proof of feasibility.

For consequential architectural choices, compare genuinely distinct viable
approaches and recommend one using repository evidence. Do not manufacture options
or require an alternatives ceremony when the contract, approved decision or small
scope leaves only one proportionate approach.

## Write or revise

Use the selected repository specification location with three artifacts for a
feature specification. Existing grouped locations may remain.

- `requirements.md`: intended outcome, scope/non-goals, stable acceptance IDs,
  functional and relevant non-functional requirements, observable success/failure
  and preserved behavior, constraints learned from the implementation review,
  decisions and consequential open questions. Prefer
  structured condition/event and system-response statements when they improve
  clarity and testability; do not force syntax that obscures meaning.
- `design.md`: how acceptance is met, ownership and affected interfaces, relevant
  alternatives/tradeoffs, failure/recovery behavior and verification strategy.
  Include a proportionate, source-grounded integration map of existing and proposed
  seams, existing patterns reused, data/state flow and security, privacy,
  compatibility, performance and operational concerns when relevant. Specify exact
  paths, fields and transitions needed for execution; verify them rather than
  inventing precision.
- `tasks.md`: dependency-ordered bounded tasks with requirement IDs, outcome,
  design references, required/optional status, authorized files/effects, required
  implementation-review context, meaningful seam assertions, named checks and stop
  conditions. Record actual evidence and remaining blockers here or in linked
  evidence.

Prefer vertical slices for application behavior. Bounded documentation, harness,
maintenance or client-state changes need not invent API, database or UI work to
cross a seam. Preserve the three artifacts for feature specifications; a small
explicit maintenance request can use one execution packet without an artificial
feature specification.

Behavior-first work derives `design.md` and then `tasks.md` from `requirements.md`.
Design-first work validates `design.md`, then derives `requirements.md` and
`tasks.md`. Gated cadence pauses at designated approval checkpoints; accelerated
cadence uses the same artifacts without those intermediate pauses and does not relax
clarification, evidence, validation or implementation authorization. Do not silently
reverse a recorded direction. If the source artifact changes, mark affected derived
artifacts stale until synchronized; preserve stable IDs whose meaning did not change.

A defect-correction specification records reproduction conditions, current and
expected behavior, root-cause evidence, constraints, preserved behavior and
regression checks before correction tasks. Do not expand a correction into new
feature scope without separate authorization.

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

Maintain traceability from requirements through design decisions and tasks to
checks. Every required task must contribute to accepted requirements; optional
tasks must be labeled and must not become hidden completion conditions. Order
dependent tasks sequentially; identify shared-file/contract ownership before
proposing concurrency waves. Independent review can be read-only. A workstream map
is useful for complex dependencies, not required for every change. Use the
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

For a new feature specification, reject ungrounded greenfield planning: confirm that
current implementation, insertion points, seams and boundaries were reviewed and
that cited evidence materially shaped requirements, design and task ordering/checks.
Missing evidence is a gap, and a list of source paths without downstream influence
does not satisfy the review.

Review against the recorded specification kind, derivation direction and approval
cadence. Check that the source artifact is identifiable, derived artifacts are
synchronized, structured
requirements express meaningful observable behavior, the integration map is
grounded in current evidence, and requirement → design → task → check traceability
is complete. Validate required/optional task labels and proposed concurrency against
dependencies and ownership. For defect correction, check reproduction, root cause,
preserved behavior and regression coverage. For accelerated cadence, compensate for
omitted checkpoints with deliberate consistency review.

Classify demonstrated defects or contradictions as findings, consequential
possibilities with incomplete evidence as risks, missing material decisions as open
questions, and non-required improvements as suggestions. Do not suppress a
high-impact risk merely because certainty is incomplete; state the missing evidence.

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
