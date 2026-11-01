# Spec Delta

## MODIFIED Requirements

### Requirement: Keep the retired integration absent

WFS SHALL keep API/server instrumentation, feature-specific observations and legacy telemetry configuration retired. Only centrally captured client navigation and browser errors under the explicit installation opt-in SHALL be permitted through ordinary OTel/OTLP. This exception SHALL NOT restore server workflows, request instrumentation or trusted business outcomes.

#### Scenario: Old enabled configuration remains
- **WHEN** the upgraded browser, Node and API processes run with obsolete enabled flag, endpoint and token settings alone
- **THEN** no WFS integration log, span or metric export is attempted
- **AND** no browser telemetry Action or observer initializes

#### Scenario: Product activity and errors
- **WHEN** people navigate, open surfaces, view originals, save or resolve issues, or encounter errors
- **THEN** only opted-in centralized navigation and supported browser-error observations can be generated
- **AND** no feature-specific Sentrame event or server observation is generated
- **AND** ordinary product behavior and error handling remain available

### Requirement: Retire active configuration and guidance honestly

Current guidance SHALL distinguish retired API/server and feature telemetry from the new client-only opt-in, which SHALL default off. It SHALL identify qualified SDK, signal, route and privacy limits without presenting historical evidence as current coverage. Historical archives, release metadata and independently required dependencies SHALL retain their roles.

#### Scenario: Read current setup after cleanup
- **WHEN** an operator reads current samples, capability contracts, test inventory or setup guidance after implementing the client exception
- **THEN** telemetry remains off unless the new installation opt-in and valid owner-provided configuration are present
- **AND** retired capability links identify retirement, and client qualification is described only for tested identities

#### Scenario: Framework dependency still references OTel
- **WHEN** an independently required framework or AI package retains a transitive OTel dependency
- **THEN** its owning dependency edge is documented separately from the single client provider
- **AND** historical source/test evidence is not rewritten as current qualification

## ADDED Requirements

### Requirement: Authoritative installation acceptance and export

The server SHALL default client collection off and independently gate acceptance and upstream export using current valid installation configuration. Browser hints and stored state SHALL NOT authorize collection. Disabled fresh pages SHALL initialize no telemetry provider or correlation; stale enabled clients SHALL produce no accepted or upstream-exported observations after server disablement takes effect.

#### Scenario: Disabled fresh load
- **WHEN** a page opens with missing, false or invalid opt-in or invalid endpoint/key configuration
- **THEN** no client provider, telemetry correlation storage or observation export initializes
- **AND** navigation, invitation, login and normal error handling continue

#### Scenario: Stale enabled browser and queued export
- **WHEN** a browser retains enabled state or queued records after the serving process has adopted disabled configuration
- **THEN** server acceptance and any not-yet-dispatched upstream forwarding are refused
- **AND** the client drops queued telemetry, clears correlation and disables capture when it learns of disablement
- **AND** already dispatched requests and older processes are not claimed to be recalled or disabled

### Requirement: Central navigation observations without feature hooks

Enabled clients SHALL capture initial and committed SPA route transitions at one shared boundary using approved route templates. Distinct returns to a route SHALL retain distinct occurrences. Hydration, remounts and changes only to private query/fragment data SHALL NOT create navigation steps. No business event or configured goal SHALL be required.

#### Scenario: Direct navigation
- **WHEN** an enabled client directly opens an approved route
- **THEN** one initial navigation observation identifies its safe template and explicit visit/tab scope
- **AND** it describes route observation rather than confirmed rendering, interaction or business completion

#### Scenario: Backtracking and repeats
- **WHEN** an enabled tab navigates Home → Search → Home → Planner using links and browser back/forward
- **THEN** the four observed route occurrences preserve their order and distinct event identities
- **AND** the second Home is not collapsed with the first

#### Scenario: Query changes and render replay
- **WHEN** query strings or fragments change without a route-template transition, or a component replays its effect
- **THEN** no additional navigation step is created and no private value is exported

### Requirement: Bounded anonymous continuity and tab isolation

Client logs SHALL use explicit random session and tab identifiers unrelated to identity, traces or URLs. Supported same-origin same-tab invitation, login and reload transitions SHALL retain bounded scope and ordering. Concurrent or cloned tabs SHALL remain separate. Expiry, disablement, unavailable storage or ambiguous ownership SHALL end reuse rather than infer a join.

#### Scenario: Invitation and login recovery
- **WHEN** a supported enabled tab opens an invalid invite, follows Welcome, completes passphrase entry and member selection, and reaches Home
- **THEN** its route observations retain one bounded visit/tab scope across SPA and full-document transitions
- **AND** no token, passphrase, access result, member identity or household identity is recorded

#### Scenario: Accepted invite
- **WHEN** an enabled supported tab follows an accepted same-origin invite and its actual redirects
- **THEN** observations preserve that tab's navigation scope without assuming Discovery was opened or a vote was recorded

#### Scenario: Reload and concurrent cloned tab
- **WHEN** a supported tab reloads within its lease while a duplicate/new tab starts with copied browser state
- **THEN** reload preserves scope and advances sequence, and the simultaneous tab obtains separate scope before emission
- **AND** separate tabs are never ordered into one path

#### Scenario: Expiry or unavailable continuity
- **WHEN** the visit reaches 30 minutes of inactivity or 2 hours absolute lifetime, or safe same-tab ownership/storage cannot be established
- **THEN** a new document scope is used, or dependent observations are dropped
- **AND** continuity is reported unavailable rather than reconstructed from time, identity or a trace

### Requirement: Browser errors support continuation

Supported uncaught browser failures and shared framework-boundary errors SHALL be minimized technical logs. Available explicit visit/tab context SHALL associate them with navigation. Errors SHALL remain supporting evidence rather than navigation steps or automatic failure/exit rules. Errors observed before supported initialization SHALL NOT be reconstructed from raw logs.

#### Scenario: Error followed by continuation
- **WHEN** Home → Search is followed by a captured browser error and then Planner
- **THEN** the path remains Home → Search → Planner with the error inspectable as supporting evidence
- **AND** neither error severity nor subsequent navigation establishes journey failure, causality or recovery of the failed operation

#### Scenario: Missing context
- **WHEN** an otherwise supported synthetic log lacks session or tab context
- **THEN** reception remains possible under the receiver contract but the log remains unassigned to a journey
- **AND** no server-workflow, trace or nearby-time fallback supplies the missing context

### Requirement: Minimize before buffering and export

Only approved names, route templates, bounded technical categories, release metadata, timestamps and random correlation/record identities SHALL reach telemetry queues or export. Raw URLs, queries, fragments, referrers, DOM/input text, searches, identifiers for recipes or people/households, invitation tokens, credentials and raw exception content SHALL be excluded. Server acceptance SHALL enforce the same closed policy.

#### Scenario: Automatic instrumentation has unsafe defaults
- **WHEN** instrumentation produces URL, exception message/stack, arbitrary resource, attribute, body or trace context
- **THEN** those fields are removed or replaced with approved bounded values before queueing and wire export
- **AND** a sanitizer failure drops the record without logging its private content

#### Scenario: Hostile standard payload
- **WHEN** a browser submits malformed, oversized, unsupported or policy-violating OTLP
- **THEN** the same-origin boundary rejects it without forwarding or echoing sensitive content
- **AND** valid requests use the configured fixed upstream destination without browser-supplied credentials or destination overrides

#### Scenario: Invitation location and ambient request headers
- **WHEN** an opted-in browser on an invitation URL exports telemetry through its same-origin endpoint
- **THEN** request referrer information does not disclose the invitation URL or query
- **AND** no household cookie, browser Authorization, Referer, user-agent or forwarded client IP is sent upstream to Sentrame
- **AND** transport visibility at the existing PWA/proxy is described separately from payload privacy

### Requirement: Goal-free investigation preserves evidence limits

Qualified navigation logs and errors SHALL support ordered goal-free exploration with explicit correlation. Repeated steps, last retained observations and available continuation SHALL remain inspectable without custom business events. Supporting request spans, severity, HTTP success and inactivity SHALL NOT establish steps, durable persistence, completion or abandonment.

#### Scenario: No mapping or goal
- **WHEN** synthetic Home → Search → Home → error → Planner logs reach a compatible receiver with an empty definition
- **THEN** protected reads show one ordered navigation path with repeated Home and a supporting error
- **AND** completed-goal counts remain zero, and the last retained observation is Planner without an inferred business outcome

#### Scenario: Late delivery and exact replay
- **WHEN** uniquely sequenced observations arrive out of order and identical identified records are replayed before or after receiver restart
- **THEN** protected reads retain distinct genuine repeats and the supported ordered path without multiplying replayed evidence
- **AND** conflicting identities or unreliable ordering remain explicit rather than overwriting or inventing evidence

### Requirement: Analytics failures remain isolated

Telemetry initialization, storage, parsing, queueing, rate limits, forwarding and receiver failures SHALL NOT interrupt application actions or change business retries. Queues, batches, requests, concurrency and waiting SHALL be bounded. Delivery SHALL remain best effort; no shutdown, offline or population completeness guarantee SHALL be inferred.

#### Scenario: Receiver or analytics path fails
- **WHEN** the receiver times out or rejects delivery, or telemetry initialization/storage throws during login or navigation
- **THEN** the product action and its normal feedback/recovery continue independently
- **AND** telemetry does not recursively report itself, persist an offline queue or retry a business request

### Requirement: Separate qualification evidence

Acceptance SHALL identify source/runtime/configuration and separate capture, export, protected durable receipt/read and derived journey evidence. Local success SHALL NOT qualify deployed routing, another browser or a physical device. Receiver capabilities present only in plans SHALL remain dependencies rather than promised WFS behavior.

#### Scenario: Export returns success
- **WHEN** an exporter reports HTTP success without protected retained reads and derivation checks
- **THEN** only the observed wire response is recorded, not durable receipt or journey qualification

#### Scenario: Local synthetic qualification
- **WHEN** an isolated browser/exporter/receiver check passes
- **THEN** exact tested versions, payload privacy, retained identities, ordering and goal-free outcomes are recorded
- **AND** deployed-route and device checks retain their independent passed, failed, blocked or not-run status
