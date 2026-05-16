# Task 5: Background Worker & Phase 2 Sync (Cleanup Lifecycle)

**Context**: The worker service coordinates the agents and handles the transition from Disk (Phase 1) to Database (Phase 2).

**Requirements**:
1. Create `RecipeImportWorker` (inheriting from `BackgroundService`).
2. Implement a polling loop (e.g., every 5-10 seconds) for `Pending` items in `recipe_imports`.
3. Execution Logic:
   - Mark record as `Processing`.
   - Run `RecipeExtractionAgent` (Phase 1: `recipe.json` on disk).
   - Run `RecipeHeroAgent` (Phase 1: `hero.jpg` on disk).
   - **Phase 2 (Sync)**: Read `recipe.json` from the NAS and update the `recipes` table record (`raw_metadata` and `ingredients` columns).
   - **Cleanup**: Delete the `recipe_imports` record upon successful sync.
4. Implement basic retry/error handling.

**Acceptance Criteria**:
- Worker correctly picks up pending tasks.
- Background process completes Phase 1 and Phase 2.
- The command record is removed from the database on success.
