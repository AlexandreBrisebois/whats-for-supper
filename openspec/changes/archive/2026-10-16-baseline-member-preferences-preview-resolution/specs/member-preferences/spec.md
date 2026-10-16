# Spec Delta

## Purpose

Adapt the household experience using member language and browsing preferences and member-specific preview resolution, while distinguishing browser choices from persisted member settings.

## ADDED Requirements

### Requirement: Resolve registered preview deployment modes fail closed

For single-page-recipe-steps, planner-hold-to-move and preview-pdf-recipe-import, the server SHALL read their respective WFS_FEATURE_SINGLE_PAGE_RECIPE_STEPS, WFS_FEATURE_PLANNER_HOLD_TO_MOVE and WFS_FEATURE_PREVIEW_PDF_RECIPE_IMPORT settings. Modes SHALL be trimmed and case-insensitive. Missing, blank, off or invalid values SHALL resolve off; opt-in and on SHALL select those modes.

#### Scenario: Enabled and optional modes
- **WHEN** a registered preview is configured with padded uppercase ON or OPT-IN
- **THEN** the server resolves on or opt-in respectively

#### Scenario: Default or invalid mode
- **WHEN** a registered preview setting is missing, blank, off or unrecognized
- **THEN** it resolves off

### Requirement: Give deployment mode precedence over member overrides

An effective preview SHALL be enabled in on mode and disabled in off mode regardless of any stored member override. In opt-in mode it SHALL use the member's stored boolean choice, defaulting to disabled without a choice. Fixed-mode flags SHALL not offer an editable opt-in choice; opt-in snapshots SHALL provide the choice, name and description.

#### Scenario: Fixed modes ignore stored choices
- **WHEN** a saved member choice is false in on mode or true in off mode
- **THEN** effective enabled is true or false respectively and the fixed-mode flag does not offer an editable opt-in choice

#### Scenario: Optional mode uses member choice
- **WHEN** an opt-in flag has a saved true, saved false or absent choice for the member
- **THEN** effective enabled and reported memberEnabled are true, false or false respectively and descriptive metadata is available

### Requirement: Read the registered snapshot for the bound member

Authorized GET /api/feature-flags with an established bound member SHALL return the registered effective flags in data.items, resolving choices for that member. A request with no bound member identity SHALL return 401. Unknown stored keys SHALL not become registered snapshot entries.

#### Scenario: Member-specific snapshot
- **WHEN** two established members request snapshots and only one has opted into an optional flag
- **THEN** only that member's snapshot enables that optional flag

#### Scenario: Missing context
- **WHEN** an authorized snapshot request has no bound member identity
- **THEN** the endpoint returns 401

#### Scenario: Stored unregistered key
- **WHEN** a member has a stored override whose key is not registered
- **THEN** the registered snapshot does not expose that key

### Requirement: Persist overrides only for registered opt-in previews

Authorized PATCH /api/feature-flags/{key} with a bound existing member and registered opt-in key SHALL insert or update that member/key choice and return its effective flag in data. Unknown keys SHALL return 404; registered fixed-mode keys SHALL return 409 without changing the stored override. A request without bound member context SHALL return 401.

#### Scenario: Insert and replace one member choice
- **WHEN** a member enables an opt-in flag and later disables that same flag successfully
- **THEN** one member/key choice records the latest boolean and the response reports its effective disabled state
- **AND** another member's choice is unchanged

#### Scenario: Unknown flag or fixed mode
- **WHEN** an authorized existing member updates an unknown key or a registered off/on key
- **THEN** the endpoint returns 404 or 409 respectively without saving a new choice

#### Scenario: No bound identity
- **WHEN** an authorized override request supplies no bound member context
- **THEN** the endpoint returns 401

#### Scenario: Member unavailable for opt-in
- **WHEN** a request with a bound nonexistent member targets a registered opt-in key
- **THEN** it returns 404 without saving an override

### Requirement: Retain member choices while a deployment mode overrides them

Reading a flag or rejecting a non-opt-in mutation SHALL leave its saved member choice intact. If the deployment later runs in opt-in mode against the same stored choices, resolution SHALL use the retained choice.

#### Scenario: Restore a retained opt-in choice
- **WHEN** a true member choice exists while off mode suppresses it and the deployment later resolves the key as opt-in
- **THEN** that member's effective flag is enabled without a new member choice

### Requirement: Select consumer experience using effective preview enablement

Cooking and planning SHALL select their preview experience using effective enabled, rather than the stored member choice alone. Cooking SHALL use the accepted cooking single-page/focused-reading requirements. The planner handle SHALL require deliberate hold activation when enabled and use immediate primary-pointer activation when disabled or unavailable. PDF acquisition SHALL remain subject to the accepted recipe-capture eligibility requirement.

#### Scenario: Effective cooking mode
- **WHEN** the cooking flag resolves enabled or disabled
- **THEN** cooking follows “Read all instructions under the effective single-page flag” or “Navigate one focused instruction at a time” respectively

#### Scenario: Planner preview unavailable or enabled
- **WHEN** the planner handle's effective flag is absent or false, or is true
- **THEN** primary-pointer activation is immediate, or waits for deliberate hold respectively

#### Scenario: PDF consumes shared resolution
- **WHEN** a PDF preview value is consumed by acquisition
- **THEN** acquisition follows recipe-capture “Gate PDF acquisition by effective member eligibility” and retains its independent API eligibility check
