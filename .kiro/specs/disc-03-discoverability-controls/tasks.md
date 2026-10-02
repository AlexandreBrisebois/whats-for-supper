# DISC-03 — Discoverability controls future work

- [ ] **DISC-03-T1 — Define queue/search refresh after a discoverability mutation.**
  - **Test seam:** recipe/search integration and detail/store tests; Playwright: toggle a recipe then return to discovery/search and observe approved removal/appearance; mock owner: DISC-03/PLAT-03 vertical slice; `PATCH /api/recipes/{id}` and selected search/discovery refresh; request includes discoverability field, response uses recipe/search DTO or documented invalidation event.
