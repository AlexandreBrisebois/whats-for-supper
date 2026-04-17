# Operations Specification

This document defines the deployment, infrastructure, and operational runbook for "What's For Supper" on a home NAS (Synology DS723+).

## 1. Infrastructure Overview

All services run as Docker containers orchestrated by Docker Compose on the NAS.

| Service | Image | RAM Target | Notes | Phase |
|---|---|---|---|---|
| `api` | .NET 10 Native AOT + Chiseled | < 40MB | Recipe API | 0+ |
| `import-worker` | .NET 10 Native AOT + Chiseled | < 60MB | AI import pipeline | 1+ |
| `calendar-sync-worker` | .NET 10 Native AOT + Chiseled | < 50MB | Google/Outlook calendar polling | 4+ |
| `pwa` | Node.js (Next.js) | < 150MB | Frontend PWA | 0+ |
| `postgres` | `pgvector/pgvector:pg17` | ~256MB | Primary data store | 0+ |
| `ollama` | `ollama/ollama` | ~2GB+ | Local LLM (GPU optional) | 1+ |

## 2. Docker Compose Structure (Modular)

Orchestration is split into modular layers for stability and maintainability, located in `docker/compose/`:

- `infrastructure.yml`: Persistent services (PostgreSQL, Traefik).
- `apps.yml`: The core WFS application services (API, PWA, Worker).
- `production.yml`: Production-specific overrides (Synology paths, TLS).
- `.env`: Global environment variables (not committed).

Volumes:
- `postgres_data` → `/data/postgres` on NAS
- `recipes_data` → `/data/recipes` on NAS (images + recipe.info)
- `ollama_models` → `/data/ollama` on NAS

## 3. Startup Order & Network

1. `traefik` (Edge proxy, depends on Docker socket)
2. `postgres` (healthcheck: `pg_isready`)
3. `api` (depends on postgres, on `wfs-internal` network)
4. `import-worker` (depends on postgres) — Phase 1+
5. `calendar-sync-worker` (depends on postgres) — Phase 4+
6. `pwa` (depends on api, on `wfs-proxy` network)
7. `ollama` (independent) — Phase 1+

**Phase 0 (MVP):** Only `postgres`, `api`, `pwa`. Import-worker, calendar-sync-worker, and ollama are not deployed.

## 4. Deployment

### 4.1 Build
```bash
task build
```
- API and Import Worker use multi-stage builds (SDK → Chiseled runtime).

### 4.2 Deploy
```bash
task up
```
Enforces the correct file order (`-f infrastructure.yml -f apps.yml`) as defined in the `Taskfile`.

### 4.3 Update
```bash
task update
```
Pulls new images and restarts containers without dropping volumes.

## 5. Database Migrations

- Migrations are run automatically on API startup using `Npgsql` migration runner.
- Migration files located in `api/Migrations/`.
- Always backup PostgreSQL volume before upgrading.

## 6. Backup Strategy

- **PostgreSQL**: Daily `pg_dump` to `/data/backups/postgres/`. Retain 7 days.
- **Recipes filesystem**: Synology Hyper Backup task on `/data/recipes/`. Retain 30 days.
- **Restore**: Stop containers → restore volume → restart.

## 7. Monitoring & Health

- Each service exposes a `/health` endpoint.
- Docker Compose `healthcheck` monitors liveness.
- Failed imports are tracked in the `recipe_imports` table with an `error_message`.
- Status dashboard uses `GET /api/recipes/import-status` for health summary.

## 8. Troubleshooting

| Symptom | Check |
|---|---|
| Upload fails with 500 | `docker logs api` — check database connectivity |
| Import job stuck | `docker logs import-worker` — check database and Ollama connectivity |
| Hero image not generated | Check `GEMINI_API_KEY` is set; check `recipe_imports` for errors |
| Planner not updating | Check `docker logs pwa` for API connectivity errors |

## 9. NAS Architecture (Synology DS723+)

- **CPU**: AMD Ryzen R1600 (x86-64, 2-core/4-thread)
- **RAM**: 2–32GB (model dependent)
- **Target**: `linux-x64` Native AOT build
- **Ollama**: CPU-only by default. GPU passthrough not supported on DS723+.
