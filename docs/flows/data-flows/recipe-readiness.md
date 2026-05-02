# Recipe Readiness — Data Flow

How a recipe transitions from the moment of capture (image upload or text description) all the way to `ready`.

## Domain definition

A recipe is **ready** when the full capture-to-import pipeline has completed for its path:

**Photo-upload path:**
1. User uploads images → stored in `data/recipes/{id}/original/`, `recipe.info` written, DB row inserted (`ImageCount > 0`)
2. `ExtractRecipe` — AI reads the images and produces `recipe.json`
3. `GenerateHero` — hero image created
4. `SyncRecipe` — `recipe.json` imported to DB (name, ingredients, metadata)
5. `RecipeReady` — validates Name is set and `ImageCount > 0` → **ready**

**Describe path:**
1. User submits name + description → `recipe.info` written with description, DB row inserted (`ImageCount = 0`, `IsSynthesized = false`)
2. `SynthesizeRecipe` — AI generates full `recipe.json` from description; sets `IsSynthesized = true`; description generated
3. `GenerateHero` — hero image created
4. `SyncRecipe` — `recipe.json` imported to DB (name, ingredients, metadata)
5. `RecipeReady` — validates Name is set and `IsSynthesized = true` → **ready**

## Computed rule

The ready state is computed on every call to `GET /api/recipes/{id}/status`. It is **not stored** in the database.

```
Photo-upload:  Name != null/empty  AND  ImageCount > 0
Describe:      Name != null/empty  AND  IsSynthesized = true
```

## Full flow — capture to ready

```mermaid
flowchart TD
    A([User captures recipe]) --> B{Capture mode}

    B -->|Photo upload| C[POST /api/recipes\nmultipart + images]
    B -->|Text description| D[POST /api/recipes/describe\nname + description]

    C --> C1[Images saved to disk\nrecipe.info written\nDB row: ImageCount = n]
    D --> D1[recipe.info written with description\nDB row: ImageCount = 0\nIsSynthesized = false]

    C1 --> G[recipe-import workflow triggered]
    D1 --> H[goto-synthesis workflow triggered]

    G --> G1[ExtractRecipe\nAI reads images → recipe.json]
    G1 --> G2[GenerateHero\nhero image created]
    G2 --> G3[SyncRecipe\nrecipe.json imported to DB]
    G3 --> G4[RecipeReady\nName set AND ImageCount > 0]

    H --> H1[SynthesizeRecipe\nAI generates recipe.json\nIsSynthesized = true\ndescription written]
    H1 --> H2[GenerateHero\nhero image created]
    H2 --> H3[SyncRecipe\nrecipe.json imported to DB]
    H3 --> H4[RecipeReady\nName set AND IsSynthesized = true]

    G4 --> R([Status: ready])
    H4 --> R
```

## RecipeReadyProcessor

`api/src/RecipeApi/Services/Processors/RecipeReadyProcessor.cs`

The final step in both workflows. It validates the upstream work is complete and logs a warning if not. It does **not** mutate any fields — `ImageCount` is set at upload time, `IsSynthesized` is set by `RecipeAgent.DoSynthesizeRecipeAsync`.

## Status query

`GET /api/recipes/{id}/status` → `RecipeService.GetRecipeStatus()`

```csharp
var isReady = (!string.IsNullOrWhiteSpace(recipe.Name) && recipe.ImageCount > 0)
           || (!string.IsNullOrWhiteSpace(recipe.Name) && recipe.IsSynthesized);
var status = isReady ? "ready" : "pending";
```

Returns `RecipeStatusDto { Id, Name, Status, ImageCount, IsSynthesized }`.
