# Spec Delta

## ADDED Requirements

### Requirement: Read the persisted recipe readiness status

Authorized GET `/api/recipes/{id}/status` for an available stored recipe SHALL report ready exactly when stored IsReady is true, otherwise pending. It SHALL return HTTP 200 with one data object carrying stored id, name, imageCount and isSynthesized alongside that status. This SHALL NOT infer workflow progress or completion from image count or synthesis flags.

#### Scenario: Read a pending stored recipe
- **WHEN** an available recipe has stored readiness false and its status read succeeds
- **THEN** the response data reports pending with its stored ID, name, imageCount and isSynthesized

#### Scenario: Read a ready recipe without originals
- **WHEN** an available recipe has stored readiness true and zero originals
- **THEN** the status read reports ready without requiring positive image count

#### Scenario: Read stored status fields independently
- **WHEN** an available record has stored name, image count and synthesis flag values
- **THEN** a successful status read returns those stored fields without recalculating readiness from them

### Requirement: Reject status reads without an available recipe

When the status provider cannot find the requested recipe, GET `/api/recipes/{id}/status` SHALL return HTTP 404 instead of pending or ready.

#### Scenario: Read status for an absent ID
- **WHEN** an authorized status request targets an absent recipe ID
- **THEN** the API returns HTTP 404
