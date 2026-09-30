# Interface Localization — Tasks

**Status:** Proposed change-control backlog; no implementation task is authorized

**Requirements:** [requirements.md](requirements.md)

**Design:** [design.md](design.md)

## Selection gate

These are not claims that the shipped feature is incomplete. Select tasks only for
an approved future update to `PREF-01`. Record the requested behavioral delta and
resolve consequential open questions before Task 1.

## Task 1 — Re-verify the selected behavior and seams

**Required for any change; requirements:** PREF-01-R1, PREF-01-R2, PREF-01-R3, PREF-01-R4, PREF-01-R5, PREF-01-R6

- Reproduce the current behavior from its real entry point and record success,
  empty, loading, failure, retry, concurrency, and identity-change observations
  relevant to the requested delta.
- Trace the current PWA/API or operator path through the exact interfaces named in
  the design; compare any HTTP shape to `specs/openapi.yaml`.
- Update the baseline and open questions only where current evidence proves drift.

**Meaningful assertions:** observed state ownership and side effects are identified;
contract or persistence uncertainty remains an explicit blocker.

**Checks:** targeted existing tests plus static contract/slice discovery as
applicable; do not treat static discovery as live parity.

**Stop if:** product intent, authority, or the selected compatibility boundary is
consequentially ambiguous.

## Task 2 — Approve the behavioral and contract delta

**Required; depends on:** Task 1

- Revise stable requirements and acceptance scenarios before implementation.
- Approve cross-feature handshakes, data migration/compatibility, rollout, rollback,
  security/privacy, localization, and accessibility decisions.
- If an API changes, edit OpenAPI and contract tests before runtime code and identify
  generated-client/mock closure.

**Meaningful assertions:** every intended change has an acceptance ID; preserved
behavior is explicit; no test is proposed as the source of product intent.

**Checks:** specification review, OpenAPI validation when applicable, and link/
traceability review.

**Stop if:** a required dependent spec or destructive/irreversible decision lacks
approval.

## Task 3 — Implement the smallest vertical slice test-first

**Required; depends on:** Task 2

- Add failing tests for the approved success, failure, concurrency, and recovery
  outcomes before logic changes.
- Implement only the selected slice across its authorized contract, persistence,
  service/workflow, client state, and UI seams.
- Preserve unrelated current behavior and avoid speculative shared abstractions.

**Meaningful assertions:** tests observe user/domain outcomes and authoritative
state, including immediate feedback plus eventual reconciliation where optimistic
or asynchronous behavior exists.

**Checks:** locale integrity Vitest suite, LanguageSelection and LanguageSwitchProposal component tests, profile/settings E2E coverage, PWA lint and typecheck; applicable contract, generated-client,
database, and impact checks from the execution harness.

**Stop if:** implementation requires an unapproved contract/schema change or cannot
preserve the selected rollback path.

## Task 4 — Verify, document, and close the change

**Required; depends on:** Task 3

- Exercise the complete entry-to-recovery journey and relevant second-device,
  restart, or real-dependency behavior.
- Update family/operator guidance and this baseline only after the implementation
  proves the final behavior.
- Record passed, failed, blocked, not-run, and not-applicable evidence separately,
  with content/runtime identity for environment-dependent checks.

**Meaningful assertions:** no false success is documented; open blockers remain
visible; approved requirements match the delivered behavior.

**Checks:** repository completion workflow plus the task-specific real environment
or device evidence named in the approved delta.

## Traceability

| Requirement | Design coverage | Tasks |
|---|---|---|
| PREF-01-R1 | Integration, state, recovery, security and verification sections | 1–4 |
| PREF-01-R2 | Integration, state, recovery, security and verification sections | 1–4 |
| PREF-01-R3 | Integration, state, recovery, security and verification sections | 1–4 |
| PREF-01-R4 | Integration, state, recovery, security and verification sections | 1–4 |
| PREF-01-R5 | Integration, state, recovery, security and verification sections | 1–4 |
| PREF-01-R6 | Integration, state, recovery, security and verification sections | 1–4 |
