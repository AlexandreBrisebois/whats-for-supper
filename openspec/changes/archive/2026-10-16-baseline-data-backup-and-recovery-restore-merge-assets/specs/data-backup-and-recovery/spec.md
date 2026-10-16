# Spec Delta

## Purpose

Describe existing application data export, reconstruction and operational recovery with explicit partial-failure and asynchronous boundaries.

## ADDED Requirements

### Requirement: Merge members by exported identity

Restore SHALL add member IDs absent from the database and update existing members’ name, browse view mode and preferred language from family-members.json. It SHALL create placeholder members for missing AddedBy identities referenced by successfully loaded recipes.

#### Scenario: Existing member
- **WHEN** a readable member file contains an existing database member ID
- **THEN** restore updates its represented preferences and name

#### Scenario: Missing attribution member
- **WHEN** a successfully loaded recipe refers to an absent member ID
- **THEN** restore creates that ID with a Recovered Member name prefix

### Requirement: Reconstruct recipes from retained metadata and content

Restore SHALL scan retained recipe IDs and skip IDs with neither recipe.info nor recipe.json. Valid recipe.info SHALL provide the primary recipe metadata; recipe.json SHALL provide raw metadata and supported content fallback fields.

#### Scenario: Metadata and content
- **WHEN** valid recipe.info and recipe.json exist for a recipe ID
- **THEN** restore uses info metadata and reads supported ingredient content from recipe.json

#### Scenario: No metadata files
- **WHEN** a recipe directory has neither metadata file
- **THEN** restore skips that recipe ID

### Requirement: Merge recipes without replacing unrelated stored state

Restore SHALL add absent recipe IDs or update the supported metadata/content fields of existing IDs, including IDs hidden by soft deletion. Existing deletion markers, attribution and creation time SHALL remain unchanged during that update.

#### Scenario: Existing recipe
- **WHEN** a loaded recipe ID already exists with different notes and name
- **THEN** restore updates notes and name without adding another recipe

#### Scenario: Soft-deleted existing recipe
- **WHEN** a loaded recipe ID is soft-deleted in the database
- **THEN** restore updates its supported fields while retaining its deletion marker

#### Scenario: Database-only recipe
- **WHEN** a database recipe has no loaded disk record
- **THEN** restore leaves that row in place

### Requirement: Read supported legacy recipe content

Restore SHALL accept ingredient arrays from recipeIngredient or ingredients, and JSON-array strings from ingredients. It SHALL remove the named retired health, dietary and balance fields from loaded recipe JSON and normalize undefined recipe.info ratings to Unknown.

#### Scenario: Legacy ingredient array
- **WHEN** recipe.json contains an ingredients array without recipeIngredient
- **THEN** restore stores the array as ingredient JSON

#### Scenario: Serialized ingredient array
- **WHEN** recipe.json contains ingredients as a string holding a JSON array
- **THEN** restore stores that array string

#### Scenario: Retired content
- **WHEN** recipe JSON includes a named retired dietaryProfile or balanceSummary field
- **THEN** restore excludes that field from loaded raw metadata

### Requirement: Retain unfinished PDF readiness on reconstruction

When source.pdf is retained and recipe.info is read, restore SHALL treat the recipe as pending unless its info explicitly records isReady true. Retained source and page files SHALL remain in the recipe store during metadata reconstruction.

#### Scenario: Named unfinished PDF
- **WHEN** retained source.pdf accompanies valid named info with isReady false
- **THEN** restore keeps database readiness false

#### Scenario: Unnamed pending PDF
- **WHEN** retained source.pdf accompanies matching info without a name and without isReady true
- **THEN** restore permits pending metadata reconstruction

#### Scenario: Ready PDF
- **WHEN** retained source.pdf accompanies valid info with isReady true
- **THEN** restore reconstructs ready metadata without replacing the retained PDF bytes

### Requirement: Count malformed recipe loads without stopping later loads

A recipe-load exception SHALL increment the restore Errors count and skip that record while scanning can continue. A recipe.info ID mismatch or missing name without pending PDF eligibility SHALL be treated as a recipe-load error.

#### Scenario: Invalid current metadata
- **WHEN** recipe.info has no required name and no pending source PDF
- **THEN** restore records a load error and does not queue that record

#### Scenario: Later valid recipe
- **WHEN** an invalid recipe is followed by a valid readable recipe
- **THEN** the later recipe remains eligible for reconstruction

### Requirement: Merge planning files and initialize missing event weeks

Restore SHALL upsert readable weekly plans and calendar events by ID, retain recipe-free events, and skip recipe-linked events whose recipe is unavailable. For calendar weeks lacking a weekly plan, it SHALL create a Locked plan for that week’s Monday.

#### Scenario: Grocery plan state
- **WHEN** a readable weekly plan contains groceryState and groceryItems
- **THEN** restore preserves those represented values

#### Scenario: Recipe-free legacy event
- **WHEN** a readable calendar event has no recipeId and lacks non-cooking kind/label
- **THEN** restore retains its status and null legacy fields

#### Scenario: Missing linked recipe
- **WHEN** a calendar event refers to an unavailable recipe
- **THEN** restore skips the event

#### Scenario: Missing event week
- **WHEN** a restored event belongs to a week with no plan
- **THEN** restore initializes a Locked weekly plan for that Monday

### Requirement: Merge category rows and skip invalid rows

Restore SHALL skip an absent category CSV. For present files it SHALL upsert rows by normalized key when at least five fields, nonblank key/section, parseable confidence and timestamp are present; malformed rows SHALL be logged and skipped.

#### Scenario: Valid category update
- **WHEN** a valid CSV row names an existing key
- **THEN** restore updates section, confidence and source without duplicating the key

#### Scenario: Malformed row among valid rows
- **WHEN** a CSV contains a row with missing fields and a valid category row
- **THEN** restore skips the malformed row and upserts the valid row

#### Scenario: Absent CSV
- **WHEN** ingredient-categories.csv is absent
- **THEN** restore continues without category import

### Requirement: Backfill retained finished-dish references

After category recovery, restore SHALL update finished-dish indices from readable recipe.info entries with a nonnegative finishedDishImageIndex and return a backfill count. A backfill exception SHALL be logged and return zero for that phase.

#### Scenario: Nonnegative index
- **WHEN** readable info contains a nonnegative finished-dish index
- **THEN** restore applies that index to the matching stored recipe

#### Scenario: Backfill read failure
- **WHEN** a metadata read throws during finished-dish backfill
- **THEN** the phase returns zero after logging the failure
