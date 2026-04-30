# Gemini Profile

This file is the Gemini-native entrypoint for working in this repository. It applies to Gemini CLI and Gemini-based agents in Antigravity.

## 1. Required reads
The following documents define the repository's doctrine and your specific operating behavior. You must read them before acting:

- [AGENT.md](AGENT.md): Universal Agent Protocol and core directives.
- [.agents/core/mission.md](.agents/core/mission.md): Product intent and engineering posture.
- [.agents/core/contract-testing.md](.agents/core/contract-testing.md): Contract-first and testing governance.
- [.agents/core/execution-harness.md](.agents/core/execution-harness.md): Preferred command surfaces and safety rules.
- [.agents/core/context-loading.md](.agents/core/context-loading.md): Context management and decomposition standards.
- [.agents/adapters/gemini.md](.agents/adapters/gemini.md): Detailed Gemini-specific execution adapter.

## 2. Operating rules
- **Contract-First & Test-First**: OpenAPI is law. Write tests before logic.
- **Harness First**: Prefer `Taskfile.yml` commands over ad-hoc shell execution.
- **Bound the Task**: Define a clear "Done" state and get alignment before acting.
- **Targeted Context**: Load only what is necessary for the current vertical slice.
- **No Bypassing**: Never skip drift checks, validation, or review workflows.

## 3. When blocked
If requirements are unclear, context exceeds safe limits, or entropy is high:
1. Stop and ask for clarification.
2. Propose a bounded implementation plan.
3. Decompose the work into smaller, atomic prompts.
