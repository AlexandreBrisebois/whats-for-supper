# PDF recipe import preview — consolidated design

Status: implementation authorized for T01–T08; approved transport schemas synchronized in OpenAPI. See implementation-evidence.md for source and check evidence.
Kind: feature specification; design-first, gated cadence; source artifact this design with approved user decisions.
Revision baseline: 9eb64bb06339b25861e45b559284629064c30f7a. [requirements.md](requirements.md) is the current stable acceptance checklist; [tasks.md](tasks.md) is the synchronized plan. [review.md](review.md) separates current findings from historical evidence.
The user selected complete-package implementation T01–T08. OQ-01 architecture is resolved by the separate workflow processor decision; OQ-04 manifest strategy is approved; remaining OQ-02 schema details and OQ-03 resource qualification are assigned to early implementation tasks, resolved before dependent code/release checks; approved wire decisions remain fixed and exact remaining schemas are finalized before dependent tests/code.
Registry: pdf-recipe-import, planned-feature/planned; revision of the existing package. Existing capture/progress/recovery/storage/flags are dependencies, not new frameworks.

## D1 — Capture and acquisition (PDF-R01–05, PDF-R09, PDF-R12–13)

Keep Take photo, Choose photos, Paste a link, Describe a recipe and the recipe-file action in their existing positions; photo remains primary. Enabled ordinary capture extends existing file picker to PDF alongside .txt bundles; dispatch validated formats separately. Preserve direct mode=describe/mode=photo. Family GOTO retains existing photo path and excludes PDFs.

PDF confirmation shows filename, Choose a PDF containing one recipe, Add this recipe to your library, rating/notes and Save recipe. Reuse current photo rating choices/validation (0 unknown, 1–3) and notes trim/omit behavior. No user photo selection accompanies a PDF; no cooked/finished-dish designation (finishedDishImageIndex=-1), Cancel, required title/instructions or extracted-recipe review.

Android installed Chromium PWA PDF share target is required, from any compatible PDF-sharing app. It enters confirmation directly without auto-saving; representative OS cold/warm tests are required. iPhone/iPad uses the existing file picker; native iOS sharing is out of scope. One recipe per PDF, text/scanned/multipage, 20 MiB (20,971,520 bytes) at upload and 10 pages in the processor; no multi-recipe support/detection, page splitting/selection or silent truncation. The API rejects uploads above 20,971,520 bytes before pending-import persistence. The processor fails the whole job above 10 pages without truncating pages.

## D2 — Flag and shared-device state (PDF-R01, PDF-R09, PDF-R11–13)

Reuse FeatureFlagRegistry/FeatureFlagService, PWA provider/store/hook and Settings Preview features. Proposed registry key preview-pdf-recipe-import and environment WFS_FEATURE_PREVIEW_PDF_RECIPE_IMPORT=off|opt-in|on, default off. Register a second definition using existing parser. Use GetSnapshotAsync effective value or a small service method sharing Resolve; unknown key returns false. Do not add another resolver/store/database table. Leave existing single-page-recipe-steps naming migration out of scope.

Resolve established member identity/effective flag before PDF conversion or import persistence; unresolved/failed loading cannot enable Save. Clear enablement on member switch. Gate only PDF selection/confirmation; preserve existing action layout. Acquisition-only flag does not hide saved recipes or stop already accepted image-based jobs. Already accepted PDF workflow jobs and their normal retries continue when acquisition is disabled.

Interruption, leaving capture, unlock or member change resets local file/images/rating/notes and requires restart. Share staging is only foreground delivery; do not carry it through unlock/member change or restore an abandoned token. If a locked Android launch requires unlock, the user unlocks then shares/selects again. No durable draft, discard dialog or 24-hour resume promise. Do not redesign unrelated photo capture state.

Disabled share message: PDF import preview isn’t enabled. This file hasn’t been added. Preview features only where opt-in exists; Choose another way returns ordinary Capture, including no-history launch. No automatic enablement/member switching/submission; a Settings detour resets the capture.

Keep existing session feedback and pending stores; missed feedback and another member seeing completion are accepted. Accepted recipe attribution stays with authenticated submitting member. Keep local active-request Save lock; uncertain retries may duplicate and existing flag/delete controls remain. No server idempotency or durable reconciliation.

## D3 — PDF handoff and proposed wire seam (PDF-R03, PDF-R06, PDF-R08–10)

Dedicated authenticated POST /api/recipes/capture-pdf accepts one PDF plus rating/notes. Keep POST /api/recipes image-only. Approved wire decision: multipart/form-data fields file (exactly one PDF), rating and notes; 202 with {data:{id}} where id is the persisted pending recipe GUID, returned before workflow conversion. Approved immediate upload-request responses: 400 missing file/invalid metadata, 413 above 20 MiB, 415 unsupported file type and 409 preview disabled. Preserve established auth responses; reject these before pending recipe/workflow persistence. Corrupt/encrypted document content and the 10-page check occur in the processor and produce workflow failure, not immediate document-rejection responses. Error-body schemas and field serialization/default details remain OQ-02; the field names and accepted-ID envelope are approved. Conversion/content/page-limit errors occur in the workflow, not as pre-conversion API errors. Specify approved OpenAPI before tests/code; regenerate client and align mocks atomically in implementation.

Approved user decision: conversion is a separate processor in existing recipe-import, before normal image extraction. It runs server-side in the workflow execution host, not synchronously in the capture API request. Package PDFtoImage/native dependencies in the container that executes processors.

Success/failure sequence:
1. API resolves auth/member and effective acquisition flag, validates transport shape and enforces the approved 20 MiB (20,971,520-byte) upload bound before storing a pending import.
2. Store unchanged source PDF, rating/notes and attribution with a pending recipe; start existing recipe-import and return accepted recipe ID. Pending PDF has no finished-dish designation and is not cookable/ready.
3. The separate PDF processor detects a PDF source, validates document/render limits and the approved 10-page ceiling, failing the whole job above it without truncation and renders all pages sequentially. Existing photo imports skip PDF work.
4. On success, persist ordered pages and accurate image metadata, then continue the existing normal extraction/categorization/readiness steps. sourceType remains photos; no direct Gemini PDF input or separate PDF workflow.
5. On temporary failure use existing workflow retries. A failed conversion task appears through existing Settings failure list. Corrupt/encrypted PDFs remain failed for user Retry/Delete; do not automatically delete them or ask for passwords.

Client shows Preparing your PDF… during upload/persistence, registers accepted ID and returns Home without waiting for workflow conversion. Acceptance means persisted pending import, not conversion success/readiness or verified launch. Keep inherited enqueue-failure limitation and honest copy; no new queue/delivery guarantee. Incomplete/interrupted upload still means restart. No Cancel; received workflow work is not cancelled by navigation.

Processor retry must safely rebuild/reuse submission-owned page outputs without duplicate pages or stale image counts; this per-job safety is distinct from accepted duplicate recipes after uncertain client resubmission. Do not expose partial pages as ready. Retain original/metadata throughout failure and remove only temporary attempt residue automatically.

## D4 — Renderer, source storage and lifecycle (PDF-R05–07, PDF-R14)

Approved renderer: PDFtoImage (PDFium rendering, SkiaSharp encoding). Pin a tested version under repository dependency procedure; no specific version yet approved. Retain MIT wrapper notice plus actual PDFium/SkiaSharp/native third-party notices shipped.

Qualify actual production Ubuntu chiseled .NET container and Synology CPU. Bake native libraries/fonts into image, never install at startup. Verify linux-x64 and linux-arm64 separately before claiming either/both. PDFium calls serialize within process; no household-preview parallel rendering. Approved user decision: start fixture qualification at 200 DPI PNG, measuring small-text readability, extraction accuracy, output size and Synology memory use; final resolution/format, dimensions/pixels, memory/disk/time and enforceable native-call timeout are selected/recorded during T02 implementation qualification (OQ-03), then verified before release. Workflow cancellation/timeouts are not proof a synchronous native call stops. Select bounded failure isolation from qualification evidence within approved scope; escalate only if it changes approved behavior, architecture constraints or deployment requirements materially.

Render all pages in order; fail encrypted/corrupt/unsupported/over-page/render-limit documents as workflow tasks, keeping the pending import for Settings recovery; never run extraction on a partial/truncated document. Verify small-text quantities/units and ordered instructions, bilingual/scanned/multipage/cover-page fixtures and phone readability. Multi-recipe fixtures document unsupported behavior; do not infer a new detector.

Accepted PDF is internal artifact (candidate fixed path original/source.pdf) alongside page images via existing storage abstraction; never derive filesystem paths from supplied filename. Exclude it from image count/enumeration, original-image endpoints, reimport image decoding and existing bundle-export image handling. View original displays rendered pages in existing viewer; no PDF viewer/download/export.

Soft delete retains artifacts, restore preserves them, permanent purge removes source/pages, backup/recovery includes source. Temporary cleanup removes only temporary/submission-owned residue, never accepted artifacts or source retained for failed-job retry. D5 defines failed-source ownership; blanket cleanup of every rejected source is not valid.

## D5 — Failed imports / Settings recovery (PDF-R10; OQ-01 resolved)

Approved behavior: submitted rejected/failed PDFs appear in existing Settings import-job recovery with Retry/Delete like links/photos. UI remains FailedCapturesSection, not PDF-specific recovery. Keep sufficient source and rating/notes for supported retry and clean job artifacts on Delete. An invalid source may fail again; no promise Retry makes it valid.

Pinned source evidence:
- CapturesController lists GET /api/captures/failures with {data:{items}}, retries POST /api/captures/failures/{id}/retry with 202 {data:{queued:true}}, clears DELETE /api/captures/failures/{id} with 202 {data:{cleared:true,cleanupCommandId}}.
- CaptureFailureService lists paused url-import/recipe-import workflow instances having failed tasks, derives member from recipe, retries by making failed task Pending, and queues DeleteFailedCaptureResidue maintenance command on clear.
- A PDF rejected before recipe/workflow creation does not meet that predicate; merely adding PDF UI cannot make it appear or become retryable.

OQ-01 resolved by user decision: conversion is a separate processor inside existing recipe-import, with a pending recipe/source already persisted. Its failed task fits the existing workflow failure model; implementation must verify listing/attribution, automatic/manual retries and DeleteFailedCaptureResidue source/page cleanup. Corrupt/encrypted files stay failed until the user acts, exactly as failed recipe imports. Accepted workflow retries continue when the acquisition flag turns off. No effects for auth/disabled API calls or abandoned selections; exact transport rejection schemas remain OQ-02. This replaces synchronous conversion-before-acceptance and eliminates the need to invent a pre-workflow failed-job type.

## D6 — Android share worker / manifest (PDF-R03, PDF-R09, PDF-R13–15)

Proposed target POST /share-target multipart/form-data, existing title/text/url names plus files accepting application/pdf and .pdf. Preserve text-only POST link review, legacy GET /capture and direct URLs. Worker handles only exact same-origin share-target POST; preserve API/SSE bypass and existing GET cache behavior. It validates basic count/bytes and stages under unpredictable token in IndexedDB, awaiting handoff before 303 /capture?share=<token>. No API upload or auto-save in worker; no content/credentials in URLs/logs. IndexedDB failure requires restart/share again, not false success.

Approved policy: keep at most one pending Android-shared PDF, subject to the approved per-file 20 MiB upload bound. A new PDF share replaces the prior unsaved selection; discard its superseded staged source rather than queueing several drafts. Submitted workflow jobs remain independent and are never replaced or cancelled by a new share. Discard pending staged share on abandonment/unlock/member change and after accepted upload. Orphan cleanup TTL and atomic staging/transient storage behavior are established/recorded during T06 (OQ-03) as implementation resource details, not a draft-resume window. Guard handoff cleanup ownership so an older capture cannot remove a newer incoming share.

Manifest is deployment-wide, not member-specific: off retains current link target; opt-in/on advertises multipart PDF target. Stale installed metadata can persist; runtime/API gates still apply. Approved OQ-04 decision: serve one deployment-selected manifest at /manifest.json. Existing pwa/src/app/layout.tsx links that URL and current pwa/public/manifest.json defines GET /capture sharing. Replace static ownership with a single server-served manifest response selected from the PWA deployment environment; do not leave a public file and dynamic route competing at the same URL. Preserve current app id, icons, shortcuts and installation metadata apart from share-target mode. Wire WFS_FEATURE_PREVIEW_PDF_RECIPE_IMPORT with identical deployment mode into PWA and API in Synology compose/.env.example (default off). off retains GET link sharing; opt-in/on advertises multipart PDF target with text/link fields. Member-level enablement stays a foreground/API gate, not manifest logic. Verify cache behavior and installed Android registration refresh; runtime gating handles stale metadata.

## D7 — Household, documentation and deployment (PDF-R12, PDF-R15)

Once ready, imports obey existing shared-library access, search/discovery/voting/planning/cooking eligibility even when another member's PDF flag is off. Import alone casts no vote, changes no plan/groceries and alters no GOTO. Existing readiness rules control pending/failed cookability; no immediate promotion.

Required implementation deliverables:
- docs/user-guide.md: preview opt-in, Android PDF share and iOS picker, one recipe/20 MiB/10 pages, rating/notes, no cooked-dish choice, resets/restart, Settings Retry/Delete and View original. No renderer/API details in user flow.
- docs/flows: PDF user process and data flow covering share/picker → identity/flags/reset → confirmation → source persistence/accepted/Home → separate conversion processor → normal workflow → readiness/Settings recovery, including attribution and cleanup. Link/update affected existing photo/failure flows after revalidating their stale status/sequence details.
- release-template/synology/compose.yaml, .env.example and README.md: PDF mode default off, off/opt-in/on description, API and selected PWA manifest config, installation metadata refresh, renderer packaging and rollout. Apply documented value to deployed .env during deployment; never commit live secrets. No actual deployment files changed by this spec revision.

## D8 — Integration map and verification traceability

| Existing seam / owner | Evidence and proposed effect | Requirements / tasks |
| --- | --- | --- |
| pwa/src/app/(app)/capture/page.tsx; MinimalCapture.tsx; useCapture.ts | Preserve photo layout/form; small PDF confirmation/helper, same metadata semantics, explicit reset and session lock/pending behavior. Original capture observations require T01 pinned revalidation. | PDF-R02/04/08/09/11/12, T01/T05 |
| pwa/src/lib/api/recipes.ts; specs/openapi.yaml; generated client; pwa/e2e/mock-api.ts | Dedicated PDF transport; image-only photo API preserved. Existing files-vs-images photo mismatch is out of scope. Approve exact contract before code/mock/client changes. | PDF-R06/08/10, T03/T04/T05 |
| api/src/RecipeApi/Services/FeatureFlagService.cs; PWA featureFlagStore/provider | Existing registry/Resolve/member Settings opt-in; add PDF definition and API gate, no new framework. | PDF-R01/12/13, T03/T04/T05/T07 |
| RecipeController/RecipeService/ValidationService; RecipeImportService; recipe-import.yaml; storage abstraction | API stores pending PDF; separate recipe-import processor adapts it to ordered images; retained document excluded from image handling. Original main observations are insertion-point evidence, not yet tested on implementation checkout. | PDF-R05–08/14, T01/T02/T04 |
| CapturesController; CaptureFailureService; FailedCapturesSection | Existing failed workflow predicate/retry/delete is verified at baseline; separate PDF workflow processor creates standard failed-task recovery; verify existing retry/delete integration. | PDF-R10, T01/T03/T04/T05 |
| pwa/public/sw.js; manifest.json | Narrow handoff/manifest registration, no client rendering, no unlock draft preservation. Existing /manifest.json linkage is verified; approved deployment-selected single response needs implementation/cache/device qualification. | PDF-R03/09/13/14, T01/T06/T07 |
| docs/user-guide.md; docs/flows; Synology compose/.env.example/README | Required guides/process and deployment default-off/manifest consistency; no existing template claims PDF support. | PDF-R15, T07 |
| Existing household/storage/backup/purge consumers | Preserve eligibility and state; protect source lifecycle and page ordering/counts. | PDF-R07/12, T04/T08 |

Test-before-code acceptance: API real PostgreSQL and faithful workflow factory; feature off no-side-effect checks; source byte retention, ordered readable pages, rating/notes, limits/errors/cleanup and Settings failure retry/delete. PWA units and focused capture/share/settings/original-viewer E2E own schema-compliant mocks with GUID builders. Device OS share registration cannot be established by synthetic navigation.
Named commands/checks and task-to-requirement mapping are in tasks.md. Renderer/resource/device evidence remains required release qualification, not executed results. Open questions in requirements.md retain their IDs; derived artifacts become stale if those source decisions change.

## D9 — Resolve technical follow-ups during implementation

User accepts resolving renderer measurements, final resource limits and exact API schema details during implementation. T01 verifies source; T02 qualifies PDFtoImage/native packaging and records measurable render/timeout/resource values, starting at 200 DPI PNG; T03 finalizes approved field/default/error-body schemas in OpenAPI before dependent tests/code. T06 establishes orphan-cleanup/transient staging limits within the approved single-share policy. These are implementation dependencies, not product-approval checkpoints for routine details.

Keep approved product behavior fixed. If evidence requires a behavior/scope/consequential constraint change, present one proposition and wait; otherwise resolve routine details directly and synchronize spec/contracts/tasks/evidence. Final fixture/resource/NAS/device qualification gates rollout. Missing device access is blocked evidence, never a passed claim, and does not stop independent source implementation. Complete-package kickoff selects the ordered required tasks together; runtime implementation is authorized, with deployment/live .env/rollout excluded.

## T03 exact transport schema (2026-10-02)

OpenAPI now defines PdfCaptureRequest/PdfCaptureAccepted/PdfCaptureError. Exactly one file field; optional decimal rating 0–3 defaults to 0; trim notes and store blank as null. Require .pdf extension and application/pdf MIME (case-insensitive); no document parse/signature rejection at upload. Errors are unwrapped {status,message}; missing/invalid member is 400 and existing household authentication applies. Multipart overhead is separate from the 20,971,520-byte file limit. OQ-03 now has Ubuntu x64 fixture measurements; NAS/phone/extraction qualification remains pending and is not inferred from static source.


## Implemented qualification and ownership details — 2026-10-03

The renderer is a separate `ConvertPdf` processor before `ExtractRecipe`, with one parent-controlled native subprocess inside the existing API container. It validates every page dimension before rendering; renders sequential PNG pages; retains the source; publishes pages/count only on success; and reuses complete pages on Retry. Parent timeout/resource failure explicitly kills and reaps the subprocess before attempt cleanup and gate release. RSS is sampled, not a kernel hard ceiling. The source and render temp/output budgets are explicit positive environment values; the measured x64 evaluation profile is recorded in implementation-evidence.md and scripts/pdf/qualification-x64.md. No target-NAS profile is inferred.

Foreground draft ownership uses member/navigation/delivery versions and selection generations. Real unmount, hidden document, member change and capture-context navigation invalidate in-flight delivery; React effect replay does not consume the same share twice. A new staged token replaces the old slot atomically; token-matched cleanup cannot erase a newer share. Staging expiry is ten minutes logically; physical cleanup is opportunistic on worker activation, foreground startup/pageshow/minute timer and token access. An unopened app may retain one bounded expired slot until the next lifecycle cleanup. No worker rendering/API upload or unlock restoration is added.

Ordinary extraction receives every numbered page in order. Its image attachment MIME now reflects PNG/WebP byte signatures instead of always declaring JPEG; JPEG behavior and the extraction prompt remain unchanged. Source PDF bytes are excluded from image attachments, original-image endpoints and existing bundle image handling.

Internal PDF metadata carries optional `recipe.info.isReady`, initialized false at acceptance and set true only by ordinary RecipeReady (or synchronized from the database during backup). PDF restore uses this recorded readiness rather than treating a nonblank extracted name as completion. Missing readiness on a retained PDF is conservatively pending. Photo metadata/readiness conventions and public OpenAPI remain unchanged; this is an internal JSON field, with no database migration or new API resource.
