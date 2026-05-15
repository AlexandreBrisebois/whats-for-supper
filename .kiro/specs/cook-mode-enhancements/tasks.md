# Cook's Mode Enhancements - Tasks

## Phase 1: The API Seam (B1)
- [x] **TEST**: Create `RecipeApi.Tests` for `PATCH /api/recipes/{id}` with instructions (RED).
- [x] **CONTRACT**: Add `recipeInstructions` to `UpdateRecipeDto` in `openapi.yaml`.
- [x] **CLIENT**: Regenerate PWA API client.
- [x] **BACKEND**: Update `RecipeService.cs` to merge instructions into `RawMetadata`.
- [x] **VERIFY**: Run API tests (GREEN).

## Phase 2: Navigation & Cleanup (B2, B3) [DONE]
- [x] **TEST**: Update E2E tests for `BrowseAllStack` to verify clustered header and removed search (GREEN).
- [x] **PWA**: Reorder and cluster buttons in `browse-all-stack/page.tsx`.
- [x] **PWA**: Remove library link from `recipes/page.tsx`.
- [x] **PWA**: Remove share button from `StackActionBar.tsx`.
- [x] **VERIFY**: Run E2E tests (GREEN).

## Phase 3: High-Focus Entry Points (B4) [DONE]
- [x] **TEST**: Update `RecipeDetailSheet.test.tsx` to verify "COOK" buttons exist (RED).
- [x] **PWA**: Add "COOK" pill to hero image in `RecipeDetailSheet.tsx`.
- [x] **PWA**: Add icon beside time pill in `RecipeDetailSheet.tsx`.
- [x] **VERIFY**: Run PWA unit tests (GREEN).

## Phase 4: Cook's Mode Redesign (B5.1) [DONE]
- [x] **TEST**: Update `CooksMode.test.tsx` to verify left-alignment and header changes (GREEN).
- [x] **PWA**: Update `CooksMode.tsx` layout (left-align, single title, larger image).
- [x] **VERIFY**: Run PWA unit tests (GREEN).

## Phase 5: Micro-Editing (B5.2) [DONE]
- [x] **TEST**: Add `CooksMode.test.tsx` case for editing a step and saving (GREEN).
- [x] **PWA**: Implement editing UI and `save-on-blur` logic in `CooksMode.tsx`.
- [x] **VERIFY**: Final full-stack verification (GREEN).

## Phase 6: Stability & Regression Fixes [DONE]
- [x] **FIX**: Update `RecipesPage.test.tsx` with `AnimatePresence` export in `framer-motion` mock (GREEN).
- [x] **VERIFY**: Run full unit test suite via `task test:unit` (GREEN).
- [x] **VERIFY**: Run E2E tests for recipes flow (GREEN).
