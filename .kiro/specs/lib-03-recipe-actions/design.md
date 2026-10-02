# LIB-03 — Recipe actions: design

`RecipeDetailSheet.tsx` receives planning callbacks and locally orchestrates metadata, import report, GOTO, bin, image, and share actions. `ActionGearMenu.tsx` is presentation for overflow choices. `recipes.ts`, `familyStore`, and the generated client provide the HTTP seams. `RecipeController` routes update/delete/import-report to their dedicated services.

Action state is independent per operation, so one action can run alongside another. Import-report flows watch an import ID and reload detail at terminal status. Recipe detail cannot infer schedule/server eligibility beyond the available response fields.

Evidence: `RecipeDetailSheet.tsx/.test.tsx`, `ActionGearMenu.tsx/.test.tsx`, import-issue components, `RecipeController.cs`, import-report service/tests, and OpenAPI.
