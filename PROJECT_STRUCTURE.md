# What's For Supper - Project Structure

Comprehensive monorepo structure optimized for AI agent coordination and lean development.

## Root Directory Tree

```
whats-for-supper/
│
├── AGENT.md                          # Universal Agent Protocol (Master reference)
├── HANDOVER.md                       # Tactical execution journal (Baton pass)
├── README.md                         # Human-centric project overview
├── PROJECT_STRUCTURE.md              # (This file) Architecture & Tree
├── PLAN.md                           # Active prioritization & Roadmap
├── LOCAL_DEV_LOOP.md                 # Detailed development guide
├── Taskfile.yml                      # Automation center (task health, task up, task build)
│
├── docker/                           # Orchestration Center
│   ├── .env.example                  # Template for all infrastructure variables
│   ├── .env                          # Local orchestration overrides (git-ignored)
│   └── compose/
│       ├── infrastructure.yml        # Traefik, PostgreSQL (pgvector), etc.
│       ├── apps.yml                  # PWA, API, Ollama (Agent endpoints), etc.
│       ├── production.yml            # Production/NAS configuration
│       ├── ci-overrides.yml          # GitHub Actions overrides
│       └── traefik_dynamic.yml       # Static routing overrides
│
├── api/                              # Backend API (.NET 10)
│   ├── RecipeApi.csproj              # Main project file
│   ├── Migrations/                   # EF Core source of truth
│   ├── src/
│   │   ├── RecipeApi/                # Web API source
│   │   │   ├── Services/Agents/      # AI Intelligence (RecipeExtraction, RecipeHero)
│   │   │   └── ...
│   │   └── RecipeApi.Tests/          # xUnit tests
│   └── Dockerfile
│
├── pwa/                              # Frontend PWA (Next.js 15)
│   ├── .env.local.example            # PWA-specific env template
│   ├── src/                          # App Router, Components, Hooks
│   │   ├── lib/api/                  # API Clients (client, server-client)
│   │   └── ...
│   ├── e2e/                          # Playwright E2E tests
│   └── Dockerfile
│
├── docs/                             # Documentation & Reference
│   └── [feature]_walkthrough.md      # Feature-specific guides
│
│
├── specs/                            # Feature specifications & ADRs
│   ├── ROADMAP.md                    # Long-term product vision
│   ├── decisions/                    # Permanent Architectural Decision Records
│   └── [feature].spec.md             # Vertical slice specifications (Phase 0-6)
│
├── build-prompts/                    # Executable session slices
│   └── phase-[X]/                    # Phase-specific execution prompts for agents
│
├── scripts/                          # Project utility scripts
│   └── agent/                        # AI-only discovery & mapping tools
│
├── experiments/                      # Research & Reference (Ignore for production)
└── .github/                          # GitHub configuration (CI/CD)
    └── workflows/                    # test.yml, build.yml, deploy.yml
```

## Service Dependencies (Internal Network)

```
┌─────────────────────────────────┐
│         User (Browser)          │
└────────────────┬────────────────┘
                 │ HTTP :80 (Traefik)
┌────────────────▼────────────────┐
│      Traefik (Reverse Proxy)     │
└──────┬──────────────────┬───────┘
       │ Host: pwa...     │ Host: api...
┌──────▼───────┐   ┌──────▼───────┐
│ PWA (Next.js)│   │ API (.NET 10)│
└──────┬───────┘   └──────┬───────┘
       │                  │ TCP :5432
       └─────────┬────────┘
        ┌────────▼────────┐
        │   PostgreSQL    │
        │   (pgvector)    │
        └─────────────────┘
```

## Discovery Rules
- **Agents**: Always use `task health` to verify the ecosystem and `task agent:summary` to map the workspace.
- **Environment**: Infrastructure variables live in `docker/.env`. PWA-specific overrides live in `pwa/.env.local`.
- **Migrations**: `api/Migrations/` is the authoritative source for schema changes.
- **Paths**: All infrastructure commands (Task, Docker) MUST be run from the project root.
