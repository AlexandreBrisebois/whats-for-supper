# Build Prompt: Future-Proof Custom Model Router for .NET 10

This document defines the requirements and phased implementation plan for a production-ready custom model router in the Recipe API.

## Core Objective
Build a reusable **model routing subsystem** that:
- Uses `Microsoft.Extensions.AI` as the application-facing abstraction layer.
- Routes each request to the best target model/provider (Azure, Ollama, Gemini, OpenAI, Anthropic).
- Supports policy-driven routing, fallback, health-aware failover, and structured observability.

## Architectural Principles
- **App-facing abstraction:** Use `IChatClient` as the primary interface.
- **Provider isolation:** Isolation behind stable internal adapters.
- **Policy over conditionals:** Use configuration- and policy-driven routing.
- **Observability:** OpenTelemetry-friendly logging and metrics.

## Implementation Phases

The implementation is divided into several chunks, each with its own execution prompt located in:
`/Users/alex/Code/whats-for-supper/build-prompts/phase-1-5-model-routing/`

### Phase 1: Foundation & Abstractions
- **Goal**: Define domain models and core interfaces.
- **Key Types**: `ModelDescriptor`, `ProviderDescriptor`, `RoutingRequestContext`, `RoutingDecision`.
- **TDD**: Validate descriptors and context resolution.

### Phase 2: Model Catalog & Filtering
- **Goal**: Registry of providers/models with capability profiling.
- **Key Types**: `IModelCatalog`, `ModelCapabilityProfile`.
- **TDD**: Test hard filters (context window, JSON mode, etc.).

### Phase 3: Scoring & Strategy Engine
- **Goal**: Weighted scoring and policy resolution.
- **Key Types**: `IRouteScorer`, `IRouteStrategy`.
- **TDD**: Verify weighted selection logic.

### Phase 4: Provider adapters
- **Goal**: Implement `IChatClient` wrappers for diverse providers.
- **Providers**: Azure, Ollama, Gemini, OpenAI, Anthropic.
- **TDD**: Test normalization of response types (e.g., finish reasons).

### Phase 5: Resilience & Observability
- **Goal**: Health monitoring, circuit breakers, and OpenTelemetry.
- **Key Types**: `IProviderHealthMonitor`, `ModelRouter`.
- **TDD**: Simulate failover and test trace propagation.

### Phase 6: API Integration
- **Goal**: Expose router via Web API and configure via `appsettings.json`.
- **Endpoints**: `/api/chat`, `/api/router/evaluate`.
- **TDD**: E2E verification of routing requests.

### Phase 7: Migration & Agent Refactoring
- **Goal**: Transition existing agents to use the new router.
- **Tasks**: Update DI consumption, handle router-specific errors.
- **TDD**: Regression verification of existing recipe pipelines.

---

## Technical Reference
- **Root Path**: `/Users/alex/Code/whats-for-supper/api/src/RecipeApi`
- **Abstraction**: `Microsoft.Extensions.AI.IChatClient`
- **Registry**: `IModelCatalog`

