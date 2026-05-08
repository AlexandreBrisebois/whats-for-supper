# ADR 040 — Unified Search Service For All Callers

**Date**: 2026-05-08  
**Status**: Accepted  
**Deciders**: Alex Brisebois

---

## Context

Semantic search introduced three distinct input paths: a standard search field, a stars-triggered long-form agent super-search, and a pantry/fridge/freezer photo search. A future Dietician Agent will also need to query the recipe library.

The tempting implementation pattern is to build separate retrieval branches: one for the UI, one for agent callers, one for inventory-led search. This would allow each path to be tuned independently without risk of breaking the others.

This pattern was explicitly rejected.

## Decision

All callers — standard search, agent super-search, inventory photo search, similar-recipe search, and any future agent — route through a single `RecipeSearchService` and receive a `RecipeSearchResponseDto`.

Differentiation between callers is expressed through the request fields (`mode`, `similarToRecipeId`, `pantrySnapshotId`, `weekOffset`, `dayIndex`, `filters`), not through separate code paths or separate endpoints. The service applies the same retrieval and reranking pipeline to all requests.

**Agent mode specifically:** When `mode: "agent"` is set, `AgentSearchTranslationService` translates the free-form query string into a structured `RecipeSearchRequestDto` server-side. The translated request then flows through the identical search pipeline. The translation layer is a thin service boundary — it may rewrite `query`, infer `filters`, or set planner context from natural language, but it must not:
- fork the retrieval logic,
- call the embedding provider a second time,
- maintain its own ranking state,
- return anything other than `RecipeSearchResponseDto`.

## Status

Implemented.

## Consequences

- A ranking improvement (new boost, new signal source, tuned constant) automatically benefits all callers. There is no risk of the UI and agent diverging on what "best match" means.
- A ranking regression also affects all callers simultaneously. Changes to `RecipeSearchService` must be tested across all input paths, not just the one being modified.
- Agent-specific result formatting (e.g. a more verbose explanation of `reasons`) must be handled at the response layer, not by forking the service. The service returns grounded evidence; callers decide how to present it.
- The `reasons` array on each result is the grounding contract between the search service and any consuming agent. It must remain stable — adding new `source` values is safe, removing or renaming existing ones is a breaking change for any agent that reasons over them.
- Future callers (Dietician Agent, automated weekly planning, push notification triggers) must consume `RecipeSearchService` via `POST /api/recipes/search`, not by querying the database directly. Direct DB queries bypass ranking, household signals, and the soft-delete filter.
