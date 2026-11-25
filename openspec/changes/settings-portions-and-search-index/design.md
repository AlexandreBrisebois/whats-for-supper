# Design

## Context and Existing Ownership

- **Usual Portions in Settings:** `pwa/src/components/profile/UsualPortionsSection.tsx` already implements optimistic concurrency (`expectedVersion`), automatic baseline reload on conflict, and grocery-refresh synchronization (`useWeekStore.setState({ groceryRefresh })`), but currently renders a stacked checkbox, repeated labels/inputs, a `Save usual portions` button, and `"Saved"` status notices. `SettingsPageContent.tsx` (`pwa/src/app/(app)/profile/settings/SettingsPageContent.tsx`) renders `FamilyManagement` -> `UsualPortionsSection` -> `FailedCapturesSection` -> `PreviewFeaturesSection`.
- **Search Backfill & Reconciliation:** `api/src/RecipeApi/Controllers/ManagementController.cs` exposes `POST /api/management/backfill-search`, which triggers `search-reconciliation` (`api/src/RecipeApi/Workflows/search-reconciliation.yaml`, `api/src/RecipeApi/Services/SearchReconciliationWorkflow.cs`) scanning ready active recipes in batches of 50. Currently `SearchReconciliationWorkflow` only dispatches missing/stale/pending/failed docs (`force` is not supported), there is no `GET /api/management/search-status` summary endpoint, and there is no single-recipe reindex endpoint in `api/src/RecipeApi/Controllers/RecipeController.cs`.
- **Visual Design Reference:** `docs/visual-language/designs/settings-portions-and-reindex-suite.svg` and `docs/visual-language/designs/settings-portions-and-reindex-journeys.svg`.

## Decisions and Tradeoffs

1. **Compact flipped `UsualPortionsSection` (`0px` height shift, silent auto-save):**
   - *Decision:* Render a single `min-h-12` row inside `UsualPortionsSection`: portions on the **left** (`<count> portions` plain text when checked; `72×48px` numeric `<input>` followed by `portions` when unchecked), and `Use family size` checkbox on the **right**. Remove the Save button and routine `"Saved"` banners.
   - *Tradeoff:* Checking/unchecking fires `saveSupperServings` immediately; custom numeric edits debounce (~450ms) and flush on blur. Invalid inputs stay client-side with an inline `role="alert"` rather than sending an invalid PUT.
2. **Place `SearchIndexSection` strictly below `UsualPortionsSection` in `/profile/settings` (R2):**
   - *Decision:* Keep library-wide reindexing out of `/capture` and `/home`; mount `SearchIndexSection` directly below `UsualPortionsSection` in `SettingsPageContent.tsx`. Show `Searchable` vs. `Enriched` counts (`GET /api/management/search-status`), plain wrapped breakdown text (`139 smart-search · 3 keyword-only · 3 not indexed`), `RefreshCw` + `Index missing recipes`, and inline-confirmed `RotateCcw` + `Rebuild full search index` (`Cancel` / `Rebuild all`).
   - *Tradeoff:* Separating missing-only (`force: false`) from inline-confirmed full rebuild (`force: true`) protects embedding quota while still letting operators force-refresh the entire library.
3. **Contextual single-recipe `Reindex` in `RecipeDetailSheet` `•••` (R3):**
   - *Decision:* Add `RefreshCw` + `Reindex` inside `ActionGearMenu` (`RecipeDetailSheet.tsx`'s `•••` overflow menu), backed by `POST /api/recipes/{id}/reindex` (computing `SearchFingerprintService.ComputeSourceFingerprint` and triggering `index-recipe-search` if no equivalent Pending/Processing job is active).
   - *Tradeoff:* Keeps `RecipeDetailSheet`'s top Lucide icon toolbar (`UtensilsCrossed`, `Star`, `Share2`, `Ellipsis`, `X`) untouched while giving users a 2-tap targeted fix for a single recipe.

## First Observable Slice

1. **Compact Silent Auto-Save `UsualPortionsSection` Slice:**
   - Update `UsualPortionsSection.tsx` (portions-left, `Use family size` checkbox-right, no Save button, silent auto-save, preserved conflict auto-reconcile & grocery refresh) and verify against `UsualPortionsSection.test.tsx` + Planner/Groceries integration tests.
2. **Backend Search Status, `force` Backfill & Single-Recipe Reindex Slice:**
   - Update `specs/openapi.yaml` + Kiota client + MSW mocks for `GET /api/management/search-status`, `POST /api/management/backfill-search` (`{ force?: boolean }`), and `POST /api/recipes/{id}/reindex`.
   - Implement endpoints + `SearchReconciliationWorkflow` `force` parameter and verify with `RecipeApi.Tests` against Postgres.
3. **Settings `SearchIndexSection` (R2) + `RecipeDetailSheet` `•••` (R3) Slice:**
   - Implement `SearchIndexSection` strictly below `UsualPortionsSection` and `Reindex` in `RecipeDetailSheet` `•••`, verifying EN/FR `320px` reflow and `assertCookbookVisualA11y` in Standard (`aa`) and High Contrast (`aaa`) modes.

## State, Concurrency and Recovery

- **Usual portions auto-save & conflict guard:** Preserve `savingNow`, `queuedRead`, and `expectedVersion` in `UsualPortionsSection.tsx`. If a background member update changes `version` while a custom draft is dirty, automatically reload the fresh baseline (`read(true)`) and retry or surface the baseline inline without a manual Review gate.
- **Reindex idempotency:** Both `SearchReconciliationWorkflow` and `POST /api/recipes/{id}/reindex` check for an existing Pending/Processing `index-recipe-search` workflow for the same `(recipeId, fingerprint)` before queueing a duplicate job.
- **Demo Mode:** When `demoMode.Enabled == true`, `SearchIndexSection` and `RecipeDetailSheet` clearly note Demo Mode and keep lexical indexing active without calling external embedding providers.

## User Experience

- **Era 3 consistency:** Zero checkmarks (`✓`) in status copy or pills; `Cancel` / `Rebuild all` (`Annuler` / `Tout reconstruire` in FR) inline confirmation (`bg-white border-hearth-line`, never `window.confirm`); `>= 48 × 48 CSS px` touch targets (`min-h-12`); `>= 12 CSS px` floor; dual-mode Standard AA & High Contrast AAA tokens.
