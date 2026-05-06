# Design Document: Grocery Reclassification & Quantity Rollup

## Overview

This spec touches three layers:

1. **API** — new `PATCH /api/ingredients/{normalizedKey}/category` endpoint + `UnitNormalizer` helper + `RecomputeForIngredientAsync` method.
2. **Spec / contract** — `openapi.yaml` update (new path, new request body schema).
3. **PWA** — `GroceryList.tsx` switched from `string[]` to `GroceryLineItemDto[]`; reclassify affordance added.

No schema migrations are needed: `ingredient_categories` already has the `source` column, and `grocery_section` / `updated_at` are already present.

---

## API design

### New endpoint

```
PATCH /api/ingredients/{normalizedKey}/category
```

**Path parameter:** `normalizedKey` — URL-encoded, matches `ingredient_categories.normalized_key`.

**Request body:**
```json
{ "grocerySection": "Produce" }
```

**Responses:**
- `204 No Content` — upsert succeeded and recompute triggered.
- `400 Bad Request` — `grocerySection` is absent or not a valid `GrocerySection` value.
- `404 Not Found` — not used; the endpoint creates the row if absent.

**Controller:** `IngredientsController` (new file). Single action, no auth beyond the existing cookie middleware.

**Service method:** `IngredientCategoryService.ReclassifyAsync(string normalizedKey, string grocerySection, CancellationToken ct)` — performs the upsert (EF `AddOrUpdate` pattern), then calls `GroceryRecomputeService.RecomputeForIngredientAsync`.

### New `GroceryRecomputeService` method

```csharp
public async Task RecomputeForIngredientAsync(string normalizedKey, CancellationToken ct)
```

Finds all `weekly_plans` rows whose `grocery_items` JSON contains the given `normalizedKey`, extracts the distinct `WeekStartDate` values, and calls `RecomputeForWeekAsync` for each.

Implementation note: query `weekly_plans` with a JSON contains check (`grocery_items::jsonb @> '[{"normalizedKey":"..."}]'`) rather than deserialising all rows in memory.

---

## Unit normalisation design

### `UnitNormalizer` static class

Location: `RecipeApi/Utils/UnitNormalizer.cs`

```csharp
public static class UnitNormalizer
{
    public record NormalizedUnit(string CanonicalUnit, double Factor);

    // Returns null if unitText is not in any known family.
    public static NormalizedUnit? Normalize(string? unitText);
}
```

The `Factor` is the multiplier to convert one input unit to the canonical unit:
- `"kg"` → `NormalizedUnit("g", 1000)` — multiply raw quantity × 1000 to get grams.
- `"tsp"` → `NormalizedUnit("tbsp", 1.0/3.0)`.
- `"cup"` → `NormalizedUnit("tbsp", 16)`.
- `null` / `""` → `NormalizedUnit("piece", 1)`.

### Grouping change in `RecomputeForWeekAsync`

Current key: `(normalizedKey, unitText)`.

New key: `(normalizedKey, canonicalUnit)` where `canonicalUnit` is either the canonical unit string or, for unknown units, the raw `unitText` itself (preserving existing behaviour as a fallback bucket).

Each entry's quantity is multiplied by its conversion factor before summing. The emitted `unitText` in `GroceryLineItemDto` is the canonical unit.

---

## PWA design

### `GroceryList.tsx` prop change

Before:
```tsx
interface GroceryListProps {
  weekOffset: number;
  ingredients: string[];   // ← flat names
  onClose?: () => void;
}
```

After:
```tsx
interface GroceryListProps {
  weekOffset: number;
  items: GroceryLineItemDto[];   // ← server DTOs
  onClose?: () => void;
}
```

The `grouped` memo keys on `item.section` (falling back to `'Grocery'` if blank/unknown). The `groceryState` map key remains the item's `displayName` (unchanged — toggle persistence is unaffected).

### Reclassify affordance

Each item row in `GroceryList.tsx` gets a small secondary button (a tag or pencil icon, right-aligned). Tapping it opens an inline section picker — a compact horizontal scroll of pills or a popover — listing the ten `GrocerySection` values. Tapping a section:

1. Calls `PATCH /api/ingredients/{normalizedKey}/category` via a new `reclassifyIngredient(normalizedKey, section)` function in `pwa/src/lib/api/ingredients.ts`.
2. On `204`, updates the item's section in local state (optimistic update is acceptable here; the SSE stream will push the recomputed grocery list shortly after).
3. On error, shows a per-item error indicator (same pattern as the existing toggle error).

### Generated client

After `openapi.yaml` is updated, run `task api:generate` to regenerate the Kiota client. The reclassify call can use the generated client or a thin hand-rolled `fetch` wrapper — prefer the generated client for consistency.

### `planner/page.tsx` change

The `memoizedIngredients` derived value is replaced by passing `weekStore.groceryItems` directly to `<GroceryList items={weekStore.groceryItems} />`. The old derivation (`schedule.flatMap(day => day.recipe?.ingredients ?? [])`) is removed.

---

## Test plan

### API unit tests

- `UnitNormalizerTests`: one test per unit family, cross-unit rollup (500g + 1kg = 1500g), unknown unit passthrough, null unit → piece.
- `GroceryRecomputeServiceTests` (additions): rollup of same-family units; duplicate-ingredient consolidation across recipes.
- `IngredientCategoryServiceTests` (new): upsert inserts when absent; upsert updates section + source when present; `updated_at` is refreshed.

### API integration tests

- `PATCH /api/ingredients/{key}/category` → `204`; DB row has `source = 'human'`.
- Invalid `grocerySection` → `400`.

### PWA unit tests

- `GroceryList.test.tsx`: update fixtures to `GroceryLineItemDto[]`; assert items are grouped by `item.section` not by keyword.
- Reclassify: mock API call, assert item moves section on success; assert error indicator on failure.
