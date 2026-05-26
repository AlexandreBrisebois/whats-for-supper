# Planner Page Enhancements - Requirements

## Vision
To streamline the meal planner page UX by separating primary recipe viewing from recipe management actions, aligning the "plan later" option with home page skipped-recipe recovery vocabulary, and decluttering the planner dashboard by removing immediate cook mode triggers.

## Product Decisions
1. **Recipe Title Action**: Clicking the recipe name on a planned planner slot card will open the `RecipeDetailSheet` drawer/sheet, not the pivot.
2. **Management Actions Grouping**: A new "change" icon button will be rendered next to the drag handle dots on the right side of the recipe slot card. Clicking it will trigger the Planning Pivot Sheet.
3. **Plan Later Action**: A new "Plan Later" option will be added as the first option in the pivot sheet when a slot contains a recipe. This option will reuse the same text and description as the skip recovery dialog from the home page.
4. **"Ordered In" Interaction (Option A)**: An "Ordered In" slot card will not display a drag handle or change icon. The entire card will remain clickable to open the pivot sheet.
5. **Cook Mode Relocation**: Cook's Mode will be removed from the planner card dashboard. Today's planned recipe card will no longer display the Cook Mode action button. Today's Cook Mode will instead be launched from the `RecipeDetailSheet` (accessible by clicking the recipe name).

## Acceptance Criteria Index
1. **AC-1 (Title Click Details)**: Clicking the recipe name button (`edit-recipe-button`) on any planned day card must open the `RecipeDetailSheet` displaying the correct recipe details.
2. **AC-2 (Change Plan Pivot Trigger)**: A button next to the drag handle (`change-recipe-button`) must display a change icon (`RefreshCw`). Clicking it must open the `PlanningPivotSheet` for that specific day index.
3. **AC-3 (Pivot "Plan Later" Integration)**: When the `PlanningPivotSheet` is opened for a slot with a recipe:
   - The first option rendered must be "Save for Next Week" (localized as `home.saveForNextWeek` / "Garder pour la semaine prochaine") with subtext "Moves to the first open slot" (localized as `home.moveFirstSlot` / "Déplace au premier créneau libre").
   - Clicking this option must move the recipe to the next week (week offset + 1, index 0, intent "push"), close the pivot, empty the current day's planner slot, and trigger a sync of today's active recipe store if the moved slot was today.
4. **AC-4 (Cook Mode Removal)**: The Cook's Mode activation button (`start-cook-mode`) must be completely removed from the planner cards, including the current day card.
5. **AC-5 (Ordered In Retention)**: "Ordered In" slot cards must remain fully clickable to trigger the pivot sheet, with no separate change icon or drag handle rendered.

## Glossary
* **Planner Slot**: A day card in the weekly schedule grid (Monday to Sunday).
* **Planning Pivot Sheet**: The slide-up/modal options dialog that lets users swap, remove, or reschedule a planned meal.
* **Skip Recovery**: The decision path when a meal plan is skipped or changed (order in, swap, move to tomorrow, save for next week, or drop).
