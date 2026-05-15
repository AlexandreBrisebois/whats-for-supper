# Cook's Mode Enhancements - Design

## 1. API & Persistence
### OpenAPI Contract
Update `UpdateRecipeDto` to include `recipeInstructions`.
- Type: `object[]` (supports both flat strings and `HowToStep` objects).

### Backend (RecipeService)
Update `UpdateRecipe` to handle the `recipeInstructions` patch.
- Logic: Load `RawMetadata`, parse as JSON, update/merge `recipeInstructions`, and save back to DB.
- Synchronization: Ensure the update propagates to `recipe.info` on disk via `ImageService.UpdateRecipeInfo` if required for consistency.

## 2. Cook's Mode UI Redesign
### Layout & Legibility
- **Alignment**: Shift main step instructions from `text-center` to `text-left`.
- **Typography**: Increase line-height and spacing for high-glance readability.
- **Header**: Replace the small circular image with a larger, full-width (or near full-width) editorial hero image.
- **Editing**: Tapping a step enters "Micro-Edit" mode. Text areas replace static text; changes save on blur via a background `PATCH` request.

## 3. Recipe Detail & Navigation
### Entry Points
- **Hero Image**: Add a glassmorphic Terracotta pill button with `UtensilsCrossed` icon and "COOK" label on the bottom-left of the image.
- **Time Pill**: Add a small `UtensilsCrossed` icon button immediately beside the "READY IN" pill.

### Navigation Hierarchy
- **Header Cluster**: In `BrowseAllStackPage`, reorder buttons to: `View Toggle` -> `Discovery Toggle` -> `Recycle Bin` -> `Close`.
- **De-cluttering**: 
    - Remove `Search` from `BrowseAllStackPage`.
    - Remove `Library` shortcut from `RecipesPage` (Search).
- **Persistence**: Tapping the Cook's Mode header image opens `RecipeDetailSheet` as an overlay. Closing the sheet returns the user to the active cooking step.

## 4. Vertical Slice Decomposition
Each slice follows the **Test -> Contract -> Logic -> Verify** loop.

1. **Slice 1: The Seam (API)**: Persistence logic for recipe instructions.
2. **Slice 2: Navigation Cleanup**: Removing redundant buttons and clustering controls.
3. **Slice 3: Entry Points**: Adding "COOK" triggers to the detail view.
4. **Slice 4: Look & Feel**: Redesigning Cook's Mode layout and legibility.
5. **Slice 5: Interaction**: Implementing the Micro-Edit workflow.
