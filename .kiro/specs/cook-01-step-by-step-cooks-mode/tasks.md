# COOK-01 — Step-by-step Cook's Mode future work

This implemented baseline has no implementation backlog. Select and authorize a task before changing application behavior.

- [ ] **COOK-01-T1 — Guard or cancel stale recipe-detail loads.** Define the expected behavior when Cook's Mode changes recipe or closes while its detail fetch is pending.
  - **Test seam:** `CooksMode.test.tsx` and recipe API mock tests; Playwright: open recipe A, switch/close, then resolve A after recipe B is active and confirm B remains visible; mock owner: this COOK-01 vertical slice; `GET /api/recipes/{id}`; response is the existing recipe-detail object or documented failure.

- [ ] **COOK-01-T2 — Make completion semantics consistent across entry points.** Product must decide whether recipe-detail completion is view-only or should validate an assigned day; preserve Home's schedule ownership if it changes.
  - **Test seam:** `CooksMode.test.tsx`, `todayStore` tests, and schedule integration tests; Playwright: complete from each supported entry and see the approved schedule result; mock owner: this COOK-01/Home vertical slice; `POST /api/schedule/day/{date}/validate`; request `{ status: 2 }`, response is the documented success envelope/updated schedule state.
