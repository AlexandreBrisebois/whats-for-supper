# Requirements: Tonight Menu Card Detail Sync

## Problem Statement
When a recipe is assigned to "today" (via GOTO confirm or Quick Find), the UI responds immediately by showing the card and the hero image. However, the details on the flip side (description, ingredients, total time) remain empty or show default values until a manual page refresh.

## User Intent
The user should be able to flip the card immediately after assigning a recipe and see the full details without a page refresh.

## Constraints
- **Zero-Drift**: Maintain sync between `todayStore` and the backend.
- **Optimistic UI**: Do not introduce lag in the initial card appearance.
- **No Flip-Flop**: Ensure that server updates don't cause the UI to flicker or revert to empty states during the reconciliation window.

## TDD Acceptance Criteria (Red)
1.  **Test 1 (Optimistic Fill)**: `assignRecipe` should set `description`, `ingredients`, and `totalTime` to `null` initially (current behavior) but trigger a background fetch.
2.  **Test 2 (Detail Hydration)**: After `assignRecipe` is called, the store should eventually contain the full details from the recipe API without a manual `sync()` or refresh.
3.  **Test 3 (Smart Reconciliation)**: `sync()` should update details for the `currentRecipe` if the ID matches, even if an optimistic write is recent (< 20s).

## Verification Path
- `npm run test todayStore.test.ts`
