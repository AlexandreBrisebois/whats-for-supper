# Spec Delta

## Purpose

Select and recover the active household member and carry that context through browser and server requests, preserving the distinction between context binding, member existence and shared household access.

## ADDED Requirements

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

### Requirement: Apply member context after household access

For app page requests subject to both PWA gates, the application SHALL check household access before checking member context. Once household access is accepted, an absent or empty member cookie SHALL redirect to `/onboarding`; a nonempty member cookie SHALL pass this page-context gate. Subsequent member resolution SHALL follow the existing household-identity requirements.

#### Scenario: Access is accepted but member context is absent
- **WHEN** a page request subject to both gates has accepted household access and no nonempty member cookie
- **THEN** the application redirects to onboarding

#### Scenario: Both page-gate inputs are present
- **WHEN** a page request subject to both gates has accepted household access and a nonempty member cookie
- **THEN** it passes these two page gates
- **AND** member existence and recovery remain subject to the existing identity requirements

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
