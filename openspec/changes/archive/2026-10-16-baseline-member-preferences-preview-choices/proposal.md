# Proposal

## Why

Existing member preview choices and client recovery needs a source-supported brownfield baseline for human review. This slice makes its boundary explicit without changing application behavior.

## What Changes

- Draft only the implemented member preview choices and client recovery behavior and its evidenced failure/recovery boundaries.
- Record substitutions, uncertainty and exclusions in the [capability plan](../../../../docs/openspec-baseline/member-preferences.md), evidence BSL-member-preferences-009–012.
- Stop at validated drafts under A10/A34; acceptance, promotion, archival and runtime qualification are separate.

## Capabilities

### New Capabilities

- `member-preferences`: Add this bounded slice to the same approved capability path; no main member-preferences spec exists yet. Companion deltas use distinct requirement names.

### Modified Capabilities

None. Existing owning requirements remain unchanged.

## Impact

Documentation only. Read-only trace: Settings → PreviewFeaturesSection → featureFlagStore/featureFlags adapter/generated GET and PATCH → FeatureFlagsController → FeatureFlagService → feature_flag_overrides. Deployment-mode policy is a separately bounded companion slice. No device accessibility conformance or same-member overlapping-load ordering guarantee is inferred. No code, tests, contracts, generated clients, SQL, configuration or dependency edits.
