---
name: workflow-author
description: Repeatable pattern for creating YAML-defined workflows and wiring them into the API via the WorkflowOrchestrator.
---

# Skill: Workflow Author

This skill provides a repeatable pattern for creating new YAML-defined workflows and wiring them into the API.

## 1. Scope and sources

Follow [contract/testing](../../core/contract-testing.md): approve affected API or
workflow intent, write regression tests, then implement. Existing authorization
persists. If a new endpoint is needed, define its approved OpenAPI operation before
endpoint tests and implementation; do not append the contract as a final step.

Bundled definitions are in `api/src/RecipeApi/Workflows/`. The canonical example is
[recipe-import.yaml](../../../api/src/RecipeApi/Workflows/recipe-import.yaml).
`WorkflowRepository` loads YAML through `IStorageProvider` in the `workflows`
partition; bundled definitions are seeded by `Infrastructure/WorkflowSeeder.cs`.
Verify the configured storage provider/root before assuming a local data path.
`WorkflowOrchestrator` validates parameters and persists `WorkflowInstance` with
`WorkflowTask` rows transactionally; `WorkflowWorker` dispatches processors.
These are application runtime entities, not agent tasks or Taskfile commands.

## 2. YAML Schema

| Field | Required | Notes |
|---|---|---|
| `name` | ✅ | Definition name; follow the bundled filename/name convention |
| `parameters` | ✅ | List of required parameter names. All must be present at trigger time. |
| `tasks[].name` | ✅ | Unique within this workflow |
| `tasks[].processor` | ✅ | Must match the `ProcessorName` of a registered `IWorkflowProcessor` |
| `tasks[].depends_on` | ❌ | List of task names that must complete before this task runs |
| `tasks[].payload` | ❌ | Key/value pairs interpolated with `{{ paramName }}` syntax |

---

## 3. Adding a New Workflow — Checklist

### Step 1: Define the YAML
Create a bundled YAML under `api/src/RecipeApi/Workflows/` using `name`, `parameters`,
`tasks[].name`, `processor`, optional `depends_on` and `payload`. Processor names
and dependency names must resolve. Follow the canonical example above.

### Step 2: Implement Processors
Each `processor:` value must map to a class that implements `IWorkflowProcessor`.

```csharp
// api/src/RecipeApi/Services/Processors/YourProcessor.cs
using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

public class YourProcessor(/* inject deps */) : IWorkflowProcessor
{
    public string ProcessorName => "YourProcessorName"; // must match yaml

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        // Illustrative only: implement the selected behavior and return its result.
        await Task.CompletedTask;
        return null;
    }
}
```

Register in `api/src/RecipeApi/Program.cs`:
```csharp
builder.Services.AddScoped<IWorkflowProcessor, YourProcessor>();
```

### Step 3: Add a Trigger Endpoint
The generic trigger already exists:
```
POST /api/workflows/{workflowId}/trigger
{ "parameters": { "paramName": "value" } }
```
Reuse it when the approved behavior and authorization boundary fit; a specialized
endpoint requires approved contract and tests first.

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

### Step 5: Verify the approved seam
The contract and tests were established before implementation. Run `task gen:client`
for approved API edits, `task typecheck` and affected tests, then
`task agent:reconcile`. Follow the shared execution harness for completion.

### Step 6: Add to REST Client
Add a call to the relevant file in `api/src/RestClient/`.

---

## 4. Key Types

Paths below are relative to `api/src/RecipeApi/`.

| Type | File | Purpose |
|---|---|---|
| `IWorkflowOrchestrator` | `Services/IWorkflowOrchestrator.cs` | Entry point for triggering workflows |
| `WorkflowOrchestrator` | `Services/WorkflowOrchestrator.cs` | Reads YAML, creates DB records |
| `IWorkflowProcessor` | `Workflow/IWorkflowProcessor.cs` | Implement per task processor |
| `WorkflowWorker` | `Services/WorkflowWorker.cs` | Polls DB and dispatches tasks |
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

## Behavioral verification

Test parameter validation, persisted instances/tasks, dependency ordering, failures,
retry scheduling and observable completion for the selected workflow. Preserve
side-effectful orchestration fakes in integration factories; returning an instance
without required persisted tasks cannot establish the behavior. Use
`task test:api` and applicable PWA/seam checks. Do not trigger bulk, reset, backup
or restore operations against live data unless their effects are authorized.
