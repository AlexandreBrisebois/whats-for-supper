# COOK-02 — In-cook recipe feedback design

## Integration map

`CooksMode` chooses contextual `ingredients` or `steps` and mounts `RecipeImportIssueSheet`. The sheet owns draft reasons/note, focus, validation affordances, and submission lock. `saveRecipeImportIssue` and `resolveRecipeImportIssue` use generated-client builders for the import-report routes and return mapped recipe detail to `CooksMode`.

`RecipeController` binds `X-Family-Member-Id` and delegates to `RecipeImportReportService`. The service validates, uses a per-process recipe semaphore, persists `RecipeImportReports`, and conditionally triggers the workflow orchestrator. Workflow completion/failure updates report status by workflow ID; the public detail DTO maps it to reported/ready-to-review, reimporting, or a safe failure message.

## State and async flow

```text
Cook's Mode flag -> contextual sheet -> POST report
  -> RecipeImportReports row -> eligible workflow trigger
  -> response: updated recipe + reimportStarted/importId/launchFailed
  -> Cook's Mode detail state; local cooking progress unchanged
workflow completion/failure -> report status (observed on later detail fetch)
```

`DELETE /api/recipes/{id}/import-report` clears the report only when its workflow is not Pending/Processing. No Cook's Mode SSE handler updates this detail state.

## Contract and failure behavior

POST accepts `RecipeImportIssueRequest { reasons: [ingredients|steps|duplicate], note?: string|null }` and returns `RecipeImportReportSubmissionResponseDto` with recipe, `reimportStarted`, `importId`, and `reimportLaunchFailed`; 400, 404, and 409 are documented errors. DELETE returns recipe detail with `importIssue: null`. The component retains its draft on a thrown save/resolve error; active/ineligible conditions become generic safe UI errors through the client boundary. A launch failure is exceptional in the Cook's Mode handler after authoritative detail is already stored, deliberately leaving the sheet available to retry.

## Evidence seams and dependencies

`RecipeImportIssueSheet.test.tsx` covers selection, accessibility, lock, and error behavior; `CooksMode.test.tsx` covers contextual entry and progress preservation. `RecipeImportReportIntegrationTests` and report-service tests own persistence/workflow semantics. OpenAPI is the route/schema authority. This packet depends on recipe detail/actions/import-reporting and workflow behavior; it has no schedule or stream write of its own.
