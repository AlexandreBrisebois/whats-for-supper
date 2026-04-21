# Phase 1: Foundation & Abstractions (Chat + Embeddings)

You are a senior .NET 10 architect. Your task is to implement the foundational domain models and core interfaces for the new **Custom Model Router**. 

## Objective
Establish the strongly typed contracts that will drive the routing system. These must support both **Chat Completion** (`IChatClient`) and **Embeddings** (`IEmbeddingGenerator`).

## Design Constraints
- **Namespace**: `RecipeApi.Infrastructure.ModelRouter.Abstractions` (and related sub-namespaces).
- **Target**: .NET 10 / C# 14.
- **Abstractions**: Use `Microsoft.Extensions.AI` (e.g., `IChatClient`, `IEmbeddingGenerator`).
- **Patterns**: Use `record class` for immutable data objects, `required` members, and primary constructors.
- **TDD**: Write unit tests FIRST.

## What to Implement

### 1. Domain Models (Records)
Implement the following records in `RecipeApi.Infrastructure.ModelRouter.Domain`:

- **`ModelDescriptor`**: Represents a specific model/deployment.
    - `ModelId` (string), `ProviderFamily` (string), `DisplayName` (string).
    - `Capabilities` (record): `SupportsStreaming`, `SupportsTools`, `SupportsJsonMode`, `SupportsVision`, `MaxInputTokens`, etc.
    - `Metadata`: Dictionary for provider-specific extras.
- **`ProviderDescriptor`**: Represents a provider (e.g., "Ollama", "AzureOpenAI").
- **`RoutingRequestContext`**: Normalized intent from the caller.
    - `RequestedCapabilities`, `TenantId`, `Priority`, `BudgetLimit`.
- **`RoutingDecision`**: The outcome of a routing pass.
    - `SelectedModelId`, `ProviderId`, `OrderedFallbackChain`, `ResolutionReason`.
- **`EmbeddingDescriptor`**: metadata for embedding models (vector dimensions, model name).

### 2. Core Interfaces
Implement these in `RecipeApi.Infrastructure.ModelRouter.Interfaces`:

- **`IModelRouter`**: Inherits from `IChatClient` AND `IEmbeddingGenerator`. This is the primary application-facing orchestrator.
- **`IRouteStrategy`**: Interface for different routing algorithms (e.g., `IRouteStrategy.SelectCandidateAsync`).
- **`IModelCatalog`**: Interface for the registry of available models.

## TDD Requirements
Create `RecipeApi.Tests.Infrastructure.ModelRouter.FoundationTests`:
1. **Test**: `ModelDescriptor` validation (ensure required fields are present).
2. **Test**: `RoutingRequestContext` can be correctly constructed given a set of constraints.
3. **Test**: `RoutingDecision` correctly captures a fallback chain.

## Instructions
1. Review the existing project structure in `/Users/alex/Code/whats-for-supper/api/src/RecipeApi`.
2. Create the files under the new namespaces.
3. Fix any compilation errors related to missing NuGet packages (ensure `Microsoft.Extensions.AI` is available).
4. Implement the tests first, then the logic.
5. Provide a summary of the types created.
