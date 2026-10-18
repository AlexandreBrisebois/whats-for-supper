## MODIFIED Requirements

### Requirement: Append missing member identities to the member export

Application export SHALL replace family-members.json with current members and their current supported preferences, including an empty array when there are no members. The separate disaster-recovery attribution-repair helper SHALL retain its append-only behavior.

#### Scenario: New member identity
- **WHEN** the database contains a member ID absent from the previous member file
- **THEN** export includes that current member

#### Scenario: Repeated identity
- **WHEN** a current member changes name or preferences
- **THEN** export replaces the old values with the current values

#### Scenario: Removed member
- **WHEN** a previously exported member no longer exists
- **THEN** the next export omits that identity, including writing an empty array after the last member is removed

### Requirement: Refresh metadata while retaining existing recipe content

For an included recipe, export SHALL refresh recipe.info and replace recipe.json from current supported database content, including cleared content, omitting retired health, dietary and balance fields. Actual original, PDF/page and hero media SHALL remain untouched.

#### Scenario: Existing recipe content
- **WHEN** an included recipe already has recipe.json
- **THEN** export replaces stale content with current database content

#### Scenario: New recipe content
- **WHEN** recipe.json is absent and ingredients are present
- **THEN** export creates serialized recipe content

#### Scenario: Metadata refresh
- **WHEN** an included recipe has changed notes or rating
- **THEN** export updates those fields in recipe.info

#### Scenario: Cleared content
- **WHEN** an included recipe has cleared ingredients or raw metadata since its previous export
- **THEN** the new file represents the cleared values and cannot replay the old values

#### Scenario: Repeated current-content round trip
- **WHEN** a current recipe export is restored and exported repeatedly
- **THEN** supported raw recipe content remains unchanged instead of nesting the export envelope into raw metadata


### Requirement: Write nonempty plan and calendar exports

Export SHALL replace weekly-plans.json and calendar-events.json with current projections including explicit empty arrays, preserving represented grocery state and recipe-free calendar fields.

#### Scenario: Nonempty planning state
- **WHEN** weekly plans and recipe-free calendar events exist
- **THEN** export writes their JSON projections including grocery and non-cooking fields

#### Scenario: Cleared planning state
- **WHEN** a table is empty after a previous nonempty export
- **THEN** its export becomes an empty array

### Requirement: Replace the ingredient category export

Export SHALL overwrite ingredient-categories.csv with the header normalized_key,grocery_section,confidence,source,created_at and one row per category. Fields containing commas, quotes or line breaks SHALL be quoted with doubled internal quotes. Numeric values SHALL use invariant culture.

#### Scenario: Empty categories
- **WHEN** there are no ingredient categories
- **THEN** export replaces the artifact with a header-only file

#### Scenario: Comma in category key
- **WHEN** a category key contains a comma
- **THEN** its CSV field is quoted

#### Scenario: Repeated export
- **WHEN** a previous category export exists
- **THEN** the next export replaces its rows rather than appending

#### Scenario: Decimal-comma culture
- **WHEN** export runs under a culture using decimal commas
- **THEN** confidence is still serialized using a decimal point

### Requirement: Merge category rows and skip invalid rows

Restore SHALL skip an absent category CSV. For present files it SHALL parse logical CSV records including quoted multiline fields and upsert rows by normalized key when at least five fields, nonblank key/section, parseable confidence and timestamp are present; malformed rows SHALL be logged and skipped.

#### Scenario: Valid category update
- **WHEN** a valid CSV row names an existing key
- **THEN** restore updates section, confidence and source without duplicating the key

#### Scenario: Malformed row among valid rows
- **WHEN** a CSV contains a row with missing fields and a valid category row
- **THEN** restore skips the malformed row and upserts the valid row

#### Scenario: Absent CSV
- **WHEN** ingredient-categories.csv is absent
- **THEN** restore continues without category import

#### Scenario: Multiline field
- **WHEN** an exported category has embedded newlines, commas and quotes
- **THEN** merge restore reconstructs the field without splitting it into separate records

## ADDED Requirements

### Requirement: Distinguish current recipe envelopes from legacy content

Current recipe exports SHALL identify content format version 1. Merge restore SHALL decode its raw metadata separately from the envelope and reject unsupported content versions as recipe-load errors. Unversioned legacy representations SHALL retain their existing interpretation.

#### Scenario: Current recipe envelope
- **WHEN** version 1 contains a string or null rawMetadata
- **THEN** restore uses that value as the recipe's raw content

#### Scenario: Disk sync after export
- **WHEN** the existing disk-sync workflow reads a freshly exported version-1 recipe envelope
- **THEN** it preserves raw recipe instructions and the current serialized ingredients instead of treating the envelope as raw content

#### Scenario: Unsupported content version
- **WHEN** a recipe envelope declares an unsupported version
- **THEN** merge restore counts that recipe as a load error instead of interpreting its envelope as raw content



### Requirement: Online independent exact recovery
The system SHALL provide explicit exact snapshot and restore operations distinct from merge/import, with operator-configured independent storage outside live roots. Snapshot version 1 SHALL contain authoritative supported row membership, explicit empty collections, complete version-1 history and verified media bytes. Soft-deleted recipes SHALL retain history dependencies; permanently purged recipes and history SHALL be absent.

#### Scenario: Concurrent online snapshot
- **WHEN** an authenticated operator captures a snapshot while requests and workers operate
- **THEN** cooperating writes drain and coordinate for a bounded interval, reads remain available, and the published independent set contains mutually consistent database facts and media
- **AND** timeout or missing media fails capture without replacing a prior complete snapshot

#### Scenario: Online exact restore with preflight
- **WHEN** an operator selects a complete snapshot
- **THEN** all format, schema, membership, relationships and media integrity are validated in staging before any live change
- **AND** exact publication replaces supported destination facts, invalidates stale rounds/continuations/work and rebuilds derived state
- **AND** health and recovery status remain available while final publication briefly coordinates household requests

#### Scenario: Interrupted cross-store publication
- **WHEN** interruption occurs around file-generation activation or database commit
- **THEN** recovery selects the complete committed state or restores the complete prior state before household operations resume
- **AND** retry neither duplicates facts/history nor reports an incomplete restore as successful

#### Scenario: Legacy omission is not exact emptiness
- **WHEN** exact restore receives an unsupported version or missing required artifact including history
- **THEN** preflight rejects it without changing live state
- **AND** ordinary merge missing-history preservation and demo missing-history clearing remain unchanged
