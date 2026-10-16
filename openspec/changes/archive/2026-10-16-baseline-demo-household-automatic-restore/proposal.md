# Proposal

## Why

Extract automatic demo restore scheduling from current executable paths into reviewable brownfield requirements. Source support and inspected assertions are documented separately from runtime qualification.

## What Changes

- Draft only the evidenced demo-household behavior for this slice.
- Reconcile BSL-demo-household-001, BSL-demo-household-010, BSL-demo-household-011 in the [capability evidence plan](../../../../docs/openspec-baseline/demo-household.md).
- Review in dependency order after `baseline-demo-household-snapshot-restore-activity`.
- Retain these non-normative boundaries: No exactly-once startup or recurrence, distributed lock, guaranteed reset deadline, catch-up replay or automatic recovery chain. Snapshot presence is not a seeding prerequisite. Paused workflows do not suppress startup seeding; Pending/Processing workflows do.

## Capabilities

### New Capabilities

- `demo-household`: Resettable showcase behavior, with this delta restricted to automatic demo restore scheduling. No main demo-household specification exists; the sibling deltas add distinct requirements to the same capability.

### Modified Capabilities

None. Existing household-identity and background-processing owners retain their shared rules; this delta describes demo-specific consequences.

## Impact

Documentation extraction only: proposal, demo-household delta, documentation tasks and capability evidence plan. Source/API/client/persistence/workflow/provider paths are read-only evidence, linked by the stable evidence IDs. No application, contract, test, configuration, dependency or SQL changes. No acceptance, promotion, sync, archival or runtime qualification; A34 remains deferred.

Optional design.md is omitted under the installed schema's conditional rule: this extraction introduces no implementation, external dependency, model, migration or architectural decision. Existing cross-service behavior is traced in the evidence plan rather than redesigned.
