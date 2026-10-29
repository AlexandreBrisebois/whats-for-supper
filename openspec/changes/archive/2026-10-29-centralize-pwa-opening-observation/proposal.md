# Proposal

Related issue: [#326 — Revisit opt-in anonymous telemetry to guide platform features](https://github.com/AlexandreBrisebois/whats-for-supper/issues/326).

This change is a bounded first increment toward that exploration. It does not fulfill the issue's broader correlated invitation-to-vote journey, persisted-vote outcome, session-ending analysis or protected public aggregates. Short-lived journey correlation remains deferred; this single opening event needs no correlation. The issue's earlier backend-selection discussion is historical context; this proposal uses the existing Sentrame base integration without claiming qualification of the broader analysis goals.

## Why

WFS has a runtime-opted-in Sentrame transport but only unwired synthetic checks. We need to answer which screen begins a fresh app load without adding telemetry calls to every page, exposing entry-link data, or treating a long cooking pause as another session.

The integration target is the unpublished local Sentrame working tree at `/Users/alex/Code/sentrame`, not its older GitHub guide or published image. Its standard-OTel contract preserves named-log JSON intake but adds contextual mapping, optional label suggestions and separately qualified structural receipt. The source snapshot and compatibility limits are recorded in the design.

## Outcome and Scope

Deliver one browser-evidence event, `pwa.app.opened`, describing the first screen committed while the document is visible after entry gates. A new document or reload permits another opening; navigation, phone unlock and resuming the existing document do not. Welcome is the entry when access redirects there, even if Search was requested.

Centralize page observation and safe screen classification. Record a shared modal/sheet convention in the design so future modal observation does not require feature-level telemetry calls. This increment does not export subsequent page/modal navigation events, migrate existing overlays, introduce anonymous correlation, change routing/authentication, or install automatic click/error/trace collection. Those are separate changes, not unchecked successor tasks here.

## What Changes

- Add a shared, entry-gate-aware opening observer rather than instrumentation in each page or navigation handler.
- Classify screens through a closed registry; new unclassified pages are automatically observed as `other` until explicitly assigned a safe name.
- Emit at most one best-effort opening attempt per document, with only a retained `stage.name` record attribute and a fixed resource envelope including the deployment-owned app `service.version`.
- Extend the synthetic-check-only browser forwarding boundary with one strict opening operation, preserving runtime opt-in and browser/server producer separation.
- Specify a reusable modal convention with explicit static screen identity for future adoption, without collecting modal activity in this increment.
- Document acceptance and qualification limits, including real Sentrame receipt and installed-phone lifecycle checks.
- Keep standard OTLP/HTTP JSON named-log export to `/v1/logs`; do not introduce a proprietary envelope or require a new SDK/provider for this event.
- Treat the bounded `stage.name` entry classification as a Sentrame application hint/condition, not an official OTel convention or automatic Stage/Kind/goal rule. Configure exact service, browser source, log carrier, name and screen condition prospectively.
- Qualify the actual WFS JSON path through the new local receiver's durable protected reads using fresh isolated storage. Other SDK samples and protocol cells do not qualify WFS.

## Capabilities

### New Capabilities

- `anonymous-pwa-telemetry`: Own deployment-opted-in, data-minimized browser opening evidence and its transport/interpretation boundaries.

### Modified Capabilities

None. Existing household access, member context, installation, share transport, capture and navigation requirements remain unchanged.

## Impact

- Current integration owners: `pwa/src/lib/telemetry/server.ts`, `actions.ts`, their tests and `docs/sentrame.md`.
- Proposed observation owners: shared root composition in `pwa/src/app/layout.tsx`, gate readiness in `pwa/src/components/identity/IdentityValidator.tsx`, and a small client coordinator/classifier under `pwa/src/lib/telemetry` with a shared observer component.
- Modal design reference: `pwa/src/components/common/Modal.tsx`; current Quick Find, recipe sheets, family-nudge and Demo dialogs are independently implemented and will not be migrated here.
- Keep deployment configuration in the existing private Compose env files. No new credentials, public environment credentials, dependency, public API operation, generated client, database schema, or Sentrame receiver modification is proposed.
- Existing [household identity](../../../specs/household-identity/spec.md), [member context](../../../specs/member-context/spec.md) and [app installation](../../../specs/app-installation/spec.md) own entry behavior. This change observes it rather than redefining it.

No consequential product decision remains open for this increment. Real receiver projection, proxy/tunnel delivery and physical-device lifecycle behavior require qualification; source review does not establish them.
