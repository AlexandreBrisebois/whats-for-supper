# Extraction design

## Context

See proposal.md for motivation. This is a documentation baseline of inspected executable paths at commit `04a1c4570f9bbb01b47436790d4248635ac3179a`, branch `moving-to-openspec`, 2026-10-16. Main recipe-library remains 61 requirements / 137 scenarios. The pre-existing staged audit, unstaged promotion records and concurrent changes are not owned by this draft. Before-images and CLI instruction receipts are under `/tmp/wfs-library-remaining/`.

## Goals / Non-Goals

**Goals:** independently reviewable ADDED delta; every exact requirement/scenario maps below to source and inspected assertions.

**Non-Goals:** changing behavior, accepting defects as desired requirements, contract/client/mock repair, promotion, archive or runtime qualification. No tests were executed. Test bodies are evidence of assertions only.

## Decisions

First observable slice: direct detail GET → MapToDto/ExtractRecipeInstructions → persisted metadata; direct PATCH → UpdateRecipe → DB save → best-effort index → ImageService.UpdateRecipeInfo. pwa/src/lib/api/recipes.ts unwrapUntypedNode/mapToRecipe and updateRecipe adapter carry generated UntypedNode mappings in pwa/src/lib/api/generated/models/index.ts. CooksMode consumes instructions, but cooking interactions are not extracted here. Reuse existing PATCH partial-update and detail-read ownership.

## Exact requirement and scenario evidence

All rows are implementation-supported. **Source-only** explicitly means no direct inspected assertion for the stated behavior. Presence of a fixture value or test title is not an assertion.

| Exact requirement header | Exact scenario header | Executable source symbols | Inspected assertions and limits |
| --- | --- | --- | --- |
| Read stored array instructions through recipe detail | Read a stored instruction array | api/src/RecipeApi/Services/RecipeService.cs MapToDto → ExtractRecipeInstructions | Source-only direct GET array assertion. api/src/RecipeApi.Tests/Integration/RecipeUpdateIntegrationTests.cs UpdateRecipe_WithInstructions_UpdatesDbAndRecipeInfo asserts DB/info arrays after PATCH, not detail GET; sharing export assertions are a different transformation. |
| Read stored array instructions through recipe detail | Read without usable instruction metadata | api/src/RecipeApi/Services/RecipeService.cs ExtractRecipeInstructions blank guard/TryGetProperty/catch | Source-only null/error-read cases. No claim that malformed JSON can be updated successfully. |
| Replace supplied array instructions while retaining other metadata | Replace an instruction array | api/src/RecipeApi/Controllers/RecipeController.cs Update → api/src/RecipeApi/Services/RecipeService.cs UpdateRecipe RecipeInstructions merge → api/src/RecipeApi/Services/ImageService.cs UpdateRecipeInfo | api/src/RecipeApi.Tests/Integration/RecipeUpdateIntegrationTests.cs UpdateRecipe_WithInstructions_UpdatesDbAndRecipeInfo asserts200/DB+info length3/first Updated Step 1; verifies index-recipe-search once and recipe_ready never. InMemory store/mock orchestrator, no disk/database atomicity. |
| Replace supplied array instructions while retaining other metadata | Retain unrelated instruction metadata | api/src/RecipeApi/Services/RecipeService.cs UpdateRecipe deserialize dictionary/member assignment | Source-only retention assertion; integration fixture only has recipeInstructions. |
| Replace supplied array instructions while retaining other metadata | Preserve absent instruction updates | api/src/RecipeApi/Services/RecipeService.cs UpdateRecipe if RecipeInstructions is not null | Source-only omitted/null instruction assertion; nearby other-field preservation is not an instruction-specific assertion. |

## Substitutions and representation boundary

API suites using `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` default to EF InMemory (transactions ignored), `InMemoryRecipeStore`, disabled household authentication, a stub chat client/embedding provider, and a mocked `IWorkflowOrchestrator`. Its trigger setup persists a synthetic Processing instance and Pending Mock task; it does not execute the requested workflow. Overrides select local store or PostgreSQL only when explicitly supplied; no such runtime qualification is claimed here. `SuccessWrappingFilter` skips FileResult and ResponseDto/SkipWrapping results, preserves an existing anonymous data object, and wraps other successful object results. Errors are not universally data-wrapped.

UI component/page suites mock API functions and motion/children as identified in each row. Browser suites use `pwa/e2e/fixtures.ts` (unhandled API routes blocked except health) and `pwa/e2e/mock-api.ts` plus later local routes. They exercise synthetic state, not backend persistence, credentials, real model output or image delivery. `pwa/src/lib/api/api-client.ts` wires the generated client; `pwa/src/lib/api/recipes.ts` supplies manual adapters. OpenAPI/generated fields and synthetic mocks do not prove completeness or wire parity. No regeneration or repair is authorized.

## Risks / Trade-offs

OpenAPI RecipeDto/UpdateRecipeDto permits array/null; server object properties and generated UntypedNode allow broader shapes. Only shared array/null subset is normative: object/scalar instructions remain F05 discrepancy. Malformed raw metadata returns null on read but dictionary deserialization can throw on PATCH; do not promise repair. PATCH response shape differs from documented/generated data envelope. DB commit precedes recipe-info write, so rejected request can follow committed instruction change. No cross-store rollback, live refresh, cancellation or inline editor guarantee.

A34 runtime qualification remains not-run. Separate summary/count/page reads, cached counts, partial file/database persistence, missing synchronization, dispatched cancellation and incomplete concurrency guarantees remain non-normative limitations. Shared owners retain household identity, capture acquisition/readiness transitions, quality policy, sharing transformation, planner assignment, worker lifecycle and SSE delivery. This draft owns only the provider/interaction boundary stated above.

## Migration Plan

No runtime migration or deployment. Human review compares this delta with the unchanged main and prior promoted deltas. Promotion/archival require separate authorization. Documentation can be revised or withdrawn without touching application state.
