# Tasks

## 1. Compact Silent Auto-Save `UsualPortionsSection` in Settings

**Outcome and scenarios:** Replace the stacked `Usual portions` form and `Save` button with a compact `0px`-shift single row (portions on left, `Use family size` checkbox on right) that auto-saves silently on toggle and valid numeric input while preserving conflict auto-reconciliation (`supper-servings`: `Apply an explicit household default with dated exceptions`, `Recover Settings portions saves explicitly`).
**Owners and boundaries:** `pwa/src/components/profile/UsualPortionsSection.tsx`, `pwa/src/locales/en/common.json`, `pwa/src/locales/fr/common.json`, plus existing Settings E2E helpers/specs (`pwa/e2e/supper-servings.spec.ts`, `pwa/e2e/supper-servings-context.spec.ts`, `pwa/e2e/supper-servings-movement.spec.ts`, `pwa/e2e/planner-portions-refinement.spec.ts`, `pwa/e2e/prepared-supper.spec.ts`, `pwa/e2e/recipe-ingredient-preview.spec.ts`).
**Dependencies and prerequisites:** Existing `readSupperServings` / `saveSupperServings` API client (`pwa/src/lib/api/supper-servings.ts`).
**Acceptance boundary:** Vitest unit tests (`UsualPortionsSection.test.tsx`) + migrated Playwright E2E specs verifying silent auto-save, `0px` toggle shift, conflict recovery, and EN/FR `320px` reflow.

- [x] 1.1 Update/add tests in `pwa/src/components/profile/UsualPortionsSection.test.tsx` asserting: (a) no `Save` button and no routine `"Saved"` notice render, (b) checking `Use family size` (right) shows `<count> portions` on the left and calls `saveSupperServings` with `defaultServings: null`, (c) unchecking enables the left `72×48` input with the `portions` unit label still visible beside it and auto-saves valid integers, (d) `0`/empty shows inline `role="alert"` without sending a PUT, and (e) stale version conflicts auto-reconcile without a manual Review gate; also identify `save-usual-portions` / `"Saved"` assertions across the 6 existing Settings E2E specs (`supper-servings*.spec.ts`, `planner-portions-refinement.spec.ts`, `prepared-supper.spec.ts`, `recipe-ingredient-preview.spec.ts`). Run `pnpm --dir pwa test src/components/profile/UsualPortionsSection.test.tsx` and observe red failures.
- [x] 1.2 Refactor `pwa/src/components/profile/UsualPortionsSection.tsx`, EN/FR locales, and migrate those 6 existing E2E specs from clicking `save-usual-portions` / asserting `"Saved"` to silent auto-save (`fill` + `blur` / PUT response wait) matching `docs/visual-language/designs/settings-portions-and-reindex-suite.svg`, then re-run `pnpm --dir pwa test src/components/profile/UsualPortionsSection.test.tsx`, `visual-contract.test.ts`, and affected E2E specs to green.

## 2. Backend Search Status, `force` Backfill & Single-Recipe Reindex Contract

**Outcome and scenarios:** Expose `GET /api/management/search-status`, support optional `{ force?: boolean }` on `POST /api/management/backfill-search`, and expose `POST /api/recipes/{id}/reindex` (`search-indexing`: `Repair derived search state in bounded batches`, `Acknowledge background backfill dispatch separately`, `Inspect search index health and trigger reindex in Settings`, `Reindex a single recipe in context`).
**Owners and boundaries:** `specs/openapi.yaml`, `pwa/src/lib/api/generated/`, MSW mocks, `api/src/RecipeApi/Controllers/ManagementController.cs`, `api/src/RecipeApi/Controllers/RecipeController.cs`, `api/src/RecipeApi/Services/SearchReconciliationWorkflow.cs`, `api/src/RecipeApi/Workflows/search-reconciliation.yaml`.
**Dependencies and prerequisites:** PostgreSQL test DB in `api/src/RecipeApi.Tests/`.
**Acceptance boundary:** Backend unit/integration tests against Postgres EF Core + Kiota client synchronization.

- [x] 2.1 Add failing backend tests in `api/src/RecipeApi.Tests/Integration/SearchReindexIntegrationTests.cs` and `api/src/RecipeApi.Tests/Services/SearchReconciliationWorkflowTests.cs` covering `GET /api/management/search-status` counts (`searchable` vs `enriched`), `POST /api/management/backfill-search` with `force: true` queueing ready docs while deduplicating active jobs, and `POST /api/recipes/{id}/reindex` queueing `index-recipe-search` for one recipe (and 404/409 for missing/unready recipes).
- [x] 2.2 Update `specs/openapi.yaml`, regenerate Kiota client and MSW handlers, and implement `ManagementController`, `RecipeController`, and `SearchReconciliationWorkflow` changes; run `dotnet test api/src/RecipeApi.Tests --filter "FullyQualifiedName~SearchReindex|SearchReconciliation"` to green.

## 3. Settings `SearchIndexSection` (R2) & `RecipeDetailSheet` Reindex (R3)

**Outcome and scenarios:** Mount `SearchIndexSection` strictly below `UsualPortionsSection` in `/profile/settings` (`RefreshCw` + `Index missing recipes` and `RotateCcw` + `Rebuild full search index` with inline `Cancel` / `Rebuild all`) and add `RefreshCw` + `Reindex` to `ActionGearMenu` (`RecipeDetailSheet` `•••` menu) (`search-indexing`: `Inspect search index health and trigger reindex in Settings`, `Reindex a single recipe in context`).
**Owners and boundaries:** `pwa/src/components/profile/SearchIndexSection.tsx` (new file), `pwa/src/app/(app)/profile/settings/SettingsPageContent.tsx`, `pwa/src/components/recipes/RecipeDetailSheet.tsx`, `pwa/src/components/recipes/ActionGearMenu.tsx`, `pwa/src/lib/api/management.ts` (new wrapper for `/api/management/search-status` & `/api/management/backfill-search`), `pwa/src/lib/api/recipes.ts`, `pwa/src/locales/en/common.json`, `pwa/src/locales/fr/common.json`.
**Dependencies and prerequisites:** Tasks 1 and 2; visual design in `docs/visual-language/designs/settings-portions-and-reindex-suite.svg`.
**Acceptance boundary:** Vitest component tests + Playwright E2E with MSW mocks (`pwa/e2e/`) verifying Settings card order (`UsualPortionsSection` directly above `SearchIndexSection`), `Cancel` / `Rebuild all` confirmation, `RecipeDetailSheet` `•••` `Reindex`, EN/FR `320px` reflow, and `assertCookbookVisualA11y` in Standard (`aa`) and High Contrast (`aaa`) modes.

- [x] 3.1 Add failing Vitest component tests (`SearchIndexSection.test.tsx`, `RecipeDetailSheet.reindex.test.tsx`) and Playwright E2E spec (`settings-portions-and-reindex.spec.ts`) covering portions auto-save, Settings card order, `Cancel`/`Rebuild all`, `RecipeDetailSheet` `•••` reindex, inline `role="alert"` error paths, and zero checkmarks.
- [x] 3.2 Implement `SearchIndexSection`, mount it strictly below `UsualPortionsSection` in `SettingsPageContent.tsx`, add `Reindex` to `RecipeDetailSheet.tsx`, and update EN/FR locales; run `pnpm --dir pwa test` (including `visual-contract.test.ts` and `tokens.test.ts`) to green.
- [x] 3.3 Run Playwright E2E scenarios in Standard (`aa`) and High Contrast (`aaa`) modes (`pnpm --dir pwa exec playwright test settings-portions-and-reindex.spec.ts`) and confirm zero horizontal overflow at `320px` and passing `assertCookbookVisualA11y`.

## 4. Final Integration and Verification

- [x] 4.1 Review the complete task-owned diff against `settings-portions-and-search-index` scope, confirm `openspec validate "settings-portions-and-search-index"`, and run `task verify` across all changed paths; report actual check statuses and verification record path.
