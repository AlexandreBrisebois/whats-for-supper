# LIB-04 — Recipe imagery and provenance: follow-up candidates

- [ ] **T1 — Define completion and failure reconciliation for image work.**

  **Test seam:** unit/API: `RecipeDetailSheet.test.tsx`, `imageUtils.test.ts`, image/service integration tests; Playwright: upload/regenerate success, rejected file, and completed/failed background processing; mock owner: recipe-imagery slice; route/method: `POST /api/recipes/{id}/originals`, `POST /api/recipes/{id}/hero/regenerate`, stream if approved; contract: multipart `file`, initiation response, and any approved completion event payload.
