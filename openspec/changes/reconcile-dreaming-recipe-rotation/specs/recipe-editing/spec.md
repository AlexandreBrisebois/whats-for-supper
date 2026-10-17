# Spec Delta

## MODIFIED Requirements

### Requirement: Persist the supplied recipe discoverability fact

For an authorized PATCH of an existing recipe, when persistence and response completion succeed, the API SHALL validate supper suitability before enabling and store a supplied non-null isDiscoverable boolean on that recipe, available through existing detail reading. Omitted or null values SHALL preserve the flag. A discoverability-only update SHALL retain unrelated recipe content, attribution, readiness and deletion state, subject to the existing timestamp and connected side effects.

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

#### Scenario: Record human control
- **WHEN** an explicit human discoverability action succeeds
- **THEN** false records durable Human-off; true clears that intent and cooked suppression, without bypassing current-plan visibility or suitability

#### Scenario: Reject unsuitable enable
- **WHEN** an explicit human PATCH requests true for an unsuitable recipe
- **THEN** the request fails without partial mutation

#### Scenario: Preserve omitted intent
- **WHEN** isDiscoverable is omitted or null
- **THEN** existing Human-off intent and provenance also remain unchanged


### Requirement: Submit the inverse discoverability state for the loaded recipe

Activating an enabled detail discoverability button SHALL immediately display the inverse of its current local state and request PATCH `/api/recipes/{id}` for the loaded recipe ID with isDiscoverable set to that inverse boolean. The action SHALL omit unrelated recipe fields.

#### Scenario: Turn discoverability on
- **WHEN** a person activates the enabled off button for loaded recipe R
- **THEN** the detail control immediately displays on and requests PATCH for R with isDiscoverable true and no unrelated recipe fields

#### Scenario: Turn discoverability off
- **WHEN** a person activates the enabled on button for loaded recipe R
- **THEN** the detail control immediately displays off and requests PATCH for R with isDiscoverable false and no unrelated recipe fields

#### Scenario: Record human control
- **WHEN** an explicit human discoverability action succeeds
- **THEN** false records durable Human-off; true clears that intent and cooked suppression, without bypassing current-plan visibility or suitability

