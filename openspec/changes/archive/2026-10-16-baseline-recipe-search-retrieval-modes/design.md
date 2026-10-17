# Design

## Context

This is documentation extraction against commit `04a1c4570f9bbb01b47436790d4248635ac3179a` and the recorded dirty worktree, not a new runtime design. Browse, lexical, semantic and Similar retrieval with availability boundaries.

## Goals / Non-Goals

- Goal: make existing supported household behavior reviewable with explicit evidence and boundaries.
- Non-goals: implementation, defect repair, runtime/database/browser/model qualification, acceptance, main-spec promotion and archival.

## Decisions

Start at an empty household Search, then typed/Focus requests and Find similar. The client uses raw POST via searchRecipes; the server owns mode selection, candidate pools, filters and ranking. Browse reads recipe projections and materialized affinity facts without an embedding call. Lexical retrieval depends on published PostgreSQL canonical documents; semantic retrieval uses compatible current vectors and an optional external embedding call. A linked 300 ms budget bounds the attempted semantic work but cannot guarantee wall-clock completion from a non-cooperating dependency. Similar uses the stored source embedding when compatible, otherwise a compact lexical query, and structured similarity without family boosts. Keep disputed resultPath/reason enums and zero-semantic-contribution claims out of the normative delta. Do not replace production SQL evidence with the factory-only in-memory scorer.

Keep one approved `recipe-search` path across additive sibling changes instead of adding near-duplicate capabilities; this preserves the approved shared ownership model. Requirement titles are unique across those changes; apply/review ordering follows the capability coverage map. Evidence classification is implementation-supported, never runtime-verified merely because test assertions exist. Shared policy remains server-owned.

## Risks / Trade-offs

[Source or fixture mismatch] → retain the exact discrepancy and withhold the disputed assertion in [the capability plan](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/recipe-search.md). PostgreSQL paths, test-factory substitutes and browser route fixtures differ; no existing test result is claimed for the current identity. A source-supported extraction cannot establish relevance quality, live freshness, universal timing or durable cursor availability.

## Migration Plan

No application or database migration. Human review is followed only by an explicitly authorized documentation acceptance/promotion action. These active draft deltas remain unarchived.
