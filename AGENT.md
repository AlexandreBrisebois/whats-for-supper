# Universal Agent Protocol (UAP)

This document is the **Source of Truth** for all AI Coding Agents (GitHub Copilot, Gemini, Claude Code, Codex/GPT). It defines the "Zero-Waste" environment rules for this repository.

## 1. Project Identity & Stack
- **Project**: "What's For Supper" (WFS)
- **Architecture**: Vertical Slices (Phases 0-#).
- **Backend**: .NET 10 (C#) Web API.
- **Frontend**: Next.js 15 (TypeScript) PWA.
- **Database**: PostgreSQL with `pgvector` extension.
- **Orchestration**: Modular Docker Compose (`docker/compose/*.yml`) + `Taskfile.yml`.
- **Infrastructure**: All orchestration lives in `docker/`. The root remains a clean entry point.

## 2. Mandatory Shell Environment
Agents MUST ensure these paths are available or use absolute paths for tools:
```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/local/share/dotnet:/Users/alex/.dotnet/tools:$PATH"
```
| Tool | Absolute Path |
| :--- | :--- |
| `dotnet` | `/usr/local/share/dotnet/dotnet` |
| `task` | `/opt/homebrew/bin/task` |
| `docker` | `/usr/local/bin/docker` |
| `dotnet-ef` | `/Users/alex/.dotnet/tools/dotnet-ef` |

## 3. MANDATORY: Interaction & Verification Rules
If a command (e.g., `task build`) fails due to environment issues (missing tool, Docker daemon down):
1. **DO NOT** search for brittle workarounds.
2. **Explicitly ask the USER** to run the command or fix the environment.
3. **Format the Request**:
   - **WHY**: Explain the necessity of the command.
   - **EXPECTED**: Describe the success criteria.
   - **CODE**: Provide a clear copy-paste block.
   - **STOP**: Wait for the user to provide the output.

### Human-Run Tools (Sandbox Edges)
- `task`: Primary orchestration.
- `docker`: Container runtime (Requires local daemon).
- `dotnet watch` / `npm run dev`: Hot-reload (Best run by human).

## 4. Token Efficiency Rules
- **Session Kickoff**: Internalize this protocol first, then establish current technical state by reading `HANDOVER.md`.
- **Discovery**: Use `task agent:summary` to rapidly map the workspace before massive `ls` or `grep`.
- **Lazy Context**: Only load Skills from `.agents/` when explicitly performing those tasks.

## 5. Knowledge Map (Entry Points)
- **Active Prioritization**: [PLAN.md](PLAN.md) (Current Work).
- **Handover History**: [HANDOVER.md](HANDOVER.md).
- **Skills Library** (Procedural Logic):
  - [Database & Migrations](.agents/SKILL_DATABASE.md)
  - [API Discovery & Mapping](.agents/SKILL_API_DISCOVERY.md)
  - [E2E & Integration Testing](.agents/SKILL_TESTING.md)
  - [Build Prompt Creation](.agents/SKILL_CREATE_PROMPT.md)
  - [Session Review & Audit](.agents/SKILL_SESSION_REVIEW.md)
- **Architecture**: [specs/](specs/) and [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md).

## 6. MANDATORY: The Handover Protocol
Failure to perform a session audit is a protocol violation.
1.At the end of every agent turn, you MUST ask the use if they want to review the session.
2. When the user agrees, you MUST execute the **[Session Review & Audit](.agents/SKILL_SESSION_REVIEW.md)** protocol.
3. Ensure [HANDOVER.md](HANDOVER.md) is updated with absolute technical detail.
