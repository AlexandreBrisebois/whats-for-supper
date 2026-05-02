# WORKSTREAM: home-recipe-selection-race-fix

Model-Label: SMALL_SAFE
Why-This-Model: Single file, two missing lines, existing `setCurrentRecipe` pattern already in use, failing E2E tests already written and ready to gate the fix.
Launch-Targets: Kiro, Antigravity, Claude
Owner-Skill: pwa-component

## Objective

Add optimistic `setCurrentRecipe(recipe)` calls in `handleQuickFindSelect` and `onConfirmGoto` so `TonightMenuCard` renders immediately when the user selects a recipe — before `router.refresh()` re-hydrates SSR props.

## Scope

TARGET:
- `pwa/src/components/home/HomeCommandCenter.tsx`
- `pwa/e2e/home-race.spec.ts` — may need corrections (see TDD Gate below)

FORBIDDEN:
- `pwa/src/app/(app)/home/page.tsx`
- `pwa/src/components/home/TonightPivotCard.tsx`
- `pwa/src/lib/api/planner.ts`
- Any file not listed in TARGET

## Required Context

Load the vertical slice first:

```
task agent:slice -- /api/schedule/assign
```

Then read:
- `pwa/src/components/home/HomeCommandCenter.tsx` — full file
- `pwa/e2e/home-race.spec.ts` — understand what the tests assert before touching any code

Key seams in `HomeCommandCenter.tsx`:
- `currentRecipe` state: `useState<ScheduleRecipeDto | null | undefined>(todaysRecipe)` (~line 31)
- `handleQuickFindSelect(recipe: any)` (~line 174) — async handler, calls `assignRecipeToDay` then `router.refresh()`
- `onConfirmGoto` callback (~line 199) — inside `if (gotoRecipeId)` branch, calls `assignRecipeToDay(…).then(() => router.refresh())`
- `setIsSkipped(false)` in `handleQuickFindSelect` — follow this exact pattern for the new `setCurrentRecipe` call

## Task

1. In `handleQuickFindSelect`, add `setCurrentRecipe(recipe)` as the **first statement** of the function body, before `await assignRecipeToDay(…)`. Cast to `ScheduleRecipeDto` if TypeScript requires it.
2. In the `onConfirmGoto` callback (inside `if (gotoRecipeId)`), add `setCurrentRecipe({ id: gotoRecipeId, name: gotoDescription ?? '', image: '' })` before `assignRecipeToDay(…).then(…)`.
3. Do not move, remove, or reorder any other statements.

Implement ONLY this task.
Do NOT refactor unrelated code.

## TDD Gate

Two tests exist in `pwa/e2e/home-race.spec.ts` that are intended to gate this fix:
- `'Selecting a recipe from QuickFind shows the menu card immediately (optimistic)'`
- `'Confirming GOTO shows the menu card immediately (optimistic)'`

**Before touching `HomeCommandCenter.tsx`, audit `home-race.spec.ts` for correctness:**

Cross-check every assertion against the real components:
- `QuickFindModal` (`pwa/src/components/planner/QuickFindModal.tsx`) fetches recipes via `getFillTheGap` → `GET /api/schedule/fillTheGap`. It has **no search input**. It is a flip-card carousel.
  - The spec currently mocks `/api/recipes` and uses `getByPlaceholder(/search/i)` — these do not exist in the component. This is wrong.
- Verify every `data-testid` in the spec exists in the real component. The known good ones: `tonight-pivot-card`, `tonight-menu-card`, `confirm-goto-btn`, `discover-btn`, `quick-find-modal`, `quick-find-select`.
- Verify the mock for `GET /api/schedule/fillTheGap` (not `/api/recipes`) is present and returns a valid `RecipeDto[]` matching `MOCK_IDS` and `builders`.
- Verify the interaction sequence matches the carousel UX: the user does not search; they tap through cards and hit `quick-find-select`.

**If the spec has errors:**
Stop. Do not implement `HomeCommandCenter.tsx`. Produce a diff of the required corrections to `home-race.spec.ts` and present it to the human for approval before proceeding.

**Once the spec is confirmed correct (or corrected with approval):**
1. Run `task agent:test:impact` — confirm both tests fail before any code change.
2. Apply the two-line fix described in Task above.
3. Run `task agent:test:impact` again — both tests must pass.

## Verification

```
task agent:drift
task agent:test:impact
task review
```

All three must pass before declaring done.

## Escalate If

- The E2E spec audit reveals errors that go beyond correcting the mock route and interaction sequence — stop and present findings to the human
- `ScheduleRecipeDto` type is incompatible with the `recipe` argument and a type fix would require changes outside `HomeCommandCenter.tsx`
- Any file outside TARGET needs edits to satisfy the TypeScript compiler
- Unrelated tests fail after the change
- The E2E tests pass but `task review` reports type or lint errors

## Micro-Handover

- Changed files
- Tests run and results (`task agent:test:impact` output)
- Deviations from Task
- Risks / drift discovered
