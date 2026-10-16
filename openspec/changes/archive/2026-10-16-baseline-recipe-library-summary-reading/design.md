# Extraction design

## Context

See proposal.md for motivation. This is a documentation extraction across a provider/consumer boundary with security and representation disagreements; an extraction design makes those decisions reviewable. The first observable slice is an authorized summary read followed by Browse's relevant first-page count assignment. No implementation work is planned.

Current trace: Browse `fetchLibraryData` → generated `librarySummary.get` → controller `GetLibrarySummary` → service aggregate → EF Recipes with deletion query filter → summary DTO → controller's anonymous data object → `SuccessWrappingFilter` preserves it → generated data/numeric mappings → Browse stores All total in state/ref → separate generated recipes GET → unwrapped list mapping → relevant-result check → `effectiveTotal` and initial store pagination. The two requests are separate reads; the page itself has separate count/page operations.

## Goals / Non-Goals

**Goals:** Extend existing recipe-library coverage with six ADDED requirements and fifteen exact mapped scenarios. Separate implementation support, inspected assertions and current verification. Reuse existing list/provider and feedback requirements.

**Non-Goals:** No application design, runtime fixes, data migration or deployment. No stack navigation, additional-page traversal, preferences, mutations, assets, search/votes/planning/workflows, synchronization repairs or variant qualification. No rewrite of existing main requirements, including audit F01–F04.

## Decisions

- Use ADDED blocks within existing `recipe-library`. Existing list page count ownership does not define summary counts; duplicating list/loading/error requirements would split ownership. The delta references their exact headers instead.
- Describe stored readiness, not a computed name/image/synthesis formula. `GetLibrarySummary` explicitly requires `DeletedAt == null && IsReady`, with the EF deletion filter also in force; it does not inspect discoverability or attribution. OpenAPI prose omits readiness. Record the discrepancy; do not broaden eligibility to match that prose or change the approved contract.
- Represent the actual single data envelope: controller already constructs it and success wrapping skips anonymous objects with data. Generated summary mappings agree on shape; generated nullable/optional fields allow the consumer's zero defaults despite required OpenAPI properties.
- Reuse household-identity `Authenticate protected API requests independently`. Production globally requires household authentication; this action has no member binder or attribution predicate. OpenAPI declares FamilyMemberId security; adding a member-header rejection requirement would invent enforcement. Keep that disagreement non-normative.
- Bound count selection to relevant first-page successes. Local `summaryTotalForRequest` takes priority for All, including zero. `allLibraryTotal` state and `allLibraryTotalRef` retain that summary total; the ref fallback is not a refresh promise. Discovery takes nonnegative page total. Negative/malformed totals and overlapping requests remain observations, not desired behavior contracts.
- Tests are inspected, not executed. API factory substitutes EF InMemory, in-memory asset storage and mocked orchestration with auth disabled by default. Unit tests replace the API client and child components; browser tests route mocked responses. Prefer source-only labeling to extrapolating from nearby wrap tests or fixture names.

## Risks / Trade-offs

- [Separate reads can disagree; cached totals and request keys have no freshness/generation guarantee] → preserve U31 and prohibit snapshot or full traversal claims.
- [Readiness and access contract prose differ from executable code] → record evidence and withhold parity assertions; no repairs.
- [Summary assertions seed only ready recipes; UI tests mostly use equal totals] → exact scenario mapping labels source-only coverage and weak/indirect assertions.
- [Mock counts are supplied constants, sometimes arithmetically inconsistent] → no aggregation, authenticated endpoint, PostgreSQL or live behavior claim from mocks.
- [Validation checks grammar and documentation only] → runtime qualification remains not-run/deferred A34; human acceptance is a separate next action.

## Migration Plan

Not applicable. Preserve the staged capability-plan audit and all other work; add draft artifacts and append evidence. Review the complete task-owned diff, validate selected/all OpenSpec items and run `task verify` with every explicit changed path. Stop for human review. No promotion, archive or successor work.
