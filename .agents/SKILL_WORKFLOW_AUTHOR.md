# Skill: Workflow Author

This skill provides a repeatable pattern for creating new YAML-defined workflows and wiring them into the API.

---

## 1. What is a Workflow?

A workflow is a YAML file in `data/workflows/` that defines a named sequence of processor tasks. The `WorkflowOrchestrator` reads this file at trigger time, validates parameters, creates a `WorkflowInstance` and `WorkflowTask` rows in the database, and the `WorkflowWorker` background service executes each task in dependency order.

**Canonical example:** [`data/workflows/recipe-import.yaml`](../data/workflows/recipe-import.yaml)

```yaml
id: recipe-import
parameters:
  - recipeId
tasks:
  - id: extract_recipe
    processor: ExtractRecipe
    payload:
      recipeId: "{{ recipeId }}"
  - id: generate_hero
    processor: GenerateHero
    depends_on:
      - extract_recipe
    payload:
      recipeId: "{{ recipeId }}"
  - id: sync_recipe
    processor: SyncRecipe
    depends_on:
      - generate_hero
    payload:
      recipeId: "{{ recipeId }}"
```

---

## 2. YAML Schema

| Field | Required | Notes |
|---|---|---|
| `id` | ✅ | Must match the filename without `.yaml` |
| `parameters` | ✅ | List of required parameter names. All must be present at trigger time. |
| `tasks[].id` | ✅ | Unique within this workflow |
| `tasks[].processor` | ✅ | Must match the `ProcessorName` of a registered `IWorkflowProcessor` |
| `tasks[].depends_on` | ❌ | List of task IDs that must complete before this task runs |
| `tasks[].payload` | ❌ | Key/value pairs interpolated with `{{ paramName }}` syntax |

---

## 3. Adding a New Workflow — Checklist

### Step 1: Define the YAML
Create `data/workflows/{your-workflow-id}.yaml`. The `id` field must match the filename.

### Step 2: Implement Processors
Each `processor:` value must map to a class that implements `IWorkflowProcessor`.

```csharp
// api/src/RecipeApi/Services/Processors/YourProcessor.cs
namespace RecipeApi.Services.Processors;

public class YourProcessor(/* inject deps */) : IWorkflowProcessor
{
    public string ProcessorName => "YourProcessorName"; // must match yaml

    public async Task ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        // read task.Payload, do work
    }
}
```

Register in `Program.cs`:
```csharp
builder.Services.AddScoped<IWorkflowProcessor, YourProcessor>();
```

### Step 3: Add a Trigger Endpoint
The generic trigger already exists:
```
POST /api/workflows/{workflowId}/trigger
{ "parameters": { "paramName": "value" } }
```
Use this for single-item triggers. No new endpoint needed.

### Step 4: Add a Bulk Trigger (optional)
When you need to queue a workflow for many items at once (e.g., all unprocessed records), follow the `RecipeImportBulkService` pattern:

**Service:** `api/src/RecipeApi/Services/{Feature}BulkService.cs`
- Query the DB for eligible records
- Loop and call `IWorkflowOrchestrator.TriggerAsync(workflowId, parameters)` for each
- Return `{ QueuedCount, InstanceIds }`

**Endpoint:** Add to the relevant controller:
```csharp
[HttpPost("{your-workflow-id}/bulk-trigger")]
public async Task<IActionResult> BulkTrigger()
{
    var result = await bulkService.TriggerAllPendingAsync();
    return Accepted(result);
}
```

Register the service in `Program.cs`.

### Step 5: Update the OpenAPI Spec
Add the new endpoint(s) to `specs/openapi.yaml`.  
Run `task agent:reconcile` to verify alignment.

### Step 6: Add to REST Client
Add a call to the relevant file in `api/src/RestClient/`.

---

## 4. Key Types

| Type | File | Purpose |
|---|---|---|
| `IWorkflowOrchestrator` | `Services/IWorkflowOrchestrator.cs` | Entry point for triggering workflows |
| `WorkflowOrchestrator` | `Services/WorkflowOrchestrator.cs` | Reads YAML, creates DB records |
| `IWorkflowProcessor` | (interface) | Implement per task processor |
| `WorkflowWorker` | (background service) | Polls DB and dispatches tasks |
| `WorkflowInstance` | `Models/WorkflowInstance.cs` | DB entity for a workflow run |
| `WorkflowTask` | `Models/WorkflowTask.cs` | DB entity for a single task execution |
| `RecipeDbContext` | `Data/RecipeDbContext.cs` | `WorkflowInstances`, `WorkflowTasks` DbSets |

---

## 5. Monitoring

```
GET /api/workflows/active              — all Processing or Paused instances
GET /api/workflows/instances/{id}      — instance + all tasks
POST /api/workflows/tasks/{taskId}/reset  — unblock a failed task
```

REST client: `api/src/RestClient/07-workflow.rest`
