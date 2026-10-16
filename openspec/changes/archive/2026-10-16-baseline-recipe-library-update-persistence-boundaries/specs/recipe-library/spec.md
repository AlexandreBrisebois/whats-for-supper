# Spec Delta

## ADDED Requirements

### Requirement: Mark search-derived recipe state pending with supported updates

When an authorized recipe PATCH supplies a non-null supported fact, the successful database save SHALL persist its recipe update and pending search/embedding states together. Existing derived state SHALL have its embedding fingerprint cleared; absent derived state SHALL be initialized pending. This SHALL NOT establish completed indexing.

#### Scenario: Invalidate existing derived recipe state
- **WHEN** an existing recipe with search-derived state receives a supported non-null PATCH and database save succeeds
- **THEN** the changed recipe is saved with search and embedding states pending and cleared embedding fingerprint

#### Scenario: Initialize absent derived recipe state
- **WHEN** a supported non-null PATCH succeeds for a recipe without search-derived state
- **THEN** pending derived state is created in the same database save as the recipe update

### Requirement: Attempt one index dispatch after saving a supported recipe update

After saving a PATCH with a supplied non-null supported fact, the service SHALL attempt one index-recipe-search dispatch containing recipe ID and source fingerprint. A dispatch exception SHALL be logged without undoing the saved recipe or preventing the subsequent recipe-info write. Worker execution SHALL remain owned by background-processing.

#### Scenario: Dispatch once for a multifield update
- **WHEN** a supported multifield PATCH has saved its recipe and pending derived state
- **THEN** one index-recipe-search request carries the recipe ID and source fingerprint before recipe-info completion

#### Scenario: Continue after index dispatch rejection
- **WHEN** index dispatch throws after a supported PATCH database save
- **THEN** the saved recipe remains and recipe-info writing is still attempted

### Requirement: Write the supported recipe-info projection after the database save

After a successful PATCH database save, the service SHALL write recipe-info with supplied non-null name, description, notes, rating and instruction values, retaining omitted values and creating info when absent. This projection SHALL NOT promise that ingredients, cuisine, meal types or discoverability are mirrored into that file.

#### Scenario: Persist supplied info projection fields
- **WHEN** a PATCH supplies supported info fields and subsequent file completion succeeds
- **THEN** recipe-info reflects the supplied name, description, notes, rating or instructions, retaining other info values

#### Scenario: Touch an update without supplied supported facts
- **WHEN** an authorized PATCH for an existing recipe supplies no non-null supported facts and completes
- **THEN** the recipe update timestamp is assigned and info writing occurs without requesting a search-index dispatch
