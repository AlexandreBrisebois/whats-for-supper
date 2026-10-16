# Proposal

## Why

Household identity has no baseline requirements for the connected member-name editor, although onboarding and Settings already expose it. Extract the supported rename workflow so existing behavior and its limitations can be reviewed without implementing changes.

## What Changes

- Add only member-renaming requirements: open/cancel editing, trim and submit nonblank names, update the existing member through PUT, and display the returned name without changing selected identity.
- Reuse accepted household-access, member-context and selected-name display requirements.
- Keep U23 validation/constraint differences and U24 failure/pending limitations outside normative claims. Do not extend creation's desired duplicate-name policy to rename.
- Record extraction evidence and scenario mapping in the [durable plan](../../../../docs/openspec-baseline-plan.md), BSL-018/019. Runtime and implementation work remain deferred under A34.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `household-identity`: add the existing ordinary-household member-renaming workflow; preserve all current requirements.

## Impact

Documentation only: this proposal, identity delta, extraction design/tasks and durable plan. Source boundaries reviewed are FamilyMemberList, family store/adapter/generated item PUT, OpenAPI, FamilyController/FamilyService and family-member persistence. No application, tests, API contracts, generated clients, SQL, dependencies or deployment changes. No acceptance, main-spec promotion or archival in this drafting session; API removal and Profile switching remain separate slices.
