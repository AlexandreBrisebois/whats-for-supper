# Design

## Context and Existing Ownership

Approved scope: cost-safe exploration plus the reviewed context band, explicit user approval relayed on 2026-10-25. Source is connector main ba8dca21; the isolated local baseline has that exact tree e81bfb41. PR #340 remains the broader reset proposal. No Home #339 or beta #345 work is included.

`DemoModeChatClient` guards chat but native `GeminiEmbeddingProvider` and `RecipeHeroAgent` bypass it. `SearchIndexWorkflow` publishes lexical content before embeddings; `RecipeSearchService` has separate typed-vector and prepared-Similar paths. `RecipeImportReportService.SubmitAsync` can launch reimport, so its POST is restricted in demo while local DELETE resolution remains available. Existing MVC resource filters can reject uploads before form/model binding. Existing five-name bypass returns misleading success-shaped task results; use an explicit non-transient unavailable failure instead. CategorizeRecipe catches chat failure and otherwise replaces facts with fallback defaults, so demo mode must fail before that fallback and retain prepared facts.

## Decisions and Tradeoffs

- Existing API DEMO_MODE is the authoritative model restriction. Put checks at every actual provider boundary as well as early entry; no credential removal, role redesign or workflow-wide reset fence. Guard chat/stream, native embedding HTTP and the direct Google hero client. Use its supported ClientOptions.HttpClientFactory seam for fail-on-send transport tests, without a new provider framework.
- Block AI-only POST actions with a small demo resource-filter attribute before body parsing: recipes root, capture-pdf, capture-url, describe, originals, hero/regenerate, imports/bulk, import-report and captures/failures/{id}/retry. Return one reusable OpenAPI 403 response `{status:403,code:"DEMO_AI_UNAVAILABLE",message:...}`. Auth still runs normally. Preserve prepared bundle/local editing and read operations. Generic worker/reset entry retains existing acceptance semantics; provider denial prevents AI even for previously queued work.
- Typed search bypasses query embeddings in demo. Indexing/reconciliation keeps deterministic lexical publication while skipping embedding production/embedding-only retry loops. Compatible existing vectors remain eligible for Similar; changed fingerprints continue to invalidate them.
- PWA reads API demo status once through a small shared mode owner. AI capture entry waits if status is unknown and offers Retry/return on failure. Demo presentation can reuse existing installation identity without treating it as API authorization. No poller or added model feature flag.
- The context band is at the top of the ordinary app shell, respecting safe areas, purple with white text and a 44px-or-larger touch target. Use one short phone sheet/compact iPad dialog, semantic modal/focus handling, EN/FR and measured contrast. Keep noninteractive identity meaning intact. Copy explains a sample shared temporary household, others' changes, avoiding personal information and actual AI restrictions; no zero-cost/countdown/deployment claim.
- Introduce automatically only at an ordinary ready Home entry before interaction, with established member and route state; defer deep-link/share/import/voting handoffs, active tasks, late readiness and competing dialogs. User-driven reopening remains available. Both Start exploring and explicit close persist a boolean demo key outside shared snapshot state. Guard unavailable storage with visit memory; no tracking ID, member identity, cosmetic-copy version replay or cross-device claim. Beta remains separate.

## First Observable Slice

Through real test-server MVC and isolated in-memory household/files, POST a malformed/private upload in demo and observe 403 before binding, no rows/files/workflows added; a prepared recipe still reads correctly. At real model seams, transport/provider doubles fail on any send and count zero in demo (including credentials/force/retry), with positive non-demo delegation controls. No actual provider request is permitted in any test.

Then exercise prepared search/edit/index/reconciliation with real internal services, and the browser band/capture entry through method-sensitive mocks. No PostgreSQL schema or persistence contract changes are selected; tests requiring a real database must use a newly created disposable local target, never inherited environment/production configuration.

## Compatibility, Rollout and Reversal

OpenAPI 403 additions precede implementation; regenerate Kiota and synchronize method-sensitive Playwright mock behavior in the same slice. No dependency pins or framework additions. Existing non-demo success paths are regression boundaries. This PR is review-only publication with no rollout or deploy. It does not establish safe/reset-complete public operation.

## Acceptance and Diagnosis

Use Taskfile test:api/test:unit/test:e2e, client generation/check and applicable final verify. Record meaningful red/green before production logic. Unit/component tests cover storage failures, repeated reset/profile/locale state, delayed readiness and deep links; browser tests inspect EN/FR mobile/tablet rendering, focus/Escape/reopen, text contrast and no upload requests. All fixtures are local synthetic documents/media/vectors, dummy credentials, isolated browser contexts and loopback mocks. Never production, live demo, real AI or user telemetry. Report real database/device qualification separately and do not infer it from mocks.
