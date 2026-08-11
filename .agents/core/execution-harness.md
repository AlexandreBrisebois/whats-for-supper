# Execution Harness

## 1. Execution principle
Do not reinvent established workflows. If a task can be accomplished using an existing project command, use that command instead of creating ad-hoc shell scripts or running bare terminal commands. Operations must remain predictable, trackable, and aligned with the repository's native automation.

## 2. Preferred execution surface
The primary interface for all automation, building, testing, and agentic workflows is the `Taskfile.yml`. Before attempting any operation, verify if a relevant `task` command already exists. Relying on the Taskfile ensures consistency, leverages pre-configured environment variables, and minimizes destructive side effects.

## 3. Key agent commands
Use the following canonical commands to perform regular operational duties safely:

- **`task agent:reconcile`**: Run this to reconcile the OpenAPI Specification, Mock API, and Backend implementation. Use it when creating or updating API contracts.
- **`task agent:drift`**: Run this to check for schema drift across endpoints, backend DTOs, and frontend mocks. Use it to ensure absolute contract integrity before finalizing a feature.
- **`task agent:slice -- <route>`**: Run this to view a vertical slice of a specific route (Contract ↔ Backend ↔ Client). Use it during planning or debugging to understand the full data flow of a feature.
- **`task gate`**: Run this for a high-speed developer loop (lint + typecheck + impacted tests). It automatically clears lingering processes via `dev:kill` and `test:kill`.
- **`task dev:kill`**: Run this manually if you encounter "port already in use" errors or strange flakiness.
- **`task test:kill`**: Run this manually to clear zombie Playwright workers.
- **`task agent:test:impact`**: Run this to execute only the tests affected by your recent git changes.
- **`task agent:finish`**: Run this once for final completion. It owns impact → drift → review ordering and safely reuses an unchanged successful impact result.
- **`task agent:audit AREA=<keyword>`**: Run this to identify tests, analyze migration candidates, and detect brittle selectors for a specific feature area.
- **`task review`**: Run this for a full pre-commit review. Like `gate`, it clears lingerng processes before starting.
- **Timeout handling**: A harness child that reports a timeout has already been stopped. Do not retry it automatically. Use its diagnostic to correct permissions/runtime or ask for one focused user action.

## 4. Agent Toolbox
Each `task` command in Section 3 is backed by a script in `scripts/agent/`. Before debugging a failure or extending a workflow, consult the toolbox to understand what each script does, what problem it solves, and what modes it supports.

→ See [.agents/agent-toolbox.md](../agent-toolbox.md)

## 5. Safe operating rules

- **Strict Isolation**: All E2E tests are isolated via global API mocking. Any unhandled API call will fail the test. Never use `route.continue()` in mocks.
- **Never bypass the Taskfile**: If a `task` exists for linting, formatting, or testing, never run the underlying tool directly unless debugging a specific failure that requires isolated execution.
- **Targeted Context Loading**: When loading context to act safely, prioritize targeted commands like `task agent:slice` over recursively reading the file system.
- **Destructive Actions**: Never modify schema or core logic without first verifying the impact using `task gate` or `task agent:drift`.

## 6. Pre-Implementation Audit
Before starting a new feature or refactoring:
1. Run `task agent:audit AREA=<feature>` to identify the relevant test surface.
2. Address any flagged brittle selectors (`data-testid` migration) in the existing tests first to establish a stable green baseline.
3. Review migration candidates — if a logic-heavy E2E test is flagged, prioritize moving that logic to a Vitest unit test.

## 7. Completion workflow
Before concluding any implementation phase:
1. Use `task gate` during implementation when broad validation is warranted.
2. Run `task agent:finish` exactly once on the final worktree state.
3. Run a final `task agent:audit` when the task changes E2E selectors.
4. Do not declare work complete until the applicable validation steps succeed.

## 7. Session state files

Two files track active and historical work. Load them only when needed — do not load reflexively.

| File | Holds | When to load | Command |
| :--- | :--- | :--- | :--- |
| `HANDOVER.md` | Active session state: current objectives, next entry points, recently completed work | At the start of a session to orient yourself, or when resolving ambiguity about in-progress work | `task agent:status` |
| `JOURNAL.md` | Historical archive: past session logs, ADRs, technical decisions | Only when a current task requires understanding a past decision not visible in the code or spec | Read directly |

**Rule:** If `HANDOVER.md` answers your question, do not open `JOURNAL.md`.
