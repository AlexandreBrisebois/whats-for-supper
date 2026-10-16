# Design

## Context

This is documentation extraction against commit `04a1c4570f9bbb01b47436790d4248635ac3179a` and the recorded dirty worktree, not a new runtime design. Continuation, expiry, stale-response suppression and received invalidation.

## Goals / Non-Goals

- Goal: make existing supported household behavior reviewable with explicit evidence and boundaries.
- Non-goals: implementation, defect repair, runtime/database/browser/model qualification, acceptance, main-spec promotion and archival.

## Decisions

The first observable slice follows the result sentinel into another page, then handles failure/expiry and replacement searches. Raw searchRecipes preserves HTTP status on failure and tolerates raw or data-enveloped success. Browser generation and promotion-version checks suppress obsolete successes, without aborting network requests or proving universally safe failures. Ranked continuation stores cloned result snapshots and rechecks LINQ recipe eligibility before paging; it does not rerank or refresh DTO fields. Browse recomputes the ordering and locates an identity anchor; an absent anchor can end traversal. Both use bounded process-local cursors. Clone omits IsPromotionEligible and subsequent browse positions omit WeekOffset, so flag continuity and selected-week freshness are withheld. Shared live-update requirements own delivery; this delta describes only the consequence of receiving invalidation. Browse retries with active state; ranked non-browse has no automatic invalidation refresh effect. Manual resolution refreshes detail only. No immediate catalog/index/loaded-parent convergence is promised.

Keep one approved `recipe-search` path across additive sibling changes instead of adding near-duplicate capabilities; this preserves the approved shared ownership model. Requirement titles are unique across those changes; apply/review ordering follows the capability coverage map. Evidence classification is implementation-supported, never runtime-verified merely because test assertions exist. Shared policy remains server-owned.

## Risks / Trade-offs

[Source or fixture mismatch] → retain the exact discrepancy and withhold the disputed assertion in [the capability plan](../../../../docs/openspec-baseline/recipe-search.md). PostgreSQL paths, test-factory substitutes and browser route fixtures differ; no existing test result is claimed for the current identity. A source-supported extraction cannot establish relevance quality, live freshness, universal timing or durable cursor availability.

## Migration Plan

No application or database migration. Human review is followed only by an explicitly authorized documentation acceptance/promotion action. These active draft deltas remain unarchived.
