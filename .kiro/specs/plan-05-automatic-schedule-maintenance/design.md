# PLAN-05 — Automatic schedule maintenance: design baseline

## Integration map

At host startup, `DreamingWorkflowSeederHostedService` resolves and runs `DreamingWorkflowSeeder`. The seeder asks `CronScheduleCalculator` for the next configured UTC cron occurrence and calls `IWorkflowOrchestrator.TriggerAsync`. The YAML workflow is the ordering authority: `FinalizeOverdueMealsProcessor` calls `ScheduleService`, then search filter materialization depends on that task, and reschedule depends on the report.

`ScheduleService.FinalizeOverdueMealsAsync` is the durable mutation boundary over `CalendarEvent` and `Recipe`. Its injected `IClock` derives today; it performs a save/recalculate transaction for the distinct recipe IDs and uses `IScheduleEventPublisher` to emit `ScheduleDays` per affected Monday. There is no controller/OpenAPI operation for this automatic mutation. Browser consumption, where relevant, is the existing `week_updated` SSE path in PLAN-01/`plat-01`.

## Dependencies and evidence

`plat-02-background-workflow-engine` owns workflow execution/retry; `plat-03-recipe-search-indexing` owns the downstream materialization; PLAN-03/`groc-01` own interactive schedule/grocery mutations. Evidence includes `DreamingWorkflowSeederTests.cs`, `WorkflowProcessorTests.cs`, `ScheduleServiceTests.cs`, `DreamingFilterMaterializationWorkflowTests.cs`, and `Workflows/dreaming.yaml`.
