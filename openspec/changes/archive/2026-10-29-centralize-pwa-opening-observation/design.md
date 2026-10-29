# Design

## Context and Existing Ownership

The [proposal](proposal.md) bounds the increment. The [capability delta](specs/anonymous-pwa-telemetry/spec.md) owns its observable contract.

Source-observed baseline:

- `pwa/src/lib/telemetry/server.ts` is server-only, checks runtime env on each export, and implements fixed synthetic JSON logs with separate browser/server credentials and budgets. `actions.ts` has only an unwired no-payload synthetic browser Server Action. Existing tests cover privacy/configuration, transport and producer separation.
- `pwa/src/app/layout.tsx` is shared by public entry and protected pages. `(app)/layout.tsx` excludes Welcome, onboarding and invitations, so an observer there would miss those entry screens.
- `pwa/src/proxy.ts` redirects before page presentation. `IdentityValidator.tsx` additionally hides children until hydration/identity checks permit entry and redirects root to Home or onboarding. Its existing `isReady` state can survive route changes; it is not sufficient evidence that a newly observed pathname passed its gates.
- Manifest shortcuts use `/recipes` and `/capture`. The active manifest uses multipart POST `/share-target`; `pdf-share.js` hands this to Capture or existing access recovery. Observation must not touch share content or tokens.
- `components/common/Modal.tsx` exists, but Quick Find, recipe issue/filter sheets, family-nudge and Demo dialogs have bespoke implementations. Next.js does not know that these state-driven components are modal navigation.

No installed-app runtime or Sentrame deployment was exercised during planning.

### Local Sentrame compatibility target

Protocol revision source: `/Users/alex/Code/sentrame`, read locally on 2026-10-29. HEAD is `42d7c79cd72a83753abe7034ddc19b5d140029d2`, but the relevant implementation/docs are uncommitted; HEAD alone does not identify this target. The following SHA-256 hashes identify the reviewed documentation, relative to that local root:

| Local document | SHA-256 |
| --- | --- |
| `docs/DEVELOPER-GUIDE.md` | `78bb1701b866d771319fc421480a42a999404dd74b7e14c7fb2d0801391f5153` |
| `docs/integration/OTEL-CONTRACT.md` | `5f89f62711dae041895fdd6255a572ee5188a6b7fd94703bddbe6f71ef495ace` |
| `docs/integration/AGENT-INTEGRATION.md` | `66123a8dd3475c9645ecaa225e49e5fcd4ec7db090379d29135b08004fc59bf0` |
| `docs/USER-GUIDE.md` | `d61d1e5c071f665875505ce3fe69e1b9f551fbe128ebd6a4847d097481a27944` |
| `docs/verification/standard-otel.md` | `1a2aa4acfb17830fbb08da0021c7c76c95e7b449de8530e07b69d36faf6aa35e` |

The local qualification ledger describes schema 3, projection `structural-v2` and journey computation `journey-native-v3`. Unsupported earlier storage schemas fail explicitly; use fresh disposable storage, never an automatic reset. The ledger's actual Next/browser exporter cells use uncompressed HTTP Protobuf, not WFS's hand-serialized JSON path. WFS and its deployment route remain unqualified. Do not infer compatibility from that sample's pass, the older GitHub guide or a published image predating this model. Reconcile this snapshot if the local target changes before implementation.

Source spot-check: `internal/app/intake.go` still allows `stage.name` and distinguishes source/observed/receipt times. The local producer contract and developer manual-wire example still describe JSON logs at `/v1/logs` with producer Bearer authentication. No breaking endpoint/token change was found in these sources. No Sentrame source or storage is changed by this WFS plan.

## Decisions and Tradeoffs

### Shared observation, explicit safe names

Use one small client opening coordinator, one shared route observer using `usePathname()`, and a closed route-to-screen registry. Do not subscribe to clicks or instrument every `Link`, `router.push`, page or feature action. This follows Next.js's [navigation observation pattern](https://nextjs.org/docs/app/api-reference/functions/use-router#router-events), but uses only approved screen labels, never the example's full URL/query serialization.

Routes are exact matches: `/welcome`, `/onboarding`, `/invite`, `/home`, `/recipes`, `/capture`, `/capture/confirm`, `/planner`, `/discovery`, `/profile`, `/profile/settings`, and `/browse-all-stack`. Map `/recipes` to `search`, `/capture/confirm` to `capture.confirm`, `/profile/settings` to `profile.settings`, and `/browse-all-stack` to `browse.stack`; other listed routes use their single static name. Shared error/not-found fallbacks use `error` and `not.found`. The dotted values follow the local Sentrame naming recommendation; none has shipped in WFS, so this changes a draft vocabulary only. Do not infer shortcut/referrer or invitation purpose. A new route works automatically as `other`; distinguishing it requires a registry declaration, not new telemetry logic. Do not derive labels from dynamic segments, document titles or DOM text. No build-time registry generator is needed for this increment.

The observer runs within the shared identity presentation boundary, with explicit observation-ready pathname information from the gate's existing allow branches. Clear observation readiness for a changed pathname until that pathname is allowed; do not reuse stale `isReady`. This information controls observation only and must not change access decisions, destinations, render timing or member recovery. Root's redirect-only state is not an entry screen. Shared error/not-found boundaries can override classification with fixed `error`/`not.found` labels when they are actually presented; ordinary pages need no registration calls. If failure prevents the observation machinery from running, no event is promised.

Observe a committed route shell in a visible document, not complete page readiness or a paint acknowledgement. Loading/data failures within that shell do not retroactively change the opening. No per-page success marker is required. Gate readiness and fallback precedence need focused component tests; pathname alone is insufficient.

### One event and one retained attribute

The only new exported event is `pwa.app.opened`, a standard named OTel log point observation, not a native span or an operation duration. Keep INFO severity 9, fixed body `WFS opening observed`, current browser service/scope and server export-time timestamp. No `stage.state=start`, fabricated trace/span, paired end or occurrence identity is added.

The local producer contract identifies `stage.name` as an optional Sentrame application hint/retained condition, not an official OTel convention. WFS deliberately requires this one attribute to distinguish entry screens under one stable event name; Sentrame's base reception does not require it. Unknown attributes such as a new `entry.screen` are omitted. Keep the hint on the individual log record, not the service resource. Explicit owner labels win over hints; a hint neither activates a mapping nor provides Kind, goal, authority, session, inheritance or timing. Receiver projection remains a live qualification check.

Keep the existing bounded standard OTLP/HTTP JSON exporter for this slice: `POST /v1/logs`, `application/json`, compression none, decimal nanosecond timestamp and producer Bearer header. This is the existing OTel wire model, not a new proprietary Sentrame envelope. Its application-specific Server Action validates one semantic input and constructs only the approved log; it is not an SDK replacement framework. There is no existing OTel provider in this seam to reuse, and no evidence that JSON has been removed. An SDK/provider migration, traces, auto-instrumentation and Protobuf batching would add independent lifecycle/privacy/retry work and are outside this increment. If later selected, inventory and reuse providers rather than create duplicates, and qualify that exact SDK cell separately.

`timeUnixNano` remains the server's observation/export time, not the precise browser opening time. Sentrame receipt time is a separate clock. No browser timestamp is accepted merely to imply more exact chronology; no dwell, presence, attention, native duration or adjacency estimate is inferred.

### Application release metadata

As requested after F1-3 completion, include standard OTel `service.version` on
both browser and server log resources, alongside their distinct `service.name`.
Read the existing server-owned `WFS_VERSION` deployment metadata (trimmed), with
literal `unknown` when absent or blank. Use the actual immutable app release or
build SHA, never a per-request/process identifier, browser input or receiver/SDK
version. The Synology release template already forwards `WFS_VERSION`; repository
Compose must forward it too, using its required release `TAG` in production when
no explicit `WFS_VERSION` is supplied. This resource metadata adds no record
attribute and changes neither producer authority nor document lifetime. No SDK,
provider, trace collection or additional telemetry feature is needed. The local
Sentrame developer guide's "Send your app version" section requires resource
placement; actual durable receiver projection remains separately unqualified.

### Strict forwarding without promoted authority

Add a dedicated `reportBrowserAppOpened({ screen })` Server Action. Its input is one plain object with exactly one own field, `screen`, whose value must be a member of the closed enum; reject arrays, null, unknown fields/values and oversized/malformed shapes. Do not return receipt confirmation or echo rejected values. Fix name, body, attributes, destination, timestamp and browser credential on the server. No client-selected producer, event name or destination is accepted. Retain Next.js same-origin protections; this remains untrusted browser evidence and is not a public OTLP relay.

Reuse the existing server transport with a private typed serializer or dedicated opening sender. Do not expose a generic arbitrary-event export API to clients. Preserve both existing synthetic entry points and independent producer budgets.

Runtime opt-in remains in the private container env file. The root may provide a server-derived enabled boolean to the coordinator; no endpoint/token enters HTML or the client bundle. Initial disabled state closes the opening opportunity without queuing; it is not re-evaluated on navigation. The actual export still checks current server configuration. Env changes take effect through container recreation and a document reload, as documented today.

### Modal convention, deliberately outside this implementation increment

For future modal observation, standardize a shared dialog/sheet surface with a required static identity, conceptually `<AppModal screen="family_nudge" open={open}>`. Its shared lifecycle owns open/close observation; business handlers contain no telemetry calls. Modal labels need their own closed registry and reviewed event contract before export. Translation titles, recipe names and arbitrary DOM attributes are not identities.

New modals adopting that component would need only the identity declaration. Existing bespoke overlays would require deliberate migration and focus/draft/navigation preservation checks. A global DOM mutation observer cannot reliably infer semantic identity or distinguish mount/animation from presentation. Intercepting/parallel route modals are an alternative where shareable navigation is a product need, not a prerequisite for telemetry. Do not convert existing modals to routes for this change.

This is an architectural convention recorded for later work, not an obligation to ship an unused modal telemetry abstraction now. No general page-view/modal events, transition history or bulk migration are included in the task set. A modal over initial Home does not change the page entry label.

### No correlation

A single observation does not require linkage. Use a document-memory boolean/state machine, not a generated session identity or storage key. No telemetry cookies, storage, event IDs or trace context are added. Counts represent received observations and can include fabricated/replayed browser submissions; the local guard is duplicate suppression, not receiver-wide deduplication or abuse authentication.

## First Observable Slice

Start with a fresh authenticated Search document: actual root composition and identity gate -> shared route observer -> document coordinator -> real Server Action -> fixed opening serializer -> existing transport -> disposable local HTTP receiver. Assert one browser-authority JSON log with `stage.name=search`, then no additional record on internal navigation and another after full reload. Do not mock the action in this seam check; double only Sentrame and existing external business API boundaries.

Then extend the same path to Welcome/onboarding/invite/share classifications, hidden/resume/fallback behavior, configuration and failure cases. Existing `pwa/e2e/mock-api.ts` owns business API fixtures; there is no new business API operation. A browser interception of a Server Action alone cannot prove Node-to-receiver transport.

## State, Concurrency and Recovery

Coordinator state is `waiting`, `claimed` or `disabled`, scoped to the actual document (not a component instance). A fresh enabled document starts waiting. Commit eligibility requires a current allowed route shell and `document.visibilityState === 'visible'`. Atomically transition to claimed before calling the action. Keep the state across component remounts, client navigation and history restoration; do not use an inactivity timer or reset it on visibility/focus.

Initially hidden documents remain waiting. On visibility, evaluate current committed route/readiness rather than sending a stored stale route. Candidate cleanup and gate revision prevent a departed or disallowed route claiming the opening. Submission is fire-and-forget with rejection containment; application rendering and auth do not await intake. Once claimed, failure, timeout, server budget rejection or navigation interruption cannot reset it. No unload handler, beacon, retry queue or durable outbox is introduced. Actual framework delivery does not establish exactly-once receiver acceptance.

## Compatibility, Rollout and Reversal

Ship the opt-in-off implementation first. Existing env names, Compose forwarding, producer services and synthetic checks remain compatible. Enable via the existing private env file and recreate only the PWA container using its normal Compose selection, then reload tabs. Reverse by disabling and recreating/reloading; no data/schema migration or public OpenAPI/client change is needed. Do not alter the service worker, manifest destinations, invitation parameters or auth return behavior.

The WFS document lifetime is an emission rule, not Sentrame's automatic journey segmentation. Sentrame's mapped-goal/inactivity policies do not rearm the coordinator or require WFS to invent scope/tab IDs. This plan does not upgrade a Sentrame installation or migrate its SQLite data. Runtime acceptance must use the reviewed local receiver build (or a subsequently published equivalent verified against this contract); do not claim that the current published image includes these changes.

## Operational Diagnosis

Use a disposable build of the local Sentrame target with fresh compatible SQLite storage and private test tokens. First qualify existing browser/server synthetic checks independently through actual HTTP JSON ingestion, durable storage and protected reads. Then find `pwa.app.opened` through Unmapped events or its retained named-log record. No fake parent span is needed to make a standalone log appear in Traces. Verify browser authority, service `wfs-pwa-browser`, log carrier, event name, time basis and retained `stage.name`. A wire-capture stub proves serializer/transport properties only; a 200/action resolution alone proves neither durable receipt nor analysis availability. Test receiver restart/reopen using only the disposable database and verify retained projection, recording actual receiver identity.

In the contextual editor use Give business meaning (or Configure event from discovery), exact service `wfs-pwa-browser`, Browser trusted source, log carrier and name `pwa.app.opened`. A screen-specific definition additionally selects the one retained condition `stage.name=search`, for example, with literal Stage `Search entry` and Kind `step`. Preview must include Search and exclude Welcome. For this acceptance fixture activate disjoint per-screen rules; do not overlap an unconditional App opening rule with those rules. A label hint is only an optional draft suggestion, never a dynamic rule over future hint values. One explicit owner mapping wins even when its literal label differs from the emitted hint. Conflicting overlapping rules must be resolved, not ordered implicitly.

Activation is prospective. Default interpretation uses retained capture-time definitions; an explicit Non-persisting preview can inspect a different definition without rewriting history. Do not select an operational goal, native timing, presence timing, paired boundaries or next-event estimates for this opening. No correlation means journey reconstruction and conversion/abandonment interpretation are unavailable; received/unassigned is expected, and an empty journey graph is not an intake failure. INFO body retention is not required for acceptance; service/name/source and the reviewed classification are the evidence.

Inspect a controlled local receiver's wire payload, not secrets or real shared content in diagnostic logs. Invalid config, rate limits and failures intentionally drop records without application errors, so an absent event does not locate the cause. Confirm receiver UI evidence and actual proxy/tunnel receipt separately; a resolved action or HTTP response alone is insufficient. Do not log raw forwarding failures, token values, URLs or request headers to investigate.

Qualification matrix: WFS browser -> Server Action -> Node manual OTLP/HTTP JSON, no compression -> direct local Sentrame is one unrun cell; the deployed container/proxy/tunnel path is another; physical installed-phone behavior is another. The local Sentrame ledger's qualified Next/browser SDK Protobuf samples are supporting receiver context, not passes for any of those WFS cells. Record exact versions, receiver binary/source identity, encoding, compression, durable protected reads and storage restart observations. Do not reuse historical schema-1/2 fixture success or infer the current model from HEAD alone.

Physical-phone qualification must distinguish fresh installed launch from warm resume/lock/unlock, including a long cooking pause. Existing Playwright configuration blocks service workers; default mocked E2E does not qualify actual installed sharing or service-worker delivery. Run a separate disposable worker-enabled fixture for real share handoff and installed-device checks. Record not-run/blocked qualification distinctly from local green tests.
