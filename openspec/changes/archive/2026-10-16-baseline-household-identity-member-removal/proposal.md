# Proposal

## Why

Household identity lacks baseline requirements for the existing member-removal API. Extract its supported success and later-list outcomes so they can be reviewed without inventing a deletion UI or changing application behavior.

## What Changes

- Add requirements for an authorized ordinary-household DELETE of an existing member when persistence succeeds: 204 with no content, followed by absence from a subsequent successful family-list response.
- Use an unreferenced-member scenario and reuse existing household-access requirements. No connected UI caller was found.
- Keep FK effects, undocumented missing-ID/provider errors, authorization metadata differences and partial browser cleanup/recovery non-normative under A40/U25/U26.
- Record source support, test substitutions and scenario mapping in the [durable plan](../../../../docs/openspec-baseline-plan.md), BSL-020–022. Implementation/database qualification remains deferred under A34.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `household-identity`: add only the existing API member-removal success and subsequent list-absence requirements; preserve current requirements.

## Impact

Documentation only: proposal, identity delta, extraction design/tasks and durable plan. Reviewed boundaries are the family adapter/generated DELETE, OpenAPI, FamilyController/FamilyService, EF/SQL and subsequent list/current-identity reads. No application, test, contract, client, SQL, dependency or deployment edits. No deletion execution, services or database access. Human acceptance, main-spec promotion and archival remain separate; rename stays active and Profile switching remains a later slice.
