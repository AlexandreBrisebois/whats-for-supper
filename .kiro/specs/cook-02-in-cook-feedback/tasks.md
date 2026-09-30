# COOK-02 — In-cook recipe feedback future work

This implemented baseline has no implementation backlog. Select and authorize a task before changing application behavior.

- [ ] **COOK-02-T1 — Decide durable concurrency for report edits and workflow launch.** Replace or document the process-local lock only after selecting a multi-replica-safe conflict/idempotency policy.
  - **Test seam:** `RecipeImportReportService` tests and real-database import-report integration tests; Playwright: two sessions save changed feedback while a re-import starts and receive the approved conflict/retry result; mock owner: this COOK-02 vertical slice; `POST /api/recipes/{id}/import-report`; request `{ reasons, note }`, response is authoritative recipe plus outcome or documented `409` problem.

- [ ] **COOK-02-T2 — Provide an approved in-cook status refresh for background re-import.** Choose polling, detail invalidation, or a versioned stream event; do not infer completion from workflow acceptance.
  - **Test seam:** report integration/workflow tests, `CooksMode.test.tsx`, and the chosen stream/poll hook test; Playwright: submit content feedback, leave the sheet, complete the workflow, and observe the approved ready/failure status on return; mock owner: this COOK-02 vertical slice; `GET /api/recipes/{id}` or selected stream route/event; response/event carries recipe `importIssue` status and safe failure fields.
