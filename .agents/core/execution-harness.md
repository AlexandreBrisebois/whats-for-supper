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
- **`task agent:test:impact`**: Run this to execute only the tests affected by your recent git changes. Use it for rapid, targeted validation during active development.
- **`task test`**: Run this to execute the entire test suite across the API and PWA. Use it as a final verification step.
- **`task review`**: Run this to perform a full pre-commit review, including formatting, linting, type-checking, and testing. Use it before declaring a task complete and ready for merge.

## 4. Agent Toolbox
Each `task` command in Section 3 is backed by a script in `scripts/agent/`. Before debugging a failure or extending a workflow, consult the toolbox to understand what each script does, what problem it solves, and what modes it supports.

→ See [.agents/agent-toolbox.md](../agent-toolbox.md)

## 5. Safe operating rules

- **Never bypass the Taskfile**: If a `task` exists for linting, formatting, or testing, never run the underlying tool directly unless debugging a specific failure that requires isolated execution.
- **Targeted Context Loading**: When loading context to act safely, prioritize targeted commands like `task agent:slice` over recursively reading the file system.
- **Destructive Actions**: Never modify schema or core logic without first verifying the impact using the impact-aware test runner (`task agent:test:impact`) or reviewing drift (`task agent:drift`).

## 6. Completion workflow
Before concluding any implementation phase:
1. Verify contract integrity (`task agent:drift`).
2. Run targeted validation (`task agent:test:impact`).
3. Ensure the codebase passes the standard project review (`task review`).
4. Do not declare work complete until these validation steps succeed.

## 7. Session state files

Two files track active and historical work. Load them only when needed — do not load reflexively.

| File | Holds | When to load | Command |
| :--- | :--- | :--- | :--- |
| `HANDOVER.md` | Active session state: current objectives, next entry points, recently completed work | At the start of a session to orient yourself, or when resolving ambiguity about in-progress work | `task agent:status` |
| `JOURNAL.md` | Historical archive: past session logs, ADRs, technical decisions | Only when a current task requires understanding a past decision not visible in the code or spec | Read directly |

**Rule:** If `HANDOVER.md` answers your question, do not open `JOURNAL.md`.
