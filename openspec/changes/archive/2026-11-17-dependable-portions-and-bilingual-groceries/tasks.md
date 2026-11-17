# Tasks: Dependable Portions and Bilingual Groceries

## 1. Startup Vocabulary Seeding
- [x] 1.1 Load and validate the bounded model-authored vocabulary (`bilingual-vocabulary.json`) during application startup.
- [x] 1.2 Verify deterministic English/French alias resolution and stable food identities without runtime AI or translation calls.
- [x] 1.3 Ensure vocabulary persistence, versioning, and offline backup/restore integrity.

## 2. Upfront Recipe Migration
- [x] 2.1 Migrate stored recipe library to the canonical recipe model on startup/initialization.
- [x] 2.2 Preserve all existing meal plans, calendar events, household configurations, and manual grocery extras.
- [x] 2.3 Recompute grocery demand for all affected weeks under the canonical model without requiring an empty calendar.

## 3. RecipeDetailSheet & Cook's Mode Step Projection
- [x] 3.1 Project validated ingredient amounts in recipe instructions when portions change in RecipeDetailSheet.
- [x] 3.2 Ensure Cook's Mode displays scaled step quantities for dated supper plans without modifying fixed metrics (time, temperature, equipment).
- [x] 3.3 Keep uncertain, ambiguous, or unquantified instruction references legible in their original wording without routine warning noise.

## 4. Grocery Unification & Math Simplification
- [x] 4.1 Replace `LegacyGroceryQuantity` with `QuantityMath` across the solution, using exact rational arithmetic (`Scale`, `Add`, `Multiply`, `SubtractScalar`, `Parse`, `IsCanonical`).
- [x] 4.2 Aggregate scheduled grocery demand deterministically into compatible unit buckets and bilingual identities.
- [x] 4.3 Maintain dependable optimistic checks, aisle sorting (unchecked before checked), and contributor source disclosure.
- [x] 4.4 Verify all frontend and backend tests pass with zero regression in shopping, planning, or cooking interactions.
