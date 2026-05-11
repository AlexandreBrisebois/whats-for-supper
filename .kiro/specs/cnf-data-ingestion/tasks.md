# Tasks: CNF Data Ingestion

Each task is a vertical slice. No task builds a horizontal layer.

**This spec has no LLM dependency and no new workflow dependency.** It can be executed in parallel with `recipe-categorization`. Tasks 1–5 are independent of all other specs. Task 7 requires `recipe-categorization` Task 3 to be complete.

**Before marking any task done:**
- `task agent:drift` — zero drift confirmed
- `task agent:test:impact` — targeted tests pass
- `task review` — full suite passes

---

## Task 1 — Schema: `pg_trgm`, `cnf_foods`, FK on `ingredient_categories`

**What:** All database changes. No application code yet.

**Read before starting:**
- design.md § Database Schema Changes — exact SQL to add
- `api/database/schema.sql` — add `pg_trgm` extension immediately after the existing `vector` extension line; add `cnf_foods` table and GIN indexes after it; add FK column to `ingredient_categories` at the end of that table's section
- `api/src/RecipeApi/Models/IngredientCategory.cs` — add `CnfFoodId int?` property

**Step 1 — Write tests first:**

Create `api/src/RecipeApi.Tests/Schema/PgTrgmSmokeTests.cs`:
1. `SELECT similarity('chicken breast', 'chicken')` returns a double > 0 — confirms `pg_trgm` is enabled
2. `cnf_foods` table exists and is empty after schema apply (no data yet)
3. `cnf_foods.food_name_en` column exists and is not nullable
4. `cnf_foods.food_name_fr` column exists and is nullable
5. `idx_cnf_foods_name_en_trgm` and `idx_cnf_foods_name_fr_trgm` exist
6. `ingredient_categories.cnf_food_id` column exists and is nullable

**Step 2 — Schema changes:**

Add to `api/database/schema.sql` per design.md. Use `IF NOT EXISTS` on all DDL.

**Step 3 — C# model:**

In `api/src/RecipeApi/Models/IngredientCategory.cs`:
```csharp
[Column("cnf_food_id")]
public int? CnfFoodId { get; set; } = null;
```

**Do NOT touch** any service, processor, or controller file.

**Definition of done:** Schema applies via `task dev:clean:sync`. All 6 tests pass. No existing tests break.

- [ ] Task 1 complete

---

## Task 2 — `CNFFood` record + test fixture CSV

**What:** Add the `CNFFood` C# record and create the test fixture CSV. No ingestion logic yet.

**Step 1 — Write tests first:**

Create `api/src/RecipeApi.Tests/Models/CNFFoodTests.cs`:
1. JSON round-trip: `CNFFood` with all fields → serialize → deserialize → all fields match
2. JSON round-trip: nullable nutrient fields serialize as `null`, not `0`
3. JSON round-trip: `FoodNameEn` is required and maps to `food_name_en`
4. JSON round-trip: `FoodNameFr` serializes/deserializes when present and remains `null` when absent

**Step 2 — C# record:**

Create `api/src/RecipeApi/Models/CNFFood.cs` — shape in design.md.

**Step 3 — Test fixture:**

Create `api/src/RecipeApi.Tests/Fixtures/cnf_sample/FOOD_NM.csv`:
```csv
FoodID,FoodCode,FoodGroupID,FoodSourceID,FoodDescription,FoodDescriptionF,...
1,01001,1,4,"Chicken, breast, raw","Poulet, poitrine, cru",...
2,02001,2,4,"Beef, ground, raw","Boeuf, haché, cru",...
3,03001,20,4,"Rice, brown, raw","Riz, brun, cru",...
4,04001,11,4,"Broccoli, raw","Brocoli, cru",...
5,05001,1,4,"Milk, 2% fat","Lait, 2% m.g.",...
6,06001,11,4,"Carrot, raw","Carotte, crue",...
7,07001,11,4,"","Courgette, crue",...
```

The fixture must include at least one bilingual food row (`FoodID = 6`) and at least one French-only food row (`FoodID = 7`). Tests must prove the bilingual row seeds exactly one English lookup row and the French-only row is skipped.

Create `api/src/RecipeApi.Tests/Fixtures/cnf_sample/NUTRIENT_NAME.csv`:
```csv
NutrientID,NutrientCode,NutrientSymbol,NutrientUnit,NutrientName,...
307,307,Na,mg,Sodium,...
269,269,SUGAR,g,Sugars,...
606,606,FASAT,g,Fatty acids total saturated,...
205,205,CHOCDF,g,Carbohydrate by difference,...
```

Create `api/src/RecipeApi.Tests/Fixtures/cnf_sample/NUTRIENT_AMOUNT.csv` with representative values (chicken breast: sodium ~74mg, satFat ~1g; beef ground: sodium ~75mg, satFat ~7g).

**Definition of done:** Round-trip tests pass. Fixture files present and parseable. `task review` passes.

- [ ] Task 2 complete

---

## Task 3 — Food data provider strategy seam

**What:** Add the provider strategy interfaces and wire Canada CNF as the default provider. No CSV parsing logic yet.

**Dependency:** Task 2 must be complete.

**Read before starting:**
- design.md § Provider strategy
- existing settings/configuration patterns for provider-key selection

**Step 1 — Write tests first:**

Create `api/src/RecipeApi.Tests/Services/FoodDataProviderStrategyTests.cs`:
1. Default configuration resolves the Canada CNF provider.
2. Explicit provider key `"CanadaCNF"` resolves the Canada CNF provider.
3. Unknown provider key fails startup/DI validation with a clear error message.
4. `NutrientLookup` and localized alias expansion can be resolved through provider-facing interfaces, not concrete CNF ingestion classes.

**Step 2 — Interfaces and registration:**

Create provider-facing interfaces per design.md:
- `IFoodDataProvider`
- `IFoodDataIngestion`
- `IFoodNutrientLookup`
- `ILocalizedFoodAliasExpander`
- `IFoodGuideMapper`

Create `CanadaCnfFoodDataProvider` as the first strategy. It may delegate to placeholder CNF services until later tasks implement ingestion/search/lookup, but the provider seam must be in place before consumers are wired.

**Definition of done:** Provider selection tests pass. Unknown provider configuration fails fast. No application consumer needs to instantiate CNF-specific parser classes.

- [ ] Task 3 complete

---

## Task 4 — `CnfIngestionService`

**What:** The CSV parsing and upsert logic. Uses the test fixture in tests — no real download required.

**Dependency:** Tasks 1–3 must be complete.

**Read before starting:**
- design.md § `CnfIngestionService` — CSV parsing strategy, nutrient IDs, CFG group mapping dictionary
- design.md § CFG food group mapping — this dictionary is a nutritional judgment; review it before implementing

**Step 1 — Write tests first:**

Create `api/src/RecipeApi.Tests/Services/CnfIngestionTests.cs`:

1. Seed from fixture ZIP → `cnf_foods` row count = 6 (seven fixture food IDs minus one French-only row)
2. Each row has correct `food_name_en`, `cfg_food_group`, and nutrient values matching fixture
3. Seed twice (idempotency) → row count still 6, no duplicates, no exception
4. Bilingual `FOOD_NM.csv` row → one seeded row using the English description in `food_name_en` and French description in `food_name_fr`; French description does not create a duplicate lookup row
5. French-only `FOOD_NM.csv` row → skipped; nutrient rows for that `FoodID` do not create orphan `cnf_foods` data
6. `NUTRIENT_AMOUNT.csv` with unknown nutrient ID → row still upserted, unknown nutrient ignored
7. Missing nutrient value for a food → that column is null, no exception
8. CFG group mapping: `"Beef Products"` → `"ProteinFoods"`; `"Vegetables and Vegetable Products"` → `"VegetablesAndFruits"`; unknown group → `"Mixed"`
9. Ingestion logs count of upserted rows

**Step 2 — Implementation:**

Create `api/src/RecipeApi/Services/CnfIngestionService.cs` — shape in design.md. Wire it through the Canada CNF provider's ingestion strategy, not directly into categorization/search consumers.

**Step 3 — CLI entry point:**

Add a minimal console command handler (or `IHostedService` with `--cnf-seed` arg) that:
1. Downloads the CNF ZIP from the documented URL (or accepts a local file path for testing)
2. Calls `CnfIngestionService.SeedAsync`
3. Logs the result and exits with code 0 (success) or 1 (failure)

Add `task data:cnf:seed` to the Taskfile per design.md.

**Definition of done:** All 9 tests pass. `task data:cnf:seed --file ./path/to/fixture.zip` runs against fixture without network access. `task review` passes.

- [ ] Task 4 complete

---

## Task 5 — `NutrientLookup` service + `UnitWeightTable`

**What:** The runtime lookup service and unit conversion table. These are called at classification time, not at seed time.

**Dependency:** Tasks 1–4 must be complete (`cnf_foods` table exists and is seeded).

**Read before starting:**
- design.md § `NutrientLookup` — raw SQL pattern, cache write, null handling
- design.md § `NutrientLookup` — `ICnfSimilaritySearch` seam; EF InMemory tests inject a fake, production uses real Postgres raw SQL
- design.md § `UnitWeightTable` — unit conversion table, `UnitWeightEstimates` dictionary, 100g default

**Step 1 — Write tests first:**

Create `api/src/RecipeApi.Tests/Services/NutrientLookupTests.cs`:

These tests use EF InMemory and a fake `ICnfSimilaritySearch`. They must not call Postgres-specific `pg_trgm` SQL.

1. Known ingredient `"chicken breast"` → fake similarity search returns `CNFFood` with `food_id = 1` (fixture), `cnf_food_id` written to `ingredient_categories`
2. Second call for `"chicken breast"` → `cnf_food_id` already set → fake similarity search call count remains unchanged
3. `"xyzzy_nonexistent_ingredient"` → returns null, no exception
4. `cnf_foods` empty (before seed) → returns null, logs warning, no exception

Create `api/src/RecipeApi.Tests/Integration/CnfSimilaritySearchPostgresTests.cs`:

1. Uses an isolated disposable Postgres database from the same `pgvector` image family as the deployed stack; it must not connect to the deployed application database
2. `SELECT similarity('chicken breast', 'chicken')` returns a double > 0 — confirms `pg_trgm` is enabled
3. Seeded food with similarity exactly 0.4 → match accepted
4. Seeded food with similarity 0.39 → no match
5. Raw SQL is parameterized; malicious query text is treated as data and does not alter SQL

Create `api/src/RecipeApi.Tests/Utils/UnitWeightTableTests.cs`:

1. `ToGrams(180, "g", "anything")` → 180
2. `ToGrams(1, "tbsp", "anything")` → 15
3. `ToGrams(1, "tsp", "anything")` → 5
4. `ToGrams(240, "ml", "anything")` → 240 (1g/ml)
5. `ToGrams(2, "unit", "chicken breast")` → 300 (2 × 150g)
6. `ToGrams(1, "unit", "unknown_ingredient_xyz")` → 100 (default), warning logged
7. `ToGrams(1, null, "egg")` → 50
8. `ToGrams(0.5, "unit", "garlic")` → 2.5 (0.5 × 5g)

**Step 2 — Implementation:**

Create `api/src/RecipeApi/Services/NutrientLookup.cs` and `api/src/RecipeApi/Services/PostgresCnfSimilaritySearch.cs` — shape in design.md. Register `ICnfSimilaritySearch` to `PostgresCnfSimilaritySearch` through the Canada CNF provider strategy as scoped in `Program.cs`.

Create `api/src/RecipeApi/Utils/UnitWeightTable.cs` — shape in design.md.

**Definition of done:** EF InMemory tests pass without Postgres; Postgres compatibility tests pass only against an isolated disposable pgvector database; all `UnitWeightTable` tests pass. `task review` passes.

- [ ] Task 5 complete

---

## Task 6 — Health guidance settings gate

**What:** Add the app setting that enables/disables health recommendations and dietary steering.

**Dependency:** Task 3 must be complete.

**Read before starting:**
- design.md § Health guidance settings
- `api/src/RecipeApi/Controllers/SettingsController.cs`
- `api/src/RecipeApi/Services/SettingsService.cs`
- future specs: `.kiro/specs/family-health-profiles` and `.kiro/specs/dietitian-agent-phase2`

**Step 1 — Write tests first:**

Create or extend settings/service tests:
1. Missing `health_guidance_enabled` setting defaults to `true`.
2. Setting value `false` is read as disabled.
3. A health-guidance-aware consumer receives disabled state and suppresses steering behavior while preserving core recipe/search/planning behavior.

**Step 2 — Implementation:**

Add a small settings reader/service, for example `HealthGuidanceSettings`, that wraps `SettingsService` and exposes:

```csharp
Task<bool> IsHealthGuidanceEnabledAsync(CancellationToken ct);
```

Use existing `family_settings` storage unless implementation discovers a more appropriate app-level setting surface.

**Definition of done:** Tests cover enabled and disabled modes. No user-facing health steering path added by this spec bypasses the setting.

- [ ] Task 6 complete

---

## Task 7 — Extend `ClassifyDietaryProfileProcessor` to use provider-backed nutrients and food-guide groups

**What:** Replace the `raw_metadata.nutrition` → `FopFlags` path in the processor with the provider-backed lookup path, keeping `raw_metadata` as fallback. Also feed provider food-guide groups into recipe category and `IsHealthyChoice` prediction.

**Dependency:** Tasks 5–6 must be complete. `recipe-categorization` Task 3 (`ClassifyDietaryProfileProcessor`) must be complete — this task extends it.

**Read before starting:**
- `api/src/RecipeApi/Services/Processors/ClassifyDietaryProfileProcessor.cs` — find the current steps 11–13 (parse `raw_metadata.nutrition` → `FopFlags`)
- design.md § Modified: `ClassifyDietaryProfileProcessor` — the extended step-by-step replacing steps 11–16

**Seam warning:** `recipe-categorization` design.md steps 11–13 described a simpler flow. This task supersedes those steps. The processor file is the single source of truth after this task — do not leave the simpler steps in place.

**Step 1 — Write tests first:**

Add to `api/src/RecipeApi.Tests/Services/Processors/ClassifyDietaryProfileProcessorTests.cs`:

1. **CNF path — high saturated fat:** ingredient `"beef"` maps to CNF entry with `saturated_fat_g_per_100g: 7`, quantity 200g → per-portion satFat = `200/100 × 7 / 2 portions = 7g` → `fopFlags.highInSaturatedFat = true` (7 > 4)
2. **CNF path — below threshold:** ingredient `"broccoli"` → per-portion values below all thresholds → all flags false
3. **Fallback to `raw_metadata.nutrition`:** all CNF lookups return null, `raw_metadata.nutrition` has sodium `"400 mg"` → `fopFlags.highInSodium = true`
4. **All-null:** all CNF lookups return null, `raw_metadata.nutrition` null → `fopFlags = null`
5. **`recipeYield` parsing:** `"4 portions"` → divides by 4; `"servings: 2"` → divides by 2; unparseable → divides by 2 (default)
6. **Mixed CNF coverage:** 3 of 5 ingredients match CNF, 2 return null → partial sum used, no exception
7. **Provider food-guide group improves category:** recipe ingredients dominated by CNF/Canada Food Guide `VegetablesAndFruits` strengthen vegetable/fruit category prediction even when raw metadata is sparse.
8. **Provider nutrients improve `IsHealthyChoice`:** recipe with high sodium/sugar/saturated fat flags is not marked healthy; recipe with balanced provider groups and no FOP flags may be marked healthy according to existing categorization rules.
9. **Health guidance disabled:** processor may compute/store neutral metadata, but user-facing health recommendation/steering output is suppressed by the health guidance setting.
10. **`NutrientLookup` not available (unregistered):** constructor injection — if `NutrientLookup` is not registered, the processor should fail fast at startup, not at runtime (verify DI registration in integration test)

**Step 2 — Implementation:**

Replace steps 11–13 in `ClassifyDietaryProfileProcessor.cs` with the extended provider-backed flow per design.md.

Inject `NutrientLookup` and `UnitWeightTable` (or use static `UnitWeightTable`).

**Step 3 — Reclassify task:**

Add `task data:cnf:reclassify` to the Taskfile — queries `recipes WHERE dietary_profile->>'fopFlags' IS NULL` and enqueues `ClassifyDietaryProfile` with `forceReclassify: true` for each.

**Definition of done:** All 10 new tests pass. All existing `ClassifyDietaryProfileProcessorTests` still pass. Recipe categorization now consumes provider nutrient/group data through the strategy seam. `task review` passes.

- [ ] Task 7 complete

---

## Task 8 — Bilingual search augmentation from provider aliases

**What:** Extend recipe search so French ingredient queries can find English recipe text, and English ingredient queries can find French recipe text, using the active provider's localized food-name mapping. Canada CNF supplies English/French.

**Dependency:** Tasks 1–4 must be complete. Task 5's Postgres raw-SQL seam pattern should be followed, but `NutrientLookup` itself is not required by this task.

**Read before starting:**
- `api/src/RecipeApi/Services/RecipeSearchService.cs` — find `SearchAsync`, `GetLexicalCandidatesAsync`, and `BuildRankedCandidates`
- design.md § Modified: `RecipeSearchService` bilingual query expansion
- `api/src/RecipeApi.Tests/Integration/RecipeSearchIntegrationTests.cs` — existing search integration coverage

**Step 1 — Write tests first:**

Add to `api/src/RecipeApi.Tests/Integration/RecipeSearchIntegrationTests.cs`:

1. **French → English:** fake `ICnfBilingualQueryExpander` expands `"poulet"` to `"chicken"`; query `"poulet"` returns a recipe whose searchable text contains `"chicken"` but not `"poulet"`
2. **English → French:** fake expander expands `"chicken"` to `"poulet"`; query `"chicken"` returns a recipe whose searchable text contains `"poulet"` but not `"chicken"`
3. **Original query preserved:** response `query`/request echo behavior and applied filters remain unchanged; no OpenAPI DTO fields are added
4. **No expansion:** fake expander returns empty list; existing lexical-only result ordering remains unchanged
5. **Bounded expansion:** fake expander returns more than 5 terms; search uses at most 5 expansion terms and deduplicates case-insensitively
6. **Expander failure:** fake expander throws; search logs/falls back to original query and still returns normal lexical results

Create `api/src/RecipeApi.Tests/Integration/CnfBilingualQueryExpanderPostgresTests.cs`:

1. Uses an isolated disposable Postgres database from the same `pgvector` image family as the deployed stack; it must not connect to the deployed application database
2. Seed `cnf_foods(food_id, food_name_en, food_name_fr)` with `("chicken", "poulet")`
3. Query `"poulet"` returns `"chicken"` as an expansion
4. Query `"chicken"` returns `"poulet"` as an expansion
5. Query `"xyzzy_nonexistent"` returns no expansions
6. Raw SQL is parameterized; malicious query text is treated as data and does not alter SQL

**Step 2 — Implementation:**

Create `api/src/RecipeApi/Services/CnfBilingualQueryExpander.cs` as the Canada provider implementation of localized alias expansion:
```csharp
public interface ICnfBilingualQueryExpander
{
    Task<IReadOnlyList<string>> ExpandAsync(string query, CancellationToken ct);
}
```

Create `api/src/RecipeApi/Services/PostgresCnfBilingualQueryExpander.cs` — shape in design.md. Register it through the active food data provider strategy as scoped in `Program.cs`.

Modify `RecipeSearchService`:
1. Inject optional `ICnfBilingualQueryExpander?`
2. For non-empty text queries, call the expander before `GetLexicalCandidatesAsync`
3. Build an expanded lexical query from original query + at most 5 equivalent terms
4. Use the expanded lexical query only for candidate retrieval/ranking
5. Keep `dto.Query`, telemetry query text, applied filters, and response DTOs unchanged

**Do NOT add** new OpenAPI fields or PWA UI changes in this task.

**Definition of done:** EF InMemory search tests pass with a fake expander; Postgres compatibility tests pass only against an isolated disposable pgvector database; all existing `RecipeSearchIntegrationTests` still pass; `task review` passes.

- [ ] Task 8 complete

---

## Task 9 — Backup export + documentation

**What:** Extend `ManagementService` backup to export CNF group mappings, and write the operator documentation.

**Dependency:** Task 4 must be complete.

**Step 1 — Write tests first:**

Add to `ManagementServiceTests.cs`:
1. `BackupAsync` with seeded `cnf_foods` → `cnf-cfg-groups.csv` written to `DataRoot` with `food_id` and `cfg_food_group` columns
2. `BackupAsync` with empty `cnf_foods` → CSV written with header only, no error

**Step 2 — Implementation:**

Extend `ManagementService.BackupAsync()` to export `cnf-cfg-groups.csv` per requirements.md Requirement 7.

**Step 3 — Documentation:**

Create `api/docs/CNF_INGESTION.md` with all content from requirements.md Requirement 9:
- Download URL (fill in the actual URL when executing this task — document it here permanently)
- CNF file format and the three files used
- Nutrient IDs extracted (307, 269, 606, 205) and what they are
- CFG group mapping table (copy from `CnfIngestionService` source, with rationale column)
- How to run `task data:cnf:seed` and `task data:cnf:reclassify`
- How the provider strategy works and why `CanadaCNF` is the default
- How `health_guidance_enabled` controls recommendations/steering without disabling core recipe features
- How bilingual search expansion uses CNF English/French food names
- What happens if the download URL changes
- The similarity threshold (0.4) and what to do if matches seem wrong

**Definition of done:** Tests pass. Documentation complete. `task review` passes.

- [ ] Task 9 complete

---

## Notes / Decisions

- **2026-05-06**: Spec created. CNF pulled into Phase 1 because `raw_metadata.nutrition` is only present when the source URL publishes structured schema.org markup — a minority of recipes. Without CNF, `FopFlags` is null for most recipes and the `ConditionRuleEngine` nutrition-based health warnings (Hypertension, HighCholesterol, Diabetes) are silent for most of the library. CNF resolves this without LLM or external runtime dependency.
- **2026-05-06**: `pg_trgm` confirmed available on `pgvector/pgvector:pg18` image. Enabled via `CREATE EXTENSION IF NOT EXISTS pg_trgm`.
- **2026-05-06**: Similarity threshold set at 0.4 conservatively. Lower values risk false positives (e.g. "parsley" → "parsnip"). Operator can inspect `ingredient_categories.cnf_food_id` to audit matches.
- **2026-05-06**: `UnitWeightTable` default is 100g for unknown unitless ingredients. This is a known approximation — logged at warning level so the table can be extended over time.
- **2026-05-06**: `recipeYield` default is 2 portions when absent or unparseable. This affects per-portion FOP flag computation. Documented as an assumption.
- **2026-05-11**: Broader CNF-powered search behavior is split into `.kiro/specs/cnf-search-augmentation`. This ingestion spec keeps only the foundational bilingual query bridge; synonym expansion, CNF pantry matching, search reason contract changes, and nutrition-aware filters belong to the follow-up spec.
- **2026-05-11**: Food data access is now a strategy pattern. `CanadaCNF` remains the first/default provider, but consumers must depend on provider interfaces so future US/Swedish providers can be swapped in.
- **2026-05-11**: Health recommendations and dietary steering must be gated by app settings. Users can keep recipe capture/search/planning without health-oriented nudges.
- **2026-05-11**: Provider-backed nutrient and food-guide data must feed recipe categorization, including better `IsHealthyChoice` and category predictions.
- **CFG group mapping decisions**: *(document the specific mapping choices and any debated cases when executing Task 3)*
- **CNF download URL**: *(fill in when executing Task 3)*
