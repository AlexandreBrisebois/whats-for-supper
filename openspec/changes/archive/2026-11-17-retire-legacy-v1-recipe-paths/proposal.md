# Proposal

## Why

`RecipeStartupMigrator` (`2026-11-17-dependable-portions-and-bilingual-groceries`) upgrades all non-placeholder household recipes to structured v2 `CanonicalRecipeContent` (`ContentSchemaVersion == 2`) during startup before HTTP traffic and hosted workers begin. Retaining the superseded `--canonical-migration` CLI operator (`CanonicalRecipeMigrationOperator`), live V1 string-ingredient and `rawMetadata.supply` fallbacks in `SupperIngredientProjection`, and one-time V1 attestation/continuation helpers leaves dead maintenance surface, floating-point fallback scaling (`ScaleAmount`), and reflection-only V1 scaffolding that can mask unmigrated fixtures instead of enforcing structured v2 authority.

## Outcome and Scope

Retire the three deprecated V1 fallback and offline migration code paths in `RecipeApi` while preserving startup migration (`RecipeStartupMigrator`), fresh capture/conversion ingestion (`CanonicalRecipeContentStore.PrepareFreshSource` and `ConvertAsync`), general recovery snapshot/restore, historical `CanonicalRecipeMigrationReceipt` vocabulary/epoch continuity, and all existing OpenAPI/Kiota/PWA contracts. Success is established when:
- `Program.cs` no longer intercepts `--canonical-migration`, and `CanonicalRecipeMigrationOperator` plus its unreferenced offline manifest/admission/execution/week-rebuild partials and tests are removed.
- `SupperIngredientProjection.Read` projects exclusively from structured v2 `CanonicalRecipeContent`, returning empty lines only for unready empty capture placeholders and failing closed (`InvalidDataException`) when a populated recipe lacks v2 canonical content.
- All one-time V1 attestation, schema/history/snapshot/coverage continuation, and authority-transition helpers and their reflection-only test suites and fixtures are removed.

Out of scope: OpenAPI schema edits (`IngredientProjectionLine.issues` keeps its wire enum for backward compatibility), Kiota client regeneration, PWA/mock changes, EF Core schema migrations, `CanonicalRecipeContentStore.History.cs` (`ValidateOriginalOperation`), `CanonicalRecipeMigrationReceipt` historical readers, and historical handoff documents in `docs/handoffs/dependable-portions-next-slice/` linked from `HANDOVER.md`.

## What Changes

- Remove `--canonical-migration` CLI interception in `api/src/RecipeApi/Program.cs`, delete `CanonicalRecipeMigrationOperator.cs`, and delete its unreferenced offline manifest capture, admission, execution, and migration-week-rebuild partials (`CanonicalRecipeContentStore.MigrationExecution.cs`, `CanonicalRecipeContentStore.MigrationInventory.cs`, `CanonicalRecipeContentStore.MigrationAdmission.cs`, `GroceryRecomputeService.Migration.cs`, `GroceryRowState.Migration.cs`), along with `CanonicalRecipeMigrationPostgresTests*.cs`.
- Retire live V1 string-ingredient and `rawMetadata.supply` projection fallbacks in `SupperIngredientProjection.cs` (`ScaleAmount`, `BindSupplies`, `ObserveBoundLegacy`, `ReadQualifiedSource`, `IntentionallyUnquantified`, `Metadata`, `Text`, `Number`, `NumericToken`), localize `ConvertLines` source-supply extraction privately inside `CanonicalRecipeContentStore` strictly for ingestion/conversion, preserve `GroceryDemandEvidence` input-fingerprint compatibility, and migrate legacy-seeded supper/grocery test fixtures to structured v2 `CanonicalRecipeContent`.
- Remove obsolete V1 attestation, continuation, and transition helpers (`CanonicalRecipeContentStore.Attestation.cs`, `V1ExactSourceAdmission*.cs`, `V1RecoveryHistoryContext.cs`, `V1MigrationSource.cs`, `V1SourceCoveragePolicy.cs`, `V1MigrationPrewritePolicy.cs`, `V1AuthorityTransition*.cs`, `V1AuthoritySuccessorPolicy.cs`, `RecoverySnapshotService.V1*.cs`, and attestation/transition parameters and dead methods in vocabulary, recovery, maintenance, and migration-preparation owners), together with `V1*Tests.cs` and attestation-only fixtures (`attested-v1-original.json`, `attested-v1-duplicate-original.json`, `Fixtures/V1FullSnapshot/`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `supper-servings`: authoritative ingredient projections read structured v2 canonical ingredient lines exclusively, retiring live V1 string/supply fallback and read-time `stale_source` derivation while failing closed on populated recipes lacking canonical v2 content.

## Impact

Affected backend owners: `api/src/RecipeApi/Program.cs`, `SupperIngredientProjection`, `IngredientProjectionLineDto`, `CanonicalRecipeContentStore` partials, `GroceryRecomputeService`, `GroceryRowState`, `RecoverySnapshotService` partials, `RecoveryBoundary.Maintenance`, `FoodVocabularyInventoryQualification` partials, `FoodVocabularyStore` partials, and `api/src/RecipeApi.Tests/` supper, grocery, migration, and V1 attestation test suites. Preserves `specs/openapi.yaml`, generated Kiota client, `pwa/`, PostgreSQL schema, `RecipeStartupMigrator`, and `docs/handoffs/dependable-portions-next-slice/`.
