# Planner Page Enhancements - Tasks

## Implementation Plan

### Wave 1: Component Modifications & Unit Tests

- [x] 1. PWA Component - Implement "Plan Later" in `PlanningPivotSheet`
  - Add `onPlanLater` optional callback to `PlanningPivotSheetProps`.
  - Import `RefreshCw` icon from `lucide-react`.
  - If `hasRecipe` is true and `onPlanLater` is provided, render the `pivot-plan-later` button as the first element in the options grid.
  - Style with Sage Green colors (`bg-sage/10 text-sage hover:border-sage/30 hover:bg-sage/5`).
  - Use locales: title `t('home.saveForNextWeek', 'Save for Next Week')`, description `t('home.moveFirstSlot', 'Moves to the first open slot')`.
  - *Requirements: AC-3*

- [x] 2. PWA Component - Update `PlanningPivotSheet.test.tsx`
  - Write test verifying the plan-later option renders when `hasRecipe` is true, clicking it fires `onPlanLater` callback.
  - Write test verifying it is hidden when `hasRecipe` is false.
  - *Requirements: AC-3*

- [x] 3. Planner Page - Refactor page component state and actions in `page.tsx`
  - Remove `activeCookMode` state, the `onCookMode` callback handler, and the rendering of `CooksMode` overlay from `page.tsx`.
  - Implement `handlePlanLater(dayIndex: number)`:
    - Get the target day: `const day = schedule[dayIndex]`.
    - Retrieve `recipeId` and `date`.
    - If either is missing, return.
    - Call `apiClient.api.schedule.move.post({ weekOffset: currentWeekOffset, fromIndex: dayIndex, toIndex: 0, targetWeekOffset: currentWeekOffset + 1, intent: 'push', recipeId })`.
    - Close the pivot sheet and reset selected day index state.
    - Call `useWeekStore.getState().init(currentWeekOffset)` to refresh the schedule.
    - If `currentWeekOffset === 0 && day.date === getTodayString()`, call `useTodayStore.getState().sync()` to update the active today recipe state.
  - *Requirements: AC-3, AC-4*

- [x] 4. Planner Page - Refactor `PlannerDayCard` in `page.tsx`
  - Remove `onCookMode` from properties interface.
  - Update `edit-recipe-button` (recipe name button) `onClick` to call `onViewRecipe(day.recipe.id)` instead of `onPivot()`.
  - Delete `view-recipe-button` (`BookOpen` icon) and `start-cook-mode` (`UtensilsCrossed` icon) buttons from right actions area.
  - Add a new button `change-recipe-button` next to the drag handle (`GripVertical`) using the `RefreshCw` icon from `lucide-react` that triggers `onPivot()`.
  - *Requirements: AC-1, AC-2, AC-4, AC-5*

- [x] 5. Planner Page - Update `page.test.tsx`
  - Remove tests assertions checking `start-cook-mode` and `view-recipe-button` directly on the cards.
  - Add test verifying that clicking `edit-recipe-button` (recipe title) triggers `onViewRecipe`.
  - Add test verifying that clicking `change-recipe-button` triggers `onPivot`.
  - *Requirements: AC-1, AC-2, AC-4*

- [x] 6. Checkpoint - Wave 1 Verification
  - Run the Vitest unit tests:
    - `npx vitest run pwa/src/components/planner/PlanningPivotSheet.test.tsx`
    - `npx vitest run pwa/src/app/\(app\)/planner/page.test.tsx`
  - Verify all unit tests pass.

### Wave 2: E2E Playwright Tests Update

- [x] 7. E2E Tests - Update `planner.spec.ts`
  - Modify `should trigger Cook Mode from a recipe card and navigate steps`:
    - Open `page.goto('/planner')`.
    - Click the recipe title `edit-recipe-button` on today's card to open the recipe details drawer.
    - Wait for and click `time-cook-btn` inside the detail sheet to launch Cook's Mode.
    - Assert that cooks mode overlay is visible and navigate steps.
  - Modify `uses fixed date fixtures to show non-today view action and today cook mode only`:
    - Rename test to `uses fixed date fixtures to verify cards layout and details link`.
    - Verify that both today and non-today cards render `change-recipe-button` and do not render `start-cook-mode` or `view-recipe-button`.
  - *Requirements: AC-1, AC-2, AC-4*

- [x] 8. Checkpoint - Wave 2 Verification
  - Run all frontend unit and E2E tests:
    - `task test:unit`
    - `npx playwright test pwa/e2e/planner.spec.ts`
  - Verify all tests pass.

## Task Dependency Graph

```json
{
  "waves": [
    {
      "name": "Wave 1: Component Modifications & Unit Tests",
      "tasks": [1, 2, 3, 4, 5, 6]
    },
    {
      "name": "Wave 2: E2E Playwright Tests Update",
      "tasks": [7, 8],
      "requires": [6]
    }
  ]
}
```
