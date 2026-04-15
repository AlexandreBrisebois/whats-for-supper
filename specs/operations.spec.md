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
| `redis` | `redis:7-alpine` | ~20MB | Stream queue | 1+ |
| `ollama` | `ollama/ollama` | ~2GB+ | Local LLM (GPU optional) | 1+ |

## 2. Docker Compose Structure

```
docker-compose.yml        # All services
docker-compose.override.yml  # Local dev overrides (hot reload, debug ports)
.env                      # Environment variables (not committed)
```

Volumes:
- `postgres_data` → `/data/postgres` on NAS
- `recipes_data` → `/data/recipes` on NAS (images + recipe.info)
- `ollama_models` → `/data/ollama` on NAS

## 3. Startup Order

1. `postgres` (healthcheck: `pg_isready`)
2. `redis` (healthcheck: `redis-cli ping`) — Phase 1+; skipped in Phase 0
3. `api` (depends on postgres, redis)
4. `import-worker` (depends on postgres, redis) — Phase 1+
5. `calendar-sync-worker` (depends on postgres) — Phase 4+
6. `pwa` (depends on api)
7. `ollama` (independent; pulls models on first start) — Phase 1+

**Phase 0 (MVP):** Only `postgres`, `api`, `pwa`. Redis, import-worker, calendar-sync-worker, and ollama are not deployed.

## 4. Deployment

### 4.1 Build
```bash
docker compose build
```
- API and Import Worker use multi-stage builds (SDK → Chiseled runtime).
- PWA uses `node:22-alpine` for build, `node:22-alpine` for runtime.

### 4.2 Deploy
```bash
docker compose up -d
```

### 4.3 Update
```bash
docker compose pull
docker compose up -d --no-deps <service>
```

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
- Dead-letter stream `recipe:import:error` is the primary alert signal for import failures.
- Check `recipe:import:error` length via `redis-cli XLEN recipe:import:error`.

## 8. Troubleshooting

| Symptom | Check |
|---|---|
| Upload fails with 500 | `docker logs api` — check Redis connectivity |
| Import job stuck | `docker logs import-worker` — check Ollama connectivity |
| Hero image not generated | Check `GEMINI_API_KEY` is set; check `recipe:import:error` stream |
| Planner not updating | Check `docker logs pwa` for API connectivity errors |

## 9. NAS Architecture (Synology DS723+)

- **CPU**: AMD Ryzen R1600 (x86-64, 2-core/4-thread)
- **RAM**: 2–32GB (model dependent)
- **Target**: `linux-x64` Native AOT build
- **Ollama**: CPU-only by default. GPU passthrough not supported on DS723+.
