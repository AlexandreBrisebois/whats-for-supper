# Phase 2: Model Catalog & Capability Profiling

You are a senior .NET 10 engineer. Your task is to implement the **Model Catalog** system for the Custom Model Router.

## Objective
Implement a robust registry that catalogs available models, their providers, and their specific capabilities. This catalog will be the source of truth for the routing engine.

## Prerequisites
- Phase 1 (Foundation & Abstractions) must be complete.

## Design Constraints
- **Namespace**: `RecipeApi.Infrastructure.ModelRouter.Catalog`.
- **Configuration**: Use the `.NET Options Pattern` (`IOptions<ModelCatalogOptions>`).
- **Storage**: For now, the catalog will be backed by `appsettings.json`, but the interface should support future external providers.

## What to Implement

### 1. `ModelCatalogOptions`
Map the registry in `appsettings.json`:
- `Providers`: List of provider configs (BaseUrl, ApiKey placeholder, Family).
- `Models`: List of model descriptors with their capabilities.

### 2. `IModelCatalog`
Implement the `ModelCatalog` class:
- `Task<IEnumerable<ModelDescriptor>> GetActiveModelsAsync()`: Returns models that are enabled and healthy.
- `Task<ModelDescriptor?> GetByDeploymentNameAsync(string name)`: For Azure-style lookups.

### 3. Capability Resolution
Implement logic to "profile" a model based on its descriptor. For example, if a model has `SupportsJsonMode: false` but the request requires it, it should be filterable.

## TDD Requirements
Create `RecipeApi.Tests.Infrastructure.ModelRouter.CatalogTests`:
1. **Test**: `ModelCatalog` correctly loads models from a mocked `IOptions` object.
2. **Test**: Filtering logic correctly excludes models without a required capability (e.g., `SupportsStreaming`).
3. **Test**: Filtering logic excludes models that are marked as `isDisabled: true`.

## Instructions
1. Define the `ModelCatalogOptions` record.
2. Implement `IModelCatalog`.
3. Register the catalog in the DI container (use `AddSingleton` or `AddScoped`).
4. Ensure the tests pass using mocked configuration data.
