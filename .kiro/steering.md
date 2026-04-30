# Kiro Steering

## 1. Role

Kiro is a **spec-driven feature worker** for this repository. It translates clear, bounded requirements into implementation by following the repo's doctrine and contracts — not by inventing new patterns or driving the overall roadmap.

Kiro operates feature by feature. It does not span multiple features in a single session, does not make architectural decisions unprompted, and is always subordinate to the shared core doctrine.

---

## 2. Sources of authority

The following documents govern all Kiro behavior. Read them before acting. Feature specs in `.kiro/specs/` must align with these sources — they cannot override them.

- [AGENTS.md](../AGENTS.md)
- [.agents/core/mission.md](../.agents/core/mission.md)
- [.agents/core/contract-testing.md](../.agents/core/contract-testing.md)
- [.agents/core/execution-harness.md](../.agents/core/execution-harness.md)
- [.agents/core/context-loading.md](../.agents/core/context-loading.md)

**Authority order:** `specs/openapi.yaml` → feature spec → tests → implementation.

When a feature spec conflicts with the OpenAPI contract or core doctrine, the contract and doctrine win. Flag the conflict rather than resolving it silently.

---

## 3. Spec usage

Each feature spec in `.kiro/specs/` is a **bounded unit of work**. Treat it as a scoped plan, not a comprehensive design document.

A well-formed feature spec should:
- State the intent clearly and concisely.
- Reference the relevant OpenAPI routes and contracts it depends on.
- Break the work into tasks at a reasonable granularity — small enough to execute sequentially, specific enough to have a clear definition of done.

When working with a feature spec, Kiro should:
- Refine it only as much as needed to begin execution — do not over-specify before starting.
- Keep the spec synchronized with the actual implementation and contracts as work progresses.
- Not inflate a spec into a catch-all document; if scope grows, split it.

---

## 4. Task execution

Bind to the execution harness defined in [`.agents/core/execution-harness.md`](../.agents/core/execution-harness.md). Use `task` commands as the primary interface for all build, test, lint, and validation operations.

Work through a feature spec **one task at a time**. Do not attempt to implement an entire feature in a single pass.

| When you need to… | Use |
| :--- | :--- |
| Create or update an API contract | `task agent:reconcile` |
| Understand a route's full data flow | `task agent:slice -- <route>` |
| Check for schema drift | `task agent:drift` |
| Validate only what your changes affect | `task agent:test:impact` |
| Run the full test suite | `task test` |
| Final pre-merge review | `task review` |

**Never invent shell commands** when a `task` target exists. Never skip the completion workflow:

1. `task agent:drift` — zero drift confirmed.
2. `task agent:test:impact` — targeted tests pass for the affected changes.
3. `task review` — formatting, linting, type-check, and tests pass.

When impact is uncertain or changes are broad, escalate to a full test run (`task test`) before considering the work complete.

A spec task is not done until these checks pass. The full Definition of Done is in [`.agents/core/contract-testing.md`](../.agents/core/contract-testing.md).

---

## 5. Context and credit discipline

Follow [`.agents/core/context-loading.md`](../.agents/core/context-loading.md) strictly. Credit is finite; load only what the current task requires.

**Load per task:**
1. The current feature spec and its active task.
2. The relevant OpenAPI contracts and routes.
3. The directly impacted source files (prefer `task agent:slice` over broad filesystem reads).
4. Selective history only when resolving ambiguity about a past decision.

**Do not load:**
- Unrelated feature specs or routes.
- History files (JOURNAL.md, HANDOVER.md) reflexively.
- The full repository tree to orient yourself.

Between tasks, **summarize and narrow** the active context rather than carrying forward everything from the previous step. If a task requires loading more context than is reasonable to fit cleanly, decompose the task rather than expanding the context window.
