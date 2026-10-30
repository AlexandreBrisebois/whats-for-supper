# Proposal

## Why

Unexpected browser and Next server errors currently have no central WFS reporting. An error must be discoverable in Sentrame even without journey configuration. Where existing anonymous browser context permits, it should also explain what was presented before and after the failure in the path that began with app opening.

## Outcome and Scope

Attempt one minimized observation per identified unexpected failure occurrence, within bounded admission and best-effort delivery. An error proves that a boundary observed a failure; it does not prove that a journey failed, ended or subsequently recovered. Browser errors reuse the enabled document stream already owned by correlated opening/navigation. Next server errors remain useful standalone diagnostics because no approved browser request-context propagation exists.

This revision changes planning artifacts only. Implementation, collection enablement, deployments, commits, Sentrame changes and existing receiver storage changes are outside this session. Handled business failures, actual persisted outcomes/recovery, .NET logging, generic request/console capture, raw diagnostics, technical traces and cross-document continuity remain separate work.

## What Changes

- Report initialized script/rejection and boundary render failures as `pwa.browser.error`, with observation-time snapshots of existing document context and last presented static screen when available.
- Share opening/navigation session, tab and sequence allocation; keep standalone errors when that context is unavailable, without creating a visit for an error.
- Report Next-captured failures as `pwa.server.error` with separate server authority and no inferred browser context.
- Specify exact safe fields, occurrence versus record identity, same-episode overlap suppression, distinct failed retries and bounded delivery.
- Qualify standalone diagnostic discovery independently of mappings/goals, then supported journey association without an artificial error graph step. Identify receiver display/search gaps separately.
- Require real browser/handler/Action/Node export and disposable Sentrame protected reads/reopen in the first useful slice; keep capture, retention, derivation, deployed routes and devices separate.

## Capabilities

### New Capabilities

- `anonymous-error-observation`: minimized unexpected browser and Next server error evidence, optional existing correlation, identity and honest diagnostic interpretation.

### Modified Capabilities

None. This capability consumes the active F2 correlated-opening/navigation contract; it does not replace opening eligibility, invent presentation or alter business outcomes.

## Impact

Dependencies are the implemented [opening foundation](../archive/2026-10-29-centralize-pwa-opening-observation/design.md), the current [navigation design](../observe-pwa-navigation/design.md), its explicit [opening delta](../observe-pwa-navigation/specs/anonymous-pwa-telemetry/spec.md) and [F2-1 tasks/evidence](../observe-pwa-navigation/tasks.md). The main [opening spec](../../specs/anonymous-pwa-telemetry/spec.md) still describes the historical stage-only envelope; use the active delta for this dependency. F2-1 has local implementation/receipt evidence but its final task is unchecked at this inspection; do not assume full prerequisite acceptance.

Likely implementation owners are `pwa/src/lib/telemetry/opening.ts` (existing document WeakMap), instrumentation entrypoints, route/root boundaries, closed Server Actions, `server.ts` (actual transport owner), tests and later `docs/sentrame.md`/tracker updates. There is no `transport.ts`; `transport.test.ts` tests `server.ts`. No business OpenAPI/client/schema change, new provider/exporter, SDK migration or Sentrame edit is planned. The [design](design.md) records field ownership, receiver gaps, source identity and integration recipe; the [tasks](tasks.md) define the smallest F3-1 and its actual prerequisites.
