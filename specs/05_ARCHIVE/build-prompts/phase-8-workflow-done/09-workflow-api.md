# Build Prompt 09: Workflow API & Manual Intervention

**Persona**: API Developer
**Goal**: Implement the RESTful endpoints for triggering workflows, monitoring progress, and manually recovering from failures.

## Strict Scope
- **NEW**: `api/src/RecipeApi/Controllers/WorkflowController.cs`
- **MODIFY**: `api/src/RecipeApi/Controllers/RecipeImportController.cs` (Deprecate or bridge to the new controller).

## Contract & Decisions
- **Decision: Strict API**: All endpoints must return standard response envelopes.
- **Decision: Manual Recovery**: We need an explicit "Reset" endpoint to unpause a stalled workflow.

## Requirements
1.  **Trigger Endpoint**:
    - `POST /api/workflows/{workflowId}/trigger`
    - Accepts a JSON body of parameters.
    - Returns the `instanceId`.
2.  **Status Endpoints**:
    - `GET /api/workflows/instances/{instanceId}`: Returns the instance metadata and all associated tasks.
    - `GET /api/workflows/active`: Returns a list of all `Processing` or `Paused` instances.
3.  **Intervention Endpoints**:
    - `POST /api/workflows/tasks/{taskId}/reset`: 
        - Resets `Status` to `Pending`.
        - Resets `RetryCount` to 0.
        - Sets `ScheduledAt` to `NOW`.
        - Updates the `WorkflowInstance.Status` back to `Processing/Pending`.
4.  **OpenAPI Update**:
    - Add these endpoints to `specs/openapi.yaml`.

## TDD Protocol
1.  Verify endpoints using `api/src/RecipeApi/RestClient/workflow-testing.http`.
2.  Test the "Reset" flow:
    - Force a task to `Failed`.
    - Call the reset endpoint.
    - Verify the worker picks it up again immediately.

## Mandatory Handover
- Summary of the new API surface.
- Confirmation of OpenAPI spec alignment.
