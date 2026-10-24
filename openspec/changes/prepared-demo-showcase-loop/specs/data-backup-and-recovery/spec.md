# Data backup and recovery delta

## MODIFIED Requirements

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
