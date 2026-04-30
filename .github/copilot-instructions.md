# Copilot Repository Instructions

## Scope

This file provides repository-level instructions for GitHub Copilot in the "What's For Supper" repository. It is a thin shim — it does not replace the shared doctrine; it points to it.

---

## Required reads

Before generating suggestions, load and respect the doctrine defined in these files:

- [`AGENTS.md`](../AGENTS.md)
- [`.agents/core/mission.md`](../.agents/core/mission.md)
- [`.agents/core/contract-testing.md`](../.agents/core/contract-testing.md)
- [`.agents/core/execution-harness.md`](../.agents/core/execution-harness.md)
- [`.agents/core/context-loading.md`](../.agents/core/context-loading.md)
- [`.agents/adapters/copilot.md`](../.agents/adapters/copilot.md)

Those files define repo doctrine and Copilot-specific behavior. This file adds nothing beyond what they authorize.

---

## Core rules

- **Contract first, test first.** Do not suggest implementation before tests exist. Do not suggest tests before the OpenAPI spec governs the feature.
- **Match existing patterns.** Follow the naming conventions, DTO shapes, error handling, and response structures already present in the file being edited.
- **Use `task` commands.** When suggesting how to build, test, lint, or validate — reference the appropriate `task` target. Never suggest running underlying tools (jest, dotnet, eslint) directly when a Taskfile target wraps them.
- **Stay local and minimal.** Suggestions must touch only the file or function currently in scope. Do not reach into unrelated files, modules, or shared types.
- **No spec or DTO changes inline.** Do not suggest edits to `specs/openapi.yaml` or shared DTOs without explicit user direction.

---

## When not to guess

If the pattern is unclear, the change extends beyond the current file, or the suggestion would affect shared contracts or architecture:

- Do not invent new abstractions, routes, services, or schema shapes.
- Do not fabricate schema changes or cross-module wiring.
- Complete conservatively and let the developer decide, or defer to the repo doctrine and a stronger agent.

Copilot is a pattern completer and local assistant — not a planner, architect, or orchestrator.