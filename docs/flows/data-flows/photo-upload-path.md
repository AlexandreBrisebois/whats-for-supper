# Photo Upload Path — Data Flow

How a recipe created via photo upload (`POST /api/recipes`) flows through the system to become ready.

## Sequence

```mermaid
sequenceDiagram
    participant PWA as PWA (MinimalCapture)
    participant API as RecipeController
    participant Svc as RecipeService
    participant Val as ValidationService
    participant Img as ImageService
    participant DB as Database
    participant Disk as Disk (recipe.info + images)
    participant Orch as WorkflowOrchestrator
    participant Wf as recipe-import workflow

    PWA->>API: POST /api/recipes (multipart)\n  X-Family-Member-Id: {memberId}\n  files: [image1, image2, ...]\n  body: { name?, notes? }

    API->>Svc: CreateRecipe(familyMemberId, files, dto)

    Svc->>Val: ValidateImages(files)
    Val-->>Svc: validated

    Svc->>Img: SaveImages(recipeId, files)
    Img->>Disk: write data/recipes/{id}/original/{filename}
    Img-->>Svc: imageCount

    Svc->>Img: CreateRecipeInfo({ Id, Name, ImageCount,\n  AddedBy=familyMemberId, CreatedAt=now, ... })
    Img->>Disk: write data/recipes/{id}/recipe.info

    Svc->>DB: INSERT Recipe\n  Name, ImageCount, AddedBy=familyMemberId\n  CreatedAt=now

    Svc->>Orch: TriggerAsync("recipe-import", { recipeId })

    Orch->>Wf: ImportRecipe → GenerateHero\n→ SyncRecipe → RecipeReady

    Wf->>DB: AI metadata merged, ImageCount confirmed
    Wf->>Disk: recipe.json written (SyncRecipe)

    API-->>PWA: 200 { id }
```

## Key contrast with describe path

| Aspect | Photo upload | Describe (text) |
|--------|-------------|-----------------|
| `recipe.info` written | Immediately at upload | Immediately at POST /describe |
| `ImageCount` at creation | `n` (actual image count) | `0` |
| `ImageCount` after workflow | Unchanged (already > 0) | Stays `0` — readiness gated on `IsSynthesized` instead |
| Workflow | `recipe-import` | `goto-synthesis` |
| `recipe.json` | Written by SyncRecipe | Written by SyncRecipe |
| Status path | Already ready if Name set | Pending until RecipeReady runs |
