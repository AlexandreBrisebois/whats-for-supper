# Proposal

## Why

Extract demo snapshot capture from current executable paths into reviewable brownfield requirements. Source support and inspected assertions are documented separately from runtime qualification.

## What Changes

- Draft only the evidenced demo-household behavior for this slice.
- Reconcile BSL-demo-household-005, BSL-demo-household-006, BSL-demo-household-007 in the [capability evidence plan](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/demo-household.md).
- Review in dependency order after `baseline-demo-household-activation-access`.
- Retain these non-normative boundaries: Not a complete database backup. No coherent concurrent snapshot, atomic publication, complete asset coverage outside the recipe root, manifest checksum/version validation or recovery guarantee. Soft-deleted recipe rows are not captured by the filtered recipe query.

## Capabilities

### New Capabilities

- `demo-household`: Resettable showcase behavior, with this delta restricted to demo snapshot capture. No main demo-household specification exists; the sibling deltas add distinct requirements to the same capability.

### Modified Capabilities

None. Existing household-identity and background-processing owners retain their shared rules; this delta describes demo-specific consequences.

## Impact

Documentation extraction only: proposal, demo-household delta, documentation tasks and capability evidence plan. Source/API/client/persistence/workflow/provider paths are read-only evidence, linked by the stable evidence IDs. No application, contract, test, configuration, dependency or SQL changes. No acceptance, promotion, sync, archival or runtime qualification; A34 remains deferred.

Optional design.md is omitted under the installed schema's conditional rule: this extraction introduces no implementation, external dependency, model, migration or architectural decision. Existing cross-service behavior is traced in the evidence plan rather than redesigned.
