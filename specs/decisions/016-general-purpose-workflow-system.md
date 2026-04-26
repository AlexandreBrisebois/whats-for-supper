# ADR 016: General-Purpose Workflow System

## Status
Proposed (2026-04-26)

## Context
The current recipe import process is implemented as a monolithic `RecipeImportWorker` that hardcodes the execution order of AI agents (Extraction -> Hero -> Sync). This approach is difficult to extend, lacks granular observability, and cannot easily recover from partial failures in a resilient way.

## Decision
We will transition to a **General-Purpose Workflow System** using a declarative, YAML-based DAG (Directed Acyclic Graph) architecture.

### Key Architectural Pillars:
1.  **Declarative Pipelines**: Workflows are defined in YAML files on disk (e.g., `recipe-import.yaml`).
2.  **Snapshot at Trigger**: Upon trigger, the YAML is expanded into a set of `WorkflowTask` records in the database. Execution is thereafter decoupled from the YAML file.
3.  **Self-Promoting Worker**: The worker uses `FOR UPDATE SKIP LOCKED` for concurrency. After a task finishes, the worker promotes dependent tasks from `Waiting` to `Pending`.
4.  **Binary Retry Protocol**:
    *   **Transient Errors**: Auto-retry with exponential backoff.
    *   **Fatal Errors**: Halt the entire workflow instance for manual intervention.
5.  **Communication via Persistence**: Tasks exchange state through the filesystem (e.g., `recipe.json`) or the DB, ensuring resilience across retries.
6.  **Per-Processor Throttling**: Concurrency limits are enforced per processor type via semaphores (defined in `appsettings.json`).

## Consequences
*   **Infrastructure**: Data will be consolidated into a `/data` root mount.
*   **Database**: The `recipe_imports` table will be replaced by generic `workflow_instances` and `workflow_tasks` tables.
*   **Schema**: Database will be reset to clear "ghost" history and start with a clean migration path.
*   **Maintenance**: Adding new steps (e.g., Nutrition Analysis) no longer requires modifying the worker's C# code.
