# Shared Real-Time State — Requirements

## Status

**Implemented capability baseline.**

## Current behavior

- **PLAT-01-R1.** `GET /api/stream` is served by `StreamController`/`SseConnectionManager`; `useScheduleStream` mounts an EventSource once at the authenticated layout and reconnects through browser EventSource behavior.
- **PLAT-01-R2.** Domain services persist state then use `IScheduleEventPublisher`/`SseEventPublisher` for connected, slot/week, vote, grocery, defaults, search invalidation, recipe-ready and recipe-failed events.
- **PLAT-01-R3.** The PWA routes each event to its owning Zustand store. Week/grocery/default updates are filtered by current week; move sequence/optimistic guards defer or reject selected stale snapshots.
- **PLAT-01-R4.** The connected event provides a week-zero schedule snapshot and connection ID. Direct commands remain the success boundary; SSE is convergence, not a database or exactly-once command acknowledgement.

## Limits and boundaries

There is no universal event version/order protocol: individual stores own their guards, and recipe/import detail does not universally refresh on events. The connected snapshot is only week 0. Schedule, grocery, discovery, capture/workflow and search packets own payload semantics; this packet owns transport and dispatch only.
