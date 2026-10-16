# Spec Delta

## Purpose

Describe existing application data export, reconstruction and operational recovery with explicit partial-failure and asynchronous boundaries.

## ADDED Requirements

### Requirement: Append missing member identities to the member export

Application export SHALL merge current members into family-members.json by member ID, append IDs absent from the file, and write the merged JSON only when members were added.

#### Scenario: New member identity
- **WHEN** the database contains a member ID absent from the readable member file
- **THEN** export appends that member and retains existing file entries

#### Scenario: Repeated identity
- **WHEN** a current member ID already exists in the member file
- **THEN** export leaves that file entry unchanged

### Requirement: Select recipes with persisted export payload

For non-deleted recipes, export SHALL write metadata when a retained source PDF exists, or a nonempty name has images or synthesis, or raw metadata, notes or a known rating provides payload. Otherwise it SHALL skip the recipe.

#### Scenario: Ready-shaped recipe
- **WHEN** a non-deleted recipe has a name and positive image count but no metadata, notes or known rating
- **THEN** export writes recipe.info

#### Scenario: Empty placeholder
- **WHEN** a recipe has no source PDF, name, images, synthesis, raw metadata, notes or known rating
- **THEN** export skips its metadata file

#### Scenario: Retained PDF
- **WHEN** a non-deleted unfinished recipe retains source.pdf
- **THEN** export includes its metadata regardless of the ordinary payload test

### Requirement: Refresh metadata while retaining existing recipe content

For an included recipe, export SHALL create recipe.info if absent or refresh its supported mutable fields if present. It SHALL create recipe.json only when missing and raw metadata or ingredients are nonempty, omitting retired health, dietary and balance fields from newly serialized recipe content.

#### Scenario: Existing recipe content
- **WHEN** an included recipe already has recipe.json
- **THEN** export retains those file bytes

#### Scenario: New recipe content
- **WHEN** recipe.json is absent and ingredients are present
- **THEN** export creates serialized recipe content

#### Scenario: Metadata refresh
- **WHEN** an included recipe has changed notes or rating
- **THEN** export updates those fields in recipe.info

### Requirement: Write nonempty plan and calendar exports

Export SHALL serialize nonempty weekly plans and calendar events to weekly-plans.json and calendar-events.json under the data root, preserving represented grocery state and recipe-free calendar fields.

#### Scenario: Nonempty planning state
- **WHEN** weekly plans and recipe-free calendar events exist
- **THEN** export writes their JSON projections including grocery and non-cooking fields

### Requirement: Replace the ingredient category export

Export SHALL overwrite ingredient-categories.csv with the header normalized_key,grocery_section,confidence,source,created_at and one row per category. Fields containing commas, quotes or line breaks SHALL be quoted with doubled internal quotes.

#### Scenario: Empty categories
- **WHEN** there are no ingredient categories
- **THEN** export replaces the artifact with a header-only file

#### Scenario: Comma in category key
- **WHEN** a category key contains a comma
- **THEN** its CSV field is quoted

#### Scenario: Repeated export
- **WHEN** a previous category export exists
- **THEN** the next export replaces its rows rather than appending
