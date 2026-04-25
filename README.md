# What's For Supper

A mobile-first recipe capture and planning app for families. What's For Supper streamlines the "what's for dinner?" problem with AI-powered capture, collaborative family voting, intelligent weekly planning, and a premium step-by-step Cook's Mode.

---

## Quick Start

```bash
git clone https://github.com/AlexandreBrisebois/whats-for-supper.git
cd whats-for-supper
task init
```

All services start in order. The first run takes ~2 minutes while Docker pulls base images and builds the containers. Subsequent starts are ~10 seconds.

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                   Browser / Mobile                    │
└────────────────────────┬─────────────────────────────┘
                         │ HTTP  :3000
┌────────────────────────▼─────────────────────────────┐
│               PWA — Next.js 15 (TypeScript)          │
│  /onboarding  /home  /capture  /api/health           │
└────────────────────────┬─────────────────────────────┘
                         │ HTTP  :3000
┌────────────────────────▼─────────────────────────────┐
│           API — ASP.NET Core 10 (.NET 10)            │
│  /api/family  /api/recipes  /api/management  /health │
│  Auto-migrates DB on startup                         │
└────────────────────────┬─────────────────────────────┘
                         │ TCP   :9001
┌────────────────────────▼─────────────────────────────┐
│                PostgreSQL 17 (Alpine)                 │
│  family_members  recipes  (EF Core migrations)       │
└──────────────────────────────────────────────────────┘
```

All three services run in Docker on a shared bridge network (`app-network`). Recipe images are persisted in the `whats-for-supper-recipes` named volume; database rows in `whats-for-supper-postgres`.

---

## Services

| Service | Port | Image / Build |
|---------|------|---------------|
| PostgreSQL | 5432 | `postgres:17-alpine` |
| API | 9001 | `./api` (Ubuntu Chiseled, .NET 10) |
| PWA | 3000 | `./pwa` (Node 22 Alpine, Next.js 15) |

Health endpoints:
- `GET http://localhost:9001/health` — API + database check
- `GET http://localhost:3000/api/health` — PWA liveness

---

## Development

**AI-Optimized Entry**: If you are an AI agent (Copilot, Gemini, Claude), start with **[AGENT.md](AGENT.md)**. Then read **[specs/02_BACKEND/backend-api.spec.md](specs/02_BACKEND/backend-api.spec.md)** before modifying any API endpoints.

**Human Developer Guide**: For detailed setup instructions, local dev without Docker, troubleshooting, and environment variable reference, see **[LOCAL_DEV_LOOP.md](LOCAL_DEV_LOOP.md)**.

### Common commands

```bash
# Start all services
task up

# Rebuild after source changes
task build
task up

# Generate production compose (for NAS)
task prod:config
# Output: docker/docker-compose.prod.yml

# Watch API logs
task logs:api

# Run API unit tests
task test:api

# Run Playwright E2E tests (from pwa/)
npm run test:e2e

# --- System Integrity ---

# Check for schema drift (C# DTOs vs OpenAPI)
task agent:drift

# View full API mapping
task agent:api
```

---

## Testing

### API (xUnit)

```bash
cd api
dotnet test src/RecipeApi.Tests/RecipeApi.Tests.csproj
```

Tests cover controllers, services, and integration with a real Postgres instance via `TestWebApplicationFactory`.

### PWA (Playwright)

```bash
cd pwa
npm install
npx playwright install chromium
npm run test:e2e          # headless
npm run test:e2e:ui       # interactive UI mode
npm run test:e2e:debug    # headed with debugger
```

E2E suites:
- `e2e/onboarding.spec.ts` — fresh user redirect, member select, member create
- `e2e/capture-flow.spec.ts` — navigate to capture, upload image, submit recipe
- `e2e/integration.spec.ts` — full end-to-end journey

---

---

## Status

| Area | Status |
|------|--------|
| Database schema | Complete |
| REST API (family + recipes) | Complete |
| PWA onboarding flow | Complete |
| PWA capture flow | Complete |
| PWA discovery & voting | Complete |
| PWA weekly planner | Complete |
| PWA cook's mode | Complete |
| Docker Compose integration | Complete |
| E2E tests (Playwright) | Complete |
| CI/CD (GitHub Actions) | Complete |
| Phase 5 (Diet Agent, AI Inference) | Active |

---

## Contributing

See **[CONTRIBUTING.md](CONTRIBUTING.md)** and **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)**.

1. Fork and create a feature branch.
2. `docker-compose up --build` — all services must start clean.
3. `dotnet test` and `npm run test:e2e` must pass.
4. Open a pull request against `main`.

---

## License

MIT — see **[LICENSE](LICENSE)**.
