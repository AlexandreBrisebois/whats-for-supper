# ADR 017: Bulk Workflow Trigger Pattern

## Status
Accepted

## Context
As the "What's For Supper" platform scales, there is a recurring need to trigger workflow processing for large batches of existing data (e.g., re-importing all recipes after an AI model upgrade, or bootstrapping the system with a large set of raw captures).

The previous implementation required individual calls to `POST /api/workflows/{id}/trigger` for each item, which is inefficient for both the client (multiple round-trips) and the server (redundant DB lookups for item validation).

## Decision
We are implementing a "Bulk Trigger" pattern for workflows that allows triggering multiple instances based on a server-side query or a set of identifiers in a single request.

Key aspects of this pattern:
1.  **Endpoint Convention**: Use `POST /api/workflows/{workflowId}/bulk-trigger`.
2.  **Specialized Service**: Logic for identifying "pending" or "target" items is encapsulated in a dedicated service (e.g., `RecipeImportBulkService`) to keep the `WorkflowController` clean.
3.  **Atomic Orchestration**: The service iterates over target items and calls `IWorkflowOrchestrator.TriggerAsync` for each, ensuring that each instance is self-contained and independently retryable.
4.  **Response Schema**: Return a `BulkImportTriggerResponseDto` (or equivalent) containing the `QueuedCount` and a list of created `InstanceIds`.
5.  **Status Code**: Return `202 Accepted` as the bulk operation initiates long-running background tasks.

## Consequences
- **Pros**:
    - Significantly reduces client-side complexity for bulk operations.
    - Centralizes "pending" logic on the server, ensuring consistency.
    - Leverages the existing robust `WorkflowOrchestrator` for individual task management.
- **Cons**:
    - Large batches may cause a sudden spike in database and CPU load (mitigated by `WorkflowWorker` throttling).
    - Long-running trigger calls (the loop itself) might approach HTTP timeout limits if thousands of items are processed synchronously in the controller (future enhancement: move the "loop" itself to a background task if batches grow very large).
