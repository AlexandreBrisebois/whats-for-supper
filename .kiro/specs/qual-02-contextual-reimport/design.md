# QUAL-02 — Contextual re-import design

`RecipeImportReportService.SubmitAsync` validates/persists feedback then conditionally calls `IWorkflowOrchestrator.TriggerAsync` with recipe/source/context parameters. `recipe-import.yaml`/`url-import.yaml` include `CompleteRecipeImportReport`; worker failure invokes report failure recording. Report status and workflow ID persist on `RecipeImportReports` and map into recipe detail. POST import-report is both command and immediate outcome boundary; no polling/SSE reconciliation is mounted by detail or Cook's Mode.

Evidence: report integration/Postgres tests, workflow processor tests, detail/sheet tests. Dependency ownership is QUAL-01 → QUAL-02 → PLAT-02, with CAP-06/07 remaining separate capture recovery paths.
