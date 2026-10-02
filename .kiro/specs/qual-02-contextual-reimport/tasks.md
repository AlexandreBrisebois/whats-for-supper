# QUAL-02 — Contextual re-import future work

- [ ] **QUAL-02-T1 — Add approved status refresh after background re-import.**
  - **Test seam:** report/workflow integration and detail/Cook tests; Playwright: submit, leave, complete workflow, return and see ready/failure; mock owner: QUAL-02 slice; `GET /api/recipes/{id}` or chosen stream event; response/event contains `importIssue` status and safe failure fields.
