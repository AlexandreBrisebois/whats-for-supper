# Spec Delta

## ADDED Requirements

### Requirement: Unwrap wrapped recipe files to Schema.org Recipe on startup

Startup migration SHALL upgrade unmigrated database recipes offline without AI calls or re-imports, unwrap any existing `backupContentVersion` 1 or `wfs-recipe` version 2 `{id}/recipe.json` file in the active recipe store into a top-level `https://schema.org/Recipe` JSON document in place (even when database rows are already upgraded), preserve `recipeYield`, `recipeIngredient`, `recipeInstructions`, `supply`, and `nutrition`, and remove `.publications` directories.

#### Scenario: Upgrade v0.1.40 recipes and unwrap backupContentVersion 1 files without re-importing

- **WHEN** an installation upgrades from `v0.1.40` (with unstructured database rows and `backupContentVersion: 1` `recipe.json` files wrapping Schema.org `rawMetadata`)
- **THEN** startup derives structured portion lines, servings, step bindings, and bilingual food mappings offline without calling AI or re-importing recipes, atomically replaces each `recipe.json` with top-level `https://schema.org/Recipe` JSON preserving `supply` and `nutrition`, and leaves all original and hero media untouched

#### Scenario: Unwrap wfs-recipe version 2 files and remove .publications residue

- **WHEN** startup migration inspects an active recipe folder containing a `format: "wfs-recipe"` version 2 `recipe.json` or a `.publications` subdirectory (including when database structured content is already at version 2)
- **THEN** it atomically replaces `recipe.json` with top-level `https://schema.org/Recipe` JSON reflecting current structured lines, steps, and `recipeYield`, and deletes the `.publications` subdirectory

#### Scenario: Idempotent startup on pure Schema.org Recipe files

- **WHEN** all active `{id}/recipe.json` files are already top-level `https://schema.org/Recipe` documents without `.publications` directories and structured database content is up to date
- **THEN** startup completes without rewriting `recipe.json` files

## MODIFIED Requirements

### Requirement: Refresh metadata while retaining existing recipe content

For an included recipe, export SHALL refresh `recipe.info` and write `recipe.json` as a top-level `https://schema.org/Recipe` JSON document (`@context: "https://schema.org/"`, `@type: "Recipe"`) from current supported database content, including cleared content, omitting retired health, dietary and balance fields. Actual original, PDF/page and hero media SHALL remain untouched.

#### Scenario: Existing recipe content

- **WHEN** an included recipe already has `recipe.json`
- **THEN** export replaces stale content with a current `https://schema.org/Recipe` document

#### Scenario: New recipe content

- **WHEN** `recipe.json` is absent and ingredients are present
- **THEN** export creates a serialized `https://schema.org/Recipe` document

#### Scenario: Metadata refresh

- **WHEN** an included recipe has changed notes or rating
- **THEN** export updates those fields in `recipe.info`

#### Scenario: Cleared content

- **WHEN** an included recipe has cleared ingredients or raw metadata since its previous export
- **THEN** the new `https://schema.org/Recipe` file represents the cleared values and cannot replay the old values

#### Scenario: Repeated current-content round trip

- **WHEN** a `https://schema.org/Recipe` export is restored and exported repeatedly
- **THEN** supported recipe content remains unchanged as top-level `https://schema.org/Recipe` JSON without wrapping or nesting envelopes

### Requirement: Merge recipes without replacing unrelated stored state

Restore SHALL add absent recipe IDs or update the supported metadata and content fields of existing IDs (including already-structured recipes and IDs hidden by soft deletion), deriving current structured portion facts from restored `https://schema.org/Recipe` or transitional wrapper content so restored recipes are immediately usable without re-importing. Existing deletion markers, attribution and creation time SHALL remain unchanged during that update.

#### Scenario: Existing recipe

- **WHEN** a loaded recipe ID already exists in the database (including with structured portion content) with different notes, name, or recipe content
- **THEN** restore updates notes, name, metadata, and derived structured portion content without adding another recipe or rejecting the update as a conflict

#### Scenario: Soft-deleted existing recipe

- **WHEN** a loaded recipe ID is soft-deleted in the database
- **THEN** restore updates its supported fields and derived structured content while retaining its deletion marker

#### Scenario: Database-only recipe

- **WHEN** a database recipe has no loaded disk record
- **THEN** restore leaves that row in place

### Requirement: Distinguish current recipe envelopes from legacy content

Current recipe exports SHALL write top-level `https://schema.org/Recipe` JSON without custom wrapper envelopes. During the transitional unwrap period, merge restore and disk readers SHALL accept top-level `https://schema.org/Recipe` documents directly and SHALL also decode transitional `backupContentVersion` 1 and `wfs-recipe` version 2 envelopes separately from raw recipe content, while rejecting unknown wrapper versions as recipe-load errors.

#### Scenario: Current recipe envelope

- **WHEN** `recipe.json` is a current top-level `https://schema.org/Recipe` JSON object, or a pre-unwrap transitional `backupContentVersion` 1 or `wfs-recipe` version 2 envelope
- **THEN** restore reads the `https://schema.org/Recipe` content directly or decodes the inner transitional recipe facts without treating a wrapper envelope as raw `https://schema.org/Recipe` content

#### Scenario: Disk sync after export

- **WHEN** the disk-sync workflow reads a freshly exported top-level `https://schema.org/Recipe` file (or a pre-unwrap transitional version-1 or version-2 recipe envelope)
- **THEN** it preserves `recipeInstructions`, `recipeIngredient`, and `recipeYield` and derives structured portion facts instead of treating any wrapper envelope as raw content

#### Scenario: Unsupported content version

- **WHEN** a recipe envelope declares an unsupported `backupContentVersion` or `wfs-recipe` version
- **THEN** merge restore counts that recipe as a load error instead of interpreting its envelope as raw content

### Requirement: Preserve recipe servings without extending recipe info

Recipe exports SHALL preserve the database serving count in `https://schema.org/Recipe` `recipeYield` (such as `"4 portions"` when database `servings` is 4, retaining matching raw `recipeYield` phrasing when unedited, or setting `recipeYield` to null when `servings` is null) without adding serving fields to `recipe.info`. Disk sync and merge restore SHALL derive `servings` from `recipeYield` on `https://schema.org/Recipe` files and continue honoring explicit `servings` fields on transitional `backupContentVersion` 1 and `wfs-recipe` version 2 envelopes until wrapper retirement.

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

- **WHEN** a pre-unwrap `backupContentVersion` 1 or `wfs-recipe` version 2 `recipe.json` supplies explicit `servings` (or null) or omits `servings` while `rawMetadata` contains `recipeYield` `"2 portions"`
- **THEN** transitional restore honors the explicit count or derives `servings` 2 from `rawMetadata` without treating the outer envelope as `https://schema.org/Recipe`

#### Scenario: Legacy direct recipe content

- **WHEN** `recipe.json` directly contains `https://schema.org/Recipe` JSON with `recipeYield` `"4 portions"` without an export envelope
- **THEN** restore and disk sync derive database `servings` 4 without changing printed ingredient quantities

#### Scenario: Invalid exported count

- **WHEN** a transitional envelope supplies a negative, zero, fractional, out-of-range, or non-integer `servings` field
- **THEN** that record is reported as invalid through existing recipe-load failure handling rather than silently inferring a replacement count
