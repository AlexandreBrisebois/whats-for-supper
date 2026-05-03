# Build Prompt: Recipe Readiness as a Recipe Domain Concern

## Authority

Follow the repo doctrine in order: `specs/openapi.yaml` → this prompt → tests → implementation.  
ADR: `specs/decisions/033-recipe-readiness-as-recipe-domain-concern.md`  
Execution harness: `.agents/core/execution-harness.md`

---

## Objective

Remove `status` from the `family_goto` settings value and derive recipe readiness from `GET /api/recipes/{id}/status` instead. Rename `MarkGotoReadyProcessor` to `RecipeReadyProcessor` and remove its dependency on `family_settings`. Update `HomeCommandCenter` and `FamilyGOTOSettings` to poll `GET /api/recipes/{id}/status` while pending, and stop once ready.

This eliminates the stale-cache race where the home card and settings UI show "Being prepared…" indefinitely after the background workflow completes.

---

## Constraints

- Do not change `specs/openapi.yaml` — `GET /api/recipes/{id}/status` already exists and returns `{ id, name, status, imageCount }`.
- Do not change the `family_goto` settings value shape in the DB — only stop writing and reading the `status` field.
- Do not change the `goto-synthesis` or `recipe-import` workflow task order — only rename the processor reference from `MarkGotoReady` to `RecipeReady`.
- Do not touch any other component, route, or store action outside the scope below.
- Run `task agent:drift` and `task review` before declaring done.

---

## Phase A — Backend: Rename Processor (seam: processor registered under new name, workflows updated)

**Stop condition**: `RecipeReadyProcessor` is registered in `Program.cs`, both workflows reference `RecipeReady`, and no reference to `MarkGotoReady` remains in production code.

### Tasks

**A1.** Rename `api/src/RecipeApi/Processors/MarkGotoReadyProcessor.cs` to `RecipeReadyProcessor.cs`.  
- Change the class name to `RecipeReadyProcessor`.  
- Change `ProcessorName` constant to `"RecipeReady"`.  
- Remove all code that reads or writes `family_settings`. The processor's only job is to ensure the recipe row has a populated `Name` and `ImageCount > 0`. If the recipe is already complete, no-op. If not, log a warning — do not throw.  
- Keep the `recipeId` payload parameter unchanged.

**A2.** Update `api/src/RecipeApi/Workflows/goto-synthesis.yaml`:  
- Change `processor: MarkGotoReady` → `processor: RecipeReady` on the `mark_goto_ready` task.  
- Rename the task id from `mark_goto_ready` to `recipe_ready` for consistency.  
- Update `depends_on` references accordingly.

**A3.** Update `api/src/RecipeApi/Workflows/recipe-import.yaml`:  
- Same rename as A2.

**A4.** Update `api/src/RecipeApi/Program.cs`:  
- Replace the `MarkGotoReadyProcessor` registration with `RecipeReadyProcessor`.  
- Remove any `using` or reference to the old class name.

**A5.** Update integration tests in `api/src/RecipeApi.Tests/`:  
- Rename any test class or method referencing `MarkGotoReady` → `RecipeReady`.  
- Update the test that verifies `MarkGotoReadyProcessor` updates `family_settings` — replace it with a test that verifies `RecipeReadyProcessor` no-ops when the recipe is already complete, and logs a warning when it is not.  
- Add a test: `RecipeReadyProcessor` does not touch the `family_settings` table under any circumstance.

**A6.** Run `task agent:test:impact` — all backend tests pass.  
**A7.** Run `task agent:drift` — zero drift confirmed.

---

## Phase B — PWA: Remove status from GotoValue, add recipe status fetch (seam: readiness derived from API, not cached setting)

**Stop condition**: `HomeCommandCenter` and `FamilyGOTOSettings` read readiness from `GET /api/recipes/{id}/status`, not from `familySettings['family_goto'].status`. Typecheck clean.

### Tasks

**B1.** Update `pwa/src/components/profile/FamilyGOTOSettings.tsx`:  
- Remove `status` from the `GotoValue` interface.  
- Remove `gotoStatus`, `isPending`, `isReady` derivations from the settings value.  
- Add local state: `recipeStatus: 'pending' | 'ready' | null` (null = not yet fetched).  
- Add a `fetchRecipeStatus(recipeId: string)` function that calls `apiClient.api.recipes.byId(recipeId).status.get()` and sets `recipeStatus`.  
- In `useEffect`: after `loadSetting(GOTO_KEY)`, if `currentGoto?.recipeId` is present, call `fetchRecipeStatus`. Start a 5-second poll interval while `recipeStatus === 'pending'`; clear it once `'ready'` or on unmount.  
- Replace all `isPending` / `isReady` / `gotoStatus` references with `recipeStatus === 'pending'` / `recipeStatus === 'ready'`.  
- When saving via `handleRecipeSelect` (library pick): do not write `status` to the setting value. Write only `{ description: recipe.name, recipeId: recipe.id }`. Set `recipeStatus = 'ready'` locally immediately (library recipes are always ready).  
- When navigating to describe/capture: do not write `status` to the setting. The setting is written by the capture page after the workflow starts, also without `status`.

**B2.** Update `pwa/src/app/(app)/capture/page.tsx` and `MinimalCapture` (or wherever `saveSetting` is called post-capture with `status: 'pending'`):  
- Remove `status` from the value passed to `saveSetting`. Write only `{ description, recipeId }`.

**B3.** Update `pwa/src/components/home/HomeCommandCenter.tsx`:  
- Remove `gotoStatus` and its derivation from `gotoValue`.  
- Add local state: `gotoRecipeStatus: 'pending' | 'ready' | null`.  
- After `loadSetting('family_goto')` resolves and `gotoRecipeId` is non-null, call `GET /api/recipes/{gotoRecipeId}/status` via the Kiota client and set `gotoRecipeStatus`.  
- While `gotoRecipeStatus === 'pending'`, poll every 5 seconds. Stop polling when `'ready'` or when `gotoRecipeId` changes. Clean up on unmount.  
- Pass `gotoStatus={gotoRecipeStatus}` to `TonightPivotCard` (prop name unchanged — only the source changes).  
- The `onConfirmGoto` handler already checks `gotoRecipeId` — no change needed there.

**B4.** Verify `TonightPivotCard.tsx` — the `gotoStatus` prop type is already `string | null`. No change needed unless it references `'ready'` as a magic string — confirm it uses `gotoStatus !== 'ready'` or equivalent for the disabled guard, not an equality check on a value read from settings.

**B5.** Run `npm run typecheck` — zero type errors.

---

## Phase C — E2E: Update mocks and tests (seam: test suite green)

**Stop condition**: All existing home and settings E2E tests pass. No test references `status` in the `family_goto` mock value.

### Tasks

**C1.** Update `pwa/e2e/mock-api.ts` `setupCommonRoutes`:  
- In the `family_goto` settings mock handler: remove `status` from the mock value. Return only `{ description, recipeId }`.  
- Add a mock handler for `GET /api/recipes/:id/status` that returns `{ id, name: 'Mock Recipe', status: 'ready', imageCount: 1 }` by default.

**C2.** Update `pwa/e2e/home-race.spec.ts`:  
- In `beforeEach`: update the `family_goto` mock to return `{ description: 'Our Family Spaghetti', recipeId: MOCK_IDS.RECIPE_LASAGNA }` (no `status`).  
- Add a mock for `GET /api/recipes/MOCK_IDS.RECIPE_LASAGNA/status` returning `{ status: 'ready' }`.  
- Tests should otherwise pass unchanged — "Confirm GOTO" enabled state is now driven by the recipe status mock, not the settings value.

**C3.** Update any other E2E test that sets `status: 'ready'` or `status: 'pending'` in the `family_goto` mock value:  
- Remove `status` from the settings mock value.  
- Add or update the `GET /api/recipes/{id}/status` mock to return the intended state (`'ready'` or `'pending'`).

**C4.** Add E2E test: "Pending GOTO polls until ready":  
- Mock `GET /api/recipes/{id}/status` to return `'pending'` on first call, `'ready'` on second.  
- Assert spinner visible initially, then "Confirm GOTO" enabled after poll interval resolves.

**C5.** Run `npx playwright test e2e/home-race.spec.ts e2e/home-recovery.spec.ts` — all pass.  
**C6.** Run `task review` — formatting, linting, type-check, full suite clean.

---

## Definition of Done

- [ ] No production code references `MarkGotoReadyProcessor` or reads `status` from the `family_goto` settings value.
- [ ] `RecipeReadyProcessor` does not touch `family_settings`.
- [ ] `HomeCommandCenter` and `FamilyGOTOSettings` derive readiness from `GET /api/recipes/{id}/status`.
- [ ] Both components poll while `status === 'pending'` and stop on `'ready'` or unmount.
- [ ] `task agent:drift` passes — zero schema drift.
- [ ] `task review` passes — formatting, linting, type-check, full suite green.
