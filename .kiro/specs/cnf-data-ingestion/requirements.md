# Requirements Document: CNF Data Ingestion

## Introduction

The `recipe-categorization` spec introduced `FopFlags` (Health Canada front-of-package nutrition flags) and the `ConditionRuleEngine` in `family-health-profiles` fires sodium/saturated-fat/sugar warnings for conditions like Hypertension, HighCholesterol, and Diabetes. Both features depend on per-recipe nutrition values.

Nutrition data in `raw_metadata.nutrition` is only present when the recipe's source URL published structured schema.org markup. This covers meal-kit sites but not most food blogs, photo imports, or synthesized recipes. Without this spec, `FopFlags` is null and health warnings are silent for the majority of the recipe library.

This spec seeds a local `cnf_foods` table from the Canadian Nutrient File (CNF) — a Health Canada government database of ~5,700 foods with authoritative nutrient values — and wires a `NutrientLookup` service that maps any normalized ingredient name to its CNF entry using trigram similarity search. Results are cached in `ingredient_categories.cnf_food_id` so each ingredient is looked up only once.

**This spec has no LLM dependency.** It is entirely deterministic infrastructure.

**Execution order:** This spec can be executed in parallel with `recipe-categorization`. It must be complete before `ClassifyDietaryProfileProcessor` (from `recipe-categorization`) can use CNF-sourced `FopFlags`. It does not block any other Phase 1 feature.

**Runtime impact:** Zero. `cnf_foods` is seeded once via `task data:cnf:seed` and is never written to by the application at runtime. Lookups are cached in the existing `ingredient_categories` table.

---

## Glossary

- **CNF**: Canadian Nutrient File. Published by Health Canada on the Open Government Portal. ~5,700 foods, full nutrient breakdowns per 100g.
- **`cnf_foods`**: Local PostgreSQL table seeded from CNF CSVs. Reference data — owned by the ingestion task, never written at runtime.
- **`NutrientLookup`**: Service that resolves a normalized ingredient name to a `CNFFood` row using `pg_trgm` trigram similarity. Caches the result in `ingredient_categories.cnf_food_id`.
- **`pg_trgm`**: PostgreSQL contrib extension for trigram-based text similarity search. Ships with the `pgvector/pgvector:pg18` image already in use. Enabled by one `CREATE EXTENSION` line.
- **Similarity threshold**: A match is accepted when `similarity(food_name, query) >= 0.4`. Below this, `NutrientLookup` returns null and the caller degrades gracefully.
- **`FopFlags` upgrade**: When CNF data is available for a recipe's ingredients, `ClassifyDietaryProfileProcessor` called with `forceReclassify: true` recomputes `FopFlags` from CNF nutrient values instead of scraped `raw_metadata.nutrition`. This is accurate and covers recipes that had null nutrition before.

---

## Requirements

### Requirement 1: `pg_trgm` extension and `cnf_foods` table

**User Story:** As the system, I need a local nutrient reference table so that ingredient-to-nutrient lookups are fast, free, and do not depend on external APIs at runtime.

#### Acceptance Criteria

1. `api/database/schema.sql` SHALL add `CREATE EXTENSION IF NOT EXISTS pg_trgm` before the first use of trigram functions.
2. A `cnf_foods` table SHALL be created with columns: `food_id integer PRIMARY KEY`, `food_name text NOT NULL`, `cfg_food_group text`, `sodium_mg_per_100g float`, `sugar_g_per_100g float`, `saturated_fat_g_per_100g float`, `carbohydrate_g_per_100g float`, `created_at timestamptz DEFAULT now()`.
3. A GIN trigram index SHALL be created on `cnf_foods.food_name` using `gin_trgm_ops`.
4. The `ingredient_categories` table SHALL gain a nullable FK column `cnf_food_id integer REFERENCES cnf_foods(food_id) ON DELETE SET NULL`.
5. ALL schema changes SHALL use `IF NOT EXISTS` / `IF NOT EXISTS` guards — safe to apply to an existing database.
6. `cnf_foods` SHALL NOT be managed by psqldef application migrations after initial creation. The ingestion task owns its content.

---

### Requirement 2: CNF ingestion task

**User Story:** As a system operator, I want a single command that downloads and seeds the CNF data locally, so that ingredient nutrient lookups are available without any manual database work.

#### Acceptance Criteria

1. Running `task data:cnf:seed` SHALL download the CNF "All Files" ZIP from the Health Canada Open Government Portal, parse the relevant CSV files, and upsert rows into `cnf_foods`.
2. THE task SHALL be idempotent — running it twice produces no duplicate rows (upsert on `food_id`).
3. THE task SHALL log the count of rows inserted/updated on completion.
4. THE task SHALL fail with a clear error message if the download URL is unreachable, without leaving the DB in a partial state.
5. THE download URL used SHALL be written to the task's log output and documented in `api/docs/CNF_INGESTION.md` so future operators can re-download without guessing.
6. THE task SHALL extract these specific CSV files from the ZIP: `FOOD_NM.csv` (food names, English), `NUTRIENT_AMOUNT.csv` (nutrient values per food), `NUTRIENT_NAME.csv` (nutrient ID to name mapping).
7. THE key nutrient IDs to extract are: sodium (307), sugars (269), saturated fat (606), carbohydrate (205).
8. THE CFG food group mapping (CNF food group code → 2019 CFG group string) SHALL be a static dictionary in the ingestion code, not a database table. It SHALL be documented in `api/docs/CNF_INGESTION.md` for human review — it is a nutritional judgment, not a technical one.

---

### Requirement 3: `NutrientLookup` service

**User Story:** As the system, I need to resolve any normalized ingredient name to its CNF entry once, cache the result, and never look it up again.

#### Acceptance Criteria

1. A `NutrientLookup` service SHALL accept a normalized ingredient name (already processed through `IngredientNormalizer.Normalize`) and return the best-matching `CNFFood` row or `null`.
2. BEFORE querying `cnf_foods`, the service SHALL check `ingredient_categories.cnf_food_id` for the normalized key. If set, it SHALL load and return the `cnf_foods` row directly — no similarity search.
3. WHEN no cache entry exists, the service SHALL run a trigram similarity search: the top-1 result with `similarity >= 0.4` is accepted.
4. WHEN a match is found, the service SHALL write `cnf_food_id` to the `ingredient_categories` row for that normalized key.
5. WHEN no match is found at the similarity threshold, the service SHALL return `null`. Callers MUST handle `null` gracefully — the system degrades to `FopFlags: null` for that recipe.
6. THE similarity search SHALL use EF Core raw SQL (`db.Database.SqlQuery<CNFFood>`) — `pg_trgm` functions are not supported by EF Core LINQ. The query must be parameterized (no string interpolation).
7. THE service SHALL never be called from a user-facing request path. It is called only from background workflow processors.

---

### Requirement 4: Integration with `ClassifyDietaryProfileProcessor`

**User Story:** As the system, I want `FopFlags` on a recipe to use CNF nutrient values when available, so that health warnings and FOP week summaries are accurate even for recipes with no scraped nutrition data.

#### Acceptance Criteria

1. `ClassifyDietaryProfileProcessor` SHALL call `NutrientLookup` for each ingredient in the recipe's `supply[]` after this spec is complete.
2. THE processor SHALL aggregate the per-ingredient CNF nutrient values into a per-portion estimate: sum each nutrient across all ingredients, then divide by `recipeYield` (number of portions). When `recipeYield` is absent or unparseable, assume 2 portions.
3. WHEN CNF data is available for at least one ingredient, the processor SHALL compute `FopFlags` from the aggregated CNF values, overriding any value previously computed from `raw_metadata.nutrition`.
4. WHEN CNF data is available for zero ingredients (all lookups returned `null`), the processor SHALL fall back to `raw_metadata.nutrition` for `FopFlags` if present, otherwise `null`.
5. THE processor's idempotence check SHALL remain: if `dietary_profile` is already set and `forceReclassify` is false, skip. Running `task data:cnf:seed` does NOT automatically re-classify recipes — the operator must trigger re-classification via `forceReclassify` on the relevant workflow.
6. A re-classification trigger task SHALL be provided: `task data:cnf:reclassify` — runs `ClassifyDietaryProfileProcessor` with `forceReclassify: true` for all recipes whose `dietary_profile.fopFlags` is currently `null`.

---

### Requirement 5: Backup and restore

**User Story:** As a system operator, I want the CNF group mapping to survive a database wipe so I don't have to re-seed from the internet.

#### Acceptance Criteria

1. `ManagementService.BackupAsync()` SHALL export `cnf_foods` rows (columns: `food_id, cfg_food_group`) to `{DataRoot}/cnf-cfg-groups.csv`.
2. `ManagementService.RestoreAsync()` SHALL NOT automatically re-import `cnf_foods` from the CSV. The full re-seed from source is `task data:cnf:seed`. The CSV backup is for auditing the CFG group mapping, not for full restore.
3. THE backup task SHALL log the count of exported rows.

---

### Requirement 6: Documentation

**User Story:** As a maintainer, I want clear documentation about where the CNF data comes from, how to refresh it, and what the CFG group mapping decisions are.

#### Acceptance Criteria

1. `api/docs/CNF_INGESTION.md` SHALL exist and contain: the download URL, the CNF file format, the nutrient IDs used, the CFG group mapping table with rationale, how to run `task data:cnf:seed`, how to trigger re-classification, and what happens if the download URL changes.

---

## Risks and Questions

- **CNF URL stability**: Health Canada occasionally reorganises the Open Government Portal. If the download URL changes, `task data:cnf:seed` fails. The URL must be documented and the task must produce a clear error with the last-known URL.
- **`recipeYield` parsing**: `recipeYield` is a string like `"2 portions"` or `"4 servings"` or simply `"4"`. The parser must extract the leading integer. When it fails, default to 2 portions — document this assumption.
- **Portion vs 100g**: CNF values are per 100g. Recipe `supply[]` quantities are in mixed units (grams, ml, units). Converting "2 Chicken Breasts" to grams requires a unit weight table. For Phase 1, use a static weight table for the most common unitless ingredients (chicken breast ≈ 150g, egg ≈ 50g, apple ≈ 180g). Unknown units default to 100g with a logged warning.
- **Trigram false positives**: `similarity >= 0.4` may match "parsley" to "parsnip". The cache write is permanent — a wrong match stays until manually corrected or the cache is cleared. Operators should be able to inspect `ingredient_categories.cnf_food_id` values. The threshold of 0.4 was chosen conservatively; lower values increase false positives.
- **`pg_trgm` on pgvector image**: `pgvector/pgvector:pg18` ships `pg_trgm` as a contrib module. It is available but not enabled by default. The `CREATE EXTENSION IF NOT EXISTS pg_trgm` line in `schema.sql` is sufficient.
