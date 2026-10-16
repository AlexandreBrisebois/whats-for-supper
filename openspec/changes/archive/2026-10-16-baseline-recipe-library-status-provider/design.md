# Extraction design

## Context

See proposal.md for motivation. This is a documentation baseline of inspected executable paths at commit `04a1c4570f9bbb01b47436790d4248635ac3179a`, branch `moving-to-openspec`, 2026-10-16. Main recipe-library remains 61 requirements / 137 scenarios. The pre-existing staged audit, unstaged promotion records and concurrent changes are not owned by this draft. Before-images and CLI instruction receipts are under `/tmp/wfs-library-remaining/`.

## Goals / Non-Goals

**Goals:** independently reviewable ADDED delta; every exact requirement/scenario maps below to source and inspected assertions.

**Non-Goals:** changing behavior, accepting defects as desired requirements, contract/client/mock repair, promotion, archive or runtime qualification. No tests were executed. Test bodies are evidence of assertions only.

## Decisions

Resolve G12 to existing recipe-library: workflow.md explicitly assigns stored readiness/provenance/facts to library. Executable external callers found: RecipeDescribeIntegrationTests direct HTTP GET and GotoSynthesisIntegrationTests direct HTTP GET. Current pwa/src source has no recipes.byId(...).status.get call; HomeCommandCenter uses loadActiveGoTo and FamilyGOTOSettings uses loadGoTo, both separate family-provider flows. Generated request builder is availability, not an actual UI caller. Stale pwa/coverage HTML has old calls and is not current executable evidence. API-only provider coverage is authorized. recipe-capture Show description synthesis waiting state/ready transitions owns initiation/event consumption; background-processing Read stored lifecycle state by instance identity owns instance/tasks, not this recipe status. No new owner/capability path.

## Exact requirement and scenario evidence

All rows are implementation-supported. **Source-only** explicitly means no direct inspected assertion for the stated behavior. Presence of a fixture value or test title is not an assertion.

| Exact requirement header | Exact scenario header | Executable source symbols | Inspected assertions and limits |
| --- | --- | --- | --- |
| Read the persisted recipe readiness status | Read a pending stored recipe | api/src/RecipeApi/Controllers/RecipeController.cs GetStatus → api/src/RecipeApi/Services/RecipeService.cs GetRecipeStatus → api/src/RecipeApi/Dto/RecipeStatusDto.cs → Infrastructure/SuccessWrappingFilter.cs | api/src/RecipeApi.Tests/Integration/RecipeDescribeIntegrationTests.cs GetStatus_StubRecipe_ReturnsPending creates stub then asserts200/data.id/pending/count0/isSynthesizedfalse; name is not asserted. InMemory/mock acceptance, not synthesis execution. |
| Read the persisted recipe readiness status | Read a ready recipe without originals | api/src/RecipeApi/Services/RecipeService.cs GetRecipeStatus IsReady ternary | api/src/RecipeApi.Tests/Integration/GotoSynthesisIntegrationTests.cs RecipeReady_DoesNotBumpImageCount_ForSynthesizedRecipe invokes ready processor, asserts DB count0/synthesizedtrue then200/data.status ready. Stubbed workflow/provider environment, no real model. |
| Read the persisted recipe readiness status | Read stored status fields independently | api/src/RecipeApi/Services/RecipeService.cs GetRecipeStatus DTO assignments | Source-only varying combinations beyond pending count0/false and ready count0/true assertions; not a formula based on comments. |
| Reject status reads without an available recipe | Read status for an absent ID | api/src/RecipeApi/Controllers/RecipeController.cs GetStatus KeyNotFound catch → api/src/RecipeApi/Services/RecipeService.cs GetRecipeStatus FindAsync | api/src/RecipeApi.Tests/Integration/RecipeDescribeIntegrationTests.cs GetStatus_UnknownId_Returns404 asserts404 only; soft-deleted FindAsync/tracked entity edge behavior is not newly specified. |

## Substitutions and representation boundary

API suites using `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` default to EF InMemory (transactions ignored), `InMemoryRecipeStore`, disabled household authentication, a stub chat client/embedding provider, and a mocked `IWorkflowOrchestrator`. Its trigger setup persists a synthetic Processing instance and Pending Mock task; it does not execute the requested workflow. Overrides select local store or PostgreSQL only when explicitly supplied; no such runtime qualification is claimed here. `SuccessWrappingFilter` skips FileResult and ResponseDto/SkipWrapping results, preserves an existing anonymous data object, and wraps other successful object results. Errors are not universally data-wrapped.

UI component/page suites mock API functions and motion/children as identified in each row. Browser suites use `pwa/e2e/fixtures.ts` (unhandled API routes blocked except health) and `pwa/e2e/mock-api.ts` plus later local routes. They exercise synthetic state, not backend persistence, credentials, real model output or image delivery. `pwa/src/lib/api/api-client.ts` wires the generated client; `pwa/src/lib/api/recipes.ts` supplies manual adapters. OpenAPI/generated fields and synthetic mocks do not prove completeness or wire parity. No regeneration or repair is authorized.

## Risks / Trade-offs

OpenAPI status operation/generated status request builder agree on a data envelope; generated fields remain optional. pwa/e2e/mock-api.ts status handler returns fixed ready/count1 and omits isSynthesized, not a DB-backed readiness assertion. No polling, universal ready transition, progress percentage, completion delivery, live UI caller, member-specific eligibility or classifier guarantee. Shared household access is owned by household-identity; default factory bypasses authentication. No runtime qualification.

A34 runtime qualification remains not-run. Separate summary/count/page reads, cached counts, partial file/database persistence, missing synchronization, dispatched cancellation and incomplete concurrency guarantees remain non-normative limitations. Shared owners retain household identity, capture acquisition/readiness transitions, quality policy, sharing transformation, planner assignment, worker lifecycle and SSE delivery. This draft owns only the provider/interaction boundary stated above.

## Migration Plan

No runtime migration or deployment. Human review compares this delta with the unchanged main and prior promoted deltas. Promotion/archival require separate authorization. Documentation can be revised or withdrawn without touching application state.
