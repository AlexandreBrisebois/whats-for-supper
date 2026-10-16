# Spec Delta

## ADDED Requirements

### Requirement: Accept an explicit hero-regeneration request after dispatch

Authorized POST `/api/recipes/{id}/hero/regenerate` SHALL request recipe-hero-regeneration for that ID and return HTTP 202 after dispatch resolves. This SHALL acknowledge dispatch, not completed generation or available changed image content. Shared background-processing lifecycle requirements SHALL govern subsequent workflow state.

#### Scenario: Accept hero regeneration dispatch
- **WHEN** the explicit request dispatch resolves successfully for the supplied ID
- **THEN** the API returns HTTP 202 after requesting recipe-hero-regeneration with that ID

### Requirement: Show immediate regeneration-request feedback in detail Edit

Loaded detail Edit SHALL offer explicit regeneration. Activation SHALL send the request for the loaded ID, display Regenerating hero image after request success, and display Failed to start regeneration after rejection. This feedback SHALL NOT assert changed asset delivery.

#### Scenario: Request regeneration from Edit
- **WHEN** a person activates the regeneration action in loaded detail Edit and the request succeeds
- **THEN** the loaded ID is requested and Regenerating hero image feedback appears

#### Scenario: Report regeneration request rejection
- **WHEN** the regeneration request rejects
- **THEN** detail shows Failed to start regeneration
