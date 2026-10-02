# CAP-04 — Recipe bundle import future work

- [ ] **CAP-04-T1 — Define compatibility policy for a future bundle version.**
  - **Test seam:** bundle import service/controller integration and generated-client contract tests; Playwright: import supported and unsupported bundle files and see approved outcome; mock owner: CAP-04 vertical slice; bundle import POST route; request is versioned bundle payload, response is imported result or documented malformed/unsupported error.
