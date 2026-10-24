# Spec Delta

## ADDED Requirements

### Requirement: Export complete grocery-extra history

Application export SHALL replace `grocery-extras.json` with every retained extra occurrence and its stable identity, lineage, absolute week, snapshotted name, section, checked state, removal state, version, and timestamps. An empty source SHALL replace any older artifact with an explicit empty array.

#### Scenario: Extra history exists
- **WHEN** extras span several weekly snapshots with different names, categories, and checked states
- **THEN** export writes each retained occurrence and its lineage without collapsing rows by name

#### Scenario: Extras were cleared
- **WHEN** no retained extra occurrences remain after a previous nonempty export
- **THEN** the next export writes an empty grocery-extras collection

### Requirement: Merge grocery-extra history by stable occurrence identity

Ordinary restore SHALL accept a supported `grocery-extras.json` artifact and upsert occurrences by stable identity while preserving represented lineage and weekly snapshot state. It SHALL reject invalid lineage, week, section, or version records without creating partial phantom history.

#### Scenario: Restore existing and missing occurrences
- **WHEN** a valid artifact contains one existing occurrence and one absent occurrence
- **THEN** restore updates the represented fields of the existing identity and adds the absent identity without name-based merging

#### Scenario: Invalid lineage reference
- **WHEN** an occurrence references an invalid or inconsistent lineage predecessor
- **THEN** that invalid history is reported and is not partially applied as a new outstanding extra

#### Scenario: Repeat restore
- **WHEN** the same valid artifact is restored twice
- **THEN** occurrence membership and lineage remain identical rather than duplicating weekly snapshots

### Requirement: Tolerate absent legacy grocery-extra artifacts

Ordinary merge restore SHALL treat an absent `grocery-extras.json` as a legacy export and preserve existing destination extras. An unreadable or unsupported present artifact SHALL be reported and skipped without treating it as an explicit empty collection.

#### Scenario: Legacy export omits extras
- **WHEN** an ordinary restore has no grocery-extras artifact
- **THEN** existing destination extra history remains unchanged

#### Scenario: Explicit empty artifact
- **WHEN** a supported grocery-extras artifact contains an explicit empty collection
- **THEN** ordinary merge adds or updates no occurrences and does not infer deletion of destination-only history

#### Scenario: Unreadable artifact
- **WHEN** the grocery-extras artifact cannot be parsed or has an unsupported version
- **THEN** restore reports the artifact failure without replacing destination extras

### Requirement: Include grocery extras in independent exact recovery

Independent exact snapshot and restore SHALL treat grocery-extra occurrence membership and relationships as authoritative supported database facts. Exact preflight SHALL require and validate that table for the snapshot version before live publication.

#### Scenario: Exact snapshot contains extras
- **WHEN** an online exact snapshot is captured with extra history present
- **THEN** its manifest and table artifacts include every committed grocery-extra occurrence under the same consistent database boundary

#### Scenario: Exact restore replaces extras
- **WHEN** a complete exact snapshot passes preflight and publication succeeds
- **THEN** destination extra membership and weekly history exactly match the snapshot

#### Scenario: Exact snapshot omits required extra membership
- **WHEN** an exact snapshot version requiring grocery extras lacks that table artifact or has invalid lineage
- **THEN** preflight rejects it without changing live state
