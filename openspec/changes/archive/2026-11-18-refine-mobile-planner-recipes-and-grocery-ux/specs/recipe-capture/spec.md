## MODIFIED Requirements

### Requirement: Request discard of the newly captured duplicate from inline completion

Discard duplicate SHALL request deletion of the newly captured pending identity using the existing recipe-library deletion operation. While the request is pending, repeated discard activation SHALL be disabled. On success the client SHALL navigate directly to the root entry without a redundant discard toast. A rejected request SHALL release the control without success feedback or navigation.

#### Scenario: Discard request succeeds
- **WHEN** the person activates Discard duplicate and the deletion operation succeeds
- **THEN** the request targets the newly captured identity rather than the matching existing recipe
- **AND** the client navigates directly to `/` without displaying a `Duplicate recipe discarded.` toast

#### Scenario: Discard request rejects
- **WHEN** the deletion operation rejects the discard request
- **THEN** the control becomes available again and the client does not show success feedback or navigate away
