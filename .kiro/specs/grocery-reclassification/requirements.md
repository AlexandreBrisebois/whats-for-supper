# Requirements Document: Grocery Reclassification & Quantity Rollup

## Introduction

Two separate problems motivate this spec.

**Problem 1 — Wrong section in the UI despite correct DB category.**
`GroceryList.tsx` receives a plain `string[]` of ingredient names and calls `mapIngredientToSection` client-side. It never looks at the `section` field that `GroceryRecomputeService` already resolved from `ingredient_categories` and stored in `weekly_plans.grocery_items`. Items correctly categorised in the database still appear under the wrong aisle because the UI ignores the server-computed value.

**Problem 2 — Duplicate ingredient rows.**
The current grouping in `GroceryRecomputeService` keys on `(normalizedKey, unitText)`. When the same ingredient appears across recipes with mixed or missing units (e.g., `2 potatoes` + `3 potatoes` + `500 g potatoes`) three separate line items reach the UI. The grocery list should show one consolidated entry per ingredient with a human-readable quantity string.

**Feature scope for this spec.**

1. **UI reclassification** — the user can change an item's aisle directly from the grocery checklist. The change is persisted to `ingredient_categories` with `source = 'human'` so every future grocery recompute uses the corrected section.
2. **Quantity rollup** — quantities expressed in the same unit family (e.g., all metric weight, all count) are summed and normalised to a single canonical unit. Incompatible units produce separate entries only when conversion is genuinely impossible.

The fix for Problem 1 (UI ignoring the `section` field) is a prerequisite for Feature 1 and is included in the tasks.

---

## Glossary

- **`ingredient_categories`**: PostgreSQL table with columns `normalized_key`, `grocery_section`, `confidence`, `source`, `created_at`, `updated_at`. `source` is `'llm'` for LLM-classified entries and `'human'` for user-corrected entries.
- **`weekly_plans.grocery_items`**: JSON column containing a pre-aggregated `GroceryLineItemDto[]` array, recomputed by `GroceryRecomputeService` whenever recipe assignments change.
- **`GroceryLineItemDto`**: `{ displayName, normalizedKey, section, quantity, unitText, recipeIds }` — the wire shape consumed by the PWA.
- **`GrocerySection`**: Closed enum of ten values: `Produce`, `Meat`, `Seafood`, `Dairy & Eggs`, `Frozen`, `Bakery`, `Pantry`, `Beverages`, `Deli`, `Grocery`.
- **`normalizedKey`**: The output of `IngredientNormalizer.Normalize(displayName)` — lowercase, accent-stripped, punctuation-removed. Used as the primary key in `ingredient_categories`.
- **Unit family**: A group of units that can be losslessly converted to a single canonical unit (e.g., `g / kg / mg` → canonical `g`; `ml / l / dl` → canonical `ml`; `tsp / tbsp / cup` → canonical `tbsp`). Count units (`piece`, `whole`, `unit`, or null/blank) → canonical `piece`.

---

## Requirements

### Requirement 1: PWA uses server-computed section

**User Story:** As a user, I want my grocery list to reflect the section that was already computed and stored for each ingredient, so items do not flip to the wrong aisle when the keyword matcher and the database disagree.

#### Acceptance Criteria

1. `GroceryList.tsx` SHALL accept `items: GroceryLineItemDto[]` instead of `ingredients: string[]`.
2. The `grouped` memo SHALL partition items by `item.section` directly — it SHALL NOT call `mapIngredientToSection`.
3. `planner/page.tsx` SHALL pass `weekStore.groceryItems` to `<GroceryList>` instead of the flat ingredients array derived from recipe objects.
4. Items whose `section` value is absent or does not match a known `GrocerySection` SHALL fall through to the `Grocery` bucket (defensive fallback only — not the normal path).
5. Existing `GroceryList.test.tsx` tests SHALL be updated to supply `GroceryLineItemDto[]` fixtures; the tests for section grouping SHALL remain passing.

---

### Requirement 2: User reclassification from the grocery list

**User Story:** As a user, I want to tap a misclassified item and assign it to the correct aisle, so it always appears in the right place from that point on.

#### Acceptance Criteria

1. A new API endpoint SHALL exist: `PATCH /api/ingredients/{normalizedKey}/category` with request body `{ "grocerySection": "<GrocerySection>" }` and response `204 No Content`.
2. The endpoint SHALL upsert the `ingredient_categories` row for `normalizedKey`, setting `grocery_section = <value>` and `source = 'human'`. If the row does not exist, it SHALL be inserted with `confidence = 1.0`.
3. `updated_at` SHALL be set to `now()` on every upsert.
4. After a successful upsert, the endpoint SHALL trigger `GroceryRecomputeService.RecomputeForIngredientAsync(normalizedKey, ct)` — a new method that finds all weeks containing that ingredient and recomputes their grocery lists.
5. In the PWA, each grocery item SHALL expose a reclassify affordance (a small icon or secondary tap target). Activating it SHALL open a section-picker (inline or modal) listing the ten `GrocerySection` values.
6. On selection, the PWA SHALL call `PATCH /api/ingredients/{normalizedKey}/category` and, on `204`, move the item to the new section locally without a full page reload.
7. If the API call fails, the item SHALL remain in its original section and an error indicator SHALL appear.
8. The reclassify affordance SHALL NOT interfere with the checked/unchecked toggle tap target.

---

### Requirement 3: Quantity rollup with unit normalisation

**User Story:** As a user, I want to see one consolidated line per ingredient with an accurate total quantity, so I don't have to mentally add up five separate potato entries.

#### Acceptance Criteria

1. `GroceryRecomputeService` SHALL introduce a `UnitNormalizer` helper (or static class) that maps raw `unitText` strings to a `(CanonicalUnit, ConversionFactor)` pair. The minimum supported families are:

   | Family | Accepted inputs (case-insensitive) | Canonical unit |
   |--------|-------------------------------------|----------------|
   | Weight | `g`, `gram`, `grams`, `kg`, `kilogram`, `kilograms`, `mg`, `milligram`, `milligrams` | `g` |
   | Volume | `ml`, `milliliter`, `millilitre`, `l`, `liter`, `litre`, `dl`, `deciliter`, `decilitre` | `ml` |
   | Culinary | `tsp`, `teaspoon`, `tbsp`, `tablespoon`, `cup`, `cups` | `tbsp` |
   | Count | `piece`, `pieces`, `whole`, `unit`, `units`, `""`, `null` | `piece` |

2. Grouping in `RecomputeForWeekAsync` SHALL key on `(normalizedKey, canonicalUnit)` instead of `(normalizedKey, unitText)`. All entries that share the same `normalizedKey` and map to the same canonical unit SHALL be summed after converting to the canonical unit.
3. Entries whose `unitText` does not map to any known family SHALL remain in their own group (keyed on `normalizedKey + raw unitText`), preserving the current behaviour as the fallback.
4. The `unitText` field in the emitted `GroceryLineItemDto` SHALL be the canonical unit string (e.g., `"g"`, `"ml"`, `"tbsp"`, `"piece"`) — not the original raw string.
5. When the canonical unit is `"piece"` and `quantity` is an integer value (e.g., `5.0`), `displayName` in the DTO SHALL remain the ingredient name only; the quantity and unit are conveyed via the `quantity` and `unitText` fields.
6. `GroceryRecomputeServiceTests` SHALL include tests covering: same-unit rollup within a family, cross-unit rollup within a family (e.g., `500g + 1kg → 1500g`), unknown-unit passthrough, and null-unit grouping under `piece`.

---

## Out of scope

- Fractional display formatting in the PWA (e.g., `0.5 cup` vs `½ cup`) — raw numeric `quantity` is sufficient for this spec.
- Automatic unit conversion across incompatible families (e.g., `g` + `ml`).
- Bulk reclassification or admin tooling.
- Undo / history for reclassification actions.
