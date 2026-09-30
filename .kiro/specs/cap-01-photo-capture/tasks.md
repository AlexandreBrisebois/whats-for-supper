# CAP-01 — Photo capture follow-up candidates

> **Status:** Photo capture is implemented. This page retains only decisions and corrections that future work may select; it is not an implementation plan for the shipped capture flow.

## Current boundary

Photo capture posts `FormData` from `useCapture` through `createRecipe` to `POST /api/recipes`. The browser currently sends repeated `files` parts plus `rating`, `finishedDishImageIndex`, and optional trimmed `notes`; successful controller responses are `202` with `{ "data": { "id": "<uuid>" } }`. `pwa/e2e/mock-api.ts` owns the shared mocked API boundary, while `pwa/e2e/capture-flow.spec.ts` adds scenario-local routes where a capture behavior needs a distinct response.

The current packet does not select any candidate below. A selected change must update the affected requirement and design wording before implementation.

## Candidate 1 — Resolve multipart contract drift

- **Requirements:** CAP-01-R1, CAP-01-R2, CAP-01-R3.
- **Problem:** The browser and controller/test fixture use multipart field `files`, but OpenAPI documents `images`. Native `fetch` bypasses generated-client serialization, so contract parity is not established.
- **Decision required:** Select one authoritative multipart field name and decide whether the generated client is part of the supported upload boundary. Do not change either representation before that decision.
- **Authorized future slice:** Align only the approved OpenAPI operation, controller binding, adapter, mock, and focused tests; preserve the existing acceptance-versus-ready distinction.
- **Test seam:**
  - **Affected unit/API tests:** `api/src/RecipeApi.Tests/Controllers/RecipeControllerTests.cs` (valid multipart acceptance and validation) and a focused `pwa/src/lib/api/recipes` adapter test that inspects `FormData` and `X-Family-Member-Id`.
  - **Playwright scenario:** `pwa/e2e/capture-flow.spec.ts` uploads one gallery image, asserts a single accepted request, and shows queued—not ready—state.
  - **Mock owner:** Update `pwa/e2e/mock-api.ts` in this vertical slice, or retain the scenario-local `POST /api/recipes` route in `capture-flow.spec.ts` when it is the only exceptional response.
  - **Route and method:** `POST /api/recipes`.
  - **Expected request/response contract shape:** `multipart/form-data` with repeated approved image part name, `rating` in `0..3`, `finishedDishImageIndex` in `-1..imageCount-1`, and optional non-blank `notes`; `202 Accepted` response `{ "data": { "id": "<uuid>" } }`.

## Candidate 2 — Define accepted-work launch failure and partial-persistence recovery

- **Requirements:** CAP-01-R2, CAP-01-R3, CAP-01-R4.
- **Problem:** `RecipeService.CreateRecipe` saves image files and the recipe/search sidecar before it catches and logs workflow-launch failure. The controller still returns an ID, so the capture UI can present processing for work that was never queued. A database-save failure can also leave files behind.
- **Decision required:** Define whether acceptance requires a durable workflow instance, how launch failure is surfaced or recovered, and which service owns cleanup/retry for partially persisted uploads. Coordinate with CAP-06, CAP-07, and PLAT-02 before selecting code.
- **Authorized future slice:** Add one server-owned recovery policy; do not make browser retry imply idempotency or use capture-local state as the workflow authority.
- **Test seam:**
  - **Affected unit/API tests:** `api/src/RecipeApi.Tests/Services/RecipeServiceTests.cs` for persistence/trigger failure behavior and `api/src/RecipeApi.Tests/Controllers/RecipeControllerTests.cs` for the resulting accepted-or-error response.
  - **Playwright scenario:** `pwa/e2e/capture-flow.spec.ts` exercises the approved launch-failure response/state and verifies that UI wording does not claim readiness.
  - **Mock owner:** The selected vertical slice owns its `POST /api/recipes` response in `pwa/e2e/mock-api.ts` or a scenario-local route; no unrelated capture-mode mock changes.
  - **Route and method:** `POST /api/recipes`; any new recovery/status endpoint must be added here before implementation.
  - **Expected request/response contract shape:** Preserve the approved multipart request from Candidate 1; define whether a launch failure returns a non-2xx family-safe problem response or a `202` envelope with an explicit durable recovery/correlation field. Do not infer this shape from the current swallowed exception.

## Candidate 3 — Establish durable pending-state reconciliation

- **Requirements:** CAP-01-R3, CAP-01-R4, CAP-01-R5, CAP-01-R8.
- **Problem:** `captureStore` is session memory. An event before pending registration, missed/reconnected stream, reload, or ambiguous request outcome can leave the member without a completion correlation. The existing `GET /api/recipes/{id}/status` route is not called by the reviewed photo path.
- **Decision required:** Choose a server-owned reconciliation rule, including whether an accepted upload exposes an import/correlation identifier, when status is queried, and behavior across reload/member switching. Coordinate the user-facing state with CAP-06 and event semantics with PLAT-01.
- **Authorized future slice:** Add durable reconciliation without recreating workflow or event delivery ownership in the PWA; preserve local locking but do not claim cross-device idempotency.
- **Test seam:**
  - **Affected unit/API tests:** `pwa/src/store/captureStore.test.ts`, `pwa/src/hooks/useScheduleStream.test.ts`, `pwa/src/components/capture/MinimalCapture.recipe-import.test.tsx`, and `api/src/RecipeApi.Tests/Controllers/RecipeControllerTests.cs` for any changed accepted/status envelope.
  - **Playwright scenario:** `pwa/e2e/capture-flow.spec.ts` accepts an upload, simulates a reload or reconnect before `recipe_ready`, then reconciles to the authoritative pending, ready, or failed state without a false-ready result.
  - **Mock owner:** Add the selected photo-capture status/event fixtures to `pwa/e2e/mock-api.ts`; the same vertical slice owns any scenario-local EventSource control.
  - **Route and method:** `POST /api/recipes`, `GET /api/recipes/{id}/status`, and `GET /api/stream` if the selected policy retains SSE.
  - **Expected request/response contract shape:** Keep accepted response `{ "data": { "id": "<uuid>" } }` unless the decision approves a versioned replacement; status must return the recipe ID and an authoritative pending/ready/failed representation, and stream events must include the matching `recipeId` plus ready name/image or family-safe failure fields.

## Candidate 4 — Correct photo-review accessibility and localization

- **Requirements:** CAP-01-R6, CAP-01-R7.
- **Problem:** Dish selection is a pointer-only `div`; the delayed upload overlay has no dialog or live-status semantics; upload and error copy includes literal English.
- **Authorized future slice:** Make the existing inline photo review keyboard-operable and announce upload/error progress using established locale resources. Do not create a separate camera/review route or change the upload contract.
- **Test seam:**
  - **Affected unit tests:** `pwa/src/components/capture/MinimalCapture.test.tsx` and `pwa/src/components/capture/MinimalCapture.submit-lock.test.tsx` cover keyboard dish selection, focus/status semantics, overlay timing, and localized copy.
  - **Playwright scenario:** `pwa/e2e/capture-flow.spec.ts` operates dish selection by keyboard on a phone-sized viewport and observes announced pending/error state.
  - **Mock owner:** No API mock change unless the selected copy/recovery behavior changes a response contract; presentation-only work keeps the existing capture mock untouched.
  - **Route and method:** No API route is changed; browser entry remains `/capture`.
  - **Expected request/response contract shape:** Unchanged `POST /api/recipes` multipart request and `202` envelope; the task is presentation-only.

## Deferred boundary

Cross-device idempotency and household-isolation guarantees are not inferred from the local submit lock or member-existence check. They need a separately selected contract/security decision before becoming implementation work.
