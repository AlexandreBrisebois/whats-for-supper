# What's For Supper

A mobile-first recipe capture app for families. Phase 0 delivers the core capture loop: select who you are, photograph a recipe, rate it, and save it — in under a minute.

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
                         │ HTTP  :5000
┌────────────────────────▼─────────────────────────────┐
│           API — ASP.NET Core 10 (.NET 10)            │
│  /api/family  /api/recipes  /health                  │
│  Auto-migrates DB on startup                         │
└────────────────────────┬─────────────────────────────┘
                         │ TCP   :5432
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
| API | 5000 | `./api` (Ubuntu Chiseled, .NET 10) |
| PWA | 3000 | `./pwa` (Node 22 Alpine, Next.js 15) |

Health endpoints:
- `GET http://localhost:5000/health` — API + database check
- `GET http://localhost:3000/api/health` — PWA liveness

---

## Development

**AI-Optimized Entry**: If you are an AI agent (Copilot, Gemini, Claude), start with **[AGENT.md](AGENT.md)**.

**Human Developer Guide**: For detailed setup instructions, local dev without Docker, troubleshooting, and environment variable reference, see **[LOCAL_DEV_LOOP.md](LOCAL_DEV_LOOP.md)**.

### Common commands

```bash
# Start all services
task up

# Rebuild after source changes
task build
task up

# Watch API logs
task logs:api

# Run API unit tests
task test:api

# Run Playwright E2E tests (from pwa/)
npm run test:e2e
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

## User Guide

See [docs/PHASE0_WALKTHROUGH.md](docs/PHASE0_WALKTHROUGH.md) for a step-by-step walkthrough with ASCII diagrams and an FAQ.

---

## Status

| Area | Status |
|------|--------|
| Database schema | Complete |
| REST API (family + recipes) | Complete |
| PWA onboarding flow | Complete |
| PWA capture flow | Complete |
| Docker Compose integration | Complete |
| E2E tests (Playwright) | Complete |
| CI/CD (GitHub Actions) | Complete |
| Phase 1 (discovery, search) | Planned |

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
