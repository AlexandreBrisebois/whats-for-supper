# PWA cache coherence — Design

**Status:** Planned; no caching mechanism is approved for implementation yet.

## Design direction

Treat caching as an ownership problem, not a framework switch. The selected slice must trace `route/component → client or server read → state owner → mutation/SSE invalidation → authoritative refetch`. Existing state stores and API decisions stay authoritative unless a bounded task explicitly changes that contract.

The old numbered prompts suggest framework flags, request memoization, persistent cache, server identity, and activity restoration. They are hypotheses, not an execution order: each may be unnecessary or incompatible once current Next.js, Kiota, identity, and real-time behavior are rechecked.

## Proposed slice order

1. Reconnaissance: map the selected read path and current invalidation behavior.
2. Identity-safe request deduplication for one read-only path, if current framework behavior supports it.
3. Mutation/SSE reconciliation for that same path.
4. Persistent or offline behavior only after a separate compatibility and privacy decision.

## Failure boundaries

- Do not cache feature-flag effective state across focus/reload as a replacement for deployment control.
- Do not allow an old member, selected week, or late async response to replace newer authoritative state.
- Do not interpret a cached 202 or queued capture response as workflow completion.

## Verification strategy

Each selected slice names its API/mock seam, member-switch case, mutation/SSE case, and recovery behavior. Framework configuration changes require a focused production build check; browser behavior requires a targeted Playwright scenario using the repository mock boundary.
