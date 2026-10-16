# Spec Delta

## ADDED Requirements

### Requirement: Offer failure reference copy controls when identifiers are returned

When the issue form receives both re-import failure guidance and a failed import ID, it SHALL offer Copy import ID and, when supplied, Copy recipe ID. Without both guidance and failed import ID it SHALL omit these controls. The controls SHALL use returned identifiers, without inferring that the attempt repaired the recipe or resolved its report.

#### Scenario: Both references are available
- **WHEN** the mounted issue form receives failure guidance, a failed import ID and a recipe ID
- **THEN** Copy import ID and Copy recipe ID are available

#### Scenario: Only the failed import reference is available
- **WHEN** the form receives failure guidance and failed import ID without a recipe ID
- **THEN** Copy import ID is available and Copy recipe ID is absent

#### Scenario: Failure guidance or import reference is absent
- **WHEN** the form lacks either failure guidance or a failed import ID
- **THEN** neither reference-copy control is shown

### Requirement: Acknowledge successful failure reference copying

Activating a failure reference control SHALL request clipboard writing of its corresponding identifier. After that request succeeds while the form remains mounted, the selected control SHALL display Copied and schedule its acknowledgement to clear after 1500 milliseconds. This SHALL NOT save feedback, resolve a report or retry an import.

#### Scenario: Copy a recipe reference successfully
- **WHEN** Copy recipe ID is activated and its clipboard write succeeds
- **THEN** the supplied recipe ID has been passed to clipboard writing and that control displays Copied with timed reset scheduled

#### Scenario: Copy an import reference successfully
- **WHEN** Copy import ID is activated and its clipboard write succeeds
- **THEN** the supplied failed import ID has been passed to clipboard writing and that control displays Copied with timed reset scheduled
