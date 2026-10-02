# PDF recipe import preview — consolidated design

Status: proposed technical design with approved product scope. No application implementation or OpenAPI change.
Kind: feature specification; design-first, gated cadence; source artifact this design with approved user decisions.
Revision baseline: 9eb64bb06339b25861e45b559284629064c30f7a. [requirements.md](requirements.md) is the current stable acceptance checklist; [tasks.md](tasks.md) is the synchronized plan. [review.md](review.md) separates current findings from historical evidence.
Stop before implementation. Open questions OQ-01–04 block affected tasks; consolidation is not approval of a wire contract or unresolved architecture.
Registry: pdf-recipe-import, planned-feature/planned; revision of the existing package. Existing capture/progress/recovery/storage/flags are dependencies, not new frameworks.

## D1 — Capture and acquisition (PDF-R01–05, PDF-R09, PDF-R12–13)

Keep Take photo, Choose photos, Paste a link, Describe a recipe and the recipe-file action in their existing positions; photo remains primary. Enabled ordinary capture extends existing file picker to PDF alongside .txt bundles; dispatch validated formats separately. Preserve direct mode=describe/mode=photo. Family GOTO retains existing photo path and excludes PDFs.

PDF confirmation shows filename, Choose a PDF containing one recipe, Add this recipe to your library, rating/notes and Save recipe. Reuse current photo rating choices/validation (0 unknown, 1–3) and notes trim/omit behavior. No user photo selection accompanies a PDF; no cooked/finished-dish designation (finishedDishImageIndex=-1), Cancel, required title/instructions or extracted-recipe review.

Android installed Chromium PWA PDF share target is required, from any compatible PDF-sharing app. It enters confirmation directly without auto-saving; representative OS cold/warm tests are required. iPhone/iPad uses the existing file picker; native iOS sharing is out of scope. One recipe per PDF, text/scanned/multipage, 20 MB/10 pages; no multi-recipe support/detection, page splitting/selection or silent truncation. Exact bytes remain OQ-02.

## D2 — Flag and shared-device state (PDF-R01, PDF-R09, PDF-R11–13)

Reuse FeatureFlagRegistry/FeatureFlagService, PWA provider/store/hook and Settings Preview features. Proposed registry key preview-pdf-recipe-import and environment WFS_FEATURE_PREVIEW_PDF_RECIPE_IMPORT=off|opt-in|on, default off. Register a second definition using existing parser. Use GetSnapshotAsync effective value or a small service method sharing Resolve; unknown key returns false. Do not add another resolver/store/database table. Leave existing single-page-recipe-steps naming migration out of scope.

Resolve established member identity/effective flag before PDF conversion or import persistence; unresolved/failed loading cannot enable Save. Clear enablement on member switch. Gate only PDF selection/confirmation; preserve existing action layout. Acquisition-only flag does not hide saved recipes or stop already accepted image-based jobs. Retry of pre-conversion failed sources after disabling remains OQ-01.

Interruption, leaving capture, unlock or member change resets local file/images/rating/notes and requires restart. Share staging is only foreground delivery; do not carry it through unlock/member change or restore an abandoned token. If a locked Android launch requires unlock, the user unlocks then shares/selects again. No durable draft, discard dialog or 24-hour resume promise. Do not redesign unrelated photo capture state.

Disabled share message: PDF import preview isn’t enabled. This file hasn’t been added. Preview features only where opt-in exists; Choose another way returns ordinary Capture, including no-history launch. No automatic enablement/member switching/submission; a Settings detour resets the capture.

Keep existing session feedback and pending stores; missed feedback and another member seeing completion are accepted. Accepted recipe attribution stays with authenticated submitting member. Keep local active-request Save lock; uncertain retries may duplicate and existing flag/delete controls remain. No server idempotency or durable reconciliation.

## D3 — PDF handoff and proposed wire seam (PDF-R03, PDF-R06, PDF-R08–10)

Dedicated authenticated POST /api/recipes/capture-pdf accepts one PDF plus rating/notes. Keep POST /api/recipes image-only. Proposed multipart field file, rating and notes; proposed 202 accepted-ID convention. Invalid document 400, disabled 409, bytes 413 and unsupported format 415 were earlier proposals, not approved schemas. Page-limit/error/failure-job representation and exact envelope remain OQ-01/OQ-02. Specify approved OpenAPI before tests/code; regenerate client and align mocks atomically in implementation.

Proposed success sequence:
1. Resolve member/auth and effective PDF flag.
2. Validate actual content, not extension/MIME alone; enforce complete-document input/render budgets.
3. API-side PDFtoImage renders all supported pages sequentially, disposing each bitmap promptly. Conversion failure accepts no recipe; route submitted failures to existing Settings recovery through the still-unresolved D5 seam.
4. Retain unchanged source and ordered page images via storage abstraction, preserving rating/notes and no dish designation.
5. Reuse existing recipe creation/search sidecar and recipe-import workflow once; sourceType remains photos. Normal extraction/model configuration applies; neither browser nor worker renders or calls Gemini.
6. Return accepted recipe ID after conversion/persistence. Existing workflow runs background extraction/categorization/readiness.

Client shows Preparing your PDF… during upload/server preparation, then registers accepted ID and returns Home. Reuse photo progress/feedback conventions without a new PDF countdown/screen; do not claim literal parity with legacy photo countdown. Acceptance is persistence, not ready or verified launch. Existing CreateRecipe enqueue failure remains an inherited limitation, not authorization for a durable queue.
No Cancel action. Save tap or incomplete upload is not guaranteed receipt; interruption means restart. Navigation does not request cancellation of received server work. No new durable upload or cancellation contract.

## D4 — Renderer, source storage and lifecycle (PDF-R05–07, PDF-R14)

Approved renderer: PDFtoImage (PDFium rendering, SkiaSharp encoding). Pin a tested version under repository dependency procedure; no specific version yet approved. Retain MIT wrapper notice plus actual PDFium/SkiaSharp/native third-party notices shipped.

Qualify actual production Ubuntu chiseled .NET container and Synology CPU. Bake native libraries/fonts into image, never install at startup. Verify linux-x64 and linux-arm64 separately before claiming either/both. PDFium calls serialize within process; no household-preview parallel rendering. Start fixture evaluation at 200 DPI PNG; final resolution/format, dimensions/pixels, memory/disk/time and enforceable native-call timeout remain OQ-03. Request cancellation is not proof a synchronous native call stops. Any needed process isolation requires an explicit bounded decision.

Render all pages in order; reject encrypted/corrupt/unsupported/over-limit PDFs without accepting a recipe. Verify small-text quantities/units and ordered instructions, bilingual/scanned/multipage/cover-page fixtures and phone readability. Multi-recipe fixtures document unsupported behavior; do not infer a new detector.

Accepted PDF is internal artifact (candidate fixed path original/source.pdf) alongside page images via existing storage abstraction; never derive filesystem paths from supplied filename. Exclude it from image count/enumeration, original-image endpoints, reimport image decoding and existing bundle-export image handling. View original displays rendered pages in existing viewer; no PDF viewer/download/export.

Soft delete retains artifacts, restore preserves them, permanent purge removes source/pages, backup/recovery includes source. Temporary cleanup removes only temporary/submission-owned residue, never accepted artifacts or source retained for failed-job retry. D5 defines failed-source ownership; blanket cleanup of every rejected source is not valid.

## D5 — Failed imports / Settings recovery (PDF-R10; OQ-01)

Approved behavior: submitted rejected/failed PDFs appear in existing Settings import-job recovery with Retry/Delete like links/photos. UI remains FailedCapturesSection, not PDF-specific recovery. Keep sufficient source and rating/notes for supported retry and clean job artifacts on Delete. An invalid source may fail again; no promise Retry makes it valid.

Pinned source evidence:
- CapturesController lists GET /api/captures/failures with {data:{items}}, retries POST /api/captures/failures/{id}/retry with 202 {data:{queued:true}}, clears DELETE /api/captures/failures/{id} with 202 {data:{cleared:true,cleanupCommandId}}.
- CaptureFailureService lists paused url-import/recipe-import workflow instances having failed tasks, derives member from recipe, retries by making failed task Pending, and queues DeleteFailedCaptureResidue maintenance command on clear.
- A PDF rejected before recipe/workflow creation does not meet that predicate; merely adding PDF UI cannot make it appear or become retryable.

OQ-01 is an architecture gate: define failed-job creation, member/source ownership, retry execution, cleanup and flag-off retry while preserving API conversion and no dedicated PDF workflow. Do not invent a workflow record/schema or silently move conversion to a new asynchronous workflow during consolidation. No persistence effect for disabled/auth-rejected calls or abandoned/incomplete submissions; define submitted content failure separately. T01/T03 require seam approval before execution.

## D6 — Android share worker / manifest (PDF-R03, PDF-R09, PDF-R13–15)

Proposed target POST /share-target multipart/form-data, existing title/text/url names plus files accepting application/pdf and .pdf. Preserve text-only POST link review, legacy GET /capture and direct URLs. Worker handles only exact same-origin share-target POST; preserve API/SSE bypass and existing GET cache behavior. It validates basic count/bytes and stages under unpredictable token in IndexedDB, awaiting handoff before 303 /capture?share=<token>. No API upload or auto-save in worker; no content/credentials in URLs/logs. IndexedDB failure requires restart/share again, not false success.

Discard staged share on abandonment/unlock/member change, after accepted upload, and under bounded orphan cleanup. Storage cap/TTL remains OQ-03 as implementation resource bound, not recoverable draft window. Guard handoff cleanup ownership so an older capture cannot remove a newer incoming share.

Manifest is deployment-wide, not member-specific: off retains current link target; opt-in/on advertises multipart PDF target. Stale installed metadata can persist; runtime/API gates still apply. OQ-04 must verify linkage/serving and select one manifest strategy, consistent with Synology config; no simultaneous conflicting static/dynamic registrations.

## D7 — Household, documentation and deployment (PDF-R12, PDF-R15)

Once ready, imports obey existing shared-library access, search/discovery/voting/planning/cooking eligibility even when another member's PDF flag is off. Import alone casts no vote, changes no plan/groceries and alters no GOTO. Existing readiness rules control pending/failed cookability; no immediate promotion.

Required implementation deliverables:
- docs/user-guide.md: preview opt-in, Android PDF share and iOS picker, one recipe/20 MB/10 pages, rating/notes, no cooked-dish choice, resets/restart, Settings Retry/Delete and View original. No renderer/API details in user flow.
- docs/flows: PDF user process and data flow covering share/picker → identity/flags/reset → confirmation → API conversion/source retention → normal workflow → accepted/Home → readiness/Settings recovery, including attribution and cleanup. Link/update affected existing photo/failure flows after revalidating their stale status/sequence details.
- release-template/synology/compose.yaml, .env.example and README.md: PDF mode default off, off/opt-in/on description, API and selected PWA manifest config, installation metadata refresh, renderer packaging and rollout. Apply documented value to deployed .env during deployment; never commit live secrets. No actual deployment files changed by this spec revision.

## D8 — Integration map and verification traceability

| Existing seam / owner | Evidence and proposed effect | Requirements / tasks |
| --- | --- | --- |
| pwa/src/app/(app)/capture/page.tsx; MinimalCapture.tsx; useCapture.ts | Preserve photo layout/form; small PDF confirmation/helper, same metadata semantics, explicit reset and session lock/pending behavior. Original capture observations require T01 pinned revalidation. | PDF-R02/04/08/09/11/12, T01/T05 |
| pwa/src/lib/api/recipes.ts; specs/openapi.yaml; generated client; pwa/e2e/mock-api.ts | Dedicated PDF transport; image-only photo API preserved. Existing files-vs-images photo mismatch is out of scope. Approve exact contract before code/mock/client changes. | PDF-R06/08/10, T03/T04/T05 |
| api/src/RecipeApi/Services/FeatureFlagService.cs; PWA featureFlagStore/provider | Existing registry/Resolve/member Settings opt-in; add PDF definition and API gate, no new framework. | PDF-R01/12/13, T03/T04/T05/T07 |
| RecipeController/RecipeService/ValidationService; RecipeImportService; recipe-import.yaml; storage abstraction | New API renderer/service adapts to ordered images; retained document excluded from image handling. Original main observations are insertion-point evidence, not yet tested on implementation checkout. | PDF-R05–08/14, T01/T02/T04 |
| CapturesController; CaptureFailureService; FailedCapturesSection | Existing failed workflow predicate/retry/delete is verified at baseline; pre-workflow PDF rejection remains OQ-01. | PDF-R10, T01/T03/T04/T05 |
| pwa/public/sw.js; manifest.json | Narrow handoff/manifest registration, no client rendering, no unlock draft preservation. Actual linkage needs OQ-04. | PDF-R03/09/13/14, T01/T06/T07 |
| docs/user-guide.md; docs/flows; Synology compose/.env.example/README | Required guides/process and deployment default-off/manifest consistency; no existing template claims PDF support. | PDF-R15, T07 |
| Existing household/storage/backup/purge consumers | Preserve eligibility and state; protect source lifecycle and page ordering/counts. | PDF-R07/12, T04/T08 |

Test-before-code acceptance: API real PostgreSQL and faithful workflow factory; feature off no-side-effect checks; source byte retention, ordered readable pages, rating/notes, limits/errors/cleanup and Settings failure retry/delete. PWA units and focused capture/share/settings/original-viewer E2E own schema-compliant mocks with GUID builders. Device OS share registration cannot be established by synthetic navigation.
Named commands/checks and task-to-requirement mapping are in tasks.md. Renderer/resource/device evidence remains required release qualification, not executed results. Open questions in requirements.md retain their IDs; derived artifacts become stale if those source decisions change.
