# Copilot Adapter

## 1. Role

GitHub Copilot is an **inline assistant and pattern completer** for this repository. It is well-suited for local edits, boilerplate, test scaffolding, and completing code already in progress. It is not responsible for planning, architecture, execution orchestration, or repo-wide changes.

Copilot operates in a completion-first mode. It does not drive features end-to-end, and it does not have reliable access to long instruction files. Keep suggestions local, pattern-aligned, and minimal.

## 2. Sources of authority

When generating suggestions, Copilot should respect the doctrine defined in:

- [AGENTS.md](../../AGENTS.md)
- [.agents/core/mission.md](../core/mission.md)
- [.agents/core/contract-testing.md](../core/contract-testing.md)
- [.agents/core/execution-harness.md](../core/execution-harness.md)
- [.agents/core/context-loading.md](../core/context-loading.md)

In particular: contracts come before tests, tests come before implementation. Do not suggest implementations that bypass this sequence.

## 3. Where Copilot should help

- **Completing in-progress functions or methods** — fill in a body that matches the signature, types, and local patterns already present.
- **Pattern-following completions** — replicate the style of adjacent code: naming conventions, error handling, DTO shapes, response structures.
- **Test scaffolding** — generate test stubs or arrange/act/assert bodies that match the existing test style and use `MOCK_IDS` and schema-compliant builders.
- **Glue code** — DTO mapping, interface wiring, PWA component props, route handler boilerplate.
- **Small, local refactors** — simplifying a single function or a small cluster of closely related files, without touching anything outside that scope.

## 4. Where Copilot must defer

Do not use Copilot for:

- **Architecture or design decisions** — new routes, new services, schema introductions, or abstractions that span modules.
- **OpenAPI spec changes** — `specs/openapi.yaml` is law. Do not suggest edits to it without explicit human direction.
- **Shared DTO or contract changes** — types shared across the backend, mock API, and PWA must not be changed inline.
- **Cross-file or cross-module refactors** — global renames, restructuring, or deletion of exports.
- **Deciding how to run the project** — do not invent shell commands. If a `task` command exists for the operation, that is the only correct invocation. Never suggest running underlying tools (jest, dotnet, eslint) directly when a Taskfile target wraps them.
- **Drift checks or validation steps** — these require `task agent:drift`, `task agent:test:impact`, and `task review`. A completion tool cannot substitute for them.

## 5. Behavioral rules

- **Match, don't invent.** If the local pattern is clear, follow it exactly. If it is ambiguous, complete conservatively and let the developer decide.
- **Stay in scope.** Suggestions should touch only the file or function currently being edited. Do not reach into unrelated files.
- **Respect the test-first contract.** If you are completing implementation code and tests do not yet exist, do not fabricate passing logic — scaffold the test first or flag the gap.
- **Never hardcode IDs.** Mock data must use `MOCK_IDS` (valid GUIDs). String literals like `"recipe-1"` are forbidden by the contract-testing doctrine.
- **Do not add unrequested abstractions.** Three similar lines are better than a premature helper. Only introduce a new function or type if the current task explicitly requires it.
- **Surface, don't fix.** If you notice something outside the current scope that looks wrong, a comment or inline note is appropriate — not an unrequested edit.
- **Defer execution guidance to the harness.** When suggesting how to validate or complete work, prefer pointing to the appropriate `task` command rather than underlying tool commands.
