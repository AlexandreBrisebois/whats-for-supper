# Design: Dependable Portions and Bilingual Groceries

## Context and Existing Ownership

- **Exact rational arithmetic (`QuantityMath`)**: Replaces `LegacyGroceryQuantity` in `api/src/RecipeApi/Services/QuantityMath.cs`. All scaling, addition, scalar subtraction, parsing, and canonical form verification operate over exact rational numerators/denominators without floating-point drift.
- **Bilingual food vocabulary (`FoodVocabularyStore`, `FoodVocabularyDefinitions`, `FoodMappingQualification`)**:
  - `docs/data/food-vocabulary/model-reviewed-2026-11-13.1.json` defines 44 reviewed foods and 122 EN/FR aliases using the strict `FoodVocabularyDocument` schema (`version: 1`).
  - `docs/data/food-vocabulary/base-household-vocabulary.json` (embedded in `RecipeApi` as `RecipeApi.Resources.base-household-vocabulary.json`) extends that reviewed release compatibly (`ValidateCompatible`) to cover common household staples sampled across the 198 recipes in `data/recipes/*/recipe.json`.
  - `FoodVocabularyStore.PublishReviewedAsync` persists active membership in `family_settings` (`food_vocabulary_publication`) and writes immutable bytes under `.household/food-vocabulary/<revision>-<sha256>.json`, which `RecoverySnapshotService` already includes in backup/restore archives.
- **Canonical recipe facts & step bindings (`CanonicalRecipeContentStore`, `CookingStepRelationshipProducer`, `CookingStepProjection`, `SupperIngredientProjection`)**:
  - Recipes store canonical structured `IngredientLines`, `InstructionSections`, and step `Bindings` in `recipes.canonical_content` (with `ContentSchemaVersion == 2`), alongside qualification proof in `recipes.food_mapping_evidence`.
  - `GroceryRecomputeService` aggregates scheduled recipe ingredients grouped by `(FoodId | fallback key, GroceryUnit.Bucket, PackageKey)` per `WeeklyPlan`.

## Decisions and Tradeoffs

1. **Embedded baseline vocabulary + idempotent startup seeding (`FoodVocabularySeeder`)**
   - **Decision**: Embed `base-household-vocabulary.json` as an assembly resource in `RecipeApi.csproj` and keep the matching copy at `docs/data/food-vocabulary/base-household-vocabulary.json`. On startup before HTTP traffic, `FoodVocabularySeeder.EnsureSeededAsync` inspects `FoodVocabularyStore.CaptureActiveAsync()`. Only when no active vocabulary exists does it publish the baseline bytes via `PublishReviewedAsync` with a deterministic operation ID derived from the file's SHA-256 hash.
   - **Tradeoff / Alternative**: Using `FoodVocabularyStore.PublishReviewedAsync` rather than writing `family_settings` directly preserves full compatibility with `RecoverySnapshotService`, `FoodVocabularyStore.CapturePresentationAsync`, and interrupted-publication resumption (`prepared` state), without mutating any household's custom or previously published vocabulary.

2. **Lightweight single-transaction startup recipe migration (`RecipeStartupMigrator`)**
   - **Decision**: Instead of requiring an offline multi-stage manifest CLI operator for existing households, `RecipeStartupMigrator.MigrateAsync` runs synchronously during startup before `app.RunAsync()`:
     1. Queries recipes lacking `CanonicalContent` or having `ContentSchemaVersion != 2` (skipping empty unready capture placeholders).
     2. Inside a single database transaction, parses legacy `ingredients` lines (`Amount`, `AmountText`, `Unit`, `Description`, `Shopping`), extracts `InstructionSections` via `RecipeExtractionParser`, resolves `Servings` when missing (`RecipeServings.Parse` or pure numeric `recipeYield`), discovers cooking step bindings via `CookingStepRelationshipProducer.Discover`, qualifies `FoodId` mappings via `FoodMappingQualification.Prepare`, validates the canonical export via `RecipeExportContent.WriteCurrent`, and resets any legacy pre-canonical `WeeklyPlan` grocery payloads that fail `GroceryRowState.RequireCurrent`.
     3. Commits the transaction so subsequent scoped readers observe committed canonical recipes, then invokes `GroceryRecomputeService.RecomputeForWeekAsync` for every persisted `WeeklyPlan` week and non-skipped recipe-bearing `CalendarEvent` week.
   - **Tradeoff / Alternative**: Preserves `recipes.RawMetadata` verbatim (computing `SourceRevision` from original metadata) while supplying aligned `recipeIngredient` metadata to `FoodMappingQualification.Prepare` so source-origin lines qualify deterministically against the seeded vocabulary without requiring `rawMetadata.supply` to match line-for-line across all 198 legacy recipes. Repeating startup when all recipes are already version 2 is a fast read-only check (`0` writes).

3. **Test isolation boundary**
   - **Decision**: Register `FoodVocabularySeeder` and `RecipeStartupMigrator` in both `Program.cs` and `TestWebApplicationFactory`, but execute them automatically only in `Program.cs` (before `app.RunAsync()`). Existing vocabulary isolation tests expect a fresh `TestWebApplicationFactory` to start with `CaptureActiveAsync() == null`, while `WebApplicationFactory<Program>` and unit/integration tests exercise the real startup path directly.

## First Observable Slice

1. Startup seeding of `base-household-vocabulary.json` (`FoodVocabularySeederTests`) and fast (< 2s) single-transaction upgrade of all 198 sample recipes plus bilingual week recomputation (`BilingualStartupMigrationTests`), wired into `Program.cs`.
2. Subsequent slices build on these canonical `ContentSchemaVersion == 2` rows and `FoodId` mappings for `RecipeDetailSheet` / Cook's Mode step projection and grocery unification.

## Persistence and Side Effects

- `FoodVocabularySeeder` touches `family_settings` (`food_vocabulary_publication`) and `.household/food-vocabulary/` only when unseeded (or resuming an interrupted initial seed).
- `RecipeStartupMigrator` commits all recipe `canonical_content`, `food_mapping_evidence`, `servings`, and legacy `weekly_plans` grocery resets in one atomic transaction before invoking `GroceryRecomputeService.RecomputeForWeekAsync`. `CalendarEvents`, `GroceryExtraOccurrences`, `HouseholdFoodOverrides`, `SupperServings`, and valid existing grocery check baselines remain preserved.
