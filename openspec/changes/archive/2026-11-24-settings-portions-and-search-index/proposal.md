# Proposal

## Why

In `/profile/settings`, `UsualPortionsSection` (`pwa/src/components/profile/UsualPortionsSection.tsx`) currently duplicates controls and text (a checkbox row, a separate repeated input/read-only box, helper copy, and an explicit Save button), while the rest of WFS auto-saves changes silently. In addition, users have no UI to inspect how many recipes are keyword-searchable vs. smart-search enriched, trigger a missing-recipe or full-library search reindex from Settings (R2), or reindex an individual recipe from its detail sheet when it fails to appear in search (R3).

## Outcome and Scope

Deliver a compact, silent-auto-save **Settings Usual Portions** card paired with self-service **Library & Contextual Search Reindexing** while keeping `/capture` completely separate:

- **In scope (`settings-portions-and-search-index`):**
  - Compact `UsualPortionsSection` to a single `48px` row (`0px` shift on toggle) with portions on the **left** (`<N> portions` plain text when checked; `72×48px` numeric input box followed by `portions` when unchecked) and the `Use family size` checkbox on the **right** taking over when checked. Remove the Save button and routine `"Saved"` notices—auto-save silently on toggle and valid numeric input (debounced + blur), surfacing inline `role="alert"` only for invalid values, network/save failures, or version-conflict reconciliation.
  - Add a **Search index** card (`SearchIndexSection`) inside `/profile/settings` (`pwa/src/app/(app)/profile/settings/SettingsPageContent.tsx`) positioned **strictly below** `UsualPortionsSection`, displaying `Searchable` vs. `Enriched` counts, plain wrapped breakdown copy, 1-tap `Index missing recipes`, and inline-confirmed (`Cancel` / `Rebuild all`) `Rebuild full search index` (`POST /api/management/backfill-search` with optional `force`).
  - Add single-recipe **`Reindex`** (`POST /api/recipes/{id}/reindex`) to the `RecipeDetailSheet` (`pwa/src/components/recipes/RecipeDetailSheet.tsx`) `•••` overflow menu (R3) so users can reindex one specific recipe in context without rebuilding the whole library.
- **Out of scope (covered in separate change `capture-activity-and-recovery`):**
  - Home Capture Activity Bar, Capture Activity Sheet, capture failure recovery (`Retry` / `Delete` / `Copy details`), and `LibraryToast` timing.

Visual reference boards: `docs/visual-language/designs/settings-portions-and-reindex-suite.svg` and `docs/visual-language/designs/settings-portions-and-reindex-journeys.svg`.

## What Changes

- **Backend Search Index Endpoints & Reconciliation:**
  - Add `GET /api/management/search-status` returning total ready recipes, lexically searchable count (`IndexStatus == "ready"`), smart-search enriched count (`EmbeddingStatus == "ready"`), active indexing count, and demo-mode state.
  - Extend `POST /api/management/backfill-search` and `search-reconciliation` (`api/src/RecipeApi/Services/SearchReconciliationWorkflow.cs`) to accept optional `{ force: true }` for full index rebuilds in bounded batches of 50.
  - Add `POST /api/recipes/{id}/reindex` in `api/src/RecipeApi/Controllers/RecipeController.cs` to queue `index-recipe-search` for a single ready recipe without touching other recipes.
- **PWA Settings & Recipe Detail:**
  - Refactor `pwa/src/components/profile/UsualPortionsSection.tsx` to the compact flipped portions-left + checkbox-right silent auto-save layout (no Save button, no routine save banners).
  - Create `SearchIndexSection` mounted strictly below `UsualPortionsSection` in `SettingsPageContent.tsx`.
  - Add `Reindex` action inside `RecipeDetailSheet.tsx`'s `•••` overflow menu with quiet status and inline `role="alert"` error feedback.

## Capabilities

### New Capabilities

- (none — extends existing `supper-servings` and `search-indexing` owners)

### Modified Capabilities

- `supper-servings`: Compact single-row Settings `Usual portions` control (portions-left, `Use family size` checkbox-right) with silent auto-save (no Save button or routine save notice) while preserving version-conflict auto-reconciliation.
- `search-indexing`: Support optional `force` full-library rebuild in `search-reconciliation` and `POST /api/management/backfill-search`, expose `GET /api/management/search-status` + Settings `Search index` card strictly below `Usual portions` (R2), and support contextual single-recipe `POST /api/recipes/{id}/reindex` in `RecipeDetailSheet` `•••` (R3).

## Impact

- **OpenAPI & Client:** `specs/openapi.yaml`, Kiota generated client (`pwa/src/lib/api/generated/`), `pwa/src/lib/api/management.ts` / `recipes.ts`, MSW handlers/builders.
- **Backend:** `api/src/RecipeApi/Controllers/ManagementController.cs`, `api/src/RecipeApi/Controllers/RecipeController.cs`, `api/src/RecipeApi/Services/SearchReconciliationWorkflow.cs`, `api/src/RecipeApi/Workflows/search-reconciliation.yaml`.
- **Frontend:** `pwa/src/components/profile/UsualPortionsSection.tsx`, `pwa/src/components/profile/SearchIndexSection.tsx`, `pwa/src/app/(app)/profile/settings/SettingsPageContent.tsx`, `pwa/src/components/recipes/RecipeDetailSheet.tsx`, `pwa/src/locales/en/common.json`, `pwa/src/locales/fr/common.json`.
