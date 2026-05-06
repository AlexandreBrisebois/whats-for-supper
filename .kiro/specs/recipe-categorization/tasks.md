# Tasks: Recipe Dietary Categorization

Each task is a vertical slice: contract → tests → implementation. No task builds a horizontal layer.

**Before starting any task:** read design.md § Seam inventory. Every task touches at least one seam. Missing a seam is how things break silently.

**Before marking any task done:**
- `task agent:drift` — zero drift confirmed
- `task agent:test:impact` — targeted tests pass
- `task review` — formatting, lint, type-check, full test suite passes

---

## Task 1 — New C# records and database columns

**What:** Add all new records (`RecipeDietaryProfile`, `WeeklyBalanceSummary`, `FopThresholds`, `FopFlags`, `FopWeekSummary`, `NutritionParser`) and the new database columns. No LLM. No behavior change.

**Why first:** Every subsequent task depends on these types and columns existing.

**Step 1 — Write tests first:**

Create `api/src/RecipeApi.Tests/Models/RecipeDietaryProfileTests.cs`:
- JSON round-trip: serialize a `RecipeDietaryProfile` with all fields including `FopFlags` → deserialize → all fields match
- JSON round-trip: `FopFlags = null` serializes as null (not absent key)
- JSON round-trip: serialize a `WeeklyBalanceSummary` including `FopWeekSummary` → deserialize → all fields match
- Null `SecondaryFoodGroups` serializes as empty array, not null

Create `api/src/RecipeApi.Tests/Utils/NutritionParserTests.cs`:
- `ParseMilligrams("370 mg")` → `370.0`
- `ParseGrams("9 g")` → `9.0`
- `ParseMilligrams(null)` → `null`
- `ParseMilligrams("unparseable")` → `null`, no exception
- `ComputeFopFlags`: sodium `"400 mg"` → `highInSodium = true` (400 > 345)
- `ComputeFopFlags`: sodium `"300 mg"` → `highInSodium = false`
- `ComputeFopFlags`: saturated fat `"5 g"` → `highInSaturatedFat = true` (5 > 4)
- `ComputeFopFlags`: sugars `"20 g"` → `highInSugars = true` (20 > 15)
- `ComputeFopFlags`: all three nutrients null → returns `null` (no data to evaluate)
- `ComputeFopFlags`: sodium present, saturated fat null → `highInSodium` set, `highInSaturatedFat = false` (conservative)
- `FopThresholds` constant values: `SaturatedFatG == 4.0`, `SugarsG == 15.0`, `SodiumMg == 345.0`

**Step 2 — Schema:**

In `api/database/schema.sql`, add (after the existing `weekly_plans` column definitions):

```sql
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS
    dietary_profile jsonb DEFAULT NULL;

ALTER TABLE weekly_plans ADD COLUMN IF NOT EXISTS
    balance_summary jsonb DEFAULT NULL;
```

**Step 3 — C# models and utilities:**

Create `api/src/RecipeApi/Services/FopThresholds.cs` — shape in design.md § `FopThresholds.cs`. This is the single source of truth; never duplicate these constants.

Create `api/src/RecipeApi/Models/FopFlags.cs` — shape in design.md § `FopFlags.cs`.

Create `api/src/RecipeApi/Models/FopWeekSummary.cs` — shape in design.md § `FopWeekSummary.cs`.

Create `api/src/RecipeApi/Utils/NutritionParser.cs` — shape in design.md § `NutritionParser.cs`.

Create `api/src/RecipeApi/Models/RecipeDietaryProfile.cs` — shape in design.md § New C# records (includes `FopFlags?` field).

Create `api/src/RecipeApi/Models/WeeklyBalanceSummary.cs` — shape in design.md § New C# records (includes `FopWeekSummary` field).

In `api/src/RecipeApi/Models/Recipe.cs`, add:
```csharp
[Column("dietary_profile", TypeName = "jsonb")]
public string? DietaryProfile { get; set; } = null;
```

In `api/src/RecipeApi/Models/WeeklyPlan.cs`, add:
```csharp
[Column("balance_summary", TypeName = "jsonb")]
public string? BalanceSummary { get; set; } = null;
```

In `api/src/RecipeApi/Models/RecipeInfo.cs`, add:
```csharp
public RecipeDietaryProfile? DietaryProfile { get; set; } = null;
```

**Do NOT touch** `RecipeDbContext`, `ScheduleDays`, `ScheduleService`, or any other file.

**Definition of done:** Schema applies via `task dev:clean:sync`. Round-trip tests pass. No other tests break.

- [ ] Task 1 complete

---

## Task 2 — OpenAPI contract + client regeneration

**What:** Add new schemas and update existing schemas in `specs/openapi.yaml`. Regenerate the TypeScript client. No C# logic changes.

**Step 1 — Write tests first:**

None required — the contract is the artifact. The drift check is the test.

**Step 2 — Contract changes (exact locations matter):**

Add `RecipeDietaryProfileDto` and `WeeklyBalanceSummaryDto` schemas — shapes in design.md § OpenAPI Contract Delta. Place them in the `components/schemas` section alongside existing DTOs.

In the `ScheduleDays` schema, add `balanceSummary` after `groceryItems`. Do NOT change `required` — `balanceSummary` is nullable/optional, same as `groceryItems`.

In the `RecipeDto` schema, add `dietaryProfile` after `category`. Do NOT add it to `required`.

In `GET /api/discovery`, add `cuisine` query parameter after the existing `category` parameter.

Add SSE event documentation comment for `discovery_nudge` — see design.md § SSE event.

**Step 3 — Regenerate client:**

```bash
task gen:client
```

Confirm the generated TypeScript types include `WeeklyBalanceSummaryDto`, `RecipeDietaryProfileDto`, and that `ScheduleDays` has `balanceSummary?: WeeklyBalanceSummaryDto | null`.

**Step 4 — Drift check:**

```bash
task agent:drift
```

**Definition of done:** Drift check passes. TypeScript client builds. No existing tests break.

- [ ] Task 2 complete

---

## Task 3 — `ClassifyDietaryProfileProcessor`

**What:** Implement the workflow processor. This is the only place in the feature that calls the LLM.

**Read before starting:**
- `api/src/RecipeApi/Services/Processors/CategorizeIngredientsProcessor.cs` — copy this structure exactly
- design.md § `ClassifyDietaryProfileProcessor` — payload parsing, system prompt, validation rules, `forceReclassify` behavior

**Step 1 — Write tests first:**

Create `api/src/RecipeApi.Tests/Services/Processors/ClassifyDietaryProfileProcessorTests.cs`:

1. **Idempotence:** recipe with non-null `dietary_profile` AND `forceReclassify` absent → `IChatClient` never called, DB not written
2. **forceReclassify bypass:** recipe with non-null `dietary_profile` AND `forceReclassify: true` in payload → `IChatClient` IS called, profile overwritten
3. **Happy path:** LLM returns valid response → `recipe.DietaryProfile` set, `recipe.Category` set to `primaryFoodGroup`
4. **WholeGrain guard:** LLM returns `wholeGrainConfident: false` with `"WholeGrains"` in `secondaryFoodGroups` → `"WholeGrains"` removed from stored profile
5. **Invalid primaryFoodGroup:** LLM returns `"Dessert"` as `primaryFoodGroup` → no DB write, method returns normally, no exception thrown
6. **LLM throws:** `IChatClient` throws `HttpRequestException` → no DB write, method returns normally, no exception thrown
7. **Recipe not found:** `db.Recipes.FindAsync` returns null → log warning, return, no exception
8. **Null RawMetadata:** recipe has `RawMetadata = null` → log debug, return, no LLM call
9. **FOP flags computed deterministically:** recipe with sodium `"400 mg"` in `raw_metadata.nutrition` → stored `dietary_profile.fopFlags.highInSodium = true` (no LLM involved)
10. **FOP flags null when nutrition absent:** recipe with `nutrition: null` in raw_metadata → stored `dietary_profile.fopFlags = null`
11. **FOP flags do not block on LLM failure:** LLM throws but nutrition data is present → FOP flags still computed and stored if the profile write path is reached (they are attached before serialization)

**Step 2 — Implementation:**

Create `api/src/RecipeApi/Services/Processors/ClassifyDietaryProfileProcessor.cs`. Follow design.md steps 11–13 precisely: parse nutrition, compute FOP flags, attach to profile, then serialize. The FOP computation is inside the same try/catch as the rest — if it fails, it logs and returns without writing (consistent with existing error handling).

Register in `api/src/RecipeApi/Program.cs` alongside `CategorizeIngredientsProcessor`. No new DI or retry configuration — the existing `WorkflowWorker` retry infrastructure applies automatically.

**Definition of done:** All 8 tests pass. `task review` passes.

- [ ] Task 3 complete

---

## Task 4 — Workflow standardization (all four workflows)

**What:** Update all four recipe workflow YAML files so every recipe import path produces a dietary profile.

**Read before starting:**
- All four current YAMLs in `api/src/RecipeApi/Workflows/`
- design.md § Workflow YAML Changes — exact YAML to insert
- requirements.md Requirement 3 — the exception rule for `recipe-description-regeneration`

**The rule:**
- `recipe-import`, `url-import`, `goto-synthesis` → insert full standard tail
- `recipe-description-regeneration` → insert `classify_dietary_profile` with `forceReclassify: true` only — **no `recipe_ready`**, **no `categorize_ingredients`**

**Step 1 — Add `forceReclassify` support to processor (prerequisite):**

Task 3 must be complete. The processor must already handle `forceReclassify: true` in payload.

**Step 2 — Write tests first:**

Add to the integration test project (new file or existing `RecipeWorkflowIntegrationTests.cs`):

1. URL-import path: trigger workflow → wait for completion → `GET /api/recipes/{id}` returns `dietaryProfile` non-null
2. Goto-synthesis path: trigger workflow → wait for completion → `GET /api/recipes/{id}` returns `dietaryProfile` non-null
3. Description-regeneration path: recipe with existing `dietary_profile` → trigger workflow → profile is overwritten (not skipped)
4. `recipe-description-regeneration` does NOT produce a `recipe_ready` SSE event (assert the existing behavior is unchanged)

**Step 3 — YAML changes:**

`recipe-import.yaml`:
- `categorize_ingredients` is already present (pending changes)
- Insert `classify_dietary_profile` between `categorize_ingredients` and `recipe_ready`
- Update `recipe_ready.depends_on` from `[categorize_ingredients]` to `[classify_dietary_profile]`

`url-import.yaml`:
- Insert `categorize_ingredients` and `classify_dietary_profile` before `recipe_ready`
- Update `recipe_ready.depends_on` to `[classify_dietary_profile]`

`goto-synthesis.yaml`:
- Insert `categorize_ingredients` and `classify_dietary_profile` before `recipe_ready`
- Update `recipe_ready.depends_on` to `[classify_dietary_profile]`

`recipe-description-regeneration.yaml`:
- Insert `classify_dietary_profile` (with `forceReclassify: true`) after `sync_recipe`
- **Do NOT add `recipe_ready`**
- **Do NOT add `categorize_ingredients`**

**Definition of done:** All 4 integration tests pass. `task agent:drift` passes. `task review` passes.

- [ ] Task 4 complete

---

## Task 5 — `WeeklyBalanceScorer` (pure logic)

**What:** Implement the static scorer. Zero DB access. Zero LLM. Pure in-memory computation.

**Read before starting:**
- design.md § `WeeklyBalanceScorer` — counting rules, targets, recommendation strings

**Step 1 — Write tests first:**

Create `api/src/RecipeApi.Tests/Services/WeeklyBalanceScorerTests.cs`:

1. **All unclassified:** 7 null profiles → `isBalanced: false`, all counts 0, multiple recommendations present, `fopWeekSummary` all zeros
2. **All red meat:** 7 profiles with `primaryFoodGroup: ProteinFoods, proteinSource: RedMeat` → `plantProteinDays: 0`, `redMeatDays: 7`, `isBalanced: false`
3. **Balanced week:** profiles covering protein (3+), veggies (4+), confirmed grains (2+), one plant protein → `isBalanced: true`, `recommendations` empty
4. **Grain credit refused when not confident:** profile with `WholeGrains` in secondary but `wholeGrainConfident: false` → `grainDays` NOT incremented
5. **Grain credit accepted when confident:** profile with `WholeGrains` in secondary and `wholeGrainConfident: true` → `grainDays` incremented
6. **Consecutive-same detection:** 4 consecutive profiles with same `primaryFoodGroup` → `maxConsecutiveSame: 4`, recommendation present
7. **Consecutive broken by null:** 2 same, 1 null, 2 same → `maxConsecutiveSame: 2`
8. **Three sample recipes from spec:** Chicken Linguine (ProteinFoods/Poultry/no confident grain), Parmentier (ProteinFoods/RedMeat/no grain), Mustard Chicken Thighs (ProteinFoods/Poultry/confirmed grain) scored together → assert specific counts
9. **Recommendations order:** missing targets produce recommendations in the fixed priority order from design.md
10. **FOP aggregation — high sodium:** 3 profiles with `fopFlags.highInSodium: true`, 4 with false → `fopWeekSummary.highInSodiumDays = 3`
11. **FOP aggregation — null fopFlags:** profiles with `fopFlags: null` contribute 0 to all FOP counts, no exception
12. **FOP aggregation — Chicken Linguine real values:** sodium 370mg → below threshold 345mg → `highInSodium: false`; saturated fat 9g → above 4g → `highInSaturatedFat: true`; sugar 8g → below 15g → `highInSugars: false`

**Step 2 — Implementation:**

Create `api/src/RecipeApi/Services/WeeklyBalanceScorer.cs`.

**Definition of done:** All 9 tests pass. `task review` passes.

- [ ] Task 5 complete

---

## Task 6 — Wire balance scoring into `GroceryRecomputeService`

**What:** Call `WeeklyBalanceScorer` at the end of `RecomputeForWeekAsync` and write `balance_summary`. Emit the SSE nudge when a group newly reaches its target.

**Seam warning:** This task adds a method to `IScheduleEventPublisher`. That interface has multiple implementors including test fakes. All must be updated or tests will fail to compile.

**Read before starting:**
- `api/src/RecipeApi/Services/GroceryRecomputeService.cs` — find `RecomputeForWeekAsync`, understand where `SaveChangesAsync` is called
- `api/src/RecipeApi/Infrastructure/IScheduleEventPublisher.cs` — current 8-method interface
- `api/src/RecipeApi/Infrastructure/SseEventPublisher.cs` — SSE event name convention (underscore, e.g. `grocery_updated`)
- Search for all test fakes implementing `IScheduleEventPublisher`: `grep -rn "IScheduleEventPublisher" api/src/RecipeApi.Tests --include="*.cs"`
- Tasks 1 and 5 must be complete

**Step 1 — Write tests first:**

Add to `api/src/RecipeApi.Tests/Services/GroceryRecomputeServiceTests.cs`:

1. After `RecomputeForWeekAsync`, `weekly_plans.balance_summary` is non-null
2. Week with 7 null dietary profiles → `isBalanced: false` in written `balance_summary`
3. `balance_summary` is written in the same `SaveChangesAsync` call as `grocery_items` (assert single save — avoids partial writes)
4. `PublishDiscoveryNudgeAsync` is NOT called when previous `balance_summary` was null (first recompute — no comparison)
5. `PublishDiscoveryNudgeAsync` IS called when a group newly reaches its target (previous `proteinDays: 2`, new `proteinDays: 3`)
6. `PublishDiscoveryNudgeAsync` is NOT called when summary is unchanged
7. `grocery_state` is unchanged after recompute (existing property from grocery feature — must not regress)

**Step 2 — Interface update:**

In `IScheduleEventPublisher`, add:
```csharp
Task PublishDiscoveryNudgeAsync(string? nextFoodGroup, string reason);
```

In `SseEventPublisher`, add:
```csharp
public Task PublishDiscoveryNudgeAsync(string? nextFoodGroup, string reason)
    => _manager.BroadcastAsync("discovery_nudge", new { nextFoodGroup, reason });
```

**Step 3 — Update all test fakes:**

Find every class in `RecipeApi.Tests` that implements `IScheduleEventPublisher`. Add a no-op implementation:
```csharp
public Task PublishDiscoveryNudgeAsync(string? nextFoodGroup, string reason) => Task.CompletedTask;
```

**Step 4 — Implementation in `GroceryRecomputeService`:**

See design.md § Modified C# service: `GroceryRecomputeService` for the exact steps. Combine `balance_summary` write with the existing `SaveChangesAsync` call — do not add a second save.

**Definition of done:** All 7 tests pass. Project compiles (all fakes updated). `task test:api` passes.

- [ ] Task 6 complete

---

## Task 7 — `GET /api/schedule` returns `balanceSummary`

**What:** Deserialize `weekly_plans.balance_summary` and include it in the `ScheduleDays` response.

**Seam warning:** `ScheduleDays` is a positional C# record. Adding a parameter in the wrong position silently breaks all callers. The new parameter goes at the end, after `GroceryItems`.

**Read before starting:**
- `api/src/RecipeApi/Dto/ScheduleDays.cs` — current 6-parameter record
- `api/src/RecipeApi/Services/ScheduleService.cs` — find where `new ScheduleDays(...)` is called
- `api/src/RecipeApi.Tests/Services/ScheduleServiceTests.cs` — existing tests construct `ScheduleDays` directly; they will break if parameter order changes
- Task 1 must be complete (`WeeklyPlan.BalanceSummary` exists)
- Task 2 must be complete (OpenAPI contract updated)

**Step 1 — Write tests first:**

Add to `api/src/RecipeApi.Tests/Integration/ScheduleIntegrationTests.cs`:

1. `GET /api/schedule` after assigning a recipe with a known `dietary_profile` → response includes `balanceSummary` with non-null `isBalanced` field
2. `GET /api/schedule` for an empty week (no assignments) → `balanceSummary` is null
3. `balanceSummary.recommendations` is an array (not null) even when `isBalanced: true`

**Step 2 — `ScheduleDays.cs` update:**

Add `BalanceSummary` as the 7th optional parameter:
```csharp
[property: JsonPropertyName("balanceSummary")] WeeklyBalanceSummary? BalanceSummary = null
```

Check every call site of `new ScheduleDays(...)` in the codebase and confirm none break:
```bash
grep -rn "new ScheduleDays(" api/src --include="*.cs"
```

**Step 3 — `ScheduleService.cs` update:**

See design.md § Modified service: `ScheduleService.GetScheduleAsync`. Deserialize `plan?.BalanceSummary` and pass as the 7th argument. Match the null-safe pattern used for `groceryItems` on the line above it.

**Definition of done:** All 3 integration tests pass. `task agent:drift` passes. `task review` passes.

- [ ] Task 7 complete

---

## Task 8 — Discovery cuisine filter

**What:** Add cuisine filtering to `GET /api/discovery`. This requires updating the database view, the model, the service, and the controller — in that order.

**Seam warning:** `vw_discovery_recipes` is a database view. The `DiscoveryRecipe` model maps its columns. Adding a column to the view without adding it to the model (or vice versa) causes a runtime error. Do both in the same task.

**Read before starting:**
- `api/database/schema.sql` — find the `CREATE OR REPLACE VIEW vw_discovery_recipes` definition. Read it in full before editing.
- `api/src/RecipeApi/Models/DiscoveryRecipe.cs` — current column mappings
- `api/src/RecipeApi/Services/DiscoveryService.cs` — `GetRecipesForDiscoveryAsync`
- `api/src/RecipeApi/Controllers/DiscoveryController.cs` — `GetDiscoveryStack`
- Task 2 must be complete (OpenAPI contract has `cuisine` param)

**Step 1 — Write tests first:**

Add integration tests:

1. Recipe with `dietary_profile: { cuisineType: "Italian" }` → `GET /api/discovery?cuisine=Italian` → recipe appears in results
2. Recipe with `dietary_profile: { cuisineType: "Canadian" }` → `GET /api/discovery?cuisine=Italian` → recipe does NOT appear
3. `GET /api/discovery` with no `cuisine` param → behavior unchanged (existing tests still pass)
4. `GET /api/discovery?category=ProteinFoods&cuisine=Italian` → both filters applied (AND)
5. `GET /api/discovery?cuisine=NonExistent` → returns empty list, no error

**Step 2 — Schema:**

In `api/database/schema.sql`, update `vw_discovery_recipes`:
- Add `r.dietary_profile` to the SELECT list
- Do NOT change any other column or the WHERE clause

**Step 3 — Model:**

In `api/src/RecipeApi/Models/DiscoveryRecipe.cs`, add:
```csharp
[Column("dietary_profile", TypeName = "jsonb")]
public string? DietaryProfile { get; set; } = null;
```

Do NOT update `ToRecipe()` — dietary profile is not part of the discovery card payload.

**Step 4 — Service:**

In `DiscoveryService.GetRecipesForDiscoveryAsync`, add the optional `cuisine` parameter and the JSONB filter — see design.md § Modified service: `DiscoveryService`.

**Step 5 — Controller:**

In `DiscoveryController.GetDiscoveryStack`, add `[FromQuery] string? cuisine` and pass to the service.

**Definition of done:** All 5 tests pass. View applies via `task dev:clean:sync`. `task agent:drift` passes.

- [ ] Task 8 complete

---

## Task 9 — Backup and restore for `dietary_profile`

**What:** Extend `ManagementService` to persist `dietary_profile` through backup/restore cycles.

**Read before starting:**
- `api/src/RecipeApi/Services/ManagementService.cs` — read the full `BackupAsync` step 2 (recipe loop) and the full `RestoreAsync` method before making any changes
- `api/src/RecipeApi/Models/RecipeInfo.cs` — `DietaryProfile` field added in Task 1
- Task 1 must be complete

**Step 1 — Write tests first:**

Add to `api/src/RecipeApi.Tests/Services/ManagementServiceTests.cs`:

1. Backup: recipe with non-null `dietary_profile` → after `BackupAsync`, `recipe.info` file contains `dietaryProfile` field
2. Backup: recipe with null `dietary_profile` → `recipe.info` does NOT contain `dietaryProfile` field (or contains null)
3. Restore: `recipe.info` with valid `dietaryProfile` → after `RestoreAsync`, `recipes.dietary_profile` and `recipes.category` match the restored profile
4. Restore: `recipe.info` without `dietaryProfile` field → `recipes.dietary_profile` remains null, no error
5. Round-trip: backup → set `dietary_profile = null` in DB → restore → profile matches original

**Step 2 — `BackupAsync`:**

In the existing recipe loop (step 2), extend the `RecipeInfo` write to include `DietaryProfile`. See design.md § Modified service: `ManagementService`.

**Step 3 — `RestoreAsync`:**

Add step 9 after existing restore steps. See design.md § Modified service: `ManagementService`. Use `JsonDefaults.CamelCase` for serialization (consistent with the rest of the codebase).

**Definition of done:** All 5 tests pass. `task test:api` passes.

- [ ] Task 9 complete

---

## Task 10 — SSE `discovery_nudge` event (PWA side)

**What:** Listen for `discovery_nudge` SSE events in the PWA and update the active category filter on the discovery stack.

**Read before starting:**
- Find the existing SSE listener in the PWA — search for `vote_updated` or `recipe_ready` event handling as the template
- Task 6 must be complete (server emits `discovery_nudge`)
- Task 2 must be complete (TypeScript client regenerated)

**Step 1 — Write tests first:**

1. SSE event `discovery_nudge` received with `nextFoodGroup: "WholeGrains"` → discovery store's active category filter is set to `"WholeGrains"`
2. SSE event `discovery_nudge` received with `nextFoodGroup: null` → category filter is cleared
3. No `discovery_nudge` event → category filter unchanged

**Step 2 — Implementation:**

Add handler for `discovery_nudge` in the SSE listener alongside existing event handlers. Update the active category filter in the discovery store/state.

**Definition of done:** All 3 tests pass. `task test:unit` passes.

- [ ] Task 10 complete

---

## Task 11 — PWA balance indicator

**What:** Add a balance indicator to the weekly planner.

**Read before starting:**
- `pwa/src/components/planner/` — find where to add the indicator
- Task 2 must be complete (TypeScript client has `WeeklyBalanceSummaryDto`)
- Task 7 must be complete (`balanceSummary` in schedule response)

**Step 1 — Write tests first:**

Create `pwa/src/components/planner/BalanceIndicator.test.tsx`:

1. `balanceSummary = null` → renders neutral/empty state, no error
2. `isBalanced: true` → renders positive state
3. `isBalanced: false, recommendations: ["Add more protein..."]` → renders `recommendations[0]`
4. Indicator never renders a button or blocking element (display-only assertion)

**Step 2 — Implementation:**

Create `BalanceIndicator.tsx`. Accept `WeeklyBalanceSummaryDto | null`. Display-only — no actions.

Wire into the planner component so it receives `balanceSummary` from the schedule response.

**Definition of done:** All 4 tests pass. `task test:unit` passes. `task review` passes.

- [ ] Task 11 complete

---

## Task 12 — Documentation

**What:** Write user-facing and technical documentation.

**File to create:** `api/docs/DIETARY_CATEGORIZATION.md`

**Required content (7 sections — all must be present):**

1. **What gets classified and when** — plain language: every recipe is classified once at import, never again unless re-imported
2. **Canada's Food Guide food groups** — plain language explanation of the three groups and what "balanced week" means in everyday terms (not medical terms)
3. **The five balance targets** — written for a home cook, not a nutritionist
4. **How the AI is used** — which model, approximately how many tokens per recipe, that it happens in the background, that balance scoring uses no AI
5. **How your data is protected** — only recipe name, description, and ingredient names are sent to the AI; no personal data; classification is cached forever locally
6. **Where nutrition data comes from** — honest explanation: the app reads nutrition facts published by the recipe's source website (e.g. meal-kit sites). The AI does not guess or infer nutrition values. Most home-blog recipes and all photo/synthesis imports will not have this data until Phase 2 (CNF integration). The `fopFlags` field on a recipe is null when nutrition was not published — this is expected and normal.
7. **Mermaid data-flow diagram** — copy and adapt from design.md, simplify for a non-technical reader

**Definition of done:** File exists, all 6 sections present. Readable by a non-technical user. `task review` passes.

- [ ] Task 12 complete

---

## Notes / Decisions

- **2026-05-06**: `FopThresholds`, `FopFlags`, `FopWeekSummary`, and `NutritionParser` pulled forward from Phase 2. When `raw_metadata.nutrition` is present (sourced from structured schema.org markup on the scraped URL — not inferred by the LLM), FOP flags are computed as pure deterministic math with no new infrastructure. `null` is the common case: synthesized recipes, photo imports, and most blog imports have no nutrition data. Phase 2 CNF fills the gaps. `FopThresholds` is the single source of truth — never duplicated.
- **2026-05-06**: Spec authored. Key decisions: primary+secondary food groups with `wholeGrainConfident` guard; 6-value `ProteinSource` taxonomy for future family health profiles; `category` column now owned by this feature and set to `primaryFoodGroup`; `dietary_profile` persists to `recipe.info`, not `recipe.json`.
- **2026-05-06**: Workflow standardization: all four recipe workflows updated (Task 4). `recipe-description-regeneration` uses `forceReclassify: true` and does NOT get `recipe_ready`. `url-import` and `goto-synthesis` gaps confirmed and closed.
- **2026-05-06**: Seam paranoia review: `ScheduleDays` positional record order documented and guarded; `IScheduleEventPublisher` fake update required in Task 6; `vw_discovery_recipes` view and `DiscoveryRecipe` model must be updated together in Task 8; `forceReclassify` payload extension is backward-compatible (optional, default false).
