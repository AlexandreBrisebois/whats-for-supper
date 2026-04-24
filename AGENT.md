# Universal Agent Protocol (UAP)

Source of Truth for the "What's For Supper" (WFS) project. This is a **Registry**; all procedural logic lives in `.agents/`.

## 1. Project Identity
- **Stack**: .NET 10 (C#), Next.js 15 (TS), PostgreSQL (pgvector).
- **Elite Model**: Parallel Workstreams governed by [Team Orchestrator](.agents/SKILL_TEAM_ORCHESTRATOR.md).

## 2. Core Entry Points
- **Roadmap**: [specs/00_STRATEGY/ROADMAP.md](specs/00_STRATEGY/ROADMAP.md)
- **Active Task**: [HANDOVER.md](HANDOVER.md) (Active only)
- **History**: [JOURNAL.md](JOURNAL.md) (Archives)
- **Execution**: [Taskfile.yml](Taskfile.yml)

## 3. Mandatory Law
1. **Orchestration**: Follow [Team Orchestrator](.agents/SKILL_TEAM_ORCHESTRATOR.md) for all feature work.
2. **Contract-First**: Update [specs/openapi.yaml](specs/openapi.yaml) before API changes. Mock responses auto-generate via Prism ([Contract Engineer](.agents/SKILL_CONTRACT_ENGINEER.md)).
3. **TDD-First**: Write tests before implementation ([Next.js Testing](.agents/SKILL_NEXTJS_TESTING.md)).
4. **Cleanliness**: Perform [Death Audit](.agents/SKILL_DEATH_AUDIT.md) to remove zombie code/docs.
5. **Session Review**: Mandatory audit and [Compaction](.agents/SKILL_SESSION_REVIEW.md) before turn end.

## 4. Skills Library
| Role | Skill File |
| :--- | :--- |
| **Lead / Lead Dev** | [Team Orchestrator](.agents/SKILL_TEAM_ORCHESTRATOR.md) |
| **Architect** | [Contract Engineer](.agents/SKILL_CONTRACT_ENGINEER.md) |
| **PWA Testing** | [Next.js Testing](.agents/SKILL_NEXTJS_TESTING.md) |
| **Backend Dev** | [Senior .NET Developer](.agents/SKILL_DOTNET_DEVELOPER.md) |
| **Frontend Dev** | [Next.js Developer](.agents/SKILL_NEXTJS_DEVELOPER.md) |
| **Planning** | [Build Prompt Creation](.agents/SKILL_CREATE_PROMPT.md) |
| **Audit** | [Session Review & Compaction](.agents/SKILL_SESSION_REVIEW.md) |
| **Cleanup** | [Death Audit (Kill Zombies)](.agents/SKILL_DEATH_AUDIT.md) |
| **Designer** | [Designer Agent (The Mère-Designer)](.agents/SKILL_DESIGNER.md) |
| **Stress-Test** | [Shared Understanding (Grill Me)](.agents/SKILL_SHARED_UNDERSTANDING.md) |

## 5. Environment
- Use absolute paths for `dotnet`, `task`, `docker` if $PATH fails.
- Entry point: `task -l`.
