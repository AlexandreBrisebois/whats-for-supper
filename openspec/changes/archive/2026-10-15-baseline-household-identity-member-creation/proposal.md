# Proposal

## Why

Ordinary-household member creation needs a reviewed specification covering its two entry points and their different identity handoffs. Discovery also found a success-status contract mismatch and absent name uniqueness; the user explicitly requested 201 contract alignment and a normative uniqueness rule for future work.

## What Changes

- Add member-creation requirements to household identity for shared form opening/cancellation, trimmed nonblank submission, pending feedback, successful persistence/list display, Settings selection retention and onboarding handoff.
- Require POST `/api/family` and its OpenAPI definition to use `201 Created` for successful creation, matching the existing controller rather than the current contract's 200/upsert wording.
- **BREAKING (future behavior):** Reject creation of a member whose trimmed name matches an existing household member ignoring casing, including concurrent creation attempts. Preserve the submitted name's casing for display. This is a user-directed requirement, currently unimplemented, not extracted baseline behavior.
- Preserve source-evidence limits around input loss, Settings error visibility and non-atomic identity handoff; do not turn them into desired recovery guarantees.
- This session creates planning artifacts and evidence only. Future contract/client/application/SQL/test changes require separate implementation authorization; acceptance, promotion and archival are not included.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `household-identity`: Add ordinary-household member creation and its caller-specific handoffs, document 201 success, and require trimmed, case-insensitive creation-name uniqueness.

## Impact

Current evidence: [durable plan](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline-plan.md), BSL-household-identity-009–011, source `moving-to-openspec` / `7e0dcdbe162704debe8a0f916eb1f7327afc77a5`. No runtime checks establish these paths in this session.

Future implementation affects `specs/openapi.yaml`, generated Kiota family client, family adapter/store/form consumers, `FamilyController`, `FamilyService`, EF/SQL persistence and API/browser tests/mocks. No new dependency is selected. Shared access, selection, lookup/recovery and Profile display reuse existing requirements. Rename/removal, invite/voting, deployment variants and existing duplicate-data remediation remain outside this creation draft; migration/collision policy must be reviewed before enforcement rollout.
