# Proposal

## Why

WFS currently hand-builds OTLP JSON and HTTP delivery in `pwa/src/lib/telemetry/server.ts` while Next.js native request/render/fetch tracing has no registered exporter. Use maintained OpenTelemetry providers/exporters and existing framework instrumentation to reduce custom transport maintenance, retaining the small WFS policies that establish privacy, producer authority and honest business meaning. The inventory also identifies unobserved recipe detail/original views and bespoke dialogs/flyouts that need minimal explicit presentation declarations.

## Outcome and Scope

With explicit deployment opt-in, the existing opening/navigation/error observations, minimized native technical traces and a narrow recipe-issue pilot reach disposable Sentrame through standard OTLP/HTTP exporters. Existing browser observation semantics remain intact. Success requires actual exporter-to-receiver protected reads/reopen, including privacy, outage and duplicate-delivery checks; installing packages or HTTP success is insufficient.

This is one staged migration with a working end-to-end acceptance boundary in each increment: migrate existing browser logs first; add native Next.js traces; reuse API instrumentation and qualify a restricted server export; adopt the inventoried presentation surfaces in small groups; add only issue-save response and two persisted issue facts. Do not add other inventory business-outcome emitters, repair product behavior, introduce a generic event/workflow framework, add a Collector, or change Sentrame. No collection is enabled in a real household/deployment by applying code. Deployed/device qualification remains separately reported.

Decision confirmed by the user on 2026-10-30: permit **bounded in-memory SDK batching and standard transient retries**, replacing the existing no-queue/no-retry transport contract. No disk/offline queue, business-request retry, persistent telemetry identity or delivery-dependent UI. Preserve document-local browser scope and leave asynchronous restart/cross-document correlation unresolved and excluded.

## What Changes

- Replace handwritten PWA OTLP serialization/HTTP delivery with a compatible standard Node log provider/exporter. Preserve the closed Server Action boundary, browser authority, timestamp meanings, safe payloads, observers and error ownership.
- **BREAKING telemetry delivery contract:** move the selected PWA export from JSON/no-compression/immediate-no-retry to HTTP Protobuf/no-compression with explicitly bounded SDK batching/transient retries. User-selected option B limits caller/processor waiting and socket inactivity to two seconds; active requests can outlive that wait. No total network deadline or custom cancellation layer is promised. Existing retained records and semantic names remain compatible; qualification evidence is versioned rather than relabeled.
- User-selected shutdown option A retains Next standalone deployment and best-effort delivery: pending queued telemetry may be lost during normal SIGTERM/SIGINT cleanup as well as crashes. A guaranteed shutdown flush, custom server host and custom cancellation are outside the approved behavior. This is separate from timeout option B.
- Register one Node trace provider through Next's native lifecycle; export sanitized native request/render/server-fetch spans. Reuse existing ASP.NET Core/HttpClient instrumentation and tracer provider for the API; do not install a parallel auto-instrumentation agent.
- Suppress telemetry's own requests/errors and remove private data before the export queue, including sensitive span names, exception events, resources and remote context. No automatic browser click/DOM capture, replay, host/device identity or browser/server journey joining.
- Retain small explicit presentation observers. Adopt inventoried detail/original, planning/recovery, recipe quality/bin/filter, capture, invitation/demo and member-menu surfaces plus recipe action flyouts through shared static declarations. Add bounded loaded-detail/original-image presentation and external-original-request observations; never infer reading from opening a link. Add `pwa.recipe_issue.save_result` at the current mounted detail response owner. Add trusted `wfs.recipe_issue.saved` and `wfs.recipe_issue.resolved` facts at actual API persistence boundaries, with no business IDs or background reimport-success claims.
- Remove the superseded hand-built export path once parity passes; reuse maintained SDK lifecycle, bounded batching/retry and the already installed .NET OpenTelemetry exporter instead of recreating those mechanisms.

## Capabilities

### New Capabilities

- `standard-telemetry-export`: default-off, privacy-minimized, credential-separated standard export with bounded memory/lifecycle behavior and migration compatibility.
- `native-technical-observation`: technical spans from existing Next.js and ASP.NET/HTTP instrumentation with bounded process-local trace meaning and safe export projection.
- `recipe-issue-observation`: one foreground Save-result observation and separately trusted persisted issue-save/removal facts.

### Modified Capabilities

- `anonymous-pwa-telemetry`: retain opening behavior/envelope but delegate transport/queue/retry/wire qualification to standard export.
- `anonymous-navigation-observation`: retain document and presentation semantics; adopt inventoried surfaces/flyouts and distinguish loaded detail, rendered originals and external launch requests; update inherited delivery contract and the former blanket SDK-migration exclusion.
- `anonymous-error-observation`: retain minimized error ownership/envelope; update wire, bounded delivery and flush expectations without duplicating native exception reports.

## Impact

PWA insertion points: `pwa/src/instrumentation.ts`, `pwa/src/lib/telemetry/server.ts`, existing Actions/validators/observers/errors, static surface declarations in inventory-named components, package manifest/lock and focused tests/receiver fixtures. API insertion points: `api/src/RecipeApi/Program.cs`, existing OpenTelemetry/Serilog configuration and `RecipeImportReportService.PersistAsync/DeleteAsync`; a small typed issue observer isolates safe telemetry from ambient diagnostic logging. Deployment env forwarding gains API server-only telemetry settings; never forward its browser token. Integration docs and tracker record the new versioned qualification.

No business OpenAPI/request/response, generated client, persistence schema, authentication/cookie, preferences or cooking UI changes. Existing issue-report API operations/mocks are exercised without contract expansion. The [completed inventory](../../../../docs/telemetry/journey-inventory.md) and [current integration evidence](../../../../docs/sentrame.md) remain prerequisites/evidence, not a runtime pass for this migration. Design owns exact package compatibility, export bounds, source references and acceptance slices.
