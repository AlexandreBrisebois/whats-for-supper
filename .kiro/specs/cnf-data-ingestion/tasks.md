# Tasks: CNF Data Ingestion

Each task is a vertical slice. No task builds a horizontal layer.

**This spec has no LLM dependency and no workflow dependency.** It can be executed in parallel with `recipe-categorization`. Tasks 1–4 are independent of all other specs. Task 5 requires `recipe-categorization` Task 3 to be complete.

**Before marking any task done:**
- `task agent:drift` — zero drift confirmed
- `task agent:test:impact` — targeted tests pass
- `task review` — full suite passes

---

## Task 1 — Schema: `pg_trgm`, `cnf_foods`, FK on `ingredient_categories`

**What:** All database changes. No application code yet.

**Read before starting:**
- design.md § Database Schema Changes — exact SQL to add
- `api/database/schema.sql` — add `pg_trgm` extension immediately after the existing `vector` extension line; add `cnf_foods` table and GIN index after it; add FK column to `ingredient_categories` at the end of that table's section
- `api/src/RecipeApi/Models/IngredientCategory.cs` — add `CnfFoodId int?` property

**Step 1 — Write tests first:**

Create `api/src/RecipeApi.Tests/Schema/PgTrgmSmokeTests.cs`:
1. `SELECT similarity('chicken breast', 'chicken')` returns a double > 0 — confirms `pg_trgm` is enabled
2. `cnf_foods` table exists and is empty after schema apply (no data yet)
3. `ingredient_categories.cnf_food_id` column exists and is nullable

**Step 2 — Schema changes:**

Add to `api/database/schema.sql` per design.md. Use `IF NOT EXISTS` on all DDL.

**Step 3 — C# model:**

In `api/src/RecipeApi/Models/IngredientCategory.cs`:
```csharp
[Column("cnf_food_id")]
public int? CnfFoodId { get; set; } = null;
```

**Do NOT touch** any service, processor, or controller file.

**Definition of done:** Schema applies via `task dev:clean:sync`. All 3 tests pass. No existing tests break.

- [ ] Task 1 complete

---

## Task 2 — `CNFFood` record + test fixture CSV

**What:** Add the `CNFFood` C# record and create the test fixture CSV. No ingestion logic yet.

**Step 1 — Write tests first:**

Create `api/src/RecipeApi.Tests/Models/CNFFoodTests.cs`:
1. JSON round-trip: `CNFFood` with all fields → serialize → deserialize → all fields match
2. JSON round-trip: nullable nutrient fields serialize as `null`, not `0`

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
```

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

## Task 3 — `CnfIngestionService`

**What:** The CSV parsing and upsert logic. Uses the test fixture in tests — no real download required.

**Dependency:** Tasks 1 and 2 must be complete.

**Read before starting:**
- design.md § `CnfIngestionService` — CSV parsing strategy, nutrient IDs, CFG group mapping dictionary
- design.md § CFG food group mapping — this dictionary is a nutritional judgment; review it before implementing

**Step 1 — Write tests first:**

Create `api/src/RecipeApi.Tests/Services/CnfIngestionTests.cs`:

1. Seed from fixture ZIP → `cnf_foods` row count = 5 (matches fixture)
2. Each row has correct `food_name`, `cfg_food_group`, and nutrient values matching fixture
3. Seed twice (idempotency) → row count still 5, no duplicates, no exception
4. `FOOD_NM.csv` with French-only rows → skipped (language code filter)
5. `NUTRIENT_AMOUNT.csv` with unknown nutrient ID → row still upserted, unknown nutrient ignored
6. Missing nutrient value for a food → that column is null, no exception
7. CFG group mapping: `"Beef Products"` → `"ProteinFoods"`; `"Vegetables and Vegetable Products"` → `"VegetablesAndFruits"`; unknown group → `"Mixed"`
8. Ingestion logs count of upserted rows

**Step 2 — Implementation:**

Create `api/src/RecipeApi/Services/CnfIngestionService.cs` — shape in design.md.

**Step 3 — CLI entry point:**

Add a minimal console command handler (or `IHostedService` with `--cnf-seed` arg) that:
1. Downloads the CNF ZIP from the documented URL (or accepts a local file path for testing)
2. Calls `CnfIngestionService.SeedAsync`
3. Logs the result and exits with code 0 (success) or 1 (failure)

Add `task data:cnf:seed` to the Taskfile per design.md.

**Definition of done:** All 8 tests pass. `task data:cnf:seed --file ./path/to/fixture.zip` runs against fixture without network access. `task review` passes.

- [ ] Task 3 complete

---

## Task 4 — `NutrientLookup` service + `UnitWeightTable`

**What:** The runtime lookup service and unit conversion table. These are called at classification time, not at seed time.

**Dependency:** Tasks 1–3 must be complete (`cnf_foods` table exists and is seeded).

**Read before starting:**
- design.md § `NutrientLookup` — raw SQL pattern, cache write, null handling
- design.md § `UnitWeightTable` — unit conversion table, `UnitWeightEstimates` dictionary, 100g default

**Step 1 — Write tests first:**

Create `api/src/RecipeApi.Tests/Services/NutrientLookupTests.cs`:

1. Known ingredient `"chicken breast"` → returns `CNFFood` with `food_id = 1` (fixture), `cnf_food_id` written to `ingredient_categories`
2. Second call for `"chicken breast"` → `cnf_food_id` already set → no trigram query (verify via query count or mock)
3. `"xyzzy_nonexistent_ingredient"` → returns null, no exception
4. `cnf_foods` empty (before seed) → returns null, logs warning, no exception
5. Similarity exactly 0.4 → match accepted; 0.39 → no match

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

Create `api/src/RecipeApi/Services/NutrientLookup.cs` — shape in design.md. Register as scoped in `Program.cs`.

Create `api/src/RecipeApi/Utils/UnitWeightTable.cs` — shape in design.md.

**Definition of done:** All 13 tests pass. `task review` passes.

- [ ] Task 4 complete

---

## Task 5 — Extend `ClassifyDietaryProfileProcessor` to use CNF

**What:** Replace the `raw_metadata.nutrition` → `FopFlags` path in the processor with the CNF lookup path, keeping `raw_metadata` as fallback.

**Dependency:** Task 4 must be complete. `recipe-categorization` Task 3 (`ClassifyDietaryProfileProcessor`) must be complete — this task extends it.

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
7. **`NutrientLookup` not available (unregistered):** constructor injection — if `NutrientLookup` is not registered, the processor should fail fast at startup, not at runtime (verify DI registration in integration test)

**Step 2 — Implementation:**

Replace steps 11–13 in `ClassifyDietaryProfileProcessor.cs` with the extended CNF flow per design.md.

Inject `NutrientLookup` and `UnitWeightTable` (or use static `UnitWeightTable`).

**Step 3 — Reclassify task:**

Add `task data:cnf:reclassify` to the Taskfile — queries `recipes WHERE dietary_profile->>'fopFlags' IS NULL` and enqueues `ClassifyDietaryProfile` with `forceReclassify: true` for each.

**Definition of done:** All 7 new tests pass. All existing `ClassifyDietaryProfileProcessorTests` still pass. `task review` passes.

- [ ] Task 5 complete

---

## Task 6 — Backup export + documentation

**What:** Extend `ManagementService` backup to export CNF group mappings, and write the operator documentation.

**Dependency:** Task 3 must be complete.

**Step 1 — Write tests first:**

Add to `ManagementServiceTests.cs`:
1. `BackupAsync` with seeded `cnf_foods` → `cnf-cfg-groups.csv` written to `DataRoot` with `food_id` and `cfg_food_group` columns
2. `BackupAsync` with empty `cnf_foods` → CSV written with header only, no error

**Step 2 — Implementation:**

Extend `ManagementService.BackupAsync()` to export `cnf-cfg-groups.csv` per requirements.md Requirement 5.

**Step 3 — Documentation:**

Create `api/docs/CNF_INGESTION.md` with all content from requirements.md Requirement 6:
- Download URL (fill in the actual URL when executing this task — document it here permanently)
- CNF file format and the three files used
- Nutrient IDs extracted (307, 269, 606, 205) and what they are
- CFG group mapping table (copy from `CnfIngestionService` source, with rationale column)
- How to run `task data:cnf:seed` and `task data:cnf:reclassify`
- What happens if the download URL changes
- The similarity threshold (0.4) and what to do if matches seem wrong

**Definition of done:** Tests pass. Documentation complete. `task review` passes.

- [ ] Task 6 complete

---

## Notes / Decisions

- **2026-05-06**: Spec created. CNF pulled into Phase 1 because `raw_metadata.nutrition` is only present when the source URL publishes structured schema.org markup — a minority of recipes. Without CNF, `FopFlags` is null for most recipes and the `ConditionRuleEngine` nutrition-based health warnings (Hypertension, HighCholesterol, Diabetes) are silent for most of the library. CNF resolves this without LLM or external runtime dependency.
- **2026-05-06**: `pg_trgm` confirmed available on `pgvector/pgvector:pg18` image. Enabled via `CREATE EXTENSION IF NOT EXISTS pg_trgm`.
- **2026-05-06**: Similarity threshold set at 0.4 conservatively. Lower values risk false positives (e.g. "parsley" → "parsnip"). Operator can inspect `ingredient_categories.cnf_food_id` to audit matches.
- **2026-05-06**: `UnitWeightTable` default is 100g for unknown unitless ingredients. This is a known approximation — logged at warning level so the table can be extended over time.
- **2026-05-06**: `recipeYield` default is 2 portions when absent or unparseable. This affects per-portion FOP flag computation. Documented as an assumption.
- **CFG group mapping decisions**: *(document the specific mapping choices and any debated cases when executing Task 3)*
- **CNF download URL**: *(fill in when executing Task 3)*
