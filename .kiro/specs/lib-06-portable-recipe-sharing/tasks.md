# LIB-06 — Portable recipe sharing: follow-up candidates

- [ ] **T1 — Decide large-bundle progress, cancellation, and native-sharing behavior.**

  **Test seam:** unit/API: `RecipeDetailSheet.test.tsx`, `MinimalCapture.recipe-import.test.tsx`, `RecipeShareIntegrationTests.cs`; Playwright: export preparation failure/cancel and malformed/valid preview/import; mock owner: share/import vertical slice; route/method: `GET /api/recipes/{id}/share`, `POST /api/recipes/import-bundle`; contract: `RecipeShareBundleDto` download and same DTO import to Created/400 response.
