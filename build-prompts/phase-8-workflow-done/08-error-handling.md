# Build Prompt 08: Workflow Worker - Error Handling & Retries

**Persona**: Sr. Systems Engineer
**Goal**: Implement the "Binary Retry" strategy for handling transient vs. fatal errors in the workflow pipeline.

## Strict Scope
- **MODIFY**: `api/src/RecipeApi/Services/WorkflowWorker.cs`, `api/src/RecipeApi/Models/WorkflowTask.cs`
- **NEW**: `api/src/Workflow/Exceptions/TransientWorkflowException.cs`, `api/src/Workflow/Exceptions/FatalWorkflowException.cs`

## Contract & Decisions
- **Decision: Binary Retry**: 
    - Transient = Auto-retry with exponential backoff.
    - Fatal = Halt instance, manual intervention required.

## Requirements
1.  **Transient Error Logic**:
    - If a processor throws a `TransientWorkflowException`:
        - Increment `RetryCount`.
        - If `RetryCount < MaxRetries` (e.g., 3):
            - Set status to `Pending`.
            - Set `ScheduledAt` to `NOW + (2 ^ RetryCount) minutes`.
        - Else:
            - Treat as Fatal.
2.  **Fatal Error Logic**:
    - If any other exception occurs (or `MaxRetries` reached):
        - Set task status to `Failed`.
        - Set `WorkflowInstance.Status` to `Paused`.
        - Capture `ErrorMessage` and `StackTrace` in the task record.
3.  **No "Poison" Loops**:
    - Ensure the worker doesn't pick up `Failed` tasks until they are manually reset.

## TDD Protocol
1.  Unit Test:
    - Create a "Mock Processor" that throws `TransientWorkflowException`.
    - Run the worker and verify the `ScheduledAt` time increases exponentially.
2.  Integration Test:
    - Create a processor that throws `DivideByZeroException`.
    - Verify the entire `WorkflowInstance` is marked as `Paused`.

## Mandatory Handover
- Summary of the retry/backoff algorithm.
- Confirmation of "Halt" behavior on fatal errors.
