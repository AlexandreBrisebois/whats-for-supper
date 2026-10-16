# Design

## Context

See proposal.md for motivation. Evidence BSL-recipe-discovery-002–003, 006–007 in the [capability plan](../../../../docs/openspec-baseline/recipe-discovery.md) identifies inspected source and assertions. All behavior is implementation-supported, not runtime-qualified. This design records extraction choices, not application modifications.

## Goals / Non-Goals

**Goals:** Map existing observable behavior to disjoint requirements/scenarios, preserving the difference between source evidence and checks.

**Non-Goals:** Repair defects, alter contracts, add abstractions, implement tasks, accept/promote/archive this baseline, or qualify runtime/database/browser behavior.

## Decisions

- First observable path and immediate integration boundaries: Front-card button/gesture → discovery.ts submitVote → generated POST /api/discovery/{id}/vote with shared member context → DiscoveryController → DiscoveryService.SubmitVoteAsync → recipe_votes pair → like count/publication follow-up. API-only GET category/cuisine reads use the same view as the household queue.
- Successful pair persistence and sequential replacement are supported; concurrent first submissions, nonexistent IDs and value zero are outside this draft. Household-identity requirements Carry browser member context on shared SDK requests, Bind shared API member context independently of membership validation and Authenticate protected API requests independently own the shared gates. No endpoint promises that a parseable GUID is an existing member.
- Use ADDED requirements because no main recipe-discovery spec exists. Companion changes use the same capability and distinct titles; do not duplicate existing owner requirements. Copying broader planning or transport rules was rejected in favor of references to their actual owners in the capability plan.
- Keep disputed observations non-normative. Treating historical prose or passing mock names as requirements was rejected because source and assertion boundaries differ.

## Risks / Trade-offs

- OpenAPI VoteDto enum includes 0 with conflicting labels → retain values 1/2 only for the evidenced household actions; do not rewrite the approved contract.
- Save precedes awaited publication → rejection does not establish rollback or failed persistence.
- No inspected focused sequential replacement assertion → confidence medium and runtime not-run.
- Existing HTTP cuisine tests assert success/non-null, not cuisine membership → use the focused scalar-equality service assertion as limited support.

## Migration Plan

Not applicable: documentation-only draft. Human acceptance and separately authorized promotion are later lifecycle actions; no source migration or deployment.
