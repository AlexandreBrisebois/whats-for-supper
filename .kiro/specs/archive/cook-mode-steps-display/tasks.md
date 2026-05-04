# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - HowToSection[] type representation gap
  - **CRITICAL**: This task documents the type-level bug — the `as any` cast in the original test was a workaround for an inaccurate type declaration
  - **Investigation Finding**: TypeScript's structural subtyping means HowToSection[] IS assignable to Array<{ name?: string; text?: string }> — no compile error occurs when `as any` is removed. The bug is a type representation gap, not a compile-time error.
  - **GOAL**: Surface the counterexample that demonstrates the bug: the `as any` cast in `step-parser.spec.ts` line 41 acknowledged the type was wrong, even though TypeScript accepted the call via structural subtyping
  - In `pwa/e2e/step-parser.spec.ts`, remove the `as any` cast from the existing `HowToSection` test (line 41: `parseRecipeSteps(input as any)` → `parseRecipeSteps(input)`)
  - Confirm TypeScript compilation passes (structural subtyping accepts the call) — this is expected
  - Add a new test using the exact shape from `data/recipes/3fe040b3-29e8-4e26-90b6-1401c0bf3d03/recipe.json` (3 `HowToSection` objects: "Spaghetti Preparation" with 3 steps, "Garlic Bread Preparation" with 4 steps, "Serving" with 1 step = 8 total) — assert `result.length === 8`
  - Document the actual bug condition: `Recipe.recipeInstructions` is typed as `string[] | Array<{ name?: string; text?: string }>` but at runtime holds `HowToSection[]` — the type system cannot express or validate the actual runtime shape
  - Mark task complete when test is written, run, and the type representation gap is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-HowToSection Inputs Unchanged
  - **IMPORTANT**: Follow observation-first methodology — run UNFIXED code with non-buggy inputs and record actual outputs
  - Observe: `parseRecipeSteps(['Chop onions', 'Sauté until golden'])` returns 2 steps on unfixed code (existing test confirms this)
  - Observe: `parseRecipeSteps([{ name: 'Prep', text: 'Chop onions' }])` returns 1 step on unfixed code (existing test confirms this)
  - Observe: `parseRecipeSteps([])` and `parseRecipeSteps(undefined)` return `[]` on unfixed code (existing test confirms this)
  - In `pwa/e2e/step-parser.spec.ts`, add a property-based test block using `fast-check` (already available in the pwa dev dependencies — verify with `pwa/package.json`; if absent, install with `pnpm add -D fast-check` in `pwa/`)
  - Write property: for all non-empty `string[]` inputs (arbitrary strings, filtered to non-empty after trim), `parseRecipeSteps` returns exactly as many steps as there are non-empty trimmed strings — from Preservation Requirements in design
  - Write property: for all `Array<{ name?: string; text?: string }>` inputs (no `itemListElement`), `parseRecipeSteps` returns exactly as many steps as there are entries with non-empty `text` or `name` — from Preservation Requirements in design
  - Write property: for `undefined` and `[]`, `parseRecipeSteps` always returns `[]`
  - Run `task gate` on UNFIXED code — **EXPECTED OUTCOME**: preservation tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 3. Fix: widen type signatures and update mock data

  - [x] 3.1 Implement the type fix — two type declaration changes, zero logic changes
    - In `pwa/src/lib/api/recipes.ts`: change `recipeInstructions?: string[] | Array<{ name?: string; text?: string }>` to `recipeInstructions?: unknown[]` on the `Recipe` interface
    - In `pwa/src/lib/cooking/stepParser.ts`: change the `parseRecipeSteps` parameter from `recipeInstructions?: string[] | Array<{ name?: string; text?: string }>` to `recipeInstructions?: unknown[]`
    - No changes to `mapToRecipe`, `unwrapUntypedNode`, `CooksMode.tsx`, or any runtime logic
    - _Bug_Condition: isBugCondition(input) — input is Array AND input[0] has `itemListElement` AND TypeScript type does NOT include HowToSection[] AND parseRecipeSteps(input) returns []_
    - _Expected_Behavior: parseRecipeSteps(howToSectionArray).length > 0 AND every step has non-empty instruction AND step count equals total HowToStep entries with non-empty text_
    - _Preservation: all inputs where isBugCondition is false (string[], flat HowToStep[], undefined, null, []) produce byte-for-byte identical results before and after the fix_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

  - [x] 3.2 Update mock data to use real HowToSection[] shape
    - In `pwa/e2e/realistic-recipes.ts`: add a new `RECIPE_SPAGHETTI` entry using `MOCK_IDS.RECIPE_LASAGNA` (or add a new `RECIPE_SPAGHETTI` key to `mock-ids.ts`) with `recipeInstructions` set to the exact `HowToSection[]` shape from `data/recipes/3fe040b3-29e8-4e26-90b6-1401c0bf3d03/recipe.json` — 3 sections, 8 steps total — **without** `as any`
    - In `pwa/e2e/mock-api.ts`: update the default `builders.recipe()` fallback `recipeInstructions` to use a real `HowToSection[]` shape (remove the `as any` cast); this ensures any test that uses the default builder exercises the real data path
    - The existing `REALISTIC_RECIPES` entries for `RECIPE_CARBONARA` and `RECIPE_CHICKEN` use flat `HowToStep[]` with `as any` — update them to remove the `as any` cast now that the type is `unknown[]`
    - _Requirements: 2.2, 3.4_

  - [x] 3.3 Add e2e cook mode test with HowToSection recipe
    - In `pwa/e2e/home-recipe.spec.ts` (or a new `pwa/e2e/cook-mode-steps.spec.ts`), add a test that:
      1. Mocks `GET /api/recipes/{id}` to return the `RECIPE_SPAGHETTI` entry (with `HowToSection[]` instructions)
      2. Mocks the schedule so today's slot has that recipe
      3. Navigates to `/home`, opens Cook's Mode via `cook-mode-btn`
      4. Asserts that the step counter shows more than 1 step (i.e., real steps are displayed, not just the ingredients screen)
      5. Clicks `cooks-mode-step-next` and asserts the step text matches one of the known `HowToStep` instructions from the fixture (e.g., "Bring a large pot of salted water to a boil")
    - This test will FAIL before the fix (only ingredients shown) and PASS after — serving as the regression guard
    - Also add a planner cook mode variant: mock the planner schedule, open Cook's Mode from the planner, and assert the same step visibility
    - _Requirements: 2.2, 3.4_

  - [x] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - HowToSection[] Input Produces Non-Empty Steps
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The test from task 1 (with `as any` removed) now encodes the expected behavior
    - Run `task gate` — the TypeScript error from task 1 should be gone; the `HowToSection` test and the real-recipe test (3 sections, 8 steps) should both PASS
    - **EXPECTED OUTCOME**: Tests PASS (confirms bug is fixed — `isHowToSection` branch is now reachable without a cast)
    - _Requirements: 2.1, 2.3_

  - [x] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-HowToSection Inputs Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run `task gate` — all preservation property tests must still pass
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions — string[], flat HowToStep[], undefined, and [] inputs are unaffected)
    - Confirm all existing tests in `step-parser.spec.ts` still pass without modification (other than the `as any` removal from task 1)

- [x] 4. Checkpoint — Ensure all tests pass
  - Run `task agent:drift` — confirm zero schema drift (type widening on `Recipe.recipeInstructions` must not introduce drift against the OpenAPI contract)
  - Run `task gate` — lint, typecheck, and all impacted tests must pass
  - Run `task review` — full pre-merge review must pass
  - Ensure all tests pass; ask the user if questions arise
