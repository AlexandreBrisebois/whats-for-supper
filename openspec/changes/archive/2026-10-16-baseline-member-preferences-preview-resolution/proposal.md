# Proposal

## Why

Existing deployment-mode and member-override preview resolution needs a source-supported brownfield baseline for human review. This slice makes its boundary explicit without changing application behavior.

## What Changes

- Draft only the implemented deployment-mode and member-override preview resolution behavior and its evidenced failure/recovery boundaries.
- Record substitutions, uncertainty and exclusions in the [capability plan](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/member-preferences.md), evidence BSL-member-preferences-013–016.
- Stop at validated drafts under A10/A34; acceptance, promotion, archival and runtime qualification are separate.

## Capabilities

### New Capabilities

- `member-preferences`: Add this bounded slice to the same approved capability path; no main member-preferences spec exists yet. Companion deltas use distinct requirement names.

### Modified Capabilities

None. Existing owning requirements remain unchanged.

## Impact

Documentation only. Read-only trace: API configuration → FeatureFlagRegistry → FeatureFlagService → feature_flag_overrides → FeatureFlagsController/generated snapshot → cooking/planner/capture consumers. Detailed cooking, calendar movement and PDF acquisition behavior stays with its owning capability. Missing deployment wiring and snapshot 404 contract omission remain limitations. No code, tests, contracts, generated clients, SQL, configuration or dependency edits.
