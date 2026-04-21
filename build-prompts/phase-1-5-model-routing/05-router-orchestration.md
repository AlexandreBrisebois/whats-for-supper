# Phase 5: Router Orchestration & Resilience

You are a senior .NET 10 developer. Your task is to implement the final **Model Router** orchestrator and add resilience features.

## Objective
Implement the `IModelRouter` (which implements `IChatClient` and `IEmbeddingGenerator`). This class is the primary entry point for the application. It coordinates route selection, execution via adapters, and resilience (failover and circuit breaking).

## Prerequisites
- All previous phases (Foundation, Catalog, Scoring, Providers) must be complete.

## Design Constraints
- **Namespace**: `RecipeApi.Infrastructure.ModelRouter`.
- **Inheritance**: Must implement `IChatClient` and `IEmbeddingGenerator`.
- **Failover**: If the primary model fails with a retryable error, the router must automatically attempt the next model in the fallback chain.

## What to Implement

### 1. `ModelRouter` Orchestrator
Implement the logic for `GetResponseAsync` and `GenerateEmbeddingsAsync`:
1. Use `IRouteSelectionEngine` to get a `RoutingDecision`.
2. Pick the primary candidate.
3. Resolve the corresponding adapter from `IProviderClientFactory`.
4. Execute the call.
5. If it fails with a "transient error" (timeout, rate limit, provider 500):
   - Catch the error.
   - Pick the next candidate in the fallback chain.
   - Repeat until success or end of chain.
6. Return the result.

### 2. Resilience (Circuit Breakers)
Implement a simple `IProviderHealthMonitor`:
- Track error rates per provider.
- If error rate exceeds a threshold, "open" the circuit and inform the `ModelCatalog` to temporarily disable the model.
- (MOCK focus): Implement this logic and verify it with tests.

### 3. Usage & Metadata Aggregation
Ensure the `ChatResponse` returned by the router includes metadata about which provider was actually used and what the fallback path was (if any).

## TDD Requirements
Create `RecipeApi.Tests.Infrastructure.ModelRouter.RouterTests`:
1. **Test**: `ModelRouter` successfully falls back to a secondary model if the first one throws a `TaskCanceledException`.
2. **Test**: `ModelRouter` stops after N failures and throws a `NoRouteFoundException` with all accumulated errors.
3. **Test**: Circuit breaker logic: After 3 simulated failures, the `ModelHealthSnapshot` for that model shows it as unhealthy.

## Instructions
1. Implement the `ModelRouter` class.
2. Implement the `IProviderClientFactory` to resolve adapters.
3. Ensure the failover logic doesn't result in infinite loops.
4. Verify the tests cover streaming scenarios (if possible with mocks).
