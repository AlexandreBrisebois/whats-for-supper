# Household identity — API member-removal delta

## Evidence and status (non-normative)

This documentation-only baseline draft uses implementation-supported evidence in the [durable plan](../../../../../docs/openspec-baseline-plan.md), BSL-020–022. Runtime API/browser/PostgreSQL checks are not-run; implementation/database qualification remains deferred under A34. U25/U26 remain non-normative under A40: no connected deletion UI, referenced-member safety, complete error-contract parity or browser cleanup/recovery guarantee is asserted.

Historical member-creation limitation retained under BSL-015/U22:

> However, archived tasks claim completion while PostgreSQL qualification remains unresolved and later implementation/archive authorization is absent from the plan.

That sentence records the earlier review state. The user's report of later authorization remains recorded; its original reference is pending. It is not a removal requirement, new archival approval or runtime result.

## ADDED Requirements

### Requirement: Remove an existing household member through the API

For an authorized ordinary-household DELETE `/api/family/{id}` identifying an existing member, when persistence succeeds the API SHALL remove that member and return `204 No Content` with no response body. Household authorization SHALL follow the existing shared-access requirements.

#### Scenario: Remove an unreferenced member
- **WHEN** an authorized ordinary-household API consumer sends DELETE `/api/family/{id}` for an existing unreferenced member and persistence succeeds
- **THEN** the member is removed and the response is 204 with no response body

### Requirement: Exclude a removed member from subsequent family listing

After successful API removal, a subsequent successful authorized GET `/api/family` SHALL omit the removed member's ID from its `data` member list.

#### Scenario: List members after removal
- **WHEN** API removal of an existing unreferenced member succeeds and a subsequent authorized GET `/api/family` succeeds
- **THEN** the returned `data` member list does not contain the removed member's ID
