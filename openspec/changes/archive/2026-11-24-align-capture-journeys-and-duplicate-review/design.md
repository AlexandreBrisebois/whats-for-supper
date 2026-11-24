# Design

## Context and Existing Ownership

Refer to `proposal.md` for motivation and visual reference scope (`docs/visual-language/designs/capture-visual-design-suite.svg` and `docs/visual-language/designs/capture-journeys.svg`). Inspecting the live codebase establishes the following authoritative owners and constraints:

- **Capture shell & routing (`pwa/src/app/(app)/layout.tsx`, `pwa/src/components/common/Header.tsx`, `pwa/src/app/(app)/capture/page.tsx`):** Today, every main route (`/home`, `/recipes`, `/planner`, `/discovery`, `/profile`, `/profile/settings`) sets `hideHeader = true` in `AppRouteLayout` and renders its own open-cream Era 3 heading, whereas `/capture` is the lone route still rendering `Header.tsx` (`.glass-header` with a centered title, `border-bottom`, and `rightAction: pdfActive ? undefined : ...`, which suppresses `[×]` during PDF confirmation).
- **Capture intake & client state (`pwa/src/components/capture/CaptureWithPdf.tsx`, `MinimalCapture.tsx`, `PdfCapturePanel.tsx`, `PdfCaptureConfirmation.tsx`, `pwa/src/hooks/useCapture.ts`, `pwa/src/store/captureStore.ts`, `pwa/src/store/pdfCaptureStore.ts`):**
  - `PdfCapturePanel` already navigates directly to `/home` upon `202` intake after calling `useCaptureStore.getState().addPending({ recipeId })`.
  - `MinimalCapture` still holds ~230 lines of intermediate post-save waiting/ready UI (`onSuccess`, `countdown`, `readyRecipeName`, `photoDuplicate`, `handleDiscardDuplicate`, `bundleImportSucceeded`) instead of returning straight to `/home`.
  - `MinimalCapture` and `PdfCaptureConfirmation` each implement legacy bordered `Check`-icon appreciation cards (`Not for me` / `It was OK` / `Loved it!`), whereas `pwa/src/components/recipes/RecipeDetailSheet.tsx` owns the canonical Era 3 `Rating` selector (`👎 Dislike` / `👍 Like` / `❤️ Love`, borderless on cream + raised `bg-white shadow-md` when `aria-pressed="true"`).
  - `RecipeService.ImportRecipeShareBundle` (`api/src/RecipeApi/Services/RecipeService.cs`) already persists `bundle.Recipe.Notes` and `bundle.Recipe.Rating` when `POST /api/recipes/import-bundle` executes, while `ExportRecipeShareBundle` scrubs both fields to `null` on export. Collecting importer `rating` and `notes` on `/capture` therefore requires **zero changes** to the `RecipeShareBundleDto` wire schema.
- **Async notifications & SSE (`api/src/RecipeApi/Services/Processors/RecipeReadyProcessor.cs`, `api/src/RecipeApi/Infrastructure/IScheduleEventPublisher.cs`, `SseEventPublisher.cs`, `pwa/src/hooks/useScheduleStream.ts`, `pwa/src/store/libraryStore.ts`, `LibraryToast.tsx`, `RecipeFailureBanner.tsx`):**
  - `RecipeReadyProcessor` transitions `IsReady` / `IsDiscoverable` via `RecipeFilePublicationStore.CompleteReadinessAsync` and calls `publisher.PublishRecipeReadyAsync(recipeId, name, imageUrl)`.
  - **Strict recovery-journal invariant (`WorkflowProcessorHistory.cs`, `CurrentRecoveryHouseholdState.Obligations.cs`, `CurrentRecoveryHouseholdState.ProcessorLinks.cs`):** `RecipeReadyProcessor.ValidateOriginalHistory` enforces that the processor's returned task result object contains *only* `{ Status = "Ready", RecipeId }` (or `AlreadyReady` / `Message`), and `CurrentRecoveryHouseholdState` + `RecipeImportLifecycleTests` + `RecipeImportIndexingTests` validate the exact task graph of `recipe-import.yaml`, `url-import.yaml`, and `goto-synthesis.yaml`.
- **Import issues & backup/recovery (`api/src/RecipeApi/Models/RecipeImportReport.cs`, `api/src/RecipeApi/Services/RecipeImportReportService.cs`, `api/src/RecipeApi/Dto/RecipeImportIssueDto.cs`, `CurrentRecoveryHouseholdState.cs`):**
  - `recipe_import_reports` already enforces `reasons <@ ARRAY['ingredients', 'steps', 'duplicate']::text[]` and supports system-authored rows with `ReportedBy = null`, `UpdatedBy = null`, `LastWorkflowInstanceId = null`, and `Status = Reported` (verified against `CurrentRecoveryHouseholdState.Stage` lines 117-124 and `ManagementServiceTests.BackupRestoreRoundTrip_PreservesDuplicateOnlyAndMixedRecipeImportReports`).
  - `CurrentRecoveryHouseholdState` deserializes archived `recipe-import-reports` with `UnmappedMemberHandling.Disallow` and `RespectRequiredConstructorParameters = true`. Adding any physical column to `recipe_import_reports` would break archive compatibility across backup/restore without necessity.
- **Similarity & normalization (`api/src/RecipeApi/Services/RecipeSearchDocumentBuilder.cs`, `RecipeSimilarityScorer.cs`):** Pure deterministic text normalization (`RecipeSearchDocumentBuilder.Normalize`) and ingredient parsing/Jaccard overlap (`RecipeSearchDocumentBuilder.ReadIngredients`) already exist in `RecipeApi.Services`.
- **Visual ratchet (`pwa/src/test/visual-contract.test.ts`):** `LEGACY_ERA_ALLOWLIST` is `{}`; every touched and newly created `.ts`/`.tsx` UI file must maintain `0` violations and pass `pwa/e2e/visual-a11y-contract.ts` (`assertCookbookVisualA11y`) in both `aa` (`standard`) and `aaa` (`high`) contrast modes.

## Decisions and Tradeoffs

### 1. Zero-schema, zero-YAML-node duplicate flagging with live `suspectedDuplicateRecipeId` resolution

- **Decision:** Keep `recipe_import_reports` schema and all workflow YAML definitions unchanged. Introduce a small deterministic service (`DuplicateRecipeDetector`) called from `RecipeReadyProcessor.ExecuteAsync` (after `CompleteReadinessAsync` succeeds and before `PublishRecipeReadyAsync`, leaving `RecipeReadyProcessor`'s returned task receipt untouched) and from `RecipeService.ImportRecipeShareBundle` (after `publications.PublishAsync` commits). When a match exists among ready, non-deleted recipes (`r.Id != recipe.Id && r.IsReady && r.DeletedAt == null`) and no `RecipeImportReport` exists yet for `recipe.Id`, insert a standard `RecipeImportReport` (`Reasons = ["duplicate"]`, `Status = Reported`, `Note = null`, `ReportedBy = null`, `UpdatedBy = null`). Expose optional nullable `suspectedDuplicateRecipeId` (`Guid?`) on `RecipeImportIssueDto` in `specs/openapi.yaml`, populated on read whenever `report.Reasons.Contains("duplicate")` by running `DuplicateRecipeDetector.FindBestMatchAsync`.
- **Matching criteria (deterministic, model-free, works in Demo mode and before async search embeddings run):**
  1. **Normalized `SourceUrl` match:** Exact match after trimming, lowercasing scheme/host, stripping URL fragments, stripping `utm_*` / `fbclid` / `gclid` query parameters, and trimming trailing slashes (`score = 1.0`).
  2. **Normalized title + ingredient overlap:** Exact normalized title (`RecipeSearchDocumentBuilder.Normalize(name)`) when non-empty (`score = 0.95`), OR title token Jaccard `>= 0.6` combined with ingredient Jaccard `>= 0.5` (via `RecipeSearchDocumentBuilder.ReadIngredients`, `score = 0.5 * titleJaccard + 0.5 * ingredientJaccard >= 0.65`). Ties break deterministically by highest score, then earliest `CreatedAt`, then `Id`.
- **Alternatives considered:**
  - *Alternative A (Add `suspected_duplicate_recipe_id` column to `recipe_import_reports` + `detect_duplicates` YAML task):* Rejected. Adds SQL migrations, FK cascade/purge edge cases when the older recipe is deleted, breaks `CurrentRecoveryHouseholdState` (`UnmappedMemberHandling.Disallow`) and `WorkflowProcessorHistory` validators, and leaves human-reported `Duplicate` issues without a matched target ID.
  - *Alternative B (Client-only duplicate lookup on toast arrival):* Rejected. Misses imports that finish while the tab is closed or switched to another household member, leaving unflagged duplicates in the library.

### 2. Reuse existing endpoints for all three Paired Duplicate Review outcomes

- **Decision:** Paired Duplicate Review (`PairedDuplicateReviewSheet.tsx`) loads both recipes via existing `getRecipe(id)` (`GET /api/recipes/{id}`) and resolves duplicates using existing endpoints only:
  - `Keep both recipes` (`variant="secondary"`): `DELETE /api/recipes/{newId}/import-report` (`resolveRecipeImportIssue`).
  - `Keep existing · move new to Bin` (`variant="danger"`): `DELETE /api/recipes/{newId}` (existing soft-delete into `RecycleBinSheet`).
  - `Keep new · move existing to Bin` (`variant="danger"`): `DELETE /api/recipes/{existingId}` followed by `DELETE /api/recipes/{newId}/import-report`.
- **Tradeoff:** Two sequential calls on `Keep new · move existing to Bin` require handling partial failure cleanly: if `DELETE /api/recipes/{existingId}` succeeds and `DELETE /import-report` fails, the UI retries clearing the report or informs the user while keeping the new recipe intact (and since `existingId` is now soft-deleted, subsequent reads compute `suspectedDuplicateRecipeId = null` unless a third duplicate exists). Zero new backend endpoints are required.

### 3. Single capture-owned Era 3 header with universal `[×]` cancel

- **Decision:** Add `isCapture` to `hideHeader` in `pwa/src/app/(app)/layout.tsx` (removing `.glass-header`'s centered title, bottom border, and `pdfActive ? undefined` suppression) and render a lightweight Era 3 capture header (`CaptureHeader`: left-aligned `font-heading` title + optional subtitle + top-right `48×48` `rounded-full border border-chrome-line bg-white text-ink-muted` `[×]` button with `data-testid="capture-cancel-btn"`, disabled while an upload/save is actively in flight) inside `CaptureWithPdf`. Activating `[×]` discards any active PDF share token (`discardSharedPdf`), resets `pdfCaptureStore` and `useCapture` drafts, and navigates to `/home`.
- **Alternative considered:** Keeping `Header.tsx` for Hub and local `Back` buttons for sub-modes. Rejected per design direction: `×` is universal cancel across all 6 capture screens (closing the PDF confirmation dead end and eliminating layout jumps between Hub and sub-screens).

### 4. Extract one shared `<RecipeRatingControl>` for Detail and Capture

- **Decision:** Extract `RecipeDetailSheet`'s appreciation selector (`1: 👎 Dislike`, `2: 👍 Like`, `3: ❤️ Love`; `text-hearth-ink` / `text-garden-ink` / `text-ink-body`; borderless on cream when unselected; `bg-white shadow-md` when `aria-pressed="true"`, plus a `[data-contrast='high']` `1.5px` `border-ink-body` outline rule so AAA mode never relies on shadow alone) into `pwa/src/components/recipes/RecipeRatingControl.tsx` with configurable `testIdPrefix` (`recipe-rating` in Detail, `capture-rating` in `MinimalCapture`, `pdf-rating` in `PdfCaptureConfirmation`) so existing test locators remain stable while eliminating three duplicate rating implementations.

### 5. Retire intermediate `/capture` waiting screens in favor of Home ambient ribbon

- **Decision:** Delete the `onSuccess` / `countdown` / `readyRecipeName` / `bundleImportSucceeded` branches from `MinimalCapture.tsx`. Photo, URL, and Describe intakes push `{ recipeId, name }` into `useCaptureStore` (after awaiting `saveGoTo` when `intent === 'goto'`) and call `router.push('/home')`. Shared `.txt` bundle intake (`201 Created`, already synchronous and ready) pushes a `ready` notification (carrying `isSuspectedDuplicate: Boolean(imported.importIssue?.reasons?.includes('duplicate'))`) into `useLibraryStore` and calls `router.push('/home')`. On `/home`, `HomeCommandCenter.tsx` renders `<CaptureInFlightRibbon />` directly beneath `<QuickCaptureTrigger />` (preserving Home's `<= 2` focal-group structure under Capture) whenever `useCaptureStore((s) => s.pendingRecipes.length > 0)`.

## First Observable Slice

**Tracer bullet:** End-to-end URL capture with suspected duplicate detection, immediate Save-and-Return-Home, duplicate-aware `LibraryToast`, and Paired Duplicate Review resolution:
1. Update `specs/openapi.yaml` (`RecipeImportIssueDto.suspectedDuplicateRecipeId`), regenerate Kiota client (`task prepare`), and update `pwa/e2e/mock-api.ts` builders/handlers.
2. Implement `DuplicateRecipeDetector` + wire `RecipeReadyProcessor`, `RecipeImportReportService` / `RecipeService` DTO mapping, and `SseEventPublisher.PublishRecipeReadyAsync(..., isSuspectedDuplicate)`.
3. Wire `useScheduleStream.ts` -> `libraryStore.ts` -> Era 3 `LibraryToast.tsx` + `MinimalCapture.tsx` immediate `/home` redirect + `PairedDuplicateReviewSheet.tsx` in `RecipeDetailSheet.tsx`.
4. Verify across `.NET` integration tests (`RecipeReadyProcessor` + `GET /api/recipes/{id}`) and mocked Playwright (`capture-flow.spec.ts` / `recipe-import-reporting.spec.ts`) before extending the remaining UI slices (PDF header/copy, `.txt` preview disclosure & rating/notes, Settings inline clear confirm, `DemoAiActionGate`, and `RecipeImportIssueSheet` Era 3 styling).

## State, Concurrency and Recovery

- **Foreground submission locks:** Photo (`photoSubmitLockRef` + `isSubmitting`), URL (`isUrlCapturing`), Describe (`isDescribing`), PDF (`lock` ref + `saving`), and `.txt` bundle (`isBundleSubmitting`) retain single-flight guards and disable the top-right `[×]` cancel button while the network request is in flight. If intake rejects or returns an invalid/missing recipe ID, the lock releases, `[×]` re-enables, an inline Hearth `role="alert"` message renders, and all user-entered fields (`images`, `urlInput`, `describeName`/`describeText`, `file`, `rating`, `notes`) remain intact.
- **PDF ownership & share-token safety:** Preserves `PdfCapturePanel`'s existing `generation`, `memberId`, and `visibilitychange` lifecycle guards. Activating `[×]` during PDF confirmation calls `reset()` (which calls `discardSharedPdf(shareToken)` when present and clears `pdfCaptureStore`) before `router.push('/home')`.
- **Settings per-row inline Clear confirmation (`FailedCapturesSection.tsx`):** Track `confirmingClearId: string | null` locally alongside `retryingIds` and `clearingIds`. Opening confirmation on row B closes any open unconfirmed prompt on row A without locking Retry. Confirming `Clear capture` adds `id` to `clearingIds` (disabling that row's confirmation buttons until `DELETE /api/captures/failures/{id}` settles); on rejection, `clearingIds` clears, `confirmingClearId` resets to `null` (requiring fresh confirmation on a subsequent Clear attempt per `capture-recovery`), and `errorIds` displays the localized retry error.
- **Duplicate detection idempotency & concurrency:** `RecipeReadyProcessor` only runs completion logic when `publications.CompleteReadinessAsync` transitions readiness (`ready == true`), and `DuplicateRecipeDetector` acquires `RecipeImportReportService`'s per-recipe semaphore (or checks `AnyAsync` + catches unique-key races on `recipe_import_reports.recipe_id`) so concurrent report creation never throws or overwrites a human report.

## Persistence and Side Effects

- **Authoritative store:** `recipes` and `recipe_import_reports` in PostgreSQL remain the sole persisted sources of truth; `suspectedDuplicateRecipeId` is a pure read-time projection over ready non-deleted `recipes` rows when mapping `RecipeImportIssueDto` in `RecipeService.GetRecipeById` / `RecipeImportReportService`.
- **Ordering in `RecipeReadyProcessor`:**
  1. `publications.CompleteReadinessAsync(task, recipeId, ct)` commits `IsReady = true` and `IsDiscoverable = true`.
  2. `reportService.FlagSuspectedDuplicateIfNoneAsync(recipeId, ct)` evaluates active ready recipes and, if matched and unflagged, saves a `Reported` `RecipeImportReport` (`reasons = ["duplicate"]`). A transient failure in duplicate flagging is logged without failing `RecipeReadyProcessor` or altering its returned `{ Status = "Ready", RecipeId }` receipt.
  3. `publisher.PublishRecipeReadyAsync(recipeId, name, imageUrl, isSuspectedDuplicate: hasDuplicateReport)` broadcasts the SSE frame.
- **Ordering in `RecipeService.ImportRecipeShareBundle`:**
  1. `publications.PublishAsync(...)` commits the new ready recipe, files, and importer-supplied `Rating` / `Notes`.
  2. `reportService.FlagSuspectedDuplicateIfNoneAsync(recipeId)` persists the `duplicate` report when matched, and `GetRecipeById` / `MapDetailDto` returns the populated `ImportIssue` (including `suspectedDuplicateRecipeId`) in the `201 Created` response.

## Compatibility, Rollout and Reversal

- **Additive OpenAPI & SSE fields:** `RecipeImportIssueDto.suspectedDuplicateRecipeId` (`type: [string, 'null'], format: uuid`) is optional/nullable, and `recipe_ready`'s `isSuspectedDuplicate` (`boolean`) defaults to `false` when omitted. Existing clients, saved backups, and historical workflow journals remain 100% compatible with zero data migration.
- **Reversibility:** Because no SQL DDL, disk `recipe.info` format, or workflow YAML task definitions change, reverting the code restores prior behavior cleanly; any `duplicate` rows written to `recipe_import_reports` are ordinary valid `RecipeImportReport` rows resolvable via `Mark as resolved`.

## Operational Diagnosis

- Reuse structured `ILogger` entries in `RecipeImportReportService` (`RecipeId`, matched candidate `Guid`, match kind `url` vs `title_ingredients`, without logging personal notes or raw scraped HTML) to diagnose why a recipe was or was not flagged as a suspected duplicate.
- Failed captures continue to surface friendly guidance via `GET /api/captures/failures` without leaking stack traces, and `RecipeImportIssueSheet` preserves `Copy recipe ID` / `Copy import ID` controls when `reimportFailureImportId` is present.

## User Experience

- **Unified Capture vertical grammar (`320px` to desktop, Standard AA & High Contrast AAA):**
  1. Open-cream header: left-aligned Playfair heading (`Add a recipe`, `Paste recipe link`, `Describe a recipe`, `Import PDF`, `Import recipe file`) + optional calm subtitle + top-right `48×48` white circular `[×]` (`border-chrome-line bg-white`). No horizontal divider line under the header.
  2. Source block: Photo grid (`+ Add photo` tile + `Main dish` toggle), URL input, Recipe name input, `SheetMealContext` terracotta-bar PDF filename card, or hero-led `.txt` preview card with collapsed `Preview steps` / `Hide preview` disclosure (`text-garden-ink` section headers + `bg-sage-50 border-garden-line` step numbers, no `Original` badge).
  3. Conditional Sunlight duplicate advisory (`bg-ochre-50 border-sunlight-line text-sunlight-ink`) directly below the source block so typing never shifts the active input.
  4. Personal metadata: Shared `<RecipeRatingControl>` (`👎 Dislike`, `👍 Like`, `❤️ Love`) + `Notes (optional)` (or `Description (optional)` on Describe).
  5. Single full-width primary Hearth CTA (`Save recipe`, `Save & build recipe`, or `Import recipe`).
- **Accessibility & bilingual parity:** All interactive controls enforce `>= 48 × 48 CSS px` targets and `2px` `outline-ink-body` at `4px` offset; High Contrast (`:root[data-contrast="high"]`) renders opaque surfaces and crisp `#6E645B` / `#191512` borders (including `1.5px` selected rating border); animations (`animate-ping`, toast transitions) disable under `prefers-reduced-motion: reduce`; all new and updated strings ship in both `pwa/src/locales/en/common.json` and `pwa/src/locales/fr/common.json` with zero em-dashes (`—`).
