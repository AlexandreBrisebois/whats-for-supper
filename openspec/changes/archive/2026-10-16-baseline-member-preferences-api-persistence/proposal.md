# Proposal

## Why

Existing preference API persistence and client reconciliation needs a source-supported brownfield baseline for human review. This slice makes its boundary explicit without changing application behavior.

## What Changes

- Draft only the implemented preference API persistence and client reconciliation behavior and its evidenced failure/recovery boundaries.
- Record substitutions, uncertainty and exclusions in the [capability plan](../../../../docs/openspec-baseline/member-preferences.md), evidence BSL-member-preferences-007–008.
- Stop at validated drafts under A10/A34; acceptance, promotion, archival and runtime qualification are separate.

## Capabilities

### New Capabilities

- `member-preferences`: Add this bounded slice to the same approved capability path; no main member-preferences spec exists yet. Companion deltas use distinct requirement names.

### Modified Capabilities

None. Existing owning requirements remain unchanged.

## Impact

Documentation only. Read-only trace: family client/generated preferences PUT → FamilyController → FamilyService → RecipeDbContext/family_members → response wrapper → familyStore. Language-only behavior is in the companion language slice; broader noncanonical input acceptance and exact error envelopes are withheld where contract disagrees. No code, tests, contracts, generated clients, SQL, configuration or dependency edits.
