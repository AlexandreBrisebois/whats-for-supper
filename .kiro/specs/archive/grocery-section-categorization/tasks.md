# Tasks: Grocery Section Categorization

## Vertical Slice 1 — Database Schema

- [x] 1.1 Add `ingredient_categories` table to `api/database/schema.sql`
  - Add the full `CREATE TABLE ingredient_categories` DDL with `normalized_key text PRIMARY KEY`, `grocery_section text NOT NULL`, `confidence float NOT NULL DEFAULT 1.0`, `source text NOT NULL DEFAULT 'llm'`, `created_at`, `updated_at`, and the source CHECK constraint
  - Verify: `task migrate` applies cleanly; `task db:schema:push DRY_RUN=true` shows no errors

- [x] 1.2 Add `grocery_items` column to `weekly_plans` in `api/database/schema.sql`
  - Add `grocery_items jsonb NOT NULL DEFAULT '[]'::jsonb` to the `weekly_plans` table definition
  - Verify: `task migrate` applies cleanly

- [x] 1.3 Add `IngredientCategory` EF entity and update `WeeklyPlan` model
  - Create `api/src/RecipeApi/Models/IngredientCategory.cs` with `[Table("ingredient_categories")]` mapping
  - Add `GroceryItems` string property to `api/src/RecipeApi/Models/WeeklyPlan.cs` with `[Column("grocery_items", TypeName = "jsonb")]`
  - Register `DbSet<IngredientCategory>` in `RecipeDbContext`
  - Verify: `dotnet build` passes with no errors

---

## Vertical Slice 2 — OpenAPI Contract + DTO + Client Generation

- [x] 2.1 Add `GroceryLineItemDto` schema to `specs/openapi.yaml`
  - Add the full `GroceryLineItemDto` schema under `components/schemas` with `required: [displayName, normalizedKey, section, recipeIds]` and all properties as specified in the design
  - Verify: `task gen:client:check` passes (or run after 2.2)

- [x] 2.2 Add `groceryItems` to `ScheduleDays` schema in `specs/openapi.yaml`
  - Add `groceryItems` as a nullable array of `$ref: '#/components/schemas/GroceryLineItemDto'` to the `ScheduleDays` schema
  - Verify: YAML is valid (no parse errors)

- [x] 2.3 Add `GroceryLineItemDto.cs` C# record
  - Create `api/src/RecipeApi/Dto/GroceryLineItemDto.cs` with the record matching the OpenAPI schema exactly
  - Verify: `dotnet build` passes

- [x] 2.4 Update `ScheduleDays.cs` to include `GroceryItems`
  - Add `[property: JsonPropertyName("groceryItems")] List<GroceryLineItemDto>? GroceryItems = null` parameter to the `ScheduleDays` record
  - Verify: `dotnet build` passes; `task test:api` passes

- [x] 2.5 Regenerate Kiota TypeScript client
  - Run `task gen:client`
  - Verify: `task gen:client:check` passes; `task typecheck` passes

---

## Vertical Slice 3 — C# IngredientNormalizer + AisleMapper

- [x] 3.1 Implement `IngredientNormalizer` static class
  - Create `api/src/RecipeApi/Utils/IngredientNormalizer.cs`
  - Implement `Normalize(string raw): string` with the pipeline: NFD decompose → strip Unicode Mn category chars → lowercase → trim/collapse whitespace
  - Verify: `dotnet build` passes

- [x] 3.2 Write property-based and unit tests for `IngredientNormalizer`
  - Create `api/src/RecipeApi.Tests/Utils/IngredientNormalizerTests.cs`
  - Property tests (FsCheck): P4 (accent-insensitive equivalence), P5 (specificity preservation), P3 (parsing round-trip)
  - Unit tests: specific accent examples (`"Bœuf haché"` → `"boeuf hache"`), whitespace collapsing, empty string, pure ASCII passthrough
  - Verify: `task test:api` passes

- [x] 3.3 Implement `AisleMapper` class and `GrocerySection` enum
  - Create `api/src/RecipeApi/Services/AisleMapper.cs`
  - Define `GrocerySection` enum with 9 values: `Produce`, `MeatAndSeafood`, `DairyAndEggs`, `Frozen`, `Bakery`, `Pantry`, `Beverages`, `Deli`, `Uncategorized`
  - Implement `MapToSection(string canonicalName): GrocerySection` with longest-match keyword lookup
  - Include English keyword sets for all 8 non-Uncategorized sections
  - Broth/stock → Beverages; falls back to `Uncategorized` (not `Pantry`) when no keyword matches
  - Register `AisleMapper` as a singleton in `Program.cs`
  - Verify: `dotnet build` passes

- [x] 3.4 Write property-based and unit tests for `AisleMapper`
  - Create `api/src/RecipeApi.Tests/Services/AisleMapperTests.cs`
  - Property tests (FsCheck): P1 (closed-set), P2 (idempotence), P10 (keyword membership → section)
  - Unit tests: one example per section keyword, longest-match precedence (`"frozen chicken"` → Frozen), Uncategorized fallback, broth → Beverages
  - Verify: `task test:api` passes

- [x] 3.5 * Add French keyword sets to `AisleMapper` (optional)
  - Extend each section's keyword list with French equivalents as specified in the design
  - Verify: `task test:api` passes (existing tests unaffected)

---

## Vertical Slice 4 — GroceryRecomputeService

- [x] 4.1 Implement `GroceryRecomputeService`
  - Create `api/src/RecipeApi/Services/GroceryRecomputeService.cs`
  - Implement `RecomputeForWeekAsync(DateOnly monday, CancellationToken ct)`:
    1. Load all `CalendarEvents` for the week with `Recipe.RawMetadata`
    2. Extract `supply[]` from each recipe's `raw_metadata` jsonb
    3. Normalize each supply name via `IngredientNormalizer.Normalize`
    4. Lookup `Normalized_Key` in `ingredient_categories` → fallback to `AisleMapper.MapToSection`
    5. Group by `(normalizedKey, unitText)`: sum quantities for same-unit pairs, keep separate for different units
    6. Write result as `grocery_items` jsonb on `weekly_plans` (create plan row if absent)
  - Implement `RecomputeForRecipeAsync(Guid recipeId, CancellationToken ct)`:
    - Find all `CalendarEvents` referencing `recipeId`, collect distinct Mondays, call `RecomputeForWeekAsync` for each
  - Register as a scoped service in `Program.cs`
  - Verify: `dotnet build` passes

- [x] 4.2 Write property-based and unit tests for `GroceryRecomputeService`
  - Create `api/src/RecipeApi.Tests/Services/GroceryRecomputeServiceTests.cs`
  - Property tests (FsCheck): P6 (same-key same-unit aggregation), P7 (different-unit separation), P8 (recomputation determinism), P9 (grocery state immutability)
  - Unit tests: empty supply[], single recipe, two recipes with overlapping ingredients, unit aggregation, missing `ingredient_categories` entry falls back to `AisleMapper`
  - Verify: `task test:api` passes

---

## Vertical Slice 5 — Wire Recompute into ScheduleService

- [x] 5.1 Call `GroceryRecomputeService` from `ScheduleService.AssignRecipeAsync`
  - Inject `GroceryRecomputeService` into `ScheduleService`
  - After `SaveChangesAsync()` in `AssignRecipeAsync`, call `RecomputeForWeekAsync(monday, ct)`
  - Verify: `task test:api` passes (existing schedule tests unaffected)

- [x] 5.2 Call `GroceryRecomputeService` from `ScheduleService.RemoveRecipeAsync`
  - After `SaveChangesAsync()` in `RemoveRecipeAsync`, call `RecomputeForWeekAsync(monday, ct)`
  - Note: `MoveScheduleEventAsync` does NOT trigger recompute (move doesn't change the ingredient set)
  - Verify: `task test:api` passes

- [x] 5.3 Update `ScheduleService.GetScheduleAsync` to return `groceryItems`
  - After loading the `plan`, deserialize `plan.GroceryItems` from jsonb → `List<GroceryLineItemDto>`
  - Include `GroceryItems` in the returned `ScheduleDays` record
  - Verify: `task test:api` passes; `GetScheduleAsync_IncludesGroceryState` test still passes

---

## Vertical Slice 6 — Wire Recompute into SyncRecipeProcessor

- [x] 6.1 Call `GroceryRecomputeService` from `SyncRecipeProcessor`
  - Inject `GroceryRecomputeService` into `SyncRecipeProcessor`
  - After `SaveChangesAsync()` in `SyncDiskToDb`, call `RecomputeForRecipeAsync(recipeId, ct)`
  - Verify: `task test:api` passes

---

## Vertical Slice 7 — Client: GroceryList.tsx Consumes groceryItems

- [x] 7.1 Update `aisleMapper.ts` to 10-section taxonomy
  - Rename `AisleSection` → `GrocerySection`
  - Expand to 10 sections: `'Produce' | 'Meat' | 'Seafood' | 'Dairy & Eggs' | 'Frozen' | 'Bakery' | 'Pantry' | 'Beverages' | 'Deli' | 'Uncategorized'`
  - Rename `mapIngredientToAisle` → `mapIngredientToSection`
  - Update keyword sets to match C# `AisleMapper` (Meat and Seafood as separate sections)
  - Remove `groupIngredientsByAisle` export
  - Verify: `task test:unit` passes; `task typecheck` passes

- [x] 7.2 Write unit and property tests for updated `aisleMapper.ts`
  - Create `pwa/src/lib/grocery/aisleMapper.test.ts`
  - Property tests (fast-check): P1 (closed-set — `fc.string()` → result in `GrocerySection` values), P2 (idempotence — same input twice → same output)
  - Unit tests: one example per section (including separate Meat and Seafood examples), Uncategorized fallback, backward-compat check (old 5-section names no longer exported)
  - Verify: `task test:unit` passes

- [x] 7.3 Update `GroceryList.tsx` to consume `groceryItems` from API
  - Remove `groupIngredientsByAisle` import and call
  - Accept `groceryItems: GroceryLineItemDto[]` (from the Kiota-generated type) instead of `ingredients: string[]`
  - Group `groceryItems` by `section` client-side for display (pure grouping, no normalization)
  - Update `AISLE_ORDER` to 10-section taxonomy in the correct display order: `['Produce', 'Deli', 'Bakery', 'Meat', 'Seafood', 'Dairy & Eggs', 'Frozen', 'Pantry', 'Beverages', 'Uncategorized']`
  - Update `AISLE_ICONS` to include all 10 sections (Meat and Seafood as separate entries)
  - `groceryState` key remains `displayName` (unchanged)
  - Verify: `task typecheck` passes; `task test:unit` passes

- [x] 7.4 Make `AISLE_ORDER` configurable via environment variable
  - Create `pwa/src/lib/grocery/aisleOrder.ts` that reads `NEXT_PUBLIC_AISLE_ORDER` at module load time
  - Parse the env var as a comma-separated list of section names (e.g. `"Produce,Meat,Dairy & Eggs,Frozen,Bakery,Pantry,Beverages,Deli,Seafood,Grocery"`)
  - Validate each entry against the `GrocerySection` union — if any entry is unrecognised, discard the env var entirely and fall back to the hardcoded default order with a `console.warn`
  - Export `AISLE_ORDER: GrocerySection[]` from this module; `GroceryList.tsx` imports from here instead of defining it inline
  - Add `NEXT_PUBLIC_AISLE_ORDER` to `pwa/.env.example` (or equivalent) with the default order as the example value
  - Write unit tests in `pwa/src/lib/grocery/aisleOrder.test.ts`:
    - Valid env var → correct order returned
    - Env var with one unknown section → falls back to default, `console.warn` called
    - Empty env var → falls back to default
    - Env var not set → default order returned
  - Verify: `task test:unit` passes; `task typecheck` passes

- [x] 7.5 Implement section completion UI in `GroceryList.tsx`
  - When `checkedCount === aisleItems.length` (and `aisleItems.length > 0`), apply sage green header background to the section card header
  - Replace the percentage badge with a checkmark icon when the section is complete
  - Verify: `task test:unit` passes (component test for completion state)

---

## Vertical Slice 8 — CategorizeIngredientsProcessor + Workflow YAML

- [x] 8.1 Implement `CategorizeIngredientsProcessor`
  - Create `api/src/RecipeApi/Services/Processors/CategorizeIngredientsProcessor.cs`
  - Implement `IWorkflowProcessor` with `ProcessorName = "CategorizeIngredients"`
  - Read `supply[]` from `recipe.raw_metadata`
  - Normalize each name via `IngredientNormalizer.Normalize`
  - Check `ingredient_categories` for existing entries (cache hit → skip)
  - Send uncached names to LLM in a single batch call; the sections list sent to the LLM MUST be `["Produce","Meat","Seafood","Dairy & Eggs","Frozen","Bakery","Pantry","Beverages","Deli","Uncategorized"]` — do NOT use `"Meat & Seafood"`
  - Validate each returned section is a valid `GrocerySection` string (i.e. maps to a `GrocerySection` enum value); discard invalid entries with a warning log
  - Upsert valid results into `ingredient_categories` with `source='llm'`
  - Register processor in `Program.cs`
  - Verify: `dotnet build` passes

- [x] 8.2 Write unit tests for `CategorizeIngredientsProcessor`
  - Create `api/src/RecipeApi.Tests/Services/Processors/CategorizeIngredientsProcessorTests.cs`
  - Test: all ingredients cached → no LLM call
  - Test: some uncached → LLM called with only uncached names
  - Test: LLM prompt includes `"Meat"` and `"Seafood"` as separate entries — NOT `"Meat & Seafood"`
  - Test: LLM returns `"Meat & Seafood"` → entry discarded as invalid section
  - Test: LLM returns invalid section → entry discarded, valid entries still upserted
  - Test: LLM call fails → processor completes without throwing (workflow continues)
  - Verify: `task test:api` passes

- [x] 8.3 Update `recipe-import.yaml` to include `CategorizeIngredients` step
  - Insert `categorize_ingredients` task after `sync_recipe`, before `recipe_ready`
  - `depends_on: [sync_recipe]`; `recipe_ready` updated to `depends_on: [categorize_ingredients]`
  - Verify: `task test:api` passes (workflow orchestrator tests)

---

## Vertical Slice 9 — ManagementService Backup/Restore for ingredient_categories

- [x] 9.1 Add backup step 5 to `ManagementService.BackupAsync`
  - Export all `ingredient_categories` rows to `{DataRoot}/ingredient-categories.csv`
  - CSV columns: `normalized_key,grocery_section,confidence,source,created_at`
  - Log the count of exported rows
  - Verify: `task test:api` passes; manual: `task seed` then call backup endpoint, verify CSV is created

- [x] 9.2 Add restore step 8 to `ManagementService.RestoreAsync`
  - If `{DataRoot}/ingredient-categories.csv` exists, read and parse it
  - Upsert each row into `ingredient_categories` using `ON CONFLICT (normalized_key) DO UPDATE`
  - Skip malformed rows with per-row error logging
  - If file is absent, log a warning and skip (do not fail)
  - Verify: `task test:api` passes; manual: backup → `task dev:clean:sync` → restore → verify rows present

---

## Vertical Slice 10 — Data Flow Documentation + LLM Cost Transparency

- [x] 10.1 Add data flow diagram to `api/docs/GROCERY_CATEGORIZATION.md`
  - Create `api/docs/GROCERY_CATEGORIZATION.md` documenting the full data flow:
    - Recipe import triggers `CategorizeIngredientsProcessor` → checks `ingredient_categories` cache → sends only uncached names to LLM in a single batch → upserts results
    - Recipe assign/remove/re-import triggers `GroceryRecomputeService` → reads `ingredient_categories` + `AisleMapper` fallback → writes `grocery_items` to `weekly_plans`
    - `GET /api/schedule` returns pre-computed `groceryItems` — zero client-side processing
  - Include a Mermaid diagram of the data flow (copy and adapt from `design.md`)
  - Verify: file exists and renders correctly in GitHub/IDE markdown preview

- [x] 10.2 Document LLM cost model in `api/docs/GROCERY_CATEGORIZATION.md`
  - Add a **"LLM Cost"** section explaining:
    - **When a call is made:** once per recipe import, only for ingredient names not already in `ingredient_categories`
    - **Batch strategy:** all uncached names for a recipe are sent in a single LLM call (not one call per ingredient)
    - **Cache effect:** as the index grows, new recipes share ingredients with existing ones — LLM calls shrink toward zero over time. A recipe with all ingredients already indexed makes zero LLM calls.
    - **Worst case:** a brand-new recipe with 15 unique ingredients = 1 LLM call with 15 names in the batch
    - **Re-import:** re-importing a recipe does not trigger a new LLM call if all its ingredients are already cached
    - **Manual override:** entries with `source='manual'` are never overwritten by the LLM
  - Verify: section is present and accurate

- [x] 10.3 Document the API's LLM usage in `api/docs/GROCERY_CATEGORIZATION.md` under a "LLM Integration" section
  - Describe which API service makes the LLM call (`CategorizeIngredientsProcessor`), which `IChatClient` it uses, and how it fits into the `recipe-import` workflow
  - Document the prompt structure: a single batch request containing all uncached ingredient names for the recipe, the expected response shape (`normalizedKey`, `section`, `confidence`), and how invalid responses are handled
  - Document the valid section values sent to the LLM: `["Produce","Meat","Seafood","Dairy & Eggs","Frozen","Bakery","Pantry","Beverages","Deli","Uncategorized"]` — Meat and Seafood are separate sections
  - Document the cache-first strategy: the processor checks `ingredient_categories` before calling the LLM, and only the delta (uncached names) is sent — a recipe whose ingredients are fully cached makes zero LLM calls
  - Note that this is the only place in the API that calls the LLM outside of the existing recipe extraction and description generation steps — operators monitoring LLM spend should account for one additional call per newly imported recipe
  - Verify: section is present in `api/docs/GROCERY_CATEGORIZATION.md` and accurately reflects the implementation

---

## Vertical Slice 11 — Integration Verification

---

## Vertical Slice 11 — Integration Verification

- [x] 11.1 Verify end-to-end: assign recipe → GET /api/schedule returns groceryItems
  - Integration test: create a recipe with `supply[]` in `raw_metadata`, assign to a week plan, call `GET /api/schedule`, assert `groceryItems` is non-empty and contains the expected items
  - Verify: `task test:api` passes

- [x] 11.2 Verify end-to-end: remove recipe → groceryItems updated
  - Integration test: assign recipe, verify `groceryItems` populated, remove recipe, verify `groceryItems` is empty
  - Verify: `task test:api` passes

- [x] 11.3 Run full test suite and drift check
  - Run `task test:api` — all C# tests pass
  - Run `task test:unit` — all PWA unit tests pass
  - Run `task gen:client:check` — Kiota client is in sync with `specs/openapi.yaml`
  - Verify: all pass with no errors
