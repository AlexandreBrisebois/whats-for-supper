# Design

## Context and Existing Ownership

The [proposal](proposal.md) bounds scope; the [delta](specs/anonymous-error-observation/spec.md) owns behavior. This is F3 plan mode under the [telemetry session prompt](../../../../.agents/prompts/telemetry-session.md). The [tracker](../../../../docs/telemetry/README.md), [inventory](../../../../docs/telemetry/journey-inventory.md) and [integration evidence](../../../../docs/sentrame.md#f2-1-local-qualification--2026-10-29) are dependencies, not new error qualification.

Inspection on 2026-10-29: WFS HEAD `f6100d13c3a23a4c5be0ca863f2a8017d7ae306d`, with 23 pre-existing modified/untracked navigation, opening, tests and documentation files. Preserve those edits. Installed Next 16.4.2, React/React DOM 19.3.1, transitive OTel API 1.9.1. No PWA provider/exporter is registered; reuse the manual standard JSON serializer in `pwa/src/lib/telemetry/server.ts`, not a second provider. `transport.test.ts` tests it; `transport.ts` does not exist.

Current `opening.ts` owns a document-keyed WeakMap, scope/tab UUIDs, sequence, last screen and navigation admission. Scope allocation occurs at the first eligible visible presentation, immediately before opening and initial-screen records. `OpeningObserver` runs under IdentityValidator/root providers; `OpeningFallback` registers committed fallback classification in a layout effect. `actions.ts` validates closed input and captures the forwarding clock before `after()`. `server.ts` rechecks opt-in and owns per-producer limits, private configuration and resource version. Current `app/error.tsx` logs locally and preserves `reset`; there are no client/server instrumentation files or `global-error.tsx`. Do not redirect its console output into telemetry.

Prerequisite reconciliation at F3-1 apply, 2026-10-29: current F2-1 final record `.task/agent-finish/runs/48fdfcc05c60422bbe2247ac1d0e92a9.json` passed stable content and applicable automated checks. The older `6459096adeb84a55b175acbf9c836e6c` mutation-blocked attempt below the planning baseline has been superseded. This is prerequisite evidence for F2-1 only; other groups are not inferred complete. Main opening specs remain stage-only; the active [F2 opening delta](../../observe-pwa-navigation/specs/anonymous-pwa-telemetry/spec.md) owns the current correlated contract. F3 does not sync/archive or modify the navigation package.

Local Sentrame is clean HEAD `a506dacbdc0f776238f2b3ebc769e42d2b4b9378`; schema 3, projection `structural-v2`, computation `journey-native-v3`. Reviewed local intake/store/journey/query/errors/privacy code, `web/src/Errors.svelte` and Workspace, plus these document SHA-256 identities:

| Local Sentrame document | SHA-256 |
| --- | --- |
| `docs/integration/OTEL-CONTRACT.md` | `e2ebc1a72b1d700bcf04ed3c8faec6e0ebf6eca0390e9159398a51dcd5feaaf7` |
| `docs/DEVELOPER-GUIDE.md` | `781cb9552dde612eafb1478dd30777f2761547046b00c7ef296f8b6da26ee961` |
| `docs/integration/AGENT-INTEGRATION.md` | `3f9e407be5fdb235061fc1e979ac1e6f7e4513755535aa6dcb413bb70183e346` |
| `docs/USER-GUIDE.md` | `95d706ba997bfd6577eebd35535d7fae5828682f7f24bbf94fb874b13d4aaf93` |
| `docs/verification/standard-otel.md` | `1a2aa4acfb17830fbb08da0021c7c76c95e7b449de8530e07b69d36faf6aa35e` |

These are source/document inspections, not a built WFS error path or receiver UI execution. The receiver's .NET/Next/browser SDK sample cells use different package graphs/wire paths and do not qualify WFS JSON errors. Later tests must record actual receiver binary/assets hash, WFS source/build/lock identity, definition/configuration identity without secrets, wire hashes and clock basis.

## Decisions and Tradeoffs

### One enabled document coordinator and observation-time snapshot

Extend the existing document owner; extract a cohesive module next to `opening.ts` only as needed by real consumers. Browser hooks and boundaries read existing state and allocate error record sequence through this owner. They never initialize a session/tab for an error, use a separate sequence or derive context from React provider identity. Keep the owner reachable through document-local in-memory state across provider/boundary replacement and ordinary remounts; no persistent storage, cross-document handoff or new client workflow graph.

Register lightweight native hooks synchronously in `instrumentation-client.ts`, but admit nothing before a server-derived enabled decision. Installed Next 16.4.2 rejects a direct Server Action import in its instrumentation-client bundle layer; the existing `OpeningObserver` supplies the Action callback during its enabled document handoff instead. The listeners remain synchronously registered, with no buffering or earlier context allocation. The existing root enabled handoff is preferred. If root replacement requires a Next internal config read, expose only the runtime boolean using a bounded same-origin read, no token/destination or arbitrary relay. Such a read does not reconstruct missing context or collect earlier errors. Initially disabled documents remain disabled; no pre-opt-in buffer/replay.

Reconcile F2 initialization explicitly: current F2 initializes scope at first eligible presentation, so an enabled error before that point is standalone. Error reporting must not move that initialization earlier. If a future approved coordinator already has session/tab but no presented screen, include the existing correlation/sequence and omit stage. The former Early error rule that always omitted visit context is replaced by these two cases. Fallback rendering can later be a real `error` screen observation; it must not retroactively relabel the error that preceded it.

At the observing callback, synchronously snapshot occurrence time, safe reason, new event/occurrence identity and any existing session/tab/last actually presented primary static screen, allocating sequence from the same owner. Last screen means a real presented primary, including approved Planner primary identities once adopted; a pathname request, overlay label or speculative fallback is not a screen. Do not read mutable current state later in the Action/exporter. Context survives root replacement only when the browser Document remains the same; a new document has independent state. Sequence is allocated before admission/delivery and may have gaps; suppressed duplicate callbacks allocate no second record. Existing opening-before-initial-screen ordering stays intact.

### Exact useful envelope

Standard OTLP/HTTP JSON logs, `Content-Type: application/json`, no compression, `/v1/logs`. All wire constants and resource values are server-owned. Browser observations retain browser authority even when forwarded by Node.

| Emitted field / location | Owner | Availability | Meaning and limit |
| --- | --- | --- | --- |
| `eventName` on log | Fixed adapter/serializer | Always | `pwa.browser.error` or `pwa.server.error`; observing producer, not business outcome |
| `severityNumber` on log | Serializer | Always, 17 | ERROR diagnostic eligibility; no automatic journey end |
| `body.stringValue` on log | Serializer | Always, `WFS unexpected error observed` | Fixed safe text, no dynamic diagnostics |
| `scope.name` in scopeLogs | Serializer | Always, `wfs.anonymous` | Instrumentation scope, distinct from anonymous session |
| `service.name` resource | Server config/producer | Always | `wfs-pwa-browser` or `wfs-pwa-server`, with matching separate credential authority |
| `service.version` resource | Deployment `WFS_VERSION` | Trimmed or `unknown` | WFS release/build; never browser-selected or individual identity |
| `reason` log attribute | Observing adapter, validated server-side | Always, closed enum | Observing boundary only; not root cause, incident count, affected people or journey result |
| `event.id` log attribute | Local record owner | Fresh random UUID per admitted record | Log replay identity, not failure or visit identity |
| `exception.occurrence.id` log attribute | Occurrence owner | Fresh random UUID per identified episode | Observed failure occurrence, shared by demonstrably overlapping callbacks; no content hash |
| `session.id`, `tab.id` log attributes | Existing enabled document coordinator | Browser only, together if already present | Anonymous document correlation; no session/tab generated solely for an error |
| `source.sequence` log attribute | Same coordinator | With existing browser context, positive safe integer | One increasing stream across opening/navigation/errors, observation order rather than delivery or causality |
| `stage.name` log attribute | Snapshot of coordinator's last presented primary | Browser only, when known | Approved static screen hint at observation; omit unknown, never invent `other` for absence |
| `timeUnixNano` on log | Observing browser callback or Next hook | Always | Occurrence/observation time, not deferred export time |
| `observedTimeUnixNano` on log | Node Action acceptance or Next hook | Always | Separate server observation clock; receiver receipt is another clock |

Browser reasons: `browser.script` (window error callback), `browser.rejection` (unhandled rejection callback), `browser.render` (client render boundary). Next reasons: `server.render`, `server.route`, `server.action`, `server.proxy` from fixed routeType mapping; `server.unknown` for unsupported/missing type. They prove the boundary observed an unexpected failure, not its underlying cause. No raw messages/stacks, arbitrary exception names/types, framework digest, request data, URLs/paths/queries, product/person/household identifiers, console arguments or content-derived hashes. The only identifiers allowed are reviewed random telemetry identities. Receiver ability to retain scrubbed diagnostics is not permission to send more.

Closed browser Action input is at most 2 KiB: required reason, eventId, occurrenceId, timestamp; optional context is a single validated sessionId/tabId/sequence group, with optional approved screen only when context exists. Reject partial groups, unknown own keys, arrays, accessors, invalid UUIDs, unsafe/nonpositive integers, arbitrary reason/event/service/body/destination and malformed values without echo. Fix browser event name, authority and envelope server-side; never accept arbitrary OTLP. No business API/OpenAPI/client change.

Use F2 clock validation against Action acceptance: browser Unix milliseconds must be positive safe integers, no older than 24 hours or more than five minutes ahead. Reject rather than repair clocks or resnapshot context; convert via integer arithmetic to decimal nanosecond strings. Capture server observation before `after()` and retain it through deferred forwarding. A standalone browser error still has its original timestamp. Next timestamps are captured locally when its hook observes the failure; no timestamp matching creates linkage.

### Identity and overlap

An occurrence is a local failure episode, not an Error object's lifetime. Use bounded episode state plus object/boundary-lifecycle identity where demonstrable. Boundary effect replay retains the admitted episode. Reset/retry retires that episode before trying again, so rethrowing the same Error object receives new occurrence and event IDs. Independent Next request-hook invocations receive new occurrence identities even for the same Error/category. Do not use a process-global WeakSet of errors as permanent suppression.

Suppress native/boundary overlap only when callbacks demonstrably belong to one local episode; keep non-object dispatch fallback state transient and bounded without retaining thrown strings. When global callbacks cannot distinguish reuse from overlap, disclose incomplete suppression/count uncertainty. Do not claim universal deduplication. Framework-marked server errors remain server-owned; browser boundary skips exception export without sending/hashing the digest. Fallback presentation remains separately observable. Native callbacks may lack ownership markers; exact cross-producer overlap is not promised.

Sentrame `store.go` keys stored log identity by source/signal/`event.id` within the selected app store. Exact projected replay preserves original record/receipt/definition; a changed projection under the same identity is an identity conflict. `journey.go` also deduplicates record IDs before derivation. `exception.occurrence.id` is retained for occurrence analysis, not intake deduplication. Two event IDs with the same occurrence ID remain two diagnostic records. Verify exact captured-wire replay and reopen; WFS itself introduces no retry. Equal text/category is never identity.

### Diagnostic discovery versus journey interpretation

Source evidence: `diagnostic_privacy.go` admits severity >=17 into errors without needing exception text/type. Protected app-scoped `GET /api/errors` in `errors.go` reads stored errors independently of journey membership. `intake.go` retains reason/exception occurrence/static stage plus context, source/observed time and service/version. These are required WFS compatibility tests, not runtime passes from this review.

| Case | Expected receiver behavior | Configuration / limit |
| --- | --- | --- |
| Received standalone diagnostic | Errors & exceptions / Whole application and protected errors API show it | No error mapping, goal, trace ID or journey scope required |
| Received browser diagnostic with supported existing context | Supporting evidence in the appropriate captured journey, available before/after path inspection | Opening/navigation mappings must have captured a journey; error itself stays unmapped; same scope/tab, supported time/segmentation/retention and captured definition matter |
| Explicitly configured visible error step | Owner can select exact browser/log/service/name, optionally disjoint `reason` condition; Kind step, timing unavailable | Prospective deliberate path semantics, separate from mere diagnostic discovery; no default error mapping |
| Missing context or unsupported linkage | Diagnostic remains discoverable, linkage unavailable/unknown | Never infer from time, cookies, digest, household, trace proximity or a nearby record; do not claim complete pre/post history |

`journey.go` groups scope/tab, orders unique source/service sequences when valid (otherwise event/receipt ordering), starts at a mapped occurrence and appends supporting evidence inside supported captured boundaries. Unmapped diagnostics do not update LastMapped. Missing beginning, inactivity, goal closure, out-of-order delivery, filtering or expired detail can limit association; same document scope does not promise one receiver journey. Goal completion and 30-minute mapped inactivity are separate boundaries. Severity alone changes neither. Do not map errors to exit, goal or activity for visibility: activity can start a capture and refresh inactivity, so it is not a neutral display workaround. Continued presentation does not prove repair of the failed operation; the receiver's completed/continued highlight is not business recovery.

Integration recipe: first check Whole application errors/protected reads with no error mapping or goal. For path qualification use a separate fresh disposable app/storage, activate reviewed App opened plus disjoint Home/Search presentation steps before emission, with a meaningful explicitly synthetic reaching-Search goal. Emit opening -> Home -> browser error -> Search; error remains supporting evidence, not a step/goal. Read the captured path, error linkage, later presentation and status separately; assert it was active after error and completed only at Search. No fake production goal and no historical remapping assumption. Current receiver goal-free nonempty definition activation is unsupported (`query.go`); that is separate receiver work, not a reason to change WFS error semantics.

### Honest Next lifecycle and missing propagation seam

Installed bundled Next docs in `dist/docs/01-app/03-api-reference/03-file-conventions/{instrumentation,instrumentation-client,error}.md` and `dist/server/instrumentation/types.d.ts` were inspected. Client hooks run before hydration but only synchronous registration is guaranteed; caught/early/cross-origin failures remain blind spots. Root `global-error` replaces layout, requires its own html/body/styles and cannot depend on surviving LocaleProvider/IdentityValidator. Preserve accessible localized fallback and existing reset/navigation; do not switch recovery APIs for telemetry.

Installed `instrumentation.md` explicitly requires awaiting async work in `onRequestError`. Browser Actions retain deferred `after()` to avoid serializing ordinary Server Actions behind receiver latency. The Next server hook instead awaits the bounded Node exporter, catches failures and adds at most its existing two-second timeout when admitted. Do not assume detached work survives request completion or assume `after()` is supported in every hook context. Test actual Node hook invocation/response lifecycle in the optimized fixture. Edge, fatal process errors and .NET hooks are not covered.

The hook currently has no approved anonymous request-context seam. Emit useful standalone `pwa.server.error`, no session/tab/sequence/stage. Do not infer them from headers/cookies, household identity, request URLs, digests, timestamps or adjacent browser records. A separate propagation change would need an explicit app-origin request carrier for a snapshot of existing random context; strict format/size/origin validation; untrusted correlation versus server observation authority; request-local concurrency-safe storage/lifetime/cleanup; tab/document transitions and cancellation/retry semantics; no leakage to other services; and forged/missing/stale-context tests. No propagation is implemented here, including for Server Actions that fail.

### Volume, failure isolation and loss

Keep runtime server opt-in, separate private browser/server credentials and server version, redirect rejection, four active exports and two-second timeout per producer/process. Partition each existing 120/minute total into at most 20 error and 100 ordinary (opening/navigation/synthetic) records. Browser has ten error submission attempts per document lifetime, shared across hooks/boundaries, consumed before async work; reset, remount and minute rollover do not rearm it. This deliberately replaces the older draft's ten/minute/document rule to honor the requested ten/document cap. No additional export is guaranteed during concurrency saturation; error priority cannot evict an active request.

One 10,000-error document attempts at most ten submissions; four such tabs attempt at most forty, of which at most twenty errors per producer/process/minute may export. N processes can export up to 20N errors and 100N ordinary records/minute per producer; not a cluster quota or a complete occurrence count. Use fixture-local counts to prove admission; do not claim Sentrame SDK drop counters observe manual exporter loss.

Bound suppression/admission state; no queue, retry loop, unload flush, sampling, console monkey patch, durable storage or Collector. Contain synchronous throws and rejected promises from telemetry; exclude the reporting path from error observation so receiver outage/validation failure cannot recursively report itself. Do not swallow/rethrow application exceptions differently, delay rendering/reset/navigation, or manufacture recovery when navigation resumes.

## First Observable Slice

F3-1 is script/rejection observation through real browser hook -> closed Server Action -> deferred Node serializer/exporter -> disposable capture and actual Sentrame -> protected durable reads/reopen. Opening -> Home -> error -> Search proves shared existing scope/tab, distinct record IDs and increasing sequence, supporting diagnostic linkage and continued navigation. Include standalone initialized-before-context error, observation snapshot before delayed forwarding, disabled/private/adversarial/outage/storm/overlap cases in the slice. No root/render/server hook or new business event yet.

Prerequisites: implemented F1 gates/config/transport, reviewed active F2 opening/navigation deltas and actual F2-1 final acceptance (1.4 unchecked after concurrent content-stability failure); shared allocator/snapshot seam added within F3-1 using the existing owner, not assumed already public; owned optimized WFS fixture; reviewed disposable Sentrame binary/assets, fresh compatible storage and protected owner/viewer access. Reuse `telemetry-receiver.ts`; capture-only mode of the current optional-binary fixture is insufficient for required durable/linkage acceptance. Do not wait for Planner/Quick Find, obsolete stage-only F1 receipt, deployment/phone checks or production goal-free activation. Any unrelated baseline repair needs separate authorization.

F3-2 adds route/root render and actual Next hook standalone diagnostics, with its own receipt/reopen/privacy/lifecycle tests. F3-3 reconciles producers, configured optional-step semantics and qualification cells rather than deferring first receipt to the end.

## Operational Diagnosis and Separate Work

Receiver usability findings are source-backed, not a visual UI pass. `Errors.svelte` summarizes by exception.type or event name and preview text; WFS's fixed body therefore leaves `pwa.browser.error` / `pwa.server.error` as broad labels. Reason, stage and exception occurrence are inspectable in expanded Retained diagnostic fields and protected API attrs, not dedicated category labels/filters. `errors.go` free-text search includes name/source/signal/service/version/scope/trace/span and diagnostic text, but excludes `reason`, `stage.name`, `exception.occurrence.id` and event record identity. Searching those fields must not be claimed supported. Errors view limits are 100 returned records from a bounded scan of 10,000; detail expires at 30 days. Explore related context appears when scope exists; verify it reaches the intended captured path, not merely that a button is present.

| Owner | Requirements / follow-up | Status and boundary |
| --- | --- | --- |
| WFS F3 | Closed safe envelope, shared snapshot/sequence, episode identity, standalone server errors, caps, real-seam acceptance and docs | Planned here; no application edits or runtime qualification |
| Sentrame | Keep standalone Errors discovery and supporting journey evidence without an artificial error mapping | Source-supported; actual WFS compatibility must be qualified |
| Sentrame usability | Category/stage/occurrence search/filtering, clearer labels and precise related-journey navigation where current UI is insufficient | Separate receiver work; do not add exception.type/free text or mappings to work around UI |
| Sentrame modeling | Goal-free open-ended navigation activation/inspection | Separate receiver requirement already identified by F2 |
| WFS request propagation | Explicit anonymous browser-to-server context carrier, validation, authority and request-local lifetime | Separate change required before browser/server journey linkage can be promised |
| Journey inventory J02–J16 owners | Handled votes/imports/assignments, post-commit publication failures, exhaustion/convergence, saved shopping/cooking and actual recovery | Deferred business observations at their authoritative owners; clicks/optimistic UI/HTTP/SSE/later navigation do not prove persistence or repair |

## Qualification Cells

| Cell | Required evidence for F3 | This planning revision |
| --- | --- | --- |
| Source/artifact review | Current WFS/F2 and local receiver identity, docs/source limits | Inspected; documentation checks reported separately |
| Unit/component/HTTP | Intended behavioral red then green for snapshot/identity/admission/closed payload | Not-run; behavior cycle not-applicable to planning |
| Capture | Actual browser handler/boundary -> real Action -> Node JSON capture, private sentinels/tokens absent | Not-run for errors |
| Durable-read | Actual disposable Sentrame intake, protected errors/evidence reads, unauthorized-read rejection and process restart/storage reopen | Not-run for errors |
| Journey-derivation | Independent standalone no-definition diagnostic test; prospective synthetic presentation goal, unmapped linked error, continuation, status and exact replay | Not-run for errors |
| Deployed-route | Selected disposable container/proxy/tunnel build/config and protected reads | Not-run; separately selected qualification |
| Physical-device | Actual installed browser/device fresh/resume/unlock/error/navigation, exact identity | Not-run; separately selected qualification |

Use passed/failed/blocked/not-run/not-applicable per cell. HTTP success, mocks, source comments, another SDK sample and F2 presentation receipt do not qualify F3 error behavior. No receiver storage was opened/reset or changed by this planning review.
