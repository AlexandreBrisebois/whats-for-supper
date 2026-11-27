# Recipe Readiness — Data Flow

How a recipe transitions from the moment of capture (image upload or text description) all the way to `ready`.

## Domain definition

A recipe is **ready** when the full capture-to-import pipeline has completed for its path:

**Photo-upload path:**

1. User uploads images → stored in `data/recipes/{id}/original/`, `recipe.info` written, DB row inserted (`ImageCount > 0`)
2. `ExtractRecipe` — AI reads the images and produces `recipe.json`
3. `GenerateHero` — hero image created
4. `SyncRecipe` — `recipe.json` imported to DB (name, ingredients, metadata)
5. `CategorizeIngredients` — LLM normalises ingredient names to grocery sections
6. `CategorizeRecipe` — classifies cuisine, meal types, vegetarian confirmation
7. `RecipeReady` — persists `IsReady = true`, updates `recipe.info`, emits `recipe_ready`
8. `CompleteRecipeImportReport` — closes any linked import report
9. `QueueRecipeSearchIndex` — enqueues background search document/embedding indexing

**Describe path (goto-synthesis):**

1. User submits name + description → `recipe.info` written with description, DB row inserted (`ImageCount = 0`, `IsSynthesized = false`)
2. `SynthesizeRecipe` — AI generates full `recipe.json` from description; sets `IsSynthesized = true`
3. `GenerateHero` — hero image created
4. `SyncRecipe` — `recipe.json` imported to DB (name, ingredients, metadata)
5. `CategorizeIngredients` — LLM normalises ingredient names to grocery sections
6. `CategorizeRecipe` — classifies cuisine, meal types, vegetarian confirmation
7. `RecipeReady` — persists `IsReady = true`, updates `recipe.info`, emits `recipe_ready`
8. `QueueRecipeSearchIndex` — enqueues background search document/embedding indexing

**URL import path:**

1. User shares a recipe URL → DB row stub created, `recipe.info` written
2. `FetchUrlContent` — downloads page, extracts schema.org JSON-LD / readable content
3. `ExtractRecipe` — AI normalises extracted content into `recipe.json`
4. `GenerateHero` — hero image created
5. `SyncRecipe` — extracted metadata imported to DB
6. `CategorizeIngredients` — LLM normalises ingredient names to grocery sections
7. `CategorizeRecipe` — classifies cuisine, meal types, vegetarian confirmation
8. `RecipeReady` — persists `IsReady = true`, updates `recipe.info`, emits `recipe_ready`
9. `CompleteRecipeImportReport` — closes any linked import report
10. `QueueRecipeSearchIndex` — enqueues background search document/embedding indexing

## Persisted readiness

`RecipeReadyProcessor` sets `recipes.is_ready = true` in PostgreSQL (along with `IsDiscoverable`, `RotationSource`, duplicate checks, and `recipe.info`'s `isReady`), and `GET /api/recipes/{id}/status` (`RecipeService.GetRecipeStatus`) reads `recipe.IsReady` directly.

## Full flow — capture to ready

All three import workflows share the same enrichment tail that runs **after** the recipe is synced to the database:

```
→ CategorizeIngredients      (LLM: normalise ingredient names into grocery sections)
→ CategorizeRecipe           (classify cuisine, meal types, vegetarian facts)
→ RecipeReady                (persists IsReady = true, updates recipe.info, emits SSE recipe_ready)
→ CompleteRecipeImportReport (recipe-import and url-import)
→ QueueRecipeSearchIndex     (enqueues search-index workflow)
```

`recipe-description-regeneration` does not run `CategorizeIngredients` or
`RecipeReady`.

```mermaid
flowchart TD
    A([User captures recipe]) --> B{Capture mode}

    B -->|Photo upload| C[POST /api/recipes\nmultipart + images]
    B -->|Text description| D[POST /api/recipes/describe\nname + description]
    B -->|URL share| E[POST /api/recipes/capture-url\nurl]

    C --> C1[Images saved to disk\nrecipe.info written\nDB row: ImageCount = n]
    D --> D1[recipe.info written with description\nDB row: ImageCount = 0\nIsSynthesized = false]
    E --> E1[DB row stub created\nrecipe.info written]

    C1 --> G[recipe-import workflow triggered]
    D1 --> H[goto-synthesis workflow triggered]
    E1 --> I[url-import workflow triggered]

    G --> G1[ExtractRecipe\nAI reads images → recipe.json]
    G1 --> G2[GenerateHero\nhero image created]
    G2 --> G3[SyncRecipe\nrecipe.json imported to DB]

    H --> H1[SynthesizeRecipe\nAI generates recipe.json\nIsSynthesized = true]
    H1 --> H2[GenerateHero\nhero image created]
    H2 --> H3[SyncRecipe\nrecipe.json imported to DB]

    I --> I1[FetchUrlContent → ExtractRecipe\ndownload + extract recipe.json]
    I1 --> I2[GenerateHero\nhero image created]
    I2 --> I3[SyncRecipe\nrecipe.json imported to DB]

    G3 --> TAIL[Standard enrichment tail]
    H3 --> TAIL
    I3 --> TAIL

    TAIL --> T1[CategorizeIngredients → CategorizeRecipe]
    T1 --> T3[RecipeReady\npersists IsReady = true + recipe.info]
    T3 --> T4[CompleteRecipeImportReport → QueueRecipeSearchIndex]

    T4 --> R([Status: ready\nSSE: recipe_ready emitted])
```

## RecipeReadyProcessor

`api/src/RecipeApi/Services/Processors/RecipeReadyProcessor.cs`

Sets `recipe.IsReady = true`, updates `IsDiscoverable` / `RotationSource`, checks for suspected duplicates, writes `isReady` to `recipe.info`, and emits `recipe_ready`.

## Status query

`GET /api/recipes/{id}/status` → `RecipeService.GetRecipeStatus()` reads `recipe.IsReady` directly and returns `RecipeStatusDto { Id, Name, Status, ImageCount, IsSynthesized }`.

## Enrichment processors

| Processor                    | Workflow(s)                               | What it writes                                              |
| ---------------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| `CategorizeIngredients`      | recipe-import, url-import, goto-synthesis | Grocery section per ingredient into `ingredient_categories` |
| `CategorizeRecipe`           | recipe-import, url-import, goto-synthesis | Cuisine, meal types, and vegetarian classification          |
| `RecipeReady`                | recipe-import, url-import, goto-synthesis | Sets `IsReady = true`, updates `recipe.info`, emits SSE     |
| `CompleteRecipeImportReport` | recipe-import, url-import                 | Resolves open import report if triggered from repair        |
| `QueueRecipeSearchIndex`     | recipe-import, url-import, goto-synthesis | Enqueues background `index-recipe-search` workflow          |
