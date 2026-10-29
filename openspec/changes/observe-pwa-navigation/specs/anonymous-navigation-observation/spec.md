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

Navigation records SHALL use random in-memory `session.id` and `tab.id` shared only within the document scope. Each attempted observation SHALL have a fresh `event.id` and increasing `source.sequence`. The context SHALL NOT use browser storage, credentials, product IDs or cross-document joins.

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

Collection SHALL retain runtime server opt-in and fail closed. Navigation SHALL have no durable queue, transport retry, sampling, presence heartbeat or delivery-dependent UI. It SHALL obey the existing two-second timeout, four active requests and 120 records/minute per producer per Node process, plus 60 navigation attempts/minute per document.

#### Scenario: Storm or receiver outage
- **WHEN** navigation exceeds admission limits or delivery fails
- **THEN** records are dropped without delaying the application
- **AND** absence or sequence gaps are not interpreted as complete paths or failed journeys

#### Scenario: Stale enabled browser
- **WHEN** a previously enabled browser submits after server disablement
- **THEN** export is refused regardless of its local state

### Requirement: Preserve opening and qualification boundaries

The existing `pwa.app.opened` payload and one-attempt-per-document rule SHALL remain unchanged. Navigation qualification SHALL distinguish captured wire data, actual durable receiver reads, deployed routes and installed-device behavior. Received records SHALL NOT automatically imply mappings, goals, dwell or a complete journey graph.

#### Scenario: Baseline receipt without a goal
- **WHEN** named navigation records arrive before a real journey goal is configured
- **THEN** service, name, browser authority, classification and correlation can be qualified through protected reads
- **AND** no goal is fabricated merely to produce a graph

#### Scenario: Opening remains independent
- **WHEN** a fresh document emits its initial screen record and its opening attempt
- **THEN** they remain different observations and the opening still has only its original `stage.name` attribute
