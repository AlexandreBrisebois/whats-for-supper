# Design

## Context

This is documentation extraction against commit `04a1c4570f9bbb01b47436790d4248635ac3179a` and the recorded dirty worktree, not a new runtime design. Search entry, submitted text, loaded cards and return from detail.

## Goals / Non-Goals

- Goal: make existing supported household behavior reviewable with explicit evidence and boundaries.
- Non-goals: implementation, defect repair, runtime/database/browser/model qualification, acceptance, main-spec promotion and archival.

## Decisions

The first observable slice is navigation into Search, followed by initial request, visible cards and detail return. The page owns mounted selection and scroll; the API adapter owns response representation; existing library and meal-planning requirements own detail mutations and assignments. Opening a result is a read handoff, not an assignment. Initial request failure currently shares empty presentation; this is recorded as a limitation rather than adopted as desired error behavior.

Keep one approved `recipe-search` path across additive sibling changes instead of adding near-duplicate capabilities; this preserves the approved shared ownership model. Requirement titles are unique across those changes; apply/review ordering follows the capability coverage map. Evidence classification is implementation-supported, never runtime-verified merely because test assertions exist. Shared policy remains server-owned.

## Risks / Trade-offs

[Source or fixture mismatch] → retain the exact discrepancy and withhold the disputed assertion in [the capability plan](../../../../docs/openspec-baseline/recipe-search.md). PostgreSQL paths, test-factory substitutes and browser route fixtures differ; no existing test result is claimed for the current identity. A source-supported extraction cannot establish relevance quality, live freshness, universal timing or durable cursor availability.

## Migration Plan

No application or database migration. Human review is followed only by an explicitly authorized documentation acceptance/promotion action. These active draft deltas remain unarchived.
