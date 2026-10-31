# Proposal

## Why

Profile currently repeats the member task through a subtitle and a separate “Continue as NAME” button. The existing dropdown already displays the active member and requests Home when either the current member or another member is chosen.

## Outcome and Scope

Keep the English title exactly `Table's Set!` and the existing French title `À table !`. Remove the instructional subtitle and Continue-as in both locales. Keep the dropdown, Settings, language controls, accessibility treatment and existing selection/navigation consequences.

This is a bounded frontend presentation change. No backend, identity-cookie, onboarding, language persistence, shared navigation or global styling changes are proposed. No consequential decisions remain open.

## What Changes

- Remove “Pick a family member to get started.” and its French equivalent from Profile.
- Remove the separate “Continue as NAME” action in every Profile state.
- Retain current-member and different-member dropdown selection, including their existing selection, onboarding and Home request consequences.
- Remove the two now-unused EN/FR Profile translation keys after confirming no other consumers.
- Update affected page/browser tests and the current Profile user-flow documentation.
- Retire the main member-context Continue-as requirement and supersede the pending visual-language requirements that still name that action.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `member-context`: simplify Profile composition, preserve its title and member chooser, and remove the requirement for a separate Continue-as action.

## Impact

- Application: `pwa/src/app/(app)/profile/page.tsx` and EN/FR `common.json`.
- Acceptance: the adjacent page unit tests and `pwa/e2e/profile.spec.ts`, including readiness waits, layout target lists and language integration assertions that currently depend on `continue-as-btn`.
- Documentation: `docs/flows/user-flows/profile-member-selection.md`.
- Specification ordering: `align-profile-visual-language` is complete but remains active and unsynced. This change's modified visual requirements use its member-context delta as their base. At lifecycle reconciliation, sync that predecessor before this change; applying this change's delta first would modify requirements not yet in the main spec. Do not reapply the predecessor's Continue-as wording afterward. Neither change is synced or archived by this proposal.
- OpenAPI, generated clients and API mocks retain their existing contracts and behavior. No new package or migration is needed.
