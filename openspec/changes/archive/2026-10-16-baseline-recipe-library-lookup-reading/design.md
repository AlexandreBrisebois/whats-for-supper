# Extraction design

## Context

See proposal.md for motivation. This is a documentation baseline of inspected executable paths at commit `04a1c4570f9bbb01b47436790d4248635ac3179a`, branch `moving-to-openspec`, 2026-10-16. Main recipe-library remains 61 requirements / 137 scenarios. The pre-existing staged audit, unstaged promotion records and concurrent changes are not owned by this draft. Before-images and CLI instruction receipts are under `/tmp/wfs-library-remaining/`.

## Goals / Non-Goals

**Goals:** independently reviewable ADDED delta; every exact requirement/scenario maps below to source and inspected assertions.

**Non-Goals:** changing behavior, accepting defects as desired requirements, contract/client/mock repair, promotion, archive or runtime qualification. No tests were executed. Test bodies are evidence of assertions only.

## Decisions

Reuse Return only eligible household library recipes and Return an explore-ordered library page for common eligibility, pagination/count and representation. pwa/src/lib/api/generated/api/recipes/index.ts exposes id/name/url/order/discoverableOnly; capture and sharing duplicate checks consume the endpoint but do not own its predicates. No new ranking/search policy.

## Exact requirement and scenario evidence

All rows are implementation-supported. **Source-only** explicitly means no direct inspected assertion for the stated behavior. Presence of a fixture value or test title is not an assertion.

| Exact requirement header | Exact scenario header | Executable source symbols | Inspected assertions and limits |
| --- | --- | --- | --- |
| Return newest-created library pages by default | Read without an order parameter | api/src/RecipeApi/Controllers/RecipeController.cs List → api/src/RecipeApi/Services/RecipeService.cs GetRecipesList OrderByDescending/Skip/Take | api/src/RecipeApi.Tests/Controllers/RecipeControllerTests.cs GetRecipes_WithoutOrderParam_UsesDefaultOrdering asserts200/recipes/pagination keys only; exact ordering and ties source-only. |
| Constrain library lookups by supplied predicates | Lookup an exact recipe ID | api/src/RecipeApi/Services/RecipeService.cs GetRecipesList id.HasValue/Where | api/src/RecipeApi.Tests/Controllers/RecipeControllerTests.cs GetRecipesList_FilterById_ReturnsMatch asserts200/single/matching GUID. |
| Constrain library lookups by supplied predicates | Lookup a trimmed case-insensitive exact name | api/src/RecipeApi/Services/RecipeService.cs GetRecipesList name predicate | api/src/RecipeApi.Tests/Controllers/RecipeControllerTests.cs GetRecipesList_FilterByName_ReturnsCaseInsensitiveMatch queries mixed case/spaces, asserts single matching GUID. Provider collation/PostgreSQL translation unqualified. |
| Constrain library lookups by supplied predicates | Lookup a trimmed case-insensitive exact URL | api/src/RecipeApi/Services/RecipeService.cs GetRecipesList url predicate | api/src/RecipeApi.Tests/Controllers/RecipeControllerTests.cs GetRecipesList_FilterByUrl_ReturnsMatch queries mixed case/spaces, asserts single matching GUID; no URL normalization assertion. |
| Constrain library lookups by supplied predicates | Combine lookup predicates | api/src/RecipeApi/Services/RecipeService.cs GetRecipesList successive Where expressions | Source-only conjunction. api/src/RecipeApi.Tests/Controllers/RecipeControllerTests.cs GetRecipesList_IgnoresSoftDeletedDuplicates and GetRecipesList_IgnoresNotReadyDuplicates assert single active/ready GUID for name lookup only, not a combined filter. |
| Constrain library lookups by supplied predicates | Ignore blank text filters | api/src/RecipeApi/Services/RecipeService.cs GetRecipesList IsNullOrWhiteSpace guards | Source-only blank/null filter cases; fixtures with absent filters are not assertions of whitespace behavior. |
| Reject unsupported library order parameters | Reject an unsupported order | api/src/RecipeApi/Controllers/RecipeController.cs List validation | api/src/RecipeApi.Tests/Controllers/RecipeControllerTests.cs GetRecipes_WithInvalidOrder_Returns_BadRequest asserts400/error path/contains explore, allowing wrapped or root error; source SkipWrapping and filter do not universally wrap errors. |

## Substitutions and representation boundary

API suites using `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` default to EF InMemory (transactions ignored), `InMemoryRecipeStore`, disabled household authentication, a stub chat client/embedding provider, and a mocked `IWorkflowOrchestrator`. Its trigger setup persists a synthetic Processing instance and Pending Mock task; it does not execute the requested workflow. Overrides select local store or PostgreSQL only when explicitly supplied; no such runtime qualification is claimed here. `SuccessWrappingFilter` skips FileResult and ResponseDto/SkipWrapping results, preserves an existing anonymous data object, and wraps other successful object results. Errors are not universally data-wrapped.

UI component/page suites mock API functions and motion/children as identified in each row. Browser suites use `pwa/e2e/fixtures.ts` (unhandled API routes blocked except health) and `pwa/e2e/mock-api.ts` plus later local routes. They exercise synthetic state, not backend persistence, credentials, real model output or image delivery. `pwa/src/lib/api/api-client.ts` wires the generated client; `pwa/src/lib/api/recipes.ts` supplies manual adapters. OpenAPI/generated fields and synthetic mocks do not prove completeness or wire parity. No regeneration or repair is authorized.

## Risks / Trade-offs

Controller accepts EXPLORE ignoring case, but service only recognizes lowercase explore and otherwise uses newest-created ordering; withhold case-insensitive explore-sorting guarantee. PostgreSQL case/collation and offset stability are unqualified. Count and item materialization are separate reads; lookup is advisory, not atomic deduplication or uniqueness enforcement. OpenAPI discoverability/readiness descriptions remain U29/F05. No URL canonicalization, partial name match or full duplicate detection guarantee.

A34 runtime qualification remains not-run. Separate summary/count/page reads, cached counts, partial file/database persistence, missing synchronization, dispatched cancellation and incomplete concurrency guarantees remain non-normative limitations. Shared owners retain household identity, capture acquisition/readiness transitions, quality policy, sharing transformation, planner assignment, worker lifecycle and SSE delivery. This draft owns only the provider/interaction boundary stated above.

## Migration Plan

No runtime migration or deployment. Human review compares this delta with the unchanged main and prior promoted deltas. Promotion/archival require separate authorization. Documentation can be revised or withdrawn without touching application state.
