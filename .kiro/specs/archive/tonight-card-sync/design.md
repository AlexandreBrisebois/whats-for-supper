# Design: Tonight Menu Card Detail Sync

## Strategy: Dual-Path Hydration

To solve the "missing details" bug while preserving the 20-second "optimistic guard," we will implement two parallel hydration paths:

### 1. Action-Level Eager Fetch (Optimistic Hydration)
When `assignRecipe(recipe)` is called:
1.  **Step 1**: Set the minimal optimistic state (`id`, `name`, `image`).
2.  **Step 2**: Trigger the background assignment (`POST /api/schedule/assign`).
3.  **Step 3**: Simultaneously fire `GET /api/recipes/{id}`.
4.  **Step 4**: When the recipe details arrive, update the `currentRecipe` in the store ONLY if the ID still matches the current optimistic state.

### 2. Reconciliation-Level Smart Merge (Sync Hydration)
When `sync()` is called:
- **Existing Logic**: Skip updating `currentRecipe` if `optimisticIsRecent` (20s).
- **New Logic**: If `optimisticIsRecent` AND `todaysEntry.recipe.id === currentRecipe.id`, then **ALLOW** updating the `currentRecipe` object. This ensures that as soon as the server-side assignment is finished and the full recipe is available in the schedule, the client absorbs it without waiting for the 20s guard to expire.

## Technical Details

### todayStore.ts Changes
- Import `apiClient` (already present) or helper from `recipes.ts`.
- Update `assignRecipe` to be async or handle the promise for detail fetching.
- Refactor `sync()` to implement the "Smart Merge" logic.

## Verification
- Unit test coverage in `todayStore.test.ts`.
- Mocks for `apiClient.api.recipes.byId(id).get()`.
