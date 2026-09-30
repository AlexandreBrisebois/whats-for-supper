# DISC-01 — Swipe discovery queue requirements

## Status

**Implemented capability baseline.**

## Current behavior

- **DISC-01-R1.** Discovery routes/components render server-provided recipe candidates from `discoveryStore`, with card actions supplying vote/skip detail context.
- **DISC-01-R2.** Store/API boundaries obtain discovery candidates and apply selected local card/vote updates; stream vote and fill-the-gap invalidation handlers reconcile affected discovery state.
- **DISC-01-R3.** The queue is not an authoritative recommendation database: discovery service/search rules own eligibility and ranking, and empty/end cards are UI state.

## Limits and boundaries

Rapid client interactions and reconnect behavior rely on store/event handling rather than a queue version protocol. DISC-02 owns household votes, DISC-03 owns discoverability, PLAT-03 owns indexed search data, and PLAT-01 owns SSE delivery.
