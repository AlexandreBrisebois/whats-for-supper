# Task 2: API Trigger & Individual Status Endpoints

**Context**: Users need to manually trigger recipe imports and check their status from the PWA.

**Requirements**:
1. Create (or update) `RecipeImportController` in `api/src/RecipeApi/Controllers/`.
2. Implement `POST /api/recipes/{id}/import`:
   - Validate that the recipe exists in the `recipes` table.
   - Insert a new `RecipeImport` record with `Status = Pending`.
   - Return 202 Accepted with the `ImportId`.
3. Implement `GET /api/recipes/{id}/import/status`:
   - First, check if the `Recipe` record in the `recipes` table already has `RawMetadata`. If yes, return `{ "status": "Completed" }`.
   - If not, check the `recipe_imports` table for the latest record for that `RecipeId`.
   - Return the status and any error message if `Failed`.
   - If no record exists in either, return 404.

**Acceptance Criteria**:
- Endpoints are functional and return correct JSON.
- Per-recipe status correctly identifies "Completed" by checking the main recipe table.
