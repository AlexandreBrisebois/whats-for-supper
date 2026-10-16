# Household identity — member-context transport delta

## ADDED Requirements

<!--
**Evidence and status (non-normative):**

Draft for human review, implementation-supported only; no acceptance, promotion, archival or runtime qualification. A34 and BSL-household-identity-014–016/U22 remain deferred.

Historical BSL-015 review statement: “However, archived tasks claim completion while PostgreSQL qualification remains unresolved and later implementation/archive authorization is absent from the plan.” Subsequently the user reported later authorization and promised the original instruction/reference; that reference remains pending. This historical statement is not a product requirement or a new denial of the user-reported authority. No implementation acceptance or runtime qualification is inferred.
Non-normative review history is also rendered in design.md; comments are not promoted by archive.
-->

### Requirement: Carry browser member context on shared SDK requests

Requests through the shared browser API client SHALL send the selected member ID as `X-Family-Member-Id`, falling back to the readable member cookie when no selected ID is available. If neither supplies a value, this provider SHALL omit the member header. Household authentication SHALL follow `Authenticate protected API requests independently` separately.

#### Scenario: Selected member takes precedence in the browser
- **WHEN** a shared browser SDK request is prepared with a selected member and a different readable member cookie
- **THEN** its member header contains the selected ID

#### Scenario: Readable cookie supplies browser context
- **WHEN** a shared browser SDK request is prepared without a selected ID and with a readable member cookie
- **THEN** its member header contains the cookie value

#### Scenario: Browser has no readable member context
- **WHEN** neither selection nor readable member cookie supplies an ID for a shared browser SDK request
- **THEN** this provider adds no member header
- **AND** endpoint binding and validation still apply, including any server-readable cookie

### Requirement: Forward server-rendered household request context

Requests through the server API fetch helper SHALL forward a nonempty incoming member cookie as `X-Family-Member-Id` and a nonempty incoming household access cookie as `h_access` in the Cookie header. The member cookie SHALL replace a caller-supplied member header when present. This transport SHALL NOT establish member existence or successful household authentication.

#### Scenario: Server request has both context cookies
- **WHEN** the server fetch helper receives nonempty member and household access cookies
- **THEN** its API request carries the member cookie value in the member header and forwards the household access cookie

#### Scenario: Server cookie overrides supplied member header
- **WHEN** a server fetch caller supplies a member header and the incoming member cookie has a different nonempty value
- **THEN** the API request member header contains the incoming cookie value

### Requirement: Bind shared API member context independently of membership validation

For API actions using shared member-context binding, a parseable GUID in `X-Family-Member-Id` SHALL take precedence over the `x-family-member-id` cookie. Absent or unparseable headers SHALL allow a parseable cookie GUID to supply context. Binding SHALL NOT establish member existence, household access or permission for the operation; endpoint-specific checks SHALL remain separate.

#### Scenario: Parseable header wins over the cookie
- **WHEN** an authorized request to a shared-binding action supplies different parseable header and cookie GUIDs
- **THEN** binding supplies the header GUID without looking up membership or falling back based on membership

#### Scenario: Invalid header permits cookie fallback
- **WHEN** a shared-binding action receives an absent or malformed member header and a parseable member cookie
- **THEN** binding supplies the cookie GUID

#### Scenario: Neither transport supplies a GUID
- **WHEN** neither member header nor member cookie contains a parseable GUID
- **THEN** binding supplies no member identity and the action applies its own missing-context response
