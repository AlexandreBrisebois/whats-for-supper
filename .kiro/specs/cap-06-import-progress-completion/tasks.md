# CAP-06 — Import progress and completion future work

- [ ] **CAP-06-T1 — Define repair behavior for a missed terminal import event.**
  - **Test seam:** workflow/import integration, capture-store and stream tests; Playwright: disconnect during completion then revisit/import refresh and observe approved ready/failure state; mock owner: CAP-06 vertical slice; import status/read route or selected SSE event; response/event includes recipe/workflow identity and terminal status/safe failure fields.
