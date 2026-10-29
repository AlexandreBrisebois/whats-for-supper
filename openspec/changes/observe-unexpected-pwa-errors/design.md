# Design

## Context and Existing Ownership

The [proposal](proposal.md) bounds this increment and the [delta](specs/anonymous-error-observation/spec.md) owns the contract. Reuse the opening transport and, after F2, its optional browser context. Read the [program source record](../../../docs/telemetry/README.md#source-and-qualification-record) before implementation.

`pwa/src/app/error.tsx` currently logs to console and renders retry UI. There is no global-error, client instrumentation or server instrumentation file. Next 16.4.2's installed type definitions expose `onRequestError` and client initialization; React is 19.3.1. The .NET Program already registers Serilog/OTel, but changing that pipeline is outside this Next/PWA slice. Existing ordinary logs can contain private content and must not be broadly redirected to Sentrame.

## Decisions and Tradeoffs

### Central mechanisms and their limits

| Mechanism | Reporting owner | Misses / limits |
| --- | --- | --- |
| Synchronous lightweight `instrumentation-client.ts` registration | `window.error` and `unhandledrejection` adapter | Startup before initialization, caught failures, blocked script detail and some cross-origin rejections |
| `error.tsx` / `global-error.tsx` | Client render occurrence adapter | Handled event/async failures; failures before boundary can render; root replacement must work without provider context |
| Node `instrumentation.ts` / `onRequestError` | Next-captured server error adapter | .NET failures, caught business errors and work Next does not observe |
| Future journey owner | Explicit handled failure/recovery observations | Not implemented by this change |

[Next client initialization](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client), [server error hook](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation), [error boundaries](https://nextjs.org/docs/app/api-reference/file-conventions/error) and [React boundary limits](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary) support these placements. Verify installed bundled docs before code. Keep current `reset` behavior; do not change to another retry API as part of telemetry. No console monkey patch, process-wide fatal-handler replacement, automatic fetch instrumentation or generic error SDK is needed for the closed categories.

Initialize collection only after a server-derived enabled decision; errors before that decision are lost, not retained for later opt-in. A minimal app-origin runtime-config read may supply only that boolean to the root-replacement case if normal composition is unavailable; it is not a public OTLP relay and carries no endpoint/token. Prefer reusing the existing root-config handoff. If a new internal read is needed, keep it within Next and test same-origin/off behavior; no business OpenAPI operation changes.

### Ownership and overlap

Generate fresh random event and exception-occurrence UUIDs; never derive them from private error content. A client occurrence adapter associates the same error object across boundary/global callbacks during the same reporting episode. Boundary effect replay shares that episode; recovery/reset retires it. A later throw/retry is a new occurrence. Bound fallback suppression for non-object values by one dispatch episode; do not retain strings or treat equal text/category as identity. When exact overlap cannot be established, report count uncertainty rather than claim universal deduplication.

The Next hook owns server errors. Browser boundaries recognize framework server-error markers locally and skip exception export; do not export or hash the digest. A fallback's presentation can still be observed separately by F2. Server hook reports once per observed request occurrence, not globally per error object; the same reused Error in two requests is not a duplicate. Browser native hooks can lack that server marker, so exact cross-producer deduplication is not promised. Keep sources separate in analysis.

### Safe envelope

Standard OTLP/HTTP JSON/no compression to `/v1/logs`, ERROR 17, scope `wfs.anonymous`; browser service `wfs-pwa-browser` with browser token, Next service `wfs-pwa-server` with server token. Fixed body `WFS unexpected error observed`. `reason` is the closed boundary category from the delta. Add `event.id`, `exception.occurrence.id`, and only already available approved browser `stage.name`, `session.id`, `tab.id`, `source.sequence`. No arbitrary `exception.type`, raw message/stack, digest, URL, request data, console arguments, stack fingerprint or content hash.

Browser timestamps follow F2's validation and clock limits. Server timestamps are generated locally. Standalone reports have no invented journey IDs. The exact-shape browser action fixes the event name/category domain/service/token/body; input is capped at 2 KiB. Server hook maps Next's routeType to the closed enum without serializing routePath/request/error. No arbitrary `reason` input or bypass of runtime disablement.

### Volume, priority and loss

Keep the producer total at 120 records/minute/process. When errors are added, reserve 20 for error records and cap ordinary opening/navigation/synthetic sends at 100; browser and server producers remain independent. Browser also caps error attempts at 10/minute/document. A small admission function at the existing transport owns the partition; do not create parallel exporters, unbounded suppression maps or queues. Error quota cannot evict an already active request; retain the global four-active/two-second limits and disclose possible drops under concurrency saturation.

A 10,000-error browser storm therefore admits at most ten browser error submissions/minute, with process export capped at twenty across tabs. Four storming tabs attempt at most forty browser errors/minute, of which at most twenty can export per process. N processes can export up to `20N` error records/minute per producer, and `120N` total. This is not a cluster/global quota or denial-of-service guarantee. Normal visits add zero errors; a failure followed by a distinct failed retry adds two admitted error occurrences, not an automatic retry summary or recovery claim.

No sampling, transport retries, batching or durable queue is introduced here. At this size, reusing the bounded exporter is simpler. Future SDK migration must use standard bounded processors and preserve both authority pipelines. Trace sampling would not sample this log stream; step sampling would break paths; head sampling cannot recover discarded pre-error evidence. No Collector/tail sampler is proposed.

Contain every telemetry promise rejection and mark the reporting path as excluded from its own observation. Fixed adapter failures are dropped, not logged back to the same stream. Test recursion with unavailable intake and malformed submissions. Fixture-local bounded admitted/suppressed counts can explain test behavior; no production diagnostic route or new receiver counter is added. Receiver SDK drop fields, projection omissions and read truncation describe their supported losses only; exporter drops remain incompletely observable.

## First Observable Slice

F3-1: controlled browser script error in an isolated enabled WFS page -> real handler -> real action -> Node JSON -> disposable capture receiver. Assert exactly one minimized browser ERROR and unchanged subsequent navigation. Include disabled, private sentinel, overlap and receiver-outage cases in the same slice. Stop before root/server hook integration.

F3-2 adds boundary/root/server cases through the same transport and existing quota owner, including real Next Route Handler/Server Action failures only in a disposable fixture, never diagnostic production routes. F3-3 qualifies both producers in real Sentrame protected diagnostics and storage reopen. Business errors/recovery and API propagation remain separate journey changes.

## Compatibility, Rollout and Reversal

No existing exception is swallowed, rethrown differently or used to change retry/UI behavior. Preserve root HTML/body and localized accessible error navigation when adding global-error. Keep default-off private env configuration and check it on every export; enabling an isolated test fixture is distinct from enabling a deployment. No .NET logger bridge or installed-phone qualification is implied by Next-only receipt.

## Operational Diagnosis

Review payload sentinels before real receiver testing. The local Sentrame projection retains reason/occurrence/severity and supports standalone diagnostic discovery. Its recovery highlight currently means diagnostic evidence in a completed capture; it does not prove recovery of the same failed operation. Do not select errors as goals. Document missed early/caught/cross-origin cases and overlapping-source uncertainty alongside exact tested versions, wire encoding, protected reads, restart and per-environment statuses.
