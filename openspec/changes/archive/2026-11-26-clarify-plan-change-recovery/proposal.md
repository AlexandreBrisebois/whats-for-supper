# Proposal

## Why

When a household supper plan changes mid-replacement or when someone opens a completed or voting supper in recipe detail, the current UI leaves them confused about what happened and what to do next:

- In `SkipRecoveryDialog` (`pwa/src/components/home/SkipRecoveryDialog.tsx`), a changed-plan conflict (`replacementSession.ts` `phase === 'conflict'`) repeats `Your plan changed` without naming the affected day or whether anything was saved, displays the unsaved replacement recipe under `Your new meal`, and offers only `Review plan` — which drops the chosen recipe and lands on `/planner` without focusing the affected day (`usePlanningConfirmation.ts` only scrolls/highlights when `success=1` is present). When triggered from Planner (`pwa/src/app/(app)/planner/page.tsx`), `recovery.review()` also invokes `onClosed` before `onReview`, briefly re-opening `RecipeDetailSheet` while navigating.
- In `RecipeDetailSheet` (`pwa/src/components/recipes/RecipeDetailSheet.tsx`), completed (`status === 2`) and voting (`status === 4`) targets share one error-styled banner (`Review this completed or voting supper in Planner.`) with a single `Review plan` button, forcing the person to guess whether the meal was already cooked or is still in voting and offering no direct way to schedule the recipe on another day.

## Outcome and Scope

Households encountering a changed-plan conflict or inspecting a completed/voting supper in recipe detail can immediately see:

1. **Exact state and date**: which day is affected, whether anything was saved, and whether the day is already cooked or still in household voting.
2. **Clear next actions without a dead end**: a direct way to keep the chosen meal in hand and pick a day via `PlanningDayChooser`, plus a clear dated link to that exact day in Planner.
3. **Focused Planner landing**: opening Planner from these review paths scrolls to and briefly focuses/highlights the targeted day card without showing a false save-success receipt.

**Exclusions / non-goals**:

- No backend API, database, or OpenAPI contract changes.
- No change to guarded `requireEmpty` assignment, post-disposition abandon confirmation, or existing completed/voting immutability invariants.
- No separate persistence/retry framework.

## What Changes

- **Plan B changed-plan conflict clarity and meal preservation** (`SkipRecoveryDialog` across Home, Planner, and Recipes):
  - Display the affected day in conflict feedback and explicitly state that nothing was saved when the conflict occurred before disposition/save; relabel the pending recipe card from `Your new meal` to `Not saved yet` in unsaved states.
  - Offer **`Choose a day for this meal`** as the primary action (opening `PlanningDayChooser` on the captured week with fresh schedule data while retaining the selected recipe) and **`Open <Day> in Planner`** as the secondary action.
  - Preserve existing post-disposition abandon confirmation when leaving after an original meal was already moved or removed.
- **Distinct completed vs. voting states in Recipe Detail** (`RecipeDetailSheet`, `planner/page.tsx`, `RecipesExperience.tsx`):
  - Replace the combined error-styled `Review this completed or voting supper in Planner.` banner with calm neutral status messaging (`role="status"`) split by state:
    - Completed (`status === 2`): `"Already cooked on <Day>."` with primary **`Plan for another day`** (opens `PlanningDayChooser` retaining the recipe) and secondary **`Open <Day> in Planner`**.
    - Voting (`status === 4`): `"Your household is still voting on <Day>."` with primary **`Open voting in Planner`** and secondary **`Plan for another day`**.
  - Keep existing error-alert styling (`role="alert"`) reserved for actual read/plan-changed errors (`retry`, `review` mismatch).
- **Focused Planner review landing** (`planner/page.tsx`, `useReplacementRecovery.ts`):
  - Honor `?dayIndex=` (with `weekOffset` and `referenceWeekStartDate`) on `/planner` even without `success=1` by scrolling to and briefly highlighting/focusing `day-card-<dayIndex>`, without creating a routine save-success banner.
  - Distinguish dismissal from review/day-chooser departure in `useReplacementRecovery` so `Open <Day> in Planner` and `Choose a day for this meal` in Planner do not briefly reopen `RecipeDetailSheet`.
- **Bilingual EN/FR copy & Era 3 accessibility**: Update `pwa/src/locales/en/common.json` and `pwa/src/locales/fr/common.json` using Standard AA / High Contrast AAA Era 3 tokens and `>= 48 CSS px` button targets.

## Capabilities

### New Capabilities

<!-- No new capability needed; this change refines existing meal-assignment behavior. -->

### Modified Capabilities

- `meal-assignment`: Clarify changed-plan conflict state and meal-preserving recovery in `SkipRecoveryDialog`, separate completed vs. voting guidance and another-day planning in `RecipeDetailSheet`, and focus the targeted day when opening Planner for review.

## Impact

- **UI components & hooks**: `pwa/src/components/home/SkipRecoveryDialog.tsx`, `pwa/src/components/recipes/RecipeDetailSheet.tsx`, `pwa/src/lib/planner/useReplacementRecovery.ts`, `pwa/src/app/(app)/planner/page.tsx`, `pwa/src/app/(app)/recipes/RecipesExperience.tsx`, `pwa/src/components/home/HomeCommandCenter.tsx`.
- **Localization**: `pwa/src/locales/en/common.json`, `pwa/src/locales/fr/common.json`.
- **Verification**: Unit tests (`SkipRecoveryDialog.test.tsx`, `useReplacementRecovery.test.tsx`, `RecipeDetailSheet.test.tsx`, `planner/page.test.tsx`, `recipes/page.test.tsx`, `HomeCommandCenter.test.tsx`), visual contract tests (`visual-contract.test.ts`, `tokens.test.ts`), and Playwright E2E specs (`recipe-recovery.spec.ts`, `tomorrow-push.spec.ts`, `unified-recipes.spec.ts`, `supper-servings-context.spec.ts`).
