# GROC-01 — Derived weekly grocery list: proposed future tasks

**Requirements:** [requirements.md](requirements.md)

**Design:** [design.md](design.md)

## Status and execution boundary

This is a dependency-ordered proposal for a future audit/change cycle. Every item is unchecked because this documentation effort did not execute implementation. **These tasks do not authorize implementation.** Select and approve a bounded task before changing code, contracts, data, or deployment.

## Proposed tasks

- [ ] **T1 (required) — Confirm baseline and resolve decisions**
  **Requirements:** GROC-01-AC-01, GROC-01-AC-02, GROC-01-AC-03, GROC-01-AC-04, GROC-01-AC-05, GROC-01-AC-06, GROC-01-AC-07.
  Review the listed current paths with product/engineering owners, classify each observed behavior as preserve/change/reject, answer consequential open questions, and record approved success/failure copy and state ownership.
  **Assertions/checks:** path existence/link check; acceptance review; contract-operation inventory; decision record.
  **Stop:** do not begin contract or implementation work while behavior, destructive-action policy, or ownership is unresolved.

- [ ] **T2 (conditional, contract owner) — Approve contract changes**
  **Requirements:** GROC-01-AC-01, GROC-01-AC-02, GROC-01-AC-03, GROC-01-AC-04, GROC-01-AC-07.
  Only if T1 identifies contract drift, update the approved OpenAPI source first, validate examples/error responses/member scope, regenerate clients, and prove zero drift before consumer work.
  **Assertions/checks:** OpenAPI validation; generated-client clean regeneration; controller contract tests for success, validation, authorization, conflict, and not-found outcomes.
  **Stop:** skip this task when the approved contract already expresses the accepted behavior; stop on generated/manual client divergence.

- [ ] **T3 (required for an approved change) — Establish failing behavioral evidence**
  **Requirements:** GROC-01-AC-01, GROC-01-AC-02, GROC-01-AC-03, GROC-01-AC-04, GROC-01-AC-05, GROC-01-AC-06, GROC-01-AC-07.
  Add or identify focused tests at the owner seams for outcome, empty/loading/error/retry, preserved state, concurrency/late results, localization, keyboard/focus/name semantics, and non-target preservation.
  **Assertions/checks:** tests must fail for the approved missing behavior for the expected reason; use a controllable clock/date and deterministic events where time or streaming participates.
  **Stop:** do not alter production behavior until the expected failure and ownership seam are demonstrated.

- [ ] **T4 (required for an approved change) — Implement the smallest vertical slice**
  **Requirements:** GROC-01-AC-01, GROC-01-AC-02, GROC-01-AC-03, GROC-01-AC-04, GROC-01-AC-07.
  Change only the approved route/component, state/API seam, and server service/persistence boundary needed for the accepted outcome. Preserve unrelated state and generated-file ownership.
  **Assertions/checks:** focused UI/unit tests; controller/service tests; accepted response is the only durable-success signal; failure restores confirmed state.
  **Stop:** stop on an unapproved schema/contract/authentication change or when displaced/concurrent state cannot be preserved.

- [ ] **T5 (required for shared/async behavior) — Prove reconciliation and accessibility**
  **Requirements:** GROC-01-AC-04, GROC-01-AC-05, GROC-01-AC-06, GROC-01-AC-07.
  Exercise two-client updates, echoes, reconnect/snapshot, stale responses, rapid repeated action, navigation during pending work, keyboard-only flow, focus recovery, live announcements, and supported locales.
  **Assertions/checks:** deterministic store/hook tests and relevant browser scenario; no stale overwrite, duplicate mutation, secret leakage, inaccessible action, or context loss.
  **Stop:** do not claim completion if only the happy path or one client was checked.

- [ ] **T6 (required) — Full validation and evidence handoff**
  **Requirements:** all accepted `GROC-01-AC-*`.
  Run repository-prescribed focused and broad checks, review scope delta, record exact commands/results and remaining blockers, and obtain review against requirements/design/tasks traceability.
  **Assertions/checks:** formatting/type/lint/test/build as applicable; OpenAPI drift check when T2 ran; local Markdown link check; scope review.
  **Stop:** failures, skipped required evidence, unresolved open decisions, or changes outside the approved packet prevent completion.

## Dependency order

`T1 → (T2 when needed) → T3 → T4 → T5 → T6`. Contract ownership is exclusive during T2; consumer work follows successful regeneration. Read-only review may run in parallel, but writers must not share files.
