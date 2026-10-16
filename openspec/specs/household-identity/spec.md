# Household identity Specification

## Purpose

Let a person with household access select an existing family member and use that member's identity in household journeys. This initial slice covers ordinary-household listing, selection, supported recovery and visible selected-name display.

## Requirements

PWA page-gate scenarios cover ordinary app routes such as `/home` and `/planner`, plus access to `/onboarding`. Public-entry, `/api` and static/internal bypass routes are outside these page-gate scenarios.

### Requirement: List existing household members for selection

With household access established, onboarding SHALL offer the existing members returned by the family API as named selection controls. It SHALL display a loading message during member loading and an alert when the family-list request fails.

#### Scenario: Existing members are available
- **WHEN** onboarding successfully loads a nonempty family-member list
- **THEN** it offers each returned member by name for selection

#### Scenario: The household has no members
- **WHEN** onboarding successfully loads an empty family-member list
- **THEN** it displays the no-members message

#### Scenario: Member loading fails
- **WHEN** the family-list request made by onboarding fails
- **THEN** onboarding displays the loading error as an alert

### Requirement: Select an existing member from onboarding

When a person selects an existing member at onboarding and the identity-cookie writes succeed, the application SHALL record that member as the active browser identity and request navigation to Home. Selection SHALL use the existing member without creating a new member record.

#### Scenario: Successful existing-member selection
- **WHEN** a person with household access selects a listed member and the identity-cookie writes succeed
- **THEN** that member becomes the active browser identity
- **AND** the application requests navigation to Home without creating a new family member

### Requirement: Resolve the current member through the API

For an authorized household API request, GET `/api/family/me` SHALL resolve the member from a valid GUID in `X-Family-Member-Id`, falling back to the `x-family-member-id` cookie if the header is absent or not a valid GUID. For an existing member it SHALL return that member's profile in the `data` envelope. With neither a valid header nor a valid cookie identity it SHALL return 401.

#### Scenario: Header identity takes precedence
- **WHEN** an authorized request supplies a valid header GUID identifying an existing member and a cookie identifying a different member
- **THEN** the API returns the header-selected member's profile in `data`

#### Scenario: Cookie supplies the member identity
- **WHEN** an authorized request has no valid GUID in the identity header and supplies a cookie GUID identifying an existing member
- **THEN** the API returns the cookie-selected member's profile in `data`

#### Scenario: No parseable member identity is supplied
- **WHEN** an authorized request supplies neither a valid identity header GUID nor a valid identity cookie GUID
- **THEN** the current-member API returns 401

### Requirement: Recover identity when the protected client has no selection

When a protected page reaches client identity validation with neither an active selection nor a readable member cookie, the application SHALL attempt current-member API recovery. A successful profile response SHALL restore the selected member and make that member available for selected-name display. If recovery yields no member and no selection appears before the recovery check finishes, it SHALL request onboarding.

#### Scenario: Recover a server-readable identity
- **WHEN** protected client validation has neither a selected member nor a readable member cookie, and the current-member API receives a valid identity and successfully returns its profile
- **THEN** the application restores that member as the active selection and makes that member available for selected-name display

#### Scenario: Recovery yields no member
- **WHEN** protected client validation has neither a selected member nor a readable member cookie, current-member recovery yields no profile, and no selection appears before the recovery check finishes
- **THEN** the application requests navigation to onboarding

### Requirement: Display the selected member on Profile

When the selected member ID matches a loaded member, Profile SHALL display that member's name as the active member. Member-ID matching SHALL be case-insensitive.

#### Scenario: Display a loaded selected member
- **WHEN** Profile has a selected member ID matching a loaded member ID, including a difference only in letter case
- **THEN** its active-member control displays that member's name

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

### Requirement: Open and cancel the member-creation form

Onboarding and Settings SHALL offer an add-member control that opens a name-entry form. Cancel SHALL hide that form. Reopening a cancelled form SHALL start with an empty name and no local name-validation error. Onboarding SHALL also offer creation when a member is already selected.

#### Scenario: Open from onboarding
- **WHEN** a person with household access activates add-member on onboarding
- **THEN** the name-entry form and Cancel control are displayed

#### Scenario: Open from Settings
- **WHEN** a person on Settings activates add-member
- **THEN** the same name-entry form and Cancel control are displayed

#### Scenario: Cancel and reopen
- **WHEN** a person enters a name or triggers a local blank-name error, cancels, and reopens the form
- **THEN** the reopened form has an empty name and no local name-validation error

#### Scenario: Create while switching members
- **WHEN** onboarding has an existing selected member
- **THEN** add-member remains available alongside member selection

### Requirement: Submit a trimmed nonblank member name

The member-creation form SHALL trim surrounding whitespace before submission. Empty or whitespace-only input SHALL display a local name error without requesting creation. Editing the input SHALL clear that local error. The remaining name's casing SHALL be preserved for display.

#### Scenario: Name has surrounding whitespace
- **WHEN** a person submits ` Alex ` through the member-creation form
- **THEN** the creation request contains the name `Alex`

#### Scenario: Name is blank
- **WHEN** a person submits empty or whitespace-only input
- **THEN** the form displays a name error and sends no creation request

#### Scenario: Correct the local name error
- **WHEN** a person edits the input after a blank-name error
- **THEN** the local error clears

### Requirement: Display member-creation pending feedback

While the family form is busy with a pending creation request, it SHALL disable the name input and submit control and display submission progress. This feedback SHALL NOT imply request idempotency or atomic identity handoff.

#### Scenario: Creation request is pending
- **WHEN** a submitted creation request is pending
- **THEN** the form disables input and submission and displays a progress indicator

### Requirement: Create and return a named household member

For an authorized ordinary-household request with a valid nonconflicting name, POST `/api/family` SHALL persist a new member and return `201 Created` with that member in the `data` envelope. It SHALL preserve trimmed display casing, assign a nonempty unique ID, default browse mode to `stack` and preferred language to null, and include creation/update timestamps. The OpenAPI operation SHALL document creation with a `201` success response rather than `200` or upsert semantics.

#### Scenario: Successful creation response
- **WHEN** an authorized POST submits a valid nonconflicting name and persistence succeeds
- **THEN** the response is 201 with the created ID, trimmed name, default preferences and timestamps in `data`

#### Scenario: Created member can be listed
- **WHEN** creation succeeds and a subsequent authorized family-list request succeeds
- **THEN** the list contains the created member's ID and name

#### Scenario: OpenAPI describes implemented success
- **WHEN** the POST `/api/family` operation is inspected in OpenAPI
- **THEN** it describes creation with a 201 success response and the member `data` envelope
- **AND** it does not describe that operation as an upsert or use 200 for creation success

### Requirement: Prevent duplicate member names during creation

Member creation MUST return `409 Conflict` when its submitted name, after trimming surrounding whitespace and ignoring casing, matches an existing household member's name. Rejection MUST leave existing members unchanged and MUST NOT create another member or select an existing member automatically. Concurrent creation requests for equivalent names MUST NOT persist more than one new member. Successful creation SHALL preserve the trimmed submitted casing for display.

#### Scenario: Exact duplicate is rejected
- **WHEN** a member named `Alex` exists and creation submits `Alex`
- **THEN** creation returns 409 without adding or changing a member or automatically selecting Alex

#### Scenario: Casing variant is rejected
- **WHEN** a member named `Alex` exists and creation submits `alex`
- **THEN** creation returns 409 without creating another member

#### Scenario: Whitespace variant is rejected
- **WHEN** a member named `Alex` exists and creation submits ` Alex `
- **THEN** creation returns 409 without creating another member

#### Scenario: Compare against a stored whitespace variant
- **WHEN** an existing member's stored name is ` Alex ` and creation submits `alex`
- **THEN** creation returns 409 because both names are compared after trimming and ignoring casing

#### Scenario: Equivalent names are created concurrently
- **WHEN** no matching member exists and concurrent creation requests submit `Alex` and ` alex `
- **THEN** at most one request creates a member and other equivalent requests receive 409

#### Scenario: Distinct name keeps display casing
- **WHEN** creation submits the valid nonconflicting name ` aLeX ` and succeeds
- **THEN** the created member's displayed name is `aLeX`

### Requirement: Display the created member without switching Settings identity

After a successful member response, the application SHALL make the returned member available in the displayed family list. Creation in Settings SHALL leave the current member selection, identity cookies, onboarding completion and route unchanged. The Settings form SHALL remain open with an empty name after successful submission.

#### Scenario: Settings creation preserves current context
- **WHEN** a person with an existing selected member successfully creates another member in Settings
- **THEN** the new member appears in the list while the existing selection and identity cookies remain unchanged
- **AND** creation does not change onboarding completion or navigate away

#### Scenario: Settings form resets after success
- **WHEN** a Settings creation submission succeeds
- **THEN** the form remains visible with an empty name

### Requirement: Request onboarding identity handoff after creation

After onboarding creation returns a member, the application SHALL attempt to write that member's identity cookie. When that initial write succeeds, it SHALL request selection of that member, mark onboarding complete and request Home navigation. Subsequent selection, page gates, lookup, recovery and Profile display SHALL follow existing household-identity requirements; creation SHALL NOT imply atomic completion of those steps.

#### Scenario: New member requests Home
- **WHEN** onboarding creation succeeds and the initial identity-cookie write succeeds
- **THEN** selection of the created member is requested, onboarding is marked complete and navigation to Home is requested

#### Scenario: Creation while another member is selected
- **WHEN** onboarding has another selected member, creation succeeds and the initial identity-cookie write succeeds
- **THEN** the handoff requests selection of the newly created member and Home navigation

### Requirement: Open an existing household member name for editing

Onboarding and Settings SHALL offer editing for each displayed household member. Activating Edit SHALL show a name input prefilled with that member's loaded name, together with Save and Cancel controls. Opening the editor SHALL leave the current selected member unchanged.

#### Scenario: Edit from onboarding
- **WHEN** a person activates Edit for a listed member on onboarding
- **THEN** the member's loaded name appears in the editor with Save and Cancel
- **AND** opening the editor does not select that member

#### Scenario: Edit from Settings
- **WHEN** a person activates Edit for a displayed member in Settings
- **THEN** the member's loaded name appears in the editor with Save and Cancel
- **AND** opening the editor leaves the current selection unchanged

### Requirement: Cancel an unsubmitted member-name edit

Before an update is submitted, Cancel or Escape SHALL close the member-name editor without requesting a name update. Reopening the editor SHALL prefill the member's currently loaded name rather than the discarded input.

#### Scenario: Cancel through the control
- **WHEN** a person edits a member's name and activates Cancel before submitting
- **THEN** the editor closes without a name-update request or change to the displayed member name

#### Scenario: Cancel with Escape
- **WHEN** a person presses Escape in an unsubmitted member-name editor
- **THEN** the editor closes without requesting a name update

#### Scenario: Reopen after cancellation
- **WHEN** a person reopens a member's editor after cancelling unsaved input
- **THEN** the input contains that member's currently loaded name

### Requirement: Submit a trimmed nonblank member-name edit

For a nonblank edited name, Save or Enter SHALL request an update for the edited member's ID using the name with surrounding whitespace trimmed and remaining casing preserved. Trimmed-blank input SHALL disable Save and SHALL NOT issue an update through Enter.

#### Scenario: Submit with Save
- **WHEN** a person enters the valid nonconflicting name ` Jordan Chef ` and activates Save
- **THEN** the application requests an update for the edited member's ID with name `Jordan Chef`

#### Scenario: Submit with Enter
- **WHEN** a person enters a valid nonconflicting name and presses Enter in the editor
- **THEN** the application requests the same trimmed-name update for that member

#### Scenario: Blank name is not submitted
- **WHEN** the edited name is empty or whitespace-only
- **THEN** Save is disabled and pressing Enter does not request an update

### Requirement: Update and return the existing household member

For an authorized ordinary-household PUT `/api/family/{id}` with an existing ID and valid nonconflicting name, when persistence succeeds the API SHALL update that member's name and updated timestamp, retain its ID, creation timestamp and preferences, and return `200 OK` with the updated member in `data`. The saved name SHALL be trimmed while preserving remaining casing.

#### Scenario: Successful rename response
- **WHEN** an authorized PUT supplies an existing member ID and a valid nonconflicting name, and persistence succeeds
- **THEN** the response is 200 with the same ID, trimmed name, updated timestamp and unchanged creation timestamp and preferences in `data`

#### Scenario: Saved name is available on later listing
- **WHEN** a rename succeeds and a subsequent authorized family-list request succeeds
- **THEN** the list contains the existing member ID with its updated name

### Requirement: Display a renamed member without changing active identity

After a successful rename response, the application SHALL display the returned name in the edited member's list row and close the editor. Renaming SHALL leave the selected member ID, identity cookies, onboarding completion and route unchanged. Renaming the selected member SHALL make its updated name available to existing selected-name display behavior.

#### Scenario: Rename another member
- **WHEN** a person successfully renames a listed member other than the active member
- **THEN** the edited row displays the returned name and the editor closes
- **AND** selected ID, identity cookies, onboarding completion and route remain unchanged

#### Scenario: Rename the selected member
- **WHEN** a successful rename response updates the currently selected member
- **THEN** its list row displays the returned name and the editor closes
- **AND** active identity remains the same ID with the updated name available to selected-name display

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

### Requirement: Offer the loaded household members in the Profile menu

Profile SHALL offer an active-member control that opens its loaded members as named choices on Profile without changing identity or navigating. The menu SHALL mark the currently selected member using case-insensitive ID matching. While family members are loading, Profile SHALL show a loading placeholder in place of the control. Selected-name display SHALL follow the existing Profile display requirement.

#### Scenario: Open choices on Profile
- **WHEN** a person on Profile opens the active-member control with a loaded member list
- **THEN** Profile displays each loaded member as a named choice without changing identity or navigating

#### Scenario: Mark the current member
- **WHEN** the open Profile menu contains a member matching the selected ID, including a difference only in letter case
- **THEN** that choice is marked as the current family member

#### Scenario: Family loading is pending
- **WHEN** family members are loading on Profile
- **THEN** Profile shows a loading placeholder in place of the active-member control

### Requirement: Dismiss the Profile member menu before selection

Closing the open Profile member menu through its toggle or an outside mouse press SHALL hide the choices without selecting a member, writing identity cookies, changing onboarding completion or requesting navigation. This dismissal SHALL apply before a member choice is activated.

#### Scenario: Close through the toggle
- **WHEN** a person closes the open Profile member menu through its toggle before choosing a member
- **THEN** the choices disappear and identity cookies, member selection, onboarding completion and route remain unchanged by the dismissal

#### Scenario: Close outside the menu
- **WHEN** a person presses the mouse button outside the open Profile member menu before choosing a member
- **THEN** the choices disappear and identity cookies, member selection, onboarding completion and route remain unchanged by the dismissal

### Requirement: Request member selection and Home from Profile

Choosing a loaded member in the Profile menu SHALL close the menu, request that member's selection, mark onboarding complete and request Home. When the identity-cookie actions succeed, the chosen member SHALL become the active browser identity without creating a member. Subsequent access, identity resolution, recovery and selected-name display SHALL follow existing requirements; Home arrival with the new identity is not guaranteed by the request.

#### Scenario: Choose a different loaded member
- **WHEN** a person with one selected member chooses a different loaded member in the Profile menu and the identity-cookie actions succeed
- **THEN** the menu closes, onboarding is marked complete and Home navigation is requested
- **AND** the chosen member becomes the active browser identity without creating a member

#### Scenario: Choose the current member again
- **WHEN** a person chooses the already selected member in the Profile menu and the identity-cookie actions succeed
- **THEN** selection of that member is requested again, the menu closes, onboarding is marked complete and Home navigation is requested
- **AND** the active member remains that member without creating another member

### Requirement: Continue from Profile with the loaded selected member

When Profile has a loaded selected member, it SHALL offer a Continue-as control displaying that member's name. Activating it SHALL request Home navigation without requesting member selection, writing identity cookies or changing onboarding completion. Subsequent page access and identity checks SHALL follow existing requirements.

#### Scenario: Continue as the selected member
- **WHEN** Profile has a loaded selected member and a person activates Continue-as
- **THEN** Home navigation is requested for the existing context without requesting a new selection, writing identity cookies or changing onboarding completion

### Requirement: Attribute initial URL and photo captures to the bound member

For authorized ordinary-household URL or photo capture with an existing bound member, when initial persistence succeeds, the API SHALL record that member's ID as `addedBy` in both the recipe row and initial recipe metadata. This attribution SHALL identify the submitting member without establishing a personal account or exclusive ownership of the shared recipe. Capture acceptance, dispatch and readiness SHALL follow recipe-capture requirements.

#### Scenario: Attribute a successfully persisted URL intake
- **WHEN** POST `/api/recipes/capture-url` binds an existing member and initial persistence succeeds
- **THEN** the new recipe row and initial recipe metadata record that member as addedBy
- **AND** this records the submitter without certifying background completion

#### Scenario: Attribute a successfully persisted photo intake
- **WHEN** POST `/api/recipes` binds an existing member and initial photo persistence succeeds
- **THEN** the new recipe row and initial recipe metadata record that member as addedBy
- **AND** this records the submitter without certifying background completion

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
