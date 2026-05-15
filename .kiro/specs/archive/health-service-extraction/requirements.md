# Health Service Extraction - Requirements

## Vision
Decouple health-related logic and persistence from the core WFS transactional flows. Health should behave as an advisory virtual actor that computes guidance asynchronously and provides it through stable adapter seams, ensuring that schedule and recipe writes never block on health recompute.

## Product Decisions
- **Asynchronous Ownership**: Health recompute is eventually consistent and durable.
- **Silent Fallback**: Planner and search will fall back to "no guidance" if health data is pending or missing.
- **No UX Changes**: Existing frontend endpoints and data shapes are preserved via server-side adapters.
- **Durable Neutral Events**: Use a database-backed outbox for `recipe_changed` and `week_changed` events.
- **New Persistence**: Health data is stored in dedicated tables, not in `recipes` or `weekly_plans`.

## Acceptance Criteria

### AC 1: Health-Owned Persistence
- [ ] New table `health_recipe_profiles` exists, keyed by `recipe_id`.
- [ ] New table `health_week_summaries` exists, keyed by `week_start_date`.
- [ ] Data is stored as JSONB for flexibility (dietary profile, balance summary, FOP flags).

### AC 2: Durable Neutral Events
- [ ] New table `health_events` exists to track `recipe_changed` and `week_changed` events.
- [ ] Recipe workflows (creation, import, synthesis, update) publish a `recipe_changed` event.
- [ ] Schedule workflows (assignment, move, remove) publish a `week_changed` event.
- [ ] Events are persisted in the same transaction as the entity change (Outbox pattern).

### AC 3: Asynchronous Workers
- [ ] A background worker (`HealthWorker`) processes `health_events` idempotently.
- [ ] Recipe worker derives `RecipeDietaryProfile` and `FopFlags` and writes to `health_recipe_profiles`.
- [ ] Week worker computes `WeeklyBalanceSummary` using recipe-level health data and writes to `health_week_summaries`.
- [ ] Week worker retries or defers processing if required recipe health profiles are missing.

### AC 4: Server-Side Adapters
- [ ] `IHealthAdapter` provides a seam for reading health data.
- [ ] Schedule endpoints return health summary via the adapter.
- [ ] Recipe search reranking uses the adapter to get planner-fit guidance.
- [ ] Adapters return "best completed summary or null" (never block or throw on missing data).

### AC 5: WFS Cleanup & De-Zombification
- [ ] `GroceryRecomputeService` no longer calls `WeeklyBalanceScorer` or writes to `weekly_plans.balance_summary`.
- [ ] `ClassifyDietaryProfileProcessor` is removed and its logic is fully migrated to the `HealthWorker`.
- [ ] `ClassifyDietaryProfile` step is removed from all YAML workflows.
- [ ] **Ghost Fields**: `prepTimeMinutes` and `cookTimeMinutes` are removed from `openapi.yaml`, DTOs, and AI prompts.
- [ ] Legacy columns `recipes.dietary_profile` and `weekly_plans.balance_summary` are marked as obsolete.
- [ ] `classify-recipe.yaml` workflow is deleted.

## Glossary
- **Neutral Event**: An event that describes an entity change without specifying what the consumer should do (e.g., `recipe_changed` vs `recompute_health`).
- **Health Adapter**: A server-side component that bridges the gap between the health subsystem and existing WFS endpoints.
- **Silent Fallback**: A UX state where missing advisory data results in a functional but unguided experience.
