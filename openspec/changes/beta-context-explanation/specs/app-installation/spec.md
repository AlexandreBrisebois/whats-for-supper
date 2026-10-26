# Beta release context delta

## ADDED Requirements

### Requirement: Offer reopenable Beta release context
The Beta-only Welcome screen and ordinary app shell SHALL provide the same compact pale sage band with charcoal text and shared responsive explanation surface as Demo, with Beta-specific pre-release copy in EN/FR. Dismissal SHALL leave the band available. Opening and closing SHALL preserve route, drafts, household/member state, login input and existing feature availability.

#### Scenario: Open and reopen Beta context
- **WHEN** a visitor activates the Beta context band on Beta-only Welcome or an ordinary Beta-only app route
- **THEN** one named explanation opens with Start exploring and explicit Close actions
- **AND** both the band label and modal title use Beta · Better with your ideas in English and Bêta · Meilleure grâce à vos idées in French, on Welcome and in the app shell
- **AND** either action closes it without navigation or household mutation, and the band can reopen it

#### Scenario: Truthful pre-release copy
- **WHEN** the Beta-only explanation is displayed
- **THEN** it uses the reviewed EN/FR pre-release copy in the design, without claiming a sample/shared visitor household, scheduled resets, disabled AI, reliability, privacy or data-loss guarantees
- **AND** Beta presentation does not grant access or change feature availability

### Requirement: Invite voluntary Beta feedback through GitHub
The Beta explanation SHALL link to verified repository GitHub feedback, not Demo's installation link, with an account-required notice. Use the approved template when available, otherwise the Issues index. Only explicit activation SHALL open it, without automatic submission, prefilled data or tracking parameters; a static template selector is allowed. The link SHALL NOT acknowledge context or change app route, input or household state. Demo SHALL retain its installation link.

#### Scenario: Voluntary feedback destination
- **WHEN** a visitor activates the Beta feedback link from Welcome or the app shell
- **THEN** the destination opens the approved feedback template in the AlexandreBrisebois/whats-for-supper GitHub repository in a new browsing context using the existing external-link safety convention
- **AND** the template and exact destination are verified before use; if unavailable, the link uses https://github.com/AlexandreBrisebois/whats-for-supper/issues without claiming a template is available
- **AND** no issue is created or submitted by the app and no passphrase, household, member, recipe or other app data is attached to the destination

#### Scenario: Feedback remains optional and accessible
- **WHEN** the explanation renders or the external destination cannot open
- **THEN** no automatic external navigation or acknowledgement occurs, and the existing dismiss/reopen flow remains usable
- **AND** the link has a descriptive localized GitHub name, an account-required notice, visible keyboard focus and at least a 44px touch target within the modal tab order

#### Scenario: Low-friction feedback template
- **WHEN** a visitor opens the approved GitHub feedback template
- **THEN** plain-language prompts help describe the task, experience or suggestion without requiring technical reproduction steps, diagnostics or a screenshot
- **AND** optional device/version information is manually supplied, with a visible reminder that issues are public and must not contain passphrases, personal information or sensitive screenshots
- **AND** only the visitor's explicit GitHub submission creates an issue; the app does not submit or populate personal data

### Requirement: Offer manual Beta context on Welcome
Welcome SHALL select manual release context from server-resolved installation identity: Beta with non-demo identity offers Beta, installation Demo retains Demo, and stable non-demo offers neither. It SHALL NOT automatically open an explanation or use runtime health to select Welcome context. Beta SHALL replace its tiny Welcome note, not duplicate it, without granting access.

#### Scenario: Beta Welcome without interaction
- **WHEN** Welcome renders with server-resolved Beta channel and non-demo installation identity
- **THEN** one Beta band appears above the login form without an open explanation or duplicate tiny Beta note
- **AND** activating it opens the same Beta copy and dismissal controls as the app shell without submitting the form

#### Scenario: Welcome identity remains separate from runtime policy
- **WHEN** Welcome resolves installation Demo, stable non-demo or Beta non-demo identity, irrespective of a later app-shell runtime status
- **THEN** its manual presentation follows that installation identity without claiming API mode or feature availability
- **AND** Demo-on-Beta retains one Demo explanation with the accessible Beta-channel description and no Beta introduction

#### Scenario: Beta preserves ordinary login
- **WHEN** a Beta-only visitor opens, closes or reopens the Welcome explanation
- **THEN** the editable passphrase, ordinary family-passphrase helper, existing validation/retry feedback and explicit Enter behavior are preserved; Beta does not prefill a Demo passphrase or show Demo-prefill wording
- **AND** Start exploring only dismisses the explanation, while the branding heading remains exactly Whats for Supper? in English and French

### Requirement: Keep app-shell mode context truthful and singular
App-shell Beta context SHALL be offered only for a Beta installation with non-demo installation identity and confirmed non-demo runtime status. Stable-only SHALL have no Beta context. Demo SHALL retain its existing explanation and accessible Beta-channel identity description on a Beta channel, without a second Beta band or automatic overlay.

#### Scenario: Identity combinations
- **WHEN** the shell resolves stable-only, Beta-only, Demo-only or Demo-on-Beta identity with matching known runtime status
- **THEN** stable-only has no mode explanation, Beta-only has Beta context, and both Demo cases retain Demo context without a second Beta introduction
- **AND** Demo-on-Beta retains the existing assistive Beta-channel description

#### Scenario: Runtime Demo overrides the Beta-only hint proposal
- **WHEN** the app shell's release channel is Beta, installation demo identity is false, and runtime demo status resolves true
- **THEN** one Demo context band and explanation are available, with Demo content and an informational note visibly and accessibly named Demo or Démo, described by Beta release channel or Canal bêta
- **AND** no plain Beta identity note, Beta context band or Beta introduction remains; explicit dismissal affects only the Demo acknowledgement, without changing either underlying identity input or runtime policy

#### Scenario: Runtime mode is unknown or installation Demo lacks runtime Demo
- **WHEN** app-shell runtime demo status is pending or fails to resolve, or installation demo identity is true while runtime demo status is false
- **THEN** no Beta explanation opens or records acknowledgement; existing identity hints and Demo behavior remain governed by their existing owners
- **AND** ordinary work is not blocked by the absence of a Beta explanation

### Requirement: Introduce Beta context only on a safe first Home visit
An unacknowledged Beta-only explanation SHALL open automatically at most once per app-shell visit, only when initial shell entry is query-free Home, member context is ready, no active work or competing modal exists, and shell interaction has not begun. An ineligible shell entry or interruption SHALL suppress automatic introduction for that visit rather than queue it for later. Welcome/onboarding activity SHALL NOT consume shell eligibility.

#### Scenario: First ready ordinary Home
- **WHEN** initial entry is `/home` with no query, member context and mode are ready, acknowledgement has been read, and no prior interaction, active work or other dialog exists
- **THEN** the unacknowledged explanation opens once and can be immediately dismissed
- **AND** the visitor keeps the intended Home destination and member context

#### Scenario: Deep link or task entry
- **WHEN** initial entry is a recipe, capture/share/import, voting, cooking, planning or other route, or Home carries query intent
- **THEN** the explanation does not open automatically, including after later navigation to Home during that visit
- **AND** intended destinations and drafts survive; the band remains manually available

#### Scenario: Late readiness and active work
- **WHEN** readiness arrives after pointer, keyboard or wheel interaction, or while capture/PDF work, loading or another dialog is active
- **THEN** automatic introduction is suppressed for that visit, including after that work finishes
- **AND** no timer or queued popup steals focus from an editor or task

#### Scenario: Welcome does not consume Home eligibility
- **WHEN** an unacknowledged visitor types, clears, submits or navigates through Welcome/onboarding, or manually opens the Welcome explanation then leaves without explicitly dismissing it
- **THEN** those pre-shell actions do not count as app-shell interaction, presentation or an ineligible shell entry
- **AND** the first query-free ready Home entry can introduce once under the existing readiness, work, modal and interaction guards

### Requirement: Remember explicit Beta dismissal locally and independently
Start exploring, explicit Close and Escape SHALL acknowledge Beta context using a simple browser-local preference without user, household or tracking identifiers or server synchronization. Demo and Beta acknowledgements SHALL be independent. Household resets, member/locale switches and cosmetic copy edits SHALL NOT clear acknowledgement.

#### Scenario: Dismiss then return
- **WHEN** a visitor explicitly dismisses Beta context and navigates, reloads, changes member/locale or the household resets
- **THEN** successful persistent acknowledgement prevents automatic Beta reintroduction, while manual reopening remains available

#### Scenario: Welcome dismissal suppresses later Home introduction
- **WHEN** a visitor explicitly dismisses Beta on Welcome through Start exploring, Close or Escape and then reaches Home
- **THEN** the same Beta acknowledgement suppresses automatic Home introduction while the band remains manually available
- **AND** failed storage writes still share in-memory acknowledgement across the transition, and no Demo acknowledgement is written

#### Scenario: Mode transition preserves separate acknowledgements
- **WHEN** a visitor dismisses Demo then enters Beta-only, or dismisses Beta then enters Demo
- **THEN** dismissal affects only the explanation actually dismissed; the other mode is eligible only on a fresh safe visit without its own acknowledgement
- **AND** changing modes in an already active visit does not trigger an automatic overlay

#### Scenario: Copy edits and new local context
- **WHEN** wording, locale or styling changes after acknowledgement
- **THEN** automatic introduction does not repeat
- **AND** another browser/device or cleared storage has independent first-visit state

### Requirement: Contain Beta storage and lifecycle failures
Missing or failing browser storage SHALL leave the app usable with a visit-memory presentation and dismissal guard. Automatic presentation, navigation away, unmount and mode changes SHALL NOT manufacture persisted acknowledgement. A remount SHALL NOT repeat an automatic explanation in the same app visit.

#### Scenario: Storage read or write fails
- **WHEN** storage access is absent, blocked or throws during read or dismissal write
- **THEN** explanation controls and navigation remain usable, and automatic opening does not repeat during the running app visit
- **AND** no persistence across a full reload or another browser is promised when storage cannot retain it

#### Scenario: Explanation leaves without dismissal
- **WHEN** routing, shell unmount or a mode change removes an open app-shell explanation before explicit dismissal
- **THEN** no local dismissal is persisted and the current app-shell visit does not automatically reopen it
- **AND** destination/editor focus is retained without restoring focus to the band, even when that band remains connected

#### Scenario: Welcome explanation leaves without dismissal
- **WHEN** routing, unmount or a mode change removes an open Welcome explanation before explicit dismissal
- **THEN** its route-local open state is cleared without acknowledgement or consuming Home presentation
- **AND** destination focus is retained without restoring focus to a background band; a later eligible Home introduction remains possible

### Requirement: Make Beta context accessible on primary devices
The band and explanation SHALL be readable in EN/FR on iPhone, Pixel Phone and iPad in both orientations, respecting safe areas and large text. The band SHALL have a 32 CSS pixel minimum touch height matching Demo; modal controls and the feedback link SHALL retain at least 44px targets. Interactive focus SHALL remain visible and text contrast SHALL be at least 4.5:1 in each actual interaction state. Login, app navigation and notification actions SHALL remain reachable.

#### Scenario: Match the compact Demo band and action
- **WHEN** Beta context renders on Welcome or in the app shell at ordinary text size
- **THEN** the full-width band uses pale sage normal/hover/pressed surfaces, charcoal text, a 32px minimum height, 13px/18px medium label and 16px help icon, without decorative cream padding above or below the strip
- **AND** necessary safe-area inset remains; the band grows and wraps at 320px or enlarged text without clipping, horizontal overflow or overlapping targets
- **AND** Start exploring uses the same dark sage normal/hover/pressed surfaces and white text as Demo, without reducing modal targets

#### Scenario: Phone sheet and iPad dialog
- **WHEN** the explanation renders on a primary phone or iPad with expanded text
- **THEN** the phone sheet or compact tablet dialog keeps all copy and dismissal actions reachable without clipping or horizontal scrolling
- **AND** notification/header layers, safe areas and the Welcome virtual keyboard do not obscure its actions, the login controls or the reopenable band

#### Scenario: Keyboard and assistive technology
- **WHEN** a visitor opens or dismisses the explanation using keyboard or assistive technology
- **THEN** it has a meaningful name and description, initially focuses its heading, contains modal focus, supports Escape and explicit Close, and returns focus to the connected band on explicit dismissal
- **AND** the focused static title has no visible outline, while interactive controls retain visible focus; reduced-motion preferences and VoiceOver/TalkBack reading order remain usable
