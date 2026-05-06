# Design Document: Dietitian Agent — Phase 2

## Overview

This feature upgrades the balance and health-warning logic from Phase 1 with authoritative nutrient data (CNF), a validated HEFI-2019 score, ingredient-level allergen matching, and a single LLM call that generates weekly recipe recommendations for open slots.

**No LLM is used for scoring or allergy matching.** The LLM is used only for generating plain-language recommendations (Requirement 5), once per balance-state change, with a token budget of ~500–800 tokens.

**Hard dependencies:**
- `recipe-categorization` spec complete
- `family-health-profiles` spec complete
- `pg_trgm` PostgreSQL extension enabled
- CNF CSV files seeded via `task data:cnf:seed`

---

## Architecture

```mermaid
flowchart TD
    subgraph Seed["One-time CNF ingestion (task data:cnf:seed)"]
        A[Download CNF ZIP from Open Government Portal] --> B[Parse FOOD_NM.csv + NUTRIENT_AMOUNT.csv]
        B --> C[Upsert cnf_foods table]
        C --> D[Export cnf_cfg_groups.csv to DataRoot backup]
    end

    subgraph Lookup["NutrientLookup service"]
        E[Normalized ingredient name] --> F{ingredient_categories.cnf_food_id set?}
        F -->|Cache hit| G[Return cached CNFFood]
        F -->|Cache miss| H[pg_trgm similarity search on cnf_foods]
        H --> I{similarity >= 0.4?}
        I -->|Yes| J[Write cnf_food_id to ingredient_categories]
        I -->|No| K[Return null]
        J --> G
    end

    subgraph HEFI["HEFIScorer — pure code"]
        L[RecipeDietaryProfile[] + CNFFood nutrient data] --> M[Compute component scores]
        M --> N[Compute totalScore 0-100]
        N --> O[Write hefi_score to weekly_plans]
    end

    subgraph Allergy["Extended ConditionRuleEngine"]
        P[supply[] ingredient names] --> Q[NutrientLookup per ingredient]
        Q --> R[Match cnf_food_id against allergen synonym table]
        R --> S[Emit hard warnings for matches]
        T[proteinSource fallback] --> S
    end

    subgraph Recommend["GenerateWeeklyRecommendationsProcessor"]
        U{isBalanced: false AND open slots?} -->|Yes| V[Build compact LLM payload]
        V --> W[Single Gemini Flash call ~700 tokens]
        W --> X[Validate recipeId[] in response]
        X --> Y[Write recommendations to weekly_plans]
        U -->|No| Z[Clear recommendations]
    end

    subgraph API["GET /api/schedule"]
        O --> AA[Return ScheduleDays with hefiScore + recommendations]
        Y --> AA
    end
```

---

## Seam inventory

| Seam | Existing shape | What we add | Risk |
|---|---|---|---|
| `schema.sql` | Has `vector` extension | Add `pg_trgm` extension | Order matters — add before first use |
| `ingredient_categories` table | `normalized_key, grocery_section, confidence, source, created_at, updated_at` | Add `cnf_food_id integer REFERENCES cnf_foods(food_id)` | Nullable FK — existing rows unaffected |
| `weekly_plans` table | `grocery_items, balance_summary` added in Phase 1 | Add `hefi_score jsonb DEFAULT NULL`, `recommendations jsonb DEFAULT NULL` | Additive — no existing col changes |
| `ScheduleDays` C# record | Phase 1 added `BalanceSummary` as 7th param | Add `HefiScore` as 8th, `Recommendations` as 9th optional params | Positional record — append only, never reorder |
| `WeeklyPlan` model | Phase 1 added `BalanceSummary` | Add `HefiScore string?`, `Recommendations string?` | Additive |
| `GroceryRecomputeService` | Phase 1 added balance scoring and SSE nudge | Add HEFI scoring + recommendation trigger | Extend in-place; single `SaveChangesAsync` |
| `ConditionRuleEngine` | Phase 1: proteinSource-based matching | Extend to ingredient-level via CNF | Static class — add overload accepting `supply[]` |
| `IScheduleEventPublisher` | Phase 1 added `PublishDiscoveryNudgeAsync` | No new SSE events in Phase 2 | None |
| `ScheduleService.GetScheduleAsync` | Phase 1 returns `balanceSummary` | Also deserialize `hefiScore` and `recommendations` | Same pattern — extend in-place |

---

## Database Schema Changes

Add to `api/database/schema.sql`:

```sql
-- Enable trigram similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CNF reference data table (seeded by task data:cnf:seed, never written at runtime)
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

-- Extend ingredient_categories with CNF link
ALTER TABLE ingredient_categories ADD COLUMN IF NOT EXISTS
    cnf_food_id integer REFERENCES cnf_foods(food_id) ON DELETE SET NULL;

-- Extend weekly_plans
ALTER TABLE weekly_plans ADD COLUMN IF NOT EXISTS
    hefi_score jsonb DEFAULT NULL;

ALTER TABLE weekly_plans ADD COLUMN IF NOT EXISTS
    recommendations jsonb DEFAULT NULL;
```

**`cnf_foods` is reference data** — it is NOT managed by psqldef declarative migrations after initial creation. The ingestion task owns its content.

---

## Components and Interfaces

### New C# records

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

#### `FopFlags`, `FopWeekSummary`, `FopThresholds`, `NutritionParser` — defined in Phase 1

These types and constants are defined in the `recipe-categorization` spec and are available in Phase 2 without re-declaration. Phase 2 only upgrades the accuracy of `FopFlags` on existing recipes by replacing `raw_metadata.nutrition` values with CNF-sourced values via `forceReclassify`. Do not redefine these classes.

#### `HEFIScore.cs`

```csharp
namespace RecipeApi.Models;

public record FopWeekSummary(
    int HighInSaturatedFatDays,  // dinners this week with saturated fat >= FopThresholds.SaturatedFatG
    int HighInSugarsDays,        // dinners this week with sugars >= FopThresholds.SugarsG
    int HighInSodiumDays         // dinners this week with sodium >= FopThresholds.SodiumMg
);

public record HEFIScore(
    double TotalScore,                // 0–100
    double VegetableFruitScore,       // 0–20
    double WholeGrainScore,           // 0–10
    double ProteinFoodScore,          // 0–10
    double PlantProteinRatio,         // 0–5
    double SodiumScore,               // 0–10
    double SaturatedFatScore,         // 0–10
    FopWeekSummary FopWeekSummary     // count of dinners triggering each Health Canada FOP flag
);
```

`FopWeekSummary` is computed from per-recipe FOP flags. Per-recipe flags use `FopThresholds` constants (defined in `family-health-profiles` spec — do not duplicate). If a recipe has null nutrition data, it contributes 0 to all counts.

#### `WeeklyRecommendation.cs`

```csharp
namespace RecipeApi.Models;

public record WeeklyRecommendation(
    Guid RecipeId,
    string RecipeName,
    string Reason
);
```

---

### New C# service: `NutrientLookup`

**File:** `api/src/RecipeApi/Services/NutrientLookup.cs`

```
public class NutrientLookup(RecipeDbContext db, ILogger<NutrientLookup> logger)

public async Task<CNFFood?> FindAsync(string normalizedKey, CancellationToken ct)
  1. Check ingredient_categories.cnf_food_id for normalizedKey.
     If set, load and return cnf_foods row.
  2. Run pg_trgm similarity search:
     SELECT * FROM cnf_foods
     WHERE similarity(food_name, @query) >= 0.4
     ORDER BY similarity(food_name, @query) DESC
     LIMIT 1
  3. If found: write cnf_food_id to ingredient_categories row. Return result.
  4. If not found: return null.
```

EF Core raw SQL query for step 2 — `pg_trgm` functions are not natively supported by EF Core LINQ. Use `db.Database.SqlQuery<CNFFood>` with parameterized query.

---

### New C# service: `HEFIScorer`

**File:** `api/src/RecipeApi/Services/HEFIScorer.cs`

```
public static class HEFIScorer

public static HEFIScore Compute(
    IEnumerable<RecipeDietaryProfile?> profiles,
    IEnumerable<NutritionSummary?> nutritionData)
// Pure function. No DB. No LLM.
// nutritionData is per-recipe: sodium, saturated fat, sugar, carbohydrate
// (sourced from raw_metadata.nutrition OR cnf_foods if raw_metadata is null)
```

**HEFI-2019 component scoring (simplified for Phase 1):**

The full HEFI-2019 SAS algorithm scores against per-calorie targets. For Phase 1, use CFG proportion-based approximation (exact SAS parity is a Phase 2 refinement task):

| Component | Score range | Calculation |
|---|---|---|
| VegetableFruit | 0–20 | `veggieDays / 7 * 20` |
| WholeGrain | 0–10 | `grainDays / 7 * 10` (confirmed grains only) |
| ProteinFood | 0–10 | `proteinDays / 7 * 10` |
| PlantProteinRatio | 0–5 | `plantProteinDays / proteinDays * 5` (0 when proteinDays = 0) |
| Sodium | 0–10 | Linear penalty: 10 - (avgSodiumMg - 400) / 100, clamped 0–10 |
| SaturatedFat | 0–10 | Linear penalty: 10 - (avgSatFatG - 5) / 2, clamped 0–10 |
| Total | 0–100 | Sum of above × (100/65) to normalize to 0–100 |

**Note in design:** the SAS macro translation must be validated against published HEFI-2019 reference datasets before the feature is marked complete. Document the validation result in Notes/Decisions.

---

### Extended `ConditionRuleEngine`

Add a new overload that accepts ingredient CNF lookups:

```csharp
public static List<RecipeWarning> Evaluate(
    FamilyMember member,
    RecipeDietaryProfile? profile,
    NutritionInfo? nutrition,
    IEnumerable<CNFFood?> ingredientMatches)  // new parameter — nullable items for unmatched ingredients
```

The existing overload (without `ingredientMatches`) remains unchanged — Phase 1 callers are not broken.

**Allergen synonym dictionary** (static, in the class):

```csharp
private static readonly Dictionary<string, string[]> AllergenSynonyms = new(StringComparer.OrdinalIgnoreCase)
{
    ["Shellfish"] = ["clam","mussel","oyster","scallop","shrimp","prawn","crab","lobster","squid","octopus"],
    ["TreeNuts"]  = ["almond","cashew","walnut","pecan","hazelnut","pistachio","macadamia","brazil nut"],
    ["Peanuts"]   = ["peanut","groundnut","arachis"],
    ["Gluten"]    = ["wheat","barley","rye","spelt","kamut","triticale"],
    ["Dairy"]     = ["milk","cream","butter","cheese","yogurt","whey","casein","lactose"],
    ["Eggs"]      = ["egg","albumin","mayonnaise"],
    ["Soy"]       = ["soy","soya","tofu","tempeh","edamame","miso"],
    ["Fish"]      = ["salmon","tuna","cod","halibut","tilapia","anchovy","sardine","herring"],
};
```

For each allergen in `member.HealthProfile.Allergies`:
1. Check if it's a key in `AllergenSynonyms`.
2. If yes: check each `CNFFood.FoodName` in `ingredientMatches` for substring match against any synonym.
3. If match: emit `hard` warning naming the specific ingredient and the allergen.
4. If no CNF match available for an ingredient: fall back to Phase 1 `proteinSource` check.

---

### New workflow processor: `GenerateWeeklyRecommendationsProcessor`

**File:** `api/src/RecipeApi/Services/Processors/GenerateWeeklyRecommendationsProcessor.cs`

**Pattern:** Follow `ClassifyDietaryProfileProcessor` structure.

```
ExecuteAsync:
  1. Parse weekOffset (Monday date) from payload.
  2. Load weekly_plans row. If not found → return.
  3. Load balance_summary. If null OR isBalanced = true → clear recommendations → return.
  4. Count open dinner slots. If 0 → clear recommendations → return.
  5. Check idempotence: if recommendations already set AND balance_summary hash unchanged → return.
  6. Load health profiles for all family members (conditions + preferences only — not allergy lists).
  7. Load top-20 highest-rated, discoverable recipes not assigned to this week.
     For each: { id, name, primaryFoodGroup } from dietary_profile.
  8. Build LLM payload (see below).
  9. Single Gemini Flash call.
  10. Validate: each recipeId in response must exist in the top-20 list loaded in step 7.
  11. Write recommendations JSON to weekly_plans.recommendations.
  12. SaveChangesAsync.
  On any LLM error → log → return without writing (prior recommendations preserved).
```

**LLM payload (~500–800 tokens):**

```json
{
  "weekSummary": {
    "proteinDays": 4, "veggieDays": 2, "grainDays": 1,
    "plantProteinDays": 0, "isBalanced": false,
    "recommendations": ["Try to include vegetables or fruit in at least 4 dinners."]
  },
  "familyProfiles": [
    { "name": "Alex", "conditions": ["HighCholesterol"], "preferences": [""] },
    { "name": "Kids", "conditions": [], "preferences": [""] }
  ],
  "openSlots": 3,
  "candidateRecipes": [
    { "id": "...", "name": "Lentil Soup", "foodGroup": "ProteinFoods", "proteinSource": "PlantProtein" },
    { "id": "...", "name": "Vegetable Stir-Fry", "foodGroup": "VegetablesAndFruits", "proteinSource": "PlantProtein" }
  ]
}
```

**System prompt:**

```
You are a meal planning assistant using Canada's 2019 Food Guide.
Select 1–3 recipes from candidateRecipes that would most improve the week's balance
while respecting the family's health profiles.
Return JSON only: [{ "recipeId": "...", "reason": "one sentence plain language" }]
Prefer plant-based proteins and vegetables. Avoid red meat for members with HighCholesterol.
```

**Trigger in `GroceryRecomputeService`:** After writing `balance_summary`, if `isBalanced: false` and open slots > 0, enqueue a `GenerateWeeklyRecommendations` workflow task for the current week. The enqueue is fire-and-forget — recompute does not await it.

---

### Modified `ScheduleDays.cs`

Add two more optional parameters after `BalanceSummary` (which was added in recipe-categorization):

```csharp
    [property: JsonPropertyName("hefiScore")] HEFIScore? HefiScore = null,
    [property: JsonPropertyName("recommendations")] List<WeeklyRecommendation>? Recommendations = null);
```

**Check all call sites before modifying:**
```bash
grep -rn "new ScheduleDays(" api/src --include="*.cs"
```

### Modified `WeeklyPlan.cs`

```csharp
[Column("hefi_score", TypeName = "jsonb")]
public string? HefiScore { get; set; } = null;

[Column("recommendations", TypeName = "jsonb")]
public string? Recommendations { get; set; } = null;
```

---

### CNF Ingestion Task

**Implementation:** A standalone C# console command or `IHostedService` triggered by `task data:cnf:seed`.

**Source files from CNF "All Files" ZIP:**
- `FOOD_NM.csv` — food names and FoodIDs
- `NUTRIENT_AMOUNT.csv` — nutrient values per food per 100g
- `NUTRIENT_NAME.csv` — nutrient ID to name mapping

**Key nutrient IDs to extract:**
| Nutrient | CNF NutrientID |
|---|---|
| Sodium | 307 |
| Sugars | 269 |
| Saturated fat | 606 |
| Carbohydrate | 205 |

**Ingestion logic:**
1. Parse `NUTRIENT_NAME.csv` to build `nutrientId → name` map.
2. Parse `NUTRIENT_AMOUNT.csv` to build `foodId → { sodium, sugar, satFat, carb }` map.
3. Parse `FOOD_NM.csv` for English food names (language code `E`).
4. For each food: upsert into `cnf_foods` on `food_id`.
5. Log count of upserted rows.

**CFG food group mapping:** The CNF does not directly provide 2019 CFG food groups. Use a static mapping from CNF food group codes to CFG groups — this mapping is a constant in the ingestion code. Publish it in the documentation so it can be reviewed.

---

## OpenAPI Contract Delta

### New schemas

```yaml
FopWeekSummaryDto:
  type: object
  required: [highInSaturatedFatDays, highInSugarsDays, highInSodiumDays]
  properties:
    highInSaturatedFatDays: { type: integer }
    highInSugarsDays:       { type: integer }
    highInSodiumDays:       { type: integer }

HEFIScoreDto:
  type: object
  required: [totalScore, vegetableFruitScore, wholeGrainScore, proteinFoodScore,
             plantProteinRatio, sodiumScore, saturatedFatScore, fopWeekSummary]
  properties:
    totalScore:            { type: number }
    vegetableFruitScore:   { type: number }
    wholeGrainScore:       { type: number }
    proteinFoodScore:      { type: number }
    plantProteinRatio:     { type: number }
    sodiumScore:           { type: number }
    saturatedFatScore:     { type: number }
    fopWeekSummary:        { $ref: '#/components/schemas/FopWeekSummaryDto' }

WeeklyRecommendationDto:
  type: object
  required: [recipeId, recipeName, reason]
  properties:
    recipeId:   { type: string, format: uuid }
    recipeName: { type: string }
    reason:     { type: string }
```

### Updated `ScheduleDays` schema

Add after `balanceSummary`:
```yaml
        hefiScore:
          nullable: true
          oneOf:
            - { $ref: '#/components/schemas/HEFIScoreDto' }
            - { type: 'null' }
        recommendations:
          type: [array, 'null']
          items: { $ref: '#/components/schemas/WeeklyRecommendationDto' }
          nullable: true
```

---

## Testing Strategy

### Critical seam tests

| Seam | Test |
|---|---|
| `ScheduleDays` 9-param record | Unit: construct with all 9 params, serialize, assert all fields present |
| `NutrientLookup` trigram search | Integration: known CNF food name → returns correct `food_id` |
| `NutrientLookup` cache write | Integration: second call for same key → no DB query (uses `cnf_food_id` from `ingredient_categories`) |
| `HEFIScorer.Compute` | Unit: known week profile → expected component scores; null nutrition → graceful degradation |
| `ConditionRuleEngine` new overload | Unit: "Shellfish" allergy + CNF shrimp match → hard warning; unknown allergen → no warning |
| `GenerateWeeklyRecommendationsProcessor` | Unit: idempotence; LLM returns invalid recipeId → discarded; isBalanced: true → skip |
| CNF ingestion task | Integration: seed from test CSV fixture → `cnf_foods` row count matches fixture |
| `GET /api/schedule` HEFI score | Integration: assigned recipes with known profiles → `hefiScore.totalScore` non-null |

### Test commands

```bash
task test:api
task test:unit
task test
```
