# Health Service Extraction - Tasks

## Waves
- **Wave 1: Infrastructure & Storage** (Tables & Event Outbox)
- **Wave 2: Recipe Health Extraction** (Recipe changed events & worker)
- **Wave 3: Week Health Extraction** (Week changed events & worker)
- **Wave 4: Seams & Cleanup** (Adapters, search decoupling, and WFS cleanup)

---

## Wave 1: Infrastructure & Storage

### [ ] 1.1. DB - Health Schema & Tables
- **Task**: Add new tables `health_events`, `health_recipe_profiles`, and `health_week_summaries` to `RecipeDbContext`.
- **Steps**:
    - Update `RecipeDbContext.cs` with new `DbSet`s and model configurations.
    - Run migrations (or verify schema via `psqldef` if applicable).
- **Requirements**: AC 1, AC 2
- **Verification**: `task agent:drift` passes.

### [ ] 1.2. Infrastructure - Health Event Outbox
- **Task**: Implement `IHealthEventPublisher` to insert events into `health_events`.
- **Steps**:
    - Define `IHealthEventPublisher` in `Infrastructure` directory.
    - Implement `DbHealthEventPublisher` using `RecipeDbContext`.
- **Requirements**: AC 2
- **Verification**: Unit test `DbHealthEventPublisherTests` confirms event insertion.

---

## Wave 2: Recipe Health Extraction

### [ ] 2.1. Logic - Recipe Changed Events
- **Task**: Update `RecipeService` and synthesis flows to publish `recipe_changed` events.
- **Steps**:
    - Inject `IHealthEventPublisher` into `RecipeService`.
    - Call `PublishRecipeChangedAsync` on creation/update/synthesis.
- **Requirements**: AC 2
- **Verification**: Integration test confirms `health_events` row appears after recipe update.

### [ ] 2.2. Worker - Recipe Health Processor
- **Task**: Implement `HealthWorker` to process `recipe_changed` events.
- **Steps**:
    - Create `HealthWorker` (BackgroundService).
    - Implement `ProcessRecipeEventAsync`: Load recipe, recompute profile (copying from existing `DietaryProfile` or re-classifying), write to `health_recipe_profiles`.
- **Requirements**: AC 3
- **Verification**: Integration test confirms `health_recipe_profiles` row is created after event processing.

---

## Wave 3: Week Health Extraction

### [ ] 3.1. Logic - Week Changed Events
- **Task**: Update `ScheduleService` and `GroceryRecomputeService` to publish `week_changed` events.
- **Steps**:
    - Call `PublishWeekChangedAsync` whenever a slot is updated.
- **Requirements**: AC 2
- **Verification**: Integration test confirms `health_events` row appears after schedule update.

### [ ] 3.2. Worker - Week Health Processor
- **Task**: Implement `ProcessWeekEventAsync` in `HealthWorker`.
- **Steps**:
    - Load week calendar events.
    - Load recipe health profiles.
    - If any missing, reschedule week event.
    - Compute `WeeklyBalanceSummary` and write to `health_week_summaries`.
    - Publish SSE discovery nudge if targets reached.
- **Requirements**: AC 3
- **Verification**: Integration test confirms `health_week_summaries` row is created after event processing.

---

## Wave 4: Seams & Cleanup

### [ ] 4.1. Seam - Health Adapter
- **Task**: Implement `HealthAdapter` and inject it into existing WFS services.
- **Steps**:
    - Create `HealthAdapter` reading from new tables.
    - Update `ScheduleService` to use `HealthAdapter` for `BalanceSummary`.
- **Requirements**: AC 4
- **Verification**: Planner E2E tests still pass (confirming health data is visible).

### [ ] 4.2. Seam - Search Decoupling
- **Task**: Update `RecipeSearchService` to use `HealthAdapter`.
- **Steps**:
    - Remove direct dependency on `weekly_plans.balance_summary` in search reranking.
    - Use `HealthAdapter.GetWeekHealthAsync` instead.
- **Requirements**: AC 4
- **Verification**: Search E2E tests still pass.

### [ ] 4.3. Cleanup - WFS Extraction
- **Task**: Remove health ownership from `GroceryRecomputeService`.
- **Steps**:
    - Remove `WeeklyBalanceScorer` calls and `BalanceSummary` writes from `GroceryRecomputeService`.
- **Requirements**: AC 5
- **Verification**: `task gate` passes.

### [ ] 4.4. Cleanup - De-Zombification
- **Task**: Remove legacy models, processors, and workflows.
- **Steps**:
    - Delete `api/src/.../Services/Processors/ClassifyDietaryProfileProcessor.cs`.
    - Delete `api/src/.../Workflows/classify-recipe.yaml`.
    - Remove `classify_dietary_profile` tasks from all remaining YAML workflows.
    - Archive `specs/plans/2026-05-12-health-service-extraction.md` into `specs/archive/`.
- **Requirements**: AC 5
- **Verification**: `task gate` and `task review` pass.
