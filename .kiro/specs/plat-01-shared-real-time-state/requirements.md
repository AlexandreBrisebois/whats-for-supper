# Shared Real-Time State — Requirements

**Kind:** Current-capability feature specification

**Derivation:** Behavior-first, accelerated cadence

**Source:** `PLAT-01` in [`docs/feature-inventory.md`](../../../docs/feature-inventory.md), verified against current non-archived source, contract, and tests

**Status:** Baseline proposal for future change control; this specification does not authorize implementation

## Outcome

Household devices converge on authoritative schedule, grocery, vote, and recipe-processing state without manual refresh while remaining usable through stream interruptions.

## Scope

### In scope

- authenticated Server-Sent Events connection
- event publication for shared domain changes
- client stream lifecycle and store reconciliation
- reconnection, duplicate delivery, and stale-event handling

### Non-goals

- using SSE as the persistence authority
- guaranteed exactly-once delivery
- replacing command responses with event-only confirmation

## Verified current baseline

- `GET /api/stream` is implemented by `StreamController` and managed by `SseConnectionManager`.
- `SseEventPublisher` implements the schedule-event publishing boundary; domain services publish after authoritative changes.
- `pwa/src/hooks/useScheduleStream.ts` is mounted once by the authenticated app layout and updates Zustand stores.
- Repository testing guidance explicitly treats SSE reconnect replay and version guards as concurrency concerns.

The baseline records current ownership; it is evidence to review, not a requirement
that every implementation detail remain unchanged.

## Requirements

### PLAT-01-R1 — Authenticated connection

Only an authenticated household context may open the event stream; member context shall be preserved where an event depends on it.

### PLAT-01-R2 — Authoritative ordering

Commands shall persist authoritative state before publishing a corresponding event; SSE payloads shall not become an alternate database.

### PLAT-01-R3 — Convergence

Relevant schedule, grocery, vote, recipe-ready, failure, and planning events shall invalidate or update every affected client store.

### PLAT-01-R4 — Reconnect safety

Disconnects shall trigger browser reconnection; duplicate/replayed events shall be idempotent or guarded by version/state checks.

### PLAT-01-R5 — Optimistic reconciliation

A late event or refresh shall not overwrite a newer valid optimistic write; rejected writes shall reconcile to server state.

### PLAT-01-R6 — Degraded operation

Stream failure shall not block direct commands or route navigation, and the next authoritative fetch shall repair missed state.

## Preserved behavior

- Existing household meal workflows remain usable when this capability is degraded,
  except where the capability is the explicit security or persistence prerequisite.
- Changes preserve household/member boundaries and do not broaden collection of
  recipe, identity, or secret data.
- OpenAPI remains authoritative for any affected API operation.

## Acceptance scenarios

1. The primary success path satisfies every `PLAT-01-R*` requirement with the
   selected household/member context.
2. Missing, stale, invalid, or unavailable dependencies produce the specified safe
   fallback or explicit failure rather than false success.
3. A second device, late response, retry, or identity change cannot silently replace
   newer authoritative state.
4. The affected behavior is operable with its required non-pointer alternative and
   exposes meaningful state to assistive technology where a UI exists.
5. Contract, persistence, and workflow changes are proven at their actual seams,
   not inferred from a static or mocked check alone.

## Decisions retained by this baseline

- Current public behavior is the starting compatibility boundary, not immutable
  architecture.
- Household data remains self-hosted and the least-privilege/least-data behavior is
  preferred.
- Background work must report accepted, completed, and failed states distinctly.

## Open questions before a future change

1. Which requirement is being changed, and what current behavior must remain
   backward compatible during rollout?
2. Does the change alter OpenAPI, persistence, deployment configuration, event
   delivery, or another feature spec? If so, approve those handshakes first.
3. What production or real-device evidence is required beyond repository automation
   for the selected change?
