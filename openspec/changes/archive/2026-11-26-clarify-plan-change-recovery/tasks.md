# Tasks

## 1. Conflict clarity and departure handling in `SkipRecoveryDialog` and `useReplacementRecovery`

**Outcome and scenarios:** Pre-commit changed-plan conflict names the affected date, states that nothing was saved yet, labels the pending recipe `Not saved yet`, offers `Choose a day for this meal` (primary) and `Open <Day> in Planner` (secondary), and `useReplacementRecovery` distinguishes dismissal from review/day-chooser departure (`specs/meal-assignment/spec.md` → `Preserve completed replacement stages across callers` / `Pre-commit changed-plan conflict preserves the chosen meal`).
**Owners and boundaries:** `pwa/src/locales/en/common.json`, `pwa/src/locales/fr/common.json`, `pwa/src/components/home/SkipRecoveryDialog.tsx`, `pwa/src/lib/planner/useReplacementRecovery.ts`. No backend or OpenAPI changes.
**Dependencies and prerequisites:** Settled copy keys in `design.md`.
**Acceptance boundary:** Unit tests with mocked locales/API verifying pre-commit vs. post-disposition conflict UI and departure callbacks.

- [x] 1.1 Update/add unit tests in `pwa/src/components/home/SkipRecoveryDialog.test.tsx` and `pwa/src/lib/planner/useReplacementRecovery.test.tsx` asserting pre-commit conflict date/unsaved label, `Choose a day for this meal` + `Open <Day> in Planner` actions, preserved post-disposition abandon confirmation, and `onClosed` departure reason (`'dismiss'` vs `'review'`/`'chooseDay'`). Run `task test:unit -- src/components/home/SkipRecoveryDialog.test.tsx src/lib/planner/useReplacementRecovery.test.tsx` and observe expected failure before editing source.
- [x] 1.2 Add EN/FR keys in `pwa/src/locales/en/common.json` and `pwa/src/locales/fr/common.json`; update `pwa/src/components/home/SkipRecoveryDialog.tsx` (`onChooseAnotherDay`, dated unsaved conflict copy, `Not saved yet` card label, Era 3 `<Button>` actions) and `pwa/src/lib/planner/useReplacementRecovery.ts` (`chooseDay` + explicit departure reason). Run `task test:unit -- src/components/home/SkipRecoveryDialog.test.tsx src/lib/planner/useReplacementRecovery.test.tsx` and confirm green.

## 2. Distinct completed vs. voting states and another-day action in `RecipeDetailSheet`

**Outcome and scenarios:** `RecipeDetailSheet` separates `status === 2` (Cooked) and `status === 4` (AwaitingConsensus/voting) into calm neutral dated status messages with `Plan for another day` and dated Planner review actions, without resetting completion/consensus or adding change arrows to confirmed Planned occurrences (`specs/meal-assignment/spec.md` → `Avoid reassigning an identical dated meal`).
**Owners and boundaries:** `pwa/src/components/recipes/RecipeDetailSheet.tsx`, `pwa/src/app/(app)/planner/page.tsx`, `pwa/src/app/(app)/recipes/RecipesExperience.tsx`.
**Dependencies and prerequisites:** Task 1 locale keys.
**Acceptance boundary:** Unit tests against `RecipeDetailSheet`, `planner/page`, and `RecipesExperience` with mocked schedule/recipe APIs.

- [x] 2.1 Add/update tests in `pwa/src/components/recipes/RecipeDetailSheet.test.tsx`, `pwa/src/app/(app)/planner/page.test.tsx`, and `pwa/src/app/(app)/recipes/page.test.tsx` verifying neutral `role="status"` messaging and primary/secondary actions for `status === 2` vs `status === 4`, while keeping `role="alert"` for read/plan-changed errors. Run `task test:unit -- src/components/recipes/RecipeDetailSheet.test.tsx src/app/\(app\)/planner/page.test.tsx src/app/\(app\)/recipes/page.test.tsx` and observe expected failure.
- [x] 2.2 Implement `planningMessageTone` and secondary footer action support in `pwa/src/components/recipes/RecipeDetailSheet.tsx`; split `status === 2` vs `status === 4` in `pwa/src/app/(app)/planner/page.tsx` (`detailReview.kind`) and `pwa/src/app/(app)/recipes/RecipesExperience.tsx` (`targetCompleted` vs `targetVoting`). Re-run the targeted unit test command and confirm green.

## 3. Meal-preserving `PlanningDayChooser` recovery across Recipes, Planner, and Home

**Outcome and scenarios:** Activating `Choose a day for this meal` (from `SkipRecoveryDialog` conflict) or `Plan for another day` (from completed/voting `RecipeDetailSheet`) opens `PlanningDayChooser` on fresh schedule data while retaining the chosen recipe across `RecipesExperience`, `planner/page.tsx`, and `HomeCommandCenter` (`specs/meal-assignment/spec.md` → `Preserve completed replacement stages across callers`, `Avoid reassigning an identical dated meal`).
**Owners and boundaries:** `pwa/src/app/(app)/recipes/RecipesExperience.tsx`, `pwa/src/app/(app)/planner/page.tsx`, `pwa/src/components/home/HomeCommandCenter.tsx`, reusing `pwa/src/components/recipes/PlanningDayChooser.tsx` and `pwa/src/lib/planner/slotAssignment.ts`.
**Dependencies and prerequisites:** Tasks 1 and 2.
**Acceptance boundary:** Unit tests covering each caller's `PlanningDayChooser` handoff and Playwright recovery/recipe specs using stateful browser mock routes (`GET /api/schedule`, `POST /api/schedule/assign`, `POST /api/schedule/move`, `POST /api/schedule/defer`, `DELETE /api/schedule/{date}`).

- [x] 3.1 Add unit tests in `pwa/src/app/(app)/recipes/page.test.tsx`, `pwa/src/app/(app)/planner/page.test.tsx`, and `pwa/src/components/home/HomeCommandCenter.test.tsx` covering `Choose a day for this meal` and `Plan for another day` retaining the recipe through `PlanningDayChooser` selection; observe expected failure.
- [x] 3.2 Wire `onChooseAnotherDay` and `Plan for another day` into `PlanningDayChooser` in `pwa/src/app/(app)/recipes/RecipesExperience.tsx`, `pwa/src/app/(app)/planner/page.tsx`, and `pwa/src/components/home/HomeCommandCenter.tsx`. Re-run unit tests and confirm green.

## 4. Focused Planner review landing without false success receipt

**Outcome and scenarios:** Opening `/planner?dayIndex=...&weekOffset=...&referenceWeekStartDate=...` without `success=1` scrolls to and briefly focuses/highlights `day-card-<dayIndex>` once the matching week renders, without showing a save confirmation banner; reviewing from a Planner conflict closes recovery without reopening `RecipeDetailSheet` (`specs/meal-assignment/spec.md` → `Focus the targeted day when opening Planner for review`).
**Owners and boundaries:** `pwa/src/app/(app)/planner/page.tsx`, `pwa/src/lib/planner/useReplacementRecovery.ts` caller integration.
**Dependencies and prerequisites:** Task 1 (`onClosed` departure reason).
**Acceptance boundary:** `planner/page.test.tsx` unit checks + Playwright browser verification.

- [x] 4.1 Add tests in `pwa/src/app/(app)/planner/page.test.tsx` asserting `?dayIndex=` without `success=1` scrolls/focuses/highlights `day-card-<dayIndex>` without a success banner, and `onReview` from `SkipRecoveryDialog` does not reopen `RecipeDetailSheet`. Observe expected failure.
- [x] 4.2 Implement focused `reviewDay` scroll/focus/highlight handling and `'dismiss'`-only `RecipeDetailSheet` reopen guard in `pwa/src/app/(app)/planner/page.tsx`; re-run `task test:unit -- src/app/\(app\)/planner/page.test.tsx` and confirm green.

## 5. E2E regression, visual/a11y verification, and final validation

**Outcome and scenarios:** Updated unit, Playwright E2E, visual-contract, and Standard AA + High Contrast AAA accessibility checks pass across affected recovery and recipe-detail flows.
**Owners and boundaries:** `pwa/e2e/recipe-recovery.spec.ts`, `pwa/e2e/tomorrow-push.spec.ts`, `pwa/e2e/unified-recipes.spec.ts`, `pwa/e2e/supper-servings-context.spec.ts`, `pwa/e2e/tonight-replacement-recovery.spec.ts`, `pwa/src/test/visual-contract.test.ts`, `pwa/src/test/tokens.test.ts`.
**Dependencies and prerequisites:** Tasks 1–4.
**Acceptance boundary:** Mocked Playwright specs (`pwa/e2e/`), Vitest visual contract tests, and `task verify` over the complete task-owned changed-path set.

- [x] 5.1 Update affected E2E assertions and add meal-preserving conflict + completed/voting `RecipeDetailSheet` + Planner `?dayIndex=` focus coverage in `pwa/e2e/recipe-recovery.spec.ts`, `pwa/e2e/tomorrow-push.spec.ts`, `pwa/e2e/unified-recipes.spec.ts`, `pwa/e2e/supper-servings-context.spec.ts`, and `pwa/e2e/tonight-replacement-recovery.spec.ts`; run `task test:e2e -- recipe-recovery.spec.ts tomorrow-push.spec.ts unified-recipes.spec.ts supper-servings-context.spec.ts tonight-replacement-recovery.spec.ts`.
- [x] 5.2 Run `task test:unit -- src/test/visual-contract.test.ts src/test/tokens.test.ts` and verify Standard AA + High Contrast AAA visual/a11y checks (`>= 48 CSS px` targets and contrast) via `assertCookbookVisualA11y` / Playwright or Chrome DevTools inspection.
- [x] 5.3 Reconcile scenario acceptance, review the complete task-owned diff, and run `task verify` with the complete reviewed changed-path set.
