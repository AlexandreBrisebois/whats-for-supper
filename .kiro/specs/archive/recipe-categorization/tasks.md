# Tasks: Recipe Categorization Refactoring

## Wave 1: DB Schema, DTOs & Client Seams

### [x] 1.1. Backend - Update DTOs & OpenAPI Spec (Red) - [Agent]
* Update DTOs `RecipeDto`, `UpdateRecipeDto`, and `ImportedRecipeDto` in `specs/openapi.yaml`. Remove `category` from the update DTO, and add `cuisineType` (string) and `mealTypes` (string array with enum values: `["Breakfast", "Brunch", "Snack", "Lunch", "Supper", "Sides", "Dessert", "Appetizer", "Beverage"]`).
* Add C# tests verifying that serialization/deserialization of these DTOs fails/compiles according to the spec (Red test).
* _Requirements: AC 1.3, AC 1.4_

### [x] 1.2. Backend - DB Schema & Entity Update (Green) - [Agent / Human]
* **[Agent]** Modify `api/database/schema.sql` to add `cuisine_type text` and `meal_types text[]` columns, create index `idx_recipes_cuisine_type`, and update `vw_discovery_recipes` view.
* **[Agent]** Update C# classes: `Recipe.cs`, `RecipeInfo.cs`, `DiscoveryRecipe.cs` with `CuisineType` and `MealTypes` properties.
* **[Agent]** Update EF mappings in `RecipeDbContext.cs` to map `CuisineType` and `MealTypes` to the new database columns.
* **[Agent]** Run `task db:schema:push DRY_RUN=true` to verify schema changes.
* **[Human]** Apply database schema updates to the deployed database by executing either:
  ```bash
  task db:schema:push
  ```
  Or by manually running these SQL statements:
  ```sql
  ALTER TABLE recipes ADD COLUMN IF NOT EXISTS cuisine_type text;
  ALTER TABLE recipes ADD COLUMN IF NOT EXISTS meal_types text[];

  CREATE INDEX IF NOT EXISTS idx_recipes_cuisine_type ON recipes (cuisine_type) WHERE (cuisine_type IS NOT NULL);

  DROP VIEW IF EXISTS vw_discovery_recipes;

  CREATE VIEW vw_discovery_recipes AS
  SELECT 
    r.id, 
    r.name, 
    r.category, 
    r.cuisine_type, 
    r.meal_types, 
    r.description, 
    r.ingredients, 
    r.image_count, 
    r.total_time, 
    r.is_vegetarian, 
    r.is_healthy_choice, 
    r.last_cooked_date, 
    r.created_at, 
    r.dietary_profile, 
    r.finished_dish_index,
    COALESCE(v.vote_count, 0) AS vote_count
  FROM recipes r
  LEFT JOIN (
    SELECT recipe_id, count(recipe_id) AS vote_count 
    FROM recipe_votes 
    WHERE vote = 1 
    GROUP BY recipe_id
  ) v ON r.id = v.recipe_id
  WHERE r.is_discoverable = true 
    AND r.is_ready = true 
    AND r.deleted_at IS NULL;
  ```
* **[Agent]** Run Kiota regeneration `task agent:reconcile` and confirm zero schema drift via `task agent:drift`.
* **[Agent]** Run serialization tests from Task 1.1 and confirm they pass (Green).
* _Requirements: AC 1.1, AC 1.2, AC 1.3_

---

## Wave 2: Synchronous Categorization & Workflow Processor

### [x] 2.1. Backend - CategorizeRecipe Integration Tests (Red) - [Agent]
* Update `WorkflowStandardizationIntegrationTests.cs` and `GotoSynthesisIntegrationTests.cs` to mock the LLM response and assert that the workflow categorizes the recipe, saving `cuisine_type`, `meal_types`, and `category` as expected.
* Assert that the `"Sides"` heuristic identifies a side dish from the name/description using the exact word boundaries keywords (`\b(side|side-dish|accompagnement|accompagnements|gravy|dressing|condiment|dip|salsa|vinaigrette|pesto)\b`) and does not false positive on main dishes like "Chicken with Pesto" or "Salmon and Salsa".
* Run tests and confirm they fail with compilation errors or "CategorizeRecipe processor not registered" (Red).
* _Requirements: AC 2.1, AC 2.2, AC 2.3, AC 2.4, AC 2.5, AC 2.6_

### [x] 2.2. Backend - CategorizeRecipe Processor (Green) - [Agent]
* Implement `CategorizeRecipeProcessor.cs` (workflow task `categorize_recipe`):
  - Calls LLM to categorize the recipe. Prompt must supply common cuisines (`Italian, French-Canadian, Canadian, French, American, Mexican, Spanish, Greek, Mediterranean, Middle-Eastern, Indian, Chinese, Japanese, Korean, Thai, Vietnamese, Caribbean, Latin American`).
  - Maps `"Dinner"` &rarr; `"Supper"`.
  - Applies case-insensitive regex check for Sides heuristic using whole word boundary keywords. If matched, sets primary `category` to `"Sides"` and adds `"Sides"` to `meal_types`. Exclude false positives containing main protein words (chicken, beef, pork, salmon).
  - Saves updates to the database.
  - Triggers the out-of-band health profile recomputation asynchronously by publishing to `healthPublisher.PublishRecipeChangedAsync(recipe.Id)` (avoiding direct synchronous health computation).
* Register `CategorizeRecipeProcessor` in `Program.cs`.
* Update YAML workflows in `api/src/RecipeApi/Workflows` and `data/workflows` to run `categorize_recipe` (processor: `CategorizeRecipe`) after `categorize_ingredients` and before `recipe_ready`.
* Run integration tests and confirm they pass (Green).
* _Requirements: AC 2.1, AC 2.2, AC 2.3, AC 2.4, AC 2.5, AC 2.6_

---

## Wave 3: Querying, Backup/Restore & SQL Data Migration

### [x] 3.1. Backend - Service & Backup Integration Tests (Red) - [Agent]
* Update unit/integration tests for `RecipeService.cs`, `DiscoveryService.cs`, `ManagementService.cs`, and `GroceryRecomputeServiceTests.cs`.
* Assert that `UpdateRecipe` correctly updates `cuisine_type` and `meal_types` in the database, indexes them, and writes them to the `recipe.info` backup file.
* Assert that `UpdateRecipe` falls back to `category = "Supper"` if it receives an empty or null `mealTypes` parameter.
* Assert that `RestoreAsync` reads `cuisine_type` and `meal_types` from the backup file, and falls back to extracting them from the `DietaryProfile` JSON when missing (legacy backups).
* **Remove / Ignore Balance Nudge Tests**: In `GroceryRecomputeServiceTests.cs`, delete or modify assertion tests verifying that `PublishDiscoveryNudgeAsync` is called (since discovery nudges are being removed).
* Confirm that these tests fail (Red).
* _Requirements: AC 3.1, AC 3.2, AC 4.6, AC 5.5_

### [x] 3.2. Backend - Service, Search & Backup Updates (Green) - [Agent]
* Update `RecipeService.cs`:
  - `MapToDto`: copy cuisine and meal types to DTOs.
  - `UpdateRecipe`: parse and map cuisine/meal types updates from `UpdateRecipeDto` to the recipe entity. Validate input: if `mealTypes` is empty/null, fallback `category` to `"Supper"`. Trigger search reindexing.
  - Update share bundle import/export methods.
* Update `DiscoveryService.cs` to fetch categories and filter by meal type correctly.
* Update `SearchIndexWorkflow.cs` and `SearchFingerprintService.cs` to index and fingerprint cuisine and meal types.
* Update `ManagementService.cs` (backup and restore methods with fallback logic).
* **Delete Nudge Broadcast Code**: 
  - Remove `PublishDiscoveryNudgeAsync` method from `IScheduleEventPublisher.cs` and `SseEventPublisher.cs`.
  - Remove call to `PublishDiscoveryNudgeAsync` inside `GroceryRecomputeService.cs`.
* Run tests and confirm they pass (Green).
* _Requirements: AC 3.1, AC 3.2, AC 4.6, AC 5.5_

### [x] 3.3. Database - Execute SQL Data Migration (Green) - [Human]
* **[Human]** Manually execute the following SQL migration script on the deployed PostgreSQL database to map legacy JSONB data to the new columns:
  ```sql
  -- 1. Extract cuisine_type and map meal_types
  UPDATE recipes 
  SET 
    cuisine_type = dietary_profile->>'cuisineType',
    meal_types = ARRAY(
      SELECT DISTINCT CASE 
        WHEN val = 'Dinner' THEN 'Supper'
        ELSE val
      END
      FROM jsonb_array_elements_text(COALESCE(dietary_profile->'mealTypes', '[]'::jsonb)) AS val
    );

  -- 2. Apply Sides Heuristic on name/description to assign "Sides" category & meal_types
  UPDATE recipes
  SET 
    category = 'Sides',
    meal_types = ARRAY_APPEND(meal_types, 'Sides')
  WHERE 
    (name ~* '\b(side|side-dish|accompagnement|accompagnements|gravy|dressing|condiment|dip|salsa|vinaigrette|pesto)\b'
     OR description ~* '\b(side|side-dish|accompagnement|accompagnements|gravy|dressing|condiment|dip|salsa|vinaigrette|pesto)\b')
    AND NOT (name ~* '(chicken|beef|pork|salmon)' OR description ~* '(chicken|beef|pork|salmon)')
    AND NOT (meal_types @> ARRAY['Sides']);

  -- 3. Map category based on primaryMealType if not Sides
  UPDATE recipes
  SET 
    category = CASE 
      WHEN dietary_profile->>'primaryMealType' = 'Dinner' THEN 'Supper'
      WHEN dietary_profile->>'primaryMealType' IS NOT NULL THEN dietary_profile->>'primaryMealType'
      ELSE 'Supper' -- default fallback
    END
  WHERE 
    category IS NULL OR category = '' OR category NOT IN ('Sides');
  ```
* **[Human]** Verify that categories in `recipes` match the mapped values.
* _Requirements: AC 1.4, AC 2.5_

---

## Wave 4: Frontend UI Components & Discovery Pinning

### [x] 4.1. PWA - Detail Sheet, Cards & Discovery Tests (Red) - [Agent]
* Create/modify `RecipeDetailSheet.test.tsx` and Playwright E2E tests `discovery.spec.ts`.
* Assert that cuisine and meal type badges are grouped together above the description in view mode.
* Assert that edit mode displays the cuisine input and meal types toggle pill board above the description, and saving includes them in the PATCH request.
* Assert that saving is disabled if no meal types are selected in edit mode (Save button is disabled).
* Assert that `RecipeStackCard.tsx`, `DiscoveryCard.tsx`, and `browse-all-stack/page.tsx` display cuisine/meal badge cluster correctly.
* Assert that Discovery only requests the `"Supper"` category.
* Confirm that these tests fail (Red).
* _Requirements: AC 4.1, AC 4.2, AC 4.3, AC 4.4, AC 4.5, AC 5.1, AC 5.2, AC 5.3, AC 5.4_

### [x] 4.2. PWA - Client & UI Implementation (Green) - [Agent]
* Update `recipes.ts` interface and update client method.
* Implement `RecipeDetailSheet.tsx` View and Edit modes (metadata cluster and pill selector above description). Enable UI validation: disable Save if `draftMealTypes.length === 0`.
* Clean up `RecipeStackCard.tsx`, `DiscoveryCard.tsx`, and `browse-all-stack/page.tsx` to handle the new `cuisineType` and `mealTypes` badges above the description and remove any category display bugs.
* Update `page.tsx` (Discovery) to add `PINNED_DISCOVERY_CATEGORY = 'Supper'`.
* **Remove Discovery SSE Steer Listener**: Remove the `discovery_nudge` SSE event listener from `pwa/src/hooks/useScheduleStream.ts` so the store's active category is never modified out of band.
* Run frontend unit tests and Playwright E2E tests, verifying that they all pass (Green).
* _Requirements: AC 4.1, AC 4.2, AC 4.3, AC 4.4, AC 4.5, AC 5.1, AC 5.2, AC 5.3, AC 5.4_

---

## Task Dependency Graph (waves)

```json
[
  {
    "wave": 1,
    "tasks": ["1.1", "1.2"],
    "description": "DB Schema, DTOs & Kiota Client Seams"
  },
  {
    "wave": 2,
    "tasks": ["2.1", "2.2"],
    "dependencies": [1],
    "description": "Synchronous CategorizeRecipe Task & Workflow Integration"
  },
  {
    "wave": 3,
    "tasks": ["3.1", "3.2", "3.3"],
    "dependencies": [2],
    "description": "Querying, Backup/Restore, SQL Migration & Nudge Removal"
  },
  {
    "wave": 4,
    "tasks": ["4.1", "4.2"],
    "dependencies": [3],
    "description": "PWA UI (Badges, Selector, Pinned Discovery & SSE Cleanup)"
  }
]
```
