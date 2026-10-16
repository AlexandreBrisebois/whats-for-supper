# Proposal

## Why

Library duplicate-check consumers reuse lookup queries, but their provider predicates and default order lack exact baseline coverage.

## What Changes

- Draft default list ordering, exact lookup predicates and unsupported-order rejection.
- Record exact source/assertion mappings and source-only scenarios in the extraction design.
- Preserve disagreements and failure/concurrency limits as non-normative evidence.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-library`: default list ordering, exact lookup predicates and unsupported-order rejection.

## Impact

Documentation-only brownfield draft. No application, test, OpenAPI, generated-client, mock, SQL, configuration or dependency edits. Existing main specifications and promoted change artifacts remain unchanged. No promotion, archival, service/browser/network/database/device/model execution or runtime qualification. A34 remains deferred. CLI artifact completeness is not human acceptance.
