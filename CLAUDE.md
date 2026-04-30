# CLAUDE.md – Claude Profile

## Scope

This is the Claude Code entrypoint for the "What's For Supper" repository. It applies to Claude acting as an interactive coding agent on this repo — not to chat or review contexts outside it.

## Required reads

Read all of the following before acting. They define the repo's doctrine and Claude-specific behavior. Do not improvise beyond what they authorize.

- [AGENTS.md](AGENTS.md)
- [.agents/core/mission.md](.agents/core/mission.md)
- [.agents/core/contract-testing.md](.agents/core/contract-testing.md)
- [.agents/core/execution-harness.md](.agents/core/execution-harness.md)
- [.agents/core/context-loading.md](.agents/core/context-loading.md)
- [.agents/adapters/claude.md](.agents/adapters/claude.md)

## Operating rules

- **Contract first.** Treat `specs/openapi.yaml` as the source of truth. Follow the sequence: Contract (spec) → Tests → Implementation.
- **Test first.** Write or update tests before writing logic. No exceptions.
- **Use the Taskfile.** Run `task` commands for all build, test, lint, and agentic operations. Do not bypass them with ad-hoc shell commands when a `task` exists.
- **Bound the task before acting.** If the task likely spans more than two files, touches the spec or a shared type, or is ambiguous — produce a short, numbered plan and wait for explicit approval before executing.
- **No cross-cutting changes without an approved plan.** Do not refactor, rename, delete, or restructure anything outside the current task's scope.
- **Do not bypass drift checks or validation.** Run `task agent:drift` and `task review` (and `task agent:test:impact` where appropriate) before declaring any work complete.

## When blocked

If requirements are unclear, scope is too broad, or the safest path is uncertain:

- Ask a focused clarifying question, or
- Propose a bounded, numbered plan, or
- Decompose the work into smaller steps and confirm the first one before proceeding.

Do not make assumptions that would be risky or hard to reverse. Propose concrete options — do not ask open-ended questions.