# Extraction design

## Context

See proposal.md for motivation. This is a documentation baseline of inspected executable paths at commit `04a1c4570f9bbb01b47436790d4248635ac3179a`, branch `moving-to-openspec`, 2026-10-16. Main recipe-library remains 61 requirements / 137 scenarios. The pre-existing staged audit, unstaged promotion records and concurrent changes are not owned by this draft. Before-images and CLI instruction receipts are under `/tmp/wfs-library-remaining/`.

## Goals / Non-Goals

**Goals:** independently reviewable ADDED delta; every exact requirement/scenario maps below to source and inspected assertions.

**Non-Goals:** changing behavior, accepting defects as desired requirements, contract/client/mock repair, promotion, archive or runtime qualification. No tests were executed. Test bodies are evidence of assertions only.

## Decisions

Keep provider retrieval separate from generating or invalidating a hero. IRecipeStore defines asset reads; LocalRecipeStore uses hero.webp. GET uses FileResult and is exempt from successful JSON wrapping. Existing Serve raw original photo image binary owns originals; no duplication.

## Exact requirement and scenario evidence

All rows are implementation-supported. **Source-only** explicitly means no direct inspected assertion for the stated behavior. Presence of a fixture value or test title is not an assertion.

| Exact requirement header | Exact scenario header | Executable source symbols | Inspected assertions and limits |
| --- | --- | --- | --- |
| Serve an existing hero asset independently of recipe DTO reads | Retrieve an existing hero stream | api/src/RecipeApi/Controllers/RecipeController.cs GetHero AllowAnonymous → api/src/RecipeApi/Services/ImageService.cs GetHeroImage → api/src/RecipeApi/Infrastructure/LocalRecipeStore.cs ReadHeroImageAsync | api/src/RecipeApi.Tests/Controllers/RecipeControllerTests.cs GetHero_Returns_Hero_Image_When_Present seeds InMemory store, asserts200/JPEG/nonempty (not exact bytes); GetHero_Returns_CacheControl_Header asserts exact header. Local store returns hero.webp/image/webp (source-only), contract advertises JPEG/PNG. Auth disabled in suite; anonymous metadata source-only. |
| Serve an existing hero asset independently of recipe DTO reads | Request an absent hero asset | api/src/RecipeApi/Controllers/RecipeController.cs GetHero → ImageService.GetHeroImage null throw → api/src/RecipeApi/Middleware/ErrorHandlingMiddleware.cs | api/src/RecipeApi.Tests/Controllers/RecipeControllerTests.cs GetHero_Returns_NotFound_Before_Import_Completes asserts404 for random ID/no asset; title does not prove relationship to import state. |

## Substitutions and representation boundary

API suites using `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` default to EF InMemory (transactions ignored), `InMemoryRecipeStore`, disabled household authentication, a stub chat client/embedding provider, and a mocked `IWorkflowOrchestrator`. Its trigger setup persists a synthetic Processing instance and Pending Mock task; it does not execute the requested workflow. Overrides select local store or PostgreSQL only when explicitly supplied; no such runtime qualification is claimed here. `SuccessWrappingFilter` skips FileResult and ResponseDto/SkipWrapping results, preserves an existing anonymous data object, and wraps other successful object results. Errors are not universally data-wrapped.

UI component/page suites mock API functions and motion/children as identified in each row. Browser suites use `pwa/e2e/fixtures.ts` (unhandled API routes blocked except health) and `pwa/e2e/mock-api.ts` plus later local routes. They exercise synthetic state, not backend persistence, credentials, real model output or image delivery. `pwa/src/lib/api/api-client.ts` wires the generated client; `pwa/src/lib/api/recipes.ts` supplies manual adapters. OpenAPI/generated fields and synthetic mocks do not prove completeness or wire parity. No regeneration or repair is authorized.

## Risks / Trade-offs

OpenAPI advertises JPEG/PNG only and omits404/cache; local WebP behavior remains a media-type discrepancy, with no normative requirement specifically prescribing WebP or contract amendment. InMemory test store returns JPEG; its assertions do not qualify disk content. Reads bypass DB readiness/deletion checks, so retained assets may remain reachable after soft-delete; no asset-revocation guarantee. Immutable URL/cache can retain old content after regeneration; no freshness or CDN/device qualification.

A34 runtime qualification remains not-run. Separate summary/count/page reads, cached counts, partial file/database persistence, missing synchronization, dispatched cancellation and incomplete concurrency guarantees remain non-normative limitations. Shared owners retain household identity, capture acquisition/readiness transitions, quality policy, sharing transformation, planner assignment, worker lifecycle and SSE delivery. This draft owns only the provider/interaction boundary stated above.

## Migration Plan

No runtime migration or deployment. Human review compares this delta with the unchanged main and prior promoted deltas. Promotion/archival require separate authorization. Documentation can be revised or withdrawn without touching application state.
