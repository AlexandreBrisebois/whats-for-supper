# QUAL-01 — Import issue reporting design

`RecipeImportIssueSheet` owns draft, dialog focus, busy/error state. `saveRecipeImportIssue`/`resolveRecipeImportIssue` use generated clients. `RecipeController` binds family identity and delegates to `RecipeImportReportService`, which persists `RecipeImportReports` and returns mapped recipe detail. POST/DELETE are the OpenAPI authority; POST returns recipe plus `reimportStarted`, `importId`, and `reimportLaunchFailed`.

The service uses an in-process semaphore keyed by recipe. It persists before any eligible workflow launch; deletion refuses an active workflow. Tests: `RecipeImportIssueSheet.test.tsx`, `RecipeDetailSheet.test.tsx`, and `RecipeImportReportIntegrationTests`. This packet consumes QUAL-02 and does not own workflow lifecycle or recipe detail display.
