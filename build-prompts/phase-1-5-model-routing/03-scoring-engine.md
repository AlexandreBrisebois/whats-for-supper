# Phase 3: Scoring Engine & Routing Strategies

You are a senior .NET 10 developer. Your task is to build the **Scoring Engine** for the Custom Model Router.

## Objective
Implement a deterministic, weighted scoring system that evaluates model candidates against a request's constraints and preferences (Cost, Latency, Quality, Locality).

## Prerequisites
- Phase 1 (Foundation) and Phase 2 (Catalog) must be complete.

## Design Constraints
- **Namespace**: `RecipeApi.Infrastructure.ModelRouter.Scoring`.
- **Logic**: Use weights (0.0 to 1.0) for different factors.
- **Weights Configuration**: Load weights from `appsettings.json` via `IOptions<RoutingWeightsOptions>`.

## What to Implement

### 1. `IRouteScorer`
Implement the `RouteScorer` class:
- `double CalculateScore(ModelDescriptor model, RoutingRequestContext context)`: 
    - Base score is 1.0.
    - Apply multipliers based on weights and model attributes.
    - Factor in `IsLocal` (Ollama), `EstimatedCost`, `LatencyTier`, and `QualityTier`.
    - Penalty for models that are healthy but "degraded" (high error rate).

### 2. `IRouteStrategy`
Implement one or more strategies:
- **`BalancedRouteStrategy`**: The default. Sorts candidates by the calculated score.
- **`CostOptimizedStrategy`**: Prioritizes cheap models.
- **`LatencyOptimizedStrategy`**: Prioritizes fast models.
- **`PrivacyFirstStrategy`**: Prioritizes `IsLocal` models.

### 3. `RouteSelectionEngine`
A service that coordinates the catalog and the scorer to produce a `RoutingDecision` (Selected model + fallback chain).

## TDD Requirements
Create `RecipeApi.Tests.Infrastructure.ModelRouter.ScoringTests`:
1. **Test**: `RouteScorer` gives a higher score to an Ollama model when `PrivacyFirst` is requested.
2. **Test**: `RouteScorer` correctly applies weighted penalties for high latency.
3. **Test**: `RouteSelectionEngine` produces an ordered fallback chain where the second-best model is always included.

## Instructions
1. Implement the `RouteScorer`.
2. Implement the `BalancedRouteStrategy` as the primary implementation of `IRouteStrategy`.
3. Ensure weights are configurable or have sensible defaults.
4. Verify that the tests handle complex multi-candidate scenarios.
