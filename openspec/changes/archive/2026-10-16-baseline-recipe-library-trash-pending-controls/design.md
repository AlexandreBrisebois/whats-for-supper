# Extraction design

## Context

See proposal.md for motivation. This is a documentation baseline of inspected executable paths at commit `04a1c4570f9bbb01b47436790d4248635ac3179a`, branch `moving-to-openspec`, 2026-10-16. Main recipe-library remains 61 requirements / 137 scenarios. The pre-existing staged audit, unstaged promotion records and concurrent changes are not owned by this draft. Before-images and CLI instruction receipts are under `/tmp/wfs-library-remaining/`.

## Goals / Non-Goals

**Goals:** independently reviewable ADDED delta; every exact requirement/scenario maps below to source and inspected assertions.

**Non-Goals:** changing behavior, accepting defects as desired requirements, contract/client/mock repair, promotion, archive or runtime qualification. No tests were executed. Test bodies are evidence of assertions only.

## Decisions

First observable slice: RecycleBinSheet Restore handler adds ID → existing restore API → finally removes ID; purge form sets submitting → existing purge API → existing success/rejection handling. Provider rules reuse Restore soft-deleted recipe to active library and Permanently purge soft-deleted recipe with valid elevated PIN, subject to the separate correction delta. No duplicate provider/delete rules.

## Exact requirement and scenario evidence

All rows are implementation-supported. **Source-only** explicitly means no direct inspected assertion for the stated behavior. Presence of a fixture value or test title is not an assertion.

| Exact requirement header | Exact scenario header | Executable source symbols | Inspected assertions and limits |
| --- | --- | --- | --- |
| Disable the restoring trash item during its request | Wait for an item restore | pwa/src/components/recipes/RecycleBinSheet.tsx handleRestore/restoringIds/button disabled | Source-only: set adds ID before await and finally removes it; no focused pending-response assertion found. Existing soft-delete integration assertions test API persistence/reads, not this UI pending state. |
| Disable the restoring trash item during its request | Reenable a failed restore control | pwa/src/components/recipes/RecycleBinSheet.tsx handleRestore catch/finally | Source-only failure/pending assertion. Catch logs only; no visible error or universal retry feedback is promised. |
| Display pending permanent-purge submission feedback | Display a pending purge request | pwa/src/components/recipes/RecycleBinSheet.tsx handlePinSubmit/isSubmitting/submit render/closePinDialog | Source-only direct pending assertion. Pending flag is not a submit-handler reentry guard; form/Cancel availability cannot prove request cancellation. |

## Substitutions and representation boundary

API suites using `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` default to EF InMemory (transactions ignored), `InMemoryRecipeStore`, disabled household authentication, a stub chat client/embedding provider, and a mocked `IWorkflowOrchestrator`. Its trigger setup persists a synthetic Processing instance and Pending Mock task; it does not execute the requested workflow. Overrides select local store or PostgreSQL only when explicitly supplied; no such runtime qualification is claimed here. `SuccessWrappingFilter` skips FileResult and ResponseDto/SkipWrapping results, preserves an existing anonymous data object, and wraps other successful object results. Errors are not universally data-wrapped.

UI component/page suites mock API functions and motion/children as identified in each row. Browser suites use `pwa/e2e/fixtures.ts` (unhandled API routes blocked except health) and `pwa/e2e/mock-api.ts` plus later local routes. They exercise synthetic state, not backend persistence, credentials, real model output or image delivery. `pwa/src/lib/api/api-client.ts` wires the generated client; `pwa/src/lib/api/recipes.ts` supplies manual adapters. OpenAPI/generated fields and synthetic mocks do not prove completeness or wire parity. No regeneration or repair is authorized.

## Risks / Trade-offs

The purge form handler does not test isSubmitting before dispatch. PIN input, Cancel, surrounding sheet dismissal and other items are not globally locked. Closing a displayed dialog cannot retract the captured request; later success can still remove the item. Restore failures log without visible error. No API serialization, exactly-once mutation, abort, immutable in-flight PIN or global lock guarantee. All three scenarios are source-only; no runtime or new tests.

A34 runtime qualification remains not-run. Separate summary/count/page reads, cached counts, partial file/database persistence, missing synchronization, dispatched cancellation and incomplete concurrency guarantees remain non-normative limitations. Shared owners retain household identity, capture acquisition/readiness transitions, quality policy, sharing transformation, planner assignment, worker lifecycle and SSE delivery. This draft owns only the provider/interaction boundary stated above.

## Migration Plan

No runtime migration or deployment. Human review compares this delta with the unchanged main and prior promoted deltas. Promotion/archival require separate authorization. Documentation can be revised or withdrawn without touching application state.
