# Design Document: CNF Data Ingestion

## Overview

A one-time seeding pipeline that downloads the Canadian Nutrient File (CNF) from Health Canada's Open Government Portal, upserts ~5,700 food records into a local `cnf_foods` table, and exposes a `NutrientLookup` service that resolves normalized ingredient names to CNF entries via trigram similarity. Results are cached in the existing `ingredient_categories` table. `ClassifyDietaryProfileProcessor` is extended to use CNF values for `FopFlags`, making health warnings and FOP week summaries accurate for the full recipe library.

No LLM. No runtime external calls. No new workflow.

---

## Architecture

```mermaid
flowchart TD
    subgraph Seed["task data:cnf:seed (one-time operator command)"]
        A[Download CNF ZIP from Health Canada Open Government Portal] --> B[Parse NUTRIENT_NAME.csv → nutrientId map]
        B --> C[Parse NUTRIENT_AMOUNT.csv → foodId→nutrient map]
        C --> D[Parse FOOD_NM.csv → food names, English only]
        D --> E[Upsert cnf_foods table]
        E --> F[Log row count]
    end

    subgraph Lookup["NutrientLookup service — called at import time"]
        G[Normalized ingredient name] --> H{ingredient_categories.cnf_food_id set?}
        H -->|Cache hit| I[SELECT cnf_foods WHERE food_id = cached_id]
        H -->|Cache miss| J[pg_trgm similarity search on cnf_foods.food_name]
        J --> K{similarity >= 0.4?}
        K -->|Yes| L[Write cnf_food_id to ingredient_categories]
        K -->|No| M[Return null]
        L --> I
        I --> N[Return CNFFood record]
    end

    subgraph Classify["ClassifyDietaryProfileProcessor — extended"]
        O[supply[] ingredient names] --> P[NutrientLookup per ingredient]
        P --> Q[Convert quantities to grams via UnitWeightTable]
        Q --> R[Sum nutrients × weight/100g per ingredient]
        R --> S[Divide by recipeYield → per-portion values]
        S --> T[ComputeFopFlags from CNF per-portion values]
        T --> U[Write to dietary_profile.fopFlags]
        V[raw_metadata.nutrition fallback] -->|CNF returns all null| T
    end

    subgraph Reclassify["task data:cnf:reclassify"]
        W[Query all recipes WHERE dietary_profile->fopFlags IS NULL] --> X[Enqueue ClassifyDietaryProfile with forceReclassify: true]
    end

    subgraph Backup["ManagementService"]
        E --> BA[BackupAsync: export cnf-cfg-groups.csv to DataRoot]
    end
```

---

## Seam inventory

| Seam | Existing shape | What we add | Risk |
|---|---|---|---|
| `schema.sql` | Has `vector` extension | Add `pg_trgm` extension + `cnf_foods` table + GIN index | Order matters: extension before index |
| `ingredient_categories` table | `normalized_key, grocery_section, ...` | Add `cnf_food_id integer REFERENCES cnf_foods` nullable | Existing rows unaffected (nullable) |
| `IngredientCategory.cs` model | Maps `ingredient_categories` | Add `CnfFoodId int?` column property | Additive |
| `ClassifyDietaryProfileProcessor` | Steps 11–13: parse `raw_metadata.nutrition` → `FopFlags` | Replace with CNF lookup; fall back to `raw_metadata.nutrition` when CNF yields nothing | Replaces existing steps 11–13 in design |
| `ManagementService.BackupAsync` | Steps 1–6 | Add CNF group export | Extend in-place |
| `Program.cs` | Processor registrations | Register `NutrientLookup` as scoped | No conflict |

---

## Database Schema Changes

Add to `api/database/schema.sql` after `CREATE EXTENSION IF NOT EXISTS vector`:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS cnf_foods (
    food_id integer PRIMARY KEY,
    food_name text NOT NULL,
    cfg_food_group text,
    sodium_mg_per_100g float,
    sugar_g_per_100g float,
    saturated_fat_g_per_100g float,
    carbohydrate_g_per_100g float,
    created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cnf_foods_name_trgm
    ON cnf_foods USING gin (food_name gin_trgm_ops);

ALTER TABLE ingredient_categories ADD COLUMN IF NOT EXISTS
    cnf_food_id integer REFERENCES cnf_foods(food_id) ON DELETE SET NULL;
```

---

## New C# model

#### `CNFFood.cs`

```csharp
namespace RecipeApi.Models;

public record CNFFood(
    int FoodId,
    string FoodName,
    string? CfgFoodGroup,
    double? SodiumMgPer100g,
    double? SugarGPer100g,
    double? SaturatedFatGPer100g,
    double? CarbohydrateGPer100g
);
```

#### `IngredientCategory.cs` — add one property

```csharp
[Column("cnf_food_id")]
public int? CnfFoodId { get; set; } = null;
```

---

## New C# service: `NutrientLookup`

**File:** `api/src/RecipeApi/Services/NutrientLookup.cs`

**Registration:** Scoped in `Program.cs`.

```
public class NutrientLookup(RecipeDbContext db, ILogger<NutrientLookup> logger)

public async Task<CNFFood?> FindAsync(string normalizedKey, CancellationToken ct)
```

**Step-by-step:**

1. Load `ingredient_categories` row for `normalizedKey`.
2. If `row.CnfFoodId != null` → `SELECT * FROM cnf_foods WHERE food_id = @id` → return.
3. If `cnf_foods` is empty (not yet seeded) → return null, log warning once.
4. Trigram search (raw SQL, parameterized):
   ```sql
   SELECT food_id, food_name, cfg_food_group,
          sodium_mg_per_100g, sugar_g_per_100g,
          saturated_fat_g_per_100g, carbohydrate_g_per_100g
   FROM cnf_foods
   WHERE similarity(food_name, @query) >= 0.4
   ORDER BY similarity(food_name, @query) DESC
   LIMIT 1
   ```
5. If found → `UPDATE ingredient_categories SET cnf_food_id = @foodId WHERE normalized_key = @key` → return result.
6. If not found → return null.

**Error handling:** Any DB exception → log error → return null. Never throws. The processor continues with null.

---

## New C# service: `CnfIngestionService`

**File:** `api/src/RecipeApi/Services/CnfIngestionService.cs`

**Invoked by:** `task data:cnf:seed` — a minimal console command or `IHostedService` that calls this service once and exits.

```
public class CnfIngestionService(RecipeDbContext db, ILogger<CnfIngestionService> logger)

public async Task<int> SeedAsync(Stream cnfZipStream, CancellationToken ct)
  // Returns count of upserted rows.
  // 1. Open ZIP stream.
  // 2. Parse NUTRIENT_NAME.csv → Dictionary<int, string> nutrientIdToName
  // 3. Parse NUTRIENT_AMOUNT.csv → Dictionary<int, NutrientValues> foodIdToNutrients
  //    (NutrientValues = { Sodium, Sugar, SatFat, Carbs } — extracted by nutrientId)
  // 4. Parse FOOD_NM.csv → filter language code "E" (English) only
  // 5. For each English food name: upsert cnf_foods ON CONFLICT (food_id) DO UPDATE
  // 6. Log count of upserted rows.
```

**`NutrientValues` (internal record):**
```csharp
private record NutrientValues(
    double? SodiumMgPer100g,
    double? SugarGPer100g,
    double? SaturatedFatGPer100g,
    double? CarbohydrateGPer100g
);
```

**Nutrient IDs:**
```csharp
private static class CnfNutrientIds
{
    public const int Sodium       = 307;
    public const int Sugars       = 269;
    public const int SaturatedFat = 606;
    public const int Carbohydrate = 205;
}
```

**CFG food group mapping** (static dictionary in the service — nutritional judgment, not technical):

```csharp
private static readonly Dictionary<string, string> CnfGroupToCfg =
    new(StringComparer.OrdinalIgnoreCase)
{
    ["Beef Products"]                        = "ProteinFoods",
    ["Poultry Products"]                     = "ProteinFoods",
    ["Pork Products"]                        = "ProteinFoods",
    ["Lamb, Veal, and Game Products"]        = "ProteinFoods",
    ["Finfish and Shellfish Products"]       = "ProteinFoods",
    ["Legumes and Legume Products"]          = "ProteinFoods",
    ["Nut and Seed Products"]                = "ProteinFoods",
    ["Eggs"]                                 = "ProteinFoods",
    ["Dairy and Egg Products"]               = "ProteinFoods",
    ["Cereal Grains and Pasta"]              = "WholeGrains",
    ["Breakfast Cereals"]                    = "WholeGrains",
    ["Baked Products"]                       = "WholeGrains",
    ["Vegetables and Vegetable Products"]    = "VegetablesAndFruits",
    ["Fruits and Fruit Juices"]              = "VegetablesAndFruits",
    ["Fats and Oils"]                        = "Mixed",
    ["Soups, Sauces, and Gravies"]           = "Mixed",
    ["Sweets"]                               = "Mixed",
    ["Beverages"]                            = "Mixed",
    ["Spices and Herbs"]                     = "Mixed",
    ["Snacks"]                               = "Mixed",
    ["Fast Foods"]                           = "Mixed",
    ["Meals, Entrees, and Side Dishes"]      = "Mixed",
    // Any unmapped group defaults to "Mixed" at runtime
};
```

This mapping must be published in `api/docs/CNF_INGESTION.md` for human review.

---

## New C# static class: `UnitWeightTable`

**File:** `api/src/RecipeApi/Utils/UnitWeightTable.cs`

Used by `ClassifyDietaryProfileProcessor` to convert recipe supply quantities to grams before scaling CNF per-100g values.

```csharp
public static class UnitWeightTable
{
    // Returns grams for a given quantity + unit combination.
    // Returns null when conversion is not possible — caller uses 100g default.
    public static double? ToGrams(double quantity, string? unitText, string ingredientName)
}
```

**Unit conversions (deterministic, static):**

| Unit | Grams |
|---|---|
| `g` | 1g per unit |
| `kg` | 1000g per unit |
| `ml` / `l` | 1g per ml (water density approximation — acceptable for sauces, milk, oil) |
| `tbsp` / `tablespoon` | 15g |
| `tsp` / `teaspoon` | 5g |
| `cup` | 240g |
| `oz` | 28g |
| `lb` | 454g |
| `unit` / `units` / null | Look up `ingredientName` in `UnitWeightEstimates` table |

**`UnitWeightEstimates` (static dictionary — most common unitless ingredients):**

```csharp
private static readonly Dictionary<string, double> UnitWeightEstimates =
    new(StringComparer.OrdinalIgnoreCase)
{
    ["chicken breast"]   = 150,
    ["chicken thigh"]    = 100,
    ["chicken thighs"]   = 100,
    ["egg"]              = 50,
    ["apple"]            = 180,
    ["banana"]           = 120,
    ["onion"]            = 150,
    ["garlic"]           = 5,     // one clove
    ["lemon"]            = 85,
    ["lime"]             = 65,
    ["carrot"]           = 80,
    ["potato"]           = 150,
    ["tomato"]           = 120,
    ["avocado"]          = 150,
    ["broccoli"]         = 350,   // one head
    // Unknown unitless ingredients → 100g default, log warning
};
```

When unit is unknown and ingredient is not in `UnitWeightEstimates`, default to 100g and log a warning so the table can be extended over time.

---

## Modified: `ClassifyDietaryProfileProcessor`

Replace the current steps 11–13 (parse `raw_metadata.nutrition` → `FopFlags`) with:

```
11. For each ingredient name in supply[]:
    a. Normalize name via IngredientNormalizer.Normalize.
    b. Call NutrientLookup.FindAsync(normalizedKey, ct).
    c. If found: convert supply quantity to grams via UnitWeightTable.ToGrams.
    d. Compute nutrient contribution: CNFFood.SodiumMgPer100g × (grams / 100), etc.
12. Sum all per-ingredient nutrient contributions.
13. Parse recipeYield from recipe.RawMetadata (extract leading integer from string like "2 portions").
    Default to 2 when absent or unparseable.
14. Divide summed nutrients by recipeYield → per-portion values.
15. Call NutritionParser.ComputeFopFlags with CNF-derived per-portion values.
    If ALL ingredients returned null from NutrientLookup (CNF not seeded or no matches):
      fall back to NutritionParser.ComputeFopFlags(raw_metadata.nutrition).
16. Attach FopFlags to RecipeDietaryProfile before serialization.
```

This replaces the simpler steps 11–13 from `recipe-categorization` design.md. The `recipe-categorization` spec tasks must be updated to reflect this extended flow (see Tasks note below).

---

## New Taskfile target

```yaml
data:cnf:seed:
  desc: "Download and seed Canadian Nutrient File data into cnf_foods table"
  cmds:
    - dotnet run --project api/src/RecipeApi -- cnf-seed

data:cnf:reclassify:
  desc: "Re-run ClassifyDietaryProfile with forceReclassify for recipes with null fopFlags"
  cmds:
    - dotnet run --project api/src/RecipeApi -- cnf-reclassify
```

Both commands exit after completion. They are not web server operations.

---

## Testing Strategy

### Critical seam tests

| Seam | Test | File |
|---|---|---|
| `pg_trgm` enabled | Integration: `SELECT similarity('chicken', 'chicken breast')` returns a value > 0 | Schema smoke test |
| `NutrientLookup` — cache miss → match | Integration: known CNF food name → returns correct `food_id`, `cnf_food_id` written to `ingredient_categories` | `NutrientLookupTests.cs` |
| `NutrientLookup` — cache hit | Integration: second call for same key → no trigram query executed | `NutrientLookupTests.cs` |
| `NutrientLookup` — below threshold | Integration: `"xyzzy_nonexistent"` → null, no exception | `NutrientLookupTests.cs` |
| `NutrientLookup` — empty `cnf_foods` | Integration: call before seeding → null, warning logged | `NutrientLookupTests.cs` |
| `CnfIngestionService` | Integration: seed from test CSV fixture → row count matches | `CnfIngestionTests.cs` |
| `CnfIngestionService` idempotence | Integration: seed twice → row count unchanged | `CnfIngestionTests.cs` |
| `UnitWeightTable` | Unit: `"g"` → 1×quantity; `"tbsp"` → 15×quantity; unknown unit + known ingredient → estimate; unknown unit + unknown ingredient → 100g | `UnitWeightTableTests.cs` |
| `ClassifyDietaryProfileProcessor` CNF path | Unit: ingredient with known CNF match → `fopFlags` computed from CNF values, not `raw_metadata.nutrition` | `ClassifyDietaryProfileProcessorTests.cs` |
| `ClassifyDietaryProfileProcessor` fallback | Unit: all CNF lookups return null, `raw_metadata.nutrition` present → `fopFlags` from `raw_metadata` | `ClassifyDietaryProfileProcessorTests.cs` |
| `ClassifyDietaryProfileProcessor` all-null | Unit: all CNF lookups return null, `raw_metadata.nutrition` null → `fopFlags = null` | `ClassifyDietaryProfileProcessorTests.cs` |

### Test fixture

Create `api/src/RecipeApi.Tests/Fixtures/cnf_sample.csv` with 10–15 rows covering:
- Chicken breast (poultry, known nutrients)
- Beef ground (beef products, high saturated fat)
- Brown rice (cereal grains, low sodium)
- Broccoli (vegetables, low all)
- Milk 2% (dairy)

This fixture is used by `CnfIngestionTests` and `NutrientLookupTests` — no real CNF download needed in tests.

### Test commands

```bash
task test:api
task test
```
