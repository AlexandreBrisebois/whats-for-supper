# GROC-03 — Ingredient aisle correction: requirements

## Status

- **Status:** Implemented capability baseline.
- **Kind:** Capability baseline; behavior-first.

## Outcome

A shopper can change a displayed normalized ingredient's grocery section; the server records manual category authority and recomputes every stored weekly grocery list containing that key.

## Implemented behavior

- **GROC-03-AC-01 — Planner interaction.** Every grocery row exposes a separate reclassify control. It opens the fixed ten-section picker, does nothing when the chosen section matches the current one, and prevents a second request for the same normalized key while pending.
- **GROC-03-AC-02 — API validation and persistence.** The browser sends `PATCH /api/ingredients/{normalizedKey}/category` with `{ grocerySection }`. `IngredientsController` accepts only the ten known display values. `IngredientCategoryService` inserts or updates `IngredientCategories` with `Source = "manual"`, confidence `1.0`, and timestamps, then invokes recomputation.
- **GROC-03-AC-03 — Recompute.** `GroceryRecomputeService.RecomputeForIngredientAsync` finds persisted weekly lists containing the normalized key and recomputes each. During recompute, an exact normalized-key category wins over legacy-key lookup and keyword mapping.
- **GROC-03-AC-04 — Initiator feedback.** After `204`, `GroceryList` changes matching current-week rows locally and closes the picker only if the user remains on the originating week. Failure retains the picker, marks a temporary error, and clears the pending flag.

## Scope and boundaries

GROC-03 owns the grocery-list correction interaction and the route-to-recompute handoff. `plat-04-ingredient-categorization` owns normalization rules, category data model, automated categorization, and vocabulary policy. GROC-01 owns list derivation. This feature does not create a standalone administration surface or alter ingredient text, recipe content, or nutrition data.

## Current limitations

- A correction is household-global in its persisted category lookup; this route does not take a member ID or express per-member preferences.
- Only open current-week initiators receive a direct local section update. A section-only recompute generally publishes no line-refresh event, so other devices and other weeks need their next schedule fetch/snapshot to observe the new section.
- The affected-week query searches the serialized grocery-items JSON. It only reaches lists already persisted with that exact normalized key; recipe plans not yet recomputed are not eagerly materialized.
- The picker has temporary, non-localized failure indication and no retry affordance. Its buttons use visible text but no dialog/focus-trap semantics are implemented.

## Preserved behavior

Manual category data overrides automatic/keyword classification on later recomputation. Invalid sections produce `400`; success is `204` with no body. No API exposes deletion/reset of a manual override.
