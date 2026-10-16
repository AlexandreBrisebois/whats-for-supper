# Design

## Context

See proposal.md for motivation. This is documentation extraction under A77, grounded in BSL-recipe-quality-012–015 in the durable plan. No application architecture changes are proposed. The first observable slice is Profile → Settings → mounted failure-list GET → workflow-backed list response → row visibility. Retry and clear extend that same journey across persistence and background-work boundaries.

## Goals / Non-Goals

**Goals:** Preserve exact request identity, acknowledgement timing, retained state, negative paths and subsequent-read semantics. Separate source-supported behavior, inspected test assertions and executed documentation checks.

**Non-Goals:** Runtime qualification, defect repair, contract synchronization, application TDD, generic re-import, bulk operations, general administration/maintenance, deployment or another baseline slice. No promotion or archival follows this draft.

## Decisions

### Reuse recipe-quality and existing dependency owners

Use ADDED requirements in the existing recipe-quality capability. Its promoted reporting/contextual-processing/manual-resolution requirements remain byte-identical. Failed-capture records are workflow-backed, not saved recipe reports; Retry sends no contextual feedback and Clear does not invoke issue resolution. The alternative of broadening existing issue-resolution requirements would conflate identities and effects.

Recipe-capture remains the owner of URL/photo/description acquisition, extraction, readiness, terminal notifications and promoted PDF recovery. Its exact requirement Recover eligible failed PDF imports using retained work and three scenarios already cover PDF-specific recovery and eligibility-off behavior; do not duplicate them. The delta adds general Settings mechanics and clear safety boundaries only. Household-identity owns shared access/transport; these controller actions add no member-binding or owner filter. Do not turn attribution in a DTO into authorization. Recipe-library retains ordinary deletion/Recycle Bin ownership.

### Preserve the existing representations and API boundary

Profile's Settings button uses PROFILE_SETTINGS; SettingsPageContent always mounts FailedCapturesSection. On mount the section calls captures.ts → generated GET builder → CapturesController.GetFailures → CaptureFailureService.GetActiveFailuresAsync → workflow_instances/workflow_tasks and associated recipes, including soft-deleted recipes. The wrapper maps generated nullable fields/dates to its local representation and falls back from missing workflowInstanceId to id. The server sets both identities to the workflow instance ID. No recipe ID is substituted for row action addressing.

GET returns data.items. DTOs expose provenance, task name/retry count and dates but the row shows only friendlyReason and nonempty previewText. CaptureFailureReasonMapper has known codes, but this service always passes null and returns the generic English fallback; no task error or stack trace is serialized. The generic response remains English even when surrounding Settings labels are localized. SourceType is url for url-import and photos otherwise in the eligible set; the OpenAPI describe alternative does not establish description-workflow inclusion.

### Model retry as persisted eligibility for existing background work

POST by failure ID has no body. RetryAsync selects the latest UpdatedAt failed task, makes it Pending, sets ScheduledAt and both update timestamps to the injected clock, clears ErrorMessage/StackTrace and marks the same instance Processing. It does not reset RetryCount, payload, result, dependencies or other tasks, trigger a new workflow, update a recipe or launch a contextual report submission. SaveChanges precedes 202/data.queued true.

WorkflowWorker independently queries due Pending tasks, with PostgreSQL SQL/skip-locked and an in-memory fallback, then throttles and resolves the stored ProcessorName. Completion promotes dependencies; transient/fatal outcomes can reschedule or pause again. Those general execution policies remain dependencies. There is no synchronous worker invocation or completed-recovery guarantee in this endpoint. Multiple failed tasks and retained exhausted retry budgets limit what one accepted retry can accomplish.

The mounted UI adds retryingIds only after the awaited wrapper resolves; it does not inspect queued. Retry remains clickable during dispatch, with no in-flight deduplication. Once acknowledged it is replaced by Retrying… for that mount; Clear stays available. Rejection adds a shared row error; another attempt does not clear it until success. No polling, event subscription, member-change effect or list invalidation reconciles the mounted section.

### Keep clear acknowledgement separate from residue cleanup

Clear confirms before setting clearingIds, then DELETEs by failure ID. Its lock disables only Clear. Rejection retains the row and uses the same Retry failed guidance; finally releases the lock. Any wrapper resolution removes the row without inspecting cleared or cleanupCommandId. Cancellation sends nothing. Retry/clear races and late overlapping responses have no ordering guard.

ClearAsync accepts only the same paused-failed capture predicate. With an associated recipe, it protects IsDiscoverable OR (nonblank Name AND (ImageCount > 0 OR IsSynthesized)); this is a safety heuristic, not a check of a universal IsReady property. Otherwise it soft-deletes, preserves existing DeletedAt/DeletedBy when present, writes failed-capture provenance and makes discoverability false. The controller supplies no requestedBy, so new attribution is null. One SaveChanges persists a pending DeleteFailedCaptureResidue command and workflow removal; EF and SQL cascade its tasks. The command payload contains recipeId (possibly null), workflowInstanceId, sourceWorkflowId and user-cleared reason; the response returns its generated ID.

Dreaming's maintenance processor reaches ManagementService.ProcessMaintenanceCommandsAsync. It selects up to 50 due pending commands in creation order, records processing/attempts and then dispatches the residue command. The consumer removes a still-present target workflow, independently rechecks recipe safety, recursively removes existing storage and removes an unsafe recipe row. Safe recipes are skipped; absent recipes/no recipe ID produce recorded no-op outcomes. Exceptions record a failed command. Filesystem removal and database persistence are separate effects; no completion, atomic rollback, deadline or automatic retry of failed cleanup is promised. Settings neither watches the command nor displays cleanup status. These are immediate integration dependencies, not a general maintenance specification.

### Keep contract discrepancies and test substitutions visible

POST OpenAPI/generated metadata documents 202 and 409; implementation also returns 404/422. AlreadyRetrying exists in the controller switch but RetryAsync never returns it: sequential second retry sees Processing and yields NotFailedCapture. Do not promise ALREADY_RETRYING or an exact retry rejection status in the delta. DELETE additionally documents unsupported-payload-version 422, with no corresponding branch here. UI action success means wrapper resolution, not validation of acknowledgement booleans. Record these as U84–U88 without modifying contracts or clients.

Component tests replace the entire capture API module and locale function; Settings tests replace the failure section. CaptureFailureIntegrationTests use default EF InMemory, omitted household auth, mocked orchestrator and InMemoryRecipeStore; they assert reset/removal/queued command and manually invoke maintenance for safe deletion/skip. They do not execute endpoint retry through the worker or prove PostgreSQL/filesystem atomicity. Generated contract tests inspect text/file existence. settings.spec.ts uses common empty failure handlers and has no failed-row interaction. search-hardening.spec.ts supplies a stateful retry stub then explicitly navigates again before empty-list assertions; its fixture omits required workflow fields. None is executed here.

## Risks / Trade-offs

- Hidden loading and fetch rejection, post-response retry locking and stale mounted state → document current behavior; do not invent a recovery UX fix (U84).
- Contract/reason/provenance disparities → withhold disputed status, classification and privacy-sanitization claims; retain source details (U85/U86).
- Concurrent actions, multiple failed tasks and external/background failures → conditional statements only; no once-only, ordering or eventual-success guarantee (U87).
- Sparse negative assertions and substituted persistence → distinguish source support from inspected assertions; A34 runtime/database/model qualification remains deferred (U88).

## Migration Plan

No deployment or data migration. Human review of the validated draft is the next step. Promotion and archival require separate authorization. Discarding only this draft would not alter runtime behavior; preserve prior work and plan history.
