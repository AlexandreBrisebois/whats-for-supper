# Background Workflow Engine — Requirements

## Status

**Implemented capability baseline.**

## Current behavior

- **PLAT-02-R1.** YAML workflow definitions are resolved/seeded and `WorkflowOrchestrator` creates durable workflow instances/tasks in the database.
- **PLAT-02-R2.** `WorkflowWorker` claims/processes tasks through registered processors, records status/attempt/error data, and uses retry scheduling. Workflow APIs expose definitions, instances, active work and task diagnostics.
- **PLAT-02-R3.** Domain workflows include imports, contextual re-import completion, search reconciliation, ingredient categorization, management, demo bypass, and Dreaming maintenance. Processors/services own their business side effects and any SSE publication.
- **PLAT-02-R4.** Workflow acceptance is distinct from completion/failure; callers must use their domain status/projection rather than treating trigger success as recipe/search readiness.

## Limits and boundaries

The engine does not supply a uniform family-facing progress/retry UI or exactly-once external-side-effect guarantee. YAML/processor changes are workflow-owner work; QUAL-02, CAP-06/07, PLAT-03/04/05/06 and schedule maintenance own their domain contracts and recovery.
