# Proposal

## Why

Successful fact edits already have coverage, but consumers lack explicit boundaries between persisted recipe/search state, best-effort indexing and recipe-info completion.

## What Changes

- Draft supported PATCH search invalidation, post-save dispatch and bounded recipe-info projection.
- Record exact source/assertion mappings and source-only scenarios in the extraction design.
- Preserve disagreements and failure/concurrency limits as non-normative evidence.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-library`: supported PATCH search invalidation, post-save dispatch and bounded recipe-info projection.

## Impact

Documentation-only brownfield draft. No application, test, OpenAPI, generated-client, mock, SQL, configuration or dependency edits. Existing main specifications and promoted change artifacts remain unchanged. No promotion, archival, service/browser/network/database/device/model execution or runtime qualification. A34 remains deferred. CLI artifact completeness is not human acceptance.
