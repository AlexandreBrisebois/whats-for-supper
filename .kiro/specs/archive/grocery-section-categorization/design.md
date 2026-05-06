# Design Document: Grocery Section Categorization

## Overview

This feature replaces the brittle, client-side five-section keyword mapper with a two-phase, server-authoritative categorization engine. The result is a pre-computed, pre-aggregated grocery list stored on the `weekly_plans` row and served directly to the client — no client-side normalization, no index lookups at load time.

**Two-phase categorization:**

1. **Phase 1 — C# keyword engine (`AisleMapper`):** A fast, deterministic, server-side keyword matcher covering 10 grocery sections with longest-match precedence. Runs synchronously during `GroceryRecomputeService` execution. Includes English and French keyword sets.
2. **Phase 2 — LLM categorization (`CategorizeIngredientsProcessor`):** A workflow processor that runs at recipe import time. It normalizes ingredient names, checks the `ingredient_categories` cache, and sends only uncached names to the LLM in a single batch call. Results are upserted into `ingredient_categories` for future use.

The client-side `aisleMapper.ts` is updated to the 10-section taxonomy and kept as a display-only fallback (e.g., for items not yet in the server response), but is no longer the primary categorization path.

---

## Architecture

```mermaid
flowchart TD
    subgraph Import["Recipe Import Workflow"]
        A[ExtractRecipe] --> B[GenerateHero]
        B --> C[SyncRecipe]
        C --> D[CategorizeIngredients]
        D --> E[RecipeReady]
    end

    subgraph Categorize["CategorizeIngredientsProcessor"]
        D --> F{Check ingredient_categories}
        F -->|Cache hit| G[Use cached section]
        F -->|Cache miss| H[Batch LLM call]
        H --> I[Validate sections]
        I --> J[Upsert ingredient_categories]
    end

    subgraph Recompute["GroceryRecomputeService"]
        K[AssignRecipeAsync] --> R
        L[RemoveRecipeAsync] --> R
        M[SyncRecipeProcessor] --> R
        R[RecomputeGroceryItemsAsync]
        R --> N[Load supply[] from raw_metadata]
        N --> O[Normalize names → Normalized_Key]
        O --> P{Lookup ingredient_categories}
        P -->|Found| Q1[Use DB section]
        P -->|Not found| Q2[AisleMapper fallback]
        Q1 --> S[Group by key+unit, sum quantities]
        Q2 --> S
        S --> T[Write grocery_items to weekly_plans]
    end

    subgraph API["GET /api/schedule"]
        T --> U[Read grocery_items from weekly_plans]
        U --> V[Return ScheduleDays with groceryItems]
    end

    subgraph Client["GroceryList.tsx"]
        V --> W[Render groceryItems directly]
        W --> X[Group by section for display]
    end

    subgraph Backup["ManagementService"]
        J --> BC[BackupAsync step 5: export ingredient_categories.csv]
        BR[RestoreAsync step 8: import ingredient_categories.csv] --> J
    end
```

---

## Components and Interfaces

### C# — New Classes

#### `IngredientNormalizer` (static class)
```
namespace RecipeApi.Utils;

public static class IngredientNormalizer
{
    public static string Normalize(string raw): string
    // Pipeline: NFD decompose → strip Mn category chars → lowercase → trim/collapse whitespace
}
```

#### `AisleMapper` (class, injectable)
```
namespace RecipeApi.Services;

public class AisleMapper
{
    public GrocerySection MapToSection(string canonicalName): GrocerySection
    // Longest-match keyword lookup across 10 sections
    // Falls back to Uncategorized (not Pantry) when below threshold
}

public enum GrocerySection
{
    Produce, Meat, Seafood, DairyAndEggs, Frozen,
    Bakery, Pantry, Beverages, Deli, Uncategorized
}
```

Keyword sets (10 sections, English + French):

| Section | Sample keywords (EN) | Sample keywords (FR) |
|---|---|---|
| Produce | lettuce, tomato, carrot, onion, garlic, apple, lemon, herb, ginger | laitue, tomate, carotte, oignon, ail, pomme, citron, herbe, gingembre |
| Meat | beef, chicken, pork, turkey, lamb, duck, veal, venison | boeuf, poulet, porc, dinde, agneau, canard, veau, chevreuil |
| Seafood | fish, salmon, cod, tuna, shrimp, prawn, scallop, crab, lobster | poisson, saumon, morue, thon, crevette, petoncle, crabe, homard |
| Dairy & Eggs | milk, cream, butter, cheese, egg, yogurt, mozzarella, cheddar | lait, creme, beurre, fromage, oeuf, yaourt |
| Frozen | frozen, ice cream, gelato, sorbet, edamame | surgele, glace |
| Bakery | bread, baguette, croissant, tortilla, pita, naan, sourdough | pain, baguette, croissant, tortilla |
| Beverages | juice, wine, beer, broth, stock, coffee, tea, soda, cider | jus, vin, biere, bouillon, cafe, the |
| Deli | deli, salami, pepperoni, prosciutto, pastrami, hummus, rotisserie | charcuterie, salami, jambon fume |
| Pantry | oil, salt, sugar, flour, rice, pasta, sauce, vinegar, spice, baking | huile, sel, sucre, farine, riz, pates, sauce, vinaigre, epice |
| Uncategorized | (fallback — no keywords) | |

**Longest-match precedence:** When a canonical name matches keywords from multiple sections, the section whose keyword produces the longest substring match wins. Example: `"frozen chicken breast"` — `"frozen"` (7 chars, Frozen) vs `"chicken"` (7 chars, Meat) — tie broken by section priority order.

**Broth/stock → Beverages** (not Pantry): `broth` and `stock` are in the Beverages keyword set.

#### `GroceryRecomputeService` (class, injectable)
```
namespace RecipeApi.Services;

public class GroceryRecomputeService(RecipeDbContext db, AisleMapper aisleMapper, ILogger logger)
{
    public async Task RecomputeForWeekAsync(DateOnly monday, CancellationToken ct): Task
    // 1. Load all CalendarEvents for the week → Recipe.RawMetadata
    // 2. Extract supply[] from each recipe's raw_metadata jsonb
    // 3. Normalize each supply name → Normalized_Key
    // 4. Lookup Normalized_Key in ingredient_categories → fallback to AisleMapper
    // 5. Group by (Normalized_Key + unitText): sum quantities for same-unit pairs
    // 6. Write result as grocery_items jsonb on weekly_plans

    public async Task RecomputeForRecipeAsync(Guid recipeId, CancellationToken ct): Task
    // Find all week plans that include recipeId via CalendarEvents
    // Call RecomputeForWeekAsync for each affected Monday
}
```

#### `CategorizeIngredientsProcessor` (class, implements `IWorkflowProcessor`)
```
namespace RecipeApi.Services.Processors;

public class CategorizeIngredientsProcessor(
    RecipeDbContext db,
    IChatClient chatClient,
    AisleMapper aisleMapper,
    ILogger logger) : IWorkflowProcessor
{
    public string ProcessorName => "CategorizeIngredients";

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct): Task<object?>
    // 1. Parse recipeId from payload
    // 2. Read supply[] from recipe.raw_metadata
    // 3. Normalize each name → Normalized_Key
    // 4. Check ingredient_categories for existing entries (cache hit)
    // 5. Batch-send uncached names to LLM
    // 6. Validate each returned section is in GrocerySection enum
    // 7. Upsert results into ingredient_categories (source='llm')
}
```

**LLM batch request format:**
```json
{
  "ingredients": ["tomato sauce", "chicken breast", "heavy cream"],
  "task": "Assign each ingredient to exactly one grocery store section.",
  "sections": ["Produce","Meat","Seafood","Dairy & Eggs","Frozen","Bakery","Pantry","Beverages","Deli","Uncategorized"]
}
```

**LLM response format:**
```json
[
  { "normalizedKey": "tomato sauce", "section": "Pantry", "confidence": 0.95 },
  { "normalizedKey": "chicken breast", "section": "Meat", "confidence": 0.99 },
  { "normalizedKey": "heavy cream", "section": "Dairy & Eggs", "confidence": 0.98 }
]
```

#### `GroceryLineItemDto` (C# record)
```csharp
public record GroceryLineItemDto(
    [property: JsonPropertyName("displayName")] string DisplayName,
    [property: JsonPropertyName("normalizedKey")] string NormalizedKey,
    [property: JsonPropertyName("section")] string Section,
    [property: JsonPropertyName("quantity")] double? Quantity,
    [property: JsonPropertyName("unitText")] string? UnitText,
    [property: JsonPropertyName("recipeIds")] List<Guid> RecipeIds);
```

### TypeScript — Client Changes

#### `aisleMapper.ts` — Updated
- Rename `AisleSection` type to `GrocerySection`
- Expand to 10 sections: `'Produce' | 'Meat' | 'Seafood' | 'Dairy & Eggs' | 'Frozen' | 'Bakery' | 'Pantry' | 'Beverages' | 'Deli' | 'Uncategorized'`
- Rename `mapIngredientToAisle` → `mapIngredientToSection(name: string): GrocerySection`
- Update keyword sets to match C# `AisleMapper` (Meat and Seafood as separate sections)
- Remove `groupIngredientsByAisle` (no longer used)
- Keep `mapIngredientToSection` as a display-only fallback

#### `GroceryList.tsx` — Updated
- Remove `groupIngredientsByAisle` import and call
- Remove `ingredients` prop dependency for categorization
- Consume `groceryItems: GroceryLineItemDto[]` from the schedule response
- Update `AISLE_ORDER` to 10-section taxonomy
- Update `AISLE_ICONS` to include new sections
- Group `groceryItems` by `section` for display (pure client-side grouping of pre-categorized data)
- Section completion: when `checkedCount === aisleItems.length`, apply sage green header background
- `groceryState` key remains `displayName` (unchanged)

---

## Data Models

### Database Schema Changes

**Addition 1 — `ingredient_categories` table** (add to `api/database/schema.sql`):
```sql
CREATE TABLE ingredient_categories (
    normalized_key text PRIMARY KEY,
    grocery_section text NOT NULL,
    confidence float NOT NULL DEFAULT 1.0,
    source text NOT NULL DEFAULT 'llm',  -- 'llm' | 'manual' | 'keyword'
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT ingredient_categories_source_check CHECK (source IN ('llm', 'manual', 'keyword'))
);
```

**Addition 2 — `grocery_items` column on `weekly_plans`** (add to `api/database/schema.sql`):
```sql
ALTER TABLE weekly_plans ADD COLUMN IF NOT EXISTS
    grocery_items jsonb NOT NULL DEFAULT '[]'::jsonb;
```

Since this is a fresh-database (psqldef declarative) setup, both additions go directly into `schema.sql` — no migration scripts.

**C# model update — `WeeklyPlan.cs`:**
```csharp
[Column("grocery_items", TypeName = "jsonb")]
public string GroceryItems { get; set; } = "[]";
```

**C# model — `IngredientCategory.cs`** (new EF entity):
```csharp
[Table("ingredient_categories")]
public class IngredientCategory
{
    [Key]
    [Column("normalized_key")]
    public string NormalizedKey { get; set; } = string.Empty;

    [Column("grocery_section")]
    public string GrocerySection { get; set; } = string.Empty;

    [Column("confidence")]
    public double Confidence { get; set; } = 1.0;

    [Column("source")]
    public string Source { get; set; } = "llm";

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    [Column("updated_at")]
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
```

### GroceryLineItem Shape

```typescript
// TypeScript (from OpenAPI-generated client)
interface GroceryLineItemDto {
  displayName: string;       // Original name from first matching supply entry
  normalizedKey: string;     // Aggregation key (server-side only, not shown in UI)
  section: string;           // GrocerySection value
  quantity: number | null;   // Summed quantity (null if not parseable)
  unitText: string | null;   // Unit string (null if unitless)
  recipeIds: string[];       // UUIDs of contributing recipes
}
```

### Backup/Restore CSV Format

**File path:** `{DataRoot}/ingredient-categories.csv`

**CSV columns:** `normalized_key,grocery_section,confidence,source,created_at`

**Example:**
```csv
normalized_key,grocery_section,confidence,source,created_at
chicken breast,Meat,0.99,llm,2026-01-15T10:00:00Z
tomato sauce,Pantry,0.95,llm,2026-01-15T10:00:00Z
boeuf hache,Meat,0.98,llm,2026-01-15T10:00:00Z
salmon fillet,Seafood,0.97,llm,2026-01-15T10:00:00Z
```

**ManagementService changes:**

- `BackupAsync()` — new **step 5**: export all `ingredient_categories` rows to `{DataRoot}/ingredient-categories.csv`
- `RestoreAsync()` — new **step 8**: import from `{DataRoot}/ingredient-categories.csv` using upsert (`ON CONFLICT (normalized_key) DO UPDATE SET grocery_section = EXCLUDED.grocery_section, confidence = EXCLUDED.confidence, source = EXCLUDED.source, updated_at = now()`)

The CSV survives `task dev:clean:sync` because it lives in `DataRoot` (the recipes data directory on disk), not in the database volume.

---

## OpenAPI Contract Delta

### New schema: `GroceryLineItemDto`

```yaml
GroceryLineItemDto:
  type: object
  required: [displayName, normalizedKey, section, recipeIds]
  properties:
    displayName: { type: string }
    normalizedKey: { type: string }
    section: { type: string }
    quantity: { type: [number, 'null'] }
    unitText: { type: [string, 'null'] }
    recipeIds:
      type: array
      items: { type: string, format: uuid }
```

### Updated schema: `ScheduleDays`

Add `groceryItems` property (nullable array):

```yaml
ScheduleDays:
  type: object
  required: [weekOffset, locked, days, status]
  properties:
    # ... existing properties unchanged ...
    groceryItems:
      type: [array, 'null']
      items: { $ref: '#/components/schemas/GroceryLineItemDto' }
      nullable: true
```

### Updated C# DTO: `ScheduleDays.cs`

```csharp
public record ScheduleDays(
    [property: JsonPropertyName("weekOffset")] int WeekOffset,
    [property: JsonPropertyName("locked")] bool Locked,
    [property: JsonPropertyName("status")] int Status,
    [property: JsonPropertyName("days")] List<ScheduleDayDto> Days,
    [property: JsonPropertyName("groceryState")] Dictionary<string, bool>? GroceryState = null,
    [property: JsonPropertyName("groceryItems")] List<GroceryLineItemDto>? GroceryItems = null);
```

After updating `specs/openapi.yaml`, run `task gen:client` to regenerate the Kiota TypeScript client.

---

## Workflow YAML Change

`api/src/RecipeApi/Workflows/recipe-import.yaml` — insert `CategorizeIngredients` after `SyncRecipe`, before `RecipeReady`:

```yaml
name: recipe-import
parameters:
    - recipeId
tasks:
    - name: extract_recipe
      processor: ExtractRecipe
      payload:
          recipeId: "{{ recipeId }}"
    - name: generate_hero
      processor: GenerateHero
      depends_on:
          - extract_recipe
      payload:
          recipeId: "{{ recipeId }}"
    - name: sync_recipe
      processor: SyncRecipe
      depends_on:
          - generate_hero
      payload:
          recipeId: "{{ recipeId }}"
    - name: categorize_ingredients
      processor: CategorizeIngredients
      depends_on:
          - sync_recipe
      payload:
          recipeId: "{{ recipeId }}"
    - name: recipe_ready
      processor: RecipeReady
      depends_on:
          - categorize_ingredients
      payload:
          recipeId: "{{ recipeId }}"
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Closed-set section assignment

*For any* ingredient string, `mapIngredientToSection` SHALL return a value that is a member of the defined `GrocerySection` union type — never `undefined`, never an arbitrary string, never a value outside the 10-element set.

**Validates: Requirements 1.1, 1.4, 6.2**

---

### Property 2: Idempotence of section mapping

*For any* ingredient string, calling `mapIngredientToSection` twice with the same input SHALL return the same `GrocerySection` — the function has no side effects and no mutable state.

**Validates: Requirements 6.3**

---

### Property 3: Ingredient string parsing round-trip

*For any* triple `(quantity, unit, name)` where quantity is a valid numeric token (integer, decimal, or fraction) and unit is a recognized unit token, constructing the string `"${quantity} ${unit} ${name}"`, parsing it to extract the canonical name, then re-prepending the original quantity and unit SHALL produce a string equivalent to the original.

**Validates: Requirements 2.1, 2.2, 2.5**

---

### Property 4: Normalization accent-insensitive equivalence

*For any* string `s`, producing a variant `s'` by changing the case of any characters or replacing any character with an accented/diacritical equivalent (e.g., `e` → `é`, `c` → `ç`, `o` → `œ`), `normalize(s) === normalize(s')` — normalization collapses all such variants to the same key.

**Validates: Requirements 3.1, 3.9**

---

### Property 5: Normalization specificity preservation

*For any* normalized string `a` and any non-empty string `extra` (containing at least one non-whitespace character), `normalize(a) !== normalize(a + " " + extra)` — normalization never collapses a more-specific ingredient name into a less-specific one.

**Validates: Requirements 3.10**

---

### Property 6: Same-key same-unit quantity aggregation

*For any* two supply items with the same `normalizedKey` and the same `unitText`, the `GroceryRecomputeService` SHALL produce exactly one `GroceryLineItem` whose `quantity` equals the arithmetic sum of the two input quantities.

**Validates: Requirements 3.4, 3.11**

---

### Property 7: Different-unit separation

*For any* two supply items with the same `normalizedKey` but different `unitText` values, the `GroceryRecomputeService` SHALL produce exactly two separate `GroceryLineItem` entries — one per unit.

**Validates: Requirements 3.5**

---

### Property 8: Grocery items recomputation determinism

*For any* set of recipes assigned to a week plan, computing `grocery_items` twice from the same recipe set SHALL produce arrays that are identical when sorted by `(normalizedKey, unitText)` — the result is independent of computation order and recipe assignment order.

**Validates: Requirements 5b.9, 6.5**

---

### Property 9: Grocery state immutability during recomputation

*For any* `weekly_plans` row with an existing `grocery_state`, calling `GroceryRecomputeService.RecomputeForWeekAsync` SHALL leave `grocery_state` byte-for-byte unchanged — recomputing `grocery_items` never touches the checked/unchecked state.

**Validates: Requirements 5b.8**

---

### Property 10: Keyword membership implies correct section (server-side AisleMapper)

*For any* canonical name that contains a keyword from a known section's keyword set (and no longer keyword from a competing section), `AisleMapper.MapToSection` SHALL return that section — keyword membership is a sufficient condition for section assignment.

**Validates: Requirements 4.1–4.7**

---

## Error Handling

| Scenario | Behavior |
|---|---|
| LLM returns an unrecognized section string | `CategorizeIngredientsProcessor` discards that entry and logs a warning; the ingredient remains uncached and falls back to `AisleMapper` at recompute time |
| LLM call fails entirely | Processor logs the error and completes without upserting; workflow continues to `RecipeReady`; ingredients fall back to `AisleMapper` |
| `raw_metadata` is null or has no `supply[]` | `GroceryRecomputeService` writes an empty `[]` to `grocery_items` and logs a debug message |
| `supply[].quantity` is not parseable as a number | `GroceryLineItem.quantity` is set to `null`; the item is still included in the list |
| `ingredient_categories.csv` is absent at restore time | `RestoreAsync` step 8 is skipped with a log warning; existing DB rows are preserved |
| `ingredient_categories.csv` is malformed | Malformed rows are skipped with per-row error logging; valid rows are still upserted |
| `weekly_plans` row does not exist when recomputing | `GroceryRecomputeService` creates the row (same pattern as `EnsureWeekPlanExistsAsync`) |

---

## Testing Strategy

### Dual Testing Approach

Unit tests cover specific examples, edge cases, and error conditions. Property-based tests verify universal properties across all inputs. Both are required.

### C# — Property-Based Tests (FsCheck.Xunit)

The project already has `FsCheck.Xunit` in `RecipeApi.Tests.csproj`. Each property test runs a minimum of 100 iterations.

**Tag format:** `// Feature: grocery-section-categorization, Property {N}: {property_text}`

| Property | Test class | What varies |
|---|---|---|
| P1: Closed-set section assignment | `AisleMapperTests` | Arbitrary strings |
| P2: Idempotence | `AisleMapperTests` | Arbitrary strings |
| P3: Parsing round-trip | `IngredientNormalizerTests` | (quantity, unit, name) triples |
| P4: Accent-insensitive equivalence | `IngredientNormalizerTests` | Strings with random accent variants |
| P5: Specificity preservation | `IngredientNormalizerTests` | Base strings + random extensions |
| P6: Same-key same-unit aggregation | `GroceryRecomputeServiceTests` | Supply item pairs with same key+unit |
| P7: Different-unit separation | `GroceryRecomputeServiceTests` | Supply item pairs with same key, different units |
| P8: Recomputation determinism | `GroceryRecomputeServiceTests` | Recipe sets in different orderings |
| P9: Grocery state immutability | `GroceryRecomputeServiceTests` | Arbitrary grocery_state + recipe sets |
| P10: Keyword membership → section | `AisleMapperTests` | Keywords from each section's set |

### TypeScript — Property-Based Tests (fast-check + vitest)

The project already has `fast-check@^3.23.2` in `package.json`. Each property test runs a minimum of 100 iterations.

**Tag format:** `// Feature: grocery-section-categorization, Property {N}: {property_text}`

| Property | Test file | What varies |
|---|---|---|
| P1: Closed-set section assignment | `aisleMapper.test.ts` | Arbitrary strings via `fc.string()` |
| P2: Idempotence | `aisleMapper.test.ts` | Arbitrary strings via `fc.string()` |

### C# — Unit Tests (xUnit)

- `IngredientNormalizerTests`: specific accent examples, whitespace collapsing, empty string
- `AisleMapperTests`: one example per section keyword, longest-match precedence, Uncategorized fallback
- `GroceryRecomputeServiceTests`: assign+remove triggers, supply[] extraction, unit aggregation
- `CategorizeIngredientsProcessorTests`: cache hit path, cache miss + LLM path, invalid section rejection
- `ManagementServiceTests`: backup CSV export, restore CSV import with upsert, missing file skip
- `ScheduleServiceTests`: `GetScheduleAsync` returns `groceryItems` from pre-computed column

### TypeScript — Unit Tests (vitest)

- `aisleMapper.test.ts`: one example per section, Uncategorized fallback, backward-compat with old 5-section state
- `GroceryList.test.tsx`: renders `groceryItems` from API, section completion state (sage green header), empty section omission

### Integration Tests

- `GET /api/schedule` returns `groceryItems` array (non-null when recipes assigned)
- `POST /api/schedule/assign` triggers recompute; subsequent GET returns updated `groceryItems`
- `DELETE /api/schedule/{date}` triggers recompute; subsequent GET returns updated `groceryItems`
- Recipe re-import triggers recompute for all affected week plans
- Backup/restore round-trip: backup → clean DB → restore → verify `ingredient_categories` rows match

### Test Commands

```bash
# API unit + integration tests
task test:api

# PWA unit tests (includes aisleMapper.test.ts, GroceryList.test.tsx)
task test:unit

# Full suite
task test
```
