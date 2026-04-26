# Build Prompt 07: Workflow Worker - Dependency Promotion

**Persona**: Sr. Backend Developer
**Goal**: Implement the "Self-Promotion" logic that allows a worker to trigger downstream tasks automatically once their dependencies are satisfied.

## Strict Scope
- **MODIFY**: `api/src/RecipeApi/Services/WorkflowWorker.cs`
- **DEPENDENCY**: Must be built on top of Build Prompt 06.

## Contract & Decisions
- **Decision: Self-Promotion**: After a task finishes, the worker checks its immediate dependents.
- **Decision: Communication via Persistence**: The check is performed against the database state of other `WorkflowTask` records.

## Requirements
1.  **Promotion Logic**:
    - When a task is marked `Completed`:
        - Find all other tasks in the same `InstanceId` that have the current `TaskId` (or name) in their `DependsOn` array.
        - For each dependent task:
            - Check if ALL tasks listed in its `DependsOn` array are currently `Completed`.
            - If yes, update its status from `Waiting` to `Pending`.
2.  **Instance Completion**:
    - If a task completes and there are no more `Waiting`, `Pending`, or `Processing` tasks for that `InstanceId`, mark the `WorkflowInstance` as `Completed`.
3.  **Atomic Update**:
    - Perform the status update and the promotion check in a single DB transaction to prevent race conditions.

## TDD Protocol
1.  Integration Test:
    - Trigger a workflow with a 3-step linear chain (A -> B -> C).
    - Manually process Task A.
    - Verify Task B moves from `Waiting` to `Pending`.
    - Manually process Task B.
    - Verify Task C moves from `Waiting` to `Pending`.
2.  Verify "Diamond" dependencies (A -> B, A -> C, [B,C] -> D). Ensure D only moves to `Pending` after BOTH B and C are done.

## Mandatory Handover
- Summary of the promotion query logic.
- Confirmation of "Diamond Dependency" support.
