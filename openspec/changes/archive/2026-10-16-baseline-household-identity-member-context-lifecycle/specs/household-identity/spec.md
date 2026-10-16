# Household identity — member-context lifecycle delta

<!--
**Evidence and status (non-normative):**

Draft for human review, implementation-supported only; no acceptance, promotion, archival or runtime qualification. A34 and BSL-household-identity-014–016/U22 remain deferred.

Historical BSL-015 review statement: “However, archived tasks claim completion while PostgreSQL qualification remains unresolved and later implementation/archive authorization is absent from the plan.” Subsequently the user reported later authorization and promised the original instruction/reference; that reference remains pending. This historical statement is not a product requirement or a new denial of the user-reported authority. No implementation acceptance or runtime qualification is inferred.
Non-normative review history is also rendered in design.md; comments are not promoted by archive.
-->

## ADDED Requirements

### Requirement: Set primary member identity-cookie options

The primary member-cookie action SHALL write the supplied ID as the HttpOnly `x-family-member-id` cookie with SameSite=Lax, path `/` and Max-Age 31,536,000 seconds. Configured domain inclusion and Secure selection SHALL follow the same conditions as `Set household access-cookie options`. These options SHALL NOT guarantee browser retention or completed identity handoff.

#### Scenario: Primary identity-cookie write succeeds
- **WHEN** the primary member-cookie action successfully writes a selected existing member's ID
- **THEN** it configures that ID's cookie as HttpOnly with SameSite=Lax, root path and one-year Max-Age
- **AND** domain and Secure options follow the existing access-cookie option conditions

### Requirement: Route hydrated landing context to the next household page

When the landing route reaches hydrated client identity validation, the application SHALL request Home if a member ID is selected, otherwise onboarding. This request SHALL NOT create or validate a member. Existing household page access, member resolution and recovery requirements SHALL continue to apply; a navigation request SHALL NOT guarantee arrival.

#### Scenario: Landing client has selected context
- **WHEN** hydrated client identity validation handles the landing route with a selected member ID
- **THEN** it requests replacement navigation to `/home` without creating or validating a member

#### Scenario: Landing client has no selected context
- **WHEN** hydrated client identity validation handles the landing route without a selected member ID
- **THEN** it requests replacement navigation to `/onboarding` subject to the existing page access rules
