# Proposal

## Why

Home's current in-flight capture ribbon (`CaptureInFlightRibbon`) relies on tab-local Zustand memory (`captureStore`), displays an opaque count with a redundant `+ Add another` button directly beneath `QuickCaptureTrigger`, disappears when `recipe_ready` fires before search indexing runs, and hides failed capture recovery in `/profile/settings` while excluding `goto-synthesis` (description captures) altogether. As a result, household members lose visibility on refresh or across devices, search for newly "ready" recipes before they are indexed, and cannot retry or delete failed description captures without touching the database or disk directly.

## Outcome and Scope

Deliver an honest, server-backed, self-service **Capture Activity & Recovery** journey while keeping `/capture` single-purpose and uncluttered:

- **In scope (`capture-activity-and-recovery`):**
  - Keep `/capture` untouched (pure recipe intake only; no tabs, drawers, or overflow menus).
  - Replace `CaptureInFlightRibbon` with a server-hydrated **Home Capture Activity Bar** directly beneath `QuickCaptureTrigger` (no `+ Add another` button) supporting **1 to N parallel imports** via Sheet A's progress-bar design, a Garden `Searchable · Still enriching` state, and a compact white-surface Hearth-bordered priority alert when failures exist.
  - Add an Era 3 **Capture Activity Sheet** opened from Home showing `Needs attention`, `In progress` (parallel items), tappable `Searchable · Still enriching` (opening the recipe or suspected-duplicate comparison), and tappable `Searchable · Enrichment paused` (Sunlight, non-destructive `RefreshCw + Retry enrichment`).
  - Surface step-specific friendly failure messages paired with a compact single-row action strip (`RotateCcw + Retry`, `48×48` `Copy` icon showing quiet neutral `"Details copied"`, and `48×48` `Trash2`) that copies full error, stack trace, step, and workflow/recipe IDs on demand without cluttering mobile UI.
  - Include `goto-synthesis` alongside `url-import` and `recipe-import` in capture failure recovery, and purge `!IsReady` partial stubs cleanly from both database and disk on `Delete` (`Cancel` / `Trash2 + Delete` inline confirmation; `Cancel` / `Dismiss` for already-published `IsReady` recipes). Auto-close the sheet back to Home when the last failed capture is deleted.
  - Retire global floating `LibraryToast` and off-Home `RecipeFailureBanner` popups so browsing Planner, Library, or Groceries is never interrupted; readiness, duplicate checks, and failures live calmly on Home and in Settings.
- **Out of scope (covered in separate change `settings-portions-and-search-index`):**
  - Removing the Save button from Settings `Usual portions` (compact portions-left + checkbox-right auto-save).
  - Settings `Search index` card (R2) and `RecipeDetailSheet` single-recipe `Reindex` (R3).

Visual reference boards: `docs/visual-language/designs/capture-activity-recovery-suite.svg` and `docs/visual-language/designs/capture-activity-recovery-journeys.svg`.

## What Changes

- **Backend API & Workflow Recovery:**
  - Expand `CaptureFailureService` to cover `goto-synthesis` (with `"description"` source type and description preview) and `WorkflowStatus.Failed` in addition to `Paused`.
  - Add `CaptureFailureReasonMapper` step-specific friendly messages and `GET /api/captures/failures/{id}/details` to supply on-demand diagnostic text (`failedStep`, `errorMessage`, `stackTrace`, `workflowInstanceId`, `recipeId`, `retryCount`, `lastFailedAt`) for the `48×48` `Copy` icon.
  - Update `CaptureFailureService.ShouldRetainRecipe` so only already-published (`IsReady`) recipes are protected from `DeleteFailedCaptureResidue` cleanup, allowing `!IsReady` partial stubs (including partial ingredients/metadata/images) to purge cleanly from DB and disk.
  - Add `GET /api/captures/activity` returning active, indexing, enriching, enrichment-paused, and failed captures for household hydration across reloads and devices.
  - Publish SSE updates when search indexing transitions (`indexing` lexical ready -> `enriching` / `enriched` / `enrichment_failed`) so Home Activity Bar and Capture Activity Sheet stay live without mounting global floating toasts.
- **PWA Frontend:**
  - Replace `pwa/src/components/home/CaptureInFlightRibbon.tsx` with `CaptureActivityBar` and `CaptureActivitySheet` (`bg-cream` over warm scrim, Era 3 dual-mode AA/AAA tokens, zero checkmarks).
  - Share the unified single-row failure strip (`RotateCcw + Retry`, `48×48` `Copy` icon showing quiet neutral `"Details copied"`, and `48×48` `Trash2`; `Cancel` / `Trash2 + Delete` inline confirmation) between `CaptureActivitySheet` and `pwa/src/components/profile/FailedCapturesSection.tsx`.
  - Update `pwa/src/hooks/useScheduleStream.ts` to keep Home/Sheet state live and retire global floating `LibraryToast` (`pwa/src/components/capture/LibraryToast.tsx`) and off-Home `RecipeFailureBanner` (`pwa/src/components/capture/RecipeFailureBanner.tsx`) popups.

## Capabilities

### New Capabilities

- (none — extends existing `capture-recovery` and `recipe-capture` owners)

### Modified Capabilities

- `capture-recovery`: Include `goto-synthesis`, `Failed` workflow states, step-specific friendly errors with on-demand diagnostics `Copy` icon (`"Details copied"`), `Cancel`/`Delete` (`!IsReady`) vs. `Cancel`/`Dismiss` (`IsReady`) confirmation, full DB/disk stub purge, household capture activity feed (`GET /api/captures/activity`), paused-enrichment retry, and retire global off-Home `RecipeFailureBanner` popups.
- `recipe-capture`: Replace ambient session-only `CaptureInFlightRibbon` and `+ Add another` with server-hydrated Home Capture Activity Bar supporting 1..N parallel imports, compact white-surface Hearth failure priority, and calm in-sheet `Searchable` / duplicate review (retiring global `LibraryToast` and off-Home `RecipeFailureBanner`).

## Impact

- **OpenAPI & Client:** `specs/openapi.yaml`, Kiota client under `pwa/src/lib/api/generated/`, `pwa/src/lib/api/captures.ts`, and MSW handlers/builders in `pwa/e2e/` / `pwa/src/test/`.
- **Backend:** `api/src/RecipeApi/Controllers/CapturesController.cs`, `api/src/RecipeApi/Services/CaptureFailureService.cs`, `api/src/RecipeApi/Services/CaptureFailureReasonMapper.cs`, `api/src/RecipeApi/Services/SearchIndexWorkflow.cs`, `api/src/RecipeApi/Services/Processors/RecipeReadyProcessor.cs`, `api/src/RecipeApi/Infrastructure/SseEventPublisher.cs`.
- **Frontend:** `pwa/src/components/home/HomeCommandCenter.tsx`, `pwa/src/components/home/CaptureInFlightRibbon.tsx` (replaced/refactored), `pwa/src/components/profile/FailedCapturesSection.tsx`, `pwa/src/components/capture/LibraryToast.tsx`, `pwa/src/components/capture/RecipeFailureBanner.tsx`, `pwa/src/hooks/useScheduleStream.ts`, `pwa/src/store/captureStore.ts`, `pwa/src/locales/en/common.json`, `pwa/src/locales/fr/common.json`.
