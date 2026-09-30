# CAP-01 — Photo capture requirements

> **Status:** Implemented capability; current-behavior specification reviewed on 2026-09-30. Behavior-first, accelerated documentation update, originating from `docs/feature-inventory.md` CAP-01. This review does not authorize application or contract changes. Implementation is not a claim that every quality requirement below is satisfied; see [review findings and evidence](tasks.md).

## Outcome and scope

A family member can upload recipe photos, optionally designate a finished-dish image, add appreciation and notes, and leave after the upload is accepted while processing continues.

The implemented entry and inline review are on `/capture`, rendered by `MinimalCapture` and `useCapture`. `/capture/confirm` is a placeholder, not a required step. `CameraView` and `ImageReview` are not used by this route. URL capture, description capture, recipe bundles, and import-report repair are adjacent capabilities, not new work in this spec.

## Requirements and implementation status

Stable IDs are retained from the original baseline. Concrete behavior below replaces generic planning language; unmet quality expectations remain explicit rather than being marked complete.

- **CAP-01-R1 — Entry and eligibility (implemented).** Camera/file selection, gallery selection, and image drag/drop feed an inline photo review. The request carries `X-Family-Member-Id`; the API rejects a missing member ID and the service verifies that the member exists. This establishes member attribution, not proof of cross-household isolation.
- **CAP-01-R2 — Accepted outcome (implemented with launch caveat).** Save submits images, appreciation, optional dish selection, and non-blank notes. A returned recipe ID is registered in the client pending queue and the UI shows queued/processing, not ready. Leaving is supported after acceptance; during upload the UI asks the member to keep the screen open. A 202 proves recipe persistence but does not guarantee successful workflow launch (F2).
- **CAP-01-R3 — Validation and failure (partially satisfied).** The client accepts 1–20 JPEG, PNG, or WebP files, each at most 20 MiB. It validates image count, rating 0–3, and a selected index within the image array, or `-1` for no dish image. The service independently validates input. A failed request retains the mounted component's draft, displays an error, and unlocks Save. Safe retry after an uncertain response and launch-failure recovery are not guaranteed (F2, F3).
- **CAP-01-R4 — Async consistency (partially satisfied).** After acceptance, processing can continue independently of navigation. Session pending entries match `recipe_ready` / `recipe_failed` events by recipe ID. Ready notifications can update the success screen or appear through library notifications. The active capture path has no polling/reconnect reconciliation guarantee and its pending queue is not persisted (F3).
- **CAP-01-R5 — Concurrency (local lock implemented).** A synchronous UI ref lock and busy state prevent repeated Save activation while a photo request is active. Failure releases the lock. Server idempotency and cross-device duplicate prevention are not implemented guarantees.
- **CAP-01-R6 — Accessibility and responsive use (partially satisfied).** Camera/gallery/remove actions have labeled controls and the route uses a phone-sized responsive layout. The retained quality expectation is keyboard-equivalent selection and accessible progress/error announcements. Dish selection currently uses a clickable non-keyboard `div`, and the upload overlay lacks dialog/status semantics and focus management (F4); full accessibility acceptance is not complete.
- **CAP-01-R7 — Privacy and localization (partially verified).** Selected member identity accompanies the upload, and several capture labels use locale resources. The retained quality expectation is localized, family-safe copy with protected diagnostics. Hard-coded English upload/error text remains; this review does not establish household isolation or complete failure-message sanitization (F5). Processing language must not be inferred from interface locale.
- **CAP-01-R8 — Preserved draft behavior (implemented in source).** The first added image is initially the dish selection. Clicking the selected image clears the designation; the wire value is then `-1`. Removal repairs the index or clears it when empty. Appreciation defaults to `0` (unknown), with choices 1–3. Notes are trimmed and omitted when blank. Draft images/metadata belong to `useCapture`, not the pending-recipe store, and are not persisted across reloads.

## Observable states

| State | Current behavior |
|---|---|
| Empty / review | Add photos; choose or clear dish selection; remove photos; set appreciation and notes. |
| Uploading | Save locks immediately; helper text appears and an overlay appears after 800 ms if still pending. |
| Accepted | Register the recipe ID, show queued state and navigation controls; normal capture starts a 10-second Home countdown. |
| Ready event | Matching ready notification provides the recipe name and stops the queued countdown behavior. |
| Invalid input / request error | Display an error, retain the mounted draft, and allow a corrected/retried request. |
| Later workflow failure | A matching SSE event removes the session pending entry and queues a failed notification; no readiness is implied. |
| Reload / missed event / uncertain request | No persisted client draft, durable client pending queue, or exactly-once retry guarantee. |

## Remaining decisions

Cross-device idempotency, durable pending-state recovery, member-switch notification policy, and any strengthened isolation contract require separately scoped decisions. Exact event names and timer values above describe current implementation, not permanent product commitments. These are not prerequisites for recognizing the existing photo-capture capability as implemented.
