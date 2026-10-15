# Proposal

Archived 2026-10-15 under A25 after main-spec promotion. The text below records
the extraction-time scope and state; current main identity has 18 requirements/49
scenarios. See [archive record](tasks.md#archive-record--2026-10-15).

## Why

The accepted household-identity baseline begins with household access already established. This extraction documents the preceding ordinary-household passphrase, cookie and access-gate journey from repository behavior at commit `7e0dcdbe162704debe8a0f916eb1f7327afc77a5`, so later capabilities can reference an explicit shared-access owner.

## What Changes

- Add baseline requirements for passphrase entry, submission feedback/retry, access-cookie options, PWA access/context gate ordering and independent API household authentication.
- Extend only the `household-identity` specification through an ADDED delta. Preserve the five accepted member-selection requirements and their ten scenarios.
- Map supported observations to BSL-household-identity-003/004/005 in the [durable plan](../../../../docs/openspec-baseline-plan.md). This is documentation extraction; no application behavior changes.
- Keep absent server token-age enforcement outside normative claims under A17. Keep U14 cookie-auth contract metadata and U15 transport/automatic recovery gaps visible; do not turn them into guarantees or repairs.
- Stop at a validated draft for human review. Acceptance, promotion, archival and application changes require separate authorization.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `household-identity`: Add the shared-access slice before the existing member-selection handoff; no accepted requirement is modified or removed.

## Impact

Changes are limited to this change's proposal, delta spec, extraction design/tasks and the durable plan. Relevant implementation owners are Welcome and the Next server actions, PWA signing/proxy, API client/server fetch, API global authorization and Hearth authentication handler. They are evidence inputs, not edit targets.

Runtime API/browser/device checks remain not-run. Inspected tests establish assertion coverage and substitution limits only. OpenAPI, generated clients, application code/tests, SQL, dependencies, deployment and agent configuration remain unchanged. Demo/preview/Synology variants, invites/join, operator workflows, member creation and endpoint-specific personal-identity/ownership rules are outside this slice. Cross-origin cookie delivery, guaranteed retention, server token expiry, cookie-contract parity and universal API-401 recovery are excluded claims.
