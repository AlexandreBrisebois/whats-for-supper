# Proposal

## Why

The opening-only change records one entry screen but cannot describe subsequent paths. Shared route and surface boundaries can supply a small anonymous baseline without telemetry calls in every feature.

## Outcome and Scope

Extend the implemented opening observer to observe presented route shells, the Planner/Grocery composition, and one shared surface pilot through the existing browser-authority transport. A new document starts a new in-memory correlation scope; no cross-document continuity is promised. Include `pwa.app.opened` in the same anonymous observation stream as screens and adopted surfaces. Preserve its name, eligibility gates, one-attempt-per-document behavior and failure isolation; explicitly replace its former uncorrelated payload and export-time clock contract.

This change supplies presentation evidence, not voting, shopping, cooking or persistence outcomes. It does not install all-click capture, a workflow engine, presence tracking, automatic HTTP tracing, or a new analytics backend. No existing deployment is enabled by implementing it.

## What Changes

- Add centrally observed `pwa.screen.presented`, `pwa.surface.opened` and `pwa.surface.closed` named logs with reviewed static identities.
- Reuse the opening gate/classifier and server transport. Share `session.id`, `tab.id`, distinct `event.id` and increasing `source.sequence` across opening, screens and adopted surfaces, with browser observation and server forwarding timestamps.
- **BREAKING telemetry contract revision:** opening gains the reviewed correlation envelope and observation clocks. Older uncorrelated receipt evidence remains historical; no receiver data is rewritten.
- Document explicit prospective mappings, receiver goal constraints and separate receipt versus configured-derivation qualification.
- Distinguish mobile Grocery presentation from the simultaneous wide-screen Planner/Grocery composition.
- Establish a shared static surface declaration with one production pilot, preserving existing interaction behavior.
- Catch missing route classifications and unclassified surface declarations through lightweight source/component coverage checks.
- Qualify the exact WFS-to-local-Sentrame wire path independently of graph interpretation and deployed/device behavior.

## Capabilities

### New Capabilities

- `anonymous-navigation-observation`: Own anonymous route/surface presentation and document-local sequential context.

### Modified Capabilities

- `anonymous-pwa-telemetry`: revise opening payload, observation clocks, browser-input validation and configuration/interpretation boundaries. Keep all entry and document-lifetime semantics. Product capabilities are unchanged.

## Impact

Depends on [centralize-pwa-opening-observation](../archive/2026-10-29-centralize-pwa-opening-observation/proposal.md), specifically its implemented gate-aware observer, classifier and forwarding seam. Archived unchecked final-gate and receiver tasks are not accepted prerequisites; reconcile them as described in the revised task group. Likely owners: `pwa/src/lib/telemetry/`, shared observer composition, Planner presentation, `components/common/Modal.tsx`, a narrow Quick Find surface adapter, focused tests and `docs/sentrame.md`. No business API contract, generated client, persistence schema or Sentrame code changes. See the [program tracker](../../../docs/telemetry/README.md) for session selection and the separate journey inventory.
