# CAP-07 — Import failure recovery future work

- [ ] **CAP-07-T1 — Define recovery after uncertain retry acceptance.**
  - **Test seam:** CaptureFailureService/integration, failed-capture client/component tests; Playwright: interrupt retry response then refresh and see approved pending/failed state without duplicate retry; mock owner: CAP-07 vertical slice; `POST /api/captures/failures/{id}/retry`; request has failure ID, response is accepted workflow/status or documented `404`/`409` error.
