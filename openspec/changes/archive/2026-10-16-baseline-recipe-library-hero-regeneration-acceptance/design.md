# Extraction design

## Context

See proposal.md for motivation. This is a documentation baseline of inspected executable paths at commit `04a1c4570f9bbb01b47436790d4248635ac3179a`, branch `moving-to-openspec`, 2026-10-16. Main recipe-library remains 61 requirements / 137 scenarios. The pre-existing staged audit, unstaged promotion records and concurrent changes are not owned by this draft. Before-images and CLI instruction receipts are under `/tmp/wfs-library-remaining/`.

## Goals / Non-Goals

**Goals:** independently reviewable ADDED delta; every exact requirement/scenario maps below to source and inspected assertions.

**Non-Goals:** changing behavior, accepting defects as desired requirements, contract/client/mock repair, promotion, archive or runtime qualification. No tests were executed. Test bodies are evidence of assertions only.

## Decisions

The first slice ends at dispatch/202 and corresponding client feedback. background-processing Persist initial workflow and task identities before returning owns generic acceptance persistence; it does not establish image generation. No new workflow execution or provider/model baseline.

## Exact requirement and scenario evidence

All rows are implementation-supported. **Source-only** explicitly means no direct inspected assertion for the stated behavior. Presence of a fixture value or test title is not an assertion.

| Exact requirement header | Exact scenario header | Executable source symbols | Inspected assertions and limits |
| --- | --- | --- | --- |
| Accept an explicit hero-regeneration request after dispatch | Accept hero regeneration dispatch | api/src/RecipeApi/Controllers/RecipeController.cs RegenerateHero → api/src/RecipeApi/Services/RecipeService.cs TriggerHeroRegenerationAsync | api/src/RecipeApi.Tests/Integration/RecipeActionIntegrationTests.cs RegenerateHero_TriggersRegenerationWorkflow asserts202/mocked workflow once/exact recipeId/recipe_ready never. It does not assert completion or response body. |
| Show immediate regeneration-request feedback in detail Edit | Request regeneration from Edit | pwa/src/components/recipes/RecipeDetailSheet.tsx handleHeroRegenerateClick → pwa/src/lib/api/recipes.ts regenerateHero → generated/api/recipes/item/hero/regenerate POST | pwa/e2e/recipe-hero-actions.spec.ts regenerate hero triggers API and shows toast asserts regenerateCalled boolean and toast with local202 queued fixture; hero actions are visible only in edit mode checks both actions hidden then visible. Synthetic response differs from real/contract. |
| Show immediate regeneration-request feedback in detail Edit | Report regeneration request rejection | pwa/src/components/recipes/RecipeDetailSheet.tsx handleHeroRegenerateClick catch | Source-only rejection branch; no inspected rejected-request browser assertion. |

## Substitutions and representation boundary

API suites using `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` default to EF InMemory (transactions ignored), `InMemoryRecipeStore`, disabled household authentication, a stub chat client/embedding provider, and a mocked `IWorkflowOrchestrator`. Its trigger setup persists a synthetic Processing instance and Pending Mock task; it does not execute the requested workflow. Overrides select local store or PostgreSQL only when explicitly supplied; no such runtime qualification is claimed here. `SuccessWrappingFilter` skips FileResult and ResponseDto/SkipWrapping results, preserves an existing anonymous data object, and wraps other successful object results. Errors are not universally data-wrapped.

UI component/page suites mock API functions and motion/children as identified in each row. Browser suites use `pwa/e2e/fixtures.ts` (unhandled API routes blocked except health) and `pwa/e2e/mock-api.ts` plus later local routes. They exercise synthetic state, not backend persistence, credentials, real model output or image delivery. `pwa/src/lib/api/api-client.ts` wires the generated client; `pwa/src/lib/api/recipes.ts` supplies manual adapters. OpenAPI/generated fields and synthetic mocks do not prove completeness or wire parity. No regeneration or repair is authorized.

## Risks / Trade-offs

F05: actual202 is wrapped message, OpenAPI/generated expects ManagementTaskAcceptedResponse, local browser mock returns queued. Withhold identity/body parity; adapter returns void. Service has no existence lookup, so controller catch does not prove unknown ID404; withhold that assertion and record as missing guard. No pending UI guard prevents repeat dispatch. No refetch/cache busting or fresh asset delivery, exactly-once dispatch, cancellation or eventual image guarantee.

A34 runtime qualification remains not-run. Separate summary/count/page reads, cached counts, partial file/database persistence, missing synchronization, dispatched cancellation and incomplete concurrency guarantees remain non-normative limitations. Shared owners retain household identity, capture acquisition/readiness transitions, quality policy, sharing transformation, planner assignment, worker lifecycle and SSE delivery. This draft owns only the provider/interaction boundary stated above.

## Migration Plan

No runtime migration or deployment. Human review compares this delta with the unchanged main and prior promoted deltas. Promotion/archival require separate authorization. Documentation can be revised or withdrawn without touching application state.
