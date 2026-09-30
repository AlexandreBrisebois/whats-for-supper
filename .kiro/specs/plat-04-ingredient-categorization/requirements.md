# Ingredient Categorization — Requirements

## Status

**Implemented capability baseline.**

## Current behavior

- **PLAT-04-R1.** `IngredientNormalizer` and `UnitNormalizer` provide deterministic normalization/unit families used by grocery recomputation.
- **PLAT-04-R2.** `IngredientCategoryService` stores normalized-key category overrides in `IngredientCategories`; manual correction through `PATCH /api/ingredients/{normalizedKey}/category` validates the ten-section vocabulary, sets manual authority, and recomputes affected grocery lists.
- **PLAT-04-R3.** Missing categories can be populated through `CategorizeIngredientsProcessor`; `GroceryRecomputeService` prefers exact/legacy stored categories, then `AisleMapper` fallback, and persists derived weekly lines.

## Limits and boundaries

Categories organize shopping; they are not nutrition/allergy advice. Recompute targets already persisted affected lists and section-only changes have no dedicated grocery-line stream event. GROC-01 owns grocery representation, GROC-03 correction UI, and PLAT-02 categorization workflow execution.
