# Design

## Context

See proposal.md for motivation. The first observable preview slice is Settings disclosure after the protected layout loads the current member snapshot. FeatureFlagProvider reloads on member changes and focus; featureFlagStore clears flags, tracks member generations and confirms mutation responses. The adapter maps generated DTOs and converts responseStatusCode to status for conflict handling.

## Goals / Non-Goals

**Goals:** Extract the traced observable slice with explicit ownership and evidence limits.

**Non-Goals:** Application changes, runtime/database/device qualification, acceptance, main-spec promotion, or repair of the recorded limitations.

## Decisions

- Preserve server-confirmed choices instead of describing optimistic toggles: the existing store retains prior values until PATCH succeeds.
- Keep server deployment-mode precedence in the companion preview-resolution delta. Settings only exposes opt-in entries.
- Scope stale-result protection to member-generation changes. The alternative of claiming universal newest-request-wins is not supported for overlapping loads of the same member.

Evidence and requirement/scenario mappings: BSL-member-preferences-009–012 in the [capability plan](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/member-preferences.md). A10 implementation support is distinct from A34 runtime evidence.

## Risks / Trade-offs

- Same-member focus refreshes share the generation → U-MP06; do not promise ordering among concurrent same-member snapshot requests.
- A mutation completing during a same-member reload can overlap snapshot replacement → no universal refresh/save consistency guarantee.
- Store tests substitute API promises; component tests directly populate store and replace mutation/refresh actions → screen reader, real HTTP and database qualification remain not-run.
