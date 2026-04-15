# What's For Supper - Project Structure

Comprehensive monorepo structure for the entire solution across all phases.

## Root Directory Tree

```
whats-for-supper/
│
├── .github/                          # GitHub configuration
│   ├── workflows/                    # CI/CD pipelines
│   │   ├── test.yml                  # Run tests on PR
│   │   ├── build.yml                 # Build containers on merge
│   │   └── deploy.yml                # Deploy to staging/prod
│   └── ISSUE_TEMPLATE/
│       └── bug.md
│
├── api/                              # Backend API (C#/.NET)
│   ├── src/
│   │   ├── RecipeApi/
│   │   │   ├── Program.cs            # App startup, DI config
│   │   │   ├── appsettings.json      # Config (dev/prod)
│   │   │   │
│   │   │   ├── Controllers/          # API endpoints
│   │   │   │   ├── FamilyController.cs
│   │   │   │   ├── RecipeController.cs
│   │   │   │   ├── PlannerController.cs (Phase 2+)
│   │   │   │   ├── DiscoveryController.cs (Phase 3+)
│   │   │   │   └── HealthController.cs
│   │   │   │
│   │   │   ├── Services/             # Business logic
│   │   │   │   ├── FamilyService.cs
│   │   │   │   ├── RecipeService.cs
│   │   │   │   ├── ImageService.cs
│   │   │   │   ├── TourService.cs     # Hint tour completion tracking
│   │   │   │   └── ValidationService.cs
│   │   │   │
│   │   │   ├── Models/               # Domain entities
│   │   │   │   ├── FamilyMember.cs
│   │   │   │   ├── Recipe.cs
│   │   │   │   ├── RecipeMetadata.cs
│   │   │   │   └── TourCompletion.cs
│   │   │   │
│   │   │   ├── Data/                 # Database context & migrations
│   │   │   │   ├── RecipeDbContext.cs
│   │   │   │   ├── Migrations/
│   │   │   │   │   ├── 20260401_InitialSchema.cs
│   │   │   │   │   ├── 20260415_AddCompletedTours.cs
│   │   │   │   │   └── ...
│   │   │   │   └── Seeds/            # Test data
│   │   │   │
│   │   │   ├── Dto/                  # Request/Response DTOs
│   │   │   │   ├── CreateRecipeDto.cs
│   │   │   │   ├── RecipeResponseDto.cs
│   │   │   │   └── FamilyMemberDto.cs
│   │   │   │
│   │   │   ├── Middleware/           # Custom middleware
│   │   │   │   ├── ErrorHandlingMiddleware.cs
│   │   │   │   └── RequestLoggingMiddleware.cs
│   │   │   │
│   │   │   ├── Exceptions/           # Custom exceptions
│   │   │   │   ├── AppException.cs
│   │   │   │   ├── ValidationException.cs
│   │   │   │   └── NotFoundException.cs
│   │   │   │
│   │   │   └── Utils/
│   │   │       ├── ImageValidator.cs
│   │   │       └── StorageHelper.cs
│   │   │
│   │   └── RecipeApi.Tests/          # Unit + integration tests
│   │       ├── Services/
│   │       ├── Controllers/
│   │       └── appsettings.test.json
│   │
│   ├── Dockerfile                    # API container image
│   ├── .dockerignore
│   ├── RecipeApi.csproj              # Project file
│   └── README.md                     # API setup guide
│
├── pwa/                              # Frontend PWA (Next.js/TypeScript)
│   ├── src/
│   │   ├── app/                      # Next.js app router
│   │   │   ├── (auth)/
│   │   │   ├── (app)/
│   │   │   ├── api/
│   │   │   └── globals.css
│   │   │
│   │   ├── components/               # React components (by feature)
│   │   │   ├── hints/
│   │   │   ├── identity/
│   │   │   ├── capture/
│   │   │   ├── ui/
│   │   │   └── ...
│   │   │
│   │   ├── hooks/                    # Custom hooks
│   │   ├── store/                    # Zustand stores
│   │   ├── lib/                      # Utilities
│   │   ├── locales/                  # i18n translations (en, fr, etc)
│   │   ├── types/                    # TypeScript types
│   │   ├── context/                  # React context (if needed)
│   │   ├── middleware.ts             # Next.js middleware
│   │   └── env.d.ts                  # Env vars type definitions
│   │
│   ├── public/                       # Static assets
│   │   ├── icons/
│   │   ├── images/
│   │   └── manifest.json
│   │
│   ├── .env.example
│   ├── .env.local (gitignored)
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   ├── Dockerfile
│   ├── .dockerignore
│   └── README.md
│
├── workers/                          # Background job processors
│   ├── import-worker/                # Phase 1: Recipe import (image → metadata)
│   │   ├── src/
│   │   │   ├── Program.cs
│   │   │   ├── Services/
│   │   │   │   ├── ImageProcessor.cs
│   │   │   │   ├── MetadataExtractor.cs
│   │   │   │   └── HeroImageGenerator.cs
│   │   │   └── Models/
│   │   │
│   │   ├── Dockerfile
│   │   └── README.md
│   │
│   ├── calendar-sync-worker/         # Phase 4: Calendar integration
│   │   ├── src/
│   │   │   ├── Program.cs
│   │   │   ├── Services/
│   │   │   │   ├── CalendarSyncService.cs
│   │   │   │   └── SyncStateManager.cs
│   │   │   └── Models/
│   │   │
│   │   ├── Dockerfile
│   │   └── README.md
│   │
│   └── shared-worker-lib/            # Shared code for all workers
│       ├── src/
│       │   ├── RedisClient.cs
│       │   ├── DatabaseContext.cs
│       │   ├── Logging.cs
│       │   └── Models/
│       │
│       └── SharedWorker.csproj
│
├── infrastructure/                   # Docker & deployment configs
│   ├── docker/
│   │   ├── postgres.dockerfile       # Optional: custom postgres image
│   │   ├── redis.dockerfile          # Optional: custom redis image
│   │   └── nginx.dockerfile          # Reverse proxy (future)
│   │
│   ├── docker-compose.yml            # Phase 0: postgres + api + pwa
│   ├── docker-compose.phase1.yml     # Phase 1: add redis + import-worker
│   ├── docker-compose.phase2.yml     # Phase 2: add ollama
│   ├── docker-compose.prod.yml       # Production config
│   │
│   ├── nginx/
│   │   └── nginx.conf                # Reverse proxy config (future)
│   │
│   ├── k8s/                          # Kubernetes manifests (future)
│   │   ├── namespace.yaml
│   │   ├── api-deployment.yaml
│   │   ├── pwa-deployment.yaml
│   │   └── ...
│   │
│   └── scripts/
│       ├── setup.sh                  # Initial setup script
│       ├── migrate.sh                # Run migrations
│       ├── seed.sh                   # Populate test data
│       └── health-check.sh
│
├── database/                         # Database schemas & migrations
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_add_pgvector.sql
│   │   ├── 003_add_completed_tours.sql
│   │   ├── 004_add_preferences.sql
│   │   └── ...
│   │
│   ├── seeds/
│   │   ├── test-families.sql
│   │   └── test-recipes.sql
│   │
│   ├── schemas/
│   │   └── full-schema.sql           # Complete schema dump (reference)
│   │
│   └── README.md                     # Migration guide
│
├── src/                              # Specifications & documentation
│   ├── specs/
│   │   ├── phase0-mvp.spec.md        # ✅ Phase 0 spec (updated)
│   │   ├── recipe-api.spec.md
│   │   ├── recipe-pwa.spec.md
│   │   ├── recipe-import.spec.md
│   │   ├── meal-planning.spec.md
│   │   ├── discovery-search.spec.md
│   │   ├── sharing-collaboration.spec.md
│   │   ├── integration.spec.md
│   │   ├── testing.spec.md
│   │   ├── operations.spec.md
│   │   ├── performance.spec.md
│   │   ├── security.spec.md
│   │   ├── migration-strategy.spec.md
│   │   │
│   │   ├── decisions/                # Architectural Decision Records (ADRs)
│   │   │   ├── 001-tech-stack.md
│   │   │   ├── 002-database-choice.md
│   │   │   ├── 003-api-architecture.md
│   │   │   ├── 004-pwa-framework.md
│   │   │   ├── ...
│   │   │   └── 011-realtime-sync-strategy.md
│   │   │
│   │   ├── user-journeys.md          # 🆕 First-time user journeys
│   │   ├── hint-system.spec.md       # 🆕 Hint system architecture
│   │   ├── journey-flowcharts.md     # 🆕 Visual journey flows
│   │   │
│   │   ├── backlog/
│   │   │   ├── done/                 # Completed phases
│   │   │   │   ├── 01-api-foundation.md
│   │   │   │   ├── 02-pwa-foundation.md
│   │   │   │   └── 03-import-worker.md
│   │   │   │
│   │   │   └── future/               # Not yet started
│   │   │       ├── 04-planner.md
│   │   │       ├── 05-discovery.md
│   │   │       └── 06-sharing.md
│   │   │
│   │   ├── mockups/                  # UI mockups
│   │   │   ├── light_theme_mockup.png
│   │   │   ├── vibrant_light_mockup.png
│   │   │   ├── demo_mockup.png
│   │   │   └── ...
│   │   │
│   │   └── ROADMAP.md                # High-level product roadmap
│   │
│   ├── design/                       # Design assets (future)
│   │   ├── color-palette.json
│   │   ├── typography.json
│   │   └── components.figma          # Link to Figma file
│   │
│   └── testing/                      # Test strategies & checklists
│       ├── manual-testing-checklist.md
│       ├── integration-test-guide.md
│       └── performance-benchmarks.md
│
├── shared/                           # Shared code/types across services
│   ├── dto/                          # Shared DTOs (if using shared NuGet packages)
│   │   ├── RecipeDto.cs
│   │   ├── FamilyMemberDto.cs
│   │   └── ...
│   │
│   ├── types/                        # Shared TypeScript types (for API contracts)
│   │   ├── recipe.ts
│   │   ├── family.ts
│   │   └── ...
│   │
│   ├── constants/                    # Shared constants
│   │   ├── http-status.ts
│   │   ├── error-codes.ts
│   │   └── validation-rules.ts
│   │
│   └── README.md                     # How to use shared code
│
├── tools/                            # Development & utility scripts
│   ├── scripts/
│   │   ├── generate-api-client.sh    # Generate TS client from API spec
│   │   ├── seed-db.sh                # Populate test data
│   │   ├── backup-db.sh              # Database backup
│   │   ├── logs.sh                   # View docker logs
│   │   └── format.sh                 # Format code (prettier, dotnet format)
│   │
│   ├── docker/
│   │   ├── dev-shell.dockerfile      # Development environment
│   │   └── cli-tools.dockerfile      # Utility tools container
│   │
│   └── tests/
│       ├── load-testing/             # k6 or similar
│       │   └── recipes-api.js
│       │
│       └── e2e-testing/              # Playwright/Cypress (Phase 2+)
│           ├── onboarding.spec.ts
│           └── capture.spec.ts
│
├── .env.example                      # Example env vars for all services
├── .env.local (gitignored)           # Local development overrides
├── .env.test (gitignored)            # Test environment
├── .env.prod                         # Production (usually in secrets manager)
│
├── .gitignore                        # Git ignore rules
├── .editorconfig                     # Editor consistency
├── .eslintrc.json                    # Linting (JS/TS)
├── .prettierrc.json                  # Code formatting (JS/TS)
├── editorconfig (C#)                 # C# conventions
│
├── CLAUDE.md                         # Instructions for Claude Code
├── README.md                         # Main project README
├── CONTRIBUTING.md                   # Contribution guidelines
├── CODE_OF_CONDUCT.md                # Code of conduct
│
└── Makefile or package.json (root)   # Convenience commands
    ├── dev                           # Start all services
    ├── test                          # Run all tests
    ├── build                         # Build all containers
    └── migrate                       # Run DB migrations
```

## Service Dependencies

```
┌─────────────────────────────────────────────────────┐
│                    User (Browser)                    │
└─────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │      PWA (Next.js)                    │
        │  Port: 3000                           │
        │  - Onboarding, Capture, Planner       │
        │  - Discovery, Settings                │
        └───────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │      API (.NET)                       │
        │  Port: 5000                           │
        │  - Family management                  │
        │  - Recipe CRUD + upload               │
        │  - Tour completion tracking           │
        └───────────────────────────────────────┘
                      │           │
         ┌────────────┘           └────────────┐
         │                                     │
         ▼                                     ▼
    ┌─────────────┐                    ┌──────────────┐
    │ PostgreSQL  │                    │ File Storage │
    │ Port: 5432  │                    │ (NAS mount)  │
    │ - Schemas   │                    │ /data/       │
    │ - Recipes   │                    │ recipes/     │
    │ - Families  │                    │ [uuid]/      │
    │ - Tours     │                    │ original/    │
    └─────────────┘                    │ hero/        │
                                       └──────────────┘

    ┌──────────────────┐                ┌─────────────────┐
    │ Redis (Phase 1+) │                │ Ollama (Phase 1+)
    │ Port: 6379       │                │ Port: 11434     │
    │ - Job queue      │                │ - Image proc    │
    │ - Real-time sync │                │ - Embeddings    │
    └──────────────────┘                └─────────────────┘
            ▲                                    ▲
            │                                    │
            └────────────────┬───────────────────┘
                             │
        ┌────────────────────┴────────────────────┐
        │                                         │
        ▼                                         ▼
    ┌─────────────────────┐          ┌──────────────────────┐
    │ Import Worker       │          │ Calendar Sync Worker │
    │ (Phase 1+)          │          │ (Phase 4+)           │
    │ Port: 5001          │          │ Port: 5002           │
    │ - Image processing  │          │ - Calendar sync      │
    │ - Metadata extract  │          │ - Schedule updates   │
    │ - Hero generation   │          │ - Event creation     │
    └─────────────────────┘          └──────────────────────┘
```

## Phase Rollout - Infrastructure Impact

| Phase | New Services | New Containers | Env Changes |
|-------|--------------|-----------------|------------|
| **0** | PostgreSQL, API, PWA | 3 | Basic |
| **1** | Redis, Import Worker, Ollama | 6 | Add job queue, Redis connection |
| **2** | (same as Phase 1) | 6 | Enable planner endpoints |
| **3** | (same as Phase 1) | 6 | pgvector queries |
| **4** | Calendar Sync Worker | 7 | Calendar API credentials |
| **5** | (same as Phase 4) | 7 | WebSocket setup |

## Environment Configuration

### Phase 0 (`.env.local`)
```bash
# API
POSTGRES_CONNECTION_STRING=postgres://postgres:password@postgres:5432/recipes
RECIPES_ROOT=/data/recipes
API_BASE_URL=http://api:5000

# PWA
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

### Phase 1+ (add to `.env`)
```bash
REDIS_CONNECTION_STRING=redis://redis:6379
OLLAMA_BASE_URL=http://ollama:11434
```

## Key Directories at a Glance

| Path | Purpose | Phase |
|------|---------|-------|
| `api/` | Backend API (C#) | 0+ |
| `pwa/` | Frontend (Next.js) | 0+ |
| `workers/` | Background jobs | 1+ |
| `infrastructure/` | Docker & deployment | 0+ |
| `database/` | Migrations & seeds | 0+ |
| `src/specs/` | Documentation & ADRs | 0+ |
| `shared/` | Shared types/code | 1+ |
| `tools/` | Scripts & utilities | 0+ |

## Getting Started

1. **Read**: `README.md` (main project)
2. **Understand**: `src/specs/phase0-mvp.spec.md` (Phase 0 requirements)
3. **Setup**: `infrastructure/scripts/setup.sh`
4. **Develop**: Use `docker-compose.yml` to start services
5. **Test**: `tools/tests/` for test suites

## Development Workflow

```bash
# Start all Phase 0 services
docker-compose up

# Develop locally (watch mode)
cd api && dotnet watch run
cd ../pwa && npm run dev

# Run tests
npm run test:api
npm run test:pwa

# Check database
docker exec recipe-db psql -U postgres -d recipes -c "SELECT * FROM family_members;"
```

## Deployment Strategy

- **Phase 0**: Docker Compose on single machine
- **Phase 1-2**: Multi-container with Redis
- **Phase 3+**: Consider Kubernetes (manifests in `infrastructure/k8s/`)
- **CI/CD**: GitHub Actions (`.github/workflows/`)
