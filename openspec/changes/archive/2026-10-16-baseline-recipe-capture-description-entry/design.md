# Design

## Context

See proposal.md for motivation. This is a documentation extraction, not a new pipeline. Main recipe-capture has 19 actual requirement headers and 44 scenario headers before this draft. Its URL/photo blocks and Purpose remain unchanged. Evidence BSL-recipe-capture-010–013 and file identities are recorded in `docs/openspec-baseline-plan.md`.

The first observable slice is ordinary `/capture` → Describe a recipe → initial recipe identity → waiting presentation. Later completion is conditional on actual workflow execution; HTTP success does not prove delivery.

## Goals / Non-Goals

**Goals:** Trace the current seams and distinguish implementation-supported behavior, inspected test assertions, contract disagreement and executed evidence. Reuse current shared observable rules without copying their lifecycle implementations into new requirements.

**Non-Goals:** No application changes or runtime qualification. Do not extend the stronger photo extraction semantic validation to description synthesis. Do not promise atomic persistence/queueing, complete model output, effective failed-synthesis retry, or status polling by this screen. Hero generation remains an external prerequisite in this trace, not specified behavior here.

## Decisions

### Extract the existing capability, preserve promoted requirements

Add seven requirements/18 scenarios to recipe-capture. Use only ADDED requirements; leave main unchanged. Reuse “Finalize recipe readiness and broadcast completion”, “Track background capture progress and auto-redirect”, “Inline transition to ready status upon completion”, and the presentation portion of “Persistent failure banner on workflow failure”. The latter's retry-success scenario is not evidence of working description recovery. Alternative: copy/modify URL and photo rules; rejected because it would duplicate or change promoted requirements.

### Trace representations and side effects without assuming delivery

1. `pwa/src/app/(app)/capture/page.tsx` passes `mode`/`intent` through `CaptureWithPdf` to `MinimalCapture`. Ordinary capture means absent GOTO intent; GOTO settings writes/return destination are a separate caller boundary. `mode=describe` opens the form; description draft is local component state. No separate rating, serving, time, image or preparation-note metadata controls exist for this form. The optional textarea is synthesis input, not the photo notes field.
2. `MinimalCapture.handleDescribeSubmit` bypasses `useCapture` and `lib/api/recipes.ts`; it directly calls generated `apiClient.api.recipes.describe.post`. Required name is trimmed; blank description becomes name. A 500ms debounced list lookup uses `name`; the service filters ready/nondeleted recipes by case-insensitive exact name. Warnings are advisory; lookup failure is logged and stale/out-of-order warnings are not ruled out.
3. `lib/api/api-client.ts` injects `X-Family-Member-Id` from selected member or cookie. Generated `api/recipes/describe/index.ts` serializes `DescribeRecipeDto`, parses `data: RecipeDto`. OpenAPI requires name, permits nullable/omitted description and declares 202. Controller `[Required]` DTO validation and member binder guard intake; controller returns `Ok` (200), as asserted by integration source. User explicitly selected non-normative status treatment in this session. No exact success status requirement or contract repair is included.
4. `RecipeService.DescribeRecipe` creates a UUID entity and `recipe.info` with name, description, zero images, submitting member/timestamps. Entity defaults include `IsReady=false`, `IsSynthesized=false`; service sets discoverability false. `ImageService`/recipe store writes metadata before DB save. Dispatch of `goto-synthesis` is awaited after persistence but exceptions are caught/logged and initial DTO still returned. Direct API omission becomes an empty synthesis parameter; only the browser supplies name fallback. No transactional rollback/delivery guarantee.
5. `WorkflowRepository` loads YAML from storage; `WorkflowOrchestrator` validates definitions, substitutes parameter strings and persists instance/tasks in a DB transaction. `WorkflowSeeder` copies bundled definitions on startup, but catches seeding errors; deployed definition identity is unqualified. `Program.cs` registers `SynthesizeRecipe`/worker. YAML order: synthesis → hero prerequisite (excluded behavior) → sync → ingredient categorization → recipe categorization → ready. Dependencies do not prove runtime execution.
6. `RecipeAgent.DoSynthesizeRecipeAsync` uses `PromptType.RecipeSynthesis` (mapped by `EmbeddedPromptRepository` to embedded `Prompts/synthesize-recipe.md`) and `IChatClient`; sanitizes/deserializes JSON, falls back on malformed/no-name output to description as name and empty ingredient/instruction arrays. It writes `recipe.json`/`recipe.info` through `RecipeRepository`, marks synthesized, zero images and dish index -1. It does not use photo extraction's completeness/refinement parser. Follow-up description generation is best effort in the synthesis processor. `SyncRecipeProcessor` transfers generated content/metadata to DB. The embedded prompt requests complete ingredients/steps, language matching and inferred quantities/time/yield; these are model instructions, not enforced validation or quality guarantees. The older `GetSynthesisSystemPrompt` helper is not the invoked prompt owner.
7. `RecipeReadyProcessor` sets DB readiness/discoverability and publishes ready SSE; it does not bump image count and writes readiness to file only for retained PDF sources (outside this slice). Do not copy the photo main spec's generic disk-readiness claim into description requirements. `GetRecipeStatus` returns pending/ready based on `IsReady`, not image count/name/IsSynthesized as older contract prose states; unknown IDs return 404. The description screen uses notifications, not status polling.
8. Returned ID enters in-memory `captureStore`; screen shows Synthesizing…, Done and a ten-second countdown. `useScheduleStream` matches ready events to pending IDs, updates library notifications; active capture consumes matching ready notification and cancels countdown. Early-ready lookup exists but does not guarantee all event races. `WorkflowWorker` schedules retries only for configured transient errors, otherwise records failed task/pauses instance and best-effort publishes `recipe_failed`. Session-matched events produce the existing failure banner. No per-step browser percentage is implemented.
9. Banner Retry calls `/api/captures/failures/{id}/retry`; `CaptureFailureService` accepts only `recipe-import`/`url-import`, so an existing failed `goto-synthesis` is rejected as NOT_FAILED_CAPTURE (controller 422). It is also omitted from failed-capture listing/clear. Banner only dismisses after successful retry; failed retry releases local busy state but adds no explicit retry-error feedback. Dismiss hides notification, not server failure. No successful description retry or cross-session recovery requirement is drafted.

Alternative: treat test names/comments or workflow YAML as end-to-end success evidence; rejected because substitutions and conditional failures break that inference.

### Use assertion-level test evidence

- `RecipeDescribeIntegrationTests`: inspect 200/ID/name, omitted name rejection, omitted description acceptance, initial pending status, unknown status 404, AddedBy/metadata persistence and missing member rejection. Missing-name test also lacks member context; it does not isolate validation cause.
- `GotoSynthesisIntegrationTests`: “triggers” test asserts response and initial row, not actual orchestrator invocation, parameters or delivered task execution. Other tests invoke ready processor directly and check zero-image synthesized status, no family settings mutation and already-ready no-op. Historical comments about image-count readiness are stale.
- `TestWebApplicationFactory`: default EF InMemory, InMemoryRecipeStore, mocked orchestrator that persists synthetic workflow/task, substituted external providers. These tests do not establish PostgreSQL, disk, real YAML delivery or model execution.
- `MinimalCapture.test.tsx`: generated client/router/stores/useCapture substituted, success response uses fake ID; non-GOTO describe path asserts Done/countdown and Home after fake ten seconds. Form and link visibility/name gating assertions are inspected, not run.
- `MinimalCapture.recipe-import.test.tsx`: mocked list result and mocked detail sheet verify description duplicate banner/view; no real database match or duplicate rejection guarantee.
- `capture-flow.spec.ts`: browser describe visibility/blank-name no-call assertions use intercepted APIs; successful description request assertions are under GOTO intent, so settings behavior is out of scope here. `mock-api.ts` describe handler returns canned 200/initial recipe, not background synthesis. General SSE tests and banner tests substitute events/retry APIs; none proves description retry eligibility.
- `docs/flows/user-flows/sse-capture-async-feedback.md` is secondary design material; its old four-second history and proposed Add Another/no-timer behavior are not the current ten-second implementation.

## Risks / Trade-offs

- [Contract status mismatch] → U65 records 200 versus 202; user confirmed withholding numeric status. Contract is unchanged.
- [Pending recipe despite failed launch; unqualified deployed definitions] → U66 separates intake from delivery. No services started.
- [Minimal recipe can proceed without ingredients/instructions] → U67 records fallback; no cookability/semantic completeness guarantee.
- [Retry UI cannot recover this workflow] → U68 records whitelist/422 boundary; reuse failure presentation only.
- [Status prose drift, readiness metadata and notification races] → U69 records actual IsReady implementation, session-only tracking and no guaranteed event replay/file-readiness for description. Existing main rules preserved, not silently repaired.

## Migration Plan

No deployment, schema migration or rollback applies. Review this draft; acceptance, any later promotion, and lifecycle actions require separate authorization. A34 runtime/database qualification remains deferred. Removing this draft later would affect documentation only; no application state is changed.
