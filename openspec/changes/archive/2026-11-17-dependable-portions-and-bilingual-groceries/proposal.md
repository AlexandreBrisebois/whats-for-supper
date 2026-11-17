# Dependable Portions and Bilingual Groceries

## Summary
Consolidates dependable portion scaling and bilingual grocery unification across What's For Supper (WFS).
A household can view recipes, cook, and shop with dependable, consistent quantities across every view:
1. **Recipe View (RecipeDetailSheet)**: Set or preview portions (e.g., 2, 4, 6, or custom yields) with instant, exact ingredient scaling from saved original basis facts, without floating-point drift or bogus warnings.
2. **Cook's Mode**: Preparation checklist and Step-by-step reading reflect the planned supper date's portions and project validated ingredient amounts inline into instruction text, leaving non-ingredient quantities (time, temperature, vessel size) untouched and uncertain references readable.
3. **Step Quantity Projection**: Validated ingredient uses in instructions scale proportionally with recipe portions, while non-ingredient numbers (time, temp, equipment) remain untouched. Uncertain references stay legible.
4. **Grocery List**: Scheduled meals contribute scaled ingredient demand deterministically. A versioned, model-authored bounded vocabulary unifies English and French items into common purchase identities and unit buckets, preserving manual extras, check states, and aisle overrides.

## Motivation & Context
Previously, portion scaling and grocery aggregation suffered from fragmented heuristics, floating-point roundtrips, string scraping (`LegacyGroceryQuantity`), and separate uncoordinated OpenSpec proposals. This release establishes:
- Exact rational arithmetic via `QuantityMath`.
- Canonical recipe facts with stable line identities as the single source of truth for both display and shopping.
- Upfront library migration to the canonical recipe model, eliminating dual runtime pathways.
- Deterministic bilingual grouping without runtime AI or external translation service dependencies.

## Key Capabilities & User Experience

### 1. Dependable Portion Scaling (Recipe View & Cook's Mode)
- **Exact Rational Math**: Ingredients scale strictly via exact fraction/integer math (`QuantityMath.Scale(amount, target, basis)`), eliminating floating-point rounding errors (`0.3333333333333333` vs `1/3`).
- **Coherent Recipe & Cook Views**: Opening a recipe for 6 servings displays exact threefold quantities for an original 2-serving recipe across RecipeDetailSheet, Tonight, and Cook's Mode.
- **Quiet Uncertainty**: Intentional unquantified items ("salt to taste") and uncertain measurements stay readable in original prose without alarming warnings or invented numbers.

### 2. Validated Step Quantity Projection
- Step text containing validated ingredient references dynamically renders scaled quantities (e.g., "Add 1 cup flour" when doubled from 1/2 cup), while leaving preparation times ("bake for 20 minutes"), temperatures ("at 180 °C"), and container sizes ("400 g can") unscaled.
- Relative allocations ("half the butter") and remainders scale coherently without multiplying total demand.

### 3. Dependable Bilingual Grocery Shopping
- **Bilingual Identity Grouping**: Common grocery items in English and French (e.g., "onion" and "oignon") resolve to a single validated purchase identity using a bounded, disk-persisted model-authored vocabulary.
- **Unit Family Preservation**: Culinary measures (cups, tablespoons, teaspoons) and metric measures aggregate cleanly within their respective families without lossy cross-unit conversion.
- **Optimistic & Resilient Checks**: Row checks are optimistic, stable across sorting, and resilient against concurrent updates. Increases in required quantities uncheck only when demand provably exceeds the acknowledged baseline.
- **Source Disclosure**: Shoppers can expand an ingredient to inspect contributor recipe titles and jump directly to original recipe facts.

### 4. Zero Data Loss Migration & Operational Reliability
- Preserves 100% of planned meals, calendar entries, manual extras, and human aisle corrections.
- Rebuilds grocery lists for all persisted and scheduled weeks upon canonical model cutover.
- Offline recovery: The bounded vocabulary and all canonical recipe facts are included in full backup/restore workflows with verified checksums.
