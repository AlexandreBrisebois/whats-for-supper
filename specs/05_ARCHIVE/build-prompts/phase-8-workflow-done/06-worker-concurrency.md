# Build Prompt 06: Workflow Worker - Concurrency & Throttling

**Persona**: Sr. Systems Engineer
**Goal**: Implement the generic `WorkflowWorker` that handles high-concurrency task pickup with PostgreSQL row-level locking and per-processor throttling.

## Strict Scope
- **NEW**: `api/src/RecipeApi/Services/WorkflowWorker.cs`
- **DO NOT TOUCH**: The "Self-Promotion" logic (moving Waiting to Pending) in this prompt. Focus only on picking up and executing `Pending` tasks.

## Contract & Decisions
- **Decision: High Concurrency**: Use `SELECT ... FOR UPDATE SKIP LOCKED` to prevent multiple workers from picking the same task.
- **Decision: Per-Processor Throttling**: Use Semaphores to limit concurrent execution based on processor type.

## Technical Skeleton
```csharp
namespace RecipeApi.Services;

public class WorkflowWorker(
    IServiceScopeFactory scopeFactory,
    WorkflowRootResolver workflowRoot,
    ILogger<WorkflowWorker> logger) : BackgroundService 
{
    // Implementation
}
```

## Requirements
1.  **Throttling Config**:
    - Add a section to `appsettings.json` for "WorkflowThrottle":
      - `ExtractRecipe`: 1
      - `GenerateHero`: 2
      - `Default`: 5
2.  **Worker Loop**:
    - Poll the `WorkflowTasks` table for tasks where `Status == Pending` and `ScheduledAt <= NOW()`.
    - Use the raw SQL or EF `ForUpdate().SkipLocked()` equivalent.
3.  **Processor Execution**:
    - Resolve the correct `IWorkflowProcessor` based on the task's `ProcessorName`.
    - Execute within the throttle limit for that processor.
    - Update task status to `Processing` immediately upon pickup.
4.  **Completion**:
    - Update task status to `Completed` on success.
    - Update `UpdatedAt` timestamp.

## TDD Protocol
1.  Integration Test:
    - Insert 5 `Pending` tasks of type `ExtractRecipe`.
    - Configure throttle limit to `1`.
    - Start the worker and verify (via logs or DB) that only ONE task is `Processing` at a time.
2.  Verify that `SKIP LOCKED` works by running two instances of the worker logic in parallel tests and ensuring they don't pick the same IDs.

## Mandatory Handover
- Summary of the throttling implementation.
- Confirmation of `SKIP LOCKED` behavior.
