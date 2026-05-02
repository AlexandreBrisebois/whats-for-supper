# Recipe Readiness — Data Flow

How a recipe transitions from `pending` to `ready` in the What's For Supper system.

## Computed rule

A recipe is **ready** when:

```
Name != null/empty  AND  ImageCount > 0
```

This is **not stored** in the database. It is computed on every call to `GET /api/recipes/{id}/status` via `RecipeService.GetRecipeStatus()`.

## RecipeReadyProcessor

`api/src/RecipeApi/Services/Processors/RecipeReadyProcessor.cs`

Invoked as the final step in both synthesis workflows:

- `goto-synthesis` workflow (describe path)
- `recipe-import` workflow (photo-upload path)

```
RecipeReadyProcessor.ExecuteAsync(task)
  ├── If ImageCount == 0 → set ImageCount = 1, save  ⚠️ see note below
  └── If Name is null/empty → log warning (recipe stays "pending")
```

> ⚠️ **Known issue:** Setting `ImageCount = 1` when it is 0 is incorrect for the describe path. `ImageCount` should reflect the number of original images uploaded by the user, not serve as a readiness flag. A describe-path recipe has no original images; its hero is AI-generated. This workaround should be replaced with a dedicated readiness signal. See [describe-path.md](describe-path.md) for full context.

## The two paths to ready

```mermaid
flowchart TD
    A([User action]) --> B{Capture mode}

    B -->|Photo upload| C[POST /api/recipes\nmultipart + images]
    B -->|Describe text| D[POST /api/recipes/describe\nname + description]

    C --> E[RecipeService.CreateRecipe\nImageCount = n\nAddedBy set\nrecipe.info written immediately]
    D --> F[RecipeService.DescribeRecipe\nImageCount = 0\nAddedBy set\nrecipe.info written immediately]

    E --> G[recipe-import workflow triggered]
    F --> H[goto-synthesis workflow triggered]

    G --> G1[ImportRecipe processor\nAI extracts metadata]
    G1 --> G2[GenerateHero processor\ncreates hero image]
    G2 --> G3[SyncRecipe processor\nwrites recipe.json to disk\nsyncs DB ↔ disk]
    G3 --> G4[RecipeReady processor\nensures ImageCount > 0\nvalidates Name]

    H --> H1[SynthesizeRecipe processor\nAI generates full recipe]
    H1 --> H2[GenerateHero processor]
    H2 --> H3[SyncRecipe processor]
    H3 --> H4[RecipeReady processor\nensures ImageCount > 0\nvalidates Name]

    G4 --> R([Status: ready\nName != null AND ImageCount > 0])
    H4 --> R
```

## Status query

`GET /api/recipes/{id}/status` → `RecipeService.GetRecipeStatus()`

```csharp
var status = !string.IsNullOrWhiteSpace(recipe.Name) && recipe.ImageCount > 0
    ? "ready"
    : "pending";
```

Returns `RecipeStatusDto { Id, Status, ImageCount }`.
