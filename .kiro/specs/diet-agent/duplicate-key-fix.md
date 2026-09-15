# Build Prompt: Fix Duplicate React Keys in Recipes Page

**Goal:** Resolve the console error "Encountered two children with the same key, ''" in the Recipes search results.

## Issue
In `src/app/(app)/recipes/page.tsx`, the `results.map` function uses `recipe.id` as a key. If multiple recipes are returned with an empty string or null ID (often seen in mock data or un-migrated records), React fails to maintain component identity.

## Requirements
1. **Data Sanitization:** Update the data fetching/mapping logic in `RecipesPage` to ensure every recipe has a unique ID. If `recipe.id` is missing, fallback to a combination of index and a stable property, or generate a temporary UI ID.
2. **Key Uniqueness:** Update the `key` prop on line 196 to be more resilient:
   ```tsx
   key={recipe.id || `recipe-${idx}`}
   ```
3. **Audit Data Source:** Check the backend `RecipeDto` or the PWA's API client mapping to ensure `id` is always populated correctly from the database.

## Technical Details
- **File:** `src/app/(app)/recipes/page.tsx`
- **Location:** Line 195 (inside the `results.map` block).
- **Secondary Audit:** Check `QuickFindModal.tsx` and `DiscoveryCard.tsx` for similar risks when using IDs as keys.
