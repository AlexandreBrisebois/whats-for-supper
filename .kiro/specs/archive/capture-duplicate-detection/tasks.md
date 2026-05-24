# Tasks Document: Duplicate Recipe Capture Prevention

This tasks document outlines the sequential waves of work required to implement duplicate recipe detection in the WFS PWA.

## Wave 1: API Seams & Backend Filter Implementation (TDD)

### 1. [x] API Contract Update
Update `specs/openapi.yaml`:
- Add `id` as optional parameter to `GET /api/recipes`.
- Add `name` and `url` as optional parameters to `GET /api/recipes`.
- Add `recipeId` field to `RecipeShareInfoDto` schema.
_Requirements: AC 1.1, AC 1.2, AC 1.3, AC 2.1_

### 2. [x] Backend Controller & Service tests (TDD - Red)
Before writing implementation code, add tests in:
- `api/src/RecipeApi.Tests/Controllers/RecipeControllerTests.cs` (or `RecipeServiceTests.cs`):
  - `GetRecipesList_FilterById_ReturnsMatch`
  - `GetRecipesList_FilterByName_ReturnsCaseInsensitiveMatch`
  - `GetRecipesList_FilterByUrl_ReturnsMatch`
  - `GetRecipesList_IgnoresSoftDeletedDuplicates`
  - `GetRecipesList_IgnoresNotReadyDuplicates`
- `api/src/RecipeApi.Tests/Services/RecipeServiceTests.cs`:
  - `ExportRecipeShareBundle_PopulatesRecipeId`
  - `ImportRecipeShareBundle_UsesOriginalRecipeId_WhenNotDuplicate`
  - `ImportRecipeShareBundle_GeneratesNewGuid_WhenDuplicateIdExists`
- Verify tests fail (Red state).
_Requirements: AC 1.4, AC 1.5, AC 1.6, AC 1.7, AC 1.8, AC 2.1, AC 2.6_

### 3. [x] Implement GET /api/recipes filtering & GUID preservation (Green)
- Update `RecipeService.GetRecipesList` to query on `id`, `name`, and `url` parameters.
- Update `RecipeController.List` to receive parameters from query and pass them to the service.
- Update `RecipeService.ExportRecipeShareBundle` to write `recipeId` to `RecipeShareInfoDto`.
- Update `RecipeService.ImportRecipeShareBundle` to use `bundle.Info.RecipeId` as the primary key `recipeId` if not already present, or generate a new `Guid` if a collision is found.
- Verify tests compile and pass (Green state).
- Run `task agent:drift` and verify zero drift.

---

## Wave 2: PWA Model Synchronization

### 4. [x] Regrow the TypeScript API Client
Run the API client code generation from the root:
```bash
task agent:reconcile
```
Verify that `apiClient.api.recipes.get` accepts `id`, `name`, and `url` in its query params.
Verify that `RecipeShareInfoDto` includes the `recipeId` property.

---

## Wave 3: PWA Frontend Tests (TDD - Red)

### 5. [x] Write PWA Unit & E2E Tests first (Red)
Before making changes to the UI code, add failing test specifications to `pwa/src/components/capture/MinimalCapture.recipe-import.test.tsx` (and `pwa/e2e/capture-flow.spec.ts` if needed):
- **File Import Duplicate**: Test that selecting a `.recipe` file that already exists displays the warning banner (`duplicate-recipe-warning`), and clicking "View existing recipe" triggers the `RecipeDetailSheet` overlay.
- **URL Capture Duplicate**: Test that typing a duplicate URL displays the warning banner.
- **Describe Capture Duplicate**: Test that typing a duplicate recipe name displays the warning banner.
- **Photo Success Duplicate**: Test that when `readyRecipeName` is set and a duplicate exists, the warning banner and "Discard duplicate" button are shown.
- **Discard Duplicate Action**: Test that clicking "Discard duplicate" deletes the recipe via the API, shows a toast, and redirects to home.
- Run `npm run test:unit` inside `pwa/` (or `task gate`) and verify that all these new tests fail cleanly (Red state).
_Requirements: AC 2.2, AC 2.3, AC 2.4, AC 2.5, AC 2.6, AC 3.1–3.4, AC 4.1–4.4, AC 5.1–5.6_

---

## Wave 4: PWA Implementation & Warning Banners (Green)

### 6. [x] MinimalCapture.tsx state & imports
- Import `RecipeDetailSheet` from `@/components/recipes/RecipeDetailSheet`.
- Declare state hooks:
  - `duplicateRecipeId`: `string | null`
  - `fileDuplicate`, `urlDuplicate`, `describeDuplicate`, `photoDuplicate`: `RecipeDto | null`
  - `isDiscardingDuplicate`: `boolean` (loading state for deleting the newly created duplicate)
- Render `RecipeDetailSheet` drawer when `duplicateRecipeId` is non-null.

### 7. [x] File Import Duplicate Detection
- In `handleRecipeBundleFileChange`:
  - If `parsed.info.recipeId` is present, check by ID first: call `apiClient.api.recipes.get({ query: { id: parsed.info.recipeId } })`.
  - If no match found or GUID missing, check by name: call `apiClient.api.recipes.get({ query: { name: parsed.recipe.name } })`.
- If a match is found, update `fileDuplicate`.
- Render the `duplicate-recipe-warning` banner in the preview card with a `view-existing-recipe-btn` button.
- Clear `fileDuplicate` when Cancelling/Rejecting the bundle.
_Requirements: AC 2.2, AC 2.3, AC 2.4, AC 2.5, AC 2.6_

### 8. [x] URL Capture Duplicate Detection
- Add a 500ms debounced effect checking `urlInput`.
- Call the API `apiClient.api.recipes.get({ query: { url: urlInput.trim() } })`.
- If a match is found, update `urlDuplicate`.
- Render the warning banner in the URL capture panel with a `view-existing-recipe-btn` button.
- If the user cancels URL capture, clear `urlDuplicate` and reset inputs.
_Requirements: AC 3.1, AC 3.2, AC 3.3, AC 3.4_

### 9. [x] Describe Capture Duplicate Detection
- Add a 500ms debounced effect checking `describeName`.
- Call the API `apiClient.api.recipes.get({ query: { name: describeName.trim() } })`.
- If a match is found, update `describeDuplicate`.
- Render the warning banner below the name input field in describe form.
- If the user cancels the form, clear `describeDuplicate`.
_Requirements: AC 4.1, AC 4.2, AC 4.3, AC 4.4_

### 10. [x] Photo/Gallery Capture Duplicate Detection & Success Screen Recovery
- In the SSE subscription effect, once `readyRecipeName` is updated, call the API `apiClient.api.recipes.get({ query: { name: readyRecipeName } })`.
- Filter out `pendingRecipeId` from the results (to avoid false-positive duplicate check against itself).
- If a match is found, update `photoDuplicate`.
- Render the warning banner on the final Success Screen.
- Add a "Discard duplicate" button (`discard-duplicate-btn`) on the success screen when `photoDuplicate` is set.
- Implement the "Discard duplicate" click handler:
  - Set `isDiscardingDuplicate = true`.
  - Call `apiClient.api.recipes.item(pendingRecipeId).delete()`.
  - Trigger toast "Duplicate recipe discarded." using `addToast` from `useUiStore`.
  - Redirect Mom to Home command center (`/`).
- Verify all PWA unit and E2E tests pass (Green state).
_Requirements: AC 5.1, AC 5.2, AC 5.3, AC 5.4, AC 5.5, AC 5.6_

---

## Wave 5: Verification & Review

### 11. [x] Checkpoint & Review
Run:
```bash
task gate
task review
```
Verify zero lint, compile, or test failures.
