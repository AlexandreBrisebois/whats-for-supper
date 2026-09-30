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

## Verification record — 2026-09-30

- **Passed:** from `pwa/`, `npm run test:unit -- src/components/capture/MinimalCapture.test.tsx src/components/capture/MinimalCapture.submit-lock.test.tsx src/store/captureStore.test.ts` — 3 files, 26 tests passed. Submission is mocked; these are focused UI/store checks.
- **Reviewed:** OpenAPI, current upload/service/workflow/SSE source, and cited test scope. `RecipeImportLifecycleTests` covers import-report lifecycle rather than proving initial upload/launch reliability.
- **Not run:** API/integration, real-database, browser E2E, live model/workflow, and live contract parity checks. This documentation-only change does not claim those outcomes.
- **Harness blocked:** `task agent:begin -- cap-01-spec-review` found the existing `restore-precommit-ci-checks` session. `task agent:session:status` also reported that its baseline HEAD is stale. It was preserved. Standard `task agent:prepare` / `task agent:finish` were not run against that unrelated baseline.
- **Passed:** harness `documentation_check` directly on these three Markdown files — introduced links and staged/worktree diff whitespace. No application formatting/generation is applicable. The check was repeated after this evidence update.

## Scope and private baseline

A separate baseline was created using the existing session module at `/private/tmp/wfs-cap-01-spec-review-session`, task ID `cap-01-spec-review`, source HEAD `44f28900ff019ebcfd05d59c2b6cd43916528c47`. It preserves the repository's active session rather than replacing it. Final scope/content hashes are recorded privately alongside that baseline.

| Authorized file | Reason for change |
|---|---|
| `requirements.md` | Mark implemented status, retain R1–R8, replace generic claims with concrete behavior and explicit gaps. |
| `design.md` | Record actual entry, native upload boundary, persistence/launch order and SSE ownership. |
| `tasks.md` | Replace future implementation boilerplate with review findings, traceability and actual check evidence. |

The four pre-existing dirty files in shared spec guidance and loading probes are outside this task. The spec remains at its requested path; no archival, implementation, commit, or deployment was performed.
