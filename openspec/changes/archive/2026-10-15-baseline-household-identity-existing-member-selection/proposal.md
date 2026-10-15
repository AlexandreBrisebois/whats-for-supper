# Proposal

## Why

WFS has no main OpenSpec baseline for selecting an existing household member. Capture this bounded journey from repository behavior at commit `7e0dcdbe162704debe8a0f916eb1f7327afc77a5` so later extraction can reference its actor-context rules.

## What Changes

- Add a documentation-only baseline delta for ordinary-household existing-member listing, selection, supported recovery and selected-name display.
- Describe successful selection under successful cookie writes, current-member resolution, and supported loading/recovery failures without promising atomic navigation or durable device persistence.
- Map every requirement/scenario to source and inspected test assertions in `docs/openspec-baseline-plan.md`; behavior is implementation-supported and runtime checks remain not-run.
- Retain contract gaps and disputed/incomplete behavior in the plan; exclude unknown-member 404, universal stale-identity rejection and interruption guarantees from normative claims.
- Stop at a validated draft for human review. Acceptance, main-spec promotion and archival require separate authorization.

## Capabilities

### New Capabilities

- `household-identity`: Existing-member selection and context recovery, a bounded first slice of the approved shared access/member-context owner. New specification coverage for existing behavior; no new application functionality.

### Modified Capabilities

None. The CLI reports no main specs. The deleted standalone navigation capability stays deleted.

## Impact

Only this change's planning artifacts and the durable baseline plan change. Source evidence spans onboarding/member controls, family store and cookie actions, generated family client/OpenAPI, family API/service and family-member persistence. No application code, tests, contracts, generated clients, SQL, dependencies or configuration change.

Passphrase entry, invitations, member mutation, preferences, demo/preview/Synology variants and broader workflow extraction are outside this slice. There are no unresolved intent decisions blocking supported claims; the plan retains evidence limitations under BSL-household-identity-001 and U13. The user accepted the bounded spec on 2026-10-15 and then explicitly requested a design document; the user separately authorized promotion on 2026-10-15 and the accepted delta is now in main specs; the user subsequently authorized archival on 2026-10-15 and the completed change is now archived.
