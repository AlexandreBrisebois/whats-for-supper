# Developer Guide — What's For Supper (Phase 0)

Everything you need to get from a fresh clone to a running, testable local environment.

---

## Prerequisites

| Tool | Minimum version | Notes |
|------|-----------------|-------|
| Docker | 24.x | Used for all three services |
| Docker Compose | v2 (`docker compose`) | Bundled with Docker Desktop |
| Node.js | 22.x | Only needed for local PWA dev or running E2E tests outside Docker |
| .NET SDK | 10.0 | Only needed for local API dev without Docker |
| Git | any | — |

> **Docker Desktop** (Mac/Windows) bundles Docker Engine, Docker Compose, and BuildKit. Install it first if you don't have Docker.

---

## Quick Start (Docker)

```bash
# 1. Clone
git clone https://github.com/AlexandreBrisebois/whats-for-supper.git
cd whats-for-supper

# 2. Create local environment file
cp .env.example .env
# Edit .env if you want non-default credentials (optional for local dev)

# 3. Build and start all services
task up

# 4. Wait until all services are healthy (≈15 s)
task health

# 5. Open the app
open http://pwa.wfs.localhost
```

On subsequent starts:

```bash
task up
```

---

## Service URLs

| Service | URL | Notes |
|---------|-----|-------|
| PWA | http://pwa.wfs.localhost | Main entry point |
| API | http://api.wfs.localhost | REST JSON API |
| API health | http://api.wfs.localhost/health | Liveness check |
| PWA health | http://pwa.wfs.localhost/api/health | Liveness check |
| Dashboard | http://localhost:8080 | Traefik dashboard |
| PostgreSQL | localhost:5434 | Connect with any PG client |

---

## Development Workflow

### Watching logs

```bash
# All services
task logs

# Single service
task logs:api
task logs:pwa
task logs:db
```

### Restarting services

```bash
task restart
```

### Rebuilding after source changes

```bash
task build   # rebuild all
# or
docker compose build api   # rebuild specific
task up
```

task test:api

Or on the host (requires .NET SDK 10):

```bash
cd api
dotnet test src/RecipeApi.Tests/RecipeApi.Tests.csproj
```

### Running Playwright E2E tests

E2E tests live in `pwa/e2e/`. They expect the app to be running at `http://localhost:3000`.

```bash
# Install Playwright browsers once
cd pwa
npm install
npx playwright install chromium

# Run all E2E tests
npm run test:e2e

# Headed mode (watch the browser)
npm run test:e2e:debug

# Interactive UI mode
npm run test:e2e:ui
```

Set `BASE_URL` to override the target:

```bash
BASE_URL=http://staging.example.com npm run test:e2e
```

### Database migrations

Migrations are written with Entity Framework Core and stored in `api/src/RecipeApi/Data/Migrations/`. The API applies any pending migrations automatically at startup.

To add a new migration (requires .NET SDK on host):

```bash
cd api
dotnet ef migrations add <MigrationName> \
  --project src/RecipeApi/RecipeApi.csproj \
  --startup-project src/RecipeApi/RecipeApi.csproj
```

task shell:db

---

## Local Development Without Docker

If you prefer shorter feedback loops you can run each service natively.

### 1 — PostgreSQL

Use Docker for Postgres even in this mode — it's the easiest:

```bash
docker-compose up postgres
```

Or use a local Postgres 17 instance. Make sure the database and user match what's in `.env`.

### 2 — API

```bash
cd api

# Set the connection string to localhost (not the Docker service name)
export POSTGRES_CONNECTION_STRING="postgres://recipe_app:secure_dev_password@localhost:5432/recipe_app_db"
export ASPNETCORE_ENVIRONMENT=Development

dotnet run --project src/RecipeApi/RecipeApi.csproj
# API available at http://localhost:5000
```

### 3 — PWA

```bash
cd pwa

# Copy the local env example
cp .env.local.example .env.local
# Verify NEXT_PUBLIC_API_BASE_URL=http://localhost:5000

npm install
npm run dev
# PWA available at http://localhost:3000
```

---

## Troubleshooting

### Port already in use

```
Error: bind: address already in use
```

Another process is using port 5432, 80, or 8080. Since we use Traefik as a reverse proxy, port 80 must be available.
If you need to change the host ports, edit `docker/compose/infrastructure.yml`.

- Wrong `POSTGRES_USER` or `POSTGRES_PASSWORD` in `.env`.

### API not responding

```bash
docker-compose logs api
```

- Cannot reach the `postgres` container — check that Postgres is healthy first (`task health`).

### PWA shows "Network Error" when making API calls

The browser makes requests to `NEXT_PUBLIC_API_BASE_URL`. In Docker mode this is `http://api.wfs.localhost`, which Traefik routes correctly.

Check `.env`:

```env
NEXT_PUBLIC_API_BASE_URL=http://api.wfs.localhost
```

### Camera not working in browser

- Make sure your browser is serving the page over `http://localhost` (camera requires a secure context or localhost).
- Click the camera icon in the browser's address bar and grant camera permission.
- On headless CI or non-camera machines, use the **Gallery** option to upload an image file instead.

### Docker build fails with "COPY failed"

The `api/Dockerfile` and `pwa/Dockerfile` each use `.dockerignore` to exclude files. If you see unexpected copy failures, check that your source file exists and isn't excluded:

```bash
cat api/.dockerignore
cat pwa/.dockerignore
```

---

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `recipe_app` | PG superuser / app user |
| `POSTGRES_PASSWORD` | `secure_dev_password` | PG password |
| `POSTGRES_DB` | `recipe_app_db` | PG database name |
| `POSTGRES_PORT` | `5432` | Host-side PG port |
| `POSTGRES_CONNECTION_STRING` | derived | Full Npgsql connection string read by the API |
| `API_PORT` | `5000` | Host-side API port |
| `ASPNETCORE_ENVIRONMENT` | `Development` | ASP.NET Core env; enables OpenAPI at `/openapi/v1.json` |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated allowed origins |
| `PWA_PORT` | `3000` | Host-side PWA port |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:5000` | API base URL visible to the browser |

See `.env.example` for the full list including Phase 1+ variables.

---

## Project Layout

```
whats-for-supper/
├── api/                  .NET 10 ASP.NET Core Web API
│   ├── Dockerfile
│   ├── .dockerignore
│   └── src/
│       ├── RecipeApi/    Application source
│       └── RecipeApi.Tests/
├── pwa/                  Next.js 15 TypeScript PWA
│   ├── Dockerfile
│   ├── playwright.config.ts
│   ├── e2e/              Playwright E2E tests
│   └── src/
├── database/             Reference SQL migrations (EF Core is authoritative)
├── docs/                 Guides (this file, PHASE0_WALKTHROUGH.md)
├── docker/               Orchestration
│   └── compose/
│       ├── infrastructure.yml
│       ├── apps.yml
│       └── traefik_dynamic.yml
├── .env                  Local overrides (git-ignored)
├── .env.example          Template for all available variables
└── Taskfile.yml          Primary entrypoint for all commands
```

---

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feat/my-feature`.
3. Make your changes and add tests where applicable.
4. Run `docker-compose up --build` and verify all services start clean.
5. Run `npm run test:e2e` from `pwa/` and `dotnet test` from `api/`.
6. Open a pull request against `main`.

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the full code of conduct and PR guidelines.
