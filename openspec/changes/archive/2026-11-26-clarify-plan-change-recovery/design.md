# Design

## Context and Existing Ownership

This change spans the existing client-side planning conflict and recipe-detail review seams with no backend or OpenAPI modifications:

1. **Plan B changed-plan conflict (`SkipRecoveryDialog`)**:
   - Owned by `pwa/src/components/home/SkipRecoveryDialog.tsx` and driven by `pwa/src/lib/planner/replacementSession.ts` + `pwa/src/lib/planner/useReplacementRecovery.ts` (for `pwa/src/app/(app)/planner/page.tsx` and `pwa/src/app/(app)/recipes/RecipesExperience.tsx`) and inline replacement state in `pwa/src/components/home/HomeCommandCenter.tsx`.
   - Currently, when `replacement.phase === 'conflict'`, `SkipRecoveryDialog` renders `Your plan changed` (`planning.replacement.conflictTitle`) + `Your plan changed. Review it before replacing this meal.` (`planning.replacement.conflict`), displays `replacement.recipeName` under `Your new meal` (`planning.replacement.newMeal`), and exposes only `Review plan` (`planning.replacement.review`).
   - In `pwa/src/lib/planner/useReplacementRecovery.ts`, `review()` calls `close(true)`, which invokes `options.onClosed()` before `options.onReview()`. Both `planner/page.tsx` (`if (!saved && pendingRecovery) openDetail(...)`) and `RecipesExperience.tsx` (`if (!saved && pendingRecovery) setDetailRecipeId(...)`) interpret `onClosed()` without `saved=true` as a plain dismissal and re-open `RecipeDetailSheet` while routing to Planner.

2. **Completed vs. voting supper review (`RecipeDetailSheet`)**:
   - Owned by `pwa/src/components/recipes/RecipeDetailSheet.tsx` and fed by `planner/page.tsx` (`detailReview`) and `RecipesExperience.tsx` (`targetReview`).
   - Currently both `status === 2` (Cooked) and `status === 4` (AwaitingConsensus / voting) collapse into one state (`kind: 'completed'` in `planner/page.tsx`, `targetReview` in `RecipesExperience.tsx`) rendering `Review this completed or voting supper in Planner.` (`recipes.reviewBeforePlanning`) inside the error-styled `onRetryTarget` branch (`border-hearth-line bg-terracotta-50 text-hearth-ink`) with a single `Review plan` button.
   - `pwa/src/components/recipes/PlanningDayChooser.tsx` already reads a fresh week schedule via `getSchedule(week, reference)`, retains the caller's recipe, and returns a fresh `PlannerSlot` on selection without mutating state.

3. **Planner landing (`?dayIndex=`)**:
   - Owned by `pwa/src/app/(app)/planner/page.tsx` and `pwa/src/lib/planner/usePlanningConfirmation.ts`.
   - Currently `usePlanningConfirmation` only scrolls to and highlights `day-card-<dayIndex>` when `success=1` and a stored `planningResult` match. When a review link navigates to `/planner?dayIndex=...&weekOffset=...&referenceWeekStartDate=...` without `success=1`, `dayIndex` is ignored.

## Decisions and Tradeoffs

1. **Reuse `PlanningDayChooser` for meal-preserving conflict and completed/voting recovery**
   - _Decision_: Add an optional `onChooseAnotherDay?: () => void` callback to `SkipRecoveryDialog`, and wire `PlanningDayChooser` across `RecipesExperience`, `planner/page.tsx`, and `HomeCommandCenter` so `Choose a day for this meal` (from pre-commit conflict) and `Plan for another day` (from completed/voting `RecipeDetailSheet`) let the user pick a day from fresh week data while keeping the recipe in hand.
   - _Alternative considered_: Auto-picking the next open day or mutating the freshly read slot inside `SkipRecoveryDialog` without showing the week. Rejected because the household needs to see what is now on the conflicted day and choose deliberately, and `PlanningDayChooser` already enforces read-only fresh schedule reads.
   - _How each caller routes the chosen `PlannerSlot`_:
     - **Recipes (`RecipesExperience.tsx`)**: Closes `pendingRecovery` (when coming from conflict) or keeps `detailRecipeId` open, updates `chosenDetailTarget` to the selected `PlannerSlot`, and handles empty, occupied, non-cooking, or locked slots via existing `RecipeDetailSheet` / guarded assignment / `NonCookingReplacementConfirmation` / `SkipRecoveryDialog` rules.
     - **Planner (`planner/page.tsx`)**: Adds an overlay/state holder for the retained `AssignmentRecipe` when choosing a day from `SkipRecoveryDialog` conflict or completed/voting `RecipeDetailSheet`; selecting an open slot (`status === 0`, no recipe, no non-cooking plan) runs guarded `assignRecipeToEmptySlot` + `useWeekStore.getState().init(...)` + `rememberPlanningResult` + `?success=1&dayIndex=...`; selecting an occupied recipe slot opens `openReplaceRecovery(freshSlot, retainedRecipe)`; selecting a non-cooking slot opens `NonCookingReplacementConfirmation` (or routes cleanly via existing `openNonCooking` / confirmation component); selecting a locked (`status === 2` or `4`) slot stays blocked with dated feedback.
     - **Home (`HomeCommandCenter.tsx`)**: Opens `PlanningDayChooser` from conflict `onChooseAnotherDay` (with `referenceWeekStartDate` from `actionContext` and `weekOffset={0}`). On day selection, closes recovery and navigates to `/recipes?recipeId=<id>&addToDay=<slot.dayIndex>&weekOffset=<slot.weekOffset>&referenceWeekStartDate=<slot.referenceWeekStartDate>` so the user lands in `RecipeDetailSheet` on their chosen day with that exact recipe ready to plan or replace—without duplicating `RecipesExperience`'s full assignment state machine inside Home.

2. **Explicit departure reason in `useReplacementRecovery`**
   - _Decision_: Pass a departure reason (`'dismiss' | 'saved' | 'review' | 'chooseDay'`) or `(saved?: boolean, reason?: 'dismiss' | 'saved' | 'review' | 'chooseDay')` to `options.onClosed` (keeping backward compatibility for `saved?: boolean` callers). Only `'dismiss'` re-opens `RecipeDetailSheet`; `'review'` and `'chooseDay'` close recovery cleanly without flashing `RecipeDetailSheet`.
   - _Tradeoff_: Tiny signature extension in `pwa/src/lib/planner/useReplacementRecovery.ts` instead of duplicating `review()` cleanup logic in two callers.

3. **Separate status severity from error alerts in `RecipeDetailSheet`**
   - _Decision_: Replace the binary `onRetryTarget ? 'alert' : 'status'` coupling in `pwa/src/components/recipes/RecipeDetailSheet.tsx` with an explicit `planningMessageTone?: 'status' | 'alert'` (default `'alert'` when `onRetryTarget` is set unless overridden to `'status'`), and add optional secondary footer action props (`secondaryPlanningActionLabel?: string`, `onSecondaryPlanningAction?: () => void`, `secondaryPlanningTestId?: string`) alongside the primary action.
   - _Result_: Completed (`status === 2`) and voting (`status === 4`) render with calm neutral Era 3 styling (`role="status"`, `border-chrome-line bg-white text-ink-body`), while actual errors (`retry`, `review` mismatch) keep `role="alert"` (`border-hearth-line bg-terracotta-50 text-hearth-ink`).

4. **Focused Planner day highlight without fake success**
   - _Decision_: In `pwa/src/app/(app)/planner/page.tsx`, handle `?dayIndex=` when `success` is absent and `schedule` matches the requested `weekOffset` and `referenceWeekStartDate` (verifying `dayIndex` 0–6). Scroll `day-card-<dayIndex>` into view (respecting `prefers-reduced-motion`), focus it (`tabIndex={-1}` is already present on `PlannerDayCard`), and apply a transient highlight ring (`reviewDay` state alongside `successDay`, fading/clearing after a short duration or on context change) without rendering a save-success banner or writing to the schedule.
   - _Tradeoff_: Keeping `reviewDay` in `planner/page.tsx` avoids polluting `usePlanningConfirmation` (which owns persisted `planningResult` receipts and `success=1` reconciliation).

## First Observable Slice

The smallest end-to-end slice covers a pre-commit `SkipRecoveryDialog` conflict in `RecipesExperience` (or `SkipRecoveryDialog` component + `useReplacementRecovery` + `planner/page.tsx` focus):

1. `SkipRecoveryDialog` renders the formatted conflict date (`Thu, Nov 26`), `"Nothing was saved yet."`, `"Not saved yet"` above the chosen recipe name, primary `Choose a day for this meal`, and secondary `Open Thu, Nov 26 in Planner`.
2. Activating `Choose a day for this meal` closes the conflict dialog without reopening `RecipeDetailSheet` and opens `PlanningDayChooser` on that week with fresh schedule data while retaining the chosen recipe.
3. Activating `Open Thu, Nov 26 in Planner` navigates to `/planner?dayIndex=...&weekOffset=...&referenceWeekStartDate=...` and scrolls/focuses `day-card-<dayIndex>` without a save confirmation banner.

## State, Concurrency and Recovery

- **Pre-commit vs. post-commit conflict**:
  - In `SkipRecoveryDialog`, `!replacement.original` identifies a pre-commit conflict (original meal was neither moved nor deleted). The dialog shows `"Nothing was saved yet."`, sets the recipe card label to `"Not saved yet"`, and navigates on `Open <Day> in Planner` or `Choose a day for this meal` without a nested abandon confirmation prompt.
  - If `replacement.original` _is_ present (meaning the original meal was already moved or removed before a post-disposition conflict), the existing `confirmAbandon` guard in `useReplacementRecovery.ts` and `HomeCommandCenter.tsx` remains active, and `replacement.original` disposition details continue to display.
- **Stale reads**:
  - `PlanningDayChooser` continues to validate `referenceWeekStartDate` and 7 sequential dates on every open/week-step (`week`, `reference`, `attempt`), ignoring stale responses via its `active` guard.
  - Planner `?dayIndex=` review focus tracks a `consumedReviewTarget` ref/identity for `(dayIndex, weekOffset, referenceWeekStartDate)` so re-renders of the same schedule do not repeatedly steal focus, and clears if the user navigates to another week.
- **Completed / voting immutability**:
  - `status === 2` (Cooked) and `status === 4` (AwaitingConsensus) never offer direct assignment or change arrows in `RecipeDetailSheet`. `Plan for another day` opens `PlanningDayChooser` to target a _different_ day (or inspects fresh week state), leaving the completed/voting occurrence untouched.

## User Experience

- **Copy & Bilingual EN/FR**:
  - `SkipRecoveryDialog` conflict (pre-commit):
    - EN title: `"Your plan changed"` (`planning.replacement.conflictTitle`)
    - EN body: `"Your plan on {{date}} changed before anything was saved."` (`planning.replacement.conflictWithDate`; fallback `"Nothing was saved yet. Choose another day or open Planner to see what changed."`)
    - EN card label: `"Not saved yet"` (`planning.replacement.notSavedYet`)
    - EN primary CTA: `"Choose a day for this meal"` (`planning.replacement.chooseAnotherDay`)
    - EN secondary CTA: `"Open {{date}} in Planner"` (`planning.replacement.openDayInPlanner`)
    - FR equivalents in `pwa/src/locales/fr/common.json`: `"Votre plan du {{date}} a changé avant tout enregistrement."`, `"Pas encore enregistré"`, `"Choisir un jour pour ce repas"`, `"Ouvrir le {{date}} dans le planificateur"`.
  - `RecipeDetailSheet` completed vs. voting:
    - EN completed (`status === 2`): `"Already cooked on {{date}}."` (`recipes.alreadyCookedOn`) — primary `"Plan for another day"` (`recipes.planAnotherDay`), secondary `"Open {{date}} in Planner"` (`recipes.openDayInPlanner`).
    - EN voting (`status === 4`): `"Your household is still voting on {{date}}."` (`recipes.votingOpenOn`) — primary `"Open voting in Planner"` (`recipes.openVotingInPlanner`), secondary `"Plan for another day"` (`recipes.planAnotherDay`).
    - FR equivalents in `pwa/src/locales/fr/common.json`: `"Déjà cuisiné le {{date}}."`, `"Le vote familial est encore ouvert pour le {{date}}."`, `"Planifier un autre jour"`, `"Ouvrir le {{date}} dans le planificateur"`, `"Ouvrir le vote dans le planificateur"`.
- **Visual tokens & accessibility**:
  - All primary/secondary `<Button>` / `<button>` controls use Era 3 tokens (`bg-hearth-fill`, `border-chrome-line bg-white text-ink-body`, `min-h-[48px]`, `whitespace-normal break-words`) so wrapped French labels remain `>= 48 CSS px` tall and readable in both Standard AA (`:root`) and High Contrast AAA (`:root[data-contrast="high"]`).
  - `PlannerDayCard` review highlight reuses calm `outline` / `ring` tokens respecting `prefers-reduced-motion`.
