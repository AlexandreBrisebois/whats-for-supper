# Dietary separation migration — Phase 1

Phase 1 adds a WFS-owned vegetarian recipe fact without removing or changing the legacy dietary/health system.

## Representation

`recipes.is_vegetarian` remains the compatible public boolean. It is authoritative for the new WFS fact only when `vegetarian_classification_version` is the current classifier version. A null version is unknown, not non-vegetarian. `vegetarian_classified_at` records the successful classification time.

`vegetarian_classification_failed_at` and `vegetarian_classification_failure_reason` record the latest failed attempt without replacing a prior confirmed fact. A successful result clears them.

The server-owned policy is configured under `VegetarianClassification:NonVegetarianIngredients` in `api/appsettings.json`. Change that list to change the terms supplied to the classifier; no PWA or public API change is needed.

## Classifier contract

Normal acquisition uses the existing `CategorizeRecipe` call, extended with:

```json
{ "cuisineType": "Indian", "mealTypes": ["Supper"], "primaryMealType": "Supper", "isVegetarian": true }
```

The migration-only `ClassifyRecipeVegetarian` processor reads normalized ingredient names from `Recipe.Ingredients` and accepts only `{ "isVegetarian": true | false | null }`. It has no health, recipe-ready, schedule, grocery, description, image, notification, or indexing side effects.

## Operator workflow

Use the existing workflow trigger endpoint with a `parameters` object:

1. Trigger `vegetarian-classification-backfill` with no parameters, or `{ "force": "true" }` to reclassify current rows.
2. Poll the returned workflow instance. Each batch has a fixed server-side maximum of 25 recipes and schedules a cursor-based successor batch when needed.
3. Trigger `vegetarian-classification-status` and read its task result for live total/current/unknown/vegetarian/non-vegetarian/failed counts and classification timestamps.
4. After backfill tasks have settled, trigger the existing `search-reconciliation` workflow once. This is intentionally separate so the migration does not create one embedding job per classified recipe.

The persisted workflow tasks make interrupted work resumable. Current-version rows are skipped unless `force` is set. Failed classification tasks retain diagnostic state and can use the existing workflow-task reset/retry mechanism.

## Legacy comparison

`HealthComputationService` copies `Recipe.IsVegetarian` into `HealthRecipeProfile`; it does not independently classify vegetarian status. Phase 1 therefore preserves legacy data but has no independent legacy vegetarian signal for an apples-to-apples comparison in Phase 2.
