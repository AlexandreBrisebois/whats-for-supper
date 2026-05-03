# Phase 7: Migration & Agent Refactoring

You are a senior .NET 10 developer. Your task is to transition the existing agents in the Recipe API to use the new **Model Router**.

## Objective
Update `RecipeExtractionAgent` and `RecipeHeroAgent` to consume the `IModelRouter` instead of the hardcoded `IChatClient`. Ensure the agents handle routing errors gracefully and benefit from the new provider-neutral abstractions.

## Prerequisites
- All previous phases (1-6) must be complete.
- The `IModelRouter` must be registered in the DI container in `Program.cs`.

## Design Constraints
- **Agents**: `RecipeApi.Services.Agents.RecipeExtractionAgent` and `RecipeApi.Services.Agents.RecipeHeroAgent`.
- **Fault Tolerance**: Implement logic to handle the new domain exceptions (e.g., `NoRouteFoundException`).
- **Metadata**: Utilize the usage and provider metadata returned by the router for enhanced logging within agents.

## What to Implement

### 1. Agent Refactoring
For both agents:
- Update the constructor to inject `IModelRouter` (or `IChatClient` if it is registered as the router implementation).
- Remove any lingering provider-specific assumptions (like OpenAI-specific `ChatOptions` properties if they were leaked).
- Update the extraction and hero generation loops to catch router-level failures and log them with the "Selected Candidate" information provided by the router's metadata.

### 2. Error Mapping
- Ensure that if the router fails after all fallbacks, the agent returns a meaningful error to the caller (or follows its internal "Soft Fail" policy for `RecipeHeroAgent`).

## TDD Requirements
Create or update `RecipeApi.Tests.Services.AgentMigrationTests`:
1. **Test**: `RecipeExtractionAgent` successfully extracts a recipe when the router selects the primary candidate.
2. **Test**: `RecipeExtractionAgent` still succeeds if the primary candidate fails and the router seamlessly falls back to a second healthy model.
3. **Test**: `RecipeHeroAgent` correctly executes its "Soft Fail" logic (logging a warning but finishing the import) if the `IModelRouter` throws a `NoRouteFoundException`.

## Instructions
1. Review the existing agents in `api/src/RecipeApi/Services/Agents/`.
2. Refactor the code to use the new abstraction.
3. Run all existing tests to ensure no regressions were introduced in the core recipe processing logic.
4. Verify that the logs now show the specific model and provider selected by the router for each agent task.
