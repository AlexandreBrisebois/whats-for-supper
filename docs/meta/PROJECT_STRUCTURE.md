# What's For Supper - Project Structure

Comprehensive monorepo structure optimized for AI agent coordination and lean development.

## Root Directory Tree

```
whats-for-supper/
│
├── AGENT.md                          # Universal Agent Protocol (Master reference)
├── HANDOVER.md                       # Tactical execution journal (Baton pass)
├── README.md                         # Human-centric project overview
├── Taskfile.yml                      # Automation center (task health, task up)
├── .env                              # Local overrides (git-ignored)
├── .env.example                      # Template for all available variables
│
├── docker/                           # Orchestration Center
│   └── compose/
│       ├── infrastructure.yml        # Traefik, PostgreSQL, Redis, etc.
│       ├── apps.yml                  # PWA, API, Ollama, etc.
│       ├── production.yml            # Production/NAS configuration
│       ├── ci-overrides.yml          # GitHub Actions overrides
│       └── traefik_dynamic.yml       # Static routing overrides
│
├── api/                              # Backend API (.NET 10)
│   ├── Migrations/                   # EF Core source of truth (Authored via API)
│   ├── src/
│   │   ├── RecipeApi/                # Web API source
│   │   └── RecipeApi.Tests/          # xUnit tests
│   └── Dockerfile
│
├── pwa/                              # Frontend PWA (Next.js 15)
│   ├── src/                          # App Router, Components, Hooks
│   ├── e2e/                          # Playwright E2E tests
│   └── Dockerfile
│
├── docs/                             # Documentation & Metadata
│   ├── meta/                         # Project meta-docs
│   │   ├── PROJECT_STRUCTURE.md      # (This file)
│   │   ├── LOCAL_DEV_LOOP.md         # Detailed dev guide
│   │   └── CONTRIBUTING.md           # PR & Coding standards
│   └── DEVELOPER_GUIDE.md            # Primary onboarding guide 
│
├── specs/                            # Feature specifications & ADRs
│   ├── ROADMAP.md                    # Long-term product vision
│   ├── decisions/                    # Permanent Architectural Decision Records
│   └── [feature].spec.md             # Vertical slice specifications
│
├── build-prompts/                    # Executable session slices
│   └── phase-[X]/                    # Phase-specific execution prompts
│
├── scripts/                          # Root-level utility scripts
│   └── agent/                        # AI-only discovery tools
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
                 │ HTTP :80
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
        └─────────────────┘
```

## Discovery Rules
- **Agents**: Always use `task health` to verify the ecosystem and `task agent:summary` to map the workspace.
- **Migrations**: `api/Migrations/` is the authoritative source for schema changes.
- **Paths**: All Docker commands MUST be run from the project root.
