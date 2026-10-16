# Proposal

## Why

Household identity covers onboarding selection and Profile name display but lacks requirements for the connected Profile switching controls. Extract the supported menu, selection/Home request and Continue-as behavior for review without changing the application.

## What Changes

- Add the Profile member menu, loading placeholder, current-member marker and dismissal before selection.
- Add the Profile-specific member-selection/completion/Home request, conditional identity update, and Continue-as navigation without reselection.
- Reuse existing household access, family listing, current-member resolution, recovery and selected-name requirements.
- Keep U27/U28 pending/failure, freshness and qualification limits non-normative under the confirmed boundary. Record scenario mapping in the [durable plan](../../../../docs/openspec-baseline-plan.md), BSL-024/025.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `household-identity`: add only the connected Profile menu, unsubmitted dismissal, conditional selection/Home handoff and Continue-as requirements.

## Impact

Documentation only: proposal, ADDED delta, extraction design/tasks and durable plan. The inspected path is ProfilePage/ProfileDropdown → useFamily/familyStore → cookie actions, onboarding completion and router; shared API reads and gate/recovery owners are unchanged. No application, test, contract, generated client, SQL or configuration edits. No services, mutations or database qualification. Human acceptance, promotion and archival remain separate; rename/removal stay active, and recipe-library stays queued.
