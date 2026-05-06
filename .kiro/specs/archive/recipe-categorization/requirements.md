# Requirements Document: Recipe Dietary Categorization

## Introduction

"What's For Supper" plans weekly dinner menus for families. Today the app has no understanding of whether a week's meals are nutritionally balanced. A user can plan seven consecutive beef dinners and the app will not notice.

This feature classifies every recipe in the library against the **2019 Canada's Food Guide (CFG)** at import time — once, permanently, with the result cached on disk — and uses that classification to compute a weekly balance score. The score drives two user-visible behaviours: a balance indicator on the planner, and an SSE nudge that steers the discovery voting stack toward under-represented food groups.

This is Phase 1. It is not a dietary counsellor. It does not answer nutrition questions. It does not calculate calories or macronutrients. It classifies recipes and nudges meal selection. A full dietitian agent (Phase 2) will build on this foundation.

---

## Glossary

- **CFG**: Canada's Food Guide 2019. Three food groups: Vegetables and Fruit, Whole Grain Foods, Protein Foods.
- **DietaryProfile**: A structured JSONB record stored on the `recipes` row and backed up to `recipe.info`. The permanent result of classifying a recipe.
- **PrimaryFoodGroup**: The CFG food group that contributes most to the recipe's caloric or nutritional identity. Stored also in `recipes.category` for backward-compatible discovery filtering.
- **SecondaryFoodGroups**: CFG food groups present in meaningful quantity beyond the primary. A salmon-rice-broccoli dinner has `ProteinFoods` as primary and `[WholeGrains, VegetablesAndFruits]` as secondary.
- **ProteinSource**: The origin of the recipe's primary protein. Used to support family health profiles (Phase 2) and CFG's plant-protein nudging.
- **CuisineType**: The culinary tradition the recipe belongs to. Used for variety filtering in discovery.
- **MealType**: The meal slot the recipe is suited for. Multi-value. `primaryMealType` is what the planner uses.
- **WholeGrainConfident**: Boolean. True only when the ingredient list contains an unambiguous whole-grain name (e.g. "brown rice", "whole wheat", "quinoa", "oats"). Ambiguous names ("pasta", "linguine", "noodles", "rice") produce `false`. A recipe is only credited for WholeGrains in the balance scorer when this is `true`.
- **BalanceScore**: A deterministic, code-computed summary of a 7-day dinner plan's adherence to CFG proportions. No LLM is involved in balance scoring.
- **ClassifyDietaryProfile processor**: The workflow processor that reads a recipe from the DB and calls the LLM once to produce a `DietaryProfile`. Idempotent: skips if `dietary_profile` is already set.
- **Discovery nudge**: An SSE event sent when a food group reaches its weekly target, telling the discovery stack to surface recipes from the next under-represented group.

---

## Requirements

### Requirement 1: DietaryProfile data model

**User Story:** As the system, I need each recipe to carry a permanent, structured dietary classification so that balance scoring never requires a live LLM call.

#### Acceptance Criteria

1. THE `recipes` table SHALL have a `dietary_profile` column of type `jsonb`, nullable, defaulting to `null`.
2. THE `DietaryProfile` shape SHALL be:
   ```
   {
     primaryFoodGroup:    "VegetablesAndFruits" | "WholeGrains" | "ProteinFoods" | "Mixed"
     secondaryFoodGroups: Array<"VegetablesAndFruits" | "WholeGrains" | "ProteinFoods">
     proteinSource:       "RedMeat" | "Poultry" | "Seafood" | "PlantProtein" | "Dairy" | "Mixed" | "None"
     cuisineType:         string   // e.g. "Italian", "French-Canadian", "Asian", "Canadian", "Mexican"
     mealTypes:           Array<"Breakfast" | "Lunch" | "Dinner" | "Snack" | "Dessert">
     primaryMealType:     "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Dessert"
     wholeGrainConfident: boolean
     confidence:          number   // 0.0–1.0, LLM self-reported
     source:              "llm" | "manual"
   }
   ```
3. THE `recipes.category` column SHALL be set to the string value of `primaryFoodGroup` (e.g. `"ProteinFoods"`) when a `DietaryProfile` is written. This replaces any previous free-text value.
4. THE `DietaryProfile` SHALL NOT be written to `recipe.json`. It SHALL be written to `recipe.info` via the existing `RecipeInfo` / `ManagementService` backup path.
5. WHEN `wholeGrainConfident` is `false`, `WholeGrains` SHALL NOT appear in `secondaryFoodGroups`. Ambiguous grain names ("pasta", "linguine", "noodles", "rice" without a qualifier) SHALL produce `wholeGrainConfident: false` and SHALL NOT contribute a WholeGrains credit.

---

### Requirement 2: ClassifyDietaryProfile workflow processor

**User Story:** As the system, I need recipes to be classified automatically at import time, without blocking the user, using the same reliable background workflow that already handles hero image generation.

#### Acceptance Criteria

1. A `ClassifyDietaryProfile` workflow processor SHALL be implemented following the same structural pattern as `CategorizeIngredientsProcessor`.
2. THE processor SHALL be idempotent: if `recipe.dietary_profile IS NOT NULL`, it SHALL log a debug message and return without calling the LLM.
3. THE LLM input payload SHALL be: `name`, `description` (first 150 characters), and the list of ingredient names from `supply[]`. No quantities, no instructions, no nutrition data.
4. THE LLM SHALL be called in a single request per recipe. Multi-turn calls are not used.
5. WHEN the LLM returns an unrecognized `primaryFoodGroup` value, the processor SHALL log a warning and complete without writing to the DB. The workflow SHALL continue to `RecipeReady`.
6. WHEN the LLM call fails entirely, the processor SHALL log the error and complete without writing. The workflow SHALL continue to `RecipeReady`. The recipe will be classified on the next re-import or manual trigger.
7. THE processor SHALL use the same `WorkflowRetryOptions` configuration (schedule `[1, 5, 20, 60, 300]` minutes, max 10 retries, quiet window 01:00–05:00) as the existing retry infrastructure.

---

### Requirement 3: Workflow standardization

**User Story:** As the system, I need every recipe import path to produce both a grocery categorization and a dietary profile, so the library is fully enriched regardless of how a recipe entered the system.

#### Standard tail sequence

Every workflow that produces or updates a recipe SHALL end with this tail, in order:

```
sync_recipe → categorize_ingredients → classify_dietary_profile → recipe_ready
```

`recipe-description-regeneration` is the only exception: it does not produce a new recipe and does not run `CategorizeIngredients`. It SHALL run `classify_dietary_profile` after `sync_recipe` because a description change can affect cuisine and meal type. It has no `recipe_ready` step and SHALL NOT add one.

#### Current inventory and required changes

| Workflow | CategorizeIngredients | ClassifyDietaryProfile | Action required |
|---|---|---|---|
| `recipe-import.yaml` | ✓ (pending) | ✗ | Add `classify_dietary_profile` after `categorize_ingredients` |
| `url-import.yaml` | ✗ | ✗ | Add both processors — full standard tail |
| `goto-synthesis.yaml` | ✗ | ✗ | Add both processors — full standard tail |
| `recipe-description-regeneration.yaml` | — (not applicable) | ✗ | Add `classify_dietary_profile` after `sync_recipe` only |

#### Acceptance Criteria

1. ALL four workflows SHALL be updated per the table above before this feature is considered complete.
2. ALL workflow tails SHALL use `depends_on` to enforce sequential execution.
3. `classify_dietary_profile` SHALL never run before `sync_recipe` — the recipe must be in the DB first.
4. `categorize_ingredients` SHALL always run before `classify_dietary_profile` when both are present — ingredients are normalized before dietary classification.
5. A `recipe-description-regeneration` run SHALL re-classify `dietary_profile` by clearing the existing value before calling the processor (description change invalidates cuisine/meal type — it does NOT invalidate `primaryFoodGroup` or `proteinSource`, so the processor should perform a partial update for description-driven fields only). **Note:** the exact partial-update mechanism is a design decision for the implementing developer — document it in Notes/Decisions when resolved.

---

### Requirement 4: Backup and restore

**User Story:** As a user, I want my recipe classifications to survive a database wipe and restore, so I don't pay for re-processing recipes I've already imported.

#### Acceptance Criteria

1. `ManagementService.BackupAsync()` SHALL write `dietary_profile` to `recipe.info` for every recipe that has a non-null `dietary_profile`.
2. `ManagementService.RestoreAsync()` SHALL read `dietary_profile` from `recipe.info` and upsert it into `recipes.dietary_profile`, using the same upsert-from-file pattern used for other `RecipeInfo` fields.
3. THE restore path SHALL NOT re-trigger LLM classification if `dietary_profile` is present in `recipe.info`.
4. WHEN `recipe.info` does not contain a `dietary_profile` field, the restore step SHALL leave `recipes.dietary_profile` as `null` — classification will occur on next import or manual trigger.

---

### Requirement 5: Weekly balance scorer

**User Story:** As a meal planner, I want to know at a glance whether my week's dinners are balanced according to Canada's Food Guide, without the app having to call an AI service every time I open the planner.

#### Acceptance Criteria

1. A `WeeklyBalanceScorer` service SHALL compute a `WeeklyBalanceSummary` from a set of recipes assigned to a week. It SHALL be pure, deterministic code — no LLM calls.
2. THE scorer SHALL operate on the 7 dinner slots only (Phase 1 scope).
3. THE `WeeklyBalanceSummary` shape SHALL be:
   ```
   {
     proteinDays:        int   // days where ProteinFoods is primary or secondary
     veggieDays:         int   // days where VegetablesAndFruits is primary or secondary
     grainDays:          int   // days where WholeGrains is primary or secondary AND wholeGrainConfident = true
     plantProteinDays:   int   // days where proteinSource is PlantProtein or Mixed
     redMeatDays:        int   // days where proteinSource is RedMeat
     maxConsecutiveSame: int   // longest run of identical primaryFoodGroup
     isBalanced:         bool  // true when all Phase 1 targets are met
     recommendations:    string[]  // plain-language nudge strings, empty when isBalanced = true
   }
   ```
4. THE Phase 1 CFG targets (all must be met for `isBalanced: true`) SHALL be:
   - `proteinDays >= 3`
   - `veggieDays >= 4`
   - `grainDays >= 2`
   - `plantProteinDays >= 1`
   - `maxConsecutiveSame <= 3`
5. WHEN a recipe has `dietary_profile = null`, it SHALL be treated as `primaryFoodGroup: "Mixed"` and contribute no credits to any specific group.
6. `WeeklyBalanceSummary` SHALL be computed and stored on `weekly_plans` as a `balance_summary` jsonb column, recomputed every time `GroceryRecomputeService` runs (i.e. on every assign/remove).

---

### Requirement 6: Discovery category field and SSE nudging

**User Story:** As a user voting on recipes in the discovery stack, I want the app to surface recipes from food groups I haven't planned enough of yet, so my week naturally becomes balanced without me having to think about it.

#### Acceptance Criteria

1. `GET /api/discovery` SHALL accept an optional `foodGroup` query parameter (`VegetablesAndFruits | WholeGrains | ProteinFoods | Mixed`) to filter the stack.
2. `GET /api/discovery` SHALL accept an optional `cuisine` query parameter to filter by `cuisineType`.
3. THE existing `category` query parameter on `GET /api/discovery` SHALL continue to work and SHALL filter by `recipes.category` (which is now `primaryFoodGroup`).
4. WHEN a week plan's `balance_summary` shows that a food group has reached its weekly target, the API SHALL emit an SSE event of type `discovery-nudge` with a payload of `{ nextFoodGroup: string, reason: string }`.
5. THE SSE `discovery-nudge` event SHALL be emitted on the existing SSE channel, following the same pattern as the recipe-removed-from-stack event.
6. THE PWA discovery stack SHALL listen for `discovery-nudge` events and set the active `foodGroup` filter to `nextFoodGroup`, causing the next batch of cards to come from that group.

---

### Requirement 7: Planner balance indicator

**User Story:** As a meal planner, I want a simple visual signal on the weekly planner telling me whether my current week is balanced, so I know when to diversify.

#### Acceptance Criteria

1. `GET /api/schedule` SHALL include the `balance_summary` in the `ScheduleDays` response.
2. THE PWA planner SHALL display a balance indicator using `isBalanced` and the `recommendations` array.
3. WHEN `isBalanced: true`, the indicator SHALL show a positive state (no action needed).
4. WHEN `isBalanced: false`, the indicator SHALL show the first recommendation string from `recommendations`.
5. THE indicator SHALL NOT block recipe assignment or any other planner action.

---

### Requirement 8: User-facing transparency

**User Story:** As a user, I want to understand how my recipes are being categorized and what it costs, so I trust the system and don't feel like something is happening behind my back.

#### Acceptance Criteria

1. A user-facing documentation page SHALL exist at `api/docs/DIETARY_CATEGORIZATION.md` explaining: what is classified, when it happens, how long it takes, what the CFG food groups are, what "balanced week" means in plain language.
2. The documentation SHALL explain the LLM usage: which model, approximately how many tokens per recipe, that classification happens once and is cached, and that balance scoring involves no AI.
3. The documentation SHALL explain that `recipe.info` persists the classification across database restores.
4. A data-flow diagram (Mermaid) SHALL be included showing the full path from recipe import to balance indicator.

---

## Risks and Questions

- **Family member health profiles** (cholesterol, allergies, intolerances, diabetes): this is a separate feature. `DietaryProfile.proteinSource` is designed to support it. The `family_members` table will need a `health_profile` jsonb column in that future spec.
- **CNF (Canadian Nutrient File) integration**: deferred to Phase 2. The Phase 2 dietitian agent will use the CNF CSVs from the Open Government Portal (`https://open.canada.ca`) to score actual nutrient intake. Reference data should be stored in a local PostgreSQL table on the Synology, seeded from the CNF "All Files" ZIP. See Phase 2 spec: `dietitian-agent-phase2` (not yet written).
- **`category` field migration**: the `category` column is now owned by this feature. Any existing free-text value (e.g. "Main Dish") is overwritten by `primaryFoodGroup` on first classification. This is intentional — `category` was a placeholder.
- **Workflow standardization gap**: three recipe workflows are missing one or both categorization processors. See Requirement 3 for the full inventory and the rule that governs which processors each workflow type must include.
- **`cuisineType` vocabulary**: no closed enum. The LLM assigns a string. Future work may normalise to a closed set. For Phase 1, store as free text and filter by exact match in discovery.
