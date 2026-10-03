# QUAL-03 — Processing language future work

- [ ] **QUAL-03-T1 — Decide whether processing language needs an explicit contract.**
  - **Test seam:** import service/workflow tests and `stepParser.test.ts`; Playwright: a recipe with source language distinct from UI locale retains intended instruction text; mock owner: CAP-06/QUAL-03 vertical slice; selected import command route; request declares source/language only if approved, response includes a documented processing-language field or explicitly remains absent.
