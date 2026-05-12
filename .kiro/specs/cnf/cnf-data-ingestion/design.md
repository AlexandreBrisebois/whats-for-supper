# Design Document: CNF Data Ingestion

## Overview

A one-time seeding pipeline that downloads the Canadian Nutrient File (CNF) from Health Canada's Open Government Portal, upserts ~5,700 food records into a local `cnf_foods` table, and exposes provider-backed services that resolve normalized ingredient names to canonical food entries via trigram similarity. Results are cached in the existing `ingredient_categories` table. `ClassifyDietaryProfileProcessor` is extended to use provider nutrient values for `FopFlags`, category prediction, and `IsHealthyChoice` prediction, making health warnings and FOP week summaries accurate for the full recipe library when health guidance is enabled. The same CNF English/French food-name pairs also augment recipe search so French ingredient queries can find English recipe text and English queries can find French recipe text.

CNF is the first implementation of a pluggable food data provider strategy. The application-level consumers depend on interfaces so a later `UsdaFoodDataProvider`, Swedish provider, or other national food-guide provider can swap in without rewriting search and categorization flows.

No LLM. No runtime external calls. No new workflow.

---

## Architecture

```mermaid
flowchart TD
    subgraph Strategy["Food data provider strategy"]
        ST1[App settings/configuration] --> ST2{Active provider key}
        ST2 -->|CanadaCNF default| ST3[CanadaCnfFoodDataProvider]
        ST2 -->|Future| ST4[USDA / Swedish / other provider]
        ST3 --> ST5[IFoodDataProvider seams]
        ST4 --> ST5
    end

    subgraph Seed["task data:cnf:seed (one-time operator command)"]
        A[Download CNF ZIP from Health Canada Open Government Portal] --> B[Parse NUTRIENT_NAME.csv → nutrientId map]
        B --> C[Parse NUTRIENT_AMOUNT.csv → foodId→nutrient map]
        C --> D[Parse FOOD_NM.csv → English names + French aliases]
        D --> E[Upsert cnf_foods table]
        E --> F[Log row count]
    end

    subgraph Lookup["NutrientLookup service — called at import time"]
        G[Normalized ingredient name] --> H{ingredient_categories.cnf_food_id set?}
        H -->|Cache hit| I[SELECT cnf_foods WHERE food_id = cached_id]
        H -->|Cache miss| J[pg_trgm similarity search on cnf_foods.food_name_en]
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
        S --> T[ComputeFopFlags + provider food-guide group signals]
        T --> U[Write dietary_profile + IsHealthyChoice/category signals]
        V[raw_metadata.nutrition fallback] -->|CNF returns all null| T
    end

    subgraph Reclassify["task data:cnf:reclassify"]
        W[Query all recipes WHERE dietary_profile->fopFlags IS NULL] --> X[Enqueue ClassifyDietaryProfile with forceReclassify: true]
    end

    subgraph Search["RecipeSearchService alias expansion"]
        SA[User query] --> SB[ICnfIngredientAliasExpander]
        SB --> SC[Original query + bounded CNF equivalents]
        SC --> SD[Existing lexical ranking]
        SD --> SE[Same RecipeSearchResponseDto]
    end

    subgraph Backup["ManagementService"]
        E --> BA[BackupAsync: export cnf-cfg-groups.csv to DataRoot]
    end

    subgraph Settings["Health guidance settings"]
        HS1[family/app settings] --> HS2{Health guidance enabled?}
        HS2 -->|Yes| HS3[Warnings, nutrition filters, planner nudges, steering]
        HS2 -->|No| HS4[Recipe/search/planning continue without health steering]
    end
```

---

## Seam inventory

| Seam | Existing shape | What we add | Risk |
|---|---|---|---|
| `schema.sql` | Has `vector` extension | Add `pg_trgm` extension + `cnf_foods` table + GIN index | Order matters: extension before index |
| `ingredient_categories` table | `normalized_key, grocery_section, ...` | Add `cnf_food_id integer REFERENCES cnf_foods` nullable | Existing rows unaffected (nullable) |
| `IngredientCategory.cs` model | Maps `ingredient_categories` | Add `CnfFoodId int?` column property | Additive |
| `RecipeSearchService` | Lexical ranking uses the raw user query | Add optional `ICnfIngredientAliasExpander` before lexical ranking, initially backed only by CNF bilingual aliases | Must preserve existing request/response contract |
| `ClassifyDietaryProfileProcessor` | Steps 11–13: parse `raw_metadata.nutrition` → `FopFlags` | Replace with provider-backed lookup; fall back to `raw_metadata.nutrition` when provider yields nothing; use provider food-guide group as deterministic category/`IsHealthyChoice` signal | Replaces existing steps 11–13 in design |
| Food data provider strategy | No shared provider seam | Add consumer-facing interfaces above CNF-specific ingestion/search/lookup paths, while keeping first-slice storage/operator details concrete | Prevents Canada-specific logic from leaking into consumers without overbuilding generic persistence too early |
| SettingsService / app settings | Generic key-value settings exist | Add health guidance setting consumed by search/planning/family-health surfaces | Must not disable core capture/search/planning |
| `ManagementService.BackupAsync` | Steps 1–6 | Add CNF group export | Extend in-place |
| `Program.cs` | Processor registrations | Register `NutrientLookup` as scoped | No conflict |

---

## Database Schema Changes

Add to `api/database/schema.sql` after `CREATE EXTENSION IF NOT EXISTS vector`:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS cnf_foods (
    food_id integer PRIMARY KEY,
    food_name_en text NOT NULL,
    food_name_fr text,
    cfg_food_group text,
    sodium_mg_per_100g float,
    sugar_g_per_100g float,
    saturated_fat_g_per_100g float,
    carbohydrate_g_per_100g float,
    created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cnf_foods_name_en_trgm
    ON cnf_foods USING gin (food_name_en gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cnf_foods_name_fr_trgm
    ON cnf_foods USING gin (food_name_fr gin_trgm_ops);

ALTER TABLE ingredient_categories ADD COLUMN IF NOT EXISTS
    cnf_food_id integer REFERENCES cnf_foods(food_id) ON DELETE SET NULL;
```

---

## Provider strategy

The data source is implemented as a strategy, with Canada CNF as the first concrete provider. Keep CNF-specific parsing and nutrient IDs inside the CNF provider; keep application consumers on provider-facing interfaces.

The abstraction boundary stops at application-consumer capabilities. For this first slice, `cnf_foods`, `ingredient_categories.cnf_food_id`, `task data:cnf:seed`, and the CNF backup/audit docs remain explicitly CNF-shaped instead of being renamed into provider-neutral infrastructure. That keeps the implementation legible and avoids extra indirection with no immediate household payoff. If a second provider is added later, that is the point to extract shared persistence patterns from proven duplication rather than guessing them up front.

**Provider key:** `CanadaCNF` (default).

**Settings/configuration:**

```json
{
  "FoodData": {
    "Provider": "CanadaCNF"
  }
}
```

If the configured provider is unknown, startup fails with a clear error.

**Core interfaces:**

```csharp
public interface IFoodDataProvider
{
    string ProviderKey { get; }
    IFoodDataIngestion Ingestion { get; }
    IFoodNutrientLookup NutrientLookup { get; }
    ILocalizedFoodAliasExpander AliasExpander { get; }
    IFoodGuideMapper FoodGuideMapper { get; }
}

public interface IFoodGuideMapper
{
    string MapToFoodGuideGroup(string providerGroupCodeOrName);
}
```

`CanadaCnfFoodDataProvider` wires:
- CNF ZIP/CSV ingestion.
- CNF nutrient IDs: sodium 307, sugars 269, saturated fat 606, carbohydrate 205.
- Canada Food Guide group mapping.
- English/French localized alias expansion.
- Postgres `pg_trgm` similarity over `cnf_foods`.
- CNF-specific storage and operator assumptions for this first provider.

Future providers can use their own source files/API refresh mechanism, language pairs, and provider-owned persistence internals while preserving the same lookup/search/categorization contracts.

---

## New C# model

#### `CNFFood.cs`

```csharp
namespace RecipeApi.Models;

public record CNFFood(
    int FoodId,
    string FoodNameEn,
    string? FoodNameFr,
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

**Postgres-only seam:** `pg_trgm` is like the existing vector search path: EF Core does not support the operator/function through portable LINQ. Keep the unsupported feature behind a narrow production seam so EF InMemory tests can mock it while production still uses the real Postgres SQL.

```
public interface ICnfSimilaritySearch
{
    Task<CNFFood?> FindBestMatchAsync(string normalizedKey, CancellationToken ct);
}

public class PostgresCnfSimilaritySearch(RecipeDbContext db, ILogger<PostgresCnfSimilaritySearch> logger)

public class NutrientLookup(
    RecipeDbContext db,
    ICnfSimilaritySearch similaritySearch,
    ILogger<NutrientLookup> logger)

public async Task<CNFFood?> FindAsync(string normalizedKey, CancellationToken ct)
```

`ICnfSimilaritySearch` is the CNF provider's concrete implementation of the provider-level nutrient lookup seam. Application consumers should depend on `NutrientLookup` / provider interfaces, not on CNF parsing classes.

**Step-by-step:**

1. Load `ingredient_categories` row for `normalizedKey`.
2. If `row.CnfFoodId != null` → `SELECT * FROM cnf_foods WHERE food_id = @id` → return.
3. If `cnf_foods` is empty (not yet seeded) → return null, log warning once.
4. Cache miss calls `ICnfSimilaritySearch.FindBestMatchAsync(normalizedKey, ct)`.
5. Production implementation runs trigram search (raw SQL, parameterized):
   ```sql
   SELECT food_id, food_name_en, cfg_food_group,
          sodium_mg_per_100g, sugar_g_per_100g,
          saturated_fat_g_per_100g, carbohydrate_g_per_100g
   FROM cnf_foods
   WHERE similarity(food_name_en, @query) >= 0.4
   ORDER BY similarity(food_name_en, @query) DESC
   LIMIT 1
   ```
6. EF InMemory/unit tests inject a fake `ICnfSimilaritySearch` with deterministic matches, including exact threshold boundary behavior when needed.
7. If found → `UPDATE ingredient_categories SET cnf_food_id = @foodId WHERE normalized_key = @key` → return result.
8. If not found → return null.

**Error handling:** Any DB exception → log error → return null. Never throws. The processor continues with null.

---

## Operator correction workflow

The first slice keeps CNF correction explicitly operator-shaped rather than introducing a user-facing admin surface. The goal is to remove the manual-SQL dead end when a sticky trigram match is wrong.

**Supported actions:**

1. **Inspect** a cached mapping for one `normalized_key`:
   - Load `ingredient_categories.normalized_key`, `cnf_food_id`, `updated_at`, `source`, and the joined CNF English/French food names when present.
2. **Clear** a cached mapping for one `normalized_key`:
   - Set `cnf_food_id = null`.
   - Leave the lexical `normalized_key` row intact so grocery categorization and human section overrides are preserved.
   - The next background CNF lookup may re-run similarity search naturally.
3. **Override** a cached mapping for one `normalized_key`:
   - Set `cnf_food_id = <confirmed food_id>`.
   - Validate that the target `food_id` exists in `cnf_foods` before writing.

**Operational boundary:**

- Keep this path outside OpenAPI and PWA for now.
- A Taskfile/operator command or management-service-owned operator seam is sufficient.
- Do not replace `normalized_key` with CNF identity. `normalized_key` remains the lexical cache key; `cnf_food_id` is the attached canonical food identity.

**Audit/logging requirements:**

- Every clear/override action logs:
  - `normalized_key`
  - previous `cnf_food_id`
  - new `cnf_food_id`
  - action type
- `updated_at` is refreshed on every correction.
- Documentation must show operators how to inspect a suspect match, clear it, and apply an override when the correct `food_id` is known.

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
  // 4. Parse FOOD_NM.csv → handle language rows explicitly:
  //    English rows seed cnf_foods.food_name_en.
  //    French rows/descriptions seed cnf_foods.food_name_fr when an English row exists.
  //    French-only food IDs are skipped until an English name exists.
  //    Bilingual duplicate FoodID rows seed one row using English name + French alias.
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

## Modified: `RecipeSearchService` alias expansion

**Files:**
- `api/src/RecipeApi/Services/RecipeSearchService.cs`
- `api/src/RecipeApi/Services/CnfIngredientAliasExpander.cs`
- `api/src/RecipeApi/Services/PostgresCnfIngredientAliasExpander.cs`

**Registration:** Register the active provider's ingredient alias expander as scoped in `Program.cs`. EF InMemory tests inject a fake. The Canada provider implements the shared `ICnfIngredientAliasExpander` seam. In this ingestion slice, only bilingual English/French provider aliases are enabled; static synonym expansion and alias reason metadata are added by `cnf-search-augmentation`.

```
public interface ICnfIngredientAliasExpander
{
    Task<CnfAliasExpansion> ExpandAsync(string query, CancellationToken ct);
}

public sealed record CnfAliasExpansion(
    IReadOnlyList<string> Terms,
    IReadOnlyList<CnfAliasMatch> Matches);

public sealed record CnfAliasMatch(
    string OriginalTerm,
    string ExpandedTerm,
    string Source); // "cnf-bilingual" initially

public class PostgresCnfIngredientAliasExpander(
    RecipeDbContext db,
    ILogger<PostgresCnfIngredientAliasExpander> logger)
```

**Behavior:**

1. If the query is null/empty/whitespace, return an empty list and do not change search behavior.
2. Normalize the query using the same search normalization style already used by `RecipeSearchService`.
3. Run a parameterized Postgres raw SQL query against `cnf_foods.food_name_en` and `cnf_foods.food_name_fr`:
   - If the user term is closer to `food_name_fr`, return the English `food_name_en`.
   - If the user term is closer to `food_name_en`, return the French `food_name_fr`.
   - Only accept matches with `similarity >= 0.4`.
   - Return at most 5 equivalent terms.
4. Deduplicate expansions case-insensitively and exclude terms already present in the original query.
5. `RecipeSearchService.SearchAsync` keeps `dto.Query` unchanged for telemetry and response echoing, but passes an expanded lexical query into `GetLexicalCandidatesAsync` / `BuildRankedCandidates`.
6. Expansion is additive only. Existing matches for the original query must keep working exactly as before.
7. If CNF is empty, missing French aliases, or the expander throws, log and continue with the original query.
8. Do not add search reason DTO fields in this task; any `Matches` returned here remain internal until `cnf-search-augmentation` Task 3 adds the OpenAPI reason source.

**Raw SQL sketch:**

```sql
SELECT food_name_en, food_name_fr,
       GREATEST(similarity(food_name_en, @query), similarity(food_name_fr, @query)) AS score
FROM cnf_foods
WHERE food_name_fr IS NOT NULL
  AND (
      similarity(food_name_en, @query) >= 0.4
      OR similarity(food_name_fr, @query) >= 0.4
  )
ORDER BY score DESC
LIMIT 5;
```

The implementation chooses the opposite-language term from each row based on which side matched best. Do not add new OpenAPI fields for this slice.

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

## Shared internal nutrition estimation metadata

Approximate unit and yield handling must produce one shared internal quality signal instead of letting each downstream surface infer confidence independently.

```csharp
public record NutritionEstimateMetadata(
    string Source,
    string Confidence,
    int TotalIngredients,
    int MatchedIngredients,
    bool UsedApproximateUnitConversion,
    bool UsedDefaultUnitWeight,
    bool UsedDefaultRecipeYield
);
```

This metadata is internal. It exists so search nudges, planner/weekly HEFI summaries, and dietitian recommendation logic can all reuse the same estimation-quality judgment. Do not add OpenAPI DTO fields in this branch; DTO exposure is a separate contract decision.

**Conservative mapping:**

| Data condition | Source | Confidence |
|---|---|---|
| `raw_metadata.nutrition` used because all CNF/provider lookups returned null | `source-nutrition` | `high` |
| Provider path with complete ingredient coverage and no default unit/yield guesses | `estimated-from-ingredients` | `high` |
| Provider path with approximate unit conversion but no 100g fallback and no default yield | `estimated-from-ingredients` | `medium` |
| Provider path with any 100g default, default yield, or sparse provider coverage | `estimated-from-ingredients` | `low` |

Downstream consumers should map from this shared metadata rather than re-deriving confidence from `fopFlags` or ad-hoc heuristics.

---

## Modified: `ClassifyDietaryProfileProcessor`

Replace the current steps 11–13 (parse `raw_metadata.nutrition` → `FopFlags`) with:

```
11. For each ingredient name in supply[]:
    a. Normalize name via IngredientNormalizer.Normalize.
    b. Call NutrientLookup.FindAsync(normalizedKey, ct).
    c. If found: convert supply quantity to grams via UnitWeightTable.ToGrams.
    d. Compute nutrient contribution: CNFFood.SodiumMgPer100g × (grams / 100), etc.
12. Track estimation-quality signals while iterating:
    a. total ingredient count,
    b. matched provider ingredient count,
    c. whether any approximate unit conversion was used,
    d. whether any ingredient fell back to the 100g default.
13. Sum all per-ingredient nutrient contributions.
14. Parse recipeYield from recipe.RawMetadata (extract leading integer from string like "2 portions").
    Default to 2 when absent or unparseable.
    Record whether the default yield was used.
15. Divide summed nutrients by recipeYield → per-portion values.
16. Call NutritionParser.ComputeFopFlags with CNF-derived per-portion values.
    If ALL ingredients returned null from NutrientLookup (CNF not seeded or no matches):
      fall back to NutritionParser.ComputeFopFlags(raw_metadata.nutrition).
17. Build `NutritionEstimateMetadata` from the shared rules above.
18. Attach `FopFlags` and internal estimation metadata to the classification output before serialization/storage so downstream health-facing consumers can reuse it without inventing new confidence logic.
```

This replaces the simpler steps 11–13 from `recipe-categorization` design.md. The `recipe-categorization` spec tasks must be updated to reflect this extended flow (see Tasks note below).

### Recipe category and `IsHealthyChoice` signal

The provider data must feed the existing recipe categorization workflow, not sit beside it unused.

1. Resolve each supply ingredient through `NutrientLookup`.
2. Count matched provider food-guide groups across ingredients.
3. Use those groups as deterministic hints when building/updating the dietary profile:
   - vegetable/fruit-heavy recipes strengthen `VegetablesAndFruits` category confidence,
   - legume/fish/poultry/egg/nut-heavy recipes strengthen `ProteinFoods`,
   - grain-heavy recipes strengthen `WholeGrains` when mapped as such,
   - high sodium/sugar/saturated fat FOP flags weaken `IsHealthyChoice`.
4. Keep LLM-derived category output as the fallback where provider coverage is low.
5. Store the final result in the existing recipe/category/dietary profile fields. Do not add a parallel provider-only classification field in this slice.

When health guidance is disabled, the workflow may still compute these values for consistency, but user-facing steering and explanations must ignore them.

---

## Health guidance settings

Use the existing settings pattern (`SettingsController` / `SettingsService` / `family_settings`) unless implementation discovers a stronger established app-level setting surface.

Recommended setting key:

```text
health_guidance_enabled
```

Default: `true`.

Consumers must check this setting before applying user-facing dietary steering:
- family-health warnings,
- planner nudges and week-balance health copy,
- nutrition-aware search filters/boosts,
- dietitian-agent recommendations,
- search result health explanation text.

Core recipe capture, recipe search, planning, and grocery list generation must continue when the setting is `false`.

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
| `pg_trgm` enabled | Postgres compatibility: isolated disposable pgvector database; `SELECT similarity('chicken', 'chicken breast')` returns a value > 0 | Schema smoke test |
| `ICnfSimilaritySearch` production path | Postgres compatibility: seeded `cnf_foods`; raw SQL accepts similarity `>= 0.4`, rejects `< 0.4`, and returns top match | `CnfSimilaritySearchPostgresTests.cs` |
| `NutrientLookup` — cache miss → match | EF InMemory/unit: fake `ICnfSimilaritySearch` returns known food → `cnf_food_id` written to `ingredient_categories` | `NutrientLookupTests.cs` |
| `NutrientLookup` — cache hit | EF InMemory/unit: second call for same key → fake similarity search not called | `NutrientLookupTests.cs` |
| `NutrientLookup` — below threshold | EF InMemory/unit: fake similarity search returns null for `"xyzzy_nonexistent"` → null, no exception | `NutrientLookupTests.cs` |
| `NutrientLookup` — empty `cnf_foods` | EF InMemory/unit: call before seeding → null, warning logged | `NutrientLookupTests.cs` |
| `CnfIngestionService` | Integration: seed from test CSV fixture → row count matches | `CnfIngestionTests.cs` |
| `CnfIngestionService` idempotence | Integration: seed twice → row count unchanged | `CnfIngestionTests.cs` |
| `CnfIngestionService` French rows | Unit/integration: bilingual rows seed one English row; French-only rows skipped; nutrient joins remain correct | `CnfIngestionTests.cs` |
| `RecipeSearchService` French → English | Integration/unit with fake expander: query `"poulet"` returns recipe containing `"chicken"` | `RecipeSearchIntegrationTests.cs` |
| `RecipeSearchService` English → French | Integration/unit with fake expander: query `"chicken"` returns recipe containing `"poulet"` | `RecipeSearchIntegrationTests.cs` |
| `ICnfIngredientAliasExpander` production path | Postgres compatibility: `food_name_en = chicken`, `food_name_fr = poulet`; raw SQL returns opposite-language expansion for each query with source `cnf-bilingual` | `CnfIngredientAliasExpanderPostgresTests.cs` |
| `RecipeSearchService` no CNF data | Integration/unit: empty expander result preserves existing lexical-only behavior and response contract | `RecipeSearchIntegrationTests.cs` |
| `UnitWeightTable` | Unit: `"g"` → 1×quantity; `"tbsp"` → 15×quantity; unknown unit + known ingredient → estimate; unknown unit + unknown ingredient → 100g | `UnitWeightTableTests.cs` |
| `ClassifyDietaryProfileProcessor` CNF path | Unit: ingredient with known CNF match → `fopFlags` computed from CNF values, not `raw_metadata.nutrition` | `ClassifyDietaryProfileProcessorTests.cs` |
| `ClassifyDietaryProfileProcessor` fallback | Unit: all CNF lookups return null, `raw_metadata.nutrition` present → `fopFlags` from `raw_metadata` | `ClassifyDietaryProfileProcessorTests.cs` |
| `ClassifyDietaryProfileProcessor` all-null | Unit: all CNF lookups return null, `raw_metadata.nutrition` null → `fopFlags = null` | `ClassifyDietaryProfileProcessorTests.cs` |

### Test fixture

Create `api/src/RecipeApi.Tests/Fixtures/cnf_sample/` with CNF-shaped CSV files covering:
- Chicken breast (poultry, known nutrients)
- Beef ground (beef products, high saturated fat)
- Brown rice (cereal grains, low sodium)
- Broccoli (vegetables, low all)
- Milk 2% (dairy)
- At least one bilingual `FoodID` with both English and French descriptions or language rows; expected result is one seeded row using the English description
- At least one French-only `FoodID` where the English description is absent; expected result is skipped with no seeded `cnf_foods` row
- Search-specific bilingual fixture examples: `chicken`/`poulet`, `beef`/`boeuf`, `carrot`/`carotte`

This fixture is used by `CnfIngestionTests` and `NutrientLookupTests` — no real CNF download needed in tests.

### Test commands

```bash
task test:api
task test
```
