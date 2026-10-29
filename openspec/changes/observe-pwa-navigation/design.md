# Design

## Context and Existing Ownership

Scope is in the [proposal](proposal.md); observable behavior is in the [delta](specs/anonymous-navigation-observation/spec.md). This successor depends on the opening change's implemented gate-aware observer, safe classifier and tested forwarding seam. It does not implement that prerequisite or alter its payload.

Source baseline: WFS `e4f61229d5bb765c286e1db9ceec28dd2f95e11c`, Next 16.4.2, React 19.3.1, transitive OTel API 1.9.1. PWA has no registered OTel provider/exporter. `pwa/src/lib/telemetry/server.ts` manually emits fixed standard JSON logs. `IdentityValidator.tsx` owns route gating; shared root layout covers public and protected entry. Planner uses `plannerStore.activeTab` on phones and embeds Grocery beside the plan when wide. Quick Find is bespoke; `common/Modal.tsx` alone cannot cover existing overlays.

The [program source record](../../../docs/telemetry/README.md#source-and-qualification-record) identifies local Sentrame and the current support limits. Its fixed projection retains the proposed context keys; arbitrary renamed attributes would be omitted. No exporter or phone runtime is qualified by this design.

## Decisions and Tradeoffs

### Shared observation and small transport

Extend the observer from the opening change. [Next's route observation pattern](https://nextjs.org/docs/app/api-reference/functions/use-router#router-events) supports committed route-shell observation using `usePathname`; gate readiness remains WFS-specific. The [client instrumentation entrypoint](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client) initializes document-local coordination when needed. It must stay inert for collection until the server-derived enabled decision is available. Pre-decision events are discarded, not buffered for later collection.

Do not export navigation attempts in this increment. `onRouterTransitionStart` is available in installed Next but proves a dispatched attempt, not presentation, cancellation, redirect completion or intent. No experimental router metadata is needed. Add it in a later change only for an unresolved attempt-versus-presentation question.

Reuse manual JSON for this small closed vocabulary. A browser SDK plus generic OTLP forwarder adds decoding, attribute minimization, lifecycle and retry behavior that this baseline does not need. The API already has Serilog/OTel; do not install another provider there. Re-evaluate one standard JS log SDK/processor/exporter at the first sustained semantic stream; current API 1.9.1 is not the local receiver sample's API 1.10.0 / SDK 3.0.0 / exporter 0.300.0 family. No package compatibility or runtime pass is inferred from the sample.

### Static presentation identity

Reuse opening route labels; add `planner.grocery` for the primary phone view. Wide layout remains primary `planner` plus companion `planner.grocery` surface. A shared surface lifecycle helper takes a closed static identity and presented state. Pilot `quick.find` in QuickFindModal and `planner.grocery` at the embedded pane. Do not change dialog DOM, gestures, focus, animation, drafts or selection handlers. Reuse the helper from common Modal when it gains a real consumer; do not create an unused wrapper or migrate every overlay now.

Screen observations deduplicate consecutive identical presented states, not all occurrences of a label. Surface observations follow each actual presentation cycle; defer effect cleanup claims until real closure is distinguished from effect replay. Hidden transitions are not replayed; on visibility reconcile current state. Closure is only an observed lifecycle transition, not a cancellation/outcome label. No close is promised on document termination.

Coverage uses a test-maintained route inventory from `app/**/page.tsx`, exact static classification or explicit `other`, and a small list of known bespoke dialog/sheet owners with named exceptions. Reuse existing tests and source declarations. Do not build an AST/DOM analytics framework. Static searches for `role="dialog"` are advisory and must disclose dynamic-overlay blind spots. Unknown routes still export `other` at runtime. Existing exceptional overlays remain visible as coverage debt until selected.

### Closed envelope and ordering

| Record | Trigger | Allowed record fields | Interpretation |
| --- | --- | --- | --- |
| `pwa.screen.presented` | Eligible visible primary-shell transition | `stage.name`, `session.id`, `tab.id`, `event.id`, integer `source.sequence` | Presented shell, not full readiness or intent |
| `pwa.surface.opened` | Adopted surface becomes presented | Same fields, surface identity in `stage.name` | Open presentation, no business outcome |
| `pwa.surface.closed` | Previously observed surface actually closes | Same fields | Closure only; missing closure remains unknown |

INFO 9, service `wfs-pwa-browser`, scope `wfs.anonymous`, fixed body `WFS presentation observed`, standard `/v1/logs`, JSON/no compression. Put timestamps in standard `timeUnixNano` (browser observation) and `observedTimeUnixNano` (server forwarding), not arbitrary attributes. Strict input accepts only the event enum, static identity enum, UUID context, positive safe-integer sequence and finite integer browser timestamp; max serialized input 2 KiB. Reject unknown own fields, arrays, invalid UUIDs/integers and malformed values without echo. Do not forward arbitrary OTLP.

Use random UUID session/tab per enabled document and UUID per observation; no storage, person/device identity, previous-scope link, route value or auth material. Consume sequence before attempted delivery so local loss can leave gaps. Reject client timestamps more than 24 hours from server time rather than fabricate chronology; document that invalid clocks can lose evidence. In-memory contexts are destroyed with the document. No inactivity timer or visibility event creates another opening. Receiver detail expiry is independent of scope lifetime.

One browser producer's sequence describes observation order. Across future server evidence and multiple clocks, Sentrame can fall back to event/receipt ordering: this does not prove causality. UUIDs and sequence are correlation fields, never metric dimensions. Forwarding preserves browser authority; server commitment requires a later API owner.

## First Observable Slice

F2-1: fresh enabled Home -> Search -> Home, actual shared observer -> actual Server Action -> existing Node serializer/export -> disposable HTTP receiver. Assert initial and two subsequent screen records share scope/tab, have distinct IDs/increasing sequence, and the opening contract is unchanged. Double only Sentrame and external business API fixtures, not the action. Add disabled/malformed/timeout acceptance in this same slice, not after shipping it. Stop before Planner panes, overlays and business outcomes.

## State, Concurrency and Recovery

F2-2 adds Planner phone/wide state. F2-3 adds the surface helper/Quick Find pilot and coverage checks. Keep only current primary identity, active adopted surfaces, UUID context, sequence and document rate window; no journey graph or workflow state in the client. Config remains authoritative server-side on every export. Multiple tabs are independent; no cross-tab joining. Unlock without changed presentation emits nothing; missing document closures stay missing.

No delivery retry, durable queue, acknowledgement-dependent UI, all-click capture, presence heartbeat or semantic sampling. Admit at most 60 navigation records per document per minute across screens/surfaces. Reuse 120 records/minute per producer per Node process, four active requests and two-second timeout; saturation drops immediately. Caps multiply across Node processes and do not form a deployment-wide rate limiter.

Volume model before errors/business events: `1 opening + R screen presentations + 2M surface cycles`. Home/Search/Home is four records; five surface cycles add ten. A two-hour cooking pause adds zero. Repeated votes add no baseline records while the same presentation remains. Four tabs with ten screens and two complete surface cycles each produce at most 60 records including openings. These are estimates, not measured household traffic or a receiver capacity claim.

## Compatibility, Rollout and Reversal

Ship off by default, preserve private env names and separate tokens. Enabling/recreating containers or touching a deployed receiver needs separately selected qualification scope. No business API/OpenAPI/client changes. Preserve the uncorrelated opening serializer exactly; it has no session/tab/event/sequence or browser timestamp. F3 later reserves transport capacity for errors without raising the existing total ceiling.

## Operational Diagnosis

Use fresh compatible local receiver storage, exact source/build identity, browser credential and protected reads/reopen. Verify all retained fields and omissions. Baseline names/context alone do not activate mappings, create a goal, supply durations or reconstruct a complete funnel. Configure real journey goals later; never add a fake end or heartbeat for the graph. Manual drops are not automatically represented by OTel SDK drop fields or Sentrame health counters. Fixture-local admission results can verify suppression; production loss remains partly unknown. Graph aggregation can combine edges no single path followed; later analysis must inspect ordered evidence and disclose missing beginnings/endings, opt-in bias and rare paths.
