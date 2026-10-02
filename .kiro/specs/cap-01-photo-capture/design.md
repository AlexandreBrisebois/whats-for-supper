# CAP-01 — Photo capture design

> **Status:** Implemented capability baseline. Derived from [requirements](requirements.md); current limitations and bounded follow-up candidates are recorded in [tasks](tasks.md). No implementation changes are authorized by this document.

## Integration map

All source paths below are repository-relative.

| Boundary / owner | Source | Current responsibility |
|---|---|---|
| Route | `pwa/src/app/(app)/capture/page.tsx` | Renders `MinimalCapture`; passes capture mode/intent. Review happens inline. |
| Interaction | `pwa/src/components/capture/MinimalCapture.tsx` | File inputs/drop, preview/selection, metadata controls, synchronous Save lock, delayed overlay, queued/ready screen and navigation. |
| Draft / validation | `pwa/src/hooks/useCapture.ts`, `pwa/src/lib/imageUtils.ts` | Local `File[]`, dish index, rating, notes, validation, multipart construction, request errors. |
| HTTP adapter | `pwa/src/lib/api/recipes.ts` (`createRecipe`) | Native `fetch` for multipart; adds member header; accepts either `data.id` or top-level `id`. This upload bypasses Kiota serialization. |
| Contract | `specs/openapi.yaml`, `POST /api/recipes` | Documents `images` and a `data.id` response envelope; the upload field differs from the current client (F1). |
| Server | `api/src/RecipeApi/Controllers/RecipeController.cs`, `api/src/RecipeApi/Services/RecipeService.cs` | Member/input checks, image and metadata storage, recipe/search-sidecar persistence, workflow launch, 202 response. |
| Processing | `api/src/RecipeApi/Workflows/recipe-import.yaml` | Extract → generate hero → sync → categorize ingredients → categorize recipe → recipe ready → complete import report. |
| Pending / notifications | `pwa/src/store/captureStore.ts`, `pwa/src/hooks/useScheduleStream.ts`, `pwa/src/store/libraryStore.ts` | In-memory pending IDs; SSE matches and removes pending entries, then queues ready/failed notifications. |

## Cross-spec boundaries

- [CAP-02 URL capture and PWA share target](../cap-02-url-capture-share-target/) shares the capture route and pending-notification mechanics, but owns URL/share input and `POST /api/recipes/capture-url`.
- [CAP-06 Import progress and completion](../cap-06-import-progress-completion/) owns the broader user-facing meaning of pending/ready state. This packet only records how a photo upload registers for existing completion feedback.
- [CAP-07 Import failure recovery](../cap-07-import-failure-recovery/) owns the failed-capture list, retry, and clear flows. A `recipe_failed` notification here is not a retry policy.
- [PLAT-01 Shared real-time state](../plat-01-shared-real-time-state/) owns stream delivery and reconnect behavior; capture's in-memory correlation does not add replay or persistence guarantees.
- [PLAT-02 Background workflow engine](../plat-02-background-workflow-engine/) owns workflow triggering, retries, and durable lifecycle state. [PLAT-03 Recipe search indexing](../plat-03-recipe-search-indexing/) and [PLAT-04 Ingredient categorization](../plat-04-ingredient-categorization/) own the post-persistence side effects reached from this route.

## Request and persistence flow

1. `useCapture` validates added images and maintains the mounted draft. The first image defaults to the dish selection; selecting it again clears the designation.
2. `MinimalCapture.handleSave` acquires a synchronous ref lock before awaiting the hook. Busy state disables Save immediately; a still-running request gets an overlay after 800 ms.
3. The hook appends every image under multipart key `files`, adds `rating` and `finishedDishImageIndex` (`-1` when absent), and includes trimmed `notes` only when non-blank.
4. `createRecipe` uses native fetch to `POST /api/recipes` with `X-Family-Member-Id`. The controller binds `CreateRecipeDto` and `IFormFileCollection`; the service verifies member existence and validates input.
5. The service creates a recipe UUID, writes images and `recipe.info`, and saves the recipe with its pending search-document sidecar in one database save. Filesystem writes and database persistence are not one atomic transaction; failed persistence can leave files behind.
6. Search indexing and `recipe-import` are triggered after persistence. Both launch exceptions are logged and swallowed. The controller still returns `Accepted(new { id = recipeId })`; the globally registered `api/src/RecipeApi/Infrastructure/SuccessWrappingFilter.cs` wraps this as `data.id`, matching OpenAPI. Acceptance must not be described as proof of a queued workflow.
7. The adapter tolerates both response envelopes. For a non-empty ID, the normal photo path adds an in-memory pending entry, checks existing ready notifications, and displays its success/queued screen. The GOTO intent also saves a pending GOTO item before this registration; that extra save is a separate operation, not an atomic part of recipe creation.

## Background state and navigation

`useScheduleStream` handles `recipe_ready` and `recipe_failed`. If the recipe is in the session's pending queue, it removes the entry and pushes a notification. `MinimalCapture` subscribes to ready notifications matching its pending ID and dismisses the notification it handles inline. It also checks the existing notification queue immediately after adding the pending entry.

Normal capture starts a 10-second Home countdown and provides an immediate Done action. Ready state replaces queued messaging. GOTO has a distinct success presentation; its metadata save and navigation are shared behavior, not a new policy defined here.

`GET /api/recipes/{id}/status` exists as an adjacent status seam, but the reviewed capture path does not poll it. Pending entries use plain Zustand memory without persistence. SSE is not replay/refresh proof: an event arriving before pending registration, a lost event, reload, or an uncertain HTTP result can leave the client without completion correlation (F3).

## Failure, accessibility, and privacy boundaries

Validation prevents invalid submission and request failure leaves the mounted draft available. The hook displays an `Error.message` from the adapter, or a generic fallback, and returns `null`; the UI releases its lock in `finally`. There is no server idempotency key or authoritative lookup before retry. Later workflow failures travel through the notification path; launch failure before a workflow exists is not covered by that mechanism.

Labeled camera/gallery/remove buttons coexist with a pointer-only dish-selection container. The upload overlay is a plain `div`, without focus containment or a live status role. Some labels are localized; upload helper and error messages include literal English. Member attribution is verified in this flow, but this source review is not a security audit of household isolation. These are retained acceptance gaps, not newly approved design choices.

## Verification map

| Coverage source | What it supports | Limit |
|---|---|---|
| `pwa/src/components/capture/MinimalCapture.test.tsx` | Capture controls, mocked acceptance/navigation, drop handling, adjacent modes | Hook/network are mocked; not upload or workflow qualification. |
| `pwa/src/components/capture/MinimalCapture.submit-lock.test.tsx` | Rapid duplicate Save activation and failure unlock | Mocked submission; not server idempotency. |
| `pwa/src/store/captureStore.test.ts` | Pending add/remove/get semantics | In-memory behavior only. |
| `api/src/RecipeApi.Tests/Services/ValidationServiceTests.cs` | Server validation cases | Not rerun in this documentation review. |
| `api/src/RecipeApi.Tests/Services/RecipeImportLifecycleTests.cs` | Import-report lifecycle, newest attempt, guarded transitions | Not proof of initial photo upload/launch success; not rerun. |
| `pwa/e2e/capture-flow.spec.ts` | Existing browser journey coverage | Not rerun; no live model/database claim. |

This map is source-grounded rather than a guarantee of live qualification. A future correction must use the approved contract → tests → implementation sequence; this baseline does not silently resolve drift in favor of code.
