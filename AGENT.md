# Universal Agent Protocol (UAP)

This document is the **Source of Truth** for all AI Coding Agents (GitHub Copilot, Gemini, Claude Code, Codex/GPT). It defines the "Zero-Waste" environment rules for this repository.

## 1. Project Identity & Stack
- **Project**: "What's For Supper" (WFS)
- **Architecture**: Vertical Slices (Phases 0-6).
- **Backend**: .NET 10 (C#) Web API.
- **Frontend**: Next.js 15 (TypeScript) PWA.
- **Database**: PostgreSQL with `pgvector` extension.
- **Storage**: NAS-based file system (Synology DS723+).
- **Orchestration**: Modular Docker Compose (`docker/compose/*.yml`) + `Taskfile.yml` (Monorepo Standard).
- **Network Routing**: Traefik-based (`*.wfs.localhost`).
- **Discovery**: Agents MUST use `task health` to verify service availability and `task agent:summary` for mapping.
- **Docker Context**: Run all `docker build` commands from the root to utilize the global `.dockerignore`.
- **Experiments**: The `experiments/` folder is for research/reference only. Do NOT include its contents in production builds or active refactoring unless explicitly requested.

## 2. Project Knowledge Map (Entry Points)
- **Long-term Vision**: [specs/ROADMAP.md](specs/ROADMAP.md) (Future phases).
- **Active Prioritization**: [PLAN.md](PLAN.md) (What's being worked on now).
- **Feature Specs**: [specs/](specs/) directory.
- **Architecture Decisions**: [specs/decisions/](specs/decisions/) (Permanent ADRs).
- **Project Structure**: [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md).
- **Dev Workflow**: [LOCAL_DEV_LOOP.md](LOCAL_DEV_LOOP.md).

## 2. Token Efficiency Rules (Lean Session)
- **Focused entry**: Always start a session by reading [AGENT.md](AGENT.md) and [HANDOVER.md](HANDOVER.md).
- **Modular Paths**: Always check `docker/compose/` for infrastructure and app definitions.
- **Integration Testing**: Use `api.wfs.localhost` and `pwa.wfs.localhost` when testing cross-service communication.
- **Execution Source**: Use [build-prompts/](build-prompts/) for session-specific execution slices.
- **Discovery**: Use `task agent:summary` to rapidly map the workspace before massive `ls` or `grep`.
- **Minimal Context**: Never read more than 500 lines of a file unless necessary for architectural refactoring.

## 3. The Handover Protocol
At the end of every agent turn:
1. Update [HANDOVER.md](HANDOVER.md) with absolute technical detail (DO NOT COMPRESS).
2. Provide a **Session Post-Mortem** coaching feedback to the user regarding token wastage.
3. Call out any new tools added to the `scripts/agent/` toolbox.

## 4. Coding Standards
- **C#**: Use primary constructors, file-scoped namespaces, and .NET 10 features. EF Core is the source of truth for schema.
- **TypeScript**: App Router, Server Components where possible, Zustand for state.
- **Naming**: Use `FamilyMember` consistently (avoid `User` in backend context).

## 6. Interaction & Verification Rules
- **Tool Availability**: If a command (e.g., `task`, `docker`) is unavailable in the agent sandbox but required for verification, **DO NOT** search for brittle workarounds.
- **Mapping the Sandbox**: If you encounter a missing tool:
  - Ask the user to add it to the **Human-Run Tools** list below if it must be run by humans.
  - OR offer to install it within the sandbox if it would benefit future agent autonomy.
- **Explicit Request**: Explicitly ask the USER to run the command in their terminal.
  - Explain **WHY** the command is needed.
  - Explain **EXPECTED** results.
  - Provide a clear copy-paste block for the command.
  - Use the results provided by the user to drive the next step.

### Human-Run Tools (Sandbox Edges)
- `task`: Primary orchestration tool (requires local installation).
- `docker` / `docker compose`: Container runtime (requires local daemon).
- `dotnet watch`: Hot-reload development (best run by human for real-time feedback).
- `npm run dev`: Frontend development (best run by human for real-time feedback).
