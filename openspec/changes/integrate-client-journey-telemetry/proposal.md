# Proposal

## Why

[Issue #326](https://github.com/AlexandreBrisebois/whats-for-supper/issues/326) asks which paths people actually follow, including detours, loops and the last observed action. WFS currently retires all dedicated telemetry; Sentrame now supports goal-free client navigation, allowing a smaller starting point than feature-specific business events.

## Outcome and Scope

Plan an installation-opt-in, client-only path from centralized navigation/error capture through ordinary OpenTelemetry logs and a same-origin OTLP forwarder to protected Sentrame journey evidence. A synthetic Home → Search → Home → browser error → Planner sequence must remain ordered, preserve both Home occurrences and show continuation without a configured goal or custom business event.

This request authorizes planning only. Future implementation, production enablement, deployment, owner registration, receiver changes, retained-data operations and public reporting require their own scope. No API/server workflow telemetry, click replay, generic DOM tracking, request instrumentation, feature hooks or business outcomes are included. “Last observed action” in this increment means the last retained navigation observation or supporting browser error, not an unseen click, abandonment or successful save.

## What Changes

- Replace the blanket client retirement rule with an off-by-default client-log exception; API export and all legacy flags/tokens stay retired. This intentionally changes the current `standard-telemetry-export` contract.
- Use one central root browser initialization boundary, one log provider, one navigation owner and shared browser-error capture. Evaluate upstream instrumentation against the exact Next.js lifecycle and privacy requirements rather than installing an automatic instrumentation bundle.
- Add explicit random bounded visit/tab correlation that survives supported same-tab authentication and reload transitions. This intentionally replaces the historical document-only policy; concurrent tabs must never inherit a certain shared path.
- Filter before SDK buffering/export and validate again at server acceptance. Use ordinary OTLP/HTTP Protobuf at a same-origin PWA route, with the single Sentrame app key held only by Node.
- Require server-owned enablement at acceptance and immediately before upstream forwarding, independently of stale browser state.
- Separate capture, wire export, protected durable receipt/read and goal-free journey derivation evidence. Preserve uncertainty and receiver gaps.

## Capabilities

### New Capabilities

None. Reuse the existing telemetry capability instead of creating a second system.

### Modified Capabilities

- `standard-telemetry-export`: bounded opt-in client navigation/error logs, server acceptance/export control, privacy, continuity and qualification; preserve independent diagnostics and external-state boundaries.

## Impact

WFS baseline: `99f553c4`, clean tracked tree on inspection. Current source has no telemetry provider, forwarding Action or observer. The two active changes, `align-planner-change-plan-icon` and `restore-stack-card-gesture-reliability`, own unrelated Planner/gesture behavior; this proposal adds no hooks to their features. Archived navigation/error/copy/result telemetry is historical reuse evidence, not active work or runtime qualification.

Future insertion points: root layout/client bootstrap, shared error boundaries, a cohesive telemetry module, exact PWA forwarding-route exceptions in `proxy.ts`, explicit HTTP contract and synthetic tests; package/lock and opt-in documentation/configuration changes only as needed. Ordinary logs, API/search diagnostics, identity/authentication and business behavior remain with their current owners.

Compatibility authority: local Sentrame `fa63310ef19ab583fd07c9052cd205de3daa618a` inspected 2026-11-01, including intake/derivation source and the unimplemented `actionable-investigation-and-directed-hierarchy` plan. This supersedes the earlier `93a9202` migration assumption: current source requires fresh data/registration, which this WFS change does not perform. Deployed version, endpoint and key remain owner prerequisites. See [design](design.md) for inventory, package audit, compatibility matrix and explicit gaps.
