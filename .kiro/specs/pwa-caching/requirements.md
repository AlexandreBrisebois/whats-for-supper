# PWA cache coherence — Requirements

**Kind:** Platform initiative

**Status:** Planned. This replaces the numbered session prompts as the active planning surface; those prompts remain historical discovery material only.

## Outcome

The PWA can reuse safe, current data without showing a household member stale identity, planner, capture, or recipe state after navigation, mutation, reconnect, or deployment changes.

## Scope

- Establish an explicit cache ownership and invalidation model for server-rendered reads, client API reads, and device-local UI state.
- Preserve API authority for household data and member identity.
- Define bounded cache behavior for route navigation, mutation, SSE invalidation, offline/reconnect, and sign-out/member switching.

## Non-goals

- Enabling an experimental Next.js cache option merely because it exists.
- A universal offline mode, local database, or client-owned conflict resolution.
- Caching secrets, credentials, feature-flag effective state, or another member's data.

## Requirements

### PCC-01 — Explicit ownership

Each selected read path shall identify its cache owner, key, freshness boundary, invalidation trigger, and authoritative recovery path before cache behavior changes.

### PCC-02 — Identity isolation

A member/household change shall clear or partition relevant client data before it can be rendered for the new identity. Cached responses shall not activate a server-disabled capability.

### PCC-03 — Mutation and real-time coherence

Successful mutations and relevant SSE events shall reconcile affected UI through the established server-owned store or refetch path. Late responses shall not overwrite a newer version or selected week.

### PCC-04 — Safe degraded behavior

An unavailable network or stale cache shall preserve usable local drafts where appropriate, disclose uncertainty honestly, and provide server reconciliation rather than claim durable completion.

### PCC-05 — Measurable, reversible rollout

Each caching slice shall document before/after behavior, invalidation tests, rollback, and any runtime/framework qualification required by its selected mechanism.
