# Tasks: Dietitian Agent — Phase 2

Each task is a vertical slice. Before starting any task, read design.md § Seam inventory.

**Hard dependencies before starting any task:**
- `recipe-categorization` spec fully complete
- `family-health-profiles` spec fully complete
- CNF CSV files available locally (see Task 1)

**Before marking any task done:**
- `task agent:drift` — zero drift confirmed
- `task agent:test:impact` — targeted tests pass
- `task review` — full suite passes

---

## Task 1 — CNF data ingestion pipeline

**What:** Download the Canadian Nutrient File, parse it, and seed a local `cnf_foods` table. One-time operation, idempotent.

**This task has no application code dependencies** — it can be started immediately.

**Read before starting:**
- design.md § CNF Ingestion Task for source file names, nutrient IDs, and CFG group mapping
- requirements.md Requirement 1 for the accepted behaviour

**Step 1 — Enable `pg_trgm` and create `cnf_foods` table:**

In `api/database/schema.sql`, add per design.md § Database Schema Changes. Run `task dev:clean:sync` to confirm schema applies.

**Step 2 — Write tests first:**

Create a small CSV fixture file (`api/src/RecipeApi.Tests/Fixtures/cnf_sample.csv`) with 5–10 rows representing the CNF format.

Write `api/src/RecipeApi.Tests/Services/CnfIngestionTests.cs`:
1. Parse the fixture CSV → produces correct `CNFFood` list (food names, nutrient values)
2. Ingest fixture into test DB → `cnf_foods` row count matches fixture
3. Run ingestion twice (idempotent) → row count unchanged, no duplicates
4. Missing nutrient column in CSV → row still upserted with null nutrient value, no exception
5. Ingestion logs count of rows upserted

**Step 3 — Implementation:**

Create `api/src/RecipeApi/Services/CnfIngestionService.cs`. Implement the three-file parse + upsert pipeline per design.md.

Add `task data:cnf:seed` to the Taskfile — trigger `CnfIngestionService` via a minimal console command or hosted service call.

**Step 4 — Backup export:**

Extend `ManagementService.BackupAsync()` to export `cnf_foods` CFG group mappings to `{DataRoot}/cnf-cfg-groups.csv`. Columns: `food_id, cfg_food_group`. This is the minimal set needed to restore without re-downloading.

**Definition of done:** All 5 tests pass. `task data:cnf:seed` runs and logs row count. Schema applies. Backup exports CSV.

- [ ] Task 1 complete

---

## Task 2 — OpenAPI contract + client regeneration

**What:** Add new schemas and update `ScheduleDays` in `specs/openapi.yaml`. Regenerate TypeScript client.

**Seam warning:** `ScheduleDays` is a positional C# record. This task adds params 8 and 9. They must go after `BalanceSummary` (param 7, added in recipe-categorization). Never reorder.

**Step 1 — Before touching `ScheduleDays.cs`, check all call sites:**

```bash
grep -rn "new ScheduleDays(" api/src --include="*.cs"
```

All existing call sites must continue to work — params 8 and 9 are optional with defaults.

**Step 2 — Contract changes:**

Add `HEFIScoreDto` and `WeeklyRecommendationDto` schemas.
Add `hefiScore` and `recommendations` to `ScheduleDays` schema.
Add `hefiScore` and `recommendations` to `WeeklyPlan` C# model and `ScheduleDays` C# record.

**Step 3:**

```bash
task gen:client
task agent:drift
```

**Definition of done:** Drift passes. TypeScript client includes `hefiScore` and `recommendations` on `ScheduleDays`.

- [ ] Task 2 complete

---

## Task 3 — `NutrientLookup` service

**What:** Implement the trigram-similarity lookup that maps normalized ingredient names to CNF entries. Caches results in `ingredient_categories.cnf_food_id`.

**Dependency:** Task 1 must be complete (`cnf_foods` table seeded).

**Read before starting:**
- design.md § `NutrientLookup` for the EF Core raw SQL pattern
- `api/src/RecipeApi/Utils/IngredientNormalizer.cs` — reuse for normalization before lookup
- `api/src/RecipeApi/Models/IngredientCategory.cs` — must add `CnfFoodId` column property

**Step 1 — Schema extension:**

In `api/database/schema.sql`:
```sql
ALTER TABLE ingredient_categories ADD COLUMN IF NOT EXISTS
    cnf_food_id integer REFERENCES cnf_foods(food_id) ON DELETE SET NULL;
```

In `api/src/RecipeApi/Models/IngredientCategory.cs`, add:
```csharp
[Column("cnf_food_id")]
public int? CnfFoodId { get; set; } = null;
```

**Step 2 — Write tests first:**

Create `api/src/RecipeApi.Tests/Services/NutrientLookupTests.cs`:

1. Known ingredient name matches a `cnf_foods` entry with similarity >= 0.4 → returns `CNFFood` with correct `food_id`
2. Unknown ingredient name → returns null, no exception
3. Second call for same normalized key → `cnf_food_id` is already set in `ingredient_categories` → no trigram query (assert query count)
4. `cnf_foods` empty → returns null gracefully
5. Similarity exactly 0.4 → match accepted; similarity 0.39 → no match

**Step 3 — Implementation:**

Create `api/src/RecipeApi/Services/NutrientLookup.cs`. Register in `Program.cs` as scoped.

**Definition of done:** All 5 tests pass. `task review` passes.

- [ ] Task 3 complete

---

## Task 4 — `HEFIScorer`

**What:** Pure scoring function that computes HEFI-2019 component and total scores from week profiles and nutrition data.

**Dependency:** Tasks 1–3 not required — this is pure logic. Only the C# records from recipe-categorization spec are needed.

**IMPORTANT — validation requirement:** Before marking this task done, the scorer output MUST be validated against at least one published HEFI-2019 reference dataset. Record the validation result in Notes/Decisions.

**Step 1 — Write tests first:**

Create `api/src/RecipeApi.Tests/Services/HEFIScorerTests.cs`:

1. All 7 dinners VegetablesAndFruits primary, no protein, no grain → `vegetableFruitScore` = 20, `proteinFoodScore` = 0, `totalScore` reflects this
2. Perfectly balanced week (protein 3d, veggies 5d, grain 3d, 1 plant-protein) → `totalScore` near maximum
3. All null profiles → all component scores 0, `totalScore` = 0, all FOP counts 0
4. `sodiumScore`: avg sodium 400mg (above FopThresholds.SodiumMg = 345) → score penalised; avg sodium 200mg → score 10
5. `saturatedFatScore`: avg satFat 5g (above FopThresholds.SaturatedFatG = 4) → score penalised; avg satFat 2g → score 10
6. `plantProteinRatio`: 2 plant-protein days out of 4 protein days → ratio = 0.5 → score = 2.5
7. `plantProteinRatio`: 0 protein days → score = 0 (no divide-by-zero)
8. **FOP counts — high sodium:** 3 recipes with sodium >= 345mg, 4 below → `fopWeekSummary.highInSodiumDays = 3`
9. **FOP counts — high saturated fat:** 2 recipes with satFat >= 4g → `fopWeekSummary.highInSaturatedFatDays = 2`
10. **FOP counts — null nutrition:** recipes with null nutrition → contribute 0 to all FOP counts, no exception
11. **FOP thresholds match regulation constants:** assert scorer uses `FopThresholds.SodiumMg`, `FopThresholds.SaturatedFatG`, `FopThresholds.SugarsG` — not hardcoded literals

**Step 2 — Implementation:**

Create `api/src/RecipeApi/Services/HEFIScorer.cs` — shape in design.md. Reference `FopThresholds` constants; do not duplicate them.

**Step 3 — Validate against reference:**

Use published HEFI-2019 reference examples from the Health Canada documentation or academic papers. Record the inputs and expected vs actual outputs in Notes/Decisions below.

**Definition of done:** All 11 tests pass. Validation completed and documented. `task review` passes.

- [ ] Task 4 complete

---

## Task 5 — Wire HEFI scoring into `GroceryRecomputeService`

**What:** Compute `HEFIScore` at recompute time and write it to `weekly_plans.hefi_score`.

**Dependency:** Tasks 3 and 4 must be complete. `WeeklyPlan.HefiScore` exists (Task 2).

**Seam warning:** `GroceryRecomputeService.RecomputeForWeekAsync` already writes `grocery_items` and `balance_summary` (Phase 1). Add HEFI scoring to the same method, combining into the same `SaveChangesAsync` call.

**Step 1 — Write tests first:**

Add to `GroceryRecomputeServiceTests.cs`:

1. After `RecomputeForWeekAsync`, `weekly_plans.hefi_score` is non-null
2. All null dietary profiles → `hefiScore.totalScore = 0`
3. `hefi_score` is written in the same `SaveChangesAsync` call as `grocery_items` and `balance_summary` (assert single save)
4. HEFI score does not change `grocery_state`, `grocery_items`, or `balance_summary` values

**Step 2 — Implementation:**

In `RecomputeForWeekAsync`:
1. Load `CNFFood` for each recipe's ingredients via `NutrientLookup` (batch — not per-ingredient per-call)
2. Build `NutritionSummary` per recipe from CNF data (or `raw_metadata.nutrition` as fallback when CNF has no match)
3. Call `HEFIScorer.Compute(profiles, nutritionSummaries)`
4. Serialize result to JSON → write to `weeklyPlan.HefiScore`

**Definition of done:** All 4 tests pass. `task test:api` passes.

- [ ] Task 5 complete

---

## Task 6 — Extended `ConditionRuleEngine` with CNF ingredient matching

**What:** Add the `ingredientMatches` overload to `ConditionRuleEngine` for ingredient-level allergen detection.

**Dependency:** Task 3 (`NutrientLookup`) must be complete.

**Read before starting:**
- design.md § Extended `ConditionRuleEngine` for the allergen synonym dictionary and matching logic
- `api/src/RecipeApi/Services/ConditionRuleEngine.cs` — the existing Phase 1 implementation

**Important:** The existing `Evaluate` overload (without `ingredientMatches`) must NOT be changed. Phase 1 callers (`DiscoveryService`, `ScheduleService`) continue to use it unchanged until they are updated to pass CNF data.

**Step 1 — Write tests first:**

Add to `ConditionRuleEngineTests.cs`:

1. `"Shellfish"` allergy + `ingredientMatches` contains a CNFFood with `food_name: "shrimp"` → `hard` warning
2. `"Shellfish"` allergy + `ingredientMatches` contains only `"chicken breast"` → no warning
3. `"TreeNuts"` allergy + `ingredientMatches` contains `"almond"` → `hard` warning
4. `"Peanuts"` allergy + CNFFood for peanut → `hard` warning; reason names "peanut" specifically
5. `"Gluten"` intolerance + `ingredientMatches` contains `"wheat flour"` → `soft` warning
6. Unknown allergen string + any ingredient list → no warning, no exception
7. `ingredientMatches` with null CNFFood entries (unmatched ingredients) → Phase 1 proteinSource fallback applies for that ingredient slot
8. Both `ingredientMatches` AND `proteinSource` match → only one warning per allergen (no duplicates)

**Step 2 — Implementation:**

Add the new overload and `AllergenSynonyms` dictionary per design.md.

Update `DiscoveryService` and `ScheduleService` to use the new overload, passing `NutrientLookup` results per recipe ingredient. This upgrade is optional for Phase 2 initial delivery — document in Notes/Decisions if deferred.

**Definition of done:** All 8 tests pass. Existing Phase 1 tests still pass. `task review` passes.

- [ ] Task 6 complete

---

## Task 7 — `GenerateWeeklyRecommendationsProcessor`

**What:** The LLM-based recommendation generator. Triggered when `isBalanced: false` and open slots exist.

**Read before starting:**
- design.md § `GenerateWeeklyRecommendationsProcessor` — payload, system prompt, idempotence check, trigger mechanism
- `api/src/RecipeApi/Services/Processors/ClassifyDietaryProfileProcessor.cs` — structural template
- Dependency: Tasks 2, 4, 5 must be complete

**Step 1 — Write tests first:**

Create `api/src/RecipeApi.Tests/Services/Processors/GenerateWeeklyRecommendationsProcessorTests.cs`:

1. `isBalanced: true` → LLM NOT called, `recommendations` cleared
2. No open slots → LLM NOT called, `recommendations` cleared
3. Balance summary unchanged since last generation (idempotence) → LLM NOT called
4. Valid LLM response → `recommendations` written with correct `recipeId` and `reason`
5. LLM returns `recipeId` not in the candidate list → that entry discarded, others kept
6. LLM throws → no write, prior `recommendations` preserved, no exception thrown
7. No family members have health profiles → LLM still called (health profiles are optional context)
8. `recommendations` payload excludes allergy lists — only `conditions` and `preferences` sent to LLM

**Step 2 — Workflow integration:**

Create `api/src/RecipeApi/Workflows/generate-weekly-recommendations.yaml`:

```yaml
name: generate-weekly-recommendations
parameters:
    - weekMonday
tasks:
    - name: generate_recommendations
      processor: GenerateWeeklyRecommendations
      payload:
          weekMonday: "{{ weekMonday }}"
```

In `GroceryRecomputeService`, after writing `balance_summary`: if `isBalanced: false` and open slots > 0, enqueue this workflow. Fire-and-forget — do not await.

**Step 3 — `GET /api/schedule` returns recommendations:**

Extend `ScheduleService.GetScheduleAsync` to deserialize `weekly_plans.recommendations` and pass as param 9 to `ScheduleDays` constructor.

**Definition of done:** All 8 tests pass. Integration test: assign unbalanced week → schedule returns non-null `recommendations` after workflow completes. `task agent:drift` passes.

- [ ] Task 7 complete

---

## Task 8 — PWA HEFI score display

**What:** Display the HEFI total score on the planner alongside the existing `isBalanced` indicator.

**Dependency:** Task 2 (TypeScript client), Task 5 (server computes HEFI).

**Step 1 — Write tests first:**

1. `hefiScore.totalScore = 72` → displays "72/100" or equivalent
2. `hefiScore = null` → no score displayed, no error
3. HEFI display does not block any planner action

**Step 2 — Implementation:**

Extend `BalanceIndicator` (from recipe-categorization spec) or create a sibling component. Display `totalScore` when non-null.

**Definition of done:** Tests pass. `task test:unit` passes.

- [ ] Task 8 complete

---

## Task 9 — PWA weekly recommendation cards

**What:** Display LLM-generated recipe suggestions in open planner slots.

**Dependency:** Task 7 (server generates recommendations), Task 2 (TypeScript client).

**Step 1 — Write tests first:**

1. `recommendations` array with 2 entries → 2 suggestion cards rendered in open slots
2. `recommendations = null` or `[]` → no suggestion cards
3. Dismissing a suggestion card removes it from view (local state — no API call)
4. Tapping a suggestion card navigates to the recipe detail

**Step 2 — Implementation:**

Add `WeeklyRecommendationCard` component. Wire into the planner open slot rendering. Dismissal is local state only — no `DELETE` endpoint needed for Phase 2.

**Definition of done:** Tests pass. `task test:unit` passes. `task review` passes.

- [ ] Task 9 complete

---

## Task 10 — Documentation

**File to create:** `api/docs/DIETITIAN_AGENT_PHASE2.md`

**Required content:**
1. What the HEFI score measures — plain language, what 0/50/100 means for a home cook
2. What the CNF is and where it comes from — Health Canada, Open Government Portal
3. What the Health Canada "High in" FOP symbol means — plain language, the three nutrients, the official 15% DV thresholds (sodium 345mg, sugars 15g, saturated fat 4g), and the source URL
4. Why FOP flags are null for most recipes before Phase 2 — honest explanation: nutrition data comes from the recipe's source website, not from AI guessing; meal-kit sites publish it, most blogs don't; Phase 2 CNF fills the gaps
5. How `FopWeekSummary` relates to the FOP label — "if 3 of your dinners this week show the sodium symbol, your week scores 3 high-sodium days"
5. How ingredient-level allergy matching works and its limitations (CNF coverage, synonym expansion)
6. How the weekly recommendation AI works — what it sees, what it doesn't see, that it's a suggestion only
7. Token cost: ~700 tokens per recommendation call, only fires on `isBalanced: false` state change
8. Mermaid data-flow diagram from design.md
9. How to re-seed CNF data (`task data:cnf:seed`) and what happens when CNF data is unavailable

**Definition of done:** File exists, all 7 sections present. `task review` passes.

- [ ] Task 10 complete

---

## Notes / Decisions

- **2026-05-06**: Spec authored. HEFI-2019 scoring uses CFG proportion-based approximation in Phase 1 — exact SAS macro parity is a refinement task. Validation against published reference data required before Task 4 is marked done.
- **2026-05-06**: `ScheduleDays` positional record will have 9 parameters after this spec (params 8 and 9). All tasks include grep guard for call sites.
- **2026-05-06**: CNF CFG food group mapping from CNF codes to 2019 CFG groups is a static constant in the ingestion service. It must be published in documentation for human review — it is a clinical judgment, not a technical one.
- **HEFI validation result**: *(to be filled in during Task 4)*
- **CNF download URL used**: *(to be filled in during Task 1 — document the exact URL so future maintainers can re-download)*
