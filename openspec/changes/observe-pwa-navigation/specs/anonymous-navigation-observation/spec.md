# Anonymous navigation observation

## Purpose

Supply minimized browser evidence of presented routes and shared surfaces within one anonymous document scope, without implying business success or identifying a person.

## ADDED Requirements

### Requirement: Observe presented destinations through shared boundaries

When enabled, WFS SHALL attempt `pwa.screen.presented` when a visible document presents a new eligible route shell or primary Planner/Grocery view. Observation SHALL follow current entry gates and SHALL NOT imply loaded data, perceived content or successful business work.

#### Scenario: Access redirects a requested destination
- **WHEN** a Search request presents Welcome after access gating
- **THEN** the observed screen is `welcome`, without an observation claiming Search was presented

#### Scenario: Navigate and backtrack
- **WHEN** an eligible visible document presents Home, Search and Home in order
- **THEN** three screen observations describe those actual transitions with distinct occurrence identities
- **AND** rerenders or effect replay do not add presentations

#### Scenario: Hidden navigation
- **WHEN** routes change while the document is hidden
- **THEN** no hidden presentation is exported
- **AND** visibility evaluates the current eligible screen, without replaying intermediate hidden routes

### Requirement: Keep document correlation anonymous and bounded

Opening, screens and adopted surfaces SHALL share random in-memory `session.id` and separate random `tab.id`, generated once after collection is enabled. One shared coordinator SHALL allocate a distinct random `event.id` and positive increasing `source.sequence` per observation before admission/delivery. The context SHALL NOT use browser storage, credentials, product IDs or cross-document joins.

#### Scenario: Opening and initial navigation order
- **WHEN** a fresh enabled visible document presents Home, then Search, then Home
- **THEN** it allocates `pwa.app.opened(home)` first, `pwa.screen.presented(home)` second, then Search and Home presentations
- **AND** all four records share session/tab, have distinct event IDs and sequence 1, 2, 3, 4
- **AND** initial adopted surfaces follow the initial screen in that stream
- **AND** opening records entry and the screen records presentation, without counting two visits or promising delivery order

#### Scenario: Disabled document
- **WHEN** collection is initially disabled or configuration is invalid
- **THEN** no correlation scope or observation is generated for later replay
- **AND** navigation or resume does not rearm collection in that document

#### Scenario: New document or concurrent tab
- **WHEN** a reload or another tab creates a document
- **THEN** it receives independent correlation, even for the same route and authenticated household
- **AND** no previous-scope identifier is exported

#### Scenario: Warm resume
- **WHEN** the same document resumes after unlock or a cooking pause
- **THEN** it retains its current scope and does not generate another opening or unchanged screen presentation
- **AND** scope membership does not override Sentrame's separate inactivity segmentation

### Requirement: Represent Planner and Grocery presentation accurately

WFS SHALL distinguish the primary `planner` and `planner.grocery` views and the companion Grocery surface. Simultaneously displayed content SHALL NOT be represented as an exclusive sequence of user-selected screens. Presentation SHALL NOT imply a shopping action or completion.

#### Scenario: Phone tab transition
- **WHEN** a narrow layout replaces the plan with the Grocery view
- **THEN** the primary screen becomes `planner.grocery`
- **AND** a tab click without resulting presentation supplies no screen evidence

#### Scenario: Wide companion pane
- **WHEN** the wide Planner presents its plan and embedded Grocery pane together
- **THEN** the primary screen is `planner` and Grocery is a companion surface
- **AND** resize-driven presentation does not assert a user click or intent to shop

### Requirement: Observe shared surfaces with static identity

An adopted shared surface SHALL declare a reviewed static identity and attempt `pwa.surface.opened` / `pwa.surface.closed` on observable presentation transitions. Initial coverage SHALL include Quick Find and the Grocery companion pane. Closure SHALL NOT imply cancellation, completion or an unload observation.

#### Scenario: Open and close Quick Find
- **WHEN** a visible Quick Find presentation opens, closes and later reopens
- **THEN** each presentation cycle is distinct and ordinary rerenders add no events
- **AND** title, recipe content, selection and dismissal cause are absent

#### Scenario: Document disappears
- **WHEN** the document terminates before surface closure is observed
- **THEN** no closing event is manufactured and no unload flush or retry is required

### Requirement: Prevent unknown screens and surfaces from silently disappearing

Unclassified routes SHALL remain observable as `other` without exporting their path or content. Source coverage SHALL identify routes needing a classification or explicit `other` decision, and bespoke surfaces needing adoption or a documented exception. One declaration SHALL suffice for future shared-surface identity.

#### Scenario: New route contains private segments
- **WHEN** a new route lacks a reviewed classification
- **THEN** its record contains only `other` and the approved envelope/context
- **AND** a coverage check identifies the missing declaration using repository source paths only

#### Scenario: Bespoke surface is introduced
- **WHEN** a new declared dialog bypasses the shared convention
- **THEN** the coverage review requires adoption or a named exception
- **AND** it does not claim that static checks can discover every dynamically constructed overlay

### Requirement: Forward only a closed browser evidence vocabulary

Navigation observations SHALL be INFO standard OTLP/HTTP JSON named logs using the browser credential. Only fixed service/scope, source and observed timestamps, static `stage.name`, the named correlation fields and integer sequence SHALL be retained. The forwarding boundary SHALL reject extra fields and invalid values before export.

#### Scenario: Arbitrary forwarding attempt
- **WHEN** input supplies a URL, arbitrary name, producer, attribute, content or malformed context
- **THEN** no record is exported and rejected values are not echoed or logged

#### Scenario: Authority and clock basis
- **WHEN** valid browser evidence is forwarded
- **THEN** it retains browser authority, browser occurrence time and separate server observation time
- **AND** correlation or timestamp proximity does not establish causal order across producers

### Requirement: Bound delivery without disrupting the application

Collection SHALL retain runtime server opt-in and fail closed. Navigation SHALL have no durable queue, transport retry, sampling, presence heartbeat or delivery-dependent UI. It SHALL obey the existing two-second timeout, four active requests and 120 records/minute per producer per Node process, plus 60 screen/surface attempts/minute per document; opening remains at most one attempt and shares the browser producer budget.

#### Scenario: Storm or receiver outage
- **WHEN** navigation exceeds admission limits or delivery fails
- **THEN** records are dropped without delaying the application
- **AND** absence or sequence gaps are not interpreted as complete paths or failed journeys

#### Scenario: Stale enabled browser
- **WHEN** a previously enabled browser submits after server disablement
- **THEN** export is refused regardless of its local state

### Requirement: Preserve opening and qualification boundaries

The revised opening contract SHALL participate in the shared stream while retaining its eligibility and one-attempt rule. Qualification SHALL distinguish wire capture, durable receiver receipt, configured derivation, deployed routes and physical-device behavior. Received records SHALL NOT automatically imply mappings, goals, dwell or a complete graph.

#### Scenario: Baseline receipt without a goal
- **WHEN** named navigation records arrive before a real journey goal is configured
- **THEN** service, name, browser authority, classification and correlation can be qualified through protected reads
- **AND** no goal is fabricated merely to produce a graph

#### Scenario: Opening preservation under failure
- **WHEN** callbacks rerun, a component remounts, delivery fails or a browser clock is invalid
- **THEN** no second opening or unchanged screen presentation is manufactured
- **AND** each attempted observation retains its sequence allocation, so lost records can leave gaps
- **AND** rendering, authentication, navigation and recovery remain unaffected

### Requirement: Configure path meaning prospectively

Guidance SHALL define explicit browser/log/service/name mappings for opening, screens and reviewed surfaces. Conditions SHALL be optional filters; screen labels SHALL use disjoint `stage.name` conditions. Hints SHALL NOT create correlation or activate mappings. Production opening SHALL NOT be used as a completion goal merely to enable activation.

#### Scenario: Opening mapping
- **WHEN** mapping `pwa.app.opened` for browser, log and `wfs-pwa-browser`
- **THEN** Stage is `App opened`, Kind is step, timing is unavailable and no condition is required
- **AND** the first mapped occurrence starts a journey; stage start is a duration boundary rather than a generic journey-start switch
- **AND** `pwa.telemetry.check` remains a transport diagnostic outside the production path

#### Scenario: Surface meaning
- **WHEN** an adopted surface opens or closes
- **THEN** its mapping has reviewed presentation or supporting meaning
- **AND** closure is not automatically journey exit, cancellation or business completion

#### Scenario: Prospective synthetic derivation
- **WHEN** qualifying App opened, Home and Search in a disposable receiver
- **THEN** mappings and an explicit synthetic reaching-Search presentation goal are activated before fresh browser records are emitted
- **AND** protected reads show opening first, one scope/tab and the intended configured path
- **AND** exact captured-wire replay creates no duplicate records or journey contributions, including after receiver restart/reopen
- **AND** captured definitions are not assumed to change retrospectively

### Requirement: Keep interpretation and outcome limits explicit

Documentation SHALL distinguish document scope from receiver goal/30-minute inactivity segmentation. Navigation SHALL supply neither business commitment, page dwell nor attention. Cross-document and cross-service continuity SHALL remain separate decisions. No heartbeat, fake closure, persistent correlation, generic relay or SDK migration SHALL fill evidence gaps.

#### Scenario: Later occurrence after receiver closure
- **WHEN** a goal or 30 minutes without mapped activity closes a receiver journey
- **THEN** a later mapped occurrence can start another journey in the same document scope
- **AND** it does not create another WFS opening or prove failure, abandonment or a complete path

#### Scenario: Duration or persisted outcome is requested
- **WHEN** interpreting presentation records as duration or business completion
- **THEN** missing records or sequence gaps remain incomplete evidence
- **AND** paired surface/page duration additionally requires reviewed start/end meanings and shared `stage.occurrence.id`
- **AND** trusted vote, assignment or cooking persistence evidence belongs at its actual server owner
- **AND** shopping completion requires an agreed semantic boundary rather than an all-checked inference
