# Recipe Search Indexing — Future work

- [ ] **PLAT-03-T1 — Define selected-search freshness after a source mutation.**
  - **Test seam:** fingerprint/materializer and search integration tests, search-store tests; Playwright: mutate the selected recipe field then search and observe approved stale/refresh behavior; mock owner: PLAT-03/search vertical slice; affected recipe mutation and search route; request/response retain the approved recipe mutation and search-result DTO shapes.
