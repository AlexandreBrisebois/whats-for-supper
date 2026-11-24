# Spec Delta

## MODIFIED Requirements

### Requirement: Distinguish current recipe envelopes from legacy content

Current recipe exports, merge restore, and disk synchronization SHALL accept top-level `https://schema.org/Recipe` JSON documents directly without custom wrapper envelopes, and SHALL reject retired `backupContentVersion` 1 envelopes, retired `wfs-recipe` version 2 envelopes, and unknown wrapper envelopes as recipe-load errors instead of decoding or unwrapping them as recipe content.

#### Scenario: Current recipe envelope

- **WHEN** `recipe.json` is a current top-level `https://schema.org/Recipe` JSON object
- **THEN** restore reads its `recipeIngredient`, `recipeInstructions`, `recipeYield`, and metadata directly without expecting a wrapper envelope

#### Scenario: Disk sync after export

- **WHEN** the disk-sync workflow reads a freshly exported top-level `https://schema.org/Recipe` file
- **THEN** it preserves `recipeInstructions`, `recipeIngredient`, and `recipeYield` and derives structured portion facts directly

#### Scenario: Unsupported content version

- **WHEN** `recipe.json` contains a retired `backupContentVersion` 1 envelope, a retired `wfs-recipe` version 2 envelope, or any other wrapper version envelope
- **THEN** merge restore and disk sync count that recipe as a load error instead of decoding the wrapper or interpreting its envelope as raw content

### Requirement: Preserve recipe servings without extending recipe info

Recipe exports SHALL preserve database servings in `https://schema.org/Recipe` `recipeYield` (retaining matching phrasing when unedited, or null when unset) without adding serving fields to `recipe.info`. Disk sync and merge restore SHALL derive `servings` exclusively from `recipeYield` on top-level `https://schema.org/Recipe` files and SHALL reject retired wrapper envelopes through existing recipe-load failure handling.

#### Scenario: Current export and restore

- **WHEN** a recipe with database `servings` 4 and `recipeYield` `"4 portions"` is exported and restored from `{id}/recipe.json`
- **THEN** `{id}/recipe.json` is top-level `https://schema.org/Recipe`, the database has `servings` 4, ingredients remain retained, and `recipe.info` has no added yield/count field

#### Scenario: Manually corrected count

- **WHEN** a recipe whose original yield was `"4 portions"` is edited to `servings` 3 and exported or saved to `{id}/recipe.json`
- **THEN** `{id}/recipe.json` updates `recipeYield` to `"3 portions"` while keeping original ingredient quantities unchanged, and restoring that file yields `servings` 3 with no added field in `recipe.info`

#### Scenario: Explicit unknown count

- **WHEN** a recipe has `servings` null and is exported to `{id}/recipe.json`
- **THEN** `{id}/recipe.json` writes `recipeYield` as null and restore retains `servings` null

#### Scenario: Legacy exported envelope

- **WHEN** `recipe.json` supplies a retired `backupContentVersion` 1 or `wfs-recipe` version 2 wrapper envelope instead of a top-level `https://schema.org/Recipe` document
- **THEN** restore and disk sync report that record as invalid through existing recipe-load failure handling rather than unwrapping or deriving a serving count

#### Scenario: Legacy direct recipe content

- **WHEN** `recipe.json` directly contains `https://schema.org/Recipe` JSON with `recipeYield` `"4 portions"` without an export envelope
- **THEN** restore and disk sync derive database `servings` 4 without changing printed ingredient quantities

#### Scenario: Invalid exported count

- **WHEN** `recipe.json` supplies a retired wrapper `servings` field or malformed JSON rather than a valid `https://schema.org/Recipe` document
- **THEN** that record is reported as invalid through existing recipe-load failure handling rather than silently inferring a replacement count

## REMOVED Requirements

### Requirement: Unwrap wrapped recipe files to Schema.org Recipe on startup

**Reason**: All retained household recipe directories (`./data/recipes/*/recipe.json`), active backups, and demo baselines have been unwrapped in place to top-level `https://schema.org/Recipe` JSON by `restore-schema-org-recipe-standard-and-retire-publications`, making startup wrapper scanning and `.publications` cleanup obsolete.
**Migration**: Deploy and run `restore-schema-org-recipe-standard-and-retire-publications` at least once against every retained recipe directory and refresh backups/demo snapshots so all `{id}/recipe.json` files are already top-level `https://schema.org/Recipe` before applying this change.
