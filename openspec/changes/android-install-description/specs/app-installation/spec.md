# Spec Delta

## ADDED Requirements

### Requirement: Publish consistent app-controlled description

The manifest and initial document description SHALL be exactly `Swipe, Match, Cook.` across stable/beta and production/demo variants, independently of PDF sharing configuration. This description change SHALL preserve names, IDs, origin, manifest URL, start URL, icons and launch behavior. These declarations SHALL NOT certify Android installed-app details or existing-install refresh.

#### Scenario: Read public description metadata
- **WHEN** a visitor reads the public manifest and initial Welcome HTML for any identity variant
- **THEN** both descriptions are exactly `Swipe, Match, Cook.`
- **AND** existing installation identity and presentation fields remain unchanged

#### Scenario: Existing installation retains browser-owned metadata
- **WHEN** app-controlled description metadata changes while an installation already exists
- **THEN** the application does not replace installation identity to force a refresh
- **AND** a successful manifest or HTML response alone does not establish that Android displays the new description
