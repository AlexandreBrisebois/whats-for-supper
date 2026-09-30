# CAP-03 — Description creation future work

- [ ] **CAP-03-T1 — Define recovery presentation for a selected synthesis failure.**
  - **Test seam:** description service/workflow and capture-store tests; Playwright: submit description, receive failure, then see approved retry/recovery without duplicate stub; mock owner: CAP-03/CAP-07 vertical slice; description-create POST and selected status/event; request `{ name, description }`, accepted response identifies pending recipe/workflow and failure response/event carries safe status.
