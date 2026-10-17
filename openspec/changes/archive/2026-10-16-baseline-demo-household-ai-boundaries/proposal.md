# Proposal

## Why

Extract demo ai bypass and provider boundaries from current executable paths into reviewable brownfield requirements. Source support and inspected assertions are documented separately from runtime qualification.

## What Changes

- Draft only the evidenced demo-household behavior for this slice.
- Reconcile BSL-demo-household-012, BSL-demo-household-013, BSL-demo-household-014, BSL-demo-household-015 in the [capability evidence plan](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/demo-household.md).
- Review in dependency order after `baseline-demo-household-activation-access`, `baseline-demo-household-workflow-observation`.
- Retain these non-normative boundaries: U07 remains an explicit no-global-block/no-cost exclusion. GenerateHero and embedding HTTP calls are outside the chat decorator. WebAcquisition ordinarily fetches HTML before decorated chat, but worker dispatch selects its demo bypass. Bypass completion does not prove acquisition or recipe readiness.

## Capabilities

### New Capabilities

- `demo-household`: Resettable showcase behavior, with this delta restricted to demo ai bypass and provider boundaries. No main demo-household specification exists; the sibling deltas add distinct requirements to the same capability.

### Modified Capabilities

None. Existing household-identity and background-processing owners retain their shared rules; this delta describes demo-specific consequences.

## Impact

Documentation extraction only: proposal, demo-household delta, documentation tasks and capability evidence plan. Source/API/client/persistence/workflow/provider paths are read-only evidence, linked by the stable evidence IDs. No application, contract, test, configuration, dependency or SQL changes. No acceptance, promotion, sync, archival or runtime qualification; A34 remains deferred.

Optional design.md is omitted under the installed schema's conditional rule: this extraction introduces no implementation, external dependency, model, migration or architectural decision. Existing cross-service behavior is traced in the evidence plan rather than redesigned.
