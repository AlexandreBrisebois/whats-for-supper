# Extraction design

## Context

See proposal.md for motivation. This is a documentation baseline of inspected executable paths at commit `04a1c4570f9bbb01b47436790d4248635ac3179a`, branch `moving-to-openspec`, 2026-10-16. Main recipe-library remains 61 requirements / 137 scenarios. The pre-existing staged audit, unstaged promotion records and concurrent changes are not owned by this draft. Before-images and CLI instruction receipts are under `/tmp/wfs-library-remaining/`.

## Goals / Non-Goals

**Goals:** independently reviewable ADDED delta; every exact requirement/scenario maps below to source and inspected assertions.

**Non-Goals:** changing behavior, accepting defects as desired requirements, contract/client/mock repair, promotion, archive or runtime qualification. No tests were executed. Test bodies are evidence of assertions only.

## Decisions

Trace detail input → manual multipart adapter → UploadOriginal → RecipeService → ImageService/store → DB save → hero trigger. Keep provider and UI success boundaries conditional on each step completing. Capture upload limits/validation do not apply by inference to this endpoint. UI ignores the adapter return ID.

## Exact requirement and scenario evidence

All rows are implementation-supported. **Source-only** explicitly means no direct inspected assertion for the stated behavior. Presence of a fixture value or test title is not an assertion.

| Exact requirement header | Exact scenario header | Executable source symbols | Inspected assertions and limits |
| --- | --- | --- | --- |
| Append one original photo to an existing recipe | Append an original and request regeneration | api/src/RecipeApi/Controllers/RecipeController.cs UploadOriginal → api/src/RecipeApi/Services/RecipeService.cs AddOriginalImageAsync → api/src/RecipeApi/Services/ImageService.cs AddOriginalImageAsync → IRecipeStore.SaveOriginalImageAsync/WriteInfoAsync → api/src/RecipeApi/Services/RecipeService.cs TriggerHeroRegenerationAsync | api/src/RecipeApi.Tests/Integration/RecipeActionIntegrationTests.cs UploadOriginal_IncrementsImageCount_AndTriggersRegeneration asserts201/data.id integer2/DB count3/hero workflow once/recipe_ready never. File contents, info final count and Location are source-only; InMemory store and synthetic workflow. |
| Append one original photo to an existing recipe | Reject an append for a missing recipe | api/src/RecipeApi/Controllers/RecipeController.cs UploadOriginal catch KeyNotFound → api/src/RecipeApi/Services/RecipeService.cs AddOriginalImageAsync FindAsync | api/src/RecipeApi.Tests/Integration/RecipeActionIntegrationTests.cs UploadOriginal_Returns404_ForMissingRecipe asserts404 only; no-side-effects predicate source-only, 404 absent OpenAPI. |
| Dispatch original-photo append from detail Edit | Upload a selected detail photo | pwa/src/components/recipes/RecipeDetailSheet.tsx handleHeroCameraClick/handleFileChange → pwa/src/lib/api/recipes.ts uploadRecipeOriginal | pwa/e2e/recipe-hero-actions.spec.ts camera action triggers file upload and shows toast asserts filechooser, uploadCalled boolean and both texts; fake bytes/local201 unwrapped UUID mock, not backend encoding/storage or wrapped numeric response. |
| Dispatch original-photo append from detail Edit | Finish a failed detail photo upload | pwa/src/components/recipes/RecipeDetailSheet.tsx handleFileChange catch/finally | Source-only rejection/input-reset assertion; inspected browser test only covers success. |

## Substitutions and representation boundary

API suites using `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` default to EF InMemory (transactions ignored), `InMemoryRecipeStore`, disabled household authentication, a stub chat client/embedding provider, and a mocked `IWorkflowOrchestrator`. Its trigger setup persists a synthetic Processing instance and Pending Mock task; it does not execute the requested workflow. Overrides select local store or PostgreSQL only when explicitly supplied; no such runtime qualification is claimed here. `SuccessWrappingFilter` skips FileResult and ResponseDto/SkipWrapping results, preserves an existing anonymous data object, and wraps other successful object results. Errors are not universally data-wrapped.

UI component/page suites mock API functions and motion/children as identified in each row. Browser suites use `pwa/e2e/fixtures.ts` (unhandled API routes blocked except health) and `pwa/e2e/mock-api.ts` plus later local routes. They exercise synthetic state, not backend persistence, credentials, real model output or image delivery. `pwa/src/lib/api/api-client.ts` wires the generated client; `pwa/src/lib/api/recipes.ts` supplies manual adapters. OpenAPI/generated fields and synthetic mocks do not prove completeness or wire parity. No regeneration or repair is authorized.

## Risks / Trade-offs

F05: actual201 body is wrapped data.id integer; OpenAPI/generated upload response expects unwrapped UUID id; manual adapter reads root id and returns empty string. Exact response body requirement is withheld; no repair. Store/info writes precede DB save and trigger: failures can leave files/counts or a committed append despite failure feedback. No endpoint validation call/count limit observed. Concurrent appends may reuse info.ImageCount. No synchronized counts, atomic append, idempotency, completion/hero refresh or cancellation guarantee; Edit Cancel does not undo dispatched upload.

A34 runtime qualification remains not-run. Separate summary/count/page reads, cached counts, partial file/database persistence, missing synchronization, dispatched cancellation and incomplete concurrency guarantees remain non-normative limitations. Shared owners retain household identity, capture acquisition/readiness transitions, quality policy, sharing transformation, planner assignment, worker lifecycle and SSE delivery. This draft owns only the provider/interaction boundary stated above.

## Migration Plan

No runtime migration or deployment. Human review compares this delta with the unchanged main and prior promoted deltas. Promotion/archival require separate authorization. Documentation can be revised or withdrawn without touching application state.
