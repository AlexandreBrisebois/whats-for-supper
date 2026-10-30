# Design

## Context and Existing Ownership

Scope is in the [proposal](proposal.md); observable behavior is in the [delta](specs/anonymous-navigation-observation/spec.md). This successor depends on the opening change's implemented gate-aware observer, safe classifier and tested forwarding seam. It reuses that implemented prerequisite and explicitly revises its opening payload through the [opening delta](specs/anonymous-pwa-telemetry/spec.md). Main specs and archived evidence are not rewritten by this planning revision.

Source baseline: WFS `f6100d13c3a23a4c5be0ca863f2a8017d7ae306d`, Next 16.4.2, React 19.3.1, transitive OTel API 1.9.1. PWA has no registered OTel provider/exporter. `pwa/src/lib/telemetry/server.ts` manually emits fixed standard JSON logs. `opening.ts` currently owns a WeakMap document claim and fallback/classifier state; `OpeningObserver.tsx` observes pathname and visibility. There is no implemented correlation-context module. `actions.ts` currently accepts only `{ screen }` and schedules `after()`; the exporter currently assigns export time and only `stage.name`. `components/identity/IdentityValidator.tsx` owns route gating; shared root layout covers public and protected entry. Planner uses `plannerStore.activeTab` on phones and embeds Grocery beside the plan when wide. Quick Find is bespoke; `common/Modal.tsx` alone cannot cover existing overlays.

The [program source record](../../../docs/telemetry/README.md#navigation-revision-source-record) identifies local Sentrame and the current support limits. Its fixed projection retains the proposed context keys; arbitrary renamed attributes would be omitted. No exporter or phone runtime is qualified by this design.

## Decisions and Tradeoffs

### Shared observation and small transport

Extend the observer from the opening change. The existing `usePathname` observer provides the insertion point; gate readiness remains WFS-specific. Extend its document-owned coordinator rather than adding an independent opening or Server Action context generator. It must stay inert for collection until the server-derived enabled decision is available. Pre-decision events are discarded, not buffered for later collection.

Do not export navigation attempts in this increment. `onRouterTransitionStart` is available in installed Next but proves a dispatched attempt, not presentation, cancellation, redirect completion or intent. No experimental router metadata is needed. Add it in a later change only for an unresolved attempt-versus-presentation question.

Reuse manual JSON for this small closed vocabulary. A browser SDK plus generic OTLP forwarder adds decoding, attribute minimization, lifecycle and retry behavior that this baseline does not need. The API already has Serilog/OTel; do not install another provider there. Re-evaluate one standard JS log SDK/processor/exporter at the first sustained semantic stream; current API 1.9.1 is not the local receiver sample's API 1.10.0 / SDK 3.0.0 / exporter 0.300.0 family. No package compatibility or runtime pass is inferred from the sample.

### Static presentation identity

Reuse opening route labels; add `planner.grocery` for the primary phone view. Wide layout remains primary `planner` plus companion `planner.grocery` surface. A shared surface lifecycle helper takes a closed static identity and presented state. Pilot `quick.find` in QuickFindModal and `planner.grocery` at the embedded pane. Do not change dialog DOM, gestures, focus, animation, drafts or selection handlers. Reuse the helper from common Modal when it gains a real consumer; do not create an unused wrapper or migrate every overlay now.

Screen observations deduplicate consecutive identical presented states, not all occurrences of a label. Surface observations follow each actual presentation cycle; defer effect cleanup claims until real closure is distinguished from effect replay. Hidden transitions are not replayed; on visibility reconcile current state. Closure is only an observed lifecycle transition, not a cancellation/outcome label. No close is promised on document termination.

Coverage uses a test-maintained route inventory from `app/**/page.tsx`, exact static classification or explicit `other`, and a small list of known bespoke dialog/sheet owners with named exceptions. Reuse existing tests and source declarations. Do not build an AST/DOM analytics framework. Static searches for `role="dialog"` are advisory and must disclose dynamic-overlay blind spots. Unknown routes still export `other` at runtime. Existing exceptional overlays remain visible as coverage debt until selected.

### Closed envelope and ordering

| Record | Trigger | Allowed record fields | Interpretation |
| --- | --- | --- | --- |
| `pwa.app.opened` | First eligible visible shell, once per document | `stage.name`, `session.id`, `tab.id`, `event.id`, integer `source.sequence` | Entry observation, not a completion goal |
| `pwa.screen.presented` | Eligible visible primary-shell transition | `stage.name`, `session.id`, `tab.id`, `event.id`, integer `source.sequence` | Presented shell, not full readiness or intent |
| `pwa.surface.opened` | Adopted surface becomes presented | Same fields, surface identity in `stage.name` | Open presentation, no business outcome |
| `pwa.surface.closed` | Previously observed surface actually closes | Same fields | Closure only; missing closure remains unknown |

INFO 9, service `wfs-pwa-browser`, scope `wfs.anonymous`, fixed body `WFS opening observed` for opening and `WFS presentation observed` for screen/surface records, standard `/v1/logs`, JSON/no compression. Put timestamps in standard `timeUnixNano` (browser observation) and `observedTimeUnixNano` (server forwarding), not arbitrary attributes. Strict input accepts only the event enum, static identity enum, UUID context, positive safe-integer sequence and positive safe-integer browser timestamp in Unix milliseconds; max serialized input 2 KiB. Reject unknown own fields, arrays, invalid UUIDs/integers and malformed values without echo. Do not forward arbitrary OTLP.

Generate random UUID session and a separate random UUID tab once after the server-derived enabled decision, and a new UUID per observation; no storage, person/device identity, previous-scope link, route value or auth material. Consume sequence before attempted delivery so local loss can leave gaps. Validate against server forwarding observation: reject timestamps older than 24 hours or more than five minutes ahead rather than fabricate chronology (the receiver rejects more than five minutes ahead; the former symmetric 24-hour plan was incompatible); document that invalid clocks can lose evidence. Convert milliseconds to decimal nanosecond strings without unsafe floating-point multiplication. Capture server forwarding observation on the accepted Action call before `after()`, retaining it through delayed export; receiver receipt remains a third clock. In-memory contexts are destroyed with the document. No inactivity timer or visibility event creates another opening. Receiver detail expiry is independent of scope lifetime.

One browser producer's sequence describes observation order. Across future server evidence and multiple clocks, Sentrame can fall back to event/receipt ordering: this does not prove causality. UUIDs and sequence are correlation fields, never metric dimensions. Forwarding preserves browser authority; server commitment requires a later API owner.

## First Observable Slice

F2-1: fresh enabled Home -> Search -> Home, actual shared observer -> actual Server Action -> Node serializer/export -> disposable capture receiver and disposable current Sentrame. Assert opening followed by initial Home, Search and Home shares scope/tab, has distinct IDs and increasing sequence. Activate a synthetic reaching-Search presentation goal before emitting the derivation fixture; opening must be its first step. A capture-only HTTP receiver is insufficient for this slice's required durable receipt and configured-derivation cells. Use a receiver double for wire/failure capture and business API mocks for synthetic application state; the durable receipt/derivation cell must use actual disposable Sentrame, never a mocked Action/exporter/receiver. Add disabled/malformed/timeout acceptance in this same slice, not after shipping it. Stop before Planner panes, overlays and business outcomes.

## State, Concurrency and Recovery

F2-2 adds Planner phone/wide state. F2-3 adds the surface helper/Quick Find pilot and coverage checks. Keep only current primary identity, active adopted surfaces, UUID context, sequence and document rate window; no journey graph or workflow state in the client. Config remains authoritative server-side on every export. Multiple tabs are independent; no cross-tab joining. Unlock without changed presentation emits nothing; missing document closures stay missing.

No delivery retry, durable queue, acknowledgement-dependent UI, all-click capture, presence heartbeat or semantic sampling. Admit at most 60 navigation records per document per minute across screens/surfaces. Reuse 120 records/minute per producer per Node process, four active requests and two-second timeout; saturation drops immediately. Caps multiply across Node processes and do not form a deployment-wide rate limiter.

Volume model before errors/business events: `1 opening + R screen presentations + 2M surface cycles`. Home/Search/Home is four records; five surface cycles add ten. A two-hour cooking pause adds zero. Repeated votes add no baseline records while the same presentation remains. Four tabs with ten screens and two complete surface cycles each produce at most 60 records including openings. These are estimates, not measured household traffic or a receiver capacity claim.

## Compatibility, Rollout and Reversal

Ship off by default, preserve private env names and separate tokens. Enabling/recreating containers or touching a deployed receiver needs separately selected qualification scope. No business API/OpenAPI/client changes. Replace the former uncorrelated opening serializer and closed Action input deliberately; retain its fixed event name/body, screen classification, eligibility and attempt/failure semantics. Update stale exact-payload tests only to the revised contract, preserving their privacy and behavior assertions. Reject old stage-only Action input against the revised closed schema rather than accepting arbitrary mixed payloads; old browser documents can lose observations until reload. Do not backfill old receiver records. F3 later reserves transport capacity for errors without raising the existing total ceiling.

## Operational Diagnosis

Use fresh compatible local receiver storage, exact source/build identity, browser credential and protected reads/reopen. Verify all retained fields and omissions. Baseline names/context alone do not activate mappings, create a goal, supply durations or reconstruct a complete funnel. Configure real journey goals later; never add a fake end or heartbeat for the graph. Manual drops are not automatically represented by OTel SDK drop fields or Sentrame health counters. Fixture-local admission results can verify suppression; production loss remains partly unknown. Graph aggregation can combine edges no single path followed; later analysis must inspect ordered evidence and disclose missing beginnings/endings, opt-in bias and rare paths.

## Initial ordering and interpretation recipe

The coordinator claims opening synchronously at the first eligible visible presentation, allocates opening sequence 1 then initial-screen sequence 2, and only then admits adopted surfaces. UUID/session/tab allocation never occurs independently in Server Actions. Allocate sequence/event identity before local admission and delivery; a rejected or dropped attempt can leave a gap. No retry or acknowledgement is needed to advance. Concurrent deferred exports may arrive out of order; sequence describes observation order, not delivery or cross-service causality. Opening and initial screen may share an observation timestamp. They answer entry and presentation questions within one scope, not two visits.

Initially disabled documents retain the existing disabled boundary, with no scope generation or buffered replay. A hidden document waits for the current eligible visible screen. Rerenders/remounts/effect replay preserve the opening claim, last primary screen and active surfaces. Warm resume without changed presentation does not emit. Use a shared document-owned module next to `opening.ts` if needed; no separate provider or client workflow graph is required.

The concrete [mapping recipe](../../../docs/sentrame.md#planned-navigation-mapping-recipe) selects browser / log / `wfs-pwa-browser` for all four names. App opened is an unconditional step with timing unavailable. Screens use disjoint `stage.name` conditions for Home/Search/etc. Surfaces require reviewed presentation/supporting meanings, never automatic exit. Conditions are optional filters. Stage hints do not supply context, activate mappings or measure time. A stage-start Kind adds a duration boundary, not a generic start switch. Ordinary logs need no invented trace/span IDs; `pwa.telemetry.check` stays diagnostic.

## Receiver requirements and future semantic owners

Current local `internal/app/query.go:validateDefinition` rejects nonempty mappings without a goal. `journey.go:Derive` starts at the first mapped occurrence, orders a single source/service by unique positive sequence, and segments on goal or 30-minute mapped inactivity. `intake.go` retains the exact session/tab/event/sequence fields and both times. `store.go` compares retained content for replay identity; replay the exact captured wire body, including original observed time, rather than regenerating a forwarding timestamp. This is a fixture-only replay, not a new application retry path.

**Sentrame-agent requirement:** support explicit open-ended definition activation and inspection without a completion goal. Review validation, owner controls, derivation/status and any goal-dependent summaries together; preserve prospective immutable captured definitions and unknown-outcome inactivity. App opened as goal would complete immediately and is not an acceptable workaround. This is separate receiver work and does not block WFS emission/receipt tests or the disposable meaningful presentation-goal test. It does block claiming production open-ended configuration is ready today.

Scope lifetime differs from capture lifetime: later mapped records after goal/inactivity may begin another receiver journey without another opening. Loss or sequence gaps are incomplete evidence. Navigation supplies no dwell/attention; paired page/surface duration additionally needs reviewed start/end semantics and shared `stage.occurrence.id`. Cross-document and cross-service continuity need separate decisions.

Smallest future semantic gaps, deferred from F2: saved votes at `DiscoveryService.SubmitVoteAsync`'s commit before publication; assignment at the actual `ScheduleService` assignment commit; completed planned cooking at `ScheduleService.ValidateDayAsync`'s durable outcome. `CooksMode` presentation alone does not prove either viewed-recipe completion or a completed planned meal. Shopping completion has no persisted trip-completed command today; agree that meaning before adding an emitter. These are inventory source pointers, not a newly traced/approved event catalogue. No business instrumentation is added here.

## Revision source and qualification evidence

2026-10-29 source inspection: WFS HEAD above, clean before this planning edit; installed Next 16.4.2, React 19.3.1, OTel API 1.9.1. Local Sentrame HEAD `873bff1ddc83cb7b5c24056b09c8a7de14565572`, schema 3 / `structural-v2` / `journey-native-v3`; dirty in CONTRACT, USER-GUIDE, query and workspace/trace/graph/UI files, with untracked mapping-preview and standalone-log support. HEAD alone does not identify that tree. Exact inspected document/source hashes are in the [tracker](../../../docs/telemetry/README.md#navigation-revision-source-record). No Sentrame code, config or storage was changed.

User-supplied deployed evidence: `pwa.app.opened` and `pwa.telemetry.check` were retained as browser/logs but unassigned without session/tab. Empty graphs were not failed ingestion; no trace IDs means no Traces entries. This is reported receipt evidence, not newly executed qualification of the revised envelope. All revised runtime cells remain not-run. Preserve historical F1 failed/passed records and unchecked tasks; no source review or documentation gate promotes them.
