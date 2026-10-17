# Design

## Context

This is documentation extraction against commit `04a1c4570f9bbb01b47436790d4248635ac3179a` and the recorded dirty worktree, not a new runtime design. Filter drafts, combinations, reset and mounted search state.

## Goals / Non-Goals

- Goal: make existing supported household behavior reviewable with explicit evidence and boundaries.
- Non-goals: implementation, defect repair, runtime/database/browser/model qualification, acceptance, main-spec promotion and archival.

## Decisions

The first observable slice opens the shared responsive chooser. Its draft selections are independent from applied Search state until Apply; dismissal discards them and Clear changes only the draft. Focus concepts are preferences, not exact ingredient constraints. UI state remains local to the mounted page; no search-specific persisted store exists. Vocabulary is read from the materialized singleton through GET search/filters, with safe built-in choices if unavailable. Search does not recompute affinity or cuisines on request. Keep server predicates authoritative rather than reproduce them in PWA. Accepted recipe-quality review actions consume this search surface; there is no separate Needs review view. Contract-only ingredient/category/duration fields are withheld because predicates do not implement them.

Keep one approved `recipe-search` path across additive sibling changes instead of adding near-duplicate capabilities; this preserves the approved shared ownership model. Requirement titles are unique across those changes; apply/review ordering follows the capability coverage map. Evidence classification is implementation-supported, never runtime-verified merely because test assertions exist. Shared policy remains server-owned.

## Risks / Trade-offs

[Source or fixture mismatch] → retain the exact discrepancy and withhold the disputed assertion in [the capability plan](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/recipe-search.md). PostgreSQL paths, test-factory substitutes and browser route fixtures differ; no existing test result is claimed for the current identity. A source-supported extraction cannot establish relevance quality, live freshness, universal timing or durable cursor availability.

## Migration Plan

No application or database migration. Human review is followed only by an explicitly authorized documentation acceptance/promotion action. These active draft deltas remain unarchived.
