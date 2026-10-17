# Design

## Context

This is documentation extraction against commit `04a1c4570f9bbb01b47436790d4248635ac3179a` and the recorded dirty worktree, not a new runtime design. Server ranking, rediscovery promotion and local Surprise Me.

## Goals / Non-Goals

- Goal: make existing supported household behavior reviewable with explicit evidence and boundaries.
- Non-goals: implementation, defect repair, runtime/database/browser/model qualification, acceptance, main-spec promotion and archival.

## Decisions

The first observable slice is browse with saved affinity facts and current calendar guards, followed by ranked query results and local Surprise Me. Keep the full eligibility rule in the server-owned Search baseline, not in PWA. The materializer persists affinity from like-minus-dislike votes plus cooked events and last cooked event date; Search consumes that snapshot and current calendar, it does not run materialization. Those facts differ from recipe.LastCookedDate and from recipe rating. Browse ordering and ranked scoring are distinct. Family vote totals retain recipe-discovery ownership; meal-planning owns calendar persistence and suggestion composition. Standard planner demotion uses the server GetScheduleAsync projection from persisted calendar entries, not browser-composed pending suggestions. It checks every returned recipe-bearing status rather than only active future assignments. The server does not use browse isPromotionEligible to select a ranked-query Top Pick. Report exclusion applies separately. The client only samples loaded, server-flagged, issue-free alternatives and swaps displayed cards, without an assignment request.

Keep one approved `recipe-search` path across additive sibling changes instead of adding near-duplicate capabilities; this preserves the approved shared ownership model. Requirement titles are unique across those changes; apply/review ordering follows the capability coverage map. Evidence classification is implementation-supported, never runtime-verified merely because test assertions exist. Shared policy remains server-owned.

## Risks / Trade-offs

[Source or fixture mismatch] → retain the exact discrepancy and withhold the disputed assertion in [the capability plan](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/recipe-search.md). PostgreSQL paths, test-factory substitutes and browser route fixtures differ; no existing test result is claimed for the current identity. A source-supported extraction cannot establish relevance quality, live freshness, universal timing or durable cursor availability.

## Migration Plan

No application or database migration. Human review is followed only by an explicitly authorized documentation acceptance/promotion action. These active draft deltas remain unarchived.
