## MODIFIED Requirements

### Requirement: Toggle the loaded recipe in the GOTO list

Recipe detail SHALL show a star and visible GOTO label in both states, pressed when configured and unpressed otherwise. Ochre state treatments SHALL keep the label and meaningful indicators readable. Activation SHALL remove the matching item or append its identity, name, image and represented readiness, save the replacement list, disable while pending, and show an error toast only on failure.

#### Scenario: Add loaded recipe

- **WHEN** a person activates Set as GOTO for an absent loaded recipe and saving resolves
- **THEN** the list contains its identity and the inline GOTO control updates to pressed state without showing a redundant confirmation toast

#### Scenario: Remove or fail

- **WHEN** a person toggles an existing GOTO or its save rejects
- **THEN** successful saving clears the pressed GOTO state without showing a confirmation toast; rejection reports Could not update GOTO and releases the pending action

#### Scenario: Recognize GOTO before selecting

- **WHEN** a loaded recipe is not configured as GOTO
- **THEN** its action has a visible GOTO label beside the star and an accessible add name, with unpressed state

#### Scenario: Selected and pending state

- **WHEN** the recipe is configured or a membership save is pending
- **THEN** the visible GOTO label remains, selected state includes a filled star and pressed semantics, and pending disablement and error toast feedback remain
