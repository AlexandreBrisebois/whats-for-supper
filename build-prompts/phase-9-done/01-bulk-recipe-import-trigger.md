# Build Prompt: Bulk Recipe Import Trigger

**Persona**: API Developer  
**Goal**: Add a `POST /api/workflows/recipe-import/bulk-trigger` endpoint that queries all unimported recipes from the database and queues a `recipe-import` workflow instance for each one.

---

## Context & Motivation

Recipes that have not been through the AI import pipeline have `null` values for `Name`, `RawMetadata`, and `Ingredients`. These are set by the `recipe-import` workflow (`data/workflows/recipe-import.yaml`) which runs `ExtractRecipe → GenerateHero → SyncRecipe`.

Currently there is no way to bulk-trigger this pipeline. Each recipe must be individually posted to `POST /api/workflows/recipe-import/trigger`. This endpoint is a one-off snapshot operation — it finds all pending recipes at the moment of the call and queues them. The individual workflow instances are self-managed after that.

---

## Codebase Reference

| Path | Purpose |
|---|---|
| `data/workflows/recipe-import.yaml` | Workflow definition — accepts `recipeId` parameter |
| `api/src/RecipeApi/Controllers/WorkflowController.cs` | Existing workflow API — follow this pattern |
| `api/src/RecipeApi/Services/IWorkflowOrchestrator.cs` | Interface: `TriggerAsync(string workflowId, Dictionary<string, string> parameters)` |
| `api/src/RecipeApi/Services/WorkflowOrchestrator.cs` | Concrete orchestrator registered as `IWorkflowOrchestrator` |
| `api/src/RecipeApi/Data/RecipeDbContext.cs` | `DbSet<Recipe> Recipes` |
| `api/src/RecipeApi/Models/Recipe.cs` | `Name` is `null` for unimported recipes |
| `api/src/RecipeApi/Dto/WorkflowTriggerResponseDto.cs` | `{ Guid InstanceId }` — reuse pattern |
| `api/src/RecipeApi/Program.cs` | Service registration — add `AddScoped<RecipeImportBulkService>()` |
| `api/src/RestClient/07-workflow.rest` | REST client — add a new call |
| `specs/openapi.yaml` | OpenAPI spec — must be updated |

---

## Strict Scope

**CREATE**:
- `api/src/RecipeApi/Services/RecipeImportBulkService.cs`
- `api/src/RecipeApi/Dto/BulkImportTriggerResponseDto.cs`

**MODIFY**:
- `api/src/RecipeApi/Controllers/WorkflowController.cs` — add one action
- `api/src/RecipeApi/Program.cs` — register the new service
- `api/src/RestClient/07-workflow.rest` — add the REST call
- `specs/openapi.yaml` — add the endpoint

---

## Requirements

### 1. DTO: `BulkImportTriggerResponseDto`

```csharp
namespace RecipeApi.Dto;

public class BulkImportTriggerResponseDto
{
    public int QueuedCount { get; set; }
    public List<Guid> InstanceIds { get; set; } = [];
}
```

### 2. Service: `RecipeImportBulkService`

```csharp
namespace RecipeApi.Services;

public class RecipeImportBulkService(RecipeDbContext db, IWorkflowOrchestrator orchestrator)
{
    public async Task<BulkImportTriggerResponseDto> TriggerAllPendingAsync()
    {
        var recipeIds = await db.Recipes
            .Where(r => r.Name == null)
            .Select(r => r.Id)
            .ToListAsync();

        var instanceIds = new List<Guid>();
        foreach (var id in recipeIds)
        {
            var instance = await orchestrator.TriggerAsync(
                "recipe-import",
                new Dictionary<string, string> { ["recipeId"] = id.ToString() });
            instanceIds.Add(instance.Id);
        }

        return new BulkImportTriggerResponseDto
        {
            QueuedCount = instanceIds.Count,
            InstanceIds = instanceIds
        };
    }
}
```

### 3. Controller action in `WorkflowController`

Inject `RecipeImportBulkService bulkImport` alongside the existing constructor parameters.

Add:
```csharp
/// <summary>
/// POST /api/workflows/recipe-import/bulk-trigger — queue a recipe-import instance for every unimported recipe.
/// </summary>
/// <returns>202 Accepted with the count and list of created instance IDs.</returns>
[HttpPost("recipe-import/bulk-trigger")]
public async Task<IActionResult> BulkTriggerRecipeImport()
{
    var result = await bulkImport.TriggerAllPendingAsync();
    return Accepted(result);
}
```

### 4. Program.cs Registration

Add before `var app = builder.Build();`:
```csharp
builder.Services.AddScoped<RecipeImportBulkService>();
```

### 5. REST Client (`07-workflow.rest`)

Append:
```
### 5. Bulk-trigger recipe-import for all unimported recipes
POST {{baseUrl}}/api/workflows/recipe-import/bulk-trigger
Accept: application/json
```

### 6. OpenAPI Spec (`specs/openapi.yaml`)

Add the endpoint under the `/api/workflows` paths. Response schema:
```yaml
BulkImportTriggerResponse:
  type: object
  properties:
    queuedCount:
      type: integer
    instanceIds:
      type: array
      items:
        type: string
        format: uuid
```

---

## C# Standards (enforce these)

- Primary constructors for DI (no `private readonly` fields unless necessary)
- File-scoped namespaces
- Collection expressions (`[]` not `new List<Guid>()`)
- No comments unless the WHY is non-obvious

---

## Verification

1. `dotnet build api/src/RecipeApi/` — must compile clean, zero warnings.
2. Start the API.
3. Fire `POST {{baseUrl}}/api/workflows/recipe-import/bulk-trigger` from `07-workflow.rest`.
4. Confirm response: `{ "queuedCount": N, "instanceIds": [...] }` with `202 Accepted`.
5. Fire `GET {{baseUrl}}/api/workflows/active` — the queued instances should appear with status `Processing` or `Pending`.
6. Run `task agent:reconcile` to verify OpenAPI spec alignment.

---

## Mandatory Handover

- Summary of new API surface.
- Confirmation that `specs/openapi.yaml` was updated.
- Confirmation that `dotnet build` passes.
