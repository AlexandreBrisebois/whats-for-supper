# Discovery live queue convergence — requirements

> **Archived — historical reference only.** Tasks, status, commands, and instructions below are historical, not an active work queue or current authority. See [archive guidance](../README.md).

## Outcome

Concurrent voters shall converge their loaded Discovery queue without polling or refetching after every vote. The card currently being considered remains locked at index zero; every remaining loaded card follows the household's current Like count.

## Decisions

**DQC-D1 — Local queue, server-provided counts.** `GET /api/discovery` supplies each recipe's aggregate Like count. The client retains the whole returned category in memory and uses the count only to order its local queue.

**DQC-D2 — Locked front.** An SSE `vote_updated` event updates the affected loaded recipe's absolute Like count, then sorts only indices 1..N by Like count descending. The card at index zero never moves until that member votes on it, it is removed by an existing eligibility update, or it otherwise leaves the stack.

**DQC-D3 — Deterministic ties.** Equal Like counts retain the category's original response order. This local stable ordinal is assigned at fetch time and is not sent to the server.

**DQC-D4 — No vote-triggered GET.** `vote_updated` must not fetch Discovery categories or recipes. Duplicate SSE events are idempotent because the payload count is absolute. A member's own optimistic removal remains authoritative locally; a later event for that removed ID is a no-op.

## Non-goals

- Mirroring the server's complete current order during an active vote session.
- Refetching, debouncing, or polling after a vote.
- Changing vote persistence, consensus, target-week, calendar eligibility, category routing, or the front-card interaction.
- Exposing which member cast a vote or changing the SSE event shape.

## Acceptance

### DQC-R1 — Contract seed

`GET /api/discovery` returns an integer `voteCount` for every recipe, equal to its current aggregate Like count. Existing recipe endpoints retain their behavior; the field is optional outside Discovery.

### DQC-R2 — Full-tail convergence

Given a loaded category of at least six recipes, an absolute `vote_updated` count for a recipe initially beyond the visible four reorders the entire tail, not just visible cards. The next card revealed after the locked front is removed reflects descending Like count.

### DQC-R3 — Stable interaction

The first recipe remains at index zero through remote vote updates. Equal counts retain original response order. A repeat event yields the same queue, and an event for an optimistically removed recipe does nothing.

### DQC-R4 — No request churn

A `vote_updated` event performs no Discovery GET. Existing SSE, visible-card rendering, accessible controls, animations, empty state, and manual refresh behavior remain unchanged.
