# Extraction design

## Context

See proposal.md for motivation. This is a documentation baseline of inspected executable paths at commit `04a1c4570f9bbb01b47436790d4248635ac3179a`, branch `moving-to-openspec`, 2026-10-16. Main recipe-library remains 61 requirements / 137 scenarios. The pre-existing staged audit, unstaged promotion records and concurrent changes are not owned by this draft. Before-images and CLI instruction receipts are under `/tmp/wfs-library-remaining/`.

## Goals / Non-Goals

**Goals:** independently reviewable ADDED delta; every exact requirement/scenario maps below to source and inspected assertions.

**Non-Goals:** changing behavior, accepting defects as desired requirements, contract/client/mock repair, promotion, archive or runtime qualification. No tests were executed. Test bodies are evidence of assertions only.

## Decisions

Library owns stored/read facts. Household-identity owns member lifecycle; recipe-capture owns acquisition and ready transitions; classifier administration remains outside this representation slice and generic worker state belongs to background-processing. Source type is derived from SourceUrl/ImageCount, not IsSynthesized. User clarification: “this is an upsert scenario, older values show null but are becoming false is newer deployments”. Record that deployment context without inferring all nulls are rewritten. Normative null-to-false is only the currently executable DTO projection, not an upsert requirement or a dietary claim.

## Exact requirement and scenario evidence

All rows are implementation-supported. **Source-only** explicitly means no direct inspected assertion for the stated behavior. Presence of a fixture value or test title is not an assertion.

| Exact requirement header | Exact scenario header | Executable source symbols | Inspected assertions and limits |
| --- | --- | --- | --- |
| Represent persisted recipe attribution and readiness | Read stored attribution and creation time | api/src/RecipeApi/Services/RecipeService.cs MapToDto; api/src/RecipeApi/Models/Recipe.cs AddedBy/CreatedAt; api/src/RecipeApi/Data/RecipeDbContext.cs AddedBy relationship | Source-only exact DTO attribution/null/date assertion. api/src/RecipeApi.Tests/Integration/RecipeDescribeIntegrationTests.cs Describe_WithFamilyMemberHeader_PopulatesAddedByAndWritesRecipeInfo asserts creation attribution, not DTO-null representation; no PostgreSQL FK verification. |
| Represent persisted recipe attribution and readiness | Read stored readiness and image facts | api/src/RecipeApi/Services/RecipeService.cs MapToDto; api/src/RecipeApi/Models/Recipe.cs | api/src/RecipeApi.Tests/Services/RecipeServiceTests.cs GetRecipe_Returns_FinishedDishIndex asserts index2; source-only full readiness/count/indices combination. Capture owns readiness transition, not a derived read formula. |
| Derive represented source provenance and reimport availability | Prefer source URL provenance | api/src/RecipeApi/Services/RecipeService.cs MapToDto sourceType/CanReimport; pwa/src/lib/api/recipes.ts mapToRecipe | Source-only exact provenance precedence. Whitespace counts nonempty in this predicate; no URL validation/acquisition guarantee. |
| Derive represented source provenance and reimport availability | Represent photo provenance | api/src/RecipeApi/Services/RecipeService.cs MapToDto/CanReimport | Source-only derivation; fixture sourceType values are supplied outputs, not predicate assertions. |
| Derive represented source provenance and reimport availability | Represent absent original sources | api/src/RecipeApi/Services/RecipeService.cs MapToDto/CanReimport | Source-only derivation; label does not prove IsSynthesized or workflow history. |
| Represent the persisted vegetarian value without dietary inference | Read an explicit vegetarian boolean | api/src/RecipeApi/Services/RecipeService.cs MapToDto; api/src/RecipeApi/Models/Recipe.cs IsVegetarian; api/database/schema.sql is_vegetarian | Source-only direct DTO assertions. api/src/RecipeApi.Tests/Services/Processors/ClassifyRecipeVegetarianProcessorTests.cs ExecuteAsync_AcceptsExplicitClassificationForIngredientCases asserts mocked expected boolean equals recipe.IsVegetarian; malformed-response test checks confirmed true preserved after JsonException. Neither proves DTO mapping or diet accuracy. |
| Represent the persisted vegetarian value without dietary inference | Read a legacy nullable vegetarian value | api/src/RecipeApi/Services/RecipeService.cs MapToDto IsVegetarian ?? false; pwa/src/lib/api/recipes.ts mapToRecipe; api/database/compatibility.sql nullable classification block | Source-only exact null-to-false/read-no-write scenario. User 2026-10-16 describes upsert/legacy-null/newer-false progression; source still permits null and compatibility SQL can set legacy unclassified rows null. No global migration/upsert completion assertion. |

## Substitutions and representation boundary

API suites using `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` default to EF InMemory (transactions ignored), `InMemoryRecipeStore`, disabled household authentication, a stub chat client/embedding provider, and a mocked `IWorkflowOrchestrator`. Its trigger setup persists a synthetic Processing instance and Pending Mock task; it does not execute the requested workflow. Overrides select local store or PostgreSQL only when explicitly supplied; no such runtime qualification is claimed here. `SuccessWrappingFilter` skips FileResult and ResponseDto/SkipWrapping results, preserves an existing anonymous data object, and wraps other successful object results. Errors are not universally data-wrapped.

UI component/page suites mock API functions and motion/children as identified in each row. Browser suites use `pwa/e2e/fixtures.ts` (unhandled API routes blocked except health) and `pwa/e2e/mock-api.ts` plus later local routes. They exercise synthetic state, not backend persistence, credentials, real model output or image delivery. `pwa/src/lib/api/api-client.ts` wires the generated client; `pwa/src/lib/api/recipes.ts` supplies manual adapters. OpenAPI/generated fields and synthetic mocks do not prove completeness or wire parity. No regeneration or repair is authorized.

## Risks / Trade-offs

api/database/schema.sql has nullable boolean with no false default, Recipe.IsVegetarian is bool?, compatibility.sql can reset unclassified legacy rows to null, and ClassifyRecipeVegetarianProcessor only saves explicit boolean model output. Actual deployments/upsert completion not inspected. Unknown-versus-confirmed-false semantic equivalence remains withheld. Generated models optional fields and mapToRecipe defaults do not prove persisted facts complete. No vegetarian edit UI/PATCH field found. No diet classifier accuracy, SQL/FK enforcement, disk metadata parity or current deployment qualification claim.

A34 runtime qualification remains not-run. Separate summary/count/page reads, cached counts, partial file/database persistence, missing synchronization, dispatched cancellation and incomplete concurrency guarantees remain non-normative limitations. Shared owners retain household identity, capture acquisition/readiness transitions, quality policy, sharing transformation, planner assignment, worker lifecycle and SSE delivery. This draft owns only the provider/interaction boundary stated above.

## Migration Plan

No runtime migration or deployment. Human review compares this delta with the unchanged main and prior promoted deltas. Promotion/archival require separate authorization. Documentation can be revised or withdrawn without touching application state.
