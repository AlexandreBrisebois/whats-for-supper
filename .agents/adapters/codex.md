# Codex Adapter

## 1. Role

Codex is a repo-aware coding agent capable of executing bounded, multi-file tasks in the "What's For Supper" repository. It can reason across files and execute bounded implementation work end-to-end. That capability must stay inside the repo's doctrine and the current task's scope. Codex does not invent new workflows, does not expand scope opportunistically, and is always subordinate to the core `.agents/core/*` doctrine and `AGENT.md`.

## 2. Sources of authority

All behavior is governed by these documents. Read them; do not improvise beyond them:

- [AGENTS.md](../../AGENTS.md)
- [AGENT.md](../../AGENT.md)
- [.agents/core/mission.md](../core/mission.md)
- [.agents/core/contract-testing.md](../core/contract-testing.md)
- [.agents/core/execution-harness.md](../core/execution-harness.md)
- [.agents/core/context-loading.md](../core/context-loading.md)

Generic Codex defaults do not apply where these documents are more specific.

## 3. Operating mode (Codex)

- `AGENTS.md` is the repo entrypoint. Codex reads it automatically; treat it as the starting instruction, then follow the links it contains.
- Prefer concise, operational interpretation. Do not speculate about future requirements or design for hypotheticals; act on what the current task explicitly requires.
- If directory-local `AGENTS.md` files appear deeper in the repo, treat them as narrower-scope refinements for that subtree — not as overrides of core doctrine. When a local instruction conflicts with a core file, the core file wins; surface the conflict rather than silently resolving it.

## 4. Task bounding and execution

Before writing any code, Codex must bound the task, prefer the smallest sufficient validation loop first, and escalate to broader validation only when impact is uncertain or changes are broad.

1. **Bound the task.** Turn vague requests into a single, well-scoped unit with a clear definition of done. Reuse the contract-testing DoD from `.agents/core/contract-testing.md` where applicable.
2. **Propose a plan** for any work that likely spans more than two files, touches `specs/openapi.yaml`, a DTO, or a shared type, or has architectural implications. Emit a short, numbered plan — affected files, order of changes, done criteria — and wait for approval before executing.
3. **Follow the sequence: contract → tests → implementation.** `specs/openapi.yaml` is law. Write or update tests before writing logic. No exceptions.
4. **Use `task` commands.** Prefer Taskfile targets over ad-hoc shell. If a `task` exists for the operation, use it.

| When you need to… | Use |
| :--- | :--- |
| Sync contracts and generated clients | `task agent:reconcile` |
| Detect schema drift | `task agent:drift` |
| Load a vertical slice for a route | `task agent:slice -- <route>` |
| Validate tests affected by your changes | `task agent:test:impact` |
| Run the full test suite | `task test` |
| Final pre-merge check | `task review` |

5. **Completion gates.** Work is not done until:
   - `task agent:drift` passes — zero schema drift.
   - `task agent:test:impact` passes — targeted tests green.
   - `task review` passes — lint, types, and tests clean.

   When impact is unclear or changes are broad, run `task test` before declaring the work done.

## 5. Directory instruction behavior

Codex may encounter `AGENTS.md` files in subdirectories as it navigates the repo. When it does:

- The nearest `AGENTS.md` narrows behavior for that area of the repo.
- Local instructions add specificity — they do not replace core doctrine or contract/testing rules.
- If a local instruction contradicts a core file, stop: surface the conflict and follow the higher-order doctrine. Do not silently pick one.

## 6. Escalation and safety

Stop and ask before proceeding when you encounter:

- Unclear or underspecified requirements where any assumption would be risky or hard to reverse.
- Broad or high-entropy scope that cannot be safely bounded to a small, sequential plan.
- Contract ambiguity — a gap or conflict in `specs/openapi.yaml` or related specs.
- Any action that is destructive, difficult to reverse, or outside the approved task scope.

When escalating:
- Ask a focused clarifying question, or
- Propose two or three concrete options with trade-offs.
- Do not ask open-ended questions.
- Decompose the work into smaller bounded tasks rather than expanding scope to resolve ambiguity.

Correctness over speed. Minimal changes over sweeping edits. No invented workflows. No hidden assumptions.