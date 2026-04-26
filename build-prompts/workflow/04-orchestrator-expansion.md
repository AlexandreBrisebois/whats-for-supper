# Build Prompt 04: Workflow Orchestrator - Snapshot Expansion

**Persona**: Sr. Backend Developer
**Goal**: Implement the "Snapshot at Trigger" logic that converts a validated Workflow Definition into a persistence-ready Instance and Tasks.

## Strict Scope
- **MODIFY**: `api/src/RecipeApi/Services/WorkflowOrchestrator.cs`
- **DEPENDENCY**: Must be built on top of Build Prompt 03.

## Contract & Decisions
- **Decision: Snapshot at Trigger**: Once triggered, the workflow is immutable. The tasks are generated and saved to the DB immediately.
- **Decision: Data-Agnostic Expansion**: Only perform shallow string replacement for `{{variables}}` using the trigger-time parameters.
- **Decision: Communication via Persistence**: Initial payloads are saved as JSONB.

## Requirements
1.  **Trigger Logic**:
    - Implement `TriggerAsync(string workflowId, Dictionary<string, string> parameters)`.
2.  **Variable Substitution**:
    - Iterate through all tasks in the definition.
    - For each `Payload` value, replace `{{key}}` with the corresponding value from the `parameters` dictionary.
3.  **Task Graph Generation**:
    - Create a `WorkflowInstance` in `Pending` status.
    - Create `WorkflowTask` records for every step.
    - **Initial Status**:
        - If a task has no `depends_on`, set status to `Pending`.
        - If a task has dependencies, set status to `Waiting`.
4.  **Atomic Transaction**:
    - Ensure the Instance and all Tasks are saved to the DB in a single transaction.

## TDD Protocol
1.  Write an integration test that:
    - Triggers a "recipe_import" workflow with a `recipe_id`.
    - Verifies that the `WorkflowInstance` is created in the DB.
    - Verifies that the "extract" task is `Pending` (no dependencies).
    - Verifies that the "hero" task is `Waiting` (depends on extract).
    - Verifies that the `Payload` JSON in the DB has the resolved `recipe_id` value.

## Mandatory Handover
- Summary of the expansion logic.
- Confirmation of transactional integrity.
