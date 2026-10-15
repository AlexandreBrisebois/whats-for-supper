# Spec Delta

## ADDED Requirements

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
