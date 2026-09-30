# CAP-01 — Implementation status and review evidence

> **Status:** Photo capture is implemented. This replaces the generic future-task plan with a source-backed review dated 2026-09-30. The documentation review is complete; the capability is not certified against all quality requirements. Findings below are follow-up candidates, not authorized implementation tasks.

## Completed documentation review

- [x] Trace `/capture` → `MinimalCapture` → `useCapture` → native multipart adapter → controller/service → persistence/workflow → session SSE notifications.
- [x] Synchronize requirements and design with the actual route, fields, validation limits, optional dish selection, pending-state ownership, and request locking.
- [x] Preserve unmet requirements and contract divergence as explicit findings; remove the generic T1–T5 future implementation checklist.
- [x] Run the three focused existing PWA suites and record their scope.

## Review findings

| ID / severity | Evidence and consequence | Smallest follow-up |
|---|---|---|
| **F1 — Medium: contract drift** | `specs/openapi.yaml` documents multipart `images`, while `useCapture.ts` sends `files` and the controller binds the whole `IFormFileCollection`. The current manual upload bypasses generated serialization, so generated-client request parity is not established. The response does match `data.id` through the globally registered `SuccessWrappingFilter`; the adapter also tolerates top-level `id`. | Decide the authoritative wire representation, then align contract, tests, controller and adapter as needed. Do not infer a contract change from this documentation update. |
| **F2 — High: acceptance can outlive failed launch** | `RecipeService.CreateRecipe` persists the recipe, catches/logs `recipe-import` launch errors, and still returns its ID. The controller returns 202 and the UI says processing, even when no import was queued. Files are also written before database persistence. | Specify and test initial-launch failure/recovery, including partial persistence, before changing the service or acceptance wording. |
| **F3 — Medium: recovery/correlation gap** | `captureStore.ts` is in-memory only. `useScheduleStream.ts` creates capture notifications only for registered pending IDs; there is no status polling in this capture path. An early/missed event or reload can lose correlation. Request failure permits retry without an idempotency key or authoritative reconciliation. | Define a bounded recovery policy and add deterministic early-event, reload/reconnect and uncertain-response tests before implementation. |
| **F4 — Medium: accessibility expectation unmet** | The dish-selection preview in `MinimalCapture.tsx` is a clickable `div` without keyboard semantics. The delayed upload overlay is a plain `div` without dialog/live-status semantics or focus handling. R6 cannot be marked fully satisfied. | Add keyboard-equivalent selection and appropriate progress semantics, with focused interaction tests. |
| **F5 — Medium: localization gap; privacy verification incomplete** | `MinimalCapture.tsx` and `useCapture.ts` contain literal English upload/error copy despite some localized labels. Member existence/header checks do not establish cross-household authorization, and this review did not audit every failure-message boundary. | Localize remaining photo-path copy in a scoped correction; separately verify privacy assertions before certifying R7. Isolation is an unverified claim here, not a demonstrated breach. |

The old spec incorrectly listed `/capture/confirm`, `CameraView`, and `ImageReview` as the active path and implied polling, persistent recovery, and generated upload serialization. Those documentation errors are corrected. No application, contract, or test source was changed.

## Requirement → evidence traceability

| Requirements | Current supporting evidence | Remaining limit |
|---|---|---|
| R1, R2 | Capture route/component, adapter, controller, `RecipeService.CreateRecipe`; component acceptance/navigation tests | F1/F2; mocked tests do not prove live acceptance. |
| R3, R8 | `useCapture`, `imageUtils`, `ValidationService`; failure-unlock test | Source review for form/index semantics; no direct hook regression suite run. |
| R4 | Pending store, `useScheduleStream`, component ready notification subscription; store tests | F3; no end-to-end SSE/reconnect qualification. |
| R5 | `photoSubmitLockRef` and `MinimalCapture.submit-lock.test.tsx` | Local activation only; no cross-client idempotency. |
| R6, R7 | Rendered control definitions and locale call sites | F4/F5; full accessibility/localization/privacy acceptance remains open. |

## Using this baseline for future work

Select one finding as a bounded correction. The resulting task must update the
affected requirements/design wording, name the relevant client/API/E2E seam and its
mock owner, and add tests before code. Do not treat the implementation baseline as a
certificate that upload, workflow, real-database, browser, or model behavior has
been newly qualified.
