# Household identity member-creation delta

Evidence and implementation status are recorded in the design and durable plan. The uniqueness requirement is an explicitly requested future behavior; it is not implemented in the recorded source. Existing shared-access, selection, lookup, recovery and Profile requirements continue to apply.

## ADDED Requirements

### Requirement: Open and cancel the member-creation form

Onboarding and Settings SHALL offer an add-member control that opens a name-entry form. Cancel SHALL hide that form. Reopening a cancelled form SHALL start with an empty name and no local name-validation error. Onboarding SHALL also offer creation when a member is already selected.

#### Scenario: Open from onboarding
- **WHEN** a person with household access activates add-member on onboarding
- **THEN** the name-entry form and Cancel control are displayed

#### Scenario: Open from Settings
- **WHEN** a person on Settings activates add-member
- **THEN** the same name-entry form and Cancel control are displayed

#### Scenario: Cancel and reopen
- **WHEN** a person enters a name or triggers a local blank-name error, cancels, and reopens the form
- **THEN** the reopened form has an empty name and no local name-validation error

#### Scenario: Create while switching members
- **WHEN** onboarding has an existing selected member
- **THEN** add-member remains available alongside member selection

### Requirement: Submit a trimmed nonblank member name

The member-creation form SHALL trim surrounding whitespace before submission. Empty or whitespace-only input SHALL display a local name error without requesting creation. Editing the input SHALL clear that local error. The remaining name's casing SHALL be preserved for display.

#### Scenario: Name has surrounding whitespace
- **WHEN** a person submits ` Alex ` through the member-creation form
- **THEN** the creation request contains the name `Alex`

#### Scenario: Name is blank
- **WHEN** a person submits empty or whitespace-only input
- **THEN** the form displays a name error and sends no creation request

#### Scenario: Correct the local name error
- **WHEN** a person edits the input after a blank-name error
- **THEN** the local error clears

### Requirement: Display member-creation pending feedback

While the family form is busy with a pending creation request, it SHALL disable the name input and submit control and display submission progress. This feedback SHALL NOT imply request idempotency or atomic identity handoff.

#### Scenario: Creation request is pending
- **WHEN** a submitted creation request is pending
- **THEN** the form disables input and submission and displays a progress indicator

### Requirement: Create and return a named household member

For an authorized ordinary-household request with a valid nonconflicting name, POST `/api/family` SHALL persist a new member and return `201 Created` with that member in the `data` envelope. It SHALL preserve trimmed display casing, assign a nonempty unique ID, default browse mode to `stack` and preferred language to null, and include creation/update timestamps. The OpenAPI operation SHALL document creation with a `201` success response rather than `200` or upsert semantics.

#### Scenario: Successful creation response
- **WHEN** an authorized POST submits a valid nonconflicting name and persistence succeeds
- **THEN** the response is 201 with the created ID, trimmed name, default preferences and timestamps in `data`

#### Scenario: Created member can be listed
- **WHEN** creation succeeds and a subsequent authorized family-list request succeeds
- **THEN** the list contains the created member's ID and name

#### Scenario: OpenAPI describes implemented success
- **WHEN** the POST `/api/family` operation is inspected in OpenAPI
- **THEN** it describes creation with a 201 success response and the member `data` envelope
- **AND** it does not describe that operation as an upsert or use 200 for creation success

### Requirement: Prevent duplicate member names during creation

Member creation MUST return `409 Conflict` when its submitted name, after trimming surrounding whitespace and ignoring casing, matches an existing household member's name. Rejection MUST leave existing members unchanged and MUST NOT create another member or select an existing member automatically. Concurrent creation requests for equivalent names MUST NOT persist more than one new member. Successful creation SHALL preserve the trimmed submitted casing for display.

#### Scenario: Exact duplicate is rejected
- **WHEN** a member named `Alex` exists and creation submits `Alex`
- **THEN** creation returns 409 without adding or changing a member or automatically selecting Alex

#### Scenario: Casing variant is rejected
- **WHEN** a member named `Alex` exists and creation submits `alex`
- **THEN** creation returns 409 without creating another member

#### Scenario: Whitespace variant is rejected
- **WHEN** a member named `Alex` exists and creation submits ` Alex `
- **THEN** creation returns 409 without creating another member

#### Scenario: Compare against a stored whitespace variant
- **WHEN** an existing member's stored name is ` Alex ` and creation submits `alex`
- **THEN** creation returns 409 because both names are compared after trimming and ignoring casing

#### Scenario: Equivalent names are created concurrently
- **WHEN** no matching member exists and concurrent creation requests submit `Alex` and ` alex `
- **THEN** at most one request creates a member and other equivalent requests receive 409

#### Scenario: Distinct name keeps display casing
- **WHEN** creation submits the valid nonconflicting name ` aLeX ` and succeeds
- **THEN** the created member's displayed name is `aLeX`

### Requirement: Display the created member without switching Settings identity

After a successful member response, the application SHALL make the returned member available in the displayed family list. Creation in Settings SHALL leave the current member selection, identity cookies, onboarding completion and route unchanged. The Settings form SHALL remain open with an empty name after successful submission.

#### Scenario: Settings creation preserves current context
- **WHEN** a person with an existing selected member successfully creates another member in Settings
- **THEN** the new member appears in the list while the existing selection and identity cookies remain unchanged
- **AND** creation does not change onboarding completion or navigate away

#### Scenario: Settings form resets after success
- **WHEN** a Settings creation submission succeeds
- **THEN** the form remains visible with an empty name

### Requirement: Request onboarding identity handoff after creation

After onboarding creation returns a member, the application SHALL attempt to write that member's identity cookie. When that initial write succeeds, it SHALL request selection of that member, mark onboarding complete and request Home navigation. Subsequent selection, page gates, lookup, recovery and Profile display SHALL follow existing household-identity requirements; creation SHALL NOT imply atomic completion of those steps.

#### Scenario: New member requests Home
- **WHEN** onboarding creation succeeds and the initial identity-cookie write succeeds
- **THEN** selection of the created member is requested, onboarding is marked complete and navigation to Home is requested

#### Scenario: Creation while another member is selected
- **WHEN** onboarding has another selected member, creation succeeds and the initial identity-cookie write succeeds
- **THEN** the handoff requests selection of the newly created member and Home navigation
