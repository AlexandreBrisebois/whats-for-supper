# ADR 019: Management Workflow Standardization

## Status
Accepted ✅

## Context
Originally, database management operations (Backup, Restore, Disaster Recovery) were handled by a dedicated `ManagementWorker` and a custom `ManagementTaskStore` (In-Memory). This created architectural divergence between "Workflows" (AI processing) and "Management Tasks," leading to redundant code for background execution, logging, and status tracking.

## Decision
We decided to standardize all background operations by pivoting the Management infrastructure to the generic **Workflow System**.

### 1. Management Processor
Created a `ManagementProcessor` that implements `IWorkflowProcessor`. This processor acts as a bridge to the existing `ManagementService`.

### 2. Standardized Tasks
Defined official workflow YAMLs for management tasks:
- `db-backup`
- `db-restore`
- `db-disaster-recovery`

### 3. Execution Engine
Removed `ManagementWorker` and `ManagementTaskStore`. These tasks are now picked up by the `WorkflowWorker` using PostgreSQL `FOR UPDATE SKIP LOCKED`.

### 4. Throttling
Applied a concurrency limit of `1` for all management processors in `appsettings.json` to ensure atomic database-wide operations.

## Consequences
- **Architectural Parity**: All asynchronous work in the API now follows the same "Workflow" paradigm.
- **Improved Observability**: Management task history is now persisted in `workflow_instances` and `workflow_tasks` tables, providing better visibility than the previous in-memory store.
- **Reduced Complexity**: Eliminated custom background worker and task state management code.
- **Unified Status API**: The `/api/management/status` endpoint now queries standard workflow tables.
