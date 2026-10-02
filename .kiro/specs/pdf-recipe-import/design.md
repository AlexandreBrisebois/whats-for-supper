# PDF recipe import preview — proposed specification

Status: proposed design; no application implementation performed. Specification branch: `codex/pdf-recipe-import-preview`, created from `codex/create-new-branch-for-feature-flags`.
Repository: AlexandreBrisebois/whats-for-supper, main, inspected through GitHub on 2026-10-01. Reads were not pinned to one commit. Search results referenced 44dcd91dd987b46f3612c6942db886e82fb75613; revalidate against the implementation checkout.

Branch correction: feature-flag implementation was subsequently inspected on `codex/create-new-branch-for-feature-flags`. PDF implementation should target that branch or a branch containing it. Capture/workflow findings above came from main and must be revalidated on that implementation base. Feature flags are existing code on codex, not a new framework dependency.

## Accepted preview tradeoffs

User decision, 2026-10-01: completion feedback is best-effort and may be lost when the app closes or an event is missed. Members can find completed recipes by browsing when they are ready. Durable client pending state, reconnect reconciliation, and recovery of missed completion notifications are not required for this preview.

Retries after an uncertain response may create duplicate recipes. Members can identify, flag and delete duplicates using existing controls. Server idempotency, cross-tab duplicate prevention and exactly-once submission are not required. Retain the local submission lock to prevent accidental repeated taps during an active request. Do not add duplicate management UI to this slice.

These decisions accept missing feedback and duplicate results; they do not change extraction correctness or justify saying a recipe is ready before it is. Workflow-launch errors remain an inherited limitation of the reused creation path, rather than a mandate for a new durable queue/recovery system.

## Outcome and scope

Mom can select a recipe PDF or share it from another app, confirm the file, and save it without choosing an extraction method. PDF import is a preview, off by default, with server-side enforcement. Support one PDF containing one recipe per submission, including scanned PDFs and a recipe spanning multiple pages. Do not silently truncate pages or split a cookbook into recipes.

Exclude cookbook splitting, page selection/editor, password entry, native mobile wrappers, PDF source-type migrations, original-PDF export, and a general capture rewrite. Reject encrypted, malformed, over-limit and unsupported documents with a next step. Multiple-recipe detection is not guaranteed by the existing extraction pipeline; validate that limitation with fixtures before describing such documents as supported.

## Observed seams

| Source | Current behavior | Proposed delta |
| --- | --- | --- |
| pwa/src/app/(app)/capture/page.tsx | GET url/title/text parameters reach MinimalCapture | Resolve an opaque staged-share token as an additional entry path |
| pwa/src/components/capture/MinimalCapture.tsx | Photo, link, description and .txt recipe-bundle paths in one large component | One preview boundary plus small PDF confirmation component; keep processing logic out of this component |
| pwa/src/hooks/useCapture.ts | Images only; sends files, rating, finishedDishImageIndex and notes | Preserve image validation and photo submission |
| pwa/src/lib/api/recipes.ts | Multipart photo helper uses native fetch | Dedicated PDF multipart helper using the same authenticated adapter conventions |
| pwa/public/manifest.json | GET share target at /capture; title/text/url only | Preview deployment advertises multipart POST share target with PDF files and existing text fields |
| pwa/public/sw.js | Ignores every non-GET request and API requests | Narrow handler for same-origin share-target POST only; preserve GET caching and API/SSE bypass |
| api/src/RecipeApi/Controllers/RecipeController.cs | POST /api/recipes returns 202 id | Separate flag-checked PDF operation; existing photo route remains image-only |
| api/src/RecipeApi/Services/RecipeService.cs | Validates images, persists originals/recipe.info, recipe and search sidecar; triggers indexing and recipe-import | Feed rendered page images through the existing creation path; finishedDishImageIndex=-1 and rating=0 |
| api/src/RecipeApi/Services/ValidationService.cs | JPEG/PNG/WebP only, 20 MB/image, 20 images | Preserve these rules; independent PDF validation and conversion limits |
| api/src/RecipeApi/Services/RecipeImportService.cs | Retries recipe-import for stored images | Reuse without adding a PDF workflow |
| api/src/RecipeApi/Workflows/recipe-import.yaml | ExtractRecipe → GenerateHero → SyncRecipe → categorization → RecipeReady → CompleteRecipeImportReport | Preserve workflow and downstream processors |
| specs/openapi.yaml | Authoritative API contract | Add explicit PDF operation and error schemas; regenerate client and sync mocks |
| api/src/RecipeApi/Services/FeatureFlagService.cs (codex branch) | FeatureFlagRegistry, startup off/opt-in/on parsing, member overrides and shared Resolve logic | Add one PDF registry definition; reuse resolution at the PDF API boundary |
| pwa/src/store/featureFlagStore.ts (codex branch) | Snapshot, confirmed mutations, member-version guards and useFeatureFlag | Reuse the existing hook; no PDF-specific flag store |
| pwa/src/components/featureFlags/FeatureFlagProvider.tsx (codex branch) | Mounted in authenticated app layout; loads on member change and focus | Reuse provider and existing Preview features settings |

The current photo contract names its binary array `images`, while the hook/helper and controller use `files`. Record this existing mismatch for contract review; do not fold a photo-route rename into PDF implementation. The PDF operation must use one explicit field name end to end.

## Mom's interaction

With preview disabled, render the current capture experience unchanged. With preview enabled, retain Take photo as the primary action and Choose photos as the familiar secondary action. Keep Paste a link visible. Move Describe a recipe and Import recipe file into a compact, accessible Other ways disclosure; label the latter Choose recipe file and accept both existing .txt bundles and PDFs. Dispatch by validated format, never send a PDF through the JSON bundle parser. This is the entire capture layout change for the preview.

Selecting a PDF opens a compact confirmation: filename, “Add this recipe to your library”, Save recipe and Cancel. No required title, rating, notes, dish-photo selection or instructions. PDF and .txt bundle confirmations remain separate because the bundle already contains a structured recipe.

Sharing a PDF opens that same confirmation directly, bypassing the capture chooser. Save uploads/converts the file with honest progress (“Preparing your PDF…”). After the API returns an accepted recipe ID, add it to the existing pending capture store and navigate to Home immediately. Existing ready/failure feedback is best-effort while the session remains active. Members can browse for the recipe when ready; no completion notification after app closure is promised. Never claim that parsing or upload means the recipe is ready.

Cancellation makes no API mutation. Choosing a PDF must not discard an existing photo draft. Return to the prior capture state on cancel. Retry retains the file while the page remains open; a lost or expired staged file offers Choose file again.

## Preview flag and rollout

Proposed spec slug: `pdf-recipe-import`. Registry key: `preview-pdf-recipe-import`; environment mode: `WFS_FEATURE_PREVIEW_PDF_RECIPE_IMPORT=off|opt-in|on`, default off. This follows the codex branch's approved preview naming convention. Owner: recipe capture. Member-facing name: “Recipes from PDFs”; description: “Save a recipe from a PDF file.” Reuse the existing Settings → Preview features mechanism, with no onboarding prompt or nagging on Capture. Add the definition to FeatureFlagRegistry in FeatureFlagService.cs and the environment setting to the existing deployment configuration. No new flag endpoint, provider, database table or settings redesign is required.

The current registry hardcodes one definition; minimally construct/register a second definition using its existing Create parser. FeatureFlagService currently offers GetSnapshotAsync and static Resolve, but no dedicated per-key effective-state method. For the first backend consumer, reuse the snapshot result's enabled value or add a small IsEnabledAsync(memberId, key) method inside this service using the same registry/override/Resolve logic; unknown keys return false. Do not introduce the separate FeatureFlagResolver class shown in the design diagram unless needed by approved implementation scope.

The existing proving feature still uses single-page-recipe-steps at runtime; its preview naming migration is a separate task. Leave it outside the PDF change. Verify localized PDF display copy through the actual settings consumer rather than assuming display-name keys exist in the registry (current definitions hold strings).

Resolve the effective flag on the API using the established member identity. Gate the entire new capture layout/entry at one PWA boundary and gate the PDF API before conversion or persistence. Unresolved or failed flag loading defaults to disabled. Clear flags on member switch. Turning the preview off blocks new PDF submissions but does not hide saved recipes or stop accepted image-based jobs/retries.

PWA installation metadata is not a live per-member toggle. Use deployment-level manifest selection: off keeps the existing GET link target; opt-in/on advertises the multipart target. Choose a single manifest implementation rather than maintaining conflicting static and dynamic manifests. Confirm the current manifest linkage and serving strategy before coding. Installed apps may retain old metadata until updated; document that delay. Runtime receiving and API checks remain necessary for stale registrations.

The service worker cannot decide member flags or authorization. It stages an incoming share, then the foreground app resolves identity and feature state. Disabled incoming PDF: “PDF import preview isn't enabled”, with Back and Choose another way; do not silently lose the staged file. Allow visiting Preview features where available, without enabling it automatically. Explicitly discard or expire staged content afterward.

## PDF processing: retained source and page-image adapter

### Approved renderer: PDFtoImage

The user approved [PDFtoImage](https://github.com/sungaila/PDFtoImage), which uses PDFium for PDF rendering and SkiaSharp for image encoding. Use it in the dedicated API conversion service. Pin a tested package version through the repository dependency procedure; no particular version is approved by this design.

PDFtoImage itself is free to use under its [MIT license](https://github.com/sungaila/PDFtoImage/blob/master/LICENSE), including modification and commercial use. Retain its copyright/license notice when distributing it. Include the applicable PDFium, SkiaSharp and bundled third-party notices for the actual dependency/native binaries shipped in the container; the wrapper's license is not a substitute for those notices.

Qualification must use the actual production Ubuntu chiseled .NET container on the Synology CPU architecture. Package the required native libraries and any fonts during the image build; do not depend on installation at container startup. Verify both linux-x64 and linux-arm64 before claiming both architectures supported. A PDFtoImage library compatibility result alone does not establish production-container compatibility.

Render and persist one page at a time, disposing each bitmap promptly. PDFtoImage serializes PDFium calls within a process; do not introduce parallel rendering for this household preview. Start fixture evaluation at 200 DPI PNG and choose final settings based on small-text readability, scanned recipes, output bytes and NAS memory use. This DPI is a starting candidate, not an untested fixed acceptance guarantee.

Acceptance includes renderer startup/load, ordered page output, readable View original, unchanged retained PDF bytes, invalid/encrypted document errors, resource limits and temporary-file cleanup. Verify enforceable timeout behavior: cancellation of an API request must not be assumed to interrupt a synchronous native rendering call. If process isolation is necessary to meet the approved limits, record that bounded packaging/execution change explicitly.

### Execution boundary: API-side conversion

PDF-to-image conversion runs server-side in the API process, through a dedicated PDF conversion service invoked by POST /api/recipes/capture-pdf. The browser and service worker upload/stage the PDF only; neither renders pages nor calls Gemini. The API deployment packages the renderer and its runtime dependencies.

Request sequence:

1. Resolve household/member identity and enforce the effective PDF preview flag.
2. Validate the uploaded document and enforce input/conversion resource limits.
3. Render every supported page server-side into ordered image files. Conversion failure rejects the document without accepting a recipe.
4. Persist the unchanged source PDF with the recipe's original page images through the storage abstraction.
5. Feed the generated images into the existing recipe creation and recipe-import workflow, with no finished-dish page designation.
6. Return the accepted recipe ID using the established API response convention. The PWA returns Home; AI extraction and subsequent recipe processing run in the existing background workflow.

Conversion completes during the API upload request, before acceptance; AI extraction remains asynchronous. Accepted-ID responses establish persistence, not completed extraction or verified workflow launch. Client progress covers upload and API preparation. Apply the previously specified renderer timeout/resource limits; if bounded conversion cannot fit this request boundary, revise the design explicitly rather than silently moving conversion into the browser or another workflow.

View original uses the stored page images through the existing original-image endpoints. The retained source PDF is a separate artifact and does not count as an image.


User decision: retain the original PDF with the recipe, convert its pages to ordered images, and feed those images through the normal photo-import flow. View original reads the stored page images using the existing image viewer. Direct PDF submission to Gemini is not the selected approach. Model selection remains governed by the normal extraction configuration.


Propose POST /api/recipes/capture-pdf, authenticated, multipart field `file`, exactly one PDF; success 202 using the existing id response envelope convention. Errors distinguish invalid document (400), disabled preview (409), byte limit (413), and unsupported format (415); normal household authentication responses still apply. Specify exact schemas in OpenAPI before tests and implementation.

The adapter checks actual content, not filename/MIME alone, renders all pages to bounded JPEG/PNG images in order, and calls the current image-based recipe creation path once. Default finishedDishImageIndex=-1 prevents a recipe page from being treated as the finished dish. Text PDFs are rendered too: one ingestion path supports text and scans without new extraction modes. Stored rendered pages remain available for original-image display and reimport. Retain the accepted source PDF unchanged alongside the recipe's original page images, under a fixed internal filename such as original/source.pdf using the existing storage abstraction. Do not infer image count from all files in that directory: source.pdf is a document artifact, not an image. Preserve page order and readable resolution through the existing original-image endpoints/viewer. Source retention does not require a new PDF viewer or download action for this preview.

Candidate preview limits: 20 MB input and 10 pages, plus bounded rendered dimensions, total pixels, memory, temporary disk and conversion time. These are proposed product/resource limits, not existing guarantees. Select exact runtime limits and qualify the approved PDFtoImage dependency through a fixture/performance spike on both supported container architectures. Validate output against existing image constraints before calling CreateRecipe. Reject the entire document before recipe persistence when validation/conversion fails; clean temporary conversion files on every exit. After successful conversion, retain the source PDF and generated images with the accepted recipe. On failed acceptance, clean only artifacts created by this submission or account for them under the existing recovery convention. Never delete an accepted recipe's retained PDF during temporary-file cleanup. Avoid filename-derived filesystem paths.

The renderer is the new dependency and operational risk. Verify supported deployment images/architectures, license, packaging and failure isolation. Do not assume the current image library can render PDFs. If rendering cannot fit a bounded upload request, stop and revise the design to a separately approved asynchronous source-storage slice rather than introducing a new workflow unnoticed.

Existing CreateRecipe logs workflow enqueue failures yet returns an ID. Preserve this inherited limitation in the adapter scope and record it in tests/evidence; 202 establishes acceptance/persistence, not readiness or guaranteed workflow launch. Do not add durable queue/recovery infrastructure for this preview. Use acceptance copy that does not claim the recipe is ready or that launch was verified.

Extend source storage and its lifecycle to include the retained PDF: normal soft deletion retains recipe artifacts, restoration preserves them, and permanent purge removes both the source PDF and page images. Verify backup/recovery includes the PDF and that image enumeration, original-image view, reimport and existing bundle export do not attempt to decode it as an image. No PDF-specific recipe columns, new workflow IDs, extraction prompts, summary queries or sourceType enum are required by this design. PDFs become page-image imports; recipe sourceType remains photos. Add PDF provenance later only if it becomes an explicit requirement.

## Receiving a shared file

Change the advertised target to POST /share-target with multipart/form-data, preserving title/text/url names and adding a files field accepting application/pdf and .pdf. Handle text-only POST shares by navigating to the existing link review path; preserve legacy GET /capture shares and direct URLs.

The worker intercepts only this exact same-origin POST, applies basic file/count/size checks and stages the file in IndexedDB under an unpredictable token. Await staging before redirecting with 303 to /capture?share=<token>. Preserve text fields with the staged record. Do not upload to the API from the worker or auto-save on launch. Staging needs a TTL, bounded total storage and cleanup after success/cancel/expiry. IndexedDB failure must produce a recoverable page, not a success redirect. Do not put document bytes, recipe content or member credentials in URLs/logs.

Keep the staged file across household unlock/member selection; attach it to a recipe only after confirmed member identity and Save. Clear it after accepted upload. Submission locking prevents double taps; importing on Save rather than an effect prevents reload/StrictMode duplicate submissions. An ambiguous network failure may produce a duplicate on retry; this is an accepted preview tradeoff. Reuse existing flag/delete controls for duplicates and do not add a server idempotency contract.

Installed Android Chromium PWA sharing is the primary qualification target. iPhone/iPad PWA file share targets are not a supported equivalent; retain the file picker as the no-training fallback. A native iOS share extension would be a separate project. Verify Mom's device before treating share-target support as the main delivery path.

## Mère-Designer review and reflection

Applied .agents/prompts/mere-designer.md directly; this is a review lens, not a separate persona or approval gate.

1. A fifth equally prominent capture option makes Mom scan technical source types. Small correction: keep camera/photos/link familiar, group occasional file/description actions under Other ways. Test discovery of that label with Mom; do not hide her most frequent action on an assumption.
2. Share → capture chooser asks her to repeat a decision she already made. Small correction: open file confirmation directly. One Save action makes the consequence visible without training.
3. A mandatory extracted-recipe review or processing countdown demands attention during interruptions. Small correction: confirm the file, then return Home after acceptance and use existing background feedback. Current capture has a ten-second countdown; leave that legacy behavior outside this preview slice.
4. Rating, notes and dish-photo choices are unrelated work at import time. Omit them from PDF confirmation; do not redesign existing photo forms.
5. “Imported” before extraction finishes creates false certainty. Use Preparing, then queued/ready/failed states backed by actual outcomes. Failures need Retry or Choose another file.
6. A share target that works only on the son's test device creates support work. Qualify Mom's actual phone; keep Choose recipe file available, and avoid presenting installation instructions as a routine capture step.

## Test-first acceptance and regression scope

Write contract and tests before runtime code, using valid GUID builders and schema-compliant mocks. Extend pwa/e2e/capture-flow.spec.ts for the affected entry points; keep existing assertions in off fixtures rather than globally rewriting them for the preview layout.

| Boundary | Necessary evidence |
| --- | --- |
| Flag | Off hides PDF entry and rejects direct API calls with no conversion/storage/DB/workflow effects; loading failure defaults off; member switch clears prior enablement; on/opt-in behave as specified |
| Conversion | Text and scanned recipe fixtures, ordered multipage recipe, encrypted/corrupt/non-PDF/empty/oversized/over-page-limit documents; bounded resources, timeout and temporary-file cleanup; unchanged retained PDF bytes, readable ordered page images and no recipe on rejected conversion |
| API/persistence | Real PostgreSQL and faithful workflow factory: one recipe/search sidecar per successful request, persisted originals/info, correct member, no finished-dish page, import workflow when launch succeeds; document inherited enqueue-failure behavior |
| UI | Picker cancel, PDF dispatch versus .txt bundle, confirmation, local submission lock, upload failure/retry, accepted-ID requirement, pending-store/Home navigation and existing session feedback; completed recipe remains browseable without notification |
| Share receiver | Multipart PDF with app open/closed, text/url POST, existing GET links, missing/extra/invalid files, storage failure/expiry, refresh, auth/member selection, disabled preview, no submission on launch |
| Legacy regression | Photo upload/limits and feedback, link/manual review and errors, describe/GOTO, .txt bundle acceptance, duplicate behavior, original-image reimport, ready/failure notifications, API/SSE bypass in worker; retained PDF is excluded from image enumeration, preserved through backup/restore and soft deletion, and removed on permanent purge |
| Device | Actual installed Android OS share sheet cold/warm launches and manifest update; actual iOS picker fallback. Synthetic Playwright navigation alone cannot establish OS registration |

Run affected API tests, PWA unit tests, focused capture/share E2E, typecheck/lint, contract/client/mock parity checks and a production PWA build. Renderer packaging and real-device checks are explicit release requirements. No tests were run during this read-only design investigation.

## Implementation sequence and stopping points

1. Revalidate source at a pinned checkout containing codex/create-new-branch-for-feature-flags; confirm manifest serving. Reuse its flag implementation. Resolve Mom's platform and conversion limits; qualify the approved PDFtoImage library. Preserve existing enqueue semantics and the accepted duplicate-on-retry tradeoff.
2. Approve the PDF contract. Write API conversion/persistence/flag tests before adding the renderer adapter, registry definition and endpoint; reuse current recipe creation and workflow.
3. Write UI tests, then add the PDF helper, confirmation and one preview capture boundary. Keep legacy capture intact with flag off.
4. Write worker/manifest tests, then add bounded staging and multipart share handling, preserving text/link shares. Qualify real devices before advertising support.
5. Execute scoped checks; record passed/failed/blocked/not-run evidence. Roll out off → opt-in → on only after qualification. Emergency off blocks new imports; accepted jobs continue.

Graduation criterion: confirmed picker/share success on the supported device matrix, fixture extraction quality accepted, reliable retry/cleanup, and household feedback showing Mom completes imports unaided. Removal task: remove preview boundary/legacy layout, registry key/environment mode/member overrides, manifest mode branching and obsolete flag tests; retain PDF adapter/share acceptance tests.
