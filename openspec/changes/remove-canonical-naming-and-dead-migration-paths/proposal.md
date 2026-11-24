# Proposal

## Why

The portions and structured-recipe rollout introduced transitional "canonical" terminology (`CanonicalContent`, `CanonicalRecipeOperations`, `canonicalDrafts`, `canonicalEditor`) and offline migration/conversion scaffolding (`StructuredRecipeMigrationManifest`, `StructuredRecipeMigrationReceipt`, `StructuredRecipeContentStore.MigrationPreparation`, `ConvertAsync`, V1 `Record`/`CaptureOriginal`, and stale pre-cutover OpenAPI prose). Legacy recipes are now upgraded automatically at startup by `RecipeStartupMigrator`, the offline migration operator has already been retired, and structured recipe editing is live—leaving dead migration code paths and split "canonical" vs "structured" terminology across backend, PWA, tests, and OpenAPI descriptions.

## Outcome and Scope

Retire all dead portions-era migration/conversion code paths and unify portions-era "canonical" naming onto "structured" (matching `StructuredRecipeContent`, `StructuredRecipeContentStore`, and `StructuredRecipeOperation`), with zero breaking wire/API changes and zero disruption to existing PostgreSQL data, recovery snapshots, or immutable golden fixtures.

Success is established when:

- Dead portions-era migration/conversion files and methods with zero live production callers are deleted:
  - `api/src/RecipeApi/Services/StructuredRecipeMigrationManifest.cs`, `api/src/RecipeApi/Services/StructuredRecipeMigrationReceipt.cs`, and `api/src/RecipeApi/Services/StructuredRecipeMigrationReceipt.Presentation.cs` (moving the one-line `Require` helper used by `api/src/RecipeApi/Services/GroceryRowState.Receipt.cs` into a local helper and removing dead `canonical-recipe-migration-receipt-v1` hooks from `api/src/RecipeApi/Services/FoodVocabularyStore.Presentation.cs` and `api/src/RecipeApi/Services/FoodVocabularyInventoryQualification.cs`).
  - `api/src/RecipeApi/Services/StructuredRecipeContentStore.MigrationPreparation.cs`, unused `ConvertAsync` / `ConvertCoreAsync` and V1 `Record(...)` in `api/src/RecipeApi/Services/StructuredRecipeContentStore.cs`, and dead V1 writer `CaptureOriginal(...)` in `api/src/RecipeApi/Services/StructuredRecipeContentStore.History.cs`.
  - Dead tests exercising only the deleted types/methods (`api/src/RecipeApi.Tests/Services/CanonicalRecipeMigrationManifestTests.cs` and the reflection-only receipt/convert tests in `api/src/RecipeApi.Tests/Services/CanonicalRecipeMigrationExecutionTests.cs`), while preserving active `RecipeStartupMigrator` and `MaintenanceCommand` prune/retention coverage and migrating integration test fixtures that previously seeded via `ConvertAsync` onto active structured-recipe creation/edit paths.
- Remaining portions-era "canonical" symbols and filenames are renamed across backend C#, PWA, E2E/unit tests, CI suite lists, and OpenAPI prose:
  - Backend C#: `Recipe.CanonicalContent` → `StructuredContent`, `RecipeDbContext.CanonicalRecipeOperations` → `StructuredRecipeOperations`, `UpdateRecipeDto.HasCanonicalContent` → `HasStructuredContent`, `RecipeService.RenderCanonicalInstructions` → `RenderStructuredInstructions`, `CanonicalResultV2` → `StructuredResultV2`, and `CanonicalOperations` record properties in `WorkflowLifecycle`, `WorkflowProcessorHistory`, `RecipePhysicalLifecycle`, and `FoodVocabularyInventoryQualification` (while explicitly preserving persisted JSON wire keys `"canonicalContent"`, `"canonicalOperations"`, and `"canonical-operation"` where retained DB rows, recovery snapshots, and SHA-256 golden fixtures already embed them).
  - Database (`api/database/schema.sql`, `api/database/compatibility.sql`): retain physical PostgreSQL identifiers (`canonical_content`, `canonical_recipe_operations`, `guard_canonical_recipe_content`, `canonical_recipe_content_guard`) via EF Core `[Column]`/`[Table]` mappings so live deployments stay zero-downtime and all existing v1/v2/v3/v4 recovery snapshots and demo baselines remain restorable without a breaking schema hash change; update stale SQL comments only. (Full tradeoff documented in `design.md`.)
  - PWA & E2E: rename `canonicalDrafts` → `ingredientDrafts`, `canonicalEditing` → `structuredEditing`, `EditorBaseline.canonical` → `structured`, `canonicalInstructionInput` → `structuredInstructionInput`, `pwa/e2e/canonical-editor.ts` → `pwa/e2e/structured-editor.ts` (`applyStructuredEditorPatch`, `structuredEditor` fixture option), `pwa/e2e/canonical-content-input.ts` → `pwa/e2e/structured-content-input.ts` (`structuredRecipePatchIsValid`), `canonicalIngredientText`/`canonicalIngredientLines` → `structuredIngredientText`/`structuredIngredientLines`, `pwa/e2e/canonical-package.spec.ts` → `pwa/e2e/structured-package.spec.ts` (including `scripts/ci/e2e-suites.cjs` and `scripts/ci/e2e-suites.test.cjs`), and `canonical-*.test.ts` → `structured-*.test.ts`.
  - PWA audit result (verified from source): `pwa/src/components/recipes/RecipeDetailSheet.tsx`, `pwa/src/lib/recipes/editor-draft.ts`, and `pwa/src/lib/recipes/instruction-draft.ts` contain no dead feature-flag gates; their `contentSchemaVersion === 2` vs legacy (`null`) branches remain live for unmigrated/in-flight captures, mock builders, and `sessionStorage` draft upgrade reconciliation and are preserved with renamed "structured" identifiers.
  - OpenAPI (`specs/openapi.yaml` + regenerated Kiota client): rewrite stale pre-cutover prose descriptions (such as "At canonical cutover", "Canonical writes remain gated", and "Canonical owners remain fenced until activation") to reflect active structured recipe editing with no breaking wire/property changes.
- All verification gates pass: `task test:api`, `task test:database`, PWA unit + affected E2E tests, `task gen:client:check`, `scripts/ci/e2e-suites.test.cjs`, and `task verify`.

### Explicit Exclusions

- Do **not** touch `QuantityMath.IsCanonical` / `IsCanonicalRational` or mathematical "canonical exact rational" references (reduced rational fraction math).
- Do **not** touch `GrocerySections.IsCanonicalName` / `TryGetCanonicalName` in `api/src/RecipeApi/Services/AisleMapper.cs` and its controller callers (standardized grocery aisle names).
- Do **not** touch search-index or calendar-week "canonical" terminology (`RecipeSearchDocument`, `weekly-household-interest` canonical week keys) that is unrelated to the portions/structured-recipe rollout.
- Do **not** delete pure read-only retained-history validators (`StructuredRecipeContentStore.ValidateOriginalOperation` V1 and `ValidateOriginalOperationV2` `"convert"` branch) that verify immutable retained rows and SHA-256 golden fixtures (`canonical-old-authority-v1-v3.json`, `physical-retirement-old-v1.json`, `physical-retirement-core-v1.json`).

## What Changes

- Remove dead portions-era migration manifest, migration receipt, presentation-epoch receipt binding, migration preparation, `ConvertAsync` / `ConvertCoreAsync`, V1 `Record(...)`, and V1 `CaptureOriginal(...)` code paths and their reflection-only tests.
- Rename backend C# portions-era "canonical" properties, DbSet, methods, and internal record properties to "structured" while keeping EF Core PostgreSQL column/table mappings and persisted JSONB snapshot wire keys explicitly backward-compatible.
- Update stale pre-cutover SQL comments in `api/database/schema.sql` and `api/database/compatibility.sql` without renaming physical PostgreSQL columns, tables, or triggers.
- Rename PWA editor/draft/instruction symbols, E2E mock helpers, fixture options, Playwright spec/Vitest test files, and CI E2E suite registrations from "canonical" to "structured" / `ingredientDrafts`.
- Rewrite stale pre-cutover prose in `specs/openapi.yaml` and regenerate the Kiota client (`pwa/src/lib/api/generated/`) via `task gen:client`.

No breaking API wire changes, database schema changes, or observable user-facing behavior changes are introduced.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is an internal dead-code retirement, symbol/file rename, and non-breaking OpenAPI prose cleanup with no spec-level behavior changes. `skip_specs: true` applies in `.openspec.yaml`.

## Impact

- **Backend (`api/src/RecipeApi/`)**: `Models/Recipe.cs`, `Data/RecipeDbContext.cs`, `Dto/UpdateRecipeDto.cs`, `Services/StructuredRecipeContentStore*.cs`, `Services/RecipeService.cs`, `Services/FoodVocabularyStore.Presentation.cs`, `Services/FoodVocabularyStore.Inventory.cs`, `Services/FoodVocabularyInventoryQualification.cs`, `Services/FoodVocabularyInventory.*.cs`, `Services/GroceryRowState.Receipt.cs`, `Services/WorkflowLifecycle.cs`, `Services/WorkflowProcessorHistory.cs`, `Services/RecipePhysicalLifecycle.cs`, `Services/RecoverySnapshotService.*.cs`, `Services/RecipeStartupMigrator.cs`, `Services/ManagementService.cs`, `Services/Agents/RecipeAgent.cs`, `Services/Agents/WebAcquisitionAgent.cs`, `Services/CaptureFailureService.cs`, `Services/GroceryRecomputeService.cs`, `Services/HouseholdFoodOverrideStore.cs`, `Services/SupperIngredientProjection.cs`, and deleted `Services/StructuredRecipeMigrationManifest.cs`, `Services/StructuredRecipeMigrationReceipt.cs`, `Services/StructuredRecipeMigrationReceipt.Presentation.cs`, `Services/StructuredRecipeContentStore.MigrationPreparation.cs`.
- **Backend Tests (`api/src/RecipeApi.Tests/`)**: `Services/CanonicalRecipeMigrationManifestTests.cs` (deleted), `Services/CanonicalRecipeMigrationExecutionTests.cs` (pruned/renamed), `Services/BilingualStartupMigrationTests.cs`, `Services/FoodVocabularyReferenceInventoryTests.cs`, and integration tests referencing `CanonicalContent`, `CanonicalRecipeOperations`, or `ConvertAsync`.
- **Database (`api/database/`)**: Comment-only cleanup in `schema.sql` and `compatibility.sql` (zero physical schema DDL changes).
- **Contract & Generated Client**: `specs/openapi.yaml` prose updates + regenerated `pwa/src/lib/api/generated/`.
- **PWA, E2E & CI (`pwa/`, `scripts/ci/`)**: `pwa/src/components/recipes/RecipeDetailSheet.tsx`, `pwa/src/lib/recipes/editor-draft.ts`, `pwa/src/lib/recipes/instruction-draft.ts`, `pwa/src/lib/api/structured-edit-wire.ts`, `pwa/e2e/structured-editor.ts`, `pwa/e2e/structured-content-input.ts`, `pwa/e2e/cooking-step-projection.ts`, `pwa/e2e/mock-api.ts`, `pwa/e2e/structured-package.spec.ts`, affected E2E specs and Vitest unit tests, and `scripts/ci/e2e-suites.cjs` / `scripts/ci/e2e-suites.test.cjs`.
