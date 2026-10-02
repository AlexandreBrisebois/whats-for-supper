# DISC-02 — Household matching feedback requirements

## Status

**Implemented capability baseline.**

## Current behavior

- **DISC-02-R1.** A selected family member can vote on a discovery recipe through the discovery vote route; server vote state determines household count/matching feedback.
- **DISC-02-R2.** `DiscoveryService` persists votes and publishes `vote_updated`; `useScheduleStream` applies vote counts to discovery and week stores.
- **DISC-02-R3.** Vote actions update only their relevant recipe representation; planner/default promotion remains schedule/discovery policy, not a client vote-count inference.

## Limits and boundaries

Member identity and authorization are route/controller policy. Events carry recipe/count rather than a full household vote projection; no universal event version guard exists. DISC-01 owns queue presentation, PLAN-04 owns voting-cycle schedule behavior, PLAT-01 owns SSE transport.
