# QUAL-01 — Import issue reporting future work

- [ ] **QUAL-01-T1 — Define durable multi-replica report concurrency.**
  - **Test seam:** report-service and real-database integration tests; Playwright: two sessions edit/resolve one report; mock owner: QUAL-01 vertical slice; `POST`/`DELETE /api/recipes/{id}/import-report`; request `{ reasons, note }`, response authoritative recipe/outcome or documented `409`.
