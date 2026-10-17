# Design

## Context

See proposal.md for motivation. Evidence BSL-recipe-discovery-001–005, 008–009 in the [capability plan](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/recipe-discovery.md) identifies inspected source and assertions. All behavior is implementation-supported, not runtime-qualified. This design records extraction choices, not application modifications.

## Goals / Non-Goals

**Goals:** Map existing observable behavior to disjoint requirements/scenarios, preserving the difference between source evidence and checks.

**Non-Goals:** Repair defects, alter contracts, add abstractions, implement tasks, accept/promote/archive this baseline, or qualify runtime/database/browser behavior.

## Decisions

- First observable path and immediate integration boundaries: DiscoveryPage → discovery.ts / generated SDK → GET /api/discovery/categories then GET /api/discovery?category=Supper → DiscoveryController / DiscoveryService → vw_discovery_recipes / recipe_votes → ordered cards. Received events enter through useScheduleStream → discoveryStore → mounted page.
- Keep household Supper browsing distinct from broader API filtering in the later vote/API slice. Existing household-live-updates requirements Forward received vote totals to existing consumers and Signal candidate freshness separately from fetching results own event dispatch; discovery owns only its local consumption.
- Use ADDED requirements because no main recipe-discovery spec exists. Companion changes use the same capability and distinct titles; do not duplicate existing owner requirements. Copying broader planning or transport rules was rejected in favor of references to their actual owners in the capability plan.
- Keep disputed observations non-normative. Treating historical prose or passing mock names as requirements was rejected because source and assertion boundaries differ.

## Risks / Trade-offs

- SQL views are seeded manually in service tests → do not claim PostgreSQL verification.
- Historical flow prose conflicts with full-tail sorting, absent planned exclusion and badge slice(-4) → withhold the disputed ranking range, planning-causation badge guarantee and animation/debounce claims.
- Fetch errors only log; optimistic votes lack recovery → retain as limitations, not desired error UX.

## Migration Plan

Not applicable: documentation-only draft. Human acceptance and separately authorized promotion are later lifecycle actions; no source migration or deployment.
