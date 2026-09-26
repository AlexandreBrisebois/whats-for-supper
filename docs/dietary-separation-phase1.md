# Dietary separation migration — Phase 1

Phase 1 established the WFS-owned vegetarian recipe fact. It remains a recipe
fact after the retired dietary/health model was removed in Phase 3.

## Representation

`recipes.is_vegetarian` is the WFS-owned nullable fact: `true` and `false` are confirmed classifications, while `null` is unknown. The public recipe response remains compatible by representing unknown as `false`; vegetarian filtering and search indexing use only confirmed `true` values.

The server-owned policy is configured under `VegetarianClassification:NonVegetarianIngredients` in `api/appsettings.json`. Change that list to change the terms supplied to the classifier; no PWA or public API change is needed.

## Classifier contract

Normal acquisition uses the existing `CategorizeRecipe` call, extended with:

```json
{ "cuisineType": "Indian", "mealTypes": ["Supper"], "primaryMealType": "Supper", "isVegetarian": true }
```

The migration-only `ClassifyRecipeVegetarian` processor reads normalized ingredient names from `Recipe.Ingredients` and accepts only `{ "isVegetarian": true | false | null }`. It has no health, recipe-ready, schedule, grocery, description, image, notification, or indexing side effects.

## Operator workflow

Use the existing workflow trigger endpoint with a `parameters` object:

1. Trigger `vegetarian-classification-backfill` with no parameters to classify unknown rows, or `{ "force": "true" }` to reclassify every row.
2. Poll the returned workflow instance. Each batch has a fixed server-side maximum of 25 recipes and schedules a cursor-based successor batch when needed.
3. Trigger `vegetarian-classification-status` and read its task result for live total/classified/unknown/vegetarian/non-vegetarian counts.
4. After backfill tasks have settled, trigger the existing `search-reconciliation` workflow once. This is intentionally separate so the migration does not create one embedding job per classified recipe.

The persisted workflow tasks make interrupted work resumable. Known rows are skipped unless `force` is set. Workflow-task state owns diagnostics and retry information.

## Boundary

Vegetarian classification is a WFS-owned recipe fact. Nutritional and dietetic
interpretation is outside WFS; this record does not prescribe an external
integration.
