# Design

## Context and Existing Ownership

Source baseline and scope are in [proposal](proposal.md). [Removal inventory](removal-inventory.md) gives concrete owners; [logging inventory](logging-inventory.md) distinguishes retained diagnostics. This is a source review, not a statement about enabled collection or a running deployment.

Browser entry, navigation, surfaces, loaded content, issue results and exceptions share document-local identity/sequence in `pwa/src/lib/telemetry/opening.ts`. Next Server Actions forward minimized records to process-owned SDK log providers; `native.ts` registers a global tracer/context manager and projects native Next spans before batching. `instrumentation.ts` starts those providers and reports request errors; `instrumentation-client.ts` installs native browser error listeners. All are integration-only except response validation currently coupled through `IssueResultReason`.

API `Program.cs` composes ordinary Serilog console/file/request logging alongside an older operational OTel log/metric path. `Telemetry/WfsTelemetry.cs` separately owns the new private semantic-log provider and native ASP.NET/HTTP trace provider, with `NativePrivacyProcessor` and private retry configuration. `RecipeImportReportService` owns actual persistence, locking and launch compensation; telemetry callbacks only observe those boundaries. `ISearchTelemetry`/`LoggingSearchTelemetry` predate this selected integration and remain useful ordinary diagnostics despite their names.

## Decisions and Tradeoffs

1. Remove integration producers and forwarding, not merely set a flag false. Remove all application-owned OTel registration including the older operational Serilog sink/metric pipeline. Otherwise ambient configuration could retain export and the cleanup would be incomplete. Console/file Serilog sinks and application logger calls stay. Independent `System.Diagnostics.Metrics` search instruments stay; their OTel subscription/export disappears. No new replacement exporter or event bus.
2. Preserve local raw Save-response classification as a business-adjacent validity utility. Move its closed reason type out of `lib/telemetry` into the recipe API owner; retain `issueResult` locally for compatibility and its pre-decoder checks. It currently classifies uncertainty without changing product decoding or rejecting every malformed response. Do not silently strengthen or weaken that behavior during removal. A later simplification can be separately reviewed.
3. Delete semantic observation callbacks, observation-only lifetimes and injected telemetry interfaces while retaining every `SaveChangesAsync`, recipe lock, transaction, compensation, polling and exception boundary that owns product behavior. Remove `CanObserveSave` only because it is an observation gate, not a persistence guard. Preserve useful assertions from mixed telemetry-persistence tests in business suites before deleting dedicated exporters/receivers.
4. In shared UI files, remove observation props/effects/imports surgically. Keep accessibility, successful `showModal()` behavior, visibility/readiness guards needed for real image rendering, stale response guards, submit locks, gestures, zoom, focus, navigation and cooking drafts. Delete state only after proving it has no remaining product consumer. No blanket revert of telemetry commits.
5. Remove all ten direct JS OTel dependencies and six direct .NET OTel/sink dependencies; remove direct `protobufjs` if its only tracked consumers remain the retiring OTLP fixtures. Regenerate npm and both NuGet locks with established dependency workflow, not textual lock editing. Next/AI dependencies may require transitive OTel packages; retain and list those edges, rather than forcing unsupported overrides or claiming zero OTel strings. Keep Serilog console/file packages.
6. Canonical truth must stop promising collection. Apply exact REMOVED deltas for all six owners; keep the new retirement guarantees under `standard-telemetry-export` with an updated Purpose. At synchronization retire the five now-empty capability documents and repair current links; do not leave invalid empty specs. Archived changes, old accepted evidence and frozen JOURNAL stay unchanged. Current `docs/sentrame.md`, telemetry tracker/inventory and opt-in session prompt cease to be active instructions; replace with brief retirement notices linking this change, preserving historical detail through Git/archive references. Do not relabel old evidence as proof of removal.

## First Observable Slice

Retire the browser-to-Node path from fresh navigation through visible recipe detail, Save and an error fallback: real production components/root/identity composition → remaining Next runtime, with business HTTP responses doubled only at the external API boundary. A disposable local sink sees zero integration requests even when obsolete valid-looking env inputs are supplied; the UI still renders, saves and recovers. This covers observer removal, Server Action removal, instrumentation startup and shared consumer preservation. Use no Sentrame instance. Add negative coverage before removal and observe an intended failure on baseline; keep product regression coverage after deleting positive emission tests.

## State, Concurrency and Recovery

No new state or migration. Delete in-memory document identity, sequence, rate caps, event/occurrence suppression and exporter queues with their owners. Do not clear product cookies/storage/member preferences. Existing open documents may still contain old Actions; Next build skew can reject such requests and a reload loads the new bundle. No compatibility relay or disabled producer stub is needed. Existing running processes keep their old providers until separately authorized deployment/recreation; removal on disk does not stop them.

Issue Save continues to distinguish report saved, processing acknowledged, launch failed and unconfirmed response locally. Report-save then optional launch, launch compensation, active-attempt resolution rejection, idempotent absent-report resolution, retained draft on error, import polling and stale result handling must match baseline. No business retry is added to compensate for telemetry removal.

## Persistence and Side Effects

No database schema or domain event change. Issue reports, workflow task/error state, recipe artifacts, backups, voting and meal outcomes are application data, not telemetry retention. No data deletion, credential revocation or receiver mapping change is part of this patch. Removal of SDK shutdown/flush paths must not remove ordinary `Log.CloseAndFlushAsync` or application shutdown behavior.

## Compatibility, Rollout and Reversal

Telemetry dashboards/journeys/errors/native traces stop receiving new WFS evidence only as upgraded processes replace old ones. The older generic OTLP operational destination also loses log/metric export; console and rolling files remain. No deployed endpoint, token validity or retained record changes follow automatically. New Compose templates stop accepting/passing Sentrame keys; private deployed env files remain untouched. `WFS_VERSION` remains release metadata/image selection where independently used.

Rollback is an application/config release decision requiring separate authorization. An old image with old enabled configuration can resume emission. Retained Sentrame data and ordinary log files are unaffected in either direction. This session performs neither rollout nor rollback.

## Operational Diagnosis

Retain request/error/worker/search logs and application status APIs as described in the logging inventory. Loss of minimized central errors and timing/journey views is intentional. Independent search meters no longer have the removed OTel export path. Local logs have broader privacy exposure and local/container retention costs; choosing levels/redaction later is a separate decision, not a dependency of this removal.

## User Experience

No telemetry toggle, consent dialog or profile preference exists in inspected runtime sources, so none is invented or removed. IdentityValidator still gates/redirects entry correctly. Error and not-found boundaries retain their accessible UI/reset/navigation and existing ordinary logging. Surface-specific UI, PDF masking, image loading, cooking position and current stack gesture reliability remain unchanged.

## Risks and Deferrable Questions

- Broad shared UI edits can regress real lifetimes; retain existing business unit/E2E assertions and inspect deleted hooks/state individually.
- Telemetry-named mixed tests may verify persistence and raw validity; migrate assertions before fixture deletion, never delete by filename alone.
- Lockfiles can retain legitimate transitive OTel. Final inventory must identify owning dependency edges and absence of application registration rather than demand a misleading zero-string search.
- Actual remaining log volume, container log driver/rotation, external collectors, deployment env overrides and physical-device behavior are unmeasured. The source inventory records these limits; they do not block writing the removal patch, but cannot be reported as verified operational outcomes.
- The separate active gesture change has unfinished verification tasks. Preserve it and rerun relevant business coverage; this proposal does not complete or modify its tasks.
