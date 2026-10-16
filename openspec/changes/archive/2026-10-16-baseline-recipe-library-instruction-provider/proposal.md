# Proposal

## Why

Instruction persistence/read behavior is distinct from inline detail editing and sharing export transformations.

## What Changes

- Draft array instruction reads, null read fallbacks and successful partial instruction updates.
- Record exact source/assertion mappings and source-only scenarios in the extraction design.
- Preserve disagreements and failure/concurrency limits as non-normative evidence.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-library`: array instruction reads, null read fallbacks and successful partial instruction updates.

## Impact

Documentation-only brownfield draft. No application, test, OpenAPI, generated-client, mock, SQL, configuration or dependency edits. Existing main specifications and promoted change artifacts remain unchanged. No promotion, archival, service/browser/network/database/device/model execution or runtime qualification. A34 remains deferred. CLI artifact completeness is not human acceptance.
