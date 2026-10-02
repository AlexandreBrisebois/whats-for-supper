# CAP-05 — Duplicate prevention future work

- [ ] **CAP-05-T1 — Define concurrency behavior for a selected duplicate-sensitive import route.**
  - **Test seam:** import service/controller integration tests and client contract tests; Playwright: submit same source from two sessions and observe approved duplicate outcome; mock owner: CAP-05/import vertical slice; selected import POST route; request carries current import identity/source fields, response is existing duplicate result, accepted import, or documented conflict.
