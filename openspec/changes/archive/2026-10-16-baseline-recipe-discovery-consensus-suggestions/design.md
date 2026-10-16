# Design

## Context

See proposal.md for motivation. Evidence BSL-recipe-discovery-010–013 in the [capability plan](../../../../docs/openspec-baseline/recipe-discovery.md) identifies inspected source and assertions. All behavior is implementation-supported, not runtime-qualified. This design records extraction choices, not application modifications.

## Goals / Non-Goals

**Goals:** Map existing observable behavior to disjoint requirements/scenarios, preserving the difference between source evidence and checks.

**Non-Goals:** Repair defects, alter contracts, add abstractions, implement tasks, accept/promote/archive this baseline, or qualify runtime/database/browser behavior.

## Decisions

- First observable path and immediate integration boundaries: Discovery empty-state navigation → Planner weekStore init → planner.ts GET /api/schedule/{offset}/smart-defaults → ScheduleController / ScheduleService.GetSmartDefaultsAsync → recipe_votes, members, undeleted recipes and calendar entries → pending suggestions. closeVoting → parallel assignment POSTs → separate lock POST → database writes and publication.
- U04 is resolved as terminology and trace, not as approval of accidental behavior: SQL vw_recipe_matches has any-like rows; IsMatchAsync only checks existence; consensus uses majority; suggestions are read-only; promotion calls assignment; assignment saves a calendar event; lock is separate. Keep global clearing and partial-commit behavior non-normative pending review. Meal-planning owns assignment and lock lifecycle; household-live-updates owns transport and pending merge rules.
- Use ADDED requirements because no main recipe-discovery spec exists. Companion changes use the same capability and distinct titles; do not duplicate existing owner requirements. Copying broader planning or transport rules was rejected in favor of references to their actual owners in the capability plan.
- Keep disputed observations non-normative. Treating historical prose or passing mock names as requirements was rejected because source and assertion boundaries differ.

## Risks / Trade-offs

- LockScheduleAsync removes all stored votes, including unrelated recipes/weeks → disclose the global boundary without adopting it as desired policy or household isolation.
- Promise.all assignments can partially commit before a rejection; status rollback is local only → no atomic promotion/lock assertion.
- Private DiscoveryService defaults duplicate public ScheduleService logic, use direct UTC and omit totalTime → no equivalence guarantee.
- Consensus recipes use the recipe deletion filter but no ready/discoverable filter; ranking differs from discovery queue recency → withhold any common eligibility/freshness claim.
- isLocked=true for unanimous suggestions differs from an OpenAPI example → example discrepancy recorded, no persisted-lock interpretation.

## Migration Plan

Not applicable: documentation-only draft. Human acceptance and separately authorized promotion are later lifecycle actions; no source migration or deployment.
