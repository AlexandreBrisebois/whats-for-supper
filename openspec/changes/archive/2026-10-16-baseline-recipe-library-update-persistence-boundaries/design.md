# Extraction design

## Context

See proposal.md for motivation. This is a documentation baseline of inspected executable paths at commit `04a1c4570f9bbb01b47436790d4248635ac3179a`, branch `moving-to-openspec`, 2026-10-16. Main recipe-library remains 61 requirements / 137 scenarios. The pre-existing staged audit, unstaged promotion records and concurrent changes are not owned by this draft. Before-images and CLI instruction receipts are under `/tmp/wfs-library-remaining/`.

## Goals / Non-Goals

**Goals:** independently reviewable ADDED delta; every exact requirement/scenario maps below to source and inspected assertions.

**Non-Goals:** changing behavior, accepting defects as desired requirements, contract/client/mock repair, promotion, archive or runtime qualification. No tests were executed. Test bodies are evidence of assertions only.

## Decisions

Reuse existing Apply supplied non-null recipe-detail update fields, Persist supplied recipe ratings and exact notes and Persist the supplied recipe discoverability fact. Supported trigger set is name/description/ingredients/notes/rating/isDiscoverable/cuisineType/mealTypes/recipeInstructions when non-null (rating/flag HasValue); supplying the same value still triggers. No-op PATCH still updates time/writes info. Source-only sidecar initialization records empty DocumentText, {} metadata, pending states, environment EMBEDDING_MODEL_ID or gemini-embedding-2 and builder schema version; these implementation details are evidence, not new library policy.

## Exact requirement and scenario evidence

All rows are implementation-supported. **Source-only** explicitly means no direct inspected assertion for the stated behavior. Presence of a fixture value or test title is not an assertion.

| Exact requirement header | Exact scenario header | Executable source symbols | Inspected assertions and limits |
| --- | --- | --- | --- |
| Mark search-derived recipe state pending with supported updates | Invalidate existing derived recipe state | api/src/RecipeApi/Services/RecipeService.cs UpdateRecipe searchRelevantChanged/sidecar existing/SaveChangesAsync | Source-only exact sidecar status/fingerprint-clearing assertion. api/src/RecipeApi.Tests/Services/RecipeServiceTests.cs PatchRecipe_WithEditableCardFields_PersistsFieldsAndQueuesSearchIndexWorkflow checks stored card fields and a synthetic workflow fingerprint, not pending sidecar values. |
| Mark search-derived recipe state pending with supported updates | Initialize absent derived recipe state | api/src/RecipeApi/Services/RecipeService.cs UpdateRecipe sidecar null branch/SaveChangesAsync | Source-only exact PATCH sidecar creation/status assertion; photo-acceptance sidecar assertion covers a different operation. |
| Attempt one index dispatch after saving a supported recipe update | Dispatch once for a multifield update | api/src/RecipeApi/Services/RecipeService.cs UpdateRecipe try TriggerAsync → api/src/RecipeApi/Services/SearchFingerprintService.cs ComputeSourceFingerprint | api/src/RecipeApi.Tests/Services/RecipeServiceTests.cs PatchRecipe_WithEditableCardFields_PersistsFieldsAndQueuesSearchIndexWorkflow asserts single synthetic workflow, recipeId and nonblank fingerprint; PatchRecipe_WhenMultipleEditableFieldsChange_QueuesSearchIndexWorkflowOnce asserts one workflow. Save-before-trigger/info ordering source-only. |
| Attempt one index dispatch after saving a supported recipe update | Continue after index dispatch rejection | api/src/RecipeApi/Services/RecipeService.cs UpdateRecipe catch then images.UpdateRecipeInfo | Source-only caught-dispatch branch; default factory mock resolves and does not simulate enqueue failure. No success response if later info write fails. |
| Write the supported recipe-info projection after the database save | Persist supplied info projection fields | api/src/RecipeApi/Services/RecipeService.cs UpdateRecipe images.UpdateRecipeInfo → api/src/RecipeApi/Services/ImageService.cs UpdateRecipeInfo → IRecipeStore.ReadInfoAsync/WriteInfoAsync | api/src/RecipeApi.Tests/Integration/RecipeUpdateIntegrationTests.cs UpdateRecipe_WithInstructions_UpdatesDbAndRecipeInfo checks info array3/first step; other projected fields/absent-info creation and retention source-only. Store is InMemory, not a disk atomicity assertion. |
| Write the supported recipe-info projection after the database save | Touch an update without supplied supported facts | api/src/RecipeApi/Services/RecipeService.cs UpdateRecipe UpdatedAt/searchRelevantChanged false/UpdateRecipeInfo | Source-only empty/null-only PATCH timing/info-write/no-dispatch assertion. |

## Substitutions and representation boundary

API suites using `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` default to EF InMemory (transactions ignored), `InMemoryRecipeStore`, disabled household authentication, a stub chat client/embedding provider, and a mocked `IWorkflowOrchestrator`. Its trigger setup persists a synthetic Processing instance and Pending Mock task; it does not execute the requested workflow. Overrides select local store or PostgreSQL only when explicitly supplied; no such runtime qualification is claimed here. `SuccessWrappingFilter` skips FileResult and ResponseDto/SkipWrapping results, preserves an existing anonymous data object, and wraps other successful object results. Errors are not universally data-wrapped.

UI component/page suites mock API functions and motion/children as identified in each row. Browser suites use `pwa/e2e/fixtures.ts` (unhandled API routes blocked except health) and `pwa/e2e/mock-api.ts` plus later local routes. They exercise synthetic state, not backend persistence, credentials, real model output or image delivery. `pwa/src/lib/api/api-client.ts` wires the generated client; `pwa/src/lib/api/recipes.ts` supplies manual adapters. OpenAPI/generated fields and synthetic mocks do not prove completeness or wire parity. No regeneration or repair is authorized.

## Risks / Trade-offs

G10: DB saves before caught index dispatch then uncaught info write. An error can follow a committed fact update; no rollback across stores. Info projection omits ingredients/cuisine/meals/discoverability despite broad comments. SoftDelete saves removal without library SSE; Restore saves then best-effort enqueue (correction draft); Purge deletes files before DB commit and broadly matches pending parameters (non-normative F03). No library service SSE producer/browse subscription here. G11: no ETag/version/idempotency/atomic cross-store protocol; detail local drafts, notes timers and independent flag/rating requests can overlap. Closing UI does not abort transport or retract dispatch; PIN cancellation does not undo an in-flight purge, Pending status updates do not stop running workers. No concurrency, fresh-view or dispatched cancellation guarantee.

A34 runtime qualification remains not-run. Separate summary/count/page reads, cached counts, partial file/database persistence, missing synchronization, dispatched cancellation and incomplete concurrency guarantees remain non-normative limitations. Shared owners retain household identity, capture acquisition/readiness transitions, quality policy, sharing transformation, planner assignment, worker lifecycle and SSE delivery. This draft owns only the provider/interaction boundary stated above.

## Migration Plan

No runtime migration or deployment. Human review compares this delta with the unchanged main and prior promoted deltas. Promotion/archival require separate authorization. Documentation can be revised or withdrawn without touching application state.
