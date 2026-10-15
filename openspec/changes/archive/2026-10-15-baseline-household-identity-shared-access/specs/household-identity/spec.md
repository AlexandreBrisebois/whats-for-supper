# Household identity shared-access delta

PWA page-gate scenarios cover ordinary app routes such as `/home` and `/planner`, plus access to `/onboarding`. Public-entry, `/api` and static/internal bypass routes are outside these page-gate scenarios.

## ADDED Requirements

### Requirement: Enter the household with its shared passphrase

With a configured household secret, Welcome SHALL compare the submitted passphrase and secret case-sensitively after trimming surrounding whitespace. On a match it SHALL obtain a signed household-access token, await writing its access cookie and request navigation to `/onboarding`. This entry SHALL establish shared access without creating a personal account or selecting a member.

#### Scenario: Matching passphrase establishes access
- **WHEN** a visitor submits a matching passphrase and token generation and cookie writing succeed
- **THEN** the application writes the signed household-access cookie before requesting onboarding
- **AND** member selection remains a separate step

#### Scenario: Surrounding whitespace is ignored
- **WHEN** submitted and configured passphrases differ only in surrounding whitespace and token generation and cookie writing succeed
- **THEN** entry succeeds and requests onboarding

### Requirement: Give passphrase submission feedback and allow retry

Welcome SHALL disable Enter for whitespace-only input and during submission, and display checking feedback while submitting. A rejected passphrase result SHALL show an incorrect-passphrase message; an action or cookie-write exception SHALL show a generic retry message. After either failure it SHALL end checking, retain the input and allow resubmission of nonblank input. A new submission SHALL clear the previous error.

#### Scenario: Empty input cannot be submitted through Enter
- **WHEN** Welcome input is empty or contains only whitespace
- **THEN** Enter is disabled

#### Scenario: Submission is pending
- **WHEN** a passphrase submission has started and has not finished
- **THEN** Enter is disabled and checking feedback is displayed

#### Scenario: Incorrect passphrase can be corrected
- **WHEN** a submission does not match the configured secret
- **THEN** Welcome displays the incorrect-passphrase message and retains the input
- **AND** checking ends and the visitor can edit and resubmit nonblank input, clearing the previous error

#### Scenario: Missing secret produces rejection feedback
- **WHEN** the household secret is absent or empty when the passphrase action runs
- **THEN** Welcome displays the incorrect-passphrase message and ends checking without requesting onboarding

#### Scenario: Submission exception permits another attempt
- **WHEN** the authentication action or access-cookie write throws
- **THEN** Welcome displays the generic retry message and retains the input
- **AND** checking ends and the visitor can resubmit nonblank input

### Requirement: Set household access-cookie options

The passphrase entry flow SHALL write its signed token as the HttpOnly `h_access` cookie with SameSite=Lax, path `/` and Max-Age of 31,536,000 seconds. It SHALL include the configured cookie domain when provided. It SHALL set Secure only in production when the public environment is not `test` and the configured domain does not contain `localhost`.

#### Scenario: Access cookie is written with configured scope
- **WHEN** successful passphrase entry writes the access cookie with an optional configured domain
- **THEN** the cookie has the stated HttpOnly, SameSite, path and Max-Age options
- **AND** Domain is included when configured and omitted otherwise

#### Scenario: Production secure-cookie conditions apply
- **WHEN** the cookie is written in production with a non-test public environment and no configured domain containing `localhost`
- **THEN** Secure is enabled

#### Scenario: Secure-cookie conditions do not apply
- **WHEN** the cookie is written outside production, in public environment `test`, or with a configured domain containing `localhost`
- **THEN** Secure is disabled

### Requirement: Gate protected page entry with household access

For page requests subject to the PWA access gate, including `/onboarding`, the application SHALL require a configured secret and an access cookie accepted by its signature validation. Missing or rejected access SHALL redirect to `/welcome`. If a nonempty access cookie is present when access is rejected, the redirect response SHALL request its deletion.

#### Scenario: Access is missing despite a member selection
- **WHEN** a gated page request has a member cookie but no household-access cookie
- **THEN** the application redirects to Welcome

#### Scenario: Access cookie is rejected
- **WHEN** a gated page request supplies a nonempty access cookie whose signature is rejected
- **THEN** the application redirects to Welcome and requests deletion of the access cookie

#### Scenario: Page gate has no secret configured
- **WHEN** a gated page request reaches the application with no configured household secret
- **THEN** the application redirects to Welcome

#### Scenario: Valid access reaches onboarding
- **WHEN** an onboarding request supplies an access cookie accepted with the configured secret
- **THEN** the household-access gate permits onboarding without requiring member selection first

### Requirement: Apply member context after household access

For app page requests subject to both PWA gates, the application SHALL check household access before checking member context. Once household access is accepted, an absent or empty member cookie SHALL redirect to `/onboarding`; a nonempty member cookie SHALL pass this page-context gate. Subsequent member resolution SHALL follow the existing household-identity requirements.

#### Scenario: Access is accepted but member context is absent
- **WHEN** a page request subject to both gates has accepted household access and no nonempty member cookie
- **THEN** the application redirects to onboarding

#### Scenario: Both page-gate inputs are present
- **WHEN** a page request subject to both gates has accepted household access and a nonempty member cookie
- **THEN** it passes these two page gates
- **AND** member existence and recovery remain subject to the existing identity requirements

### Requirement: Authenticate protected API requests independently

API controller operations covered by household authorization SHALL authenticate shared access independently of the PWA page gate. An exact `X-Hearth-Secret` value or a signed HMAC Bearer token matching the configured secret SHALL satisfy household authentication. With no household credentials, or with only a rejected raw-secret header, they SHALL return 401. Endpoint-specific identity and eligibility checks SHALL remain separate.

#### Scenario: Raw household secret satisfies API authentication
- **WHEN** a protected API request supplies the exact configured household secret in `X-Hearth-Secret`
- **THEN** household authentication succeeds and the request proceeds to endpoint-specific checks

#### Scenario: Signed Bearer token satisfies API authentication
- **WHEN** a protected API request supplies a correctly signed household token in its Bearer Authorization header
- **THEN** household authentication succeeds and the request proceeds to endpoint-specific checks

#### Scenario: Protected API request has no household credentials
- **WHEN** a protected API request supplies no household-access credentials, even if a member ID is present
- **THEN** the API returns 401 without relying on a PWA page redirect

#### Scenario: Raw secret is rejected
- **WHEN** a protected API request supplies only an incorrect raw-secret header as its household credential
- **THEN** the API returns 401

### Requirement: Exempt health from household authentication

GET `/api/health` SHALL permit requests without household credentials. This exemption SHALL concern authentication only and SHALL NOT guarantee the health of backing services.

#### Scenario: Health is requested without access
- **WHEN** a request to GET `/api/health` supplies no household credentials
- **THEN** it proceeds to the health operation without a household-authentication challenge
