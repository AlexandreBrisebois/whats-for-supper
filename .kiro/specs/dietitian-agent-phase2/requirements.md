# Requirements Document: Dietitian Agent — Phase 2

## Introduction

Phase 1 (`recipe-categorization`) classified recipes against the 2019 Canada's Food Guide and introduced a rudimentary balance scorer. Phase 1 (`family-health-profiles`) added per-member health conditions and simple rule-based warnings.

Phase 2 upgrades the intelligence behind both. It introduces:

1. **Local nutrient reference data** — the Canadian Nutrient File (CNF) seeded from Health Canada's Open Government Portal, stored in the local PostgreSQL database. Replaces null nutrition fields and raw-metadata scraping with authoritative government data.
2. **HEFI-2019 scoring** — the Healthy Eating Food Index 2019, translated from its SAS macro source into deterministic C# logic, scoring each week's eating pattern against CFG proportions.
3. **Ingredient-level allergy and intolerance matching** — cross-references the recipe's `supply[]` ingredient names against the CNF's ingredient taxonomy to detect allergens and intolerances more accurately than `proteinSource`-only matching.
4. **Agent-driven weekly recommendations** — a single, stateless LLM call (Gemini Flash) that receives the family's `WeeklyBalanceSummary`, each member's `HealthProfile`, and the current plan, and returns 1–3 plain-language meal recommendations for the open slots. The user sees these as non-blocking suggestions.

**This feature does not answer diet questions. It does not replace a dietitian. It nudges meal selection.**

**Dependencies:**
- `recipe-categorization` spec complete — `dietary_profile` on all recipes
- `family-health-profiles` spec complete — `health_profile` on family members
- CNF CSV files downloaded from Health Canada Open Government Portal (see Requirement 1)

---

## Glossary

- **CNF**: Canadian Nutrient File. A government-maintained database of ~5,700 foods with full nutrient breakdowns. Published by Health Canada as CSV files on the Open Government Portal.
- **HEFI-2019**: Healthy Eating Food Index 2019. A validated scoring algorithm that measures adherence to the 2019 Canada's Food Guide. Based on proportions of food groups, not absolute quantities.
- **CNFFood**: A row in the local `cnf_foods` table — a food name, its CNF FoodID, and its CFG food group classification.
- **HEFIScore**: The output of the HEFI-2019 scorer: a numeric score (0–100) and component scores for each CFG dimension.
- **NutrientLookup**: The service that maps a normalized ingredient name to a CNF food entry and returns its nutrient values.
- **AgentRecommendation**: A plain-language meal suggestion returned by the LLM agent, shown as a non-blocking UI card on the planner.
- **OpenGovernmentPortal**: `https://open.canada.ca` — source of CNF CSV files. Download once; serve from local DB thereafter.

---

## Requirements

### Requirement 1: CNF data ingestion pipeline

**User Story:** As the system, I need authoritative nutrient data for Canadian foods stored locally so that I can compute HEFI scores and detect allergens without calling an external API at runtime.

#### Acceptance Criteria

1. A one-time data ingestion task (runnable via `task data:cnf:seed`) SHALL download and parse the CNF "All Files" ZIP from the Open Government Portal and populate a local `cnf_foods` table.
2. THE `cnf_foods` table SHALL contain at minimum: `food_id` (integer), `food_name` (text), `cfg_food_group` (text), `sodium_mg_per_100g` (float nullable), `sugar_g_per_100g` (float nullable), `saturated_fat_g_per_100g` (float nullable), `carbohydrate_g_per_100g` (float nullable).
3. THE ingestion task SHALL be idempotent — running it twice SHALL NOT produce duplicate rows (upsert on `food_id`).
4. THE `cnf_foods` table SHALL NOT be managed by psqldef schema migrations — it is reference data, not application schema. It is seeded by the ingestion task and never written to by the application at runtime.
5. THE ingestion task SHALL log a count of rows inserted/updated on completion.
6. THE CNF data SHALL be backed up as a CSV export in the data directory alongside `ingredient-categories.csv`. The backup task SHALL export only the `food_id` and `cfg_food_group` columns (the rest can be re-seeded from the source).

---

### Requirement 2: `NutrientLookup` service

**User Story:** As the system, I need to look up nutrient values for a recipe's ingredients from the local CNF database so that HEFI scoring and allergy matching can use authoritative data.

#### Acceptance Criteria

1. A `NutrientLookup` service SHALL accept a normalized ingredient name and return the best-matching `CNFFood` row, or null if no match is found.
2. Matching SHALL use the existing `IngredientNormalizer.Normalize` pipeline followed by a trigram similarity search (`pg_trgm`) on `cnf_foods.food_name`. A match is accepted when similarity >= 0.4.
3. THE service SHALL cache results in `ingredient_categories` — add a `cnf_food_id` column to that table so each normalized key can be linked to a CNF entry once and never looked up again.
4. WHEN no CNF match is found, the service SHALL return null. Callers must handle null gracefully — the feature degrades to Phase 1 behavior for unmatched ingredients.
5. THE lookup SHALL never block a user-facing request — it is called only from background workflow processors.

---

### Requirement 3: HEFI-2019 weekly score

**User Story:** As a meal planner, I want to see a HEFI score for my week's plan so I can understand how well it aligns with Canada's Food Guide, expressed as a number I can track over time.

#### Acceptance Criteria

1. A `HEFIScorer` service SHALL compute a `HEFIScore` from a set of recipes' `dietary_profile` values and their CNF-matched nutrient data.
2. THE `HEFIScore` SHALL include: `totalScore` (0–100), `vegetableFruitScore`, `wholeGrainScore`, `proteinFoodScore`, `plantProteinRatio`, `sodiumScore`, `saturatedFatScore`.
3. THE scorer SHALL be deterministic — no LLM involved.
4. THE `HEFIScore` SHALL be stored as a `hefi_score` JSONB column on `weekly_plans`, computed whenever `GroceryRecomputeService` runs.
5. `GET /api/schedule` SHALL include `hefiScore` in the `ScheduleDays` response.
6. THE PWA planner SHALL display the `totalScore` alongside the existing `isBalanced` indicator.

---

### Requirement 4: Ingredient-level allergy and intolerance matching

**User Story:** As a family member with a shellfish allergy, I want the app to warn me about a seafood chowder even when the `proteinSource` is "Seafood" but the specific shellfish allergen is buried in an ingredient like "clam juice", so I don't have to read every ingredient list manually.

#### Acceptance Criteria

1. THE `ConditionRuleEngine` (from `family-health-profiles`) SHALL be extended to match allergy and intolerance strings against CNF ingredient names in `supply[]`, not only against `proteinSource`.
2. WHEN a recipe ingredient's `cnf_food_id` maps to a CNF entry whose `food_name` or `cfg_food_group` contains the allergen string (case-insensitive, with synonym expansion), a `hard` warning SHALL be emitted.
3. SYNONYM expansion SHALL cover at minimum:
   - `"Shellfish"` → clam, mussel, oyster, scallop, shrimp, prawn, crab, lobster, squid, octopus
   - `"TreeNuts"` → almond, cashew, walnut, pecan, hazelnut, pistachio, macadamia, brazil nut
   - `"Peanuts"` → peanut, groundnut, arachis
   - `"Gluten"` → wheat, barley, rye, spelt, kamut, triticale
4. WHEN CNF data is not available for an ingredient (no match), the Phase 1 `proteinSource`-based matching SHALL remain as fallback.
5. THE synonym table SHALL be a static C# dictionary in the rule engine — not a database table. It is small and rarely changes.

---

### Requirement 5: LLM-driven weekly meal recommendations

**User Story:** As a meal planner with open slots in my week, I want the app to suggest specific recipes from my library that would improve the week's balance, so I don't have to browse the discovery stack manually.

#### Acceptance Criteria

1. WHEN a week plan has at least one open dinner slot AND `isBalanced: false`, a `GenerateWeeklyRecommendations` workflow processor SHALL produce 1–3 recipe recommendations.
2. THE processor SHALL be triggered automatically after `GroceryRecomputeService.RecomputeForWeekAsync` completes and `isBalanced: false`.
3. THE LLM input SHALL be: the current `WeeklyBalanceSummary`, each family member's `HealthProfile` (conditions and preferences only — not full allergy lists), and the titles + `dietary_profile.primaryFoodGroup` of the top-20 highest-rated recipes in the library that are not already assigned to the week. Total input: ~500–800 tokens.
4. THE LLM output SHALL be a JSON array of `{ recipeId, reason }` objects — 1–3 entries.
5. THE recommendations SHALL be stored as a `recommendations` JSONB column on `weekly_plans` and returned in `GET /api/schedule`.
6. THE PWA planner SHALL display recommendations as non-blocking suggestion cards in the open slots. The user can dismiss or act on them. They are NOT auto-assigned.
7. WHEN `isBalanced: true` OR there are no open slots, the processor SHALL skip the LLM call and clear any previous `recommendations`.
8. THE processor SHALL use the same `WorkflowRetryOptions` as all other LLM processors.
9. THE processor SHALL be idempotent: if `recommendations` is already set and `balance_summary` has not changed since they were generated, it SHALL skip the LLM call.

---

### Requirement 6: User-facing transparency

**User Story:** As a user, I want to understand what the HEFI score means and how the AI recommendations work.

#### Acceptance Criteria

1. A user-facing documentation page SHALL exist at `api/docs/DIETITIAN_AGENT_PHASE2.md`.
2. The documentation SHALL explain: what the HEFI score measures, what 0–100 means in plain language, that the CNF is a government database, that the AI recommendation is a suggestion only.
3. The documentation SHALL explain the token cost of the weekly recommendation call (~500–800 tokens, once per `isBalanced: false` state change, cached when unchanged).
4. A Mermaid data-flow diagram SHALL be included.

---

## Risks and Questions

- **CNF CSV format stability**: Health Canada occasionally revises the CNF CSV column layout. The ingestion task must be defensive about column names and log clearly when expected columns are missing.
- **`pg_trgm` extension**: Trigram search requires the `pg_trgm` PostgreSQL extension. It must be added to `schema.sql` alongside the existing `vector` extension.
- **Health Canada FOP thresholds are shared with `family-health-profiles`**: The `FopThresholds` static class (SaturatedFatG=4.0, SugarsG=15.0, SodiumMg=345.0) is defined once and referenced by both `ConditionRuleEngine` (Phase 1) and `HEFIScorer` (Phase 2). Do not define these constants in two places. Source: https://www.canada.ca/en/health-canada/services/food-nutrition/nutrition-labelling/front-package.html
- **HEFI-2019 SAS macro translation**: The official HEFI-2019 algorithm is published as SAS macros. Translating to C# requires care — the spec author should validate the C# output against published HEFI-2019 reference values before declaring it correct.
- **Weekly recommendation LLM cost**: At ~700 tokens per call and Gemini Flash pricing, each recommendation generation costs ~$0.0001. With a family planning 52 weeks/year, annual cost is ~$0.005. Negligible.
- **`GenerateWeeklyRecommendations` trigger**: The processor is triggered when `isBalanced: false` after recompute. If the family never reaches balance, this fires on every assign/remove. The idempotence check (Requirement 5.9) prevents redundant LLM calls when the balance summary hasn't changed.
- **Open Government Portal URL stability**: The CNF download URL may change. The ingestion task should document the URL used and log a clear error when the download fails.
