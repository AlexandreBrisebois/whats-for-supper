# ADR 041: Workflow-Based Search Indexing Migration

## Status
Proposed

## Context
The previous search indexing implementation was a standalone service (`SearchIndexWorkflow.cs`) that operated synchronously or via ad-hoc background tasks. This approach had several limitations:
1. **Lack of Resiliency**: Transient failures from the Gemini API (e.g., rate limits, timeouts) resulted in permanent "failed" status for recipe indexing, requiring manual intervention.
2. **Observability**: There was no centralized way to monitor the status of indexing tasks across the entire library.
3. **Throttling**: Bulk reindexing operations could overwhelm the API quota if not carefully managed.
4. **Idempotency**: While fingerprints were used, there was no robust locking mechanism to prevent race conditions during concurrent updates.

## Decision
We have migrated the search indexing logic to the system's core **Workflow Engine**.

1. **IWorkflowProcessor Implementation**: `SearchIndexWorkflow` now implements the `IWorkflowProcessor` interface (registered as `IndexRecipeSearch`).
2. **YAML-Defined Workflows**: A new workflow `index-recipe-search.yaml` defines the indexing pipeline (Synthesis -> Hero Generation -> Search Indexing).
3. **Automated Retries**: Indexing tasks now benefit from the `WorkflowWorker`'s exponential backoff retry schedule (up to 10 attempts over several hours).
4. **Orchestration**: All recipe mutations (Create, Update, Restore) and management backfills now trigger the `index-recipe-search` workflow via the `IWorkflowOrchestrator`.
5. **Fingerprint Validation**: The processor validates the `source_fingerprint` at the *moment of execution*. If the recipe has changed since the task was enqueued, the task is safely skipped.
6. **Native HTTP Fallback**: To ensure immediate stability in environments with SDK version conflicts, a native `HttpClient`-based embedding provider is used, bypassing the `Microsoft.Extensions.AI` abstraction layer until it is stabilized.

## Consequences
- **Resilience**: The system is now self-healing; transient API failures are resolved automatically by the background worker.
- **Observability**: Indexing status can be queried using standard workflow telemetry (`workflow_instances` and `workflow_tasks` tables).
- **Decoupling**: The API controller no longer performs expensive or brittle indexing operations; it merely enqueues the intent.
- **Consistency**: The same workflow used for initial import is now used for ongoing updates and bulk reindexing.
