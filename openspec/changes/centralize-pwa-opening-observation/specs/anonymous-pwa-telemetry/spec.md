# Anonymous PWA telemetry delta

## Purpose

Provide deployment-opted-in anonymous evidence of the first WFS screen presented on a fresh document load, with bounded payloads and honest delivery and interpretation limits.

## ADDED Requirements

### Requirement: Observe the first presented entry screen

When collection is enabled, WFS SHALL attempt `pwa.app.opened` for the first route screen committed while its document is visible and entry gates permit presentation. It SHALL describe the presented screen rather than the originally requested destination. Presentation SHALL mean the screen shell is committed, not that all data loaded or a person perceived it.

#### Scenario: Search is the entry
- **WHEN** a fresh visible document presents Search with entry gates satisfied
- **THEN** its opening has `stage.name=search`
- **AND** it makes no claim about shortcut use, search submission or search results

#### Scenario: Access recovery begins at Welcome
- **WHEN** a fresh Search or Capture request is redirected to Welcome for household access
- **THEN** its opening has `stage.name=welcome`
- **AND** subsequent login, onboarding and Home navigation in that document produce no further opening

#### Scenario: Member context is required
- **WHEN** a fresh load presents onboarding after access or member-context gates
- **THEN** its opening has `stage.name=onboarding`

#### Scenario: Entry is an invitation
- **WHEN** a fresh visible document presents the invitation joining or rejection screen
- **THEN** its opening has `stage.name=invite`
- **AND** member and voting invitations share that classification without collecting their parameters or reporting acceptance
- **AND** later redirects do not produce another opening in that document

#### Scenario: Share transport reaches Capture
- **WHEN** a share handoff results in a fresh document presenting Capture
- **THEN** its opening has `stage.name=capture`
- **AND** no shared title, text, URL, file metadata or handoff token is included

#### Scenario: No screen can be presented
- **WHEN** navigation is cancelled, the document closes, or startup fails before any eligible screen can be observed
- **THEN** no opening is manufactured to represent success or failure

### Requirement: Bound an opening to one document lifetime

WFS SHALL make at most one opening submission attempt per document lifetime, claiming the attempt before asynchronous submission. A new document or full reload SHALL permit a new attempt. Internal routing, rerenders, effect replay, remounts, history restoration of the same document, visibility changes and warm installed-app resumes SHALL NOT reset the opening boundary. No inactivity timeout SHALL apply.

#### Scenario: Fresh installed launch and reload
- **WHEN** opening the installed app creates a document that presents an eligible screen, or that document is fully reloaded
- **THEN** each new document independently permits one opening attempt

#### Scenario: Cooking pause and phone unlock
- **WHEN** a person spends an extended period cooking, locks the phone, and resumes the same installed-app document
- **THEN** no additional opening is emitted

#### Scenario: Competing lifecycle callbacks
- **WHEN** repeated effects, remounts, or rapid route changes compete to submit an opening in one document
- **THEN** only the first eligible observation claims an attempt
- **AND** no later callback retries or replaces that claimed opening

#### Scenario: Initially hidden document
- **WHEN** a document loads hidden and later becomes visible
- **THEN** it does not submit while hidden
- **AND** the first screen eligible at visibility is used, rather than a stale hidden-screen observation

### Requirement: Classify entry without per-page telemetry calls

Shared observation SHALL cover application page entry without telemetry calls in each page or navigation handler. Only approved static screen classifications SHALL leave the browser. A new route without an approved classification SHALL use `other` without exporting its path, segments, parameters or title. Classification SHALL NOT depend on user-entered or recipe content.

#### Scenario: A newly added page has no classification
- **WHEN** a new application page becomes the first eligible screen without adding feature-level telemetry calls
- **THEN** the shared observer submits one opening classified as `other`
- **AND** giving it a distinct label requires only an approved classification declaration

#### Scenario: Unknown dynamic route contains private values
- **WHEN** an unclassified route contains a dynamic identifier or arbitrary query content
- **THEN** its opening contains only the `other` classification and fixed envelope

### Requirement: Emit a closed opening payload

An opening SHALL be an INFO OTLP log named `pwa.app.opened`, service `wfs-pwa-browser`, scope `wfs.anonymous`, fixed body `WFS opening observed`, and a server-generated export timestamp. Its only record attribute SHALL be `stage.name`. It SHALL omit personal identifiers, persistent tracking IDs, recipe content, user text, raw URLs, queries, tokens, referrers and error details.

#### Scenario: Approved vocabulary
- **WHEN** an opening is serialized
- **THEN** `stage.name` is exactly one of `welcome`, `onboarding`, `invite`, `home`, `search`, `capture`, `capture.confirm`, `planner`, `discovery`, `profile`, `profile.settings`, `browse.stack`, `error`, `not.found`, or `other`
- **AND** known route matches are exact, with `/recipes` classified as `search`
- **AND** shared rendered error and not-found fallbacks use `error` and `not.found` when observed before any other eligible screen

#### Scenario: No anonymous correlation
- **WHEN** WFS serializes or stores opening observation state
- **THEN** it generates no telemetry session, tab, event, action, device or household identifier
- **AND** it uses no telemetry cookies, local storage or session storage

### Requirement: Use standard named-log intake

Opening export SHALL use standard OTLP/HTTP JSON logs at `/v1/logs` with `Content-Type: application/json`, no compression and server-held browser Bearer authentication. It SHALL NOT require a proprietary Sentrame envelope, span, trace ID, SDK or journey attributes beyond WFS's reviewed screen classification. Its event time SHALL describe server export observation, not exact browser launch time.

#### Scenario: Ordinary receipt without journey fields
- **WHEN** the configured receiver receives the opening through WFS's actual JSON export path without session, tab, record or trace IDs
- **THEN** qualification verifies accepted named-log receipt and retained service, browser source, name and screen classification through protected reads
- **AND** absence of journey context is not treated as an intake error

### Requirement: Configure opening meaning explicitly

Sentrame interpretation SHALL be configured by exact service, browser source, log carrier, event name and, for screen-specific mappings, one retained `stage.name` condition. The emitted classification SHALL be an application hint, not an official OTel stage convention. WFS SHALL NOT rely on hints to activate mappings or supply Kind, goal, authority, correlation or timing.

#### Scenario: Distinguish Search from Welcome
- **WHEN** an owner previews an opening mapping for `wfs-pwa-browser`, browser source, log carrier, name `pwa.app.opened` and `stage.name=search`
- **THEN** it matches Search openings and excludes Welcome openings
- **AND** the literal Stage and step Kind are explicitly selected and activated prospectively
- **AND** a broad overlapping opening mapping is not activated alongside the screen-specific mapping

#### Scenario: Owner interpretation differs from the hint
- **WHEN** an owner supplies an explicit literal Stage different from the emitted screen hint
- **THEN** verification checks that the owner mapping controls interpretation and the emitted classification stays inspectable
- **AND** activation is prospective and does not rewrite prior retained evidence or manufacture a captured journey from uncorrelated openings

#### Scenario: Point observation supplies no duration
- **WHEN** an opening is received or mapped
- **THEN** it supplies no native operation duration, paired page interval, observed-active time or automatic goal completion
- **AND** qualification does not enable adjacency estimates or add presence/timing emissions to fill that gap

### Requirement: Preserve deployment opt-in

Collection SHALL require runtime `WFS_TELEMETRY_ENABLED=true` plus a valid Sentrame origin and two nonempty, distinct producer tokens. Export SHALL recheck configuration and fail closed. Credentials and destination SHALL remain server-side. Disabled initial collection SHALL NOT queue an opening for later navigation or resume.

#### Scenario: Disabled or invalid configuration
- **WHEN** the runtime flag is absent or not exactly `true`, or required configuration is invalid
- **THEN** no opening reaches Sentrame
- **AND** ordinary entry behavior is unaffected

#### Scenario: Administrator changes collection settings
- **WHEN** the administrator updates the existing private container env file, recreates the PWA container, and reloads the app
- **THEN** the new document follows those runtime settings without requiring an image rebuild containing different public credentials

### Requirement: Preserve browser evidence authority

The app-origin opening operation SHALL accept only the approved classification and reject malformed input, unknown fields and unknown values before export. It SHALL fix event name, envelope, destination and browser credential server-side and preserve same-origin protections. Browser claims SHALL NOT use trusted server producer authority merely because a server forwards them.

#### Scenario: A browser attempts arbitrary payload forwarding
- **WHEN** a submission supplies a URL, arbitrary event name, extra attribute, invalid classification or producer selection
- **THEN** the operation rejects it without export

#### Scenario: Opening is forwarded
- **WHEN** a valid opening is exported
- **THEN** it uses the browser producer token and browser budget
- **AND** trusted server synthetic checks retain their separate token and budget

### Requirement: Drop telemetry without disrupting entry

Opening delivery SHALL remain best effort, with no retries, durable queue, unload flush or delivery acknowledgement to the UI. It SHALL reuse independent per-producer limits of 120 records per minute and four concurrent requests per Node process, a two-second export timeout and redirect rejection. Telemetry failure SHALL NOT block rendering, authentication, navigation or existing recovery.

#### Scenario: Receiver or forwarding failure
- **WHEN** delivery times out, fails, returns a rejection, redirects, or is interrupted by document closure
- **THEN** the opening is not retried and no application error is displayed for telemetry
- **AND** the document's attempt remains consumed

#### Scenario: Browser budget is exhausted
- **WHEN** browser export reaches its rate or concurrency limit
- **THEN** additional browser records are dropped without consuming independent server capacity

### Requirement: Limit interpretation to received opening evidence

Documentation SHALL explain that received openings describe browser-reported entry screens, not unique people, exact session totals, shortcut attribution, authentication success, completed tasks or abandonment. Absence SHALL NOT prove no opening occurred. Qualification SHALL separately establish wire receipt, receiver-retained classification and deployed-route/device behavior.

#### Scenario: Receipt without journey correlation
- **WHEN** Sentrame accepts an opening without correlation identifiers
- **THEN** verification checks event discovery, browser authority, service and retained screen classification
- **AND** it does not require or claim a reconstructed journey or conversion funnel

#### Scenario: Qualification uses the new local receiver model
- **WHEN** WFS qualification runs against the unpublished local Sentrame build
- **THEN** it records the tested receiver build, storage/projection model, JSON/no-compression path and actual protected receipt/read results separately from mock and other SDK evidence
- **AND** it uses fresh isolated compatible storage without resetting or migrating an existing deployment implicitly

#### Scenario: Entry is followed by a task failure
- **WHEN** a recorded opening is followed by failed login, failed capture or departure
- **THEN** that opening alone does not distinguish those outcomes

### Requirement: Keep initial collection vocabulary bounded

This increment SHALL add only `pwa.app.opened` to the existing synthetic-check vocabulary. Subsequent page transitions, modal opening/closing, clicks, errors and technical requests SHALL NOT automatically create exported records. A modal displayed over the entry screen SHALL NOT replace that page's opening classification.

#### Scenario: Navigate and open a modal after entry
- **WHEN** an opening is observed and the person navigates or opens, closes or reopens a modal
- **THEN** no additional telemetry record is exported by this increment

#### Scenario: Initial page has an automatic context overlay
- **WHEN** a Home opening coincides with an existing Demo or Beta introduction
- **THEN** the opening remains classified as `home`
- **AND** modal presentation does not create another event
