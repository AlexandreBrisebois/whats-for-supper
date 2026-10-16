# Recipe capture description-entry delta

## ADDED Requirements

### Requirement: Enter and cancel a description capture draft

The capture screen SHALL offer Describe a recipe with a required recipe name and optional free-text description. Opening `/capture?mode=describe` SHALL show this form directly. Cancel SHALL return to capture controls and clear the description draft and its local errors.

#### Scenario: Open description from capture controls
- **WHEN** a person activates Describe a recipe on `/capture`
- **THEN** the description form replaces the capture controls with name and optional description inputs

#### Scenario: Open description mode directly
- **WHEN** a person opens `/capture?mode=describe` without GOTO intent
- **THEN** the description form is immediately available

#### Scenario: Cancel a draft
- **WHEN** a person activates Cancel after entering name and description
- **THEN** capture controls return and the name, description, duplicate warning and submission error are cleared

### Requirement: Advise about an existing recipe name during description entry

The description form SHALL look up existing ready library recipes by the trimmed name and display an advisory warning when a match is returned. The warning SHALL offer View existing recipe without blocking synthesis.

#### Scenario: Matching name found
- **WHEN** a lookup returns a ready library recipe matching the entered name without regard to case
- **THEN** the form displays the existing-name warning and View existing recipe action
- **AND** a non-empty name remains eligible for submission

#### Scenario: View matching recipe
- **WHEN** a person activates View existing recipe in the description warning
- **THEN** the matching recipe opens for viewing

### Requirement: Validate and submit a description capture

The client SHALL require a name containing non-whitespace text, trim name and description, and submit the name and optional description to POST `/api/recipes/describe`. If description is blank, the client SHALL send the trimmed name as description. The API SHALL require member context and a name, while permitting omitted description.

#### Scenario: Blank name blocks synthesis
- **WHEN** the name is empty or contains only whitespace
- **THEN** Synthesize Recipe is disabled and no description request is sent through that action

#### Scenario: Submit additional recipe details
- **WHEN** a person submits a non-blank name and description
- **THEN** the client sends both trimmed values and disables the synthesis button while awaiting the response

#### Scenario: Submit only a name
- **WHEN** a person submits a non-blank name with no non-whitespace description
- **THEN** the client sends the trimmed name in both name and description fields

#### Scenario: API accepts omitted description
- **WHEN** a request supplies a name and member context but omits description
- **THEN** description omission alone does not reject initial recipe creation

#### Scenario: Missing required intake values
- **WHEN** a description request omits its name or has no bindable member context
- **THEN** the API rejects the request

### Requirement: Create an initial recipe from description intake

Description intake SHALL create a recipe carrying the supplied name, optional description and submitting member, initially not ready or discoverable and without uploaded photos. A successful intake response SHALL identify that recipe. Background generation SHALL be requested after initial persistence; intake success SHALL NOT certify workflow delivery or readiness.

#### Scenario: Receive the initial recipe identity
- **WHEN** description intake succeeds
- **THEN** the response identifies the newly stored recipe with its supplied name
- **AND** the initial recipe is not ready or discoverable and has no uploaded photos

#### Scenario: Background dispatch fails after creation
- **WHEN** initial description persistence succeeds but background dispatch throws
- **THEN** intake still returns the initial recipe and it remains pending

### Requirement: Generate recipe content from the submitted description

When description synthesis executes, the system SHALL request recipe content from the submitted description and persist the resulting recipe content and synthesized identity. If the response cannot be parsed or has no usable recipe name, synthesis SHALL retain a minimal recipe named from the submitted description with empty ingredients and instructions.

#### Scenario: Persist generated recipe content
- **WHEN** synthesis receives parseable recipe content with a usable name
- **THEN** it persists that content and identifies the recipe as synthesized for subsequent processing

#### Scenario: Unusable synthesis response
- **WHEN** synthesis receives malformed recipe JSON or content with no usable name
- **THEN** it persists a minimal recipe named from the submitted description with empty ingredients and instructions
- **AND** this fallback alone does not establish a complete cookable recipe

### Requirement: Show description synthesis waiting state

After receiving a recipe ID for ordinary description capture, the client SHALL track it as pending and show Synthesizing… with feedback that the recipe is being built. The existing background capture countdown and inline completion behavior SHALL apply to this waiting state.

#### Scenario: Intake returns a recipe ID
- **WHEN** description submission returns an identified recipe
- **THEN** the client displays Synthesizing… and begins the existing ten-second Home countdown with a Done action
- **AND** the recipe is tracked for session completion notifications

#### Scenario: Ready event resolves description waiting state
- **WHEN** a ready notification for that pending recipe reaches the active capture screen
- **THEN** the existing inline ready presentation replaces the waiting state and cancels its countdown

### Requirement: Retain a description draft after submission failure

If description submission fails or returns no recipe ID, the client SHALL display an error, retain the entered name and description, and release the submission button so the person can retry intake.

#### Scenario: Request rejects
- **WHEN** description submission raises a network or server error
- **THEN** the form retains the draft, displays an error and permits another submission

#### Scenario: Response lacks identity
- **WHEN** the submission response has no recipe ID
- **THEN** the form displays No recipe ID returned. and retains the draft for another submission
