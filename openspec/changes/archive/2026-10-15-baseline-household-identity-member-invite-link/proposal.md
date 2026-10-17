# Proposal

Archived 2026-10-15 under A25 after main-spec promotion. The text below records
the extraction-time scope and state; current main identity has 18 requirements/49
scenarios. See [archive record](tasks.md#archive-record--2026-10-15).

## Why

The household-identity baseline covers shared access and existing-member selection but does not yet describe the connected member invite-link journey. Extracting that journey from repository commit `7e0dcdbe162704debe8a0f916eb1f7327afc77a5` makes its sharing, entry and recovery boundaries reviewable without changing application behavior.

## What Changes

- Add the ordinary-household member invite-link slice: Settings generation, Copy/native Share, validation, supported cookie/member-context handoff, default navigation and visible rejection/Welcome recovery.
- Add requirements only to `household-identity` through an ADDED delta, reusing its existing shared-access, page-gate, member-resolution and recovery requirements. Preserve the main spec's 12 requirements/31 scenarios.
- Map each addition to BSL-household-identity-006/007/008 in the [durable plan](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline-plan.md).
- Retain absent token-age enforcement under A17 and U16–U18 under A22 as non-normative limitations. Withhold personal authentication, signed member binding, invite-time eligibility, atomic completion, safe arbitrary redirects and universal recovery guarantees.
- Create documentation-only extraction design/tasks under A23; stop at a validated draft for human review. No acceptance, promotion, archival or application work follows from this draft.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `household-identity`: Add the member invite-link journey to the existing rule owner; no existing requirement is modified or removed.

## Impact

Only this change's proposal, identity delta, extraction design/tasks, CLI metadata and durable plan are edit targets. Evidence inputs include Settings family controls, InviteLinkDialog, auth server actions/token utilities, InvitePage, family/onboarding stores, page gates and subsequent API member lookup. No application code/tests, OpenAPI/generated clients, SQL, dependencies, deployment or agent configuration changes are proposed.

Voting-link generation and voting, member creation/rename/removal, operator permissions and demo/preview/Synology variants are excluded. Runtime browser/API/database/device checks remain not-run; inspected tests supply assertion and substitution limits only. U08's ownership boundary and U13/U14/U15 remain unresolved. A22 settles extraction treatment, not defect repair or desired future behavior.
