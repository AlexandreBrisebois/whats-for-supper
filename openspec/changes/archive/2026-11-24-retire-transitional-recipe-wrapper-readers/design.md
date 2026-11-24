# Design

## Context and Existing Ownership

- **Predecessor state (`restore-schema-org-recipe-standard-and-retire-publications`)**: After `restore-schema-org-recipe-standard-and-retire-publications` is applied and run across retained environments:
  - In-memory `StructuredRecipeContent` validation (`ValidateContent`), `ManagementService.CanonicalBackup` retirement, and unexposed `CurrentRecovery*` removal are already completed.
  - Every active `{id}/recipe.json` on disk and every newly exported backup/demo baseline is already a pure top-level `https://schema.org/Recipe` JSON document (`@context: "https://schema.org/"`, `@type: "Recipe"`).
  - Two transitional rollout mechanisms remain isolated to `RecipeExportContent` (`api/src/RecipeApi/Infrastructure/RecipeExportContent.cs` and `api/src/RecipeApi/Infrastructure/RecipeExportContent.Current.cs`) and `RecipeStartupMigrator` (`api/src/RecipeApi/Services/RecipeStartupMigrator.cs`):
    1. `RecipeExportContent` decodes `backupContentVersion: 1` and `format: "wfs-recipe"` v2 wrapper envelopes on read for `ManagementService.RestoreAsync` and `SyncRecipeProcessor`.
    2. `RecipeStartupMigrator` scans `{RecipesRoot}/{id}/` on startup for `backupContentVersion: 1` or `wfs-recipe` v2 wrappers and `.publications/` subdirectories to unwrap/remove them in place.
- **Motivation**: Once all retained libraries, backups, and demo baselines have been normalized to `https://schema.org/Recipe`, retiring the two proprietary wrapper decoders and the startup disk-unwrap scan leaves a single unambiguous disk standard.

## Decisions and Tradeoffs

1. **Delete `RecipeExportContent*` wrapper decoders, reject retired envelopes explicitly, and preserve unversioned legacy ingredient arrays**
   - **Decision**: Delete `api/src/RecipeApi/Infrastructure/RecipeExportContent.cs` and `api/src/RecipeApi/Infrastructure/RecipeExportContent.Current.cs`. In `{id}/recipe.json` readers (`ManagementService.RestoreAsync` and `SyncRecipeProcessor`), explicitly reject JSON objects declaring `backupContentVersion` or `format` wrapper properties as `InvalidDataException` so `db-restore` increments `Errors` and skips retired wrapper envelopes instead of treating outer wrapper properties as raw recipe metadata. Keep `ManagementService.RestoreAsync`'s existing unversioned legacy `recipeIngredient` / `ingredients` fallback (`Read supported legacy recipe content` in `openspec/specs/data-backup-and-recovery/spec.md`) intact for wrapper-free JSON objects.
   - **Alternative & Tradeoff**: Deleting `RecipeExportContent` without an explicit guard on `backupContentVersion` / `format` would allow `RestoreAsync` to misread a `backupContentVersion: 1` wrapper's outer fields instead of counting a clear load error.

2. **Remove startup wrapper-unwrapping and `.publications` cleanup from `RecipeStartupMigrator`**
   - **Decision**: Remove the `backupContentVersion: 1` / `wfs-recipe` v2 disk-unwrap pass and `.publications/` directory cleanup from `api/src/RecipeApi/Services/RecipeStartupMigrator.cs`, keeping only PostgreSQL `StructuredRecipeContent` + bilingual `FoodId` derivation for database rows needing backfill.
   - **Alternative & Tradeoff**: Retiring startup wrapper unwrapping alongside restore wrapper decoding keeps startup and `db-restore` consistent on a single accepted `{id}/recipe.json` format.

## First Observable Slice

1. Delete `RecipeExportContent.cs` and `RecipeExportContent.Current.cs`, add explicit rejection of `backupContentVersion` and `format` wrapper keys in `ManagementService.RestoreAsync` and `SyncRecipeProcessor`, and remove startup wrapper-unwrap scanning from `RecipeStartupMigrator`, verifying via `CurrentRecipeExportTests`, `CanonicalRecipeMigrationExecutionTests`, and `ManagementBackupIntegrationTests` that top-level `https://schema.org/Recipe` loads cleanly while `backupContentVersion: 1` and `wfs-recipe` v2 envelopes fail as recipe-load errors.

## Persistence and Side Effects

- **Disk & Restore Invariant**: No code path reads or writes `backupContentVersion` or `wfs-recipe` in `{id}/recipe.json`. During `db-restore`, a retired wrapper file increments the restore `Errors` counter and leaves subsequent valid `https://schema.org/Recipe` directories unaffected (`Count malformed recipe loads without stopping later loads`).

## Compatibility, Rollout and Reversal

- **Rollout prerequisite**: Confirm zero wrapped files remain in the active recipe root and retained backup snapshots (verifying no `recipe.json` contains `"backupContentVersion"` or `"wfs-recipe"`).
- **Reversal**: If an archived pre-unwrap backup from `v0.1.40` or earlier ever needs to be imported later, run it once through the `restore-schema-org-recipe-standard-and-retire-publications` release (or extract its inner `rawMetadata` JSON) before restoring into a post-retirement build.
