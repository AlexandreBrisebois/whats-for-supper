# Design

## Context and Existing Ownership

Grounded in the existing capture, recovery, and search-indexing paths:

- **Home & Session Tracking:** `pwa/src/components/home/HomeCommandCenter.tsx` mounts `QuickCaptureTrigger` above `CaptureInFlightRibbon` (`pwa/src/components/home/CaptureInFlightRibbon.tsx`). `CaptureInFlightRibbon` currently reads only `useCaptureStore` (`pwa/src/store/captureStore.ts`), which is never hydrated from the server and contains an `+ Add another` link to `/capture`. `pwa/src/hooks/useScheduleStream.ts` drops `recipe_ready` and `recipe_failed` events unless `recipeId` is present in that tab's `captureStore`.
- **Workflows & Readiness:** `api/src/RecipeApi/Workflows/recipe-import.yaml`, `url-import.yaml`, and `goto-synthesis.yaml` run `RecipeReadyProcessor` (`api/src/RecipeApi/Services/Processors/RecipeReadyProcessor.cs`) _before_ `QueueRecipeSearchIndexProcessor` (`api/src/RecipeApi/Services/Processors/QueueRecipeSearchIndexProcessor.cs`), which queues child workflow `index-recipe-search` (`api/src/RecipeApi/Services/SearchIndexWorkflow.cs`). `SearchIndexWorkflow` already tracks two separate statuses on `RecipeSearchDocument`: `IndexStatus` (`"pending"` -> `"ready"`) and `EmbeddingStatus` (`"pending"` -> `"indexing"` -> `"ready"` | `"failed"`).
- **Failure Recovery & Cleanup:** `api/src/RecipeApi/Services/CaptureFailureService.cs` currently filters to `CaptureWorkflowIds = { "url-import", "recipe-import" }` and `WorkflowStatus.Paused`, omitting `goto-synthesis` and `WorkflowStatus.Failed`. `CaptureFailureReasonMapper` always receives `null`, producing generic guidance. `ShouldRetainRecipe` currently retains any recipe with non-null `Ingredients`, `RawMetadata`, `StructuredContent`, or `Name + ImageCount > 0`, which prevents `DeleteFailedCaptureResidue` (`api/src/RecipeApi/Services/ManagementService.cs`) from purging failed partial stubs from DB and disk.
- **Visual Design Reference:** `docs/visual-language/designs/capture-activity-recovery-suite.svg` and `docs/visual-language/designs/capture-activity-recovery-journeys.svg`.

## Decisions and Tradeoffs

1. **Keep `/capture` 100% pure; place activity & recovery in Home Bar + Capture Activity Sheet:**
   - _Decision:_ `/capture` remains solely a clean recipe-intake screen (`CaptureWithPdf` / `MinimalCapture`). Home renders `CaptureActivityBar` directly below `QuickCaptureTrigger` (no `+ Add another`) and opens `CaptureActivitySheet` on tap.
   - _Tradeoff:_ Avoids cluttering `/capture` with tabs or drawers while still keeping Home calm (1 compact bar for 1..N parallel imports; compact 2-line Hearth alert on failure).
2. **Server-backed `GET /api/captures/activity` + SSE hydration:**
   - _Decision:_ Replace tab-only `captureStore` authority with a server-backed store hydrated on mount and updated live via SSE (`recipe_progress`, `recipe_searchable`, `recipe_enriched`, `recipe_enrichment_failed`, `recipe_failed`, `capture_cleared`).
   - _Tradeoff:_ Adds one lightweight query across active/recent/failed capture workflows and their `RecipeSearchDocument`, in exchange for multi-device household sync and reload survival.
3. **Separate lexical `Searchable` (`IndexStatus == "ready"`) from semantic `Still enriching` (`EmbeddingStatus == "indexing"`) without global popups:**
   - _Decision:_ Emit a `recipe_searchable` event right after `SearchIndexWorkflow` commits `IndexStatus = "ready"`, and `recipe_enriched` / `recipe_enrichment_failed` after vector generation finishes, updating Home's Activity Bar & Sheet live while retiring global floating `LibraryToast` and off-Home `RecipeFailureBanner`.
   - _Tradeoff:_ Users never get interrupted by toasts or banners while browsing Planner, Library, or Groceries, and simply check Home whenever they want capture status or duplicate review.
4. **On-demand `Copy` icon button (`GET /api/captures/failures/{id}/details`) in one action row:**
   - _Decision:_ Keep list responses (`GET /api/captures/failures`, `GET /api/captures/activity`) free of raw diagnostics; add `GET /api/captures/failures/{id}/details` called when the user taps the `48×48px` `Copy` icon button sitting inline with `RotateCcw` + `Retry` (`flex-1`) and `Trash2` (`48×48px`), surfacing a quiet neutral `"Details copied"` status below the row. Also drop source-type badges beside titles and make `Searchable` cards directly tappable (`ChevronRight`) instead of adding redundant `Open recipe` buttons.
   - _Tradeoff:_ Cuts vertical height on mobile failure and enrichment cards while giving operators full debugging power in one tap and keeping FR copy free of wrapping collisions.
5. **Use `recipe.IsReady` as the residue-retention boundary:**
   - _Decision:_ Change `CaptureFailureService.ShouldRetainRecipe(recipe)` to `recipe.IsReady` (plus active planner/cooked usage check if needed, though unready recipes cannot be planned/ready).
   - _Tradeoff:_ Any failed capture stub (`!IsReady`) with partial ingredients/hero files is hard-purged from DB and disk on `Delete`, whereas failed re-imports of published recipes (`IsReady`) only dismiss the failed workflow (`Cancel` / `Dismiss`).

## First Observable Slice

1. **Contract & Backend Activity + `goto-synthesis` Recovery Slice:**
   - Update `specs/openapi.yaml` and regenerate Kiota client (`pwa/src/lib/api/generated/`) + MSW mocks for `GET /api/captures/activity`, `GET /api/captures/failures/{id}/details`, `goto-synthesis` inclusion in `GET/POST/DELETE /api/captures/failures`, and `IsReady`-based cleanup retention.
   - Real integration boundary: `Api` integration tests hitting Postgres `RecipeDbContext` + `WorkflowInstance` + `LocalRecipeStore` disk directory verifying `goto-synthesis` listing/retry/delete and `!IsReady` partial-stub DB + disk purge.
2. **Search Stage Separation & SSE Slice:**
   - Emit `recipe_searchable`, `recipe_enriched`, `recipe_enrichment_failed`, and step progress in `SearchIndexWorkflow` / `WorkflowWorker` / `SseEventPublisher`.
3. **Home Capture Activity Bar & Activity Sheet Slice (Zero Global Popups):**
   - `CaptureActivityBar` (Sheet A progress bar for 1..N parallel imports, Garden enriching bar, compact 2-line white-surface Hearth-bordered alert), `CaptureActivitySheet` (auto-closing on last delete, `Cancel` / `Trash2` + `Delete` vs `Cancel` / `Dismiss`, single-row `RotateCcw` + `Retry` + `48×48` `Copy` icon + `48×48` `Trash2` -> neutral `Details copied`, tappable `ChevronRight` `Searchable` cards, Sunlight `RefreshCw` + `Retry enrichment`), and retire global `LibraryToast` + off-Home `RecipeFailureBanner` mounts.

## State, Concurrency and Recovery

- **Parallel imports:** `GET /api/captures/activity` returns items ordered `needsAttention` -> `inProgress` (preparing / indexing) -> `enriching` / `enrichmentPaused`. Home bar aggregates `inProgress` + `enriching` counts and computes aggregate progress (`completedSteps / totalSteps`), while any `needsAttention` item switches the Home bar to the compact 2-line Hearth alert without losing background progress.
- **Auto-close on last delete:** Deleting the last `needsAttention` item when `inProgress + enriching + enrichmentPaused == 0` closes `CaptureActivitySheet` immediately on `DELETE 202` acknowledgement and returns focus to `QuickCaptureTrigger` on Home.
- **Enrichment-paused retry:** `Retry enrichment` queues `index-recipe-search` for that `recipeId` and transitions the row locally to `Searchable · Still enriching` upon `202 Accepted`.

## Persistence and Side Effects

- Deleting an unready failed capture (`!recipe.IsReady`) soft-deletes the recipe inside `CaptureFailureService` (`api/src/RecipeApi/Services/CaptureFailureService.cs`) and queues `DeleteFailedCaptureResidueCommand`, which `ManagementService.ProcessDeleteFailedCaptureResidueAsync` (`api/src/RecipeApi/Services/ManagementService.cs`) executes via `RecipePhysicalLifecycle.DeleteAsync` to recursively remove the disk folder and database row.
- Clearing a failed re-import of an already-published recipe (`recipe.IsReady`) removes/retires only the failed workflow instance and leaves the `Recipe` row, images, and search document intact.

## User Experience

- **Era 3 tokens & accessibility:** Standard AA & High Contrast AAA semantic tokens only (`ink-body`, `ink-muted`, `hearth-*`, `garden-*`, `sunlight-*`, `chrome-line`, `icon-affordance`). Zero checkmarks anywhere in Journey 1 (`Utensils` / Garden pill on `Searchable`, `AlertCircle` on failures, `Sparkles` on enriching).
- **Touch & reflow:** All controls `>= 48 × 48 CSS px` (`min-h-12` for wrapping FR buttons on `320px`), `focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body`, `prefers-reduced-motion: reduce` honored on pulse/bar/sheet motion.
