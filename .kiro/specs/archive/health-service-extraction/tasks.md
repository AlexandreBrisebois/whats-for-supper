# Tasks: Health Service Extraction

## Wave 1: Infrastructure & Persistence
- [x] Task 1.1: Define `HealthEvent` model and `health_events` table for the outbox pattern.
- [x] Task 1.2: Define `HealthRecipeProfile` and `HealthWeekSummary` models with corresponding tables.
- [x] Task 1.3: Update `RecipeDbContext` to include the new health tables.
- [x] Task 1.4: (Optional) Run initial migration or verify schema in test environment.

## Wave 2: Recipe Health Extraction
- [x] Task 2.1: Implement `IHealthEventPublisher` and `DbHealthEventPublisher` for event-driven persistence.
- [x] Task 2.2: Implement `HealthWorker` and `HealthComputationService` for asynchronous event processing.
- [x] Task 2.3: Finalize background service foundation and register in production DI container.
- [x] Task 2.4: Perform "Zero Drift" audit to ensure all schema updates maintain architectural integrity.

## Wave 3: Summarization & Optimization
- [x] Task 3.1: Implement `HealthWeekSummary` computation logic in `HealthWorker` for `week_changed` events.
- [x] Task 3.2: Implement linear backoff and error tracking for failed health events.
- [x] Task 3.3: (Optional) Implement PostgreSQL `LISTEN`/`NOTIFY` for event notifications.
- [x] Task 3.4: Final cleanup: Delete `ClassifyDietaryProfileProcessor` and old health logic.
