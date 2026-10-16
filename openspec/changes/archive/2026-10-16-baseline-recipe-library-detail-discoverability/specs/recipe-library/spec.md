# Recipe-library detail discoverability delta

## ADDED Requirements

### Requirement: Initialize the loaded-detail discoverability control

After successful library detail loading in viewing mode, the sheet SHALL offer a discoverability button initialized from the returned flag, using false for null or absence. In English it SHALL show “Ask the Family” and “Shows in Discovery voting”, with on/off visual state and an action label to turn the current state off or on.

#### Scenario: Load discoverability enabled
- **WHEN** library detail loads with isDiscoverable true
- **THEN** the button shows its on state and has the English action label “Turn off Discovery for this recipe”

#### Scenario: Load discoverability disabled
- **WHEN** library detail loads with isDiscoverable false
- **THEN** the button shows its off state and has the English action label “Turn on Discovery for this recipe”

#### Scenario: Load an absent discoverability value
- **WHEN** library detail loads with isDiscoverable absent or null
- **THEN** the button initializes off with the turn-on action and the same Ask the Family title and Discovery-voting subtitle in English

### Requirement: Submit the inverse discoverability state for the loaded recipe

Activating an enabled detail discoverability button SHALL immediately display the inverse of its current local state and request PATCH `/api/recipes/{id}` for the loaded recipe ID with isDiscoverable set to that inverse boolean. The action SHALL omit unrelated recipe fields.

#### Scenario: Turn discoverability on
- **WHEN** a person activates the enabled off button for loaded recipe R
- **THEN** the detail control immediately displays on and requests PATCH for R with isDiscoverable true and no unrelated recipe fields

#### Scenario: Turn discoverability off
- **WHEN** a person activates the enabled on button for loaded recipe R
- **THEN** the detail control immediately displays off and requests PATCH for R with isDiscoverable false and no unrelated recipe fields

### Requirement: Persist the supplied recipe discoverability fact

For an authorized PATCH of an existing recipe, when persistence and response completion succeed, the API SHALL store a supplied non-null isDiscoverable boolean on that recipe, available through existing detail reading. Omitted or null values SHALL preserve the flag. A discoverability-only update SHALL retain unrelated recipe content, attribution, readiness and deletion state, subject to the existing timestamp and connected side effects.

#### Scenario: Store enabled discoverability
- **WHEN** a successful authorized PATCH supplies isDiscoverable true for an existing recipe
- **THEN** that recipe's stored flag is true and existing detail reading represents it as true, independently of member votes or consensus

#### Scenario: Store disabled discoverability
- **WHEN** a successful authorized PATCH supplies isDiscoverable false for an existing recipe
- **THEN** that recipe's stored flag is false and existing detail reading represents it as false

#### Scenario: Preserve an omitted or null discoverability flag
- **WHEN** a successful authorized PATCH omits isDiscoverable or supplies null
- **THEN** its stored discoverability flag remains unchanged

#### Scenario: Retain unrelated facts during a discoverability update
- **WHEN** a successful authorized PATCH supplies only isDiscoverable
- **THEN** name, description, ingredients, instructions, cuisine, meal types, rating, notes, attribution, readiness and deletion state retain their stored values

### Requirement: Disable the detail discoverability button while pending

While its discoverability update request is pending, the detail button SHALL be disabled and visibly subdued with a waiting cursor. This pending state SHALL prevent another activation through that disabled button.

#### Scenario: Request remains pending
- **WHEN** a discoverability update has started and has not completed while the sheet remains mounted
- **THEN** the button displays the optimistic state, is disabled and shows its subdued waiting presentation

### Requirement: Retain the local discoverability display after success

When a discoverability PATCH resolves successfully while the sheet remains mounted with no intervening state changes, the sheet SHALL retain the submitted local discoverability display, end the pending state and remain open. Completion SHALL NOT require applying the PATCH response or another detail GET.

#### Scenario: Complete with the sheet open
- **WHEN** the discoverability request resolves successfully with the sheet still mounted and no intervening state changes
- **THEN** the submitted local state remains displayed, the button becomes enabled and the sheet stays open without a completion GET or response reconciliation

### Requirement: Restore local discoverability after rejection and allow another activation

When a discoverability PATCH rejects while the same detail remains mounted with no intervening state changes, the sheet SHALL restore the local state from before that activation and re-enable the button. A later activation SHALL submit a fresh inverse-state update for the loaded recipe. Local restoration SHALL NOT imply rollback of stored data.

#### Scenario: Request rejects
- **WHEN** a discoverability request rejects while the same detail remains mounted with no intervening state changes
- **THEN** the pre-activation state and action label return and the button becomes enabled

#### Scenario: Activate again after rejection
- **WHEN** a person activates the re-enabled discoverability button after local restoration
- **THEN** another PATCH requests the inverse of that restored state for the loaded recipe ID
