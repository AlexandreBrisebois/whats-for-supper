# Beta release context delta

## ADDED Requirements

### Requirement: Offer reopenable Beta release context
The ordinary Beta-only app shell SHALL provide a compact purple top band with white text that opens a short explanation of pre-release expectations in EN/FR. Dismissal SHALL leave the band available. Opening and closing SHALL preserve the route, drafts, household/member state and existing feature availability.

#### Scenario: Open and reopen Beta context
- **WHEN** a visitor activates the Beta context band on an ordinary Beta-only app route
- **THEN** one named explanation opens with Start exploring and explicit Close actions
- **AND** either action closes it without navigation or household mutation, and the band can reopen it

#### Scenario: Truthful pre-release copy
- **WHEN** the Beta-only explanation is displayed
- **THEN** it uses the reviewed EN/FR pre-release copy in the design, without claiming a sample/shared visitor household, scheduled resets, disabled AI, reliability, privacy or data-loss guarantees
- **AND** Beta presentation does not grant access or change feature availability

### Requirement: Keep mode context truthful and singular
Beta context SHALL be offered only for a Beta installation with non-demo installation identity and confirmed non-demo runtime status. Stable-only SHALL have no Beta context. Demo SHALL retain its existing explanation and accessible Beta-channel identity description on a Beta channel, without a second Beta band or automatic overlay.

#### Scenario: Identity combinations
- **WHEN** the shell resolves stable-only, Beta-only, Demo-only or Demo-on-Beta identity with matching known runtime status
- **THEN** stable-only has no mode explanation, Beta-only has Beta context, and both Demo cases retain Demo context without a second Beta introduction
- **AND** Demo-on-Beta retains the existing assistive Beta-channel description

#### Scenario: Runtime Demo overrides the Beta-only hint proposal
- **WHEN** the release channel is Beta, installation demo identity is false, and runtime demo status resolves true
- **THEN** one Demo context band and explanation are available, with Demo content and an informational note visibly and accessibly named Demo or Démo, described by Beta release channel or Canal bêta
- **AND** no plain Beta identity note, Beta context band or Beta introduction remains; explicit dismissal affects only the Demo acknowledgement, without changing either underlying identity input or runtime policy

#### Scenario: Runtime mode is unknown or installation Demo lacks runtime Demo
- **WHEN** runtime demo status is pending or fails to resolve, or installation demo identity is true while runtime demo status is false
- **THEN** no Beta explanation opens or records acknowledgement; existing identity hints and Demo behavior remain governed by their existing owners
- **AND** ordinary work is not blocked by the absence of a Beta explanation

### Requirement: Introduce Beta context only on a safe first Home visit
An unacknowledged Beta-only explanation SHALL open automatically at most once per app visit, only when initial shell entry is query-free Home, member context is ready, no active work or competing modal exists, and interaction has not begun. An ineligible entry or interruption SHALL suppress automatic introduction for that visit rather than queue it for later.

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

### Requirement: Remember explicit Beta dismissal locally and independently
Start exploring, explicit Close and Escape SHALL acknowledge Beta context using a simple browser-local preference without user, household or tracking identifiers or server synchronization. Demo and Beta acknowledgements SHALL be independent. Household resets, member/locale switches and cosmetic copy edits SHALL NOT clear acknowledgement.

#### Scenario: Dismiss then return
- **WHEN** a visitor explicitly dismisses Beta context and navigates, reloads, changes member/locale or the household resets
- **THEN** successful persistent acknowledgement prevents automatic Beta reintroduction, while manual reopening remains available

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
- **WHEN** routing, shell unmount or a mode change removes an open explanation before explicit dismissal
- **THEN** no local dismissal is persisted and the current visit does not automatically reopen it
- **AND** destination/editor focus is retained without restoring focus to the band, even when that band remains connected

### Requirement: Make Beta context accessible on primary devices
The band and explanation SHALL be readable in EN/FR on iPhone, Pixel Phone and iPad in both orientations, respecting safe areas and large text. Controls SHALL have at least 44 CSS pixel touch targets and visible focus. White text SHALL contrast at least 4.5:1 on actual normal, hover and pressed backgrounds. Context SHALL preserve reachable app navigation and notification actions.

#### Scenario: Phone sheet and iPad dialog
- **WHEN** the explanation renders on a primary phone or iPad with expanded text
- **THEN** the phone sheet or compact tablet dialog keeps all copy and dismissal actions reachable without clipping or horizontal scrolling
- **AND** notification/header layers and safe areas do not obscure its actions or the reopenable band

#### Scenario: Keyboard and assistive technology
- **WHEN** a visitor opens or dismisses the explanation using keyboard or assistive technology
- **THEN** it has a meaningful name and description, initially focuses its heading, contains modal focus, supports Escape and explicit Close, and returns focus to the connected band on explicit dismissal
- **AND** reduced-motion preferences and VoiceOver/TalkBack reading order remain usable
