# Proposal

## Why

Existing member browse presentation selection needs a source-supported brownfield baseline for human review. This slice makes its boundary explicit without changing application behavior.

## What Changes

- Draft only the implemented member browse presentation selection behavior and its evidenced failure/recovery boundaries.
- Record substitutions, uncertainty and exclusions in the [capability plan](../../../../docs/openspec-baseline/member-preferences.md), evidence BSL-member-preferences-005–006.
- Stop at validated drafts under A10/A34; acceptance, promotion, archival and runtime qualification are separate.

## Capabilities

### New Capabilities

- `member-preferences`: Add this bounded slice to the same approved capability path; no main member-preferences spec exists yet. Companion deltas use distinct requirement names.

### Modified Capabilities

None. Existing owning requirements remain unchanged.

## Impact

Documentation only. Read-only trace: BrowseAllStackPage → member-scoped page override/familyStore → family PUT → FamilyService → family_members. Recipe library owns retrieval, filtering, pagination and recipe controls. Failed-save page override remains a non-normative limitation. No code, tests, contracts, generated clients, SQL, configuration or dependency edits.
