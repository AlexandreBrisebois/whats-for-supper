# Universal Agent Protocol (UAP)

This document is the primary instruction set for AI agents working on the "What's For Supper" (WFS) project. It serves as the **Operational Registry**. All specific logic, workflows, and personas are defined in the `.agents/` directory.

## 1. Project Mission & Identity
**Primary Mission**: Build a premium, high-performance Meal Planning Progressive Web App (PWA) using a contract-first, test-driven approach.
- **Stack**: .NET 10 (Backend), Next.js 15 (Frontend), PostgreSQL with pgvector (Database).
- **Core Principle**: Zero-tolerance for "zombie code", schema drift, or untested features.

## 2. Primary Operational Directives (Mandatory)
These directives are non-negotiable and must be followed in every turn.

1.  **Planning & Alignment**: Before taking any action (other than research), you **MUST** evaluate if the task warrants an Implementation Plan. If it does, you **MUST** create one and obtain explicit user approval before execution. Use the [Team Orchestrator](.agents/SKILL_TEAM_ORCHESTRATOR.md) to manage this workflow. **If the user provides a pre-prepared Implementation Plan or Build Prompt, acknowledge it as the source of truth and proceed directly to execution mapping.**
2.  **State Initialization**: Every session must begin by reading [HANDOVER.md](HANDOVER.md) to understand the active task and [specs/00_STRATEGY/ROADMAP.md](specs/00_STRATEGY/ROADMAP.md) for context.
3.  **Contract-First Development**: You must update [specs/openapi.yaml](specs/openapi.yaml) before making any changes to the API or Frontend models. Use the [Contract Engineer](.agents/SKILL_CONTRACT_ENGINEER.md) skill.
4.  **Test-Driven Development**: You must write or update tests before implementing logic. Refer to [Next.js Testing](.agents/SKILL_NEXTJS_TESTING.md).
5.  **Orchestration Logic**: All feature work must follow the multi-phase workflow defined in the [Team Orchestrator](.agents/SKILL_TEAM_ORCHESTRATOR.md).
6.  **Schema Integrity**: Before merging or completing a task, run `task agent:reconcile` to ensure parity between the OpenAPI Specification, Mock API, and Backend implementation.
7.  **Code Hygiene**: Conduct a [Death Audit](.agents/SKILL_DEATH_AUDIT.md) regularly to remove unused code, deprecated documentation, or "zombie" components.
8.  **Atomic Delegation**: If a task involves high entropy, architectural ambiguity, or exceeds the optimal context for your model (Flash/Haiku), you **MUST** use [SKILL_CREATE_PROMPT.md](.agents/SKILL_CREATE_PROMPT.md) to decompose work into atomic "Build Prompts" for sub-agent execution or sequential turns.
9.  **Turn-End Compaction**: Before ending your turn, you must perform a session review and update [JOURNAL.md](JOURNAL.md) and [HANDOVER.md](HANDOVER.md) using the [Session Review](.agents/SKILL_SESSION_REVIEW.md) skill.

## 3. Core State Registry
| Resource | Purpose | Path |
| :--- | :--- | :--- |
| **Strategy** | Long-term goals and architecture. | [specs/00_STRATEGY/ROADMAP.md](specs/00_STRATEGY/ROADMAP.md) |
| **Active Task** | Current focus and immediate next steps. | [HANDOVER.md](HANDOVER.md) |
| **History** | Chronological log of decisions and changes. | [JOURNAL.md](JOURNAL.md) |
| **Automation** | Entry point for all project commands. | [Taskfile.yml](Taskfile.yml) |
| **Toolbox** | Registry of agent-specific helper scripts. | [.agents/AGENT_TOOLBOX.md](.agents/AGENT_TOOLBOX.md) |

## 4. Skills & Roles
When performing a specific role, you must load and follow the instructions in the corresponding skill file.

| Scenario / Role | Primary Skill File |
| :--- | :--- |
| **Managing Workflow / Lead Dev** | [.agents/SKILL_TEAM_ORCHESTRATOR.md](.agents/SKILL_TEAM_ORCHESTRATOR.md) |
| **Designing API / Architect** | [.agents/SKILL_CONTRACT_ENGINEER.md](.agents/SKILL_CONTRACT_ENGINEER.md) |
| **Building Frontend / UI Dev** | [.agents/SKILL_NEXTJS_DEVELOPER.md](.agents/SKILL_NEXTJS_DEVELOPER.md) |
| **Building Backend / .NET Dev** | [.agents/SKILL_DOTNET_DEVELOPER.md](.agents/SKILL_DOTNET_DEVELOPER.md) |
| **Visual Design / UX** | [.agents/SKILL_DESIGNER.md](.agents/SKILL_DESIGNER.md) |
| **Testing / Quality Assurance** | [.agents/SKILL_NEXTJS_TESTING.md](.agents/SKILL_NEXTJS_TESTING.md) |
| **Cleanup / Auditing** | [.agents/SKILL_DEATH_AUDIT.md](.agents/SKILL_DEATH_AUDIT.md) |
| **Drafting Build Prompts** | [.agents/SKILL_CREATE_PROMPT.md](.agents/SKILL_CREATE_PROMPT.md) |
| **Stress-Test / Shared Understanding** | [.agents/SKILL_SHARED_UNDERSTANDING.md](.agents/SKILL_SHARED_UNDERSTANDING.md) |
| **End of Session Review** | [.agents/SKILL_SESSION_REVIEW.md](.agents/SKILL_SESSION_REVIEW.md) |

## 5. Execution Environment
- **Command Discovery**: Use `task -l` to list all available automation commands.
- **Path Resolution**: If standard commands fail, use absolute paths for `dotnet`, `task`, and `docker`.
- **Tooling**: Refer to [.agents/AGENT_TOOLBOX.md](.agents/AGENT_TOOLBOX.md) for custom agent scripts (e.g., `api_tools.py`, `slice.py`).
