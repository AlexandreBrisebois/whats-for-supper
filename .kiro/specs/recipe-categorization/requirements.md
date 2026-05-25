# Feature: Recipe Categorization Refactoring

## Intent
Extract `cuisineType` and `mealTypes` from the recipe's dietary profile JSONB into first-class columns on the `recipes` table to support viewing and one-thumb editing of these fields on the detailed recipe card. Preserve the `category` column to keep existing code functional, but map it to the recipe's primary meal type to focus Discovery on the `"Supper"` category in the short term. Remove balanced goals/discovery nudges from both backend and frontend as health features will be rebuilt from scratch.

## Product Decisions
1. **No Denormalization**: To keep DB operations and EF Core mappings clean and performant, we will use a `cuisine_type text` column and a `meal_types text[]` array column directly on the `recipes` table instead of creating new lookup or join tables.
2. **Preserve Category & Pin Discovery**: Rather than breaking existing API contracts and Next.js routing, the `category` column is preserved and mapped to the recipe's primary meal type. The PWA Discovery page will introduce a feature toggle (`PINNED_DISCOVERY_CATEGORY = 'Supper'`) to pin discovery to dinner planning for now, while keeping the category-cycling code intact for future use.
3. **Mère-Designer UI Grouping**: Cuisine and meal type badges must be grouped together above the description in the detailed recipe card to respect proximity, reduce cognitive load, and allow fast one-thumb editing.
4. **Sides Heuristic**: A programmatic check is used to classify recipes as `"Sides"` based on name or description keywords, overriding the primary category to `"Sides"`.
5. **Remove Balanced Goals from Discovery**: Both backend SSE nudge broadcasts (`discovery_nudge`) and frontend listeners that steer the active discovery category based on planned balance goals SHALL be entirely removed.

## Acceptance Criteria

### AC 1: Database Schema & Models
1. The `recipes` table SHALL contain a nullable `cuisine_type text` column.
2. The `recipes` table SHALL contain a nullable `meal_types text[]` column.
3. The C# `Recipe` model and DTOs SHALL expose `CuisineType` (`string?`) and `MealTypes` (`string[]?`).
4. The C# `Recipe` model and DTOs SHALL continue to expose `Category` (`string?`).

### AC 2: Synchronous Workflow Categorization
1. A synchronous workflow task `categorize_recipe` (processor: `CategorizeRecipe`) SHALL run during the import and synthesis workflows after `categorize_ingredients` and before `recipe_ready`.
2. The task SHALL call the LLM to categorize the recipe, populating `recipes.cuisine_type` and `recipes.meal_types`. The prompt SHALL suggest common cuisines to choose from or allow free text: `Italian, French-Canadian, Canadian, French, American, Mexican, Spanish, Greek, Mediterranean, Middle-Eastern, Indian, Chinese, Japanese, Korean, Thai, Vietnamese, Caribbean, Latin American`.
3. The task SHALL map the LLM's `Dinner` to `"Supper"` and keep `"Dessert"`, `"Appetizer"`, and `"Beverage"` as first-class meal types. The full set of supported meal types is: `["Breakfast", "Brunch", "Snack", "Lunch", "Supper", "Sides", "Dessert", "Appetizer", "Beverage"]`.
4. The task SHALL apply the `"Sides"` heuristic (case-insensitive regex check on name/description) and set the primary category to `"Sides"` if matched. The heuristic matches whole words only to prevent false positives: `\b(side|side-dish|accompagnement|accompagnements|gravy|dressing|condiment|dip|salsa|vinaigrette|pesto)\b` and does not match if keywords like `chicken`, `beef`, `pork`, or `salmon` are present as primary nouns.
5. The task SHALL save the mapped primary meal type (e.g., `"Supper"`) as the recipe's `category`.
6. If the `"Sides"` heuristic matches, the task SHALL override the recipe's `category` to `"Sides"` and ensure `"Sides"` is included in `meal_types`.

### AC 3: Backup & Restore
1. Database backup and restore operations SHALL serialize and deserialize `cuisine_type` and `meal_types` to/from `recipe.info` files on disk.
2. The restore operation SHALL automatically fallback to extracting cuisine and meal types from the `DietaryProfile` JSON object if they are missing in the `recipe.info` file (providing backwards compatibility for legacy backups).

### AC 4: UI Detailed Recipe Card
1. In view mode, the Cuisine badge and Meal Types badges SHALL be grouped together in a horizontal cluster above the description.
2. In edit mode, the Cuisine text input and the Meal Types selector board (designed as large toggleable pills) SHALL be grouped together above the description.
3. The meal types selector board SHALL show pills for: `["Breakfast", "Brunch", "Snack", "Lunch", "Supper", "Sides", "Dessert", "Appetizer", "Beverage"]`.
4. The UI SHALL prevent saving and disable the Save button if zero meal types are selected in the selector board.
5. Saving the edits SHALL send `cuisineType` and `mealTypes` via a PATCH request to `/api/recipes/{id}` and persist them to both the database and the `recipe.info` file.
6. The backend `UpdateRecipe` endpoint SHALL sanitize inputs: if `mealTypes` is empty or null, it SHALL default the primary `category` to `"Supper"`.

### AC 5: Discovery Queue Pinning & Balanced Goals Cleanup
1. The Discovery page SHALL support a constant `PINNED_DISCOVERY_CATEGORY = 'Supper'`.
2. When this constant is active, the Discovery queue SHALL load only the `"Supper"` category stack.
3. When the constant is set to `null`, the Discovery queue SHALL cycle through all available categories returned by the API.
4. The PWA `useScheduleStream.ts` SSE handler SHALL NOT listen for `discovery_nudge` events, and the active discovery category filter store SHALL NOT be steered by SSE nudge events.
5. The backend `IScheduleEventPublisher` and `SseEventPublisher` classes SHALL NOT expose or broadcast the `discovery_nudge` event, and all publishing logic inside `GroceryRecomputeService.cs` and related unit tests SHALL be removed.

## Glossary
* **CuisineType**: The culinary tradition (e.g. Italian, French-Canadian, Chinese) associated with a recipe.
* **MealTypes**: All applicable meal slots for a recipe (e.g., Breakfast, Brunch, Supper, Snack, Sides).
* **Category**: Represents the primary food group in the legacy system; now represents the primary meal slot for discovery routing.
* **Sides Heuristic**: Programmatic text-matching rules used to identify side-dish recipes.
