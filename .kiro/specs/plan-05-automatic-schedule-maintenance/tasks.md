# PLAN-05 — Automatic schedule maintenance: follow-up candidates

- [ ] **T1 (optional) — Define operational recovery for failed Dreaming finalization.** Choose operator-visible status, retry, and alert behavior consistent with the workflow engine; do not add a user API merely to expose background work.

- [ ] **T2 (optional) — Establish a scheduled-maintenance observability contract.** If operations need proof of overdue processing, specify bounded metrics/audit data and retention without exposing meal details or inventing a browser/API seam.

- [ ] **T3 (optional) — Review atomicity around event and recipe-history updates.** Determine whether a failure between saves requires a stronger transaction/retry design; use the existing injected clock and service tests to reproduce a partial-failure policy before implementation.
