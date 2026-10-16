# Spec Delta

## Purpose

Describe existing application data export, reconstruction and operational recovery with explicit partial-failure and asynchronous boundaries.

## ADDED Requirements

### Requirement: Export ready search documents as sidecars

Export SHALL write search.index.json for ready search documents joined to non-deleted recipes, rebuilding lexical content and source fingerprint from current recipe facts. Reusable embedding status SHALL require ready embedding status and matching stored source and embedding fingerprints.

#### Scenario: Ready search document
- **WHEN** a visible recipe has an index-ready search document
- **THEN** export writes schema, identity, rebuilt text/metadata, model, fingerprints and export time in its sidecar

#### Scenario: Non-ready document
- **WHEN** a recipe has only a pending or failed search document and no prior sidecar
- **THEN** export does not create a sidecar for it

#### Scenario: Changed source
- **WHEN** the stored embedding fingerprint differs from current recipe facts
- **THEN** the exported embedding is marked pending

### Requirement: Rebuild lexical search content during compatible restore

For a sidecar with the current schema version, restore SHALL rebuild lexical text, metadata and source fingerprint from restored recipe facts and upsert the search document with ready lexical index status. It SHALL not rehydrate the sidecar’s lexical text or metadata.

#### Scenario: Compatible sidecar
- **WHEN** a readable sidecar has the current schema
- **THEN** restore writes ready lexical content built from the restored recipe

#### Scenario: Legacy terms
- **WHEN** a current-schema sidecar contains obsolete dietary text or metadata
- **THEN** restore replaces that content with the current recipe-derived projection

### Requirement: Qualify embedding reuse separately from lexical readiness

Restore SHALL mark a compatible sidecar’s embedding ready only when its model equals the configured EMBEDDING_MODEL_ID, its embedding fingerprint matches restored source facts and its embedding status is ready. The default model SHALL be gemini-embedding-2 when the environment variable is absent.

#### Scenario: Incompatible model
- **WHEN** a current-schema sidecar names another embedding model
- **THEN** restore retains ready lexical content while marking embedding pending

#### Scenario: Matching embedding
- **WHEN** a current-schema sidecar has the configured model, matching fingerprint and ready embedding status
- **THEN** restore marks the embedding ready under those compatibility checks

### Requirement: Mark missing or obsolete sidecars pending

When a restored recipe has no search sidecar or its sidecar schema differs from the current schema, restore SHALL upsert pending lexical and embedding status for that recipe.

#### Scenario: Missing sidecar
- **WHEN** a recipe was reconstructed without search.index.json
- **THEN** restore marks its search document pending

#### Scenario: Obsolete schema
- **WHEN** a readable sidecar has an incompatible schema version
- **THEN** restore marks its search document pending

### Requirement: Repair derived search state in bounded batches

Search reconciliation SHALL scan ready non-deleted recipes in increasing ID order after an optional cursor, at most 50 per invocation. It SHALL attempt current-fingerprint index dispatch for missing/stale/pending/failed derived state when no equivalent Pending or Processing index workflow is found, and request continuation when a batch contains 50 recipes.

#### Scenario: Missing search state
- **WHEN** a ready active recipe has no search document and no equivalent active workflow
- **THEN** reconciliation creates pending state and requests current-fingerprint indexing

#### Scenario: Equivalent work active
- **WHEN** a Pending or Processing index workflow already represents the same recipe and fingerprint
- **THEN** reconciliation does not request another equivalent job in that invocation

#### Scenario: Full batch
- **WHEN** the scan returns 50 recipes
- **THEN** reconciliation requests another batch after the last scanned ID

### Requirement: Acknowledge background backfill dispatch separately

An authenticated POST /api/management/backfill-search SHALL return HTTP 202 with message “Search index backfill triggered in the background.” while a background attempt requests search reconciliation. The response SHALL contain no taskId.

#### Scenario: Background launch failure
- **WHEN** reconciliation acceptance throws inside the background attempt
- **THEN** the failure is logged independently of the already returned HTTP acceptance
