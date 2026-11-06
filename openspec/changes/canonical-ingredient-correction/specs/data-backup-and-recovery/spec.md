# Spec Delta

## MODIFIED Requirements

### Requirement: Select recipes with persisted export payload

For non-deleted recipes, export SHALL write metadata when a retained source PDF exists, or a nonempty name has images or synthesis, or canonical ingredient content, raw metadata, notes or a known rating provides payload. Otherwise it SHALL skip the recipe.

#### Scenario: Ready-shaped recipe
- **WHEN** a non-deleted recipe has a name and positive image count but no metadata, notes or known rating
- **THEN** export writes recipe.info

#### Scenario: Empty placeholder
- **WHEN** a recipe has no source PDF, name, images, synthesis, raw metadata, notes or known rating
- **THEN** export skips its metadata file

#### Scenario: Retained PDF
- **WHEN** a non-deleted unfinished recipe retains source.pdf
- **THEN** export includes its metadata regardless of the ordinary payload test

#### Scenario: Canonical content is the retained payload
- **WHEN** a non-deleted recipe has canonical ingredient facts but no other ordinary export payload
- **THEN** export includes that recipe rather than skipping its canonical content

### Requirement: Refresh metadata while retaining existing recipe content

For an included recipe, export SHALL refresh recipe.info and replace recipe.json with version-2 supported database content, including cleared values, canonical ingredient identities/revisions/evidence/protection, separate serving basis and retained normalized metadata. Retired health, dietary and balance fields SHALL remain omitted. Original, PDF/page and hero media SHALL remain untouched; recipe.info SHALL NOT become another current ingredient owner.

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

#### Scenario: Full canonical content round trip
- **WHEN** an exported canonical recipe is restored through the supported version-2 format
- **THEN** line identity/order, current descriptions, independently optional quantities/units, provenance, retained evidence and human protection remain equivalent
- **AND** explicit unknown basis or cleared current lines do not replay old values from metadata

### Requirement: Reconstruct recipes from retained metadata and content

Restore SHALL scan retained recipe IDs and skip IDs with neither recipe.info nor recipe.json. Valid recipe.info SHALL provide primary supported metadata; decoded recipe.json SHALL provide canonical ingredients, separate serving basis, retained normalized metadata and supported content fallbacks. Legacy inputs SHALL pass through canonical conversion rather than become independent current ingredient writers.

#### Scenario: Metadata and content
- **WHEN** valid recipe.info and recipe.json exist for a recipe ID
- **THEN** restore uses info metadata and reads supported ingredient content from recipe.json

#### Scenario: No metadata files
- **WHEN** a recipe directory has neither metadata file
- **THEN** restore skips that recipe ID

### Requirement: Merge recipes without replacing unrelated stored state

Restore SHALL add absent recipe IDs or update supported metadata/content of existing IDs, including soft-deleted IDs. Ingredient replacement SHALL require the supported format and revision/provenance reconciliation; an older representation SHALL NOT erase richer current canonical facts merely by omitting them. Existing deletion markers, attribution and creation time SHALL remain unchanged during that update.

#### Scenario: Existing recipe
- **WHEN** a loaded recipe ID already exists with different notes and name
- **THEN** restore updates notes and name without adding another recipe

#### Scenario: Soft-deleted existing recipe
- **WHEN** a loaded recipe ID is soft-deleted in the database
- **THEN** restore updates its supported fields while retaining its deletion marker

#### Scenario: Database-only recipe
- **WHEN** a database recipe has no loaded disk record
- **THEN** restore leaves that row in place

#### Scenario: Older content targets a richer current recipe
- **WHEN** a legacy export lacks canonical identities, structured facts or protection already held by the destination recipe
- **THEN** merge preserves those current facts and reports the ingredient conflict or review outcome instead of silently replacing them with text-only content

#### Scenario: Recipe changes during merge reconciliation
- **WHEN** a destination ingredient revision changes after restore inspected it but before ingredient publication
- **THEN** that stale ingredient replacement is deferred or reported without overwriting the newer revision

### Requirement: Read supported legacy recipe content

Restore SHALL continue accepting recipeIngredient or ingredients arrays, serialized JSON-array strings and supported legacy object entries. Canonical conversion SHALL retain exact current text/order and only demonstrably bound original numeric facts, preserving uncertainty and unknown authorship. Retired health/dietary/balance removal and undefined-rating normalization SHALL remain unchanged.

#### Scenario: Legacy ingredient array
- **WHEN** recipe.json contains an ingredients array without recipeIngredient
- **THEN** restore stores the array as ingredient JSON

#### Scenario: Serialized ingredient array
- **WHEN** recipe.json contains ingredients as a string holding a JSON array
- **THEN** restore stores that array string

#### Scenario: Retired content
- **WHEN** recipe JSON includes a named retired dietaryProfile or balanceSummary field
- **THEN** restore excludes that field from loaded raw metadata

#### Scenario: Legacy numeric facts without a serving basis
- **WHEN** legacy content has demonstrably associated original amounts but no trustworthy serving basis
- **THEN** conversion retains those amounts with unknown basis rather than copying quantities from a scaled projection

#### Scenario: Supported object ingredient entries
- **WHEN** a supported legacy ingredient array contains object entries
- **THEN** its existing compatible text representation remains available without inventing a numeric association

### Requirement: Distinguish current recipe envelopes from legacy content

New full-fidelity recipe exports SHALL identify content format version 2. Merge restore and disk sync SHALL decode supported versions 1 and 2 separately from retained metadata, preserving explicit nulls. Unsupported or malformed versions SHALL be recipe-load errors. Unversioned legacy inputs SHALL retain their supported interpretation through canonical conversion; version 1 SHALL NOT claim absent canonical facts.

#### Scenario: Current recipe envelope
- **WHEN** version 1 contains a string or null rawMetadata
- **THEN** restore uses that value as the recipe's raw content

#### Scenario: Disk sync after export
- **WHEN** the existing disk-sync workflow reads a supported version-1 or newly exported version-2 recipe envelope
- **THEN** it preserves raw recipe instructions and the current serialized ingredients instead of treating the envelope as raw content

#### Scenario: Unsupported content version
- **WHEN** a recipe envelope declares an unsupported version
- **THEN** merge restore counts that recipe as a load error instead of interpreting its envelope as raw content

#### Scenario: Version-2 canonical envelope
- **WHEN** supported version-2 content contains canonical facts and retained normalized metadata
- **THEN** restore or disk sync preserves them separately rather than nesting the envelope in metadata or trusting a stale legacy array over canonical content

#### Scenario: Malformed canonical envelope
- **WHEN** a version-2 record has invalid canonical identities, descriptions, quantities or conflicting authoritative content
- **THEN** that recipe is reported as a load error without partially publishing its ingredients

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
- **AND** ordinary merge missing-history preservation remains unchanged; demo baseline compatibility and missing-history behavior follow the demo-household capability

#### Scenario: Exact snapshot includes canonical ownership
- **WHEN** a compatible exact snapshot is captured after canonical write cutover
- **THEN** it includes authoritative canonical lines, revisions, evidence/protection, serving basis and required durable conversion/refresh state with matching media
- **AND** restore preserves human facts and does not silently substitute legacy-only rows

#### Scenario: Old snapshot has an incompatible canonical schema
- **WHEN** an exact snapshot predates required canonical storage and fails schema or membership preflight
- **THEN** exact restore rejects it before live publication rather than treating missing facts as empty or running implicit conversion

### Requirement: Preserve recipe servings without extending recipe info

Recipe exports SHALL preserve the database serving count, including null, in their recipe.json envelope and retain raw recipeYield metadata. Export SHALL NOT add either field to recipe.info. Current-format disk sync and merge restore SHALL honor an explicitly exported count or null; legacy content without that field SHALL derive its count from unambiguous raw serving-yield metadata.

#### Scenario: Current export and restore
- **WHEN** a recipe with database servings 4 and raw recipeYield “4 portions” is exported and successfully restored or synchronized from that export
- **THEN** the database has servings 4, raw yield and ingredients remain retained, and recipe.info has no added yield/count field

#### Scenario: Manually corrected count
- **WHEN** a recipe corrected through editing to servings 3 still has raw recipeYield “4 portions” and is exported, merge-restored or synchronized from that export
- **THEN** its authoritative count remains 3, raw yield and ingredient quantities remain unchanged, and recipe.info gains no yield/count field

#### Scenario: Explicit unknown count
- **WHEN** a current recipe export explicitly has servings null despite retaining older yield text
- **THEN** restore and disk sync retain null rather than treating it as a legacy missing field

#### Scenario: Legacy exported envelope
- **WHEN** an older recipe.json envelope lacks servings but its rawMetadata string contains recipeYield “2 portions”
- **THEN** restore and disk sync derive database servings 2 from the decoded raw metadata, without treating the outer envelope as source recipe content

#### Scenario: Legacy direct recipe content
- **WHEN** a legacy recipe.json directly contains recipeYield “4 portions” without an export envelope
- **THEN** restore and disk sync derive database servings 4 without changing the printed ingredient quantities

#### Scenario: Invalid exported count
- **WHEN** a present exported servings field is negative, zero, fractional, out of integer range, or of the wrong JSON type
- **THEN** that record is reported as invalid through existing recipe-load failure handling rather than silently inferring a replacement count

#### Scenario: Canonical version-2 count preservation
- **WHEN** canonical content with an explicitly null or manually corrected basis is exported and restored or synchronized
- **THEN** the explicit basis remains authoritative independently of retained raw yield and preserved original ingredient amounts
- **AND** no new duplicate current ingredient or basis writer is added to recipe.info
