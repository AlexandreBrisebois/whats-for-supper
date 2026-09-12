# Task Executor

Execute one selected WFS task under [AGENT.md](../../AGENT.md) and its conditional
loading rules. Reuse the spec, task and active host already supplied. If selection
is missing, list active `.kiro/specs/` folders (excluding archives), then the chosen
spec's tasks with completed items marked. Ask only for the missing selection;
never repeat a host/model interview or infer the host from a model name.

Read the selected requirements, design and task, immediate dependencies, relevant
manifest entries and required source before editing. Identify the authorized
outcome, effects, acceptance and stop boundary. A selected task does not authorize
its successor or adjacent cleanup. Use the [execution packet](../templates/execution-packet.md)
for handoffs: required task constraints bind; optional examples, sequence and
model preferences do not become acceptance criteria. Execute the approved outcome,
not every suggested implementation detail.

Use [context loading and investigation](../core/context-loading.md) for targeted
reads, consequential clarification, dirty-worktree preservation and delegation.
Continue authorized independent work while a consequential decision is pending.
Follow [contract/testing](../core/contract-testing.md): approved contract → tests
→ implementation. A mismatch is evidence to resolve against approved intent, not
permission to rewrite the spec. Authorized spec changes are allowed within scope.

## Implementation details

- Read constants, enum members, DTO fields and SQL names from current source.
- Before changing a positional C# record, use `rg` across source and tests to find
  constructors, named arguments and deconstruction; append compatible parameters
  where possible and update affected callers. Do not silently reorder fields.
- Before changing an interface, find all implementors and test fakes. Preserve
  required behavior and domain side effects; do not add no-op success stubs where
  callers observe persistence or workflow state.
- For schema changes, update declarative SQL, applicable compatibility SQL and EF
  mappings together under [database](../skills/database/SKILL.md). Storage entities
  and API DTOs need explicit mappings, not identical shapes.
- Regenerate affected clients after an approved OpenAPI edit with `task gen:client`;
  verify compilation with `task typecheck` and affected seam tests.

## Commands and stopping point

Inspect current Taskfile definitions and runtime requirements before execution.
Schema preview is `task db:schema:push DRY_RUN=true`; application is `task migrate`.
The database procedure explains their different coverage. Schema application never
implies reset, seed, volume removal or destructive repair; those effects need
explicit authorization for the target data/environment.

Use `task test:api`, `task test:unit` and `task test:e2e` for the applicable layers;
`task test` runs all three. `task agent:slice -- <route>` supports discovery;
`task agent:reconcile` and `task agent:drift` support seam validation.
The [execution harness](../core/execution-harness.md) owns check selection and
completion via `task agent:finish`; do not invent a second completion protocol.
Follow its targeted-debugging exception and timeout handling.

Stop at the selected acceptance boundary with a reviewable diff, actual check
inputs/content identity/results and limitations. Mark task evidence truthfully:
a blocked or unavailable check is not a pass, and a green log or test cannot
supply missing authorization. Report adjacent findings without implementing them.
