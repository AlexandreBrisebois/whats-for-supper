# WFS source map

Conditional navigation for investigation; verified against source on 2026-09-10.
Recheck the affected code before acting. All paths below are repository-relative.
This map establishes source relationships, not live API/DB parity.

| Area | Entry and client | Backend and persistence |
|---|---|---|
| Recipe import/reporting | `pwa/src/components/recipes/RecipeDetailSheet.tsx`, `RecipeImportIssueSheet.tsx` in the same directory → `pwa/src/lib/api/recipes.ts` | `api/src/RecipeApi/Controllers/RecipeController.cs` → `Services/RecipeImportService.cs` and `Services/RecipeImportReportService.cs`; `Models/RecipeImportReport.cs` is separate from workflow runtime state |
| Workflow execution | `specs/openapi.yaml`; `api/src/RecipeApi/Controllers/WorkflowController.cs` | `Services/WorkflowOrchestrator.cs` → `Services/WorkflowRepository.cs` / `Infrastructure/IStorageProvider.cs`; bundled `Workflows/url-import.yaml` and `Workflows/recipe-import.yaml`; `Services/WorkflowWorker.cs`, `Workflow/IWorkflowProcessor.cs`, `Models/WorkflowInstance.cs`, `Models/WorkflowTask.cs` |
| Planning | `pwa/src/store/weekStore.ts` → `pwa/src/lib/api/schedule.ts` | `api/src/RecipeApi/Controllers/ScheduleController.cs` → `Services/ScheduleService.cs`; scheduled events and `Models/WeeklyPlan.cs` assemble schedule DTOs |
| Groceries | `pwa/src/components/planner/GroceryList.tsx` → `pwa/src/store/weekStore.ts` and `pwa/src/lib/api/schedule.ts` | `api/src/RecipeApi/Services/GroceryRecomputeService.cs`; `Models/WeeklyPlan.cs` stores grocery state/items and balance summary as JSONB-backed strings; the API exposes mapped DTOs, not those storage strings |

Backend abbreviated paths in the table are relative to `api/src/RecipeApi/`.
Workflow definitions are loaded from the configured `IStorageProvider` workflows
partition; `Infrastructure/WorkflowSeeder.cs` seeds bundled definitions. A bundled
source file is not proof of the active runtime definition or filesystem location.

For every API seam, inspect the relevant operation in `specs/openapi.yaml`,
`pwa/src/lib/api/api-client.ts` and the affected generated route/models under
`pwa/src/lib/api/generated/`. Backend conventions are Controllers, Services, Dto,
Models and `api/src/RecipeApi/Data/RecipeDbContext.cs`; there is no Features directory.
Database sources are `api/database/schema.sql`, `api/database/compatibility.sql`
and `api/database/migrate.sh`. API contracts, EF entities, JSONB snapshots and
workflow records have distinct shapes; follow explicit transformations.

Mocks live in `pwa/e2e/mock-api.ts`, with `pwa/src/testing/builders.ts` and
`pwa/src/testing/mock-ids.ts`. Preserve method-sensitive route handlers, route
precedence and mutations visible to later reads. Backend factory behavior is in
`api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs`; inspect the selected test's
factory substitutions for required workflow persistence and other side effects.

Use `task agent:slice -- <route>` (`scripts/agent/slice.py`) and `task agent:api`
for static discovery. Preserve this tooling; a partial static map requires source
inspection and does not prove endpoint availability, SQL constraints or async
ordering. Test readiness, duplicate signals, stale results and persistence where
the selected behavior depends on them.
