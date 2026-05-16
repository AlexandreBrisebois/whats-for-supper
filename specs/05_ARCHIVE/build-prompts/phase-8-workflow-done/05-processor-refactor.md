# Build Prompt 05: Processor Interface & Agent Refactor

**Persona**: Sr. Software Engineer
**Goal**: Standardize the AI Agents into a unified `IWorkflowProcessor` interface to enable dynamic execution by the worker.

## Strict Scope
- **NEW**: `api/src/Workflow/IWorkflowProcessor.cs`
- **MODIFY**: `api/src/RecipeApi/Services/Agents/RecipeExtractionAgent.cs`, `api/src/RecipeApi/Services/Agents/RecipeHeroAgent.cs`
- **NEW**: `api/src/RecipeApi/Services/Processors/SyncRecipeProcessor.cs` (Ported from `RecipeImportWorker.SyncDiskToDb`)

## Contract & Decisions
- **Decision: Strict recipe.info**: All processors must verify the existence of `recipe.info` as the primary anchor.
- **Decision: Communication via Persistence**: Processors read/write to `recipe.json` or the DB directly; they do not pass in-memory state.

## Technical Skeleton
```csharp
namespace RecipeApi.Services.Processors;

public interface IWorkflowProcessor {
    string ProcessorName { get; }
    Task ExecuteAsync(WorkflowTask task, CancellationToken ct);
}
```

## Requirements
1.  **IWorkflowProcessor Interface**:
    ```csharp
    public interface IWorkflowProcessor {
        string ProcessorName { get; }
        Task ExecuteAsync(WorkflowTask task, CancellationToken ct);
    }
    ```
2.  **Refactor Extraction Agent**:
    - Implement `IWorkflowProcessor`.
    - Name: `ExtractRecipe`.
    - Extract the core extraction logic from `RecipeExtractionAgent` into `ExecuteAsync`.
3.  **Refactor Hero Agent**:
    - Implement `IWorkflowProcessor`.
    - Name: `GenerateHero`.
    - Port the image generation logic.
4.  **Create Sync Processor**:
    - Implement `IWorkflowProcessor`.
    - Name: `SyncRecipe`.
    - Port the `SyncDiskToDb` logic from the old `RecipeImportWorker`.
    - **Strictness**: Must fail if `recipe.info` is missing. Must fail if `ImageCount` is invalid.

## TDD Protocol
1.  Write unit tests for each processor:
    - `ExtractRecipe`: Verify it reads the ID from the `task.Payload` and produces a `recipe.json`.
    - `SyncRecipe`: Verify it fails if `recipe.info` is deleted.
2.  Ensure all processors are registered in the DI container (use a collection-based registration for `IWorkflowProcessor`).

## Mandatory Handover
- Summary of the refactored agents.
- Confirmation of "Strict Info" implementation in the Sync processor.
