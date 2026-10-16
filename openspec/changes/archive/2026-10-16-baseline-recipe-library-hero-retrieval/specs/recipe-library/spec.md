# Spec Delta

## ADDED Requirements

### Requirement: Serve an existing hero asset independently of recipe DTO reads

Anonymous or authenticated GET `/api/recipes/{id}/hero` SHALL return the asset-store stream and its content type when present, with Cache-Control public, max-age=31536000, immutable. A missing hero asset SHALL return HTTP 404. Availability SHALL be determined by the asset store rather than recipe readiness or import completion.

#### Scenario: Retrieve an existing hero stream
- **WHEN** the requested hero exists in the configured asset store
- **THEN** GET returns HTTP 200 with raw binary, the store-provided media type and the immutable public cache header

#### Scenario: Request an absent hero asset
- **WHEN** the requested hero is absent from the configured asset store
- **THEN** GET returns HTTP 404 instead of a hero stream
