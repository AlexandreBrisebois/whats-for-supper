# Recipe capture completion delta

## MODIFIED Requirements

### Requirement: Finalize recipe readiness and broadcast completion

When finalization executes for an existing recipe that is not already ready and discoverable, the system SHALL set those database facts and update its timestamp before attempting household ready-event publication. Ordinary finalization SHALL NOT require writing readiness into a non-PDF metadata file.

#### Scenario: State transition to ready
- **WHEN** the recipe ready step successfully finalizes an existing recipe not already ready and discoverable
- **THEN** it persists database readiness and discoverability and then attempts publication of recipe identity, name and optional hero path
- **AND** delivery follows the household-live-updates rules rather than being certified by the database save

#### Scenario: Missing or already finalized recipe
- **WHEN** finalization is invoked for a missing recipe or one already ready and discoverable
- **THEN** it does not publish a new ready event
- **AND** the existing retained-PDF readiness behavior still applies to an already finalized PDF

### Requirement: Finalize photo recipe readiness and broadcast completion

When finalization executes for an existing recipe that is not already ready and discoverable, the system SHALL set those database facts and update its timestamp before attempting household ready-event publication. Ordinary finalization SHALL NOT require writing readiness into a non-PDF metadata file.

#### Scenario: Transition photo recipe state to ready
- **WHEN** the recipe ready step successfully finalizes an existing recipe not already ready and discoverable
- **THEN** it persists database readiness and discoverability and then attempts publication of recipe identity, name and optional hero path
- **AND** delivery follows the household-live-updates rules rather than being certified by the database save

#### Scenario: Missing or already finalized recipe
- **WHEN** finalization is invoked for a missing recipe or one already ready and discoverable
- **THEN** it does not publish a new ready event
- **AND** the existing retained-PDF readiness behavior still applies to an already finalized PDF

## ADDED Requirements

### Requirement: Offer inline advice for another ready recipe with the completed name

After an ordinary capture reaches its inline ready presentation, the client SHALL look up the completed name through the existing library lookup. A returned recipe with a different identity SHALL produce advisory name feedback and a View existing recipe action. The captured recipe SHALL remain available unless the person explicitly requests its removal.

#### Scenario: Another identity returned for the completed name
- **WHEN** inline completion has a name and pending recipe identity and the name lookup returns another recipe identity
- **THEN** capture displays the matching recipe name, View existing recipe and Discard duplicate actions
- **AND** View existing recipe opens that returned recipe for reading

#### Scenario: Lookup returns only the newly captured identity
- **WHEN** the completed-name lookup returns only the current pending recipe or no recipes
- **THEN** the inline ready presentation shows no name-duplicate advice

#### Scenario: Keep the captured recipe
- **WHEN** the person chooses Done or Add to this week instead of Discard duplicate
- **THEN** capture navigates to Home or the planner respectively without sending a delete request
- **AND** navigation alone does not assign the recipe to a planner day

### Requirement: Request discard of the newly captured duplicate from inline completion

Discard duplicate SHALL request deletion of the newly captured pending identity using the existing recipe-library deletion operation. While the request is pending, repeated discard activation SHALL be disabled. On success the client SHALL show duplicate-discard feedback and navigate to the root entry. A rejected request SHALL release the control without success feedback or navigation.

#### Scenario: Discard request succeeds
- **WHEN** the person activates Discard duplicate and the deletion operation succeeds
- **THEN** the request targets the newly captured identity rather than the matching existing recipe
- **AND** the client displays Duplicate recipe discarded. and navigates to `/`

#### Scenario: Discard request rejects
- **WHEN** the deletion operation rejects the discard request
- **THEN** the control becomes available again and the client does not show success feedback or navigate away
