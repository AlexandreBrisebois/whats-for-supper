# Phase 6: API Integration & Observability

You are a senior .NET 10 developer. Your task is to integrate the **Model Router** into the Recipe API and implement first-class observability.

## Objective
Finalize the integration by updating `Program.cs`, implementing the configuration schema in `appsettings.json`, and adding OpenTelemetry instrumentation to track routing decisions and performance.

## Prerequisites
- All previous phases (Foundation through Orchestration) must be complete.

## Design Constraints
- **Configuration**: Use `AgentSettings` as the root for `ModelCatalogOptions`.
- **Observability**: Use `System.Diagnostics.Activity` for tracing and `System.Diagnostics.Metrics` for custom metrics.
- **API**: Expose diagnostic endpoints for the router.

## What to Implement

### 1. `Program.cs` Integration
- Replace the existing hardcoded `AddChatClient` registration with a registration for `IModelRouter`.
- Registered `IModelRouter` should be what `RecipeExtractionAgent` and `RecipeHeroAgent` receive via DI.
- Add OpenTelemetry configuration for the new Router-specific activity source and meter.

### 2. `RoutingController`
Create a diagnostic API:
- **`GET /api/router/models`**: List all cataloged models and their health status.
- **`POST /api/router/evaluate`**: Accept a `RoutingRequestContext` and return a `RoutingDecision` (Selected model + score breakdown) WITHOUT executing the model.

### 3. OpenTelemetry & Logging
- **Logging**: Emit a structured log for every `RoutingDecision`, including the `ResolutionReason`.
- **Metrics**: 
    - `router.selection_latency`: Histogram of how long it takes to pick a model.
    - `router.provider_invocation_count`: Counter per provider/model.
    - `router.fallback_count`: Counter for how often a fallback occurs.
- **Traces**: Create a span for the entire routing and execution pipeline.

## TDD Requirements
Create `RecipeApi.Tests.Integration.RouterIntegrationTests`:
1. **Test**: An HTTP call to `/api/router/evaluate` returns a `200 OK` with a valid `RoutingDecision` object.
2. **Test**: Verify that `RecipeExtractionAgent` (resolved from DI) uses the `ModelRouter` and receives metrics correctly in a simulated run.
3. **Test**: Verify that traces are correctly propagated through the router.

## Instructions
1. Update `appsettings.json` with a sample multi-provider configuration (Azure, OpenAI, Gemini, Ollama).
2. Hook up the DI in `Program.cs`.
3. Implement the controller.
4. Verify the observability output via the console exporter or a local collector.
