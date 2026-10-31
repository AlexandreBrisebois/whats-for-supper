# Anonymous PWA telemetry

## M5 remaining presentation integration — 2026-10-31

M5 tasks5.1–5.3 are accepted (16/20 overall): focused, actual exporter/protected-receiver and final scoped repository checks pass. No M6/M7 implementation is included. Earlier M4/M3 and F-series evidence keeps its original identity; this section adds presentation declarations only.

| Actual rendering owner | Fixed `stage.name` for `pwa.surface.opened` / `pwa.surface.closed` |
| --- | --- |
| Planning pivot, non-cooking draft, Tonight recovery | `planning.pivot`, `planning.non_cooking`, `planning.recovery` |
| Family nudge, invitation sharing, member flyout | `discovery.nudge`, `invite.share`, `profile.members` |
| Demo/Beta explanation consumer, generic native Demo dialog | `demo.introduction`, `demo.dialog` |
| Image lightbox, bundle review, upload overlay, queued panel, ready panel | `capture.image_review`, `capture.bundle_review`, `capture.upload`, `capture.queued`, `capture.ready` |

These selectors also require authenticated source `browser`, resource service `wfs-pwa-browser`, log carrier, INFO9 and scope `wfs.anonymous`. They share the existing document/session/tab identity, source ordering and sixty screen/surface attempts per minute; SDK/exporter/credentials/admission remain unchanged. A queued or ready panel is browser presentation, including when notification-driven. It certifies neither durable capture readiness nor loaded recipe detail. No member selection, invitation delivery/acceptance, plan save, reset or processing outcome is emitted. Titles, dates, drafts, member/link/file/recipe/PIN/content and hashes stay outside the closed envelope.

All consumers reuse the existing per-instance shared lifecycle. `ProfileDropdown` supplies false during its loading return. `MinimalCapture` excludes branches hidden by the actual `CaptureWithPdf` PDF-selection wrapper; hidden pre-mounted inputs and thumbnail-only `ImageReview` do not open a surface. Native `DemoDialog` records presentation after successful `showModal()` and actual `open`, not mount; native close reads current open state so a delayed prior close cannot erase a reopened instance. `DemoExplanation` supplies the fixed introduction identity rather than deriving one from Demo/Beta copy. Shared `Modal` and Grocery remain structural/primary/companion decisions, and browser confirms, camera/file pickers, native share sheets and external apps remain unobservable platform exceptions.

The real qualification extends `telemetry-surfaces-live.spec.ts` through copied production components/root/Action/standard SDK and fresh isolated protected Sentrame. Direct synthetic composition is explicit: `ImageReview` currently has no production caller, and generic `DemoDialog` is separately mounted by the fixture while actual introduction uses `DemoContext`→`DemoExplanation`. Browser API responses are schema-compliant synthetic mocks, and PDF masking changes the existing foreground store; no database/provider persistence or real PDF/OS-picker/share behavior is claimed. Received sequences are mapped by exact event/stage before deriving paths; the presentation-only definition has no goal or pre-seeded paths.

Reproduce with `WFS_OTEL_SENTRAME_BINARY=<reviewed-owned-launcher> task test:e2e -- telemetry-surfaces-live.spec.ts --config=e2e/telemetry.playwright.config.ts`. The M5 launcher uses immutable receiver image `sha256:5ff1b05e898a66b5845757d6d092f2e673ff28959ad72db795d5f8ad9dd139f8`, verified label source digest `8c540fb9609ce43f9542c608ab332b166173ca65034150d75b9edc7c635cadd2`. An older binary's no-goal incompatibility is not retried or reclassified. Toolchain remains Node26.12.0/npm11.21.1/Next16.4.2/React19.3.1/OTelAPI1.10.0/SDK3.0.0/exporter0.300.0, HTTP Protobuf/no compression. TimeoutB, standalone shutdownA and the approved .NET diagnostic-body limitation remain unchanged; no SDK fork/custom cancellation/hosting.

Focused final acceptance `.task/otel-apply/m5-focused-final.txt` passes151 tests in14files; full unit feedback passes1564/1564 (`m5-all-unit-green.txt`). Four required mocked browser suites pass61/61 (`m5-business-e2e.txt`) against an owned copied app with telemetry disabled. Source coverage explicitly includes ActionGearMenu and ProfileDropdown flyouts and removes all selected deferred exceptions, retaining structural/platform decisions. CI inventory/selection passes8/8. Intended red and native-close/PDF-hidden regression evidence remain under `.task/otel-apply/m5-*`; the first broad unit failure also retains two incomplete pathname mocks and sandbox socket EPERM, followed by corrected86page tests and the full green suite. Live run1 stopped on a driver alert ambiguity with Next's route announcer; its resource cleanup is confirmed and evidence retained. Actual run2 passes1/1 (zero skips) in3.2minutes:204 retained records across five fresh document/process scopes (45 existing state/nesting,26 remaining inventory/native,24capture,47detail/original caps,62surface storm),79 SDK HTTP Protobuf batches. All320 copied production inputs match current source; exact captured replay and receiver restart/storage reopen preserve retained evidence and derived journeys. Explicit protected evidence/journey projection digest `68eb2b1b0af6a74c32419ab425c2650c2cd2e588b80f06a3f6aed1e68f43089f`; full snapshots also include volatile receiver clock/health metadata and are not byte-identical. Artifacts: `.task/otel-apply/m5-live-run2/telemetry-surfaces-live-ac-15d47-ive-protected-replay-reopen-chromium/`; compact exact summary `m5-live-run2-summary.json`. All13 new identities open/close under browser authority; hidden transient/PDF suppression, native reopen, interrupted upload/failure/retry, same-identity nesting and absent private sentinels pass. After run2, review added GET/POST guards to the family/bundle mock handlers; production bytes stay unchanged, but final gate must qualify those final fixture bytes. First33path gate `.task/agent-finish/runs/cf1538a7f52e40b1adc00f30d84aa61f.json` passes all checks except browser impact:612pass/47documented skips and one stale navigation stream expectation. That older test enters Quick Find through Planning Pivot and now correctly receives pivot open/close each cycle (20first-document records,24total instead of16/20). Its exact expected sequence and default receiver activity mapping are updated rather than filtering out received facts; product source is unchanged. The M5 surface fixture passes at final guarded bytes in that gate, with204records/79batches/320matching production inputs and protected replay/reopen (`m5-gate-round1-live-summary.json`). Both the failed gate and initial driver failure remain retained. Focused actual navigation/receiver acceptance then passes1/1zero skips in43.4seconds (`m5-navigation-green.txt`), including24retained records, exact new pivot sequence/mapping and protected replay/reopen. A fresh35path gate is required for5.3; first-gate resources are cleaned before it. Final fresh35path gate `.task/agent-finish/runs/31c7c3d9b9044b2eba1bebde6c064da2.json` passes every applicable check at stable identity `197ddcf6ba6234fc2d9ed872343a825d3ac5125d3d7cc39b2f052503948f0b24`:1564units,613browser/47documented skips,1301API/167opt-in skips,39strict items,lint/format/types/five static contract-client checks/content. Its final actual surface proof retains204records in80SDKHTTPProtobuf batches (same five scope counts), with protected projection digest `d7c7471097f47ea1bd9a3f073c7b37837ec8993cc1c590e31fac2d99a677ad40`. All320production inputs and fixture before-build/runtime/current hashes match; exact retained evidence and derived journeys survive replay/reopen. Canonical current artifacts `m5-live-final/telemetry-surfaces-live-ac-15d47-ive-protected-replay-reopen-chromium/` and `m5-live-final-summary.json`. Earlier run2 used79batches and has its own identity/digest; it is not relabeled. All7dynamic receiver lifetimes,2gate-native receivers/networks/private roots and2app hosts/copies are independently removed (`m5-final-resources.json`);18985/18988free. Five later completion docs receive separate verification in the handoff; no later document bytes are assigned the earlier application identity.

No production collection, Sentrame writes, M6 Save-result/Resolved, M7 reconciliation, sync/archive, staging, commit, push or deployment. Deployed proxy/tunnel/container-route, physical phone/camera/share/OS discard, native zoom and assistive-device qualification remain separately unqualified. Shared18986/preview19010/3000/5001 and inherited synthetic API/DB are outside these owned resources.

## M4 presentation integration — 2026-10-31

Bounded M4 implements the nine recipe/original/cooking identities below through the existing document observer and standard browser log provider. Tasks4.1–4.4 are accepted (13/20 overall): current actual exporter/protected-receiver qualification and final scoped repository verification pass. Earlier M3/F-series sections retain their original runtime identities. No production collection or Sentrame source/document changes are implied.

| Trigger | Exact log selector | Fixed field / meaning |
| --- | --- | --- |
| Actual recipe/detail, plan, action flyout, filters, issue editor, bin, PIN, original viewer or cooking shell | `pwa.surface.opened` / `pwa.surface.closed` | `stage.name` respectively `recipe.detail`, `recipe.plan`, `recipe.actions`, `recipe.filters`, `recipe.issue`, `recipe.bin`, `recipe.purge`, `original.photos`, `cooking.reader`; availability only |
| Current authoritative detail has committed loaded content | `pwa.recipe_detail.presented` | Current primary `stage.name`; body `WFS presentation observed`; no extra reason |
| Successfully loaded current local original image is visible | `pwa.original.presented` | `reason=image`, current primary stage; body `WFS original observation` |
| Existing detail/cooking action calls external launch | `pwa.original.requested` | `reason=external`, current primary stage; intent even if popup blocked |

Selectors additionally require authenticated source `browser`, resource service `wfs-pwa-browser`, carrier `log`, scope `wfs.anonymous` and INFO9. Original reasons are exact and cannot be exchanged. Non-surface stage is the actually presented primary screen (`planner.grocery` included), not a recipe/viewer identity. Existing opening body, source occurrence time, Node observation time, event/session/tab IDs and shared sequence remain unchanged. No recipe/image identity, index/count, content, URL, user or durable correlation is exported. The Action rejects unknown keys, dynamic names, wrong reasons and non-primary content stages before standard SDK admission. Standard pre-batch projection separately fixes bodies and removes unsupported attributes/context.

Integration pattern: semantic consumers call the shared static surface hook with their actual render/open predicate. The shared `Modal` accepts an optional reviewed `surfaceIdentity`; its title never supplies identity. Multiple true instances aggregate zero-to-one open / one-to-zero close with local opaque tokens; one instance's stale effect cleanup cannot close another. Mounted/CSS-hidden/native-unshown state is not visible presentation. Native consumers must declare only successful native open state; M5 owns the remaining native Demo adoption. Covered/inert cooking/detail can remain presented, without attention or exclusive-screen inference.

Loaded observations are separate declarations at the committed-content owner, reconciled after root readiness and visible-document eligibility. A read promise resolving, opening a shell, failed/stale response or loading image does not certify content. Detail entry tokens rearm only for identity replacement/new entry, not notes/rating/polling updates. Original tokens follow the resolved local image selection and selection lifetime; both load and error callbacks reject departed images before changing readiness. This prevents an exiting image from erasing current hidden readiness, or old success from qualifying a pending source replacement. Zoom/pinch/pan/scroll/repeated callbacks add no records. External focus, visibility, viewer close and return never mean reading, handoff or cooking completion.

Caps are shared by the in-memory document owner:20 loaded detail attempts and20 combined original requests/presentations, plus the existing60 screen/surface attempts/minute. Admission and entry claims precede asynchronous submission; remount and effect replay cannot refill caps. These are best-effort point observations. Sequence gaps/missing records remain incomplete paths; paired duration requires a separately reviewed shared occurrence contract. No heartbeat, DOM capture or event-stage goal is fabricated.

A receiver mapping chooses whether received evidence contributes a step/activity, optional goal or no journey contribution. Paths/status are derived from that configured prospective definition; names/stages/reasons and source clocks are producer facts. This slice's disposable presentation-only definition intentionally has **no goal**: shell/image closure is not completion. Verify the selected receiver executable/image itself supports that configuration; an older reviewed executable rejected it while later source documentation already described it. Source documentation is not binary/runtime proof. Matching receiver build identity and actual protected reads/replay/reopen are required.

Runnable task4.4: select an independently reviewed compatible local executable (or an owned launcher for an already reviewed immutable local receiver image) as `WFS_OTEL_SENTRAME_BINARY`, then run `task test:e2e -- telemetry-surfaces-live.spec.ts --config=e2e/telemetry.playwright.config.ts`. The fixture owns copied Next processes, fresh receiver registry/storage and loopback ports; mandatory missing configuration fails rather than silently qualifying a wire-only fallback. Business APIs are synthetic browser boundary mocks; no database persistence is claimed. Shared18986/preview19010 and inherited synthetic API/DB are outside its resource set. TimeoutB, standalone shutdownA and the approved .NET diagnostic-body limitation remain unchanged. Device/proxy/tunnel/OS sharing remain separately not-run.

Actual schema-compliant qualification `m4-live-run8.txt` passes1/1 with154 retained records across three fresh document scopes:45 state/nesting,47 lifetime-cap and62 transition-storm observations. Protected read equality, exact captured-batch replay, receiver restart/storage reopen and no configured goal all pass. The captured projection digest is `e96de6378cd0edf456bf21a4501a0dd327211103c67b0a33f08ba9930e03b25d`. Production source closure is320 inputs on Node26.12.0/Next16.4.2/SDK3.0.0/exporters0.300.0, HTTP Protobuf without compression; current bytes match its pre-build manifest. Fixture/protected/runtime/screenshot evidence is `.task/otel-apply/m4-live-run8/telemetry-surfaces-live-ac-15d47-ive-protected-replay-reopen-chromium/`. The launcher uses immutable receiver image `sha256:5ff1b05e898a66b5845757d6d092f2e673ff28959ad72db795d5f8ad9dd139f8`, inherited receiver source digest `8c540fb9609ce43f9542c608ab332b166173ca65034150d75b9edc7c635cadd2`; launcher/image identities are separate from an older standalone binary. Screenshot inspection confirms a real loaded synthetic SVG and nested viewer controls; it does not qualify real photographs or devices. All fixture resources are owned and removed. Earlier config/fixture failures, interrupted locator run and green-but-contract-inconsistent diagnostic run6 remain historical and are not this acceptance. The initial34path gate4092b76afe3c480f91e926b1a73213d4 passed all checks for earlier source. A later review reproduced released-but-unobserved admission before cleanup (two intended failures); points now deactivate synchronously and surfaces preserve only already-observed identities through deferred cleanup.106focused tests and this fresh run8 pass; fresh final34path gate `.task/agent-finish/runs/58e61af61e2248fb811c97bc1f4a2c3e.json` passes every applicable check at identity `c6b9bb79fda16fe1396380273b5efb2a747f1c3f4be150efb6eb83ca2a4c20af`:1529unit,613browser/47documented skips,1301API/167opt-in skips,39strict items,lint/format/types/five static contract-client checks and content stability. No live endpoint/database check is selected for this UI-only slice. Completion-document bytes are qualified separately in the handoff.

## M3 API integration — 2026-10-31

M3 now implements one host-owned standard .NET trace provider and one private typed log producer. Tasks 3.1–3.3 are accepted (9/20). The fresh combined69-path gate passed every check, including1,501 unit/612 browser tests/1,301 API tests/193 real PostgreSQL tests; browser 47 documented skips and API 167 opt-in skips remain explicit, with zero relational skips. Stable current qualification covering 18 cases receiver/PostgreSQL qualification also passed with zero skips; earlier M3 pending-decision entries below remain historical. The user approved keeping OTel 1.20.0 with its reproduced diagnostic-body limitation at 2026-10-30 23:46 UTC. No M4 work or production collection was started.

`Program.cs` calls `AddWfsTelemetry(builder.Configuration)` instead of the old hosted `.WithTracing` block. Existing ASP.NET/HttpClient instrumentation remains; operational Serilog logging/metrics retain their destinations. Broad operational logging aimed at the selected Sentrame origin is refused at startup with a fixed message, including configured/ambient OTLP endpoints and known loopback aliases. Invalid or disabled selected telemetry otherwise starts without a selected exporter. The programmatic legacy sink uses its supported instrumentation-suppression callback; known operational/exporter origins are excluded from selected native traces.

API Compose forwarding supplies only `WFS_TELEMETRY_ENABLED`, `SENTRAME_OTLP_BASE`, `SENTRAME_SERVER_TOKEN`, and `WFS_VERSION`; it supplies no browser token. The exact flag is `true`, with a valid HTTPS origin (or explicit loopback HTTP), no userinfo/path/query/fragment, and a nonempty private server token. Comma/percent token characters are rejected before SDK header parsing. API settings are an immutable process-start snapshot: recreate the selected API container/process after changes. There is no API hot-enable/hot-disable or live batch-entry reconfiguration promise. The existing PWA checks and distinct browser/server credentials retain their own policy.

The trace provider and isolated logging service collection each own private in-memory SDK configuration selecting `OTEL_DOTNET_EXPERIMENTAL_OTLP_RETRY=in_memory`, with no environment providers. Ambient exporter/disk/resource settings cannot enable, retarget or enrich this selected export. Do not substitute public exporter constructors that recreate ambient experimental options. Standard HTTP Protobuf/no-compression exporters own serialization and retries. Redirects are disabled, each signal has one connection, each standard queue holds 256 waiting records with batches at most 64 and delay at most one second; caller/processor waits are configured to two seconds. Saved-fact admission is at most 100/minute. Trace capacity is independent.

The approved .NET limitation is separate from Node timeout B and Next shutdown A: OTel 1.20 Error diagnostics can leave an unsuccessful response-body read inactive beyond two seconds (pinned Linux RC2 probe >3.2s), even when `ForceFlush` returns true. Neither flush completion nor `HttpClient.Timeout` proves all I/O terminated. No total network deadline, diagnostic-body inactivity bound or blocked-read shutdown guarantee is claimed. No SDK fork, custom cancellation/transport, global diagnostic patch, new dependency/service or disk retry was added.

Pre-batch native projection fixes names to `api.request`/`api.http`, preserves native timing/kind/local IDs/parentage, and retains only canonical `http.request.method` and integer `http.response.status_code`. Dynamic route classification is omitted. Unknown sources/kinds or immutable events, links and unsupported source version/tags/schema drop before the stock batch queue through `Recorded=false`. Mutable tags, status descriptions, baggage and tracestate are removed. Roots use standard parent-based 10% local sampling; both remote-parent decisions and their descendants are excluded. Resources contain exactly service `RecipeApi`, configured version or `unknown`, and fixed SDK name/language/version; no detected instance/host/process identity.

The existing committed persistence observer now emits only `wfs.recipe_issue.saved`: INFO9, fixed body `WFS recipe issue saved`, random UUID `event.id` and fixed retained `event.name`. The .NET exporter does not set the newer log EventName field; the receiver's retained fallback is qualified. The private log factory takes no ambient scopes/exception and temporarily clears Activity only for the synchronous log call, then restores it. Wire records have no trace/span/document/business fields. Occurrence and observed time are equal for this server observation. Ordinary confirmed saves include unchanged/manual feedback and saved-before-launch/read failure; rejected/uncertain/outer-transaction paths emit no saved fact. `Resolved()` remains M6.

Actual host RC3 Kestrel/controller/service/PostgreSQL exporters reached a fresh owned Sentrame image `sha256:5ff1b05e898a66b5845757d6d092f2e673ff28959ad72db795d5f8ad9dd139f8`. Protected reads preserved authority, fixed bodies/names, resource service/version/language, canonical HTTP attributes and native local parentage. The receiver intentionally projects SDK language but omits SDK name/version; maintained OTLP protobuf decoding separately verifies all five original resource attributes and the fixed SDK resource schema. Lost-ack retry preserved exact bytes/IDs/times; exact replay and receiver-volume reopen preserved retained identity. The pinned Linux SDK/runtime RC2 production-Program smoke separately exported 16 safe native spans from 185 requests with no repeated foreign context/private sentinels; its baseline startup control exported none. These are separate runtime identities, not a claim of protected Linux-container retention. Current evidence lives under `.task/otel-apply/m3c-api-receiver-final2/` and `m3c-linux-smoke-final/`. Full gate: `.task/agent-finish/runs/85349608c8c247cc920fd36f1d618512.json`; exact identities, cleanup and later completion-document verification are in the handoff. Earlier green4 concurrent-mutation failure and the transient Tomorrow mock-cleanup gate failure remain historical.

Runnable qualification (synthetic owned resources only): choose an already reviewed local `WFS_API_SENTRAME_IMAGE`, export `WFS_TEST_POSTGRES_CONNECTION` for an owned disposable PostgreSQL admin database, then run `task test:database -- --filter FullyQualifiedName~RecipeIssueTelemetryPostgresTests`. Missing required receiver/database configuration blocks this explicit acceptance. The default database gate excludes `LiveReceiver_` tests; ordinary API runs show them as opt-in skips. The fixture owns only its fresh receiver/container/network/volume/database, uses protected reads, and removes its resources. It does not use shared receiver 18986, preview 19010 or real storage. `task test:api -- --filter FullyQualifiedName~RecipeIssueTelemetry` exercises the focused policies; its opt-in skips do not replace the live command.

For a .NET integration example, reuse the repository's existing OTel 1.20 packages and `builder.Services.AddWfsTelemetry(builder.Configuration)` registration; do not also register `.WithTracing`, a parallel agent, a generic application logger exporter or a Collector. Configure only the four server-owned variables above, keep the default flag false, and recreate the process after configuration changes. The tested setup is the repository's pinned Linux .NET 11 RC2 runtime; the host protected fixture is RC3. Deployed proxy/tunnel, physical devices and blocked-read shutdown remain separately unqualified. Sentrame guide changes belong to its documentation owner; this WFS task made no Sentrame source/doc writes.


F2-1 implements correlated opening and route presentation through the existing
browser-authority transport. F3-1 adds [initialized native browser errors](#f3-1-native-browser-errors--2026-10-29) with minimized diagnostics and optional existing context. F3-2 adds [route/root render boundaries and standalone Next Node errors](#f3-2-renderroot-and-next-node-errors--2026-10-30). Planner/Grocery composition and the Quick Find shared-surface pilot are implemented. Historical F1 evidence below describes its earlier stage-only bytes; see
the [navigation mapping recipe](#planned-navigation-mapping-recipe) and the
[active opening delta](../openspec/changes/observe-pwa-navigation/specs/anonymous-pwa-telemetry/spec.md).

Telemetry is disabled unless the deployment administrator explicitly sets
`WFS_TELEMETRY_ENABLED=true` in the container environment. All three Sentrame
settings below must also be present and valid; otherwise collection stays off.
The opt-in applies to this deployment, not a per-member preference.

```dotenv
WFS_TELEMETRY_ENABLED=false
SENTRAME_OTLP_BASE=
SENTRAME_BROWSER_TOKEN=
SENTRAME_SERVER_TOKEN=
```

Set the base to your reachable Sentrame origin (HTTPS outside local development),
and copy the two distinct producer tokens from the selected app's generated
connection settings in Sentrame's owner UI.
Never use a viewer passphrase. Keep these values in the private env file, never
in Git or `NEXT_PUBLIC_*` variables. The endpoint must have no path, query,
credentials or fragment. Producer tokens must be distinct, nonempty visible ASCII
values after trimming; embedded whitespace, control characters and Unicode fail
closed. Container localhost means the PWA container itself.

For repository Compose deployments, edit `docker/.env.local`. For the Synology
release template, edit its `.env`. Recreate the PWA container using the same env
file and Compose file selection used to start the deployment. For example, in
the Synology deployment directory: `docker compose --env-file .env up -d --force-recreate pwa`.
Deploy an image containing this integration first; subsequent setting changes
require container recreation, not an image rebuild. Reload open tabs after changes.
No existing deployment was enabled by F1-1, F1-2 or F1-3.

## Application version

All existing synthetic, presentation and browser-error producers include the standard OTel
resource attribute `service.version`, alongside their distinct `service.name`.
This follows "Send your app version" in the local Sentrame developer guide. WFS
reads the existing server-owned `WFS_VERSION` deployment metadata; blank/missing
values produce literal `unknown`. It is resource metadata, not a log attribute
or a value accepted by the browser action.

Set `WFS_VERSION` to the actual immutable app release (for example `1.4.2`) or
build commit SHA and keep it unchanged for that deployment. Repository Compose
forwards this variable; its production override defaults to the required release
`TAG`. The Synology release bundle already forwards the `WFS_VERSION` that also
selects its images. For local source builds set `WFS_VERSION` explicitly if you
need build attribution; an unset value deliberately reports `unknown` rather
than guessing from package/SDK/receiver versions or a mutable image tag.

No `SERVICE_VERSION` or `OTEL_RESOURCE_ATTRIBUTES` setting is needed for WFS's
manual serializer: those variable names configure the guide's other examples.
Changing release metadata uses the same container recreation/document reload
procedure as other server runtime settings. This does not enable collection.
Opening and screen records carry only static `stage.name` and the reviewed
anonymous context on each log. F2-1's disposable receiver check verifies version
projection separately from the historical capture-only checks.

## Collection contract

When opted in, the shared root/identity gate observer attempts one
`pwa.app.opened` for the first eligible visible route shell of a fresh document.
Search (`/recipes`) is classified as `search`. A full reload permits another
opening; internal navigation and component remounts retain the same in-memory
claim. This observes a committed shell, not loaded data, paint acknowledgement
or human attention. No per-page calls or navigation-handler instrumentation are
required. Eligible visible route transitions additionally emit `pwa.screen.presented`;
consecutive identical presentations, remounts and unchanged resume emit nothing.
Hidden transitions are discarded; visibility reconciles only the current shell.
Initialized uncaught script errors and unhandled rejections use the minimized error path below. There is no automatic click, render/root/server-error, trace or business-event stream; only the reviewed shared surfaces are observed.

The classification describes the presented destination after access/member gates:
Search or Capture redirected for access yields `welcome`; a required member
selection yields `onboarding`. Member and voting invitations, including rejected
invitations, use `invite` while their joining/rejection shell is presented. Later
redirects in that document add no opening. Capture query variants all use
`capture`; shared text, titles, URLs and handoff tokens never become attributes.
Desktop destination checks do not qualify actual operating-system share delivery.

A hidden document waits until visible and uses the current eligible route, not a
saved hidden candidate. Readiness is invalidated when the pathname or checked
identity inputs change; `/` during redirect is never an entry. Cancelled/unmounted
candidates produce no record. Effect replay, remounts, same-document history
restoration and visibility/resume do not reset the claim. Initial disabled state
cannot be rearmed by navigation; no inactivity timer or storage is used.

Shared rendered error and not-found composition declares only `error` and
`not.found`, taking precedence if it is the first eligible screen. A later error
does not replace an already claimed opening. If startup fails before the shared
observer can run, no event is promised. New unregistered application pages use
`other` automatically, with no dynamic path content exported. Home remains `home`
beneath a context dialog. Approved dotted labels include `capture.confirm`,
`profile.settings` and `browse.stack`.

The `reportBrowserObservation` Server Action accepts exactly `eventName`, `screen`,
`sessionId`, `tabId`, `eventId`, `sequence` and `timestamp`. Names are limited to
opening and screen presentation, screens use the closed registry, IDs are random
UUID v4 values, and sequence/time must be positive safe integers. Unknown own
fields, arrays, accessors, malformed objects and input over 2 KiB are rejected
without echo. Destination, browser credential, body and resource metadata remain
server-owned; Next.js same-origin protections remain in place. Public entry needs
no household identity and confers no business authority. Only the enabled boolean
reaches the observer; endpoint and producer tokens remain server-side.

Both observations are INFO (severity 9) named OTLP logs:

| Field | Fixed value / meaning |
| --- | --- |
| Resource `service.name` | `wfs-pwa-browser` |
| Resource `service.version` | Trimmed deployment `WFS_VERSION`, or `unknown` when unset |
| Scope | `wfs.anonymous` |
| `eventName` | `pwa.app.opened` or `pwa.screen.presented` |
| Body | `WFS opening observed` or `WFS presentation observed` |
| Record attributes | Static `stage.name`, random `session.id`, separate `tab.id`, distinct `event.id`, integer `source.sequence` |
| `timeUnixNano` | Browser observation in milliseconds, converted exactly to decimal nanoseconds using BigInt |
| `observedTimeUnixNano` | Server forwarding observation, captured before deferred `after()` export |

WFS requires `stage.name` on this event to distinguish screens. It is an
optional **Sentrame application convention**, not standard OTel semantics or a
Sentrame reception requirement. It belongs on the log, not the service resource.
It supplies no Kind, goal, authority, duration or automatic journey mapping.

The closed vocabulary also retains `pwa.telemetry.check`, the fixed synthetic
INFO log. Server-only `sendServerCheck()` and `sendBrowserCheck()` use their
respective credentials. The unwired `reportBrowserTelemetryCheck()` Server
Action takes no client payload. No diagnostic trigger route or startup check
is installed. Opening records consume the browser budget, leaving independent
server-check capacity.

All named logs use the existing standard OTLP/HTTP JSON transport: `POST /v1/logs`,
`Content-Type: application/json`, **no compression**, and a server-held producer
Bearer header. There is no new SDK/provider, proprietary envelope or generic
browser OTLP relay. Sentrame receipt time is a separate clock.

Opening and screens share document-local random session/tab IDs, with distinct
event IDs and increasing sequence allocated before admission. Opening precedes
the initial screen. Initially disabled documents generate no scope; each reload
or new tab receives independent context. No trace/span, person, device, recipe or
household identity is created. There are no telemetry cookies, persistent storage or
cross-document handoffs. No raw route/query, referrer, title, shared content,
file metadata, user text, messages, stacks or hashes of user content enter the payload.
The local document claim suppresses duplicates; it cannot prevent forged or
replayed browser submissions at the receiver.

Configuration is checked on each export. Each producer retains independent
limits of 120 records/minute, partitioned into 20 errors and 100 ordinary records, and four concurrent requests per Node process. F3-2 uses the server error partition for the awaited Node hook; F3-1 alone did not add that adapter.
Native errors share ten attempts per document lifetime; remount and minute rollover do not replenish them. Screens additionally share a 60-attempt/minute document cap (opening is exempt
from that local cap). Sequence gaps can reflect local or server drops.
Exports time out after two seconds and reject redirects. Failure consumes the
opening attempt; there is no retry, durable queue, unload flush or delivery
acknowledgement to the UI. The Server Actions schedule export with Next.js `after()`, so their complete
responses finish before receiver I/O. Rendering, navigation and subsequent client
Server Actions do not wait for the receiver. The two-second timeout bounds only
the deferred export.
Rejected shapes and disabled/invalid configuration produce no export. Receiver
rejection (including 429/503), redirects, timeout and exhausted budgets drop the
observation permanently, without blocking later changed presentations. Opening
and unchanged presentations never rearm after navigation or resume. A failed
request releases its concurrency slot; admitted attempts consume rate capacity
even on receiver failure until the minute window resets. Browser checks and openings share the browser budget;
server checks keep independent capacity. There is no replay after settings recover.
To opt out or correct settings, edit the private env file, recreate only the PWA
container with its existing Compose/env selection, and reload open documents.
Initially disabled documents never queue an opening for later navigation.
These per-process limits multiply across processes and are not a global cap.

Received records answer which entry screens were reported. They do not count
unique people, exact sessions, shortcut use, authentication success, task
completion or abandonment. Missing records do not prove that no opening occurred.
Historical uncorrelated logs provide no journey path. Revised context supports
explicitly configured paths; presentation supplies no dwell, attention or duration.

## Qualification

The reviewed integration target is the local `/Users/alex/Code/sentrame` tree,
with its `docs/DEVELOPER-GUIDE.md`, `docs/integration/OTEL-CONTRACT.md`,
`docs/integration/AGENT-INTEGRATION.md`, relevant `docs/USER-GUIDE.md` sections
and `docs/verification/standard-otel.md`. At F1-2 review, HEAD remains
`5a2646fc053af7ddf12bd9d13717adf060ea525f` with dirty multi-app receiver/UI changes.
Four guide hashes have drifted from the historical
[opening design snapshot](../openspec/changes/archive/2026-10-29-centralize-pwa-opening-observation/design.md#local-sentrame-compatibility-target);
current hashes and reconciliation are in the
[F1-2 evidence](../openspec/changes/archive/2026-10-29-centralize-pwa-opening-observation/tasks.md#f1-2-evidence-2026-10-29).
The current guides assign apps through generated producer credentials without an
app-ID attribute; JSON `/v1/logs`, browser authority and optional `stage.name`
remain source-supported. This does not qualify the changed receiver at runtime.
HEAD alone does not identify its content. No Sentrame files or storage were changed. The reviewed ledger describes
schema 3, projection `structural-v2`, computation `journey-native-v3`; its SDK
Protobuf samples do not qualify WFS's JSON path. Use this local target until an
equivalent publication is verified, rather than assuming the older GitHub guide
or a published image includes this model.

F1-1/F1-2/F1-3 use a disposable wire-capture receiver, not Sentrame. The owned fixture
copies the actual application source/configuration into a temporary Next root,
builds and starts its own optimized instance with synthetic credentials and ephemeral ports, reuses
business API mocks, and preserves real root/proxy/identity gate/action/exporter
behavior. It does not read private env files or use a household database. Its
`opening-payloads.json` Playwright attachment retains only the minimized JSON
bodies for review, without producer headers or credentials.

| Qualification cell | F1-1/F1-2/F1-3 evidence / boundary |
| --- | --- |
| Focused unit/transport checks | Passed; approved Search wire shape, document claim, and existing synthetic configuration/transport/budget checks |
| Chromium -> real action -> Node capture | Passed; one fresh Search record, none after same-document Search → Home → Search, another after reload |
| Payload/privacy review | Passed; exact fixed envelope plus one `stage.name=search`; no trace/session IDs; endpoint and both synthetic tokens absent from loaded scripts, HTML and action responses |
| Entry, lifecycle and fallback cases | F1-2: focused gate/visibility/replay/cancellation/fallback/unknown-page component checks and real-action redirect/invitation/Capture/not-found destination matrix; physical installed lifecycle remains unqualified |
| Adversarial opening input / runtime-disable / failure matrix | F1-3 results are recorded in the [selected task evidence](../openspec/changes/archive/2026-10-29-centralize-pwa-opening-observation/tasks.md#f1-3-evidence-2026-10-29); capture receipt and complete real action-response inspection remain separate assertions |
| Final repository gate | Version follow-up: 97 focused telemetry tests and 147 combined Chromium checks passed. Updated final gate has 601 Chromium passes / 47 skips / one unrelated Quick Replace mock-SSE/reload failure; all other applicable checks passed, including 1,389 units, live endpoint parity and 183 PostgreSQL tests. Task 3.2 remains unchecked. See [version evidence](../openspec/changes/archive/2026-10-29-centralize-pwa-opening-observation/tasks.md#app-version-follow-up-2026-10-29) |
| Actual WFS JSON -> Sentrame durable protected reads / reopen / UI mapping | Not-run; requires disposable compatible storage and separately selected F1-4 |
| Isolated deployed container / proxy / tunnel | Not-run |
| Physical installed phone / warm resume / unlock / native sharing | Not-run; worker-blocked desktop E2E does not qualify these |
| Business API contract / real persistence | Not-applicable to this opening-only internal action slice |

For actual receiver qualification, use fresh disposable schema-compatible
storage and private test tokens; never reset existing storage. Exercise both
synthetic producers and actual openings through the exact WFS JSON path, then
verify browser/server authority, service, log name and retained `stage.name`
through protected reads and after receiver/storage reopen. HTTP 200, a resolved
action, this capture fixture or another SDK's pass does not prove durability.

Configure meaning prospectively using exact service `wfs-pwa-browser`, browser
source, log carrier, `pwa.app.opened` and a retained `stage.name` condition.
Preview Search inclusion and Welcome exclusion, select literal Stage/step
explicitly, and keep definitions disjoint. A hint does not activate a mapping;
explicit owner labels take precedence. No goal, duration, presence or correlation
is provided by this event. Mapping and UI acceptance remain unrun.

F1-3 completion verification (2026-10-29): no telemetry production or fixture changes.
The grocery regression now waits for its row to be enabled after the first save.
Duplicate extras, keyboard toggles and failed-delete recovery remain asserted.
The owned optimized fixtures passed the full grocery suite and real-action telemetry
matrix (20 Chromium checks), plus 92 focused unit/transport tests. All action-response
bodies remain inspected. The reviewed 18-record capture uses only the fixed envelope
and approved screen attribute. The earlier failed repository gate remains historical;
the new application record `.task/agent-finish/runs/d86e29d211fa409cbe4074b31f538a61.json` also fails, on three planner/Home cases. The grocery and telemetry cases pass; task 3.2 stays unchecked. Documentation reconciliation is verified separately and does not supersede the failed application gate. Receiver durable reads/reopen,
deployed routing, native sharing and physical installed-phone qualification remain
not-run and unclaimed. Local receiver guide identity was refreshed read-only in the
linked completion evidence; this did not change the WFS wire contract.


F1-3 verification-blocker follow-up (2026-10-29): reconciliation used different
predicate objects to register/remove a held schedule interceptor. A controlled
post-reload resume reproduced the trapped extra read; retaining the same predicate
passes both recovery cases with every original assertion intact. Touch and Home
teardown failures have not reproduced in focused/traced full-suite checks and
remain unchanged; no application cause is claimed. The grocery enabled-state wait,
optimized fixtures and complete real action-response privacy inspection are
preserved. Current acceptance and final verification are recorded in the
[blocker repair evidence](../openspec/changes/archive/2026-10-29-centralize-pwa-opening-observation/tasks.md#f1-3-verification-blocker-repair-evidence-2026-10-29).
Task 3.2 is complete after all applicable final checks passed. Receiver/deployment/device
qualification remains separate and unclaimed.


Latest passing application `record_path`: `.task/agent-finish/runs/1058d82e9c204594b9ea64fbaae4efa9.json`;
content identity `c436843f5daa04226e0b542cbf2d69d03deddbcc424fd050dd81f315a63aeaa5`.
Final Chromium: 602 passed / 47 skipped / zero failures; unit: 1,384 passed; API:
1,259 passed / 156 skipped. All other applicable automated checks passed, none
blocked or not-run. These later evidence edits receive documentation verification
separately. The prior failed records above are historical. Touch and teardown
causes remain unestablished despite their passing focused/full runs; only the
reproduced reconciliation fixture defect was repaired this session. Durable
Sentrame receipt, protected reads/reopen/mapping, deployed routing, native sharing
and physical installed-phone qualification remain not-run. Tasks 4.1–4.3 and 5.1
remain unchecked; no deployment was enabled.


Application-version follow-up (2026-10-29): the resource envelope now includes
`service.version` for both producers, with existing app release metadata forwarded
through repository Compose. Prior captures/verification records above describe
their historical pre-version content. Updated acceptance and final verification
are in the [version evidence](../openspec/changes/archive/2026-10-29-centralize-pwa-opening-observation/tasks.md#app-version-follow-up-2026-10-29).


Latest version-follow-up application `record_path`:
`.task/agent-finish/runs/9d77169ae5a245c6ba1e39ee018a9f63.json` (content
`587f2dd80de619668177e465400c7f39f9c740aea178adcce4d14badb194e9e3`).
Version export passed 97 focused tests, 147 combined Chromium checks and the real
action/exporter capture in the final run. The final gate failed on one unrelated
Quick Replace mock-SSE evaluation during reload (601 passed / 47 skipped / one
failed); 1,389 units, API/static contracts, live endpoint parity and 183 PostgreSQL
tests passed. No applicable automated check was blocked or not-run. Task 3.2
therefore remains unchecked; earlier pre-version passing records do not cover
these changed bytes. Documentation reconciliation is checked separately and does
not supersede the failed application gate. Durable Sentrame version projection,
protected reads/reopen/mapping, deployed routing, native sharing and physical
installed-phone qualification remain not-run. No deployment was enabled.


The opening specification was synced and archived on 2026-10-29 at the user's
request. See the [main capability contract](../openspec/specs/anonymous-pwa-telemetry/spec.md)
and [archive disposition](../openspec/changes/archive/2026-10-29-centralize-pwa-opening-observation/tasks.md#archive-disposition-2026-10-29).
Five tasks remain unchecked (3.2, 4.1–4.3 and 5.1); the failed application gate
and unrun qualification cells above are preserved. Sync/archive is documentation
lifecycle work and does not qualify durable receiver receipt or a deployment.

## Planned navigation mapping recipe

Status: F2-1–F2-3 are implemented and accepted. F2-4 requalifies the integrated
local receiver path below; other overlays remain named coverage exceptions.
Collection stays off by default; no deployed receiver or production goal was changed. The active
[navigation change](../openspec/changes/observe-pwa-navigation/proposal.md) makes
opening, primary screens and adopted surfaces one anonymous document stream.
Opening keeps its eligibility/name/one-attempt/failure behavior while replacing
its former uncorrelated stage-only payload. Do not read historical capture passes
above as qualification of the revised contract.

After the server-derived enabled decision, one document coordinator generates a
random `session.id` and separate random `tab.id`, once. Each observation receives
a distinct random `event.id` and positive increasing `source.sequence` before
admission/delivery. These are log attributes alongside static `stage.name`.
Opening is allocated first, initial screen second, then adopted surfaces and later
transitions. They describe entry and presentation within one scope, not two visits.
No scope is generated for initially disabled collection. Reload/new document/tab
creates independent context; no browser storage or person/household/device IDs,
previous-scope links or cross-document handoffs are permitted. Unchanged warm
resume emits neither another opening nor another screen presentation.

`timeUnixNano` is browser observation time; `observedTimeUnixNano` is server
forwarding observation captured before deferred export. Reject malformed clocks,
values older than 24 hours or more than five minutes ahead of forwarding time;
do not replace missing/invalid observation time with export time. Preserve resource
`service.name=wfs-pwa-browser`, server-owned `service.version`, `wfs.anonymous`,
fixed vocabulary, browser credential and static screen/surface labels. Browser
context is untrusted correlation, never server business authority.

Configure exact selectors in Sentrame. All production rows below select
**Browser**, **log** carrier (logs signal), service **wfs-pwa-browser**. Timing is
**unavailable** (`none`); leave next-event estimates disabled.

| Event | Stage / Kind | Condition | Meaning |
| --- | --- | --- | --- |
| `pwa.app.opened` | **App opened**, **step** | None: leave key and value empty | Entry observation, not completion |
| `pwa.screen.presented` | **Home**, **step** | `stage.name` equals `home` | Home shell presented |
| `pwa.screen.presented` | **Search**, **step** | `stage.name` equals `search` | Search shell presented |
| `pwa.screen.presented` | Other reviewed screen names, **step** | Disjoint approved `stage.name` values | Presentation, not business success |
| `pwa.screen.presented` | **Planner** / **Grocery**, **step** | `stage.name` equals `planner` / `planner.grocery` (disjoint) | Primary rendered shell |
| `pwa.surface.opened` | Reviewed surface presentation, **step**, or supporting **activity** | `stage.name=planner.grocery` for the adopted companion; `quick.find` for the adopted Quick Find pilot | Choose whether the presentation belongs on the path |
| `pwa.surface.closed` | Reviewed supporting closure, **activity** | Same reviewed surface vocabulary | Lifecycle observation; not automatic exit/cancellation/completion |
| `pwa.telemetry.check` | Transport diagnostic; leave outside production journey mappings/goals | Not applicable | Receipt check only |

The **first mapped occurrence** starts a journey. **Stage start** is an explicit
duration boundary, not a generic journey-start switch. `stage.name` is only a
retained application hint: it supplies no correlation and activates no mapping.
Conditions are optional filters. Distinct screen labels need disjoint conditions;
do not add an overlapping unconditional screen mapping. Supporting activity adds
no graph step but still refreshes receiver inactivity; do not confuse that Kind
with measured presence or attention.

Preview selectors, then activate **before emitting fresh qualification records**.
Existing captures retain their captured definition; activation is not a historical
rewrite. Ordinary logs need no spans or trace IDs to form safely correlated paths.
User-reported deployed openings/checks were retained as browser/logs but lacked
session/tab and remained unassigned. Their empty graph was not failed ingestion;
standalone logs without trace IDs also do not appear in Traces.

### Remaining Sentrame requirement

Current local `validateDefinition` requires an operational goal for a nonempty
definition. Open-ended navigation activation/inspection without a chosen business
outcome therefore requires receiver work across validation, configuration controls
and goal-dependent interpretation. Do not select App opened as the goal: it would
complete immediately. WFS must not invent a production completion event to bypass
this requirement. Hand this requirement separately to the Sentrame agent; this WFS
change does not edit receiver code, deployed configuration or existing storage.

### Disposable qualification and interpretation limits

The owned fixture separately establishes actual browser -> Server Action -> Node exporter ->
disposable Sentrame receipt, durable protected reads and actual restart/reopen.
For configured derivation only, activate App opened/Home/Search mappings with the
exact Search selector as a **synthetic reaching-Search presentation goal** before
fresh browser emission. Verify App opened -> Home -> Search, opening first,
shared scope/tab, distinct event IDs/increasing sequence and a later Home starting
a new receiver capture without another opening. Replay exact captured wire bytes,
including the original forwarding timestamp, and verify no duplicate records or
journey contributions before/after reopen. This fixture replay adds no app retry.
Never install this goal in production or interpret Search as business completion.

Keep capture, durable receipt, configured derivation, deployed-route and physical
installed-device evidence separate. F2-1 local results are recorded below; deployed and physical-device cells remain
not-run. Use fresh compatible disposable storage; never reset an existing receiver.
Record exact WFS/receiver/config identity and hashes without credentials.

A document scope can outlive several receiver captures: goal closure or 30 minutes
without mapped activity can segment it, and a later mapped event can begin another
journey. Inactive means unknown outcome. Lost records/sequence gaps leave incomplete
evidence. Navigation alone measures neither page dwell nor attention. Paired
surface/page duration additionally requires reviewed start/end semantics and a
shared `stage.occurrence.id`; this increment adds neither. Cross-document and
cross-service continuity remain separate decisions. No heartbeat, fake closure,
persistent correlation, generic OTLP relay or SDK migration is added for a graph.

Server-authoritative runtime opt-in, closed-input validation, privacy minimization,
60 screen/surface attempts per document/minute, ten error attempts per document lifetime, independent 120 records per
producer/minute per Node process partitioned into 20 errors and 100 ordinary records, four active exports, two-second timeout,
redirect rejection, deferred `after()` export and no delivery-dependent UI remain.
Opening stays at most one attempt and shares the browser producer budget.

For later business journeys, presentation is insufficient evidence of saved votes,
meal assignments, shopping completion or completed cooking. The smallest missing
facts belong at actual server persistence owners; see the
[inventory boundaries](telemetry/journey-inventory.md#navigation-revision-boundary).
Those emitters and any cross-service propagation are outside this navigation change.


## F2-1 local qualification — 2026-10-29

Implemented route/opening owners are `opening.ts` (shared document state),
`navigation.ts` (closed input), `reportBrowserObservation` (forwarding clock before
`after()`), and the existing Node serializer. No SDK, business instrumentation,
Planner composition or surface pilot is included. Collection remains off by default.

| Evidence cell | Result |
| --- | --- |
| Focused unit/component/HTTP transport | Passed; behavioral red preceded implementation, final focused suite 152 tests |
| Actual browser → Action → Node JSON capture | Passed; opening/Home/Search/Home is one scope/tab, sequences 1–4; reload and second tab have independent context |
| Actual disposable Sentrame durable protected reads | Passed; eight records retain service/version, browser authority, static labels, UUID context, sequence and exact source/observed timestamp strings |
| Prospective configured derivation | Passed separately; App opened → Home → Search completes only the synthetic reaching-Search goal; later Home starts another journey without another opening |
| Exact wire replay and actual restart/reopen | Passed; retained evidence and journey contributions are unchanged before/after replay, including after process restart and fresh owner login |
| Required four-suite Chromium acceptance | Passed, 11/11; opening, navigation, auth-flow and onboarding |
| Final repository verification | Passed stable-tree retry, including static contract checks and content stability; task 1.4 complete |
| Deployed route / physical installed device | Not-run |

The receiver was built from clean local Sentrame HEAD
`a506dacbdc0f776238f2b3ebc769e42d2b4b9378`, schema 3 / `structural-v2` /
`journey-native-v3`. Binary SHA-256:
`5f6372edc6dde428a8d6b41fa15e2386e34cb04f480f1d53992c21e62eaa7d39`.
Only fixture-owned temporary storage/app configuration was created and removed;
receiver source and retained deployments were untouched. The capture receiver
forwards the original Node JSON bytes to actual Sentrame with its generated
browser credential; no compression, Action mock or exporter mock is involved.

Qualification artifacts are preserved under `.task/telemetry-navigation/f2-1/`:
`navigation-wire.json` stores each exact captured body string; SHA-256
`73f3e2a090ec2d23178359dd646e9911216aeae5eb43778df36a2b373d6698b7`.
`receiver-qualification.json` contains protected before/after reads and per-wire
hashes, SHA-256 `0752e29e5ac8f0757e82b2d61116a264e76ee40aed3a59b55ace88bbc78e9bfb`.
The canonical sorted-key definition SHA-256 is
`cfee12a1242a9e02a0606118f6534c223ec6f623a92c95cad2f94d64c74b3281`.
`identity.json` retains the WFS starting HEAD and exact implementation file hashes.
No credentials are retained in these artifacts. The fixture checks absence of private
query sentinels in payloads and endpoint/producer credentials in browser HTML,
scripts and complete Action responses. These local checks do not qualify deployment
routing, phone behavior, open-ended production definitions or business completion.

To reproduce the optional actual-receiver cell, build the chosen clean local
Sentrame source to an owned binary, then set `WFS_NAV_SENTRAME_BINARY` to its absolute
path when running `task test:e2e -- telemetry-navigation.spec.ts --project=chromium`.
Without that variable the same tracer qualifies capture only. The fixture always
uses fresh storage; it has no option to point at an existing receiver database.


Initial F2-1 application gate record (historical failed attempt): `.task/agent-finish/runs/6459096adeb84a55b175acbf9c836e6c.json`, tested identity
`6ecac67e4fe23d5cb726441cf91e013f67e612d15c752c4ead0eceed0accc050`.
Passed executed checks: documentation, 38 OpenSpec items, lint/format/types,
1,426 unit tests, Chromium 600 passed / 47 skipped / zero failed, and API 1,259
passed / 156 skipped / zero failed. The content check failed after concurrent
edits to the unrelated `observe-unexpected-pwa-errors` proposal/design; static
contract checks were left not-run. No automated success is claimed for final
content. Qualified telemetry implementation hashes remain unchanged. At that checkpoint, task 1.4
required a fresh scoped gate on a stable tree; unrelated edits are preserved.
Live endpoint/database/harness checks were not-applicable to this application
slice. Later documentation verification covers only completion evidence bytes.


F2-1 stable-tree retry passed: `.task/agent-finish/runs/48fdfcc05c60422bbe2247ac1d0e92a9.json`,
identity `ba49610b4361d7778f01dd261f4f42f13780098df545992271eb070297988061`.
The user confirmed concurrent writing was paused. All reviewed inputs remained
unchanged: 1,426 unit tests, Chromium 600 passed / 47 skipped, API 1,259 passed /
156 skipped, docs/spec/lint/format/types/static contracts/client checks and content
stability passed. No applicable automated check failed, blocked or remained not-run.
Live endpoint/database/harness checks were not-applicable. Task 1.4 and the selected
F2-1 group are complete; later groups and deployed/device qualification remain
pending. Completion-document edits are verified separately from this application
record. The earlier mutation record remains historical, without a success claim.


## F2-2 Planner/Grocery composition — 2026-10-29

Planner declares its rendered primary shell and companion state to the existing
shared document coordinator. Phone Grocery becomes primary `planner.grocery`
when its checklist replaces the plan. An initial empty loading shell remains
`planner` until Grocery is actually rendered; retained content follows its rendered
branch. Wide layout keeps primary `planner` with a `planner.grocery` companion,
including the existing wide Grocery pane while plan data loads. Resize preserves
the selected phone tab and week. No click handler emits telemetry.

The companion emits `pwa.surface.opened` once on observed presentation and
`pwa.surface.closed` on an observed removal or eligible route departure. Effect
cleanup is not closure. Hidden changes reconcile only the current composition on
visibility; unchanged resume emits nothing. Opening remains route-classified
`planner` even if the initial phone primary is Grocery. Opening, screens and the
companion share document scope/tab, distinct events and one increasing sequence,
and screens/surfaces share the same 60-attempt document budget. Labels contain no
week, dates, Grocery items, recipes, action cause or shopping outcome.

Unit/component evidence: the specified two-file red run reproduced the missing
composition (4 failed / 81 passed); focused green passed 85 tests. Expanded
opening/observer/action/transport regression coverage passed 233 tests in seven
files. Required `planner.spec.ts grocery.spec.ts telemetry-navigation.spec.ts`
Chromium acceptance passed **134/134**, including the actual browser → Action → Node
JSON/no-compression → disposable Sentrame path. Protected reads independently retain
all **16** records with exact browser/forwarding timestamps, service/version and
static labels. The original document spans sequence **1–12** from opening through
primary/companion transitions; reload and another tab retain independent scopes.
Unauthenticated reads fail. Exact-byte replay adds neither raw evidence nor journey
contributions before or after receiver process restart/storage reopen/new owner login.

Mappings were activated before emission: App opened unconditional step; Home,
Search, Planner and Grocery disjoint screen steps; companion opening/closure as
supporting activities. The synthetic reaching-Search goal still completes App opened
→ Home → Search; a later journey contains Home → Planner → Grocery → Planner →
Grocery → Planner → Home. Neither companion closure nor opening is a completion goal.

Tested receiver: clean `a506dacbdc0f776238f2b3ebc769e42d2b4b9378`, schema 3 /
`structural-v2` / `journey-native-v3`, fresh disposable storage. WFS starts at
`3eb308a1ea58fedbec16eca75e5229b88b5afd2d` plus this slice. Exact captured wire,
protected-read/restart results, config/source/binary hashes and command logs are in
`.task/telemetry-navigation/f2-2/`. Wire SHA-256:
`3c28840d0d06a442f02df07c9632fc0f2d4a4fabef397f484ddacefda5d27bce`;
definition SHA-256:
`e9d4ca74f0fe51aad5b32093548e9a556a2a4740cafa06e0724c5903c6004268`.
Private sentinel, credentials, business IDs and week/content are absent from wire.
After user-confirmed writer pause, scoped preparation and final verification
passed for all 11 reviewed paths, with no excluded paths. Application record:
`.task/agent-finish/runs/c5e3c887907e482d808caa95213cf7de.json`, tested identity
`36a4963e169fa07e37a740b50d8bcceae47763d599d85fb3755058733915e221`.
Checks passed: docs/OpenSpec, lint/format/types, 1,431 unit tests, 600 E2E tests
(47 skipped), 1,259 API tests (156 skipped), static contracts and content stability.
The real-action/disposable-receiver fixture passed again on prepared source;
its artifacts are under `.task/telemetry-navigation/f2-2/final/`. These result notes
are later documentation content; application bytes remain the tested bytes.
F2-2 tasks 2.1–2.3 are complete; Quick Find and later groups remain pending.
Browser phone viewport and simulated hidden/resume evidence are distinct from
physical installed-device unlock/background behavior, which remains **not-run**.
Deployed-route qualification remains **not-run**. No deployed collection or
receiver configuration has been changed.


## F2-3 Quick Find presentation — 2026-10-29

QuickFindModal declares `useSurfacePresentation('quick.find', true)` once. The
shared document coordinator observes open/close/reopen cycles with the same scope,
sequence and admission budget as opening/screens/companion. Rerenders and React
effect replay add nothing. Cleanup reconciliation waits one microtask for replay;
visible unmount or eligible route departure can observe a closure. Hidden changes
are not replayed; visibility resume reconciles only the current declaration.
Root observer teardown/document termination supplies no closing flush or retry.
Closure supplies neither cancellation, selection, completion nor duration.
Focus, gestures, drafts and selection remain owned by the existing UI handlers.

The [coverage fixture](../pwa/src/lib/telemetry/coverage.test.ts) maintains exact
page classifications, one static declaration per adopted owner and 17 named
bespoke source-owner exceptions. These features were not migrated. Literal-source
search cannot prove exhaustive dynamic-overlay coverage; see the [inventory baseline
and limits](telemetry/journey-inventory.md#f2-3-baseline-coverage-limits).
Unknown routes export `other`, never raw paths.

Focused unit acceptance passes 23 tests; existing telemetry/Planner regressions
pass 233. The real browser → Action → Node JSON/no-compression → disposable local
Sentrame tracer passes: first document sequence 1–16, 20 total retained records
including reload/concurrent tab, distinct event IDs and shared session/tab within
each document. Protected reads validate both clocks, browser authority and
service/version independently from configured journey derivation. Prospective
Quick Find open/close mappings are supporting activities; the only fixture goal
remains reaching Search. Closures do not complete the later journey. Exact captured
wire replay is idempotent before/after actual receiver restart/storage reopen.

Required Planner/utility/navigation acceptance passed **117/117** with the actual
disposable receiver enabled. Scoped preparation and final verification passed on a stable tree. No deployed route or physical installed-device
qualification is claimed; collection remains off by default. F2-4, business
instrumentation and production receiver configuration remain outside this slice.

Fixture identity: receiver clean HEAD `a506dacbdc0f776238f2b3ebc769e42d2b4b9378`, binary SHA-256
`5f6372edc6dde428a8d6b41fa15e2386e34cb04f480f1d53992c21e62eaa7d39`; fresh disposable
schema 3 / `structural-v2` / `journey-native-v3` storage. Wire file SHA-256
`f92f49662d683500c2299d6d50d37da23f8bf24669b23251d44387b0493c8504`; definition SHA-256
`b3cadaf3feb0a5a7febf574614353ce84586e44cee3d36adf63639119fdf5b48`. Exact wire, protected
read/restart evidence and source hashes: `.task/telemetry-navigation/f2-3/`.
Payload review retains only approved static labels/five attributes; private query
sentinel, credentials, recipe/selection/week/date/content and business IDs are absent.


F2-3 completion: tasks 3.1–3.3 accepted; change 10/12. Scoped preparation passed
for 14 paths with no excluded edits. Passing application record:
`.task/agent-finish/runs/45a225a3dc2d4070add55b2381549fd0.json`, identity
`1de50f1c27376224422bafe56f7b8c3bb1d05ab45244828d9ec94dec337caab4`.
All applicable checks and content stability passed: OpenSpec 38 items, lint,
formatting, types, 1,440 unit tests, Chromium 600 passed/47 skipped, API 1,259
passed/156 skipped and static contract/client checks. No applicable automated
failure/blocker remains. Prepared-source tracer wire/receiver artifacts and matching
source hashes are retained in `.task/telemetry-navigation/f2-3/final/`.
Final evidence/checklist updates are later documentation bytes, checked separately.
F2-4 remains pending. No production enablement, deployment, commit or sync/archive.


## F2-4 integrated local qualification — 2026-10-29

Selected tasks 4.1–4.2 only, starting clean at WFS
`632cc437d44f0b29027081f336ba6d71e9d60daa`. Before execution, the F2-1/F2-2/F2-3
acceptance evidence and passing application records `48fdfcc05c60422bbe2247ac1d0e92a9`,
`c5e3c887907e482d808caa95213cf7de` and `45a225a3dc2d4070add55b2381549fd0` were
checked directly. Retained wire/read artifacts agree; all ten F2-3 prepared-source
hashes still match. Historical failed gates remain historical.

| Evidence cell | Actual status |
| --- | --- |
| Unit/component/real HTTP boundary | Passed, 256 tests in ten files; no production change or new TDD cycle |
| Actual browser → real Server Action → Node JSON/no compression | Passed; integrated navigation tracer and opening gate/failure matrix, 2/2 Chromium fixtures |
| Durable receiver receipt, independent of derivation | Passed, 20 protected records; unauthenticated reads return 401; exact source/forwarding timestamp strings and all approved context retained |
| Prospective configured derivation | Passed separately; nine reviewed mappings activated before fresh browser records; only reaching Search completes the synthetic goal |
| Exact-wire replay / receiver restart and storage reopen | Passed; evidence and journey contributions unchanged on replay before and after actual process restart and fresh owner login |
| Final repository verification | Passed; scoped documentation/OpenSpec/content stability, no excluded paths |
| Deployed routing / physical installed device / native handoff | Not-run; browser phone/wide viewports and simulated visibility are local evidence only |
| API/schema/client/SDK migration, receiver source change | Not-applicable; none required or performed |

Receipt: the original document has sequence **1–16**, one session/tab, 16 distinct
events, opening first and all four names (`pwa.app.opened`, `pwa.screen.presented`,
`pwa.surface.opened`, `pwa.surface.closed`). Reload and another tab supply independent
scopes and four further records. Protected reads retain browser/log authority,
`wfs-pwa-browser`, version `1.4.2-test.opening`, static labels and exact browser and
forwarding nanosecond strings. Source timestamps are not export-time substitutes;
the deferred-clock unit test separately verifies forwarding time captured before
`after()`. The transport uses `/v1/logs`, JSON and no compression; a fixture capture
hop forwards the original bytes to actual Sentrame. Business APIs alone are mocked.

Derivation: unconditional App opened is a step, Home/Search/Planner/Grocery are
disjoint screen steps, and Grocery companion/Quick Find open/close are supporting
activities, all exact browser/log/service selectors with timing unavailable.
App opened → Home → Search completes the disposable presentation goal. Later
Home → Planner → Grocery → Planner → Grocery → Planner → Home remains incomplete,
despite three surface closures. No opening or closure is a goal. The captured
version-2 definition is compared prospectively; no historical definition was changed.
The receiver still requires a mapped goal for nonempty definitions; production
open-ended activation remains separate receiver work, not a selected-scope blocker.

### Scenario reconciliation

| Scenario group | Acceptance and limits |
| --- | --- |
| Access redirect, approved entry vocabulary, contextual overlay, fallback | Passed opening browser matrix plus OpeningObserver/opening tests; presented Welcome is not requested Search; unknown runtime routes stay `other` |
| Navigate/backtrack, opening/initial order, reload/concurrent tab | Passed real-action tracer and protected receiver reads; no cross-document continuity |
| Hidden navigation, warm resume, effect replay/remount | Passed coordinator/observer/surface tests and tracer visibility/resize cases; no OS/device qualification |
| Phone tab / wide companion / loading composition | Passed Planner component tests and integrated browser transitions; static labels only, no click or shopping inference |
| Quick Find open/close/reopen, document disappearance | Passed surface/component tests and integrated tracer; teardown makes no closing flush or retry |
| Private routes, bespoke surfaces | Passed coverage fixture and closed-envelope tests; 17 named source-owner exceptions remain; static search cannot find every dynamic overlay |
| Arbitrary forwarding, browser authority, clock boundaries | Passed closed Action/unit tests, malformed real Action submissions and protected reads; forwarding never acquires server business authority |
| Disabled/stale-enabled documents, opening one-attempt, receiver outage | Passed browser matrix, runtime opt-out and no-scope tests; rejection/redirect/timeout leaves login/member selection/navigation usable and does not rearm opening |
| Storm/admission/failure isolation | Passed 60 screen/surface attempts per document/minute, shared 120 browser records/minute per Node process, four active exports and two-second timeout tests; independent server budget; no retry/storage/heartbeat |
| Ordinary correlated logs, application release metadata | Passed exact payload/HTTP tests and durable reads; no trace/span ID needed; version is server-owned, trimmed or `unknown` |
| Opening mapping, surface meaning, synthetic prospective path, later occurrence | Passed configured derivation separately from raw receipt and exact replay/restart; Search is a synthetic presentation goal only |
| Historical uncorrelated logs, alternate owner labels/preview, goal-free activation, duration/outcome requests | Documentation boundaries retained; not requalified as new runtime cells. Historical records/definitions are untouched; no duration, attention, people totals, abandonment or persisted outcome is claimed |

Privacy review passed: only the five approved record attributes, fixed body/name,
INFO 9, resource service/version and `wfs.anonymous` scope. No raw URL/query,
referrer, private sentinel, credential, business ID, week/date, recipe/content,
selection/dismissal cause or error detail is admitted. Complete inspected browser
HTML/scripts/Action responses omit receiver endpoint and producer credentials.
No telemetry cookie/local/session storage is introduced. The baseline volume model
remains `1 opening + R screens + 2M surface cycles`; idle time adds zero. This is
a bounded model, not measured household traffic or a receiver capacity claim.

### Exact qualification identities

Receiver: clean source `a506dacbdc0f776238f2b3ebc769e42d2b4b9378`, module
`sentrame v0.1.0-rc.5`, Go `1.27.3`, darwin/arm64; embedded VCS metadata says
`vcs.modified=false`. Binary SHA-256:
`5f6372edc6dde428a8d6b41fa15e2386e34cb04f480f1d53992c21e62eaa7d39`.
Fresh disposable schema **3**, projection **structural-v2**, computation
**journey-native-v3** storage was created, reopened by the actual restarted process,
then removed by the fixture. No retained database was opened/reset/migrated.
WFS runtime: Node **26.12.0**, Next **16.4.2**, React **19.3.1**; fixture-only version
above, collection enabled only in owned disposable processes.

Artifacts in `.task/telemetry-navigation/f2-4/`: `identity.json` (source/config/runtime
identities, no credentials), `prerequisite-audit.json`, `navigation-wire.json`
(exact body strings), `receiver-qualification.json` (protected before/after reads,
activated definition and each body hash), `payload-review.json`, `unit.log` and
`acceptance.log`.

- Wire file SHA-256: `ea753c62dc3974233fabeb55fb3340400dd5228f94633faa2e2518dc5ec4cf4b`.
- Protected qualification SHA-256: `c7c8c3ee05943918c0b90986a34d191213a93ffa7ae89c1287e1306ba0ea6cfe`.
- Canonical sorted-key definition SHA-256: `b3cadaf3feb0a5a7febf574614353ce84586e44cee3d36adf63639119fdf5b48`.

Reproduction: `WFS_NAV_SENTRAME_BINARY=/tmp/wfs-navigation-sentrame
BASE_URL=http://127.0.0.1:1 PLAYWRIGHT_HTML_OPEN=never task test:e2e --
telemetry-navigation.spec.ts telemetry-opening.spec.ts --project=chromium`.
Both fixtures build and start their own optimized WFS; the unused BASE_URL suppresses
an unnecessary shared dev server. The integrated tracer uses actual Sentrame;
the opening outage matrix uses its owned HTTP boundary. Full focused unit command
and exact results are in `unit.log`. No production code, package, receiver source,
business event, deployed setting or existing storage changed. No commit, deployment,
collection enablement outside the disposable fixture, sync or archive.


F2-4 completion: tasks 4.1–4.2 accepted, change 12/12. Scoped preparation made no
writes; complete diff review passed for the three documentation paths. Final
`record_path`: `.task/agent-finish/runs/0254f1b321aa4e2e84fabe1096fefdeb.json`,
identity `1994b658ec5089dfa900397dd0033acb024126520c6906a682963bd5413139cd`.
Passed documentation, strict selected OpenSpec and stable content. Failed/blocked/
not-run applicable automated checks: none. Application/harness/live API/database
checks are not-applicable to this documentation patch; fresh runtime acceptance is
recorded separately above. Qualification source hashes remain unchanged. These final
result/checklist notes are later documentation bytes, separately checked without
attributing the earlier record digest to them. Deployed/physical-device cells remain
not-run; no sync/archive, commit, deployment or production enablement.


## F3-1 native browser errors — 2026-10-29

Selected scope is `observe-unexpected-pwa-errors` tasks 1.1–1.3. F2-1's stable
passed final record `48fdfcc05c60422bbe2247ac1d0e92a9` supersedes the error plan's
older mutation-blocked prerequisite note. No other group is inferred complete.

`instrumentation-client.ts` synchronously registers one native listener owner.
Installed Next 16.4.2 does not support a direct Server Action import in that bundle
layer; the existing `OpeningObserver` hands off the Action callback during document
initialization. Nothing is buffered before that server-derived enabled handoff.
An initially disabled document stays disabled. Errors never initialize session/tab
or opening; enabled observations with no context remain standalone. Available
context and the last actually presented primary screen survive ordinary observer
replacement. Opening, presentation and errors increment the same document sequence.

At the callback, the owner snapshots browser time, fresh random record and occurrence
UUIDs and existing context. The strict Action validates an exact data object at most
2 KiB, complete optional context, UUIDv4 identities, positive safe integers and the
existing 24-hour-old/five-minute-future clock policy. It captures Action acceptance
time before deferred `after()` forwarding. Export never reads a later screen or clock
to repair chronology. Missing records/sequence gaps remain incomplete evidence.

| Wire owner | Browser error value |
| --- | --- |
| Name / authority / service | `pwa.browser.error` / browser token / `wfs-pwa-browser` |
| Scope / severity / fixed body | `wfs.anonymous` / ERROR 17 / `WFS unexpected error observed` |
| Resource version | Server-owned trimmed `WFS_VERSION`, otherwise `unknown` |
| Required attributes | Closed `reason=browser.script` or `browser.rejection`, random `event.id`, random `exception.occurrence.id` |
| Optional attributes | Existing `session.id`, `tab.id`, shared `source.sequence`; `stage.name` only when a primary was presented |
| Standard timestamps | Original browser `timeUnixNano`; Action-acceptance `observedTimeUnixNano` |

No raw thrown/rejected content, message, stack, arbitrary exception type/name,
request data, URL, digest, private identifier or content hash enters the envelope.
Primitive script throws remain eligible; resource failures and unavailable
cross-origin script detail are outside coverage. Application default handling is
unchanged. One registration prevents duplicate native callbacks for the same dispatch;
a distinct dispatch gets fresh identities even when it reuses the same Error/Event.
No permanent Error set or text/time heuristic merges distinct episodes. Boundary
and cross-producer overlap are not qualified by this slice.

The ten error attempts are shared by the document owner and consumed before async
work, including failures. Per producer/process, 20 error and 100 ordinary attempts
per minute share four active exports and a two-second timeout. Producer budgets
are independent; they are not cluster quotas. Concurrency saturation drops work
without a WFS queue, retry or eviction. Synchronous recursion, submission/scheduler
throws and rejected telemetry promises are contained. Runtime opt-out is rechecked
at export. Navigation remains observable after errors and outage.

The disposable receiver first uses a fresh app with no mappings or goal. Protected
`GET /api/apps/{id}/errors` and Errors & exceptions / Whole application independently
show the standalone error; unauthorized reads fail. A separate fresh app activates
exact browser/log/service App opened, Home and Search step mappings **before** fresh
browser emission. Only the explicitly synthetic reaching-Search presentation goal
completes this fixture path. Errors stay unmapped supporting evidence: the path is
active after the Home error, mapped inactivity is unchanged, and Search later
completes App opened → Home → Search. Script and rejection reason/identity/context
are retained independently; a post-goal rejection is not used to invent another
path or business recovery.

Expanded Retained diagnostic fields and protected attrs expose reason, stage and
occurrence. The actual related-context control selects the matching scope. These
fields remain outside category-specific UI labels/free-text search support; no
category search or causal linkage is claimed. Raw diagnostic fields or artificial
error mappings are not workarounds. Exact byte replay before/after receiver restart,
storage reopen and fresh owner authentication preserves records and path derivation.

Durable acceptance requires explicit reviewed `WFS_NAV_SENTRAME_BINARY` and
`WFS_ERROR_SENTRAME_ASSETS`. `WFS_ERROR_DURABLE=1` fails without the binary; a
capture-only run does not qualify durable receipt/derivation. The copied receiver
assets are required because the reviewed binary serves `web/dist` relative to its
owned working directory. Only fresh fixture storage/apps/processes are changed.

```sh
WFS_NAV_SENTRAME_BINARY=/tmp/wfs-navigation-sentrame \
WFS_ERROR_SENTRAME_ASSETS=/Users/alex/Code/sentrame/web/dist \
WFS_ERROR_DURABLE=1 BASE_URL=http://127.0.0.1:1 PLAYWRIGHT_HTML_OPEN=never \
task test:e2e -- telemetry-errors.spec.ts telemetry-opening.spec.ts telemetry-navigation.spec.ts --project=chromium
```

The unused `BASE_URL` suppresses the shared dev server; these tests build/start
owned optimized apps. Business APIs alone use repository mocks. The capture proxy
preserves original Node JSON bytes and forwards them using each fresh receiver app's
synthetic browser credential; WFS's private proxy credential stays fixed. Full
client assets (including lazy chunks/maps), loaded scripts, HTML and complete Action
responses are inspected for endpoint/producer credentials. Thrown-content and route
sentinels are distinct: Next Flight can echo the current query in its ordinary `q`
field; the telemetry envelope never exports it. Raw thrown/rejected content is also
absent from complete Action responses.

F3-2 root/render/Next server hooks, F3-3 optional visible error steps, propagation,
handled business outcomes, deployed routes and physical devices remain separately
selected work. No receiver source, retained storage, deployment or collection
setting is changed; no commit, sync or archive is performed.

### F3-1 independent qualification cells and identities

| Cell | Result and limit |
| --- | --- |
| Unit/component/HTTP | Passed: 180 focused tests, including deferred snapshots, clocks, exact admission/accessors, document lifetime/minute rollover/two-document caps, overlap versus reused-event dispatches, process partitions, four slots per producer, real reject/redirect/timeout and recursion/scheduler containment |
| Capture | Passed: real optimized browser native handlers → Action → deferred Node JSON; opening/Home/error/Search share scope/tab and sequence 1–4; real unhandled rejection, ten attempts, outage and opt-out preserve navigation |
| Durable protected reads | Passed: separate no-mapping/no-goal and configured apps, script/rejection reasons and original identities/context/clocks, unauthorized 401, exact replay, actual restart/reopen and re-authentication |
| Journey derivation | Passed: unmapped Home error is supporting evidence; active after error, LastMapped stays Home, completed only by synthetic Search; path/context preserved after reopen |
| Receiver UI | Passed: actual Errors & exceptions / Whole application, expanded retained fields and related scope selection; category-specific search remains unsupported |
| Privacy | Passed: complete 62 client assets, 79 script responses, HTML and 33 complete Action responses contain neither producer credentials nor receiver endpoint; wire and Action responses omit thrown-content sentinels |
| Combined acceptance | Passed: errors, opening and navigation Chromium fixtures, 3/3; no legacy F2 assertions removed |
| Final repository gate | Separate scoped `task verify` invocation on finalized source/docs; its actual `record_path` and results are reported in the session handoff |
| API/database/live parity | No API contract/persistence change; any automated API tests are repository regression checks, not new telemetry database/live API qualification |
| Deployed-route / physical-device | Not-run; outside this selection |
| F3-2 / F3-3 | Not-run; unselected tasks remain unchecked |

WFS base HEAD `bc38df83753ddb98a9ea38b814da9913b7b875bc`; Node 26.12.0,
Next 16.4.2; synthetic fixture resource version `1.4.2-test.opening`.
Optimized error fixture build ID `UONP4RuoXOYwrp21OX5kJ`.
Receiver clean HEAD `a506dacbdc0f776238f2b3ebc769e42d2b4b9378`,
`sentrame v0.1.0-rc.5`, Go 1.27.3, darwin/arm64, binary VCS metadata unmodified.
Fresh schema 3 / structural-v2 / journey-native-v3 storage only.
The five reviewed receiver document hashes still match the error design snapshot.

| Identity | SHA-256 |
| --- | --- |
| Reviewed disposable receiver binary | `5f6372edc6dde428a8d6b41fa15e2386e34cb04f480f1d53992c21e62eaa7d39` |
| WFS lockfile | `b66681c047714ff7c5e4dd0d6ae7edd29dadd4acf050eb2e32af89fb15ea6814` |
| WFS Next config | `371bfecb7449f15e21267773cbd80e2bd4953269bb1844dc3279656547d3d6c6` |
| Prospective exact synthetic path definition request | `44b4f2688e1da756557f4b86ea5a72c1428025a4ac1022ddb20795e2cc01eb7d` |
| Exact captured wire array | `232bbacb9efd672f6fbcae1680b60085257b4fee1f878dd87f9194b26135f6b7` |
| Protected receipt/derivation/reopen artifact | `9f6bc97005611d4171bd0c128d4d695eaf8661c774287a2a9cf8c0541e401617` |
| Build/config/source/client-asset manifest | `feed0980c68bc314f8be456f84da2ad26683d57845e22edc1d37b1b04f32d55d` |

Artifacts are preserved in `.task/telemetry-errors/f3-1/`: `identity-audit.json`,
`error-build-identity.json` (copied source/client asset hashes and runtime/config
meaning), `error-receiver-qualification.json` (receiver asset hashes, definitions,
protected independent cells, exact per-wire hashes and reopen reads),
`errors-wire.json`, UI screenshots, `red-unit.log`, `red-e2e.log`,
`red-primitive.log`, `unit-stable.log` and `acceptance-qualified.log`.
The red browser tracer received zero errors where one was required; the ordinary
budget test exported 102 where 100 was required. Initial missing-module/export
failures are tooling/interface failures, not additional behavioral-red evidence.
A further primitive-throw regression was red before its native filter correction.
Earlier fixture failures (missing copied UI assets, an insufficient future-clock
margin, a test callback type and a reused query/throw sentinel) were corrected in
the owned tests without relaxing the production envelope or receiver semantics.


## F3-2 render/root and Next Node errors — 2026-10-30

Scope is `observe-unexpected-pwa-errors` tasks 2.1–2.3 only. Before edits, F3-1's
180-test unit log, 3/3 actual-receiver acceptance, and final record
`.task/agent-finish/runs/360c410a63c7439eb185b3a1a3378eda.json` were inspected.
All applicable checks and stable content passed; its entire final source manifest
matched the starting worktree. Earlier F3-1 edits are retained. A separate CI-suite
edit observed during this session is preserved and excluded from the scoped paths.

Installed Next 16.4.2 and React/React DOM 19.3.1 were rechecked, including bundled
Next `error.md`, `instrumentation.md`, `after.md` and
[React effect replay](https://react.dev/reference/react/useEffect). Next requires
awaited asynchronous hook work. The root fallback replaces the layout and supplies
its own html/body, styles and system font; it uses existing English/French keys and
native keyboard controls without LocaleProvider, IdentityValidator or an observer.
The existing `reset` API is retained. No recovery API migration is bundled here.

The boundary hook snapshots the preceding document stage/time before separately
observing the committed fallback. It reads existing document state, preserves
scope/sequence across root/provider replacement and never allocates a visit for
an error. An early root can obtain only the runtime enabled boolean through a
same-origin Action, with a two-second local admission deadline and one document
initialization attempt. It does not replay earlier native errors. Context absent
at the observing callback stays standalone even if ordinary presentation initializes
context while that read is pending. Initially disabled documents remain disabled.
A fallback screen is emitted only with existing context; later ordinary presentation
continues the same stream. No recovery/completion event is invented.

Mounted boundary tokens suppress effect replay; reset retires the token before
calling the existing reset. Object identity establishes native/boundary overlap
only within a dispatch/commit turn. Native object references are capped at ten per
document turn with one cleanup microtask; mounted episode state is also bounded.
Independent later dispatches and failed retries get fresh record/occurrence IDs,
even with a reused Error. Primitive or delayed callbacks without demonstrable
identity, and cross-producer callbacks lacking ownership markers, cannot establish
universal suppression or complete incident counts. A boundary recognizes a framework
server marker without evaluating accessors, exporting its value or hashing it.

`src/instrumentation.ts` branches on `NEXT_RUNTIME=nodejs`, imports the Node-only
adapter and awaits the existing exporter. Its only classification input is the
closed routeType mapping: render/route/action/proxy/unknown. Every independent hook
invocation creates fresh random event/occurrence IDs. A branch-local AsyncLocalStorage
guard contains exporter recursion without suppressing independent requests. Server
records use server credentials/service/name, ERROR 17 and local hook clocks, and
have only reason/event/occurrence attributes. They carry no session/tab/stage/sequence,
cookie, household, URL, request data, digest, trace or inferred browser linkage.
Browser boundary Actions still capture Action acceptance time before deferred
`after()` forwarding. Both use the existing private configuration, partitions,
four active exports per producer and two-second timeout; no provider/SDK is added.

### F3-2 independent qualification cells

Command: `env -u BASE_URL WFS_NAV_SENTRAME_BINARY=/tmp/wfs-navigation-sentrame
WFS_ERROR_SENTRAME_ASSETS=/Users/alex/Code/sentrame/web/dist WFS_ERROR_DURABLE=1
task test:e2e -- telemetry-errors.spec.ts telemetry-navigation.spec.ts
auth-flow.spec.ts --project=chromium` (artifact output under
`.task/telemetry-errors/f3-2/acceptance-stable`). Only disposable copied-app routes,
Actions and a root wrapper induce failures; no diagnostic route ships in WFS.
Business mocks remain at their existing API boundary.

| Cell | Executed result |
| --- | --- |
| Test-first/unit | Existing route boundary produced zero reports and parser rejected render before production edits. Required four-file unit acceptance passes 33/33. Additional red/green cases cover initial absence, independent dispatch, bounded storm cleanup and multiple overlapping episodes. Missing-module failures are recorded separately from behavioral red. |
| Actual browser/Action/Node capture | Required combined Chromium acceptance passes 6/6. Real route render/reset using the same Error, root replacement, early standalone root, server render, Route Handler and Server Action failures execute. Retry and independent requests have fresh identities. |
| Node hook lifecycle | Stalled Route Handler response waits 2,004 ms for the two-second export timeout. Outage causes one contained attempt. Thirty further induced requests leave total server error export attempts capped at 20; original 500 handling remains. Unit HTTP tests separately hold completion until receiver release and test recursion/four slots/20 errors/100 ordinary. |
| Durable protected receipt | 22 boundary/server diagnostics survive protected reads, exact wire replay, receiver restart, storage reopen, re-authentication and replay again. Unauthenticated reads and invalid intake credentials return 401. Standalone server records are discoverable with no mappings/goal and have no browser context. |
| Credential authority | WFS capture uses distinct private browser/server credentials and protected reads retain the matching source/service. A separate disposable swap probe shows the receiver assigns source from the token, accepting a contradictory service label; a service string cannot confer server authority. This is a receiver property, not a WFS credential relaxation. |
| Configured derivation/UI | Separate prospective synthetic App opened/Home/Search definition leaves render errors unmapped. A root render error is linked supporting evidence, active after the error and completed only at later Search. Whole application errors and related context execute through UI; exact replay/reopen preserves the path. Expanded safe fields expose reason/stage/occurrence; category search remains unqualified as described above. |
| Privacy/fallback/navigation | Complete 67 emitted client assets, 212 script responses and 61 Action responses are inspected for private configuration. Wire/Action bodies omit thrown-content sentinels. Provider-free html/body/styles, French labels/lang, keyboard reset, Home link, later navigation, disabled collection, document cap and outage are exercised. Real responses are drained before full-document navigation so unavailable protocol bodies are not accepted as privacy evidence. |
| Final repository gate | Task/docs finalized, complete selected scope reviewed/prepared, then scoped stable-tree `task verify`; the returned invocation `record_path` owns its actual result and is reported in the session handoff. |
| Edge/serverless/abrupt exit; deployed routes; physical devices | Not-run/unqualified. The executed Node lifecycle is not a delivery guarantee for these environments. |
| Business API/database changes, .NET instrumentation, propagation, raw diagnostics, business recovery | Not-applicable to this slice; none added. |

An initial combined run incorrectly retained the fixture-only unused `BASE_URL`;
auth tests could not navigate. That runner configuration failure is superseded by
the 6/6 managed-server run, without changing auth tests. Earlier fixture failures
identified premature navigation during complete response inspection; required
full-body assertions were retained and all transitions now drain inspected work.

Evidence is retained under `.task/telemetry-errors/f3-2/`, including prerequisite
and source comparison audit, red/green logs, exact wire, protected receipt/derivation,
UI screenshots, lifecycle timings, source/build/lock/config and all asset hashes.
The disposable app uses build `LgmaSM7eHB0zgD0y6hIjI`, WFS version
`1.4.2-test.opening`, Node 26.12.0, Next 16.4.2. Receiver source remains clean at
`a506dacbdc0f776238f2b3ebc769e42d2b4b9378`; the explicit reviewed binary remains
SHA-256 `5f6372edc6dde428a8d6b41fa15e2386e34cb04f480f1d53992c21e62eaa7d39`.
Individual receiver asset hashes are in the protected qualification artifact;
canonical sorted asset-map SHA-256 is
`f076b40a03a7bddf26d8d2edac704f7eedbddc3cef93c492cd55802b4d038ce0`.

| Artifact | SHA-256 |
| --- | --- |
| WFS lock | `b66681c047714ff7c5e4dd0d6ae7edd29dadd4acf050eb2e32af89fb15ea6814` |
| WFS Next config | `371bfecb7449f15e21267773cbd80e2bd4953269bb1844dc3279656547d3d6c6` |
| Exact wire array | `b7adf0bca1a6141b881f5bb3feabff1982affe8a7c627c645bca471f9f6b27a7` |
| Protected receipt/derivation/reopen | `6e775b7e75860fc316189891a6b91ebe7d9779c56103b70654a8c747758dd98b` |
| Build/config/source/client asset manifest | `905fff3a54b6c4b69d21c93ff8048faa9308a3c5c27d709163063b9c413d5ed4` |
| Actual Node lifecycle | `7c1475fcc2311ef247a46adb08c946d36090ba50fd01e1b652ac7b28e1349211` |
| Prospective render-path definition request | `44b4f2688e1da756557f4b86ea5a72c1428025a4ac1022ddb20795e2cc01eb7d` |

Stop after F3-2. F3-3 remains unchecked. No receiver source/existing storage change,
real collection enablement, deployment, commit, sync or archive was performed.


F3-2 final-gate reconciliation: stable-content record
`.task/agent-finish/runs/c07dfed9459049cfa62e6087e390d394.json` passed docs/spec,
lint/format/types, 1,482 unit cases, API tests (1,259 passed; 156 existing skips)
and static contract checks, but failed broad impact E2E: 597 passed, 47 skipped,
four Action Pivot/Browse All Stack timeout/swipe cases failed. All four pass on
the unchanged tree in `gate-failure-recheck.log` (4/4). This supports transient
suite failure, not a proven causal diagnosis. No unrelated UI/test was changed.
A new stable scoped final-gate invocation follows; its returned record owns the
final result and does not erase the failed attempt. Required durable acceptance
remains separately passed (6/6); its source identity still matches.


## F3-3 integrated disposable qualification — 2026-10-30

Selected tasks 3.1–3.2. Prerequisite F3-1 acceptance 3/3 and stable final
record `.task/agent-finish/runs/360c410a63c7439eb185b3a1a3378eda.json` passed.
F3-2 acceptance 6/6 and stable final record
`.task/agent-finish/runs/4e6cd7297c1d4f5e8daac94a4eaf2577.json` passed; its
final source manifest matched the initial tree. Two earlier final-gate failures
remain in `.task/telemetry-errors/f3-2/verification-history.json`.

The combined real browser handler, boundary, Action and Next hook fixture passed
6/6 before the F3-3 fixture additions. The extended fresh-emission fixture passed
1/1 with an explicit reviewed binary and fresh storage. In separate disposable
apps, protected reads and the UI expose standalone browser/server errors with no
definition or goal; browser errors remain unmapped supporting evidence in the
intended path, while server records carry no invented browser context. The unmapped
error leaves the path active and does not refresh `lastMapped`; Search alone
completes the synthetic presentation goal. Related-context navigation and retained
reason/stage/occurrence inspection were executed; category search was not executed
and is not claimed. The receiver UI does not promote those fields to prominent
category labels. No causal or cross-producer linkage is inferred.

A separate app activates an exact browser/log/service `pwa.browser.error` Kind
step, condition `reason=browser.render`, timing `none`, before fresh emission.
The UI shows Render error; the journey remains active after that error and
completes only on Search. The error is not configured as goal, exit or activity.
A deliberately mapped step participates in the receiver's mapped-event inactivity
policy; severity alone does not. Diagnostic discovery does not require the mapping.
Exact captured-wire replay adds no record or path contribution before or after
restart and protected reauthentication. A changed reason under the same app,
source, signal and event ID is rejected with HTTP 400 before and after restart;
a fresh event ID with the same occurrence ID is retained as a separate receipt.
The synthetic authority swap remains a receiver usability boundary: token source
wins even when a service label contradicts it.

Prior F3-1/F3-2 acceptance and current 33/33 focused unit tests cover the delta's
initialization, context/clock/admission, categories/privacy, same-episode and
independent retries, bounded suppression, ten attempts per document across reset
and minute rollover, independent documents, 20-error/100-ordinary process
partitions, four slots, timeout, opt-out, recursion and unchanged fallback/reset.
The current real fixture additionally exercises capture, later navigation, outage,
privacy, standalone receipt, linked derivation and reopen. Serverless/abrupt-exit
delivery, cross-producer overlap without ownership markers, handled business
failures, deployed routes and physical devices are not qualified. Later screen
presentation does not create a business recovery event.

Fixture identities: WFS HEAD `bc38df83753ddb98a9ea38b814da9913b7b875bc`;
Node 26.12.0, Next 16.4.2, WFS `1.4.2-test.opening`, build
`cHAQ1yAg4RvZgIzNw-XB3`; lock SHA-256
`b66681c047714ff7c5e4dd0d6ae7edd29dadd4acf050eb2e32af89fb15ea6814`,
Next config `371bfecb7449f15e21267773cbd80e2bd4953269bb1844dc3279656547d3d6c6`.
Binary `/tmp/wfs-navigation-sentrame` SHA-256
`5f6372edc6dde428a8d6b41fa15e2386e34cb04f480f1d53992c21e62eaa7d39`,
embedded clean source `a506dacbdc0f776238f2b3ebc769e42d2b4b9378`. The current
Sentrame checkout is separately at `be32fa662df6ab5688f46c129b85fabd13a0910a`
with an unrelated dirty fixture; neither was modified. The actual current UI assets
differ from the F3-2 asset manifest; their sorted compact JSON hash map SHA-256 is
`d5f0553473717164d33174f8886c2a256ada05f6c496c819583759c54ca0c74d`.
This qualifies the executed binary/assets combination, not their source parity.
Definition request SHA-256 `fad8b74f0a6e3e08fc5a4aceff0e9ce251ff9323e2a20b0bd78e42f322e764cb`;
wire array `5161f3dddb3693f017faab3906fa04be6f138b9f1d67afdc3514bc05314ab326`;
protected receipt/derivation artifact `4b0d31619a5b5ccc1e59b7f2444b7c1a7427ad819750fcbbb65825a94dc706b0`;
build/source/config manifest `598dba131e9e89376082a8c2b516994d41a137b9e142e272f00b9d8d76ec4b83`.
Exact per-wire, source and asset identities and screenshots reside in
`.task/telemetry-errors/f3-3/`; synthetic credentials are not documented.
Command: `env -u BASE_URL WFS_ERROR_DURABLE=1
WFS_NAV_SENTRAME_BINARY=/tmp/wfs-navigation-sentrame
WFS_ERROR_SENTRAME_ASSETS=/Users/alex/Code/sentrame/web/dist task test:e2e --
telemetry-errors.spec.ts --project=chromium`. The initial fresh-emission fixture
failed on a French heading expectation in a new English document; the corrected
run passed, without a production change.


## Standard SDK migration — M1 checkpoint, 2026-10-30

The active [standard-instrumentation change](../openspec/changes/archive/2026-10-31-adopt-standard-otel-instrumentation/tasks.md) supersedes delivery policy for its new observations; the F-series JSON evidence above remains historical. Current local work uses Next 16.4.2, OTel API 1.10.0, log SDK/resources/core 3.0.0 and HTTP Protobuf exporters 0.300.0, explicit no compression and no Collector. Only the OTel API changes an existing installed package version; the maintained protobuf decoder and official v1.9.0 schema fixtures are test-only.

User-selected option B: two seconds bounds caller/processor waiting and socket inactivity, **not total request lifetime**. Active streams or retry/backoff may outlive that wait. Caller completion proves neither cancellation nor receipt. Four independent bounded log category queues retain at most 256 waiting records each, batch 64, one-second scheduling, and one standard exporter/Agent slot each; tests keep all four slots occupied under streaming while later batches cannot create replacements. Queues/retries are memory-only, admission remains 100 ordinary/20 errors per producer/minute, and browser document limits are unchanged. Native traces and later vocabulary/persistence adoption are not yet implemented by this checkpoint.

SDK serializer/HTTP/retry ownership replaces handwritten JSON/fetch. Closed Actions and observation/acceptance clocks remain; browser evidence uses the browser credential and explicit root context. Resource fields, static event/body/attribute vocabulary and known error categories are minimized before the standard batch processor. Unknown global logger events/scopes/fields cannot bypass that projection. Generic SDK headers cause fail-closed configuration because the standard constructor otherwise merges them; explicit destination/compression/resource/Agent settings prevent other ambient redirection/enrichment. No secret, endpoint or raw exception is sent to browser assets or telemetry diagnostics.

Local evidence under `.task/otel-apply/`: intended red for old JSON and ambient-header admission; 81 green focused SDK/policy/Action/hook/loopback tests; PWA typecheck and unchanged generated-client check. Actual copied-browser→Action→Node SDK→fresh receiver Home/Search/Planner/Quick Find qualification passes, including committed-but-lost ACK, identical Protobuf retry, protected reads, exact batch replay and storage reopen. Receiver binary SHA-256 `5f6372edc6dde428a8d6b41fa15e2386e34cb04f480f1d53992c21e62eaa7d39` and copied existing public assets are an explicitly tested binary/assets combination, not current receiver-source parity. Point JSON in browser artifacts is a decoded assertion projection; replay uses its original Protobuf batch bytes.

Opening browser qualification passes. Full error/browser/native-hook/durable-UI qualification now passes (1/1 in `m1-errors-final-e2e.txt`), including the twenty-error server cap, authoritative standalone diagnostics, root/boundary behavior, protected UI/read access, exact Protobuf replay and storage reopen. At that checkpoint final M1 preparation/review/verification was pending; its subsequent non-green result is recorded below. Initial error fixture failures were missing explicit public assets and a stale count that mixed queued screen presentation with a server diagnostic; application assertions are retained by counting diagnostic categories independently. Deployment/tunnel/proxy and physical-device qualification remain not-run. No real collection, private env, existing receiver storage, business API/schema/database or Sentrame source/service was changed.


M1 reconciliation after the user's shutdown decision: **2/20 tasks complete (1.1–1.2); 1.3 remains unchecked.** The global logger admission gap is fixed at the sole pre-batch policy boundary. Red evidence `m1-global-admission-red.txt` reproduced 130 admissions where 100 were allowed; `m1-global-admission-green-final.txt` passes 82 focused tests. Actual Protobuf receipt proves shared typed/global server budgets, independent browser/ordinary/error capacity, invalid-input exclusion, minute reset and first-activity window anchoring without double-counting. The stalled queue test advances admission windows while retaining the real blocked SDK batch, preserving separate queue-overflow coverage.

The user selected **shutdown option A**: retain Next standalone deployment with best-effort shutdown delivery. Pending queued records may be lost even during normal SIGTERM/SIGINT cleanup; no flush attempt or delivery is guaranteed there. This is separate from timeout option B above. Next 16.4.2 signal cleanup calls process.exit and skips the natural beforeExit hook; public instrumentation exposes no shutdown registration. The copied-next-start SIGTERM/SIGINT/streaming/duplicate-signal probe `m1-next-shutdown-red-final.{json,txt}` retains the observed queued-tail loss under the superseded guaranteed-flush expectation. Production standalone follows the same installed lifecycle by source inspection; a separate standalone-container shutdown pass is not claimed. Any natural beforeExit flush waits at most five seconds and cannot establish normal Next shutdown delivery. No custom host, competing signal/exit handler, internal patch or custom cancellation was added.

The stable-content conservative 39-path gate is `.task/agent-finish/runs/446d123cf74f49ed96960b91fd4e410b.json`, identity `58de58c0039535f2c6e538e815775ad9c9a0946ce399f2e39437ff15192184be`. Documentation/agent checks, lint/format/types, 114 unit files/1,479 tests, API 1,259 passed/156 existing skips, five static contract/client checks and all 183 disposable PostgreSQL tests passed. Overall status remains non-green: the unchanged main opening-spec length warning fails global strict validation; the broad browser run has 600 passed/47 skipped/one Planner mocked emitSchedule-versus-reload race. That case passed an isolated 1/1 rerun, which does not change the broad result. Live endpoint parity initially timed out, then passed separately through the corrected owned live bridge (`m1-live-endpoint-final.txt`). Task 1.3 remains open; source changes require fresh checks.

Joint current-image seven-log proof is complete for its exact identities. Actual browser/Action/Node SDK Home→Search→Home/Quick Find records retained seven events, two journeys, five edges and one explicitly configured Search goal through protected reads, exact original Protobuf replay and sibling-owned storage reopen. The initial receiver image `sha256:04ec4708abf574aecc5a59e745f20adb391fdd59c4642cc8697a657795865dff` (source `560a4f07bc404febd89df0c0cd91d727ce8804911db986c87461cb6d5c8662f3`) had a visible Home goal-marker defect. The sibling corrected source `8c0e1bf2f3f366d05bd10899077e8ee2a0175c16ca4d64cb76b2a7980fd0ff35` into image `sha256:ca773605335f414d91fab8ce0eb2949aac9fb7ff72301c1583b0a3e58b2d6930`, preserving retained data. Hierarchy/Force/Sankey and Paths now visibly identify Search as goal and preserve both paths/summary (`joint/receiver-final-qualification.json`). Earlier failing UI evidence and binary/assets receipt remain historical. These seven logs do not qualify native tracing.

The user separately authorized bounded M2 native Next tracing after contract reconciliation, while the M1 task 1.3 gate remains open. Native signals need their own actual exporter/receiver qualification; M3–M6 are outside that bounded stage. The synthetic Docker API/database remain on their owned internal network without provider access. Temporary WFS localhost18987/18988 bridge/Next supervisors were stopped; the sibling owns receiver18986. Exact resource status and ownership are in `.task/otel-apply/HANDOFF.md`. No production collection, real data or Sentrame source/service change by WFS is claimed.

## M2 native Next trace contract — 2026-10-30

This bounded stage adds server technical traces to the M1 SDK migration; historical JSON/log-only checkpoints above keep their original scope. The existing Node registration now owns one direct SDK3 trace provider with ALS context and an explicit no-op propagator. No `NodeSDK` auto-configuration, second logger registration, HTTP patch, custom transport or browser tracer is used. `OTEL_EXPORTER_OTLP_TRACES_HEADERS` joins generic/log ambient headers in the fail-closed configuration checks.

Only native `next.js` types `BaseServer.handleRequest`, `AppRender.getBodyResult`, and `AppRender.fetch` map to `next.request`, `next.render`, and `next.fetch`. Local GET/HEAD roots use standard parent-based 10% trace-identity sampling; local children inherit the decision. Non-GET/HEAD, Server Actions, unknown roots and remote-parent traces are excluded. No request headers/baggage become continuity and no outbound trace context is injected. Native counts are not exact HTTP request counts; framework roots may be separate, unsupported intermediates are dropped, and parent IDs are preserved without manual reparenting.

Before the standard queue, a detached safe span view retains native time/kind/IDs/local parentage, allowlisted HTTP method and integer status only. There is no dynamic route/path/URL, raw name, exception event/link, status description, tracestate, scope enrichment or detected host/process resource. Resource is exactly server service/version. Logs retain browser/server authority and their existing admission budgets. Traces use `/v1/traces`, server credential, HTTP Protobuf/no compression and an independent 256-waiting/64-batch queue with one standard exporter/Agent slot. Two seconds still bounds caller/processor waiting and socket inactivity, not an active stream's total lifetime. Even healthy drain can reject a batch while the exporter slot remains occupied; missing/partial spans cannot certify skipped work or exact failure totals. Standalone normal-signal queued-tail loss remains permitted.

Focused actual-SDK qualification passed 104 tests (`m2-focused-green2.txt`), typecheck and PWA lint; the canonical HTTP projection follow-up passes163tests/7files (`m2-canonical-green.txt`). Next legacy input fields are projected to canonical `http.request.method` / `http.response.status_code` so the receiver can retain their reviewed values. Real native live qualification uses explicit private `WFS_NATIVE_RECEIVER_CREDENTIALS=<owned-file>` with `task test:e2e -- telemetry-native-live.spec.ts --config=e2e/telemetry.playwright.config.ts`; it owns only a copied standalone app/synthetic upstream/capture, never the caller's receiver. A fixture-only SDK ID generator exercises sampled/unsampled roots through the unchanged production sampler; no production/browser ID override is provided. Forwarded HTTP200 is capture/transport evidence only. The current generated-standalone fixture passed1/1 (26.3s), forwarding15native spans/8traces in four200batches with matching source/fixture hashes; rejection/stall batches are separate adverse evidence. The earlier legacy-key run retained structure but omitted HTTP attributes and remains historical in `m2-live-legacy-keys/`. Protected native reads/exact replay/reopen and final repository verification remain pending here; the earlier seven-log journey proof does not cover these signals.


### Canonical native retention, replay and reopen

The current15span/8trace/four-batch standalone fixture now passes actual protected native retention, exact WFS replay and receiver-owned restart/reopen. Canonical method/status, native timing/kind/status/local parentage and server authority/version are preserved. WFS retained identity `19160b8f19b3617551db7a79085e7d552cd09a3f0319f8bd7c353f5f5b182e5d` and sibling independent identity `38ab85f0f0fcec18d13c59ea3347694ee582f6678c0b64ff2385ce9503e39664` are unchanged through all three phases. The original seven browser logs and configured journey derivation are preserved; native spans remain unassigned to business journeys. Some native traces are root-only/partial; no missing operations are fabricated. Receiver imageca773605… / source8c0e1bf2… is unchanged; later UI source is not deployed.

Evidence is in `.task/otel-apply/m2-live-green/` and sibling `native-stage3-{before-replay,after-replay,after-reopen}.json`. Four original forward batches were hash checked and posted once each, all200; rejected/stalled adverse batches were excluded. The earlier legacy HTTP-key omission remains historical, not a field-preservation pass.

The first complete stable43path gate passed1,501units/API1,259/all183PG/static/liveendpoint checks and the native live case, but three existing log-only capture fixtures mishandled the new trace protocol. Three explicit terminal404 path guards now keep traces outside those log assertions without disabling native production tracing; all three real log fixtures pass separately, with existing semantic/redirect/replay assertions intact. Final changed-content gate rerun remains pending here. The unchanged global main-spec warning and prior gate failures are retained independently; progress4/20 does not claim the whole change complete.


Final-gate topology: shared receiver18986 canonical proof is closed and preserved. The rerun uses a separate WFS-owned tmpfs receiver18985 from the same already-built image, private ephemeral credential file `/tmp/wfs-m2-final-receiver-20261030/credentials.json`, and no shared receiver intake/rebuild/restart. Synthetic project `wfs-otel-m2-final-20261030` is removed after verification; no persistent credentials/data volume. This replaces the earlier plan to send another gate fixture to18986 after ownership transferred.


## Final bounded M2 verification / ownership — 2026-10-30

Final conservative43path gate record `.task/agent-finish/runs/d57ef477a8fa4b4aad3d0390dcb8686b.json` completed with stable identity `ce106a70b466d773fce8f4652b8e80dfc54c7d3bed50fd2a05717379fab4ec37`. Passed: documentation, agent checks, lint/API formatting, PWA format/types,115unitfiles/1,501tests, all602browsercases/47documented skips (including native and three corrected log fixtures), API1,259passed/156existing skips, five static/client checks, live endpoint parity and all183real disposable PostgreSQL tests/zero skipped. PostgreSQL record `.task/database-tests/runs/e26e6951d7cf4091a3258c71ad0f286b/result.json`. The sole failure is global strict `spec:check`: unchanged main `anonymous-pwa-telemetry` requirement length warning. Selected change validates strictly; original outside-scope bytes, including that main spec, are preserved. The prior Planner race did not reproduce in this rerun; prior failed runs remain historical failures.

Progress remains **4/20**:1.1–1.2 and2.1–2.2 complete;1.3/2.3 remain unchecked because the full gate is not green. Bounded M2 functionality and actual native retention/replay/reopen are qualified; no M3–M6 work or production/deployed/device qualification is claimed. Later completion-document bytes receive separate documentation verification; application source remains identical to the final gate.

Cleanup confirmed in `.task/otel-apply/m2-cleanup.json`: WFSsupervisor3545/Next3902/bridge3822 stopped/reaped; ports18985/18987/18988 released. New18985tmpfsreceiver container/network/project and its private credential root removed; both owned M2 copied app roots removed. All native/log fixture resources closed. Inherited synthetic internal API/DB preserved running, no host ports/provider access. SharedSentrame18986/18999 and shared3000/5001 untouched. Sentrame successor owns its receiver; current15canonicalspan/eight-trace/four-batch proof plus originalseven-log derivation remain retained. No staging/commit/push/branch change/sync/archive/production collection.

One notification proposing another shared18986intake was auto-review denied after receiver ownership transferred, citing the successor's no-shared-intake instruction. No such further intake occurred. Final gate used a separate owned18985receiver; that safe alternative completed and is cleaned. No permission request is pending. Durable next action/scope/ownership: `.task/otel-apply/HANDOFF.md`.


### M3 API persistence checkpoint — 2026-10-30

Inherited M1/M2 acceptance is **6/20** after the fresh 48-file gate `.task/agent-finish/runs/6bc9f6e1d3d048edb07b1d04bfa479ed.json` passed with stable identity `df7f6539da8e97ddaf00588b61bf25cb78bce2e28c4c86f8e80b1a3f610030b5`. It passed 1,501 unit tests, 602 browser cases, 1,265 API tests, all 193 real PostgreSQL tests with zero skips, strict specs and the remaining selected checks. The main-spec warning is resolved; earlier failed/interrupted records remain historical.

M3 is partial. The optional saved-report observer is implemented and independently qualified by 57 focused service/report/lifecycle tests and 17 real PostgreSQL cases. Confirmed ordinary saves are observed before later reads/launch; rejection, uncertain acknowledgement and outer transactions produce no fact, and observer failures cannot change business handling. It remains unregistered. No API trace/log export, Program/Compose configuration or production collection is enabled. `Resolved()` remains reserved for M6.

Installed .NET OTel 1.20.0 can use one host-managed standard tracer provider with private SDK configuration to enforce memory-only retry without changing operational logging/metrics. This composition is within approved M3. A fresh stock-exporter rerun confirms identical-byte 503 retry, same-origin 307 refusal and no disk queue despite ambient disk settings. It remains a configuration probe, not WFS API qualification.

A separate .NET diagnostic-body limit is unresolved. The pinned Linux .NET 11 RC2/OTel 1.20.0 probe kept a terminal chunked 400 response body read active for 3,209ms with no body bytes when exporter Error diagnostics were enabled by another listener. Two-second exporter/client settings, private diagnostics-none settings and the minimum 1KiB response limit did not stop it; ForceFlush returned true while the read was active. With diagnostics off, the peer closed before the control's 3.2s release point (not a measured <=2s result). The probe released the body and awaited the failure event. Source/evidence: `.task/otel-apply/m3b-sdk-body/`, `m3b-sdk-body-linux.txt`; host RC3 matched. This is stock SDK evidence, not API/export/retention evidence.

The standard spec names Node socket inactivity; shared design and M3 require separate .NET qualification, and Node B/A cannot authorize a .NET relaxation. Pending decision: explicitly allow the .NET diagnostic read to outlive bounded caller waits without an inactivity bound, or require a supported SDK change. No global diagnostic mutation/custom transport/fork or memory-only retry relaxation is permitted. API export stays unregistered; all M3 tasks remain unchecked. Complete M3 before M4.

Durable error-fixture setup requires matching reviewed `WFS_NAV_SENTRAME_BINARY` and `WFS_ERROR_SENTRAME_ASSETS`, with `WFS_ERROR_DURABLE=1`. Omitting assets stops the fixture before observation; corrected focused qualification passed 1/1 before the complete gate. The user-requested setup lessons were sent to Sentrame's documentation owner. See [the selected change](../openspec/changes/archive/2026-10-31-adopt-standard-otel-instrumentation/tasks.md) for exact test records and remaining acceptance. `.task/otel-apply/HANDOFF.md` records cleanup and ownership; shared 18986 and parent-owned 19010 were untouched.


## M6 issue response and explicit resolution — 2026-10-31

Tasks 6.1–6.2 are implemented and qualified (18/20); 6.3 awaits its final repository gate. Browser `pwa.recipe_issue.save_result` uses fixed INFO body `WFS recipe issue result observed`, browser authority, current primary stage, existing document context/sequence, and exactly `saved_manual`, `processing_acknowledged`, `saved_launch_failed`, or `unconfirmed`. The shared lifetime cap is ten attempts per document. Current mounted submission guards invalidate on hiding/pagehide, close, replacement, unmount and supersession; rerenders, polling, cancellation and resolution do not manufacture results. Deliberate launch-failure handling observes once before its existing retained-draft error. No recipe/import identity, draft, reason selection, content, hash or cross-producer key is exported.

The recipes wrapper uses the generated `toPostRequestInformation`, installed request adapter and exact generated POST error mappings. A per-call supported parse factory inspects raw typed nodes before delegating unchanged to the generated response factory. This preserves a closed local classification before both generated decoding and wrapper normalization lose validity: missing/nonboolean flags, malformed nullable import identity/detail, filtered unknown reasons and unusable/mismatched report detail remain unconfirmed. Product mapping/errors and business requests remain unchanged. No generated client, OpenAPI, schema, dependency, global client middleware or custom transport changed.

API `wfs.recipe_issue.resolved` has fixed INFO body `WFS recipe issue resolved` and server authority. The explicit existing-report branch checks ordinary persistence both before and after SaveChanges, then contains observer failure. Absent-report no-op, active rejection, cascade removal, failed/uncertain save, uncommitted local/ambient/explicitly enlisted transactions and a transaction appearing before return produce no removal fact. Existing Saved semantics remain. Both facts reuse the same private provider/admission/privacy path and carry random event IDs only; neither certifies repaired content, recipe deletion or reimport success.

Current actual browser qualification passes 1/1 with zero skips: `.task/otel-apply/m6-live-final-summary.json`, detailed `m6-live-final/telemetry-issue-results-li-b2118-SDK-protected-replay-reopen-chromium/`. It retains 277 records, including 31 results (15 manual, 2 processing, 1 saved-launch-failed, 13 unconfirmed), through 30 actual SDK HTTP Protobuf batches/four fresh scopes. All 319 production inputs and current fixture hash match. Protected exact replay and restart/storage reopen preserve evidence and derived journeys (projection SHA256 `5a3c13afa87c55c6a814e5da8135d49957e3c89fdfb3ec24d3e131f7419aadd7`). Explicit exact event/stage configuration has no goal or pre-seeded path. Real wrapper/detail/root/Action/official SDK/receiver are exercised against synthetic schema-compliant business boundaries; this is separate from persistence proof. Hidden state is synthetic document visibility, not physical OS evidence.

Stable real authenticated API/Kestrel/service/PostgreSQL/provider/receiver qualification passes 29/29, zero skips, `.task/database-tests/runs/01730aa326024e0f9c85fef2143b97a3/result.json`; evidence `.task/otel-apply/m6-backend-final3/`. Actual saved and removal facts have independent server credentials, fixed bodies, source/observed clocks and IDs, no ambient Activity/scope/private sentinel, byte-identical lost-ack retry, exact replay and storage reopen. Outage/rejection/redirect leave business saves/removals unchanged. Host runtime is .NET 11 RC3 on macOS 26.7.2 and isolated PostgreSQL 17.11; immutable receiver image is `sha256:5ff1b05e898a66b5845757d6d092f2e673ff28959ad72db795d5f8ad9dd139f8`. This is not a new production-Program container qualification or cross-producer join.

Reproduction: use owned PostgreSQL connection in `WFS_TEST_POSTGRES_CONNECTION`, the immutable image in `WFS_API_SENTRAME_IMAGE`, and private evidence directory `WFS_API_TELEMETRY_EVIDENCE_DIR`; run `task test:database -- --filter 'FullyQualifiedName~RecipeIssueTelemetryPostgresTests|FullyQualifiedName~RecipeIssueTelemetryPersistencePostgresTests|FullyQualifiedName~RecipeImportReportPostgresTests'`. The standard runner supplies/cleans test databases; the caller removes its own PostgreSQL container. With no configured host connection on macOS, its Linux container does not forward receiver environment/Docker access, so that mode is relational qualification only. Browser command: `PATH="$PWD/.task/otel-apply/bin:$PATH" WFS_OTEL_SENTRAME_BINARY="$PWD/.task/otel-apply/bin/sentrame-m5-owned-image" task test:e2e -- telemetry-issue-results-live.spec.ts --config=e2e/telemetry.playwright.config.ts`. New live spec is registered by the existing live-name rule with explicit inventory regression; all 9 CI checks pass. Business reporting passes 11/11 separately. Focused wrapper/detail passes 76 and telemetry core passes 62; these are focused checks, not the final full gate.

Integration lessons: generated Kiota decoding can erase malformed raw values before wrapper defaults; inspect at the supported per-call parse boundary and delegate product decoding. Existing Kiota business-HTTP retry may make one explicit rejected Save multiple network attempts (503); terminal 400 is used to distinguish explicit-submission assertions. A mocked browser boundary never proves persistence. M6 browser and server facts remain independently inspectable with no timing join, shared operation key, reimport completion or inferred goal. Old F-series/M1–M5 evidence and current immutable receiver qualification remain separate.

Meaningful red and failed-run evidence are retained under `.task/otel-apply/m6-*`: wrapper absent/malformed flags, lossy generated import-ID/detail/reason decoding, detail/core/exporter absence and actual receiver absence. Backend first producer was empty despite service invocation; actual protected failure exposed it before fixed-body producer green. A 29-test passing runtime run failed overall because concurrent edits changed its identity; the stable record above supersedes it. Two scratch-runner edit/run actions were denied/not executed after a delegation-scope misunderstanding; the unchanged standard target with directly owned resources completed acceptance without modifying/running that rejected script. Node two-second waits/inactivity and Next/.NET best-effort shutdown/possible queued-tail loss and approved .NET diagnostic-body limitations remain unchanged. Deployed proxy/tunnel/container-route, physical phone/share/camera/OS-discard and assistive/native-zoom evidence remain independently not-run. No Sentrame write, production enablement or WFS sync/archive occurs at 18/20.


M6 final review additionally reproduced an error-only `exception.occurrence.id` surviving a direct/global SDK issue record; the pre-batch allowlist now copies that field only for error logs. The first full 25-path gate `feb1d9b9ff1248f09de59bc79db3e5e3` remains failed despite 1,617 passing unit cases, 613 passing browser cases, 1,306 API cases/178 opt-in skips and 204 Linux PostgreSQL cases/zero skips. Its unit failure was the inherited profile privacy regex matching short member ID `def` inside a valid UUID; the deterministic regression now uses unmistakable private member sentinels. Its browser failures were fresh receiver `/api/apps` provisioning rejection and the unchanged documented Tomorrow route-cleanup race. Bounded synthetic provisioning error details are retained for diagnosis. Prior successful browser qualification is not relabeled as covering the subsequent SDK bytes; fresh protected qualification and a complete 27-path gate follow separately. First-gate copied app, receiver, network and private credential root are confirmed removed in `.task/otel-apply/m6-gate-round1/cleanup.json`.


The review regression also exposed the installed SDK attribute-budget behavior: deleting then re-adding approved attributes can consume the count twice and drop required sequence context after hostile extra input. Projection now deletes only unapproved keys and updates retained approved keys in place before batching, using the public mutable record contract; no internal SDK counter, fork or capacity increase is used. The deterministic profile sentinel regression and actual SDK tests pass 11/11 after both corrections. These remain focused checks pending the fresh full gate.


M6 final acceptance: **19/20; tasks6.1–6.3 complete; M7 only remains.** Fresh27path full gate `.task/agent-finish/runs/1f577bf4af4348ce97f1f2cf533d1dd9.json`, identity `e8b097e189c7e1cf2351ff9a00169860029cbb32ee32a9ef6d34f903b9a16ada`, passes1,618units,615browser/47documented skips,1,306API/178opt-in skips,204Linux PostgreSQL/zero skips,223harness Python/one opt-in skip,9Node CI checks,39strict specs,lint/format/types/five contracts/live endpoint parity/content. Current post-review actual browser/SDK/receiver acceptance is `m6-live-current-summary.json`:277records/31results/30batches/four scopes,all319production inputs/current fixture matching,exact evidence+journey replay/reopen,private sentinels absent (sorted evidence/journey projection SHA256 `f381ea05e37c7725bb45f47db5183ecfdca5adf3f74a630e381e90e5f9c0ffe3`). The full gate independently repeats that fixture successfully. Real API/PostgreSQL/provider/receiver acceptance remains29zero-skip cases at `.task/database-tests/runs/3a394d86847f4e689b090ba37af2a2d5/result.json` with8protected records/6batches; API source unchanged. Browser and server evidence remain independent. First failed gate and all earlier red/setup failures stay preserved; the stable fresh gate owns the final application result. Later completion documents are checked separately. M7 owns all20reconciliation,then authorized spec sync/archive and final commit-message delivery; no commit/push or premature M6 archival. Exact resource cleanup and ownership release are recorded in the handoff.


## M7 final standard instrumentation — 2026-10-31

Local whole-change acceptance is complete:31requirements/87scenarios,20/20tracked tasks. Fresh132path gate `.task/agent-finish/runs/e4281f186f884a29bdc48a982d2987b2.json` (`1c893ca8f18e2c1637d0543323f3ea58d28009de8b6ad185bb150c1d88172884`) passes1,624units,615browser/47documented skips,1,306API/178opt-in skips,204Linux PostgreSQL/zero skips and all other selected checks. M7 closes raw date-time validity before generated response coercion; actual current issue proof retains293records/33results through32SDKbatches/four scopes with exact protected replay/reopen. API29case current-source proof stays independent. Earlier failed gates remain failed; the unchanged Tomorrow cleanup case passes in the fresh full run. Four equivalent long requirement leads are corrected for canonical strict validation without weakening obligations. See the selected change's M7 evidence and final `.task/otel-apply/HANDOFF.md` for canonical synchronization/archival, separate post-lifecycle validation, exact identities, cleanup and remaining limits. No new production/deployed/device qualification or Sentrame change is implied.
