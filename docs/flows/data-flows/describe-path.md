# Describe Path — Data Flow

How a recipe created via text description (`POST /api/recipes/describe`) flows through the system to become ready.

## Sequence

```mermaid
sequenceDiagram
    participant PWA as PWA (MinimalCapture)
    participant Auth as Kiota FamilyMemberAuthProvider
    participant API as RecipeController
    participant Svc as RecipeService
    participant Img as ImageService
    participant DB as Database
    participant Disk as Disk (recipe.info)
    participant Orch as WorkflowOrchestrator
    participant Wf as goto-synthesis workflow

    PWA->>Auth: describe.post({ name, description })
    Auth->>API: POST /api/recipes/describe\n+ X-Family-Member-Id header (auto-injected)

    API->>Svc: DescribeRecipe(dto, familyMemberId)

    Svc->>DB: INSERT Recipe\n  Name, Description\n  ImageCount=0, IsSynthesized=false\n  IsDiscoverable=false\n  AddedBy=familyMemberId\n  CreatedAt=now

    Svc->>Img: CreateRecipeInfo({ Id, Name, Description,\n  ImageCount=0, IsSynthesized=false, AddedBy, CreatedAt })
    Img->>Disk: write data/recipes/{id}/recipe.info

    Svc->>DB: SaveChangesAsync

    Svc->>Orch: TriggerAsync("goto-synthesis",\n  { recipeId, description })
    Note over Orch,Wf: Non-fatal — recipe exists even if trigger fails

    Orch->>Wf: SynthesizeRecipe → GenerateHero\n→ SyncRecipe → RecipeReady

    Wf->>DB: IsSynthesized = true (set by SynthesizeRecipe processor)
    Wf->>Disk: recipe.json written (SyncRecipe processor)

    API-->>PWA: 200 { data: { id, name, description,\n  createdAt, imageUrl: null } }
```

## Key facts

| Field | Set when | Value |
|-------|----------|-------|
| `AddedBy` | At creation | From `X-Family-Member-Id` header (nullable) |
| `CreatedAt` | At creation | `DateTimeOffset.UtcNow` |
| `ImageCount` | At creation | `0` — stays `0` for the entire describe path |
| `IsSynthesized` | After synthesis | `false` → `true` once `RecipeAgent.DoSynthesizeRecipeAsync` succeeds |
| `recipe.info` | At creation | Written immediately with all identity fields |
| `recipe.json` | After synthesis | Written by SyncRecipe processor |
| Status | After RecipeReady runs | `pending` → `ready` (gated on `IsSynthesized`, not `ImageCount`) |

## Header injection

The `X-Family-Member-Id` header is injected automatically by `FamilyMemberAuthProvider` in `pwa/src/lib/api/api-client.ts`. No manual header management is needed in components.
