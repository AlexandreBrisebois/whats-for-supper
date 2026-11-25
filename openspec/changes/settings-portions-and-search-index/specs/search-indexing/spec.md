# Spec Delta

## MODIFIED Requirements

### Requirement: Repair derived search state in bounded batches

Search reconciliation SHALL scan ready non-deleted recipes in increasing ID order after an optional cursor, at most 50 per invocation. It SHALL attempt current-fingerprint index dispatch for missing/stale/pending/failed derived state—or for all ready recipes when `force` is true—when no equivalent Pending or Processing index workflow is found, and request continuation when a batch contains 50 recipes.

#### Scenario: Missing search state

- **WHEN** a ready active recipe has no search document and no equivalent active workflow
- **THEN** reconciliation creates pending state and requests current-fingerprint indexing

#### Scenario: Forced full-index rebuild

- **WHEN** reconciliation runs with `force` enabled for ready active recipes
- **THEN** each scanned recipe without an already-active equivalent index job has its search state marked stale and queued for `index-recipe-search`

#### Scenario: Equivalent work active

- **WHEN** a Pending or Processing index workflow already represents the same recipe and fingerprint
- **THEN** reconciliation does not request another equivalent job in that invocation

#### Scenario: Full batch

- **WHEN** the scan returns 50 recipes
- **THEN** reconciliation requests another batch after the last scanned ID

### Requirement: Acknowledge background backfill dispatch separately

An authenticated `POST /api/management/backfill-search` (optionally accepting `{ force?: boolean }`) SHALL return HTTP 202 with message “Search index backfill triggered in the background.” while a background attempt requests search reconciliation (`force` defaulted to false). The response SHALL contain no `taskId`.

#### Scenario: Background launch failure

- **WHEN** reconciliation acceptance throws inside the background attempt
- **THEN** the failure is logged independently of the already returned HTTP acceptance

## ADDED Requirements

### Requirement: Inspect search index health and trigger reindex in Settings

`/profile/settings` SHALL display a `Search index` card strictly below `Usual portions` showing searchable and enriched counts with plain wrapped breakdown text, a 1-tap `Index missing recipes` action, and a `Rebuild full search index` action guarded by an inline `Cancel` / `Rebuild all` confirmation.

#### Scenario: Settings displays search health and triggers missing or full rebuild

- **WHEN** a household member views `/profile/settings` and activates `Index missing recipes` or confirms `Rebuild all` (`Cancel` / `Rebuild all`, never `window.confirm`)
- **THEN** `Search index` sits strictly below `Usual portions`, sends `POST /api/management/backfill-search` (`force: false` or `force: true`), and updates counts without blocking existing keyword search

#### Scenario: Settings search reindex failure surfaces inline alert

- **WHEN** `POST /api/management/backfill-search` rejects in Settings
- **THEN** the `Search index` card keeps actions enabled and displays an inline `role="alert"` error message

### Requirement: Reindex a single recipe in context

The `RecipeDetailSheet` `•••` overflow menu SHALL include `Reindex` (`POST /api/recipes/{id}/reindex`), queueing `index-recipe-search` for that single ready recipe using its current source fingerprint without modifying other recipes or unsaved edits.

#### Scenario: Reindex one recipe from RecipeDetailSheet

- **WHEN** a person opens `•••` in `RecipeDetailSheet` and activates `Reindex`
- **THEN** `POST /api/recipes/{id}/reindex` returns 202, queues `index-recipe-search` for that recipe alone, and displays quiet inline confirmation (or `role="alert"` on rejection)
