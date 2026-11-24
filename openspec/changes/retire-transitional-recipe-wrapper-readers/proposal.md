# Proposal

## Why

Change `restore-schema-org-recipe-standard-and-retire-publications` unwraps existing `backupContentVersion: 1` and `format: "wfs-recipe"` v2 `{id}/recipe.json` files into pure `https://schema.org/Recipe` JSON on startup while retaining transitional backward-compatible wrapper readers so pre-unwrap disk files, backups, and snapshots load safely during rollout. Once all active household and demo deployments have completed that startup unwrap and refreshed their backups, keeping transitional wrapper decoders and the startup unwrap pass leaves dead compatibility branches and dual-format ambiguity over `{id}/recipe.json`.

## Outcome and Scope

Remove transitional `backupContentVersion: 1` and `format: "wfs-recipe"` v2 wrapper readers and the startup `recipe.json` wrapper-unwrapping pass so pure `https://schema.org/Recipe` (`@context: "https://schema.org/"`, `@type: "Recipe"`) is the sole accepted `{id}/recipe.json` format on disk and during backup/restore.

**Prerequisite**: Apply only after `restore-schema-org-recipe-standard-and-retire-publications` has run against all retained household libraries (`./data/recipes/*/recipe.json`), active backups, and demo baselines so every `{id}/recipe.json` is already pure `https://schema.org/Recipe`.

Success is established when:

- `RecipeExportContent` (`api/src/RecipeApi/Infrastructure/RecipeExportContent.cs` and `api/src/RecipeApi/Infrastructure/RecipeExportContent.Current.cs`) and all `backupContentVersion: 1` / `format: "wfs-recipe"` v2 wrapper readers are removed.
- `RecipeStartupMigrator` (`api/src/RecipeApi/Services/RecipeStartupMigrator.cs`) no longer scans or unwraps wrapped `recipe.json` envelopes or `.publications/` residue on startup.
- Disk sync, backup preflight, merge restore, and snapshot validation accept pure `https://schema.org/Recipe` `{id}/recipe.json` files exclusively and report legacy `backupContentVersion: 1` or `wfs-recipe` v2 wrapper envelopes as unsupported/malformed recipe files rather than silently unwrapping them.

Out of scope: OpenAPI contract or Kiota client changes, PWA changes, database schema migrations, `https://schema.org/Recipe` share-bundle import/export behavior, and `StructuredRecipeContent` runtime portion projection math.

## What Changes

- **BREAKING (disk wrapper retirement)**: Remove `backupContentVersion: 1` and `format: "wfs-recipe"` v2 decoding from recipe disk and restore readers; `{id}/recipe.json` files containing those retired wrapper envelopes fail validation/load as unsupported formats instead of being unwrapped.
- Delete `api/src/RecipeApi/Infrastructure/RecipeExportContent.cs`, `api/src/RecipeApi/Infrastructure/RecipeExportContent.Current.cs`, and transitional wrapper-unwrap helpers in `RecipeStartupMigrator` and `ManagementService` / `RecoverySnapshotService`.
- Remove transitional wrapper-compatibility tests and replace them with explicit rejection tests confirming that only `https://schema.org/Recipe` `{id}/recipe.json` documents are accepted.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `data-backup-and-recovery`: Retire transitional `backupContentVersion: 1` and `wfs-recipe` v2 wrapper decoding and startup unwrapping so `{id}/recipe.json` accepts pure `https://schema.org/Recipe` exclusively and counts retired wrapper envelopes as recipe-load errors.

## Impact

- **Backend (`api/src/RecipeApi/`)**: `RecipeExportContent*` (deleted), `RecipeStartupMigrator`, `ManagementService`, `RecoverySnapshotService`, `SyncRecipeProcessor`, and associated unit/PostgreSQL restore tests in `api/src/RecipeApi.Tests/`.
- **Operational prerequisite**: All `./data/recipes/*/recipe.json` directories and retained backup/demo snapshots to be restored must already have been unwrapped to `https://schema.org/Recipe` by `restore-schema-org-recipe-standard-and-retire-publications`.
