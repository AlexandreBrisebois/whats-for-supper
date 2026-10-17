# Household identity Specification

## Purpose

Establish shared household access through passphrase entry and member invitations, apply household access-cookie and API authentication rules, and hand accepted access to separately owned member-context selection.

## Relocation provenance (non-normative)

The original preamble and qualification records above describe earlier combined-capability checkpoints. Their historical counts, exclusions and lifecycle status remain evidence, not current ownership. All applicable limitations continue to apply after relocation.

- [household-identity evidence record](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/household-identity.md)

## Capability dependencies (non-normative)

Preserved references to the former combined owners resolve through these current capability links. Each requirement retains its original normative text.

| Capability | Requirements / scenarios |
|---|---:|
| [household-identity](../household-identity/spec.md) | 12 / 37 |
| [household-members](../household-members/spec.md) | 14 / 35 |
| [member-context](../member-context/spec.md) | 16 / 33 |

- [Apply member context after household access](../member-context/spec.md#requirement-apply-member-context-after-household-access)
- [Set primary member identity-cookie options](../member-context/spec.md#requirement-set-primary-member-identity-cookie-options)
- [Select an existing member from onboarding](../member-context/spec.md#requirement-select-an-existing-member-from-onboarding)
- [Create and return a named household member](../household-members/spec.md#requirement-create-and-return-a-named-household-member)

## Requirements

PWA page-gate scenarios cover ordinary app routes such as `/home` and `/planner`, plus access to `/onboarding`. Public-entry, `/api` and static/internal bypass routes are outside these page-gate scenarios.

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

### Requirement: Generate a member invite link from Settings

Settings SHALL offer Invite for each displayed family member. Opening Invite SHALL show that member's name and request a link. Until a nonempty link is available, the dialog SHALL show generation feedback and disable its sharing controls. With a configured household secret and successful generation, it SHALL display a link at the current browser origin's `/invite` path with an encoded household-access token in `secret` and the target member ID in `memberId`.

#### Scenario: Open a member invite while generation is pending
- **WHEN** a person opens Invite for a displayed Settings member and no generated link is yet available
- **THEN** the dialog identifies that member, shows generation feedback and disables Copy and any displayed Share control

#### Scenario: Generation supplies the member link
- **WHEN** the household secret is configured and generation succeeds for the dialog's target member
- **THEN** the dialog displays the current-origin invite URL carrying the encoded token and member ID
- **AND** Copy and any displayed Share control are enabled

### Requirement: Copy share and dismiss the member invite dialog

With a generated link, the dialog SHALL offer Copy and offer Share when native sharing is available. Successful copying SHALL show temporary copied feedback. Share SHALL pass the generated link to native sharing. The dialog SHALL be dismissible through its Close control or surrounding overlay.

#### Scenario: Copy succeeds
- **WHEN** Copy is activated for a generated member link and the clipboard write succeeds
- **THEN** the generated link is copied and the dialog displays copied feedback for two seconds

#### Scenario: Native sharing is available
- **WHEN** native sharing is available and Share is activated for a generated member link
- **THEN** the application invokes native sharing with that link

#### Scenario: Native sharing is unavailable
- **WHEN** the browser does not provide native sharing
- **THEN** the dialog does not display Share
- **AND** Copy remains available once a link has been generated

#### Scenario: Close the dialog
- **WHEN** the person activates Close in the invite dialog
- **THEN** the dialog is dismissed

#### Scenario: Dismiss through the overlay
- **WHEN** the person clicks the surrounding overlay outside the invite dialog
- **THEN** the dialog is dismissed

### Requirement: Validate invite access before writing its access cookie

The invite page SHALL display joining feedback while processing. For a nonempty `secret` query value, it SHALL validate the household-access signature against the configured secret before writing that token to `h_access`. An accepted token and successful access-cookie write SHALL allow the invite to proceed to member-context handoff and navigation.

#### Scenario: Invite processing is pending
- **WHEN** the invite page is processing a supplied token and has not entered its error state
- **THEN** it displays joining feedback

#### Scenario: Accepted invite token establishes access
- **WHEN** an invite supplies a token accepted with the configured household secret and its access-cookie write succeeds
- **THEN** the application writes that token to the household-access cookie before proceeding with invite member context and navigation

### Requirement: Request the invited member context and default Home navigation

For an accepted invite supplying an existing member ID, after the access and initial member-cookie writes succeed, the application SHALL request selection of that member and mark onboarding complete. With no nonempty `redirect` parameter, it SHALL then request `/home`. Subsequent page gates, member resolution, recovery and selected-name display SHALL follow the existing household-identity requirements.

#### Scenario: Existing member invite requests Home
- **WHEN** an accepted invite supplies an existing member ID without a nonempty redirect, and its access and initial member-cookie writes succeed
- **THEN** the member cookie contains that ID, member selection is requested and onboarding is marked complete
- **AND** navigation to Home is requested subject to subsequent page and identity checks

#### Scenario: Invite supplies a different existing member
- **WHEN** the browser already has another selected member and opens an accepted invite for a different existing member without a nonempty redirect, and the initial cookie writes succeed
- **THEN** the application writes the invited member ID and requests selection of that member, marks onboarding complete and requests Home

### Requirement: Preserve member context when an invite supplies no member ID

After an accepted invite's access-cookie write succeeds, an absent or empty `memberId` SHALL leave existing member context and onboarding completion unchanged. With no nonempty `redirect`, the invite SHALL request `/home`, where the existing access and identity rules apply.

#### Scenario: Member ID is absent with existing context
- **WHEN** an accepted invite has no memberId or nonempty redirect, the browser has member context, and the access-cookie write succeeds
- **THEN** invite handling leaves that member context and onboarding completion unchanged and requests Home

#### Scenario: Member ID is empty without existing context
- **WHEN** an accepted invite has an empty memberId, no nonempty redirect and no existing member context, and the access-cookie write succeeds
- **THEN** invite handling does not select a member or mark onboarding complete and requests Home subject to the existing identity gate

### Requirement: Show invite rejection and offer Welcome recovery

A missing or empty token, rejected validation result or caught failure during validation or the initial access/member-cookie writes SHALL show the invalid-invite screen with a link to `/welcome`. Following that link SHALL open Welcome for the existing passphrase-entry journey.

#### Scenario: Token is absent or empty
- **WHEN** the invite has no nonempty secret query value
- **THEN** it shows the invalid-invite screen and Welcome link

#### Scenario: Token is rejected
- **WHEN** invite signature validation returns false for the supplied token
- **THEN** the invite shows the invalid-invite screen and Welcome link

#### Scenario: Household secret is unconfigured
- **WHEN** an invite supplies a token but the household secret is absent or empty at validation
- **THEN** validation rejects and the invite shows the invalid-invite screen and Welcome link

#### Scenario: Initial invite action fails
- **WHEN** validation or an initial access/member-cookie action throws during invite processing
- **THEN** the invite shows the invalid-invite screen and Welcome link

#### Scenario: Follow the recovery link
- **WHEN** a person follows the invalid-invite screen's Welcome link
- **THEN** the application opens `/welcome` for the existing passphrase-entry journey
