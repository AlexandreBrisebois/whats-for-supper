# Cost-safe demo exploration delta

## MODIFIED Requirements

### Requirement: Bypass the five demo workflow processor names
With demo enabled, dispatch for ExtractRecipe, GenerateDescription, SynthesizeRecipe, WebAcquisition and CategorizeIngredients SHALL fail explicitly as unavailable rather than execute the ordinary processor or claim content was produced. Existing non-demo dispatch SHALL remain unchanged.

#### Scenario: Each named processor bypassed
- **WHEN** a demo worker dispatches one of the five named processor tasks
- **THEN** it reports the demo restriction without running its ordinary model processor or generating content

#### Scenario: Bypass result completes task
- **WHEN** a model-dependent task is unavailable in demo mode
- **THEN** it cannot manufacture successful extraction, generated content or readiness from a bypass result; ordinary non-transient task failure handling applies

### Requirement: Keep the ordinary Search entry visible in demo presentation
The Recipes page SHALL retain ordinary Search in demo mode. Typed search SHALL use lexical retrieval without generating a query embedding. Similar SHALL retain compatible prepared-vector retrieval or its existing lexical fallback. Local recipe edits and reconciliation SHALL publish lexical state without paid embedding repair.

#### Scenario: Search input available
- **WHEN** the Recipes page renders with established member context in demo mode
- **THEN** ordinary Search remains usable without an outbound model request

#### Scenario: Compatible prepared Similar
- **WHEN** a demo recipe has a compatible prepared vector
- **THEN** Similar can use that stored vector without creating another embedding; absent or incompatible vectors use the existing local fallback

#### Scenario: Edits and repair
- **WHEN** a visitor edits searchable facts or startup/maintenance dispatches indexing or reconciliation
- **THEN** lexical state remains available without model requests or repeated embedding-only repair for demo restrictions

## ADDED Requirements

### Requirement: Reject demo requests at every model boundary
API demo mode SHALL prevent outgoing chat/streaming, query/document embedding and hero-generation model requests, including direct clients. Credentials, feature flags, force options, startup, background dispatch and retries SHALL NOT bypass it. Non-demo provider delegation SHALL remain unchanged.

#### Scenario: Provider transports are forbidden
- **WHEN** any supported model boundary is invoked in demo mode with dummy credentials present
- **THEN** no underlying provider or transport is called, including forced generation and repeated attempts

#### Scenario: Non-demo delegation
- **WHEN** demo mode is disabled and a model operation is authorized
- **THEN** ordinary delegation continues under existing contracts; isolated tests use provider doubles

### Requirement: Refuse unavailable AI actions before accepting private content
Demo AI capture, contextual reimport, bulk import, failed-capture retry, original-photo regeneration and hero generation SHALL return 403 with status, code DEMO_AI_UNAVAILABLE and an explanatory message before processing a request body or changing household facts/assets. UI entry SHALL explain the restriction before private file selection/upload and offer prepared recipes or return navigation.

#### Scenario: Direct capture or generation request
- **WHEN** a demo caller posts photo/PDF/URL/description capture, contextual import feedback that can launch reimport, bulk import, failed-capture retry, original-photo regeneration or hero regeneration
- **THEN** 403 explains the restriction without parsing uploaded private content, accepting model work, changing recipe/media state or implying success

#### Scenario: Prepared content and local work
- **WHEN** a visitor browses original PDF/images and prepared heroes, edits ordinary recipe facts, votes, saves a plan, checks groceries/extras or cooks
- **THEN** local behavior and existing prepared bytes remain available without a model request

#### Scenario: Restriction unavailable to the browser
- **WHEN** the browser has not established API demo status
- **THEN** private AI upload entry waits with retry/return guidance rather than guessing that upload is permitted

### Requirement: Offer a reopenable demo context explanation
The demo SHALL provide a compact purple band with readable white text at the top of the ordinary app shell, respecting safe areas, that opens one short phone sheet or compact iPad dialog. It SHALL explain the sample shared household, other visitors' changes, temporary resettable state and avoiding personal information. Start exploring and an explicit close SHALL dismiss it. Existing identity hints SHALL retain their noninteractive meaning.

#### Scenario: Tap the context band
- **WHEN** a visitor activates Demo · What to know or its French equivalent in the ordinary demo shell
- **THEN** a named, readable dialog opens with the shared-state explanation, Start exploring and an explicit close, without navigation, household mutation or a mandatory tour
- **AND** the band remains available after dismissal for voluntary reopening

#### Scenario: Truthful restrictions
- **WHEN** the explanation describes AI limitations or reset behaviour
- **THEN** its claims match verified restrictions for the delivered demo and do not imply universal AI blocking, zero cost, processed visitor uploads, a guaranteed reset countdown or a schedule not established by evidence

#### Scenario: Responsive accessible control and surface
- **WHEN** the context band and explanation render in EN/FR on iPhone, Pixel Phone or iPad
- **THEN** the band has at least a 44 CSS pixel touch height, visible focus and white-text contrast of at least 4.5:1 on each actual interaction background, with no text clipping or obscured navigation
- **AND** the phone sheet or compact tablet dialog supports readable focus, accessible name/description, contained keyboard focus, Escape/explicit close, focus return, reduced motion and reachable actions under text expansion

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
