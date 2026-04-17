# Task 6: Global Management & Summary API

**Context**: Admins/Users need a high-level view of the import pipeline's health and throughput.

**Requirements**:
1. Implement `GET /api/recipes/import-status` in `RecipeImportController`.
2. Logic:
   - Count `recipes` where `raw_metadata` is not null (`importedCount`).
   - Count records in `recipe_imports` where `status = Pending` or `Processing` (`queueCount`).
   - Count records in `recipe_imports` where `status = Failed` (`failedCount`).
3. Return a consolidated JSON summary.

**Acceptance Criteria**:
- Endpoint returns accurate counts from both the recipe and import tables.
- Provides a clear view of the "Imported vs In-Queue" balance.
