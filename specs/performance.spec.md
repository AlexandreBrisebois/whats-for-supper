# Performance Specification

This document defines performance targets and optimization strategies for "What's For Supper" on NAS hardware.

## 1. Performance Targets

| Feature | Target | Notes |
|---|---|---|
| Recipe upload (`POST /api/recipes`) | < 2s | Excluding image transfer time |
| Image retrieval (`GET /recipe/.../original/0`) | < 200ms | From NAS filesystem |
| PWA initial load (first paint) | < 3s | On LAN Wi-Fi |
| Planner data load | < 1s | Cached after first load |
| Discovery card stack load | < 1s | First 10 cards |
| Natural language search | < 3s | pgvector + re-ranking |
| Meal suggestions (agent) | < 5s | End-to-end |
| Import pipeline (Pass 1 + Pass 2) | < 60s | Async, user is not waiting |

## 2. API Performance

- **.NET 10 Native AOT**: Minimizes JIT overhead and cold start time.
- **Chiseled containers**: < 40MB RAM baseline for the API service.
- **File streaming**: Images served as raw binary streams (no base64 encoding in API responses).
- **Connection pooling**: `Npgsql` connection pool configured for NAS-appropriate concurrency (max 10 connections).

## 3. Database Performance

- **pgvector index**: `IVFFlat` index on `recipes.embedding` for approximate nearest neighbor search.
- **JSONB indexing**: GIN index on `raw_metadata` for ingredient queries.
- **Connection limit**: PostgreSQL `max_connections = 50` (NAS-appropriate).
- **Vacuum**: Default autovacuum settings; monitor for bloat on `recipes` table after large imports.

## 4. PWA Performance

- **Service Worker caching**: Shell assets, planner data, family list cached offline-first.
- **Next.js ISR**: Planner and recipe list pages use Incremental Static Regeneration where applicable.
- **Image optimization**: `next/image` with WebP conversion for recipe card thumbnails.
- **Lazy loading**: Discovery card stack pre-loads the next 5 cards while the user is swiping.
- **Zustand**: Lightweight state store; avoid large object trees in the store.

## 5. Import Worker Performance

- **Async pipeline**: Import is fully asynchronous. The API returns `recipeId` immediately; the user is not blocked.
- **Memory management**: Images are read from disk in chunks and base64-encoded JIT for Gemini (not held in full in memory).
- **Ollama concurrency**: One import job at a time by default (NAS CPU constraint). Configurable via `IMPORT_WORKER_CONCURRENCY` env var.

## 6. NAS Resource Budget

| Resource | Total Available | Target Usage |
|---|---|---|
| RAM | 4–8GB (typical) | < 1GB for all services (excluding Ollama) |
| CPU | 4 threads (R1600) | Ollama gets 2 threads; remaining services share 2 |
| Disk I/O | HDD/SSD (NAS) | Minimize small random writes; batch where possible |

## 7. Monitoring

- Docker stats (`docker stats`) for real-time container resource usage.
- PostgreSQL `pg_stat_activity` for slow query detection.
- Redis `INFO stats` for stream backlog monitoring.
- Application logs (JSON structured) for p95 latency tracking per endpoint.
