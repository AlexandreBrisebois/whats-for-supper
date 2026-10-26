# Demo household delta

## MODIFIED Requirements

### Requirement: Prefill Welcome without bypassing household access

Welcome SHALL initialize its editable passphrase to the public constant Swipe-Match-Cook only when server-resolved PWA Demo identity is enabled and the configured household secret exactly equals that constant. Otherwise it SHALL start empty. Browser health SHALL NOT decide prefill. Submission SHALL retain household-identity passphrase, feedback, token and cookie requirements, with no automatic authentication.

#### Scenario: Empty welcome passphrase
- **WHEN** a fresh Welcome form is rendered with PWA Demo enabled and its configured secret exactly equal to Swipe-Match-Cook
- **THEN** the initial passphrase is Swipe-Match-Cook without submitting, generating a token, writing an access cookie or navigating

#### Scenario: User already typed
- **WHEN** the visitor edits the initialized input, including replacing it, clearing it or entering whitespace
- **THEN** rerenders, locale changes and delayed health responses preserve that input for the mounted form
- **AND** clearing it does not trigger another prefill and Enter remains disabled for blank input

#### Scenario: Health unavailable
- **WHEN** browser health fails, stalls, returns non-demo or reports unhealthy storage
- **THEN** the server guard alone determines initial prefill and ordinary editable submission remains available

#### Scenario: Demo custom or missing secret
- **WHEN** PWA Demo is enabled but the configured secret is absent, empty, whitespace-only, custom, differently cased or padded around the public constant
- **THEN** Welcome starts empty with ordinary helper wording and no configured secret is disclosed

#### Scenario: Non-demo installation
- **WHEN** PWA Demo is disabled, absent or invalid, even if the secret equals the public constant or browser health reports demo
- **THEN** Welcome starts empty and preserves ordinary non-demo entry behavior

#### Scenario: Private values never reach unauthenticated rendering
- **WHEN** Welcome renders with an arbitrary synthetic private configured secret
- **THEN** that secret is absent from HTML, RSC payloads, serialized props, client bundles and unauthenticated presentation responses
- **AND** the only allowed prefill value is the designated public constant; configuration equality grants no access or second role

#### Scenario: Explicit entry and failed retry
- **WHEN** the visitor explicitly submits the current nonblank input
- **THEN** the existing authentication result controls entry, cookie writing precedes onboarding, and rejection or exception retains editable input and allows the existing retry flow

### Requirement: Present demo identity independently of authentication

With PWA DEMO_MODE enabled, the application SHALL identify Demo (Démo in French) independently of access. Welcome SHALL use its interactive explanation band instead of the tiny Demo note, retaining an accessible baked-beta channel description. Existing identity hints elsewhere SHALL remain noninteractive notes. Neither presentation SHALL grant household access.

#### Scenario: Demo hint
- **WHEN** a demo identity hint renders outside Welcome in English or French
- **THEN** it retains role note and the localized accessible name without an interactive control

#### Scenario: Beta demo identity
- **WHEN** demo identity renders for the baked beta channel
- **THEN** its Demo or Démo presentation retains the accessible Beta release channel or Canal bêta description

#### Scenario: Welcome identity control
- **WHEN** Welcome renders with server-resolved PWA Demo identity in either channel
- **THEN** it displays one Demo explanation band and no duplicate tiny Demo note
- **AND** activating it opens the explanation without submitting the form

#### Scenario: Beta without Demo
- **WHEN** Welcome renders with PWA Demo disabled and baked beta channel
- **THEN** the existing noninteractive Beta identity note remains, without a Demo band or introduction

### Requirement: Offer a reopenable demo context explanation
The demo SHALL provide a compact pale sage strip with readable dark charcoal text at the top of Welcome and the ordinary app shell, respecting safe areas, that opens one short phone sheet or compact iPad dialog. It SHALL explain the sample shared household, other visitors' changes, temporary changes that will be reset and avoiding personal information. Start exploring and an explicit close SHALL dismiss it. Identity hints outside Welcome SHALL retain their noninteractive meaning.

#### Scenario: Tap the context band
- **WHEN** a visitor activates Demo · What to know or its French equivalent in the ordinary demo shell
- **THEN** a named, readable dialog opens with the shared-state explanation, Start exploring and an explicit close, without navigation, household mutation or a mandatory tour
- **AND** the band remains available after dismissal for voluntary reopening

#### Scenario: Truthful restrictions
- **WHEN** the explanation describes AI limitations or reset behaviour
- **THEN** its claims match verified restrictions for the delivered demo and do not imply universal AI blocking, zero cost, processed visitor uploads, a guaranteed reset countdown or a schedule not established by evidence

#### Scenario: Responsive accessible control and surface
- **WHEN** the context band and explanation render in EN/FR on iPhone, Pixel Phone or iPad
- **THEN** the band has at least a 32 CSS pixel touch height as an explicitly approved exception to the former 44px band requirement, visible focus and text contrast of at least 4.5:1 on each actual interaction background, with no text clipping or obscured navigation
- **AND** the phone sheet or compact tablet dialog supports readable focus, accessible name/description, contained keyboard focus, Escape/explicit close, focus return, reduced motion and reachable actions under text expansion

#### Scenario: Approved compact band target
- **WHEN** the context band renders at ordinary text size
- **THEN** its full-width sage surface and accessible target have a 32 CSS pixel minimum height without decorative cream padding above or below; necessary device safe-area inset remains respected
- **AND** the label uses 13px/18px medium text and a 16px help icon, retaining Demo · What to know and Démo · À savoir
- **AND** at 320px width or with enlarged text the label and strip can grow and wrap without clipping, horizontal overflow or overlapping targets

#### Scenario: Matching exploration action
- **WHEN** Start exploring or its French equivalent renders
- **THEN** it uses existing dark sage with white text, darker hover and pressed surfaces, contrasting visible focus and at least 4.5:1 text contrast in every state
- **AND** modal buttons and the separate setup link retain at least 44 CSS pixel target height; the compact-band exception does not reduce other controls

#### Scenario: Approved demo explanation
- **WHEN** the explanation renders in English
- **THEN** its four body paragraphs say exactly:
  - Welcome to What’s for Supper! You’re sharing this demo with other visitors, just like a family sharing the app. You’ll see their changes as you explore, and they’ll see yours.
  - Try things out! Your changes are temporary and will be reset. Please don’t add personal information.
  - AI capture and generation are turned off in this demo. Explore the recipes we’ve prepared for you instead.
  - When you set up your own What’s for Supper, AI features require your own subscription.
- **AND** in French its four body paragraphs say exactly:
  - Bienvenue dans What’s for Supper! Vous partagez cette démo avec d’autres visiteurs, comme une famille qui utilise l’application ensemble. Vous verrez leurs changements au fil de votre exploration, et ils verront les vôtres.
  - Amusez-vous à essayer! Vos changements sont temporaires et seront réinitialisés. Veuillez ne pas ajouter de renseignements personnels.
  - La capture et la génération par IA sont désactivées dans cette démo. Explorez plutôt les recettes que nous avons préparées pour vous.
  - Lorsque vous installez votre propre What’s for Supper, les fonctionnalités d’IA nécessitent votre propre abonnement.
- **AND** the separate Set up your own household link and Start exploring action remain
- **AND** non-demo strings and provider, account or authentication behavior are unchanged

#### Scenario: Static title without a focus outline
- **WHEN** the disclaimer opens and its named title receives initial focus
- **THEN** the static title has no visible outline while dialog naming, focus containment, Escape/close and return focus remain correct
- **AND** keyboard focus indicators on the band, close button, setup link and Start exploring remain visible; unrelated dialog title styling is unchanged

#### Scenario: Manual Welcome explanation
- **WHEN** a Demo visitor opens Welcome without activating its band
- **THEN** the explanation does not open automatically
- **AND** activating the band opens the same localized explanation, setup link and dismissal controls as Home, with at most one band and one open explanation on Welcome

#### Scenario: Explicit dismissal and departure focus
- **WHEN** the visitor dismisses through Start exploring, Close or Escape
- **THEN** the dialog closes and focus returns to its still-connected triggering band
- **AND** route or mode departure closes it without manufacturing acknowledgement or moving focus from the destination task to a background band

### Requirement: Introduce demo context only at a safe first visit
An undismissed demo explanation SHALL automatically appear once at the first eligible normal ready Home entry before visitor interaction. It SHALL NOT interrupt active work, another dialog or a deep-link handoff. Deferred readiness SHALL NOT cause a mid-task popup. Automatic introduction SHALL preserve existing destinations and household/member setup.

#### Scenario: First normal ready entry
- **WHEN** an undismissed visitor reaches ordinary Home with household/member context and routing ready, no pending task or competing dialog, and interaction has not begun
- **THEN** the explanation opens once before interaction and can be dismissed immediately without a tour or task prerequisites

#### Scenario: Protected handoff
- **WHEN** entry carries a recipe, capture/share/import or voting deep-link intent
- **THEN** automatic introduction does not interrupt or replace that destination and is deferred to a later normal visit; voluntary reopening remains available

#### Scenario: Readiness arrives after interaction
- **WHEN** readiness resolves after a visitor has begun a task or while another dialog is active
- **THEN** automatic introduction is withheld rather than queued to interrupt the task, and ordinary app behaviour continues

#### Scenario: Welcome does not consume Home eligibility
- **WHEN** an unacknowledged visitor types, clears, submits or navigates through Welcome and onboarding without explicitly dismissing the Demo explanation
- **THEN** those pre-shell interactions do not consume eligibility or count as app-shell interaction
- **AND** first query-free ready Home entry may introduce once under the existing readiness, work, modal and interaction guards

#### Scenario: Welcome explanation leaves without dismissal
- **WHEN** the visitor manually opens the Welcome explanation and navigation removes it without explicit dismissal
- **THEN** no acknowledgement or Home presentation is manufactured and later eligible Home entry remains possible

### Requirement: Remember demo explanation dismissal outside shared state
Start exploring and user-initiated close SHALL store a simple demo-specific browser acknowledgement outside household snapshot/reset state, without a tracking ID or server synchronization. Storage failure SHALL fall back to visit-local memory. Navigation, reset, member/locale switches and cosmetic copy changes SHALL NOT replay an acknowledged introduction. Manual reopening SHALL remain available.

#### Scenario: Dismiss and reset
- **WHEN** the visitor uses Start exploring or explicit close, then returns, switches members or the demo household resets
- **THEN** that browser's acknowledgement prevents automatic reintroduction while the context band can still reopen the explanation

#### Scenario: Browser storage unavailable
- **WHEN** reading or writing persistent browser storage fails
- **THEN** the explanation remains usable and a visit-local presentation/dismissal guard prevents repeated automatic openings during the same app visit
- **AND** no durable cross-reload or cross-device memory is promised

#### Scenario: Cosmetic change or another browser
- **WHEN** wording, styling or locale changes after acknowledgement
- **THEN** it does not automatically reopen the explanation; another browser/device or cleared storage has its own first-visit state

#### Scenario: Mode-specific preference
- **WHEN** the pattern is later reused for beta
- **THEN** demo and beta use distinct acknowledgement keys and truthful mode-specific content; demo acknowledgement does not imply beta dismissal
- **AND** demo on a beta channel uses the demo explanation without automatically stacking a second mode introduction

#### Scenario: Automatic opening is not acknowledgement
- **WHEN** the explanation was automatically presented but routing removes it before the visitor dismisses it
- **THEN** the current visit does not repeatedly open it and no persisted dismissal is manufactured from that unmount

#### Scenario: One acknowledgement from Welcome to Home
- **WHEN** the visitor uses Start exploring, Close or Escape on Welcome's explanation and then reaches Home
- **THEN** the same Demo acknowledgement suppresses Home automatic introduction while allowing manual reopening
- **AND** storage failure still shares visit-local acknowledgement across this route transition; no Beta acknowledgement is written

## ADDED Requirements

### Requirement: Describe actual Welcome prefill truthfully

Welcome SHALL show the localized demo-prefill helper only when the server guard actually initialized the current form with the public constant and the visitor has not edited it. After any edit it SHALL use the existing ordinary helper for that mounted form. Withheld prefill SHALL never show the demo-prefill claim. Changing locale SHALL translate the helper without changing input or prefill provenance.

#### Scenario: Untouched public prefill
- **WHEN** Welcome has actually initialized the public prefill and it remains untouched
- **THEN** English helper text is exactly The demo passphrase is filled in for you. Tap Enter to explore.
- **AND** French helper text is exactly Le mot de passe de la démo est déjà rempli pour vous. Appuyez sur Entrer pour explorer.

#### Scenario: Cleared edited or manually retyped input
- **WHEN** the visitor makes any edit, including clearing the prefill or manually typing the public constant again
- **THEN** the existing ordinary localized family-passphrase helper replaces the prefill claim for the rest of the mounted form

#### Scenario: Withheld prefill
- **WHEN** the server guard withholds prefill in a private or custom-secret demo installation
- **THEN** Welcome retains its existing ordinary localized helper even if the visitor manually types the public constant

#### Scenario: Locale and failed attempt preserve provenance
- **WHEN** locale changes or submission fails while an actual prefill remains unedited
- **THEN** the helper retains its prefill meaning in the selected language without refilling, resubmitting or hiding failure feedback

### Requirement: Preserve the app name across locales

The landing and Welcome branding headings SHALL display the exact literal `Whats for Supper?` in English and French, including the question mark. This applies only to `landing.title`, `auth.welcomeTitle` and their component fallbacks; ordinary localized meal questions and surrounding copy SHALL retain their existing meaning.

#### Scenario: English or French entry heading
- **WHEN** the visitor opens the landing page or Welcome in English or French
- **THEN** its branding heading is exactly Whats for Supper?
- **AND** localized helper text and explicit household entry behavior remain unchanged
