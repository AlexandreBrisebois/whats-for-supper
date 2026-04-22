# Migration Strategy Specification

This document defines the approach for evolving the "What's For Supper" system over time, including database schema migrations, service versioning, and the path from experiment branches to production.

## 1. Database Schema Migrations

- **Tool**: Fluent Migrator or EF Core Migrations via `Npgsql`.
- **Strategy**: Forward-only migrations. No rollback scripts in Phase 0–3 (rollback = restore from backup).
- **Execution**: Migrations run automatically on API container startup.
- **Location**: `api/Migrations/` directory, versioned numerically (`001_initial_schema.cs`, `002_add_embeddings.cs`, etc.).
- **Safety**: Always backup PostgreSQL volume before deploying a new version with schema changes.

## 2. Experiment → Main Branch Alignment

The `experiments` branch contains a simpler implementation (file-based, N8N webhooks) used for early prototyping. The main branch is the target production implementation.

### 2.1 Migration Path

| Experiment Feature | Main Branch Equivalent | Migration Action |
|---|---|---|
| File-based recipe storage | PostgreSQL + NAS filesystem | Data import script |
| N8N webhooks | Redis Streams | Replace integration |
| Simple JSON family config | `FamilyMembers` PostgreSQL table | One-time import |

### 2.2 Migration Script

A one-time migration script will:
1. Read all recipe directories from the experiment's file store.
2. Insert records into the `recipes` PostgreSQL table.
3. Preserve original image files in the NAS `RECIPES_ROOT` structure.
4. Assign a default `addedBy` family member for all migrated recipes.

This script is run once, manually, before decommissioning the experiment branch.

## 3. Service Versioning

- **API**: Versioned via URL prefix (`/api/v1/`) starting in Phase 3 when breaking changes become likely.
- **PWA**: Versioned via Next.js build hash. Service Worker cache is busted on each deployment.
- **Import Worker**: Stateless; new versions are deployed by restarting the container. In-flight Redis messages are re-processed by the new version.

## 4. Phase Transition Checklist

Before promoting a new phase to production:
- [ ] All new migrations applied and verified in a staging environment (local Docker Compose).
- [ ] API contract tests pass against the new version.
- [ ] PWA E2E golden path tests pass.
- [ ] PostgreSQL backup taken.
- [ ] `docker compose up -d` on NAS with new images.
- [ ] Health endpoints return 200 for all services.
- [ ] `recipe:import:error` stream length is 0 (no pending failures).

## 5. Breaking Change Policy

- Breaking API changes require a version bump and a deprecation notice in `CHANGELOG.md`.
- Database column removals are deferred by one phase (mark nullable first, remove in next phase).
- PWA and API are deployed together to avoid version skew.
