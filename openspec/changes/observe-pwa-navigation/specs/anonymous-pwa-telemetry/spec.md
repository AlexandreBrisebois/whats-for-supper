# Opening contract revision

## MODIFIED Requirements

### Requirement: Emit a closed opening payload

An opening SHALL be an INFO OTLP log named `pwa.app.opened`, service `wfs-pwa-browser`, scope `wfs.anonymous`, fixed body `WFS opening observed`, with browser observation time and server forwarding observation time. Its only record attributes SHALL be `stage.name`, `session.id`, `tab.id`, `event.id` and integer `source.sequence` from the shared anonymous document stream. It SHALL omit personal identifiers, persistent tracking IDs, recipe content, user text, raw URLs, queries, tokens, referrers and error details.

#### Scenario: Approved vocabulary
- **WHEN** an opening is serialized
- **THEN** `stage.name` is exactly one of `welcome`, `onboarding`, `invite`, `home`, `search`, `capture`, `capture.confirm`, `planner`, `discovery`, `profile`, `profile.settings`, `browse.stack`, `error`, `not.found`, or `other`
- **AND** known route matches are exact, with `/recipes` classified as `search`
- **AND** shared rendered error and not-found fallbacks use `error` and `not.found` when observed before any other eligible screen

#### Scenario: Application release version
- **WHEN** WFS exports an opening or an existing synthetic producer check
- **THEN** its OTel resource includes `service.version` from the server-owned `WFS_VERSION` deployment metadata, trimmed, or literal `unknown` when absent or blank
- **AND** the value identifies the deployed application release/build and remains constant for that deployment
- **AND** browser input cannot choose the version; it is not an individual log attribute, identity or receiver/SDK version

#### Scenario: No anonymous correlation
- **WHEN** inspecting openings from the historical stage-only opening contract
- **THEN** those records have no generated session/tab/event identity and remain uncorrelated
- **AND** the revised contract below supersedes that emission behavior without rewriting historical records

#### Scenario: Anonymous document correlation replaces the uncorrelated contract
- **WHEN** an enabled document observes its first eligible screen
- **THEN** the opening and screen observation use the same random in-memory session and separate random tab identifier, with distinct event IDs and increasing sequence
- **AND** opening is allocated before the initial screen, followed by adopted surfaces
- **AND** no action, person, device or household identifier, telemetry cookie, local storage or session storage is used
- **AND** this explicitly replaces the former stage-only uncorrelated opening payload without changing historical retained evidence

### Requirement: Use standard named-log intake

Opening export SHALL use standard OTLP/HTTP JSON logs at `/v1/logs` with `Content-Type: application/json`, no compression and server-held browser Bearer authentication. It SHALL NOT require a proprietary Sentrame envelope, span, trace ID, SDK or fabricated spans. `timeUnixNano` SHALL describe browser observation and `observedTimeUnixNano` server forwarding observation, never delayed export time.

#### Scenario: Ordinary receipt without journey fields
- **WHEN** previously emitted openings without journey fields are received as valid standard logs
- **THEN** missing context is not an intake error, while journey reconstruction remains unavailable
- **AND** new WFS openings follow the revised correlated envelope rather than relying on this legacy compatibility case

#### Scenario: Correlated ordinary log receipt
- **WHEN** the receiver receives an opening through the actual JSON export path
- **THEN** protected reads verify service/version, browser source, name, classification, correlation and both observation timestamps
- **AND** no span or trace ID is required for receipt or a configured journey path

#### Scenario: Invalid browser clock
- **WHEN** observation time is malformed, older than 24 hours or more than five minutes ahead of server forwarding observation
- **THEN** the opening is dropped without replacing its time or rearming its document attempt
- **AND** application behavior remains unaffected

### Requirement: Configure opening meaning explicitly

Sentrame interpretation SHALL be configured by exact service, browser source, log carrier, event name with optional retained conditions for narrower meanings. The emitted classification SHALL be an application hint, not an official OTel stage convention. WFS SHALL NOT rely on hints to activate mappings or supply Kind, goal, authority, correlation or timing.

#### Scenario: App opened begins the configured path
- **WHEN** an owner configures `pwa.app.opened` for service `wfs-pwa-browser`, browser source and log carrier
- **THEN** Stage is `App opened`, Kind is step, timing is unavailable and no condition is required
- **AND** the first mapped occurrence begins the journey without a stage-start Kind or an opening completion goal

#### Scenario: Distinguish Search from Welcome
- **WHEN** an owner previews an opening mapping for `wfs-pwa-browser`, browser source, log carrier, name `pwa.app.opened` and `stage.name=search`
- **THEN** it matches Search openings and excludes Welcome openings
- **AND** the literal Stage and step Kind are explicitly selected and activated prospectively
- **AND** a broad overlapping opening mapping is not activated alongside the screen-specific mapping

#### Scenario: Owner interpretation differs from the hint
- **WHEN** an owner supplies an explicit literal Stage different from the emitted screen hint
- **THEN** verification checks that the owner mapping controls interpretation and the emitted classification stays inspectable
- **AND** activation is prospective and does not rewrite prior retained evidence or add correlation to old uncorrelated openings

#### Scenario: Point observation supplies no duration
- **WHEN** an opening is received or mapped
- **THEN** it supplies no native operation duration, paired page interval, observed-active time or automatic goal completion
- **AND** qualification does not enable adjacency estimates or add presence/timing emissions to fill that gap

#### Scenario: Receiver requires a goal for activation
- **WHEN** current Sentrame refuses a nonempty definition without an operational goal
- **THEN** documentation identifies open-ended activation and inspection as a receiver requirement
- **AND** WFS does not select App opened as a production goal or invent a completion event to bypass it

### Requirement: Preserve browser evidence authority

The app-origin opening operation SHALL accept only the approved classification, shared UUID context, positive safe-integer sequence and validated browser observation timestamp and reject malformed input, unknown fields and unknown values before export. It SHALL fix event name, fixed envelope fields, destination and browser credential server-side and preserve same-origin protections. Browser claims SHALL NOT use trusted server producer authority merely because a server forwards them.

#### Scenario: A browser attempts arbitrary payload forwarding
- **WHEN** a submission supplies a URL, arbitrary event name, extra attribute, invalid classification, malformed correlation, invalid clock or producer selection
- **THEN** the operation rejects it without export

#### Scenario: Opening is forwarded
- **WHEN** a valid opening is exported
- **THEN** it uses the browser producer token and browser budget
- **AND** trusted server synthetic checks retain their separate token and budget

### Requirement: Limit interpretation to received opening evidence

Documentation SHALL explain that received openings describe browser-reported entry screens, not unique people, exact session totals, shortcut attribution, authentication success, completed tasks or abandonment. Absence SHALL NOT prove no opening occurred. Qualification SHALL separately establish wire receipt, durable receiver retention, configured derivation, deployed routes and physical-device behavior.

#### Scenario: Receipt without journey correlation
- **WHEN** previously deployed openings or checks are retained as browser logs without session/tab IDs
- **THEN** their unassigned status or empty journey graph is not evidence of failed ingestion
- **AND** no trace IDs are fabricated to make standalone logs appear in Traces

#### Scenario: Correlated entry is not a second visit
- **WHEN** opening and initial screen are mapped in one anonymous document stream
- **THEN** they are two useful observations of entry and presentation within that scope, not two visits
- **AND** receiver goal/inactivity segmentation can still produce multiple journeys within one document scope

#### Scenario: Qualification uses the new local receiver model
- **WHEN** WFS qualification runs against the unpublished local Sentrame build
- **THEN** it records the tested receiver build, storage/projection model, JSON/no-compression path and actual protected receipt/read results separately from mock and other SDK evidence
- **AND** it uses fresh isolated compatible storage without resetting or migrating an existing deployment implicitly

#### Scenario: Entry is followed by a task failure
- **WHEN** a recorded opening is followed by failed login, failed capture or departure
- **THEN** that opening alone does not distinguish those outcomes

### Requirement: Keep initial collection vocabulary bounded

Opening SHALL remain a single entry observation. Subsequent screen and adopted-surface observations SHALL follow the separately reviewed anonymous-navigation-observation contract. Clicks, business outcomes, errors and technical requests SHALL NOT be inferred from opening or presentation. A modal displayed over the entry screen SHALL NOT replace that page's opening classification.

#### Scenario: Navigate and open a modal after entry
- **WHEN** an opening is observed and the person navigates or opens, closes or reopens a modal
- **THEN** no further opening is exported; screen/adopted-surface evidence follows its own reviewed contract

#### Scenario: Initial page has an automatic context overlay
- **WHEN** a Home opening coincides with an existing Demo or Beta introduction
- **THEN** the opening remains classified as `home`
- **AND** modal presentation does not create another opening or an unreviewed surface event
