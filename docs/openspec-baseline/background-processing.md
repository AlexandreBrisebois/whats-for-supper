# Background processing baseline plan

## Current checkpoint and scope

Promoted baseline: **14/42 requirements/scenarios** at A84 (2026-10-16).
This covers recorded slices, not the entire capability.
Runtime qualification remains not-run/deferred under A34. Next action: await a
separately selected bounded slice or lifecycle action; no successor is authorized
by this reorganization. Slice headings and next-step recommendations retained
below are historical; later promotion records supersede earlier draft labels.

Read [AGENT.md](../../AGENT.md) and [shared workflow](workflow.md), then this file.
No other capability plan or full project history is required up front. Follow only
immediate owner/spec dependencies needed for the selected work.

Accepted baseline: [main background-processing specification](../../openspec/specs/background-processing/spec.md).

## Capability map and starting points

| Capability / purpose | Candidate scope and rules to recheck | Source starting point | Existing test starting point | Dependencies / initial confidence |
| --- | --- | --- | --- | --- |
| Background processing: execute and inspect long-running work | Required parameters, dependency validation/promotion, persisted task states, retries/scheduling, stale-task reaping, diagnostics/reset; observable behavior, not a processor-by-processor spec | [orchestrator](../../api/src/RecipeApi/Services/WorkflowOrchestrator.cs), [worker](../../api/src/RecipeApi/Services/WorkflowWorker.cs), [workflow API](../../api/src/RecipeApi/Controllers/WorkflowController.cs) | [orchestrator tests](../../api/src/RecipeApi.Tests/Services/WorkflowOrchestratorTests.cs), [worker tests](../../api/src/RecipeApi.Tests/Services/WorkflowWorkerTests.cs), [reaper tests](../../api/src/RecipeApi.Tests/Services/WorkflowWorkerReaperTests.cs) | Database, configured workflow definitions and processors / high mechanics; exactly-once unestablished |

Shared owners and evidence policy live in [workflow.md](workflow.md). Recheck
these source/test starting points before using them as current evidence.

## Recorded decisions for this capability

Shared A01–A05/A07/A09–A12/A34 decisions are in workflow.md. The records below
retain their original scope; completed stages do not authorize successors.

| ID | Decision | State / authority |
| --- | --- | --- |
| A69 | Record 200/202 mismatch and withhold exact description success status | User selected “Yes—record the mismatch and withhold an exact status requirement” in this session. No contract/application change or resolution of other discrepancies inferred. |
| A79 | Discover and draft shared persisted workflow lifecycle and automatic retries only | User pasted request, 2026-10-15. Authorizes documentation discovery, selected CLI scaffold, proposal/design/background-processing ADDED delta/extraction tasks and durable plan updates. Preserve all promoted requirements and prior work. Stop at validated draft for human review; no application/test/contract/SQL/config changes, runtime/database/model qualification, promotion, archive or successor slice. |
| A80 | Promote reviewed shared workflow lifecycle and automatic retry baseline | User “promote”, 2026-10-15, after validated A79 draft. Create main background-processing with exact Purpose and 14 requirements/42 scenarios; preserve all 216 source identities, five existing mains, selected artifacts, prior work and qualifications. Plan/task follow-up only; no archive, application/runtime/DB/model qualification or successor extraction. |

## Discrepancies and qualifications

These are implementation-supported/static findings, not runtime guarantees.
Cross-capability entries are included where the selected evidence depends on them.

| ID | Finding / risk | Evidence and required extraction treatment | Status / withheld claim |
| --- | --- | --- | --- |
| U01 | Contextual URL repair omits a required workflow parameter | Compare `WorkflowParameters` in [report service](../../api/src/RecipeApi/Services/RecipeImportReportService.cs), required `url` in [URL workflow](../../api/src/RecipeApi/Workflows/url-import.yaml), and [orchestrator validation](../../api/src/RecipeApi/Services/WorkflowOrchestrator.cs). Mocked workflow launch is not real launch evidence. Do not claim successful URL correction. | Open |
| U70 | PDF intake persistence/dispatch and publication are not atomic | BSL-016/017: source/info precede DB save; dispatch exceptions swallowed after persistence; stored workflow/YAML and worker unqualified. Page staging/moves then metadata/DB updates are retryable, not crash-atomic. | Non-normative limits; no rollback, guaranteed delivery, orphan repair or partial-write recovery claim |
| U71 | PDF foreground feedback and ambiguous intake limits | BSL-015/016/018: draft is memory-only, hidden/member/navigation discards it without cancelling upload; pending is added after response, notifications match only this session. HTTP/identity uncertainty warns about duplicates, raw network/JSON Error.message may not. Already-ready finalizer does not republish. | Retained as limits; no resumption, exactly-once intake, universal duplicate warning or replay/event-order guarantee |
| U72 | PDF recovery has generic classification and conditional cleanup | BSL-018: recipe-import failures sourceType photos, generic reason, Settings load errors hidden. Retry queues failed task, does not fix source. Clear/maintenance protect named-plus-images or discoverable recipes even when IsReady false. | Supported conversion-stage cleanup only; unconditional deletion/recovery success and PDF-specific failure copy withheld |
| U73 | PDF native/extraction qualification deferred | BSL-017: fixed render budgets, native fixture/env tests, fake-renderer/service tests and model stubs do not prove production execution/readability. One-recipe guidance does not detect/split multi-recipe input. | A34 not-run; no complete semantic accuracy, device/NAS/resource or deployed provider qualification |
| U74 | Shared PDF entry is conditional browser staging, not OS installation transport | BSL-015: one-slot token claim/expiry and foreground eligibility traced; synthetic stage/visibility overrides do not establish installed OS sharing. Secondary docs describe broader Android/iOS behavior beyond evidence selected here. | Entry dependency only; installation/OS transport/deployment guarantees excluded |
| U75 | Form/API reason and eligibility semantics differ | BSL-recipe-quality-001/002: UI toggles Duplicate separately from content, but contextual merge/legacy data can initialize mixed; OpenAPI/service allow all seven subsets. Mixed Duplicate bypasses content eligibility and stays manual-only. Helper copy/announcement overstates combinations. | Withhold universal UI/API selection equivalence and blanket non-provenance content rejection; no fix authorized |
| U76 | Report submission and import observation have different member boundaries | BSL-recipe-quality-002/003: known member may report without AddedBy match; import-ID GET additionally requires recipe attribution to that member. Factory disables household auth; test asserts owner 200/other known member 404. | Withhold household-wide polling/recovery guarantee; shared identity rules preserved |
| U77 | Observation is in-memory and caller-specific | BSL-recipe-quality-003: only returned started ID initiates detail poll; reload/remount lacks active ID, CooksMode does not poll, 404 retries silently; late submission lacks polling stale guard. | Source limits; no resumed watch, all-caller observation or universal stale submission protection claim |
| U78 | Completion does not resolve reports or guarantee repair/delivery | BSL-recipe-quality-004: connected completion retains ReadyToReview, fatal update best-effort, readiness precedes report completion, later recipe-import task may fail. Prompt mocks do not prove semantic correction. | No automatic resolution, correction accuracy, event-order or terminal-update guarantee; A34 not-run |
| U79 | Immediate response freshness and contract/mock completeness unqualified | BSL-recipe-quality-002/003: relational ExecuteUpdate can leave tracked response pending projection stale; mocks skip real launch validation, ownership/dedup and omit required fields; OpenAPI examples incomplete and 409 description narrower than implementation. | Withhold universal immediate pending state, complete parity and no-orphan guarantee; no contract/client/test fixes |
| U80 | Needs review is explanation, not a separate implemented view | BSL-recipe-quality-007: actual Reported/Ready to review labels through shared responsive Filters; selected secondary chips survive collapse; both flags allowed and ready takes precedence. | No invented Needs review route or separate desktop review control; general search owned by uncreated recipe-search |
| U81 | Active resolution rejection missing from DELETE contract/client errors | BSL-recipe-quality-008: controller returns 409/message for linked Pending/Processing; DELETE OpenAPI/generated metadata list 400/404 only. | Normative rejection retained without disputed exact status/parity guarantee; no contract/client fix authorized |
| U82 | Local resolution does not explicitly refresh loaded parent results | BSL-recipe-quality-008: detail replaces local recipe; page close restores scroll, only deletion callback reruns search; no resolve invalidation/SSE. New persisted reads differ from loaded cards/continuation state. | Withhold immediate parent badge/membership refresh; continuation/general freshness remain recipe-search dependency |
| U83 | Resolution negative/retry/access/real-store gaps | BSL-recipe-quality-009: retry/busy/terminal/missing-linked guards and subsequent reads supported by source; dedicated resolution rejection/retry, cross-member authenticated DELETE, PostgreSQL DELETE/read-after-delete/concurrency not asserted/executed. Pending dismissal and missing stale-target guard remain. | No guaranteed recovery, universal access, cancellation/ordering or runtime/database qualification; A34 stays deferred |
| U84 | Hidden list states and stale mounted retry acknowledgement | BSL-recipe-quality-012/014: mount-only GET, swallowed fetch error, post-response retryingIds, no polling/focus/member/SSE refresh. Browser retry scenario explicitly navigates again. | No pending-dispatch lock, automatic reconciliation or terminal-success claim; baseline records existing behavior only |
| U85 | Retry contract and unreachable conflict branch | BSL-recipe-quality-013: service returns 404/422 through controller; POST contract/generated errors list only 409. AlreadyRetrying enum/controller case is unreachable from current service. DELETE advertises unsupported-version 422 without this implementation branch. | Retain generic retry rejection; withhold exact normative status/ALREADY_RETRYING/parity promise; no contract/client fix |
| U86 | Generic reason and limited provenance classification | BSL-recipe-quality-012: mapper always receives null, fallback English; known-code tests use stubs. Eligible workflows url-import/recipe-import map url/photos, not all OpenAPI sourceType values. | No code-specific diagnosis, localized service reason, description-workflow eligibility or blanket URL/task-name sanitization guarantee |
| U87 | Action races and conditional background effects | BSL-recipe-quality-012/013: repeated pre-response retry possible, clear locks only itself; latest failed task only, count retained; cleanup safety heuristic/files-before-save/no command watch. | No concurrent deduplication/ordering, full workflow reset, immediate recovery, atomic file/DB cleanup, cleanup deadline or completed-cleanup inference |
| U88 | Negative, authenticated and real-store qualification absent | BSL-recipe-quality-014: positive component/module stubs, EF InMemory/default auth omitted, manually invoked maintenance, mocked new-mount browser lifecycle; incomplete required fields in browser failure fixture. | No executed API/browser/worker/database result, missing negative assertions not invented; A34 runtime/DB/model deferred |
| U89 | Missing/invalid definition HTTP status disagreement | BSL-background-processing-001/004: WorkflowRepository throws FileNotFoundException and orchestrator InvalidWorkflowException; controller catches only KeyNotFoundException, middleware otherwise 500, OpenAPI missing-workflow 404. | Withhold disputed HTTP rejection codes; internal rejection drafted; no contract repair |
| U90 | Selection and throttles do not establish exclusive execution | BSL-background-processing-002: SKIP LOCKED query lacks explicit claim transaction through status save; exception fallback; local semaphores; reload checks schedule only; parent status not filtered. InMemory concurrency/throttle assertions do not measure duplicate calls or peak concurrency. | No exactly-once, guaranteed delivery, distributed limits or pause gate; qualification deferred |
| U91 | Completion and partial progression have separate persistence boundaries | BSL-background-processing-002: Completed save precedes caught/logged reconciliation; parent remains Pending during execution; Paused preserved by reconciliation; waiting failed dependencies and independent siblings are not globally canceled. | No atomic reconciliation, terminal immutability, eventual success or undo; source-only completion cases |
| U92 | Retry classification and configuration are narrower and broader than exception labels | BSL-background-processing-003: exact provider/network statuses plus timeout/cancel/HTML/rate-limit message heuristics; FatalWorkflowException is no precedence override; bad schedules/windows/throttle values unqualified. | Draft exact supported predicates/defaults only; no blanket all-5xx, fatal-type or cancellation guarantee |
| U93 | Retry, fatal state, pause and consumer effects can persist separately | BSL-background-processing-003: primary-save failures can leave Processing; pause follows Failed task save; proactive sibling rescheduling/report/event effects isolated; no cross-store transaction or rollback. | Qualify outcomes on successful saves; no complete recovery, notification delivery or automatic issue resolution |
| U94 | Status contract examples, DTO extension and substituted fixtures limit claims | BSL-background-processing-004: dependency names versus UUID examples; implementation result absent from approved WorkflowTaskDto schema; generic data envelope versus unwrapped import-ID read; factory Processing/synthetic task bypasses real YAML/worker. | Withhold result-wire and example-derived rules; real detail lifecycle reads source-supported, runtime not-run A34 |

## Slice evidence and lifecycle records

## Draft slice — background processing / persisted workflow lifecycle and automatic retries

**Authorization A79 (2026-10-15):** User's pasted request explicitly selects documentation-only discovery and drafting of `baseline-background-processing-workflow-lifecycle`, capability `background-processing`, using installed openspec-propose. It authorizes proposal/design/delta/extraction tasks and this plan update; stop at a validated draft for human review. No promotion, archive, implementation, service execution or runtime/database/model qualification.

**Identity and inventory:** HEAD `db6fede90ec0a7dfff26e6050036310bc8211837`. Initial Git status has modified plan/main recipe-capture plus untracked description-entry, PDF-entry, three recipe-quality changes and main recipe-quality; staged diff is empty; private before-images in `/tmp/wfs-background-before` record plan, all existing tracked/untracked file digests and index diff. CLI list/context resolve nearest root `/Users/alex/Code/whats-for-supper`; list --specs confirms five main capabilities, no background-processing. All 198 unique prior evidence source hashes match. Current actual main headers: household-identity **36/92**, recipe-library **55/122**, recipe-sharing **9/34**, recipe-capture **37/92**, recipe-quality **37/92**. Historical counts stay historical. Eighteen prior changes remain active; selected scaffold makes nineteen. No main background-processing spec is created in this drafting session.

### BSL-background-processing-001 — Definition acceptance, snapshot and initial persistence

**Trace:** capture controller → RecipeService.CaptureUrl/photo creation or RecipeImportReportService.SubmitAsync → IWorkflowOrchestrator.TriggerAsync → WorkflowOrchestrator.GetDefinitionAsync → WorkflowRepository.GetWorkflowYamlAsync → IStorageProvider `workflows/<id>.yaml` → ValidateDefinition / SubstituteVariables → EF instance/tasks → SaveChanges/transaction commit → returned instance ID. WorkflowController.Trigger is an additional API acceptance surface; its administration UI/journey is excluded. Program registers real repository/orchestrator/storage/worker and processors. Capture calls can swallow dispatch errors after recipe persistence; report launch has separate compensation and U01. Intake identity is not workflow acceptance.

**Rules:** missing/empty definitions, missing dependency, cycle and undeclared placeholders reject before insertion. Validation/substitution inspect only top-level string payloads. Required parameter validation checks key presence; extra supplied keys remain in instance JSON, blank values are not rejected by that check. Optional `?` absence omits a whole referencing entry, including embedded optional placeholders. Nonstring values pass through; strings substitute then try Boolean/Int64/string. Payloads/parameters and dependency names are snapshots. No registered processor check occurs at acceptance; duplicate names fail dictionary construction, not a promised friendly validation response. Empty task lists have no positive liveness claim.

**Persistence:** instance Guid/Pending/serialized parameters and definition tasks with their own Guids, names/processors/payload/dependency names; roots Pending, others Waiting; only roots receive optional scheduledAt. Initial retry count is zero. EF maps statuses to smallint, parameters/payload/result JSONB and dependencies text[]; SQL/EF FK cascade and timestamp defaults support storage. Transaction covers initial instance/tasks, not caller filesystem/recipe saves or later worker effects. Trigger returns only after commit; errors attempt rollback and rethrow. Generic successful trigger responds 202 data.instanceId through SuccessWrappingFilter. scheduledAt is an internal orchestration argument, absent from the public trigger DTO.

**Inspected assertions:** WorkflowOrchestratorTests uses real orchestrator/repository with InMemoryStorageProvider and TestDbContextFactory EF InMemory (transaction ignored warning suppressed). `GetDefinitionAsync_ValidYaml_ReturnsDefinition`, circular/missing dependency/undefined parameter tests and missing-required test assert concrete validation. `TriggerAsync_SnapshotAtTrigger_CreatesInstanceAndTasks` reads one saved Pending instance and two tasks, Pending/Waiting and substituted recipe ID. OptionalRepairSnapshot asserts saved extraction feedback remains unchanged after dictionary mutation and omission when absent. WithScheduledAt asserts both roots' exact times and Waiting dependent null; WithoutScheduledAt asserts root Pending/null. Rollback, GUID uniqueness across concurrent calls, empty YAML, scalar coercion, extra/blank/nested values and API 202 acceptance have source support only, not inspected runtime proof. U89/U94 retain contract gaps.

**Class/confidence:** implementation-supported, high for aligned initialization assertions, medium for transaction/HTTP boundaries; no tests executed.

### BSL-background-processing-002 — Due work, dispatch, dependency progression and partial completion

**Trace:** hosted WorkflowWorker.ExecuteAsync → ProcessPendingTasks → QueryWithSkipLocked/fallback → ExecuteTaskWithThrottle → new scope/context → ProcessTaskAsync reload → Processing save → matching IWorkflowProcessor.ExecuteAsync → Completed/result save → HandleTaskCompletionAsync → later stored-state reads. Polling waits 500 ms after a nonempty batch and exponentially backs off idle polls up to 60 seconds; no immediate execution promise. Reaping is adjacent excluded ownership, not drafted.

**Selection/dispatch:** Pending and absent-or-due scheduledAt only; order by schedule, limit ten. PostgreSQL FOR UPDATE SKIP LOCKED selection falls back on any exception to ordinary LINQ. No explicit transaction spans selection and status save. Parent status is not a selection predicate. Local worker semaphores initialize ExtractRecipe 1, GenerateHero configured 1 (constructor fallback 2/max 2), SyncRecipe Default 5; other names lazily get 5 regardless of matching extra appsettings keys. No global throttle or distributed lease guarantee. Direct ProcessPendingTasksAsync tests bypass InitializeThrottles. Reload skips a future reschedule but does not recheck Pending or parent state; no status-based compare-and-set claim.

**Progression:** Processing save clears error/stack trace without updating task UpdatedAt there. Matching processor is first registered exact name; no match throws InvalidOperationException into failure handling. Normal return, including no-op/fallback processor results, can count as task success. Non-null result is camelCase JSON; null return leaves any old Result untouched. Completed save and reconciliation are distinct saves, not a single transaction despite the comment. Reconciliation reads all instance tasks, promotes Waiting only when all dependency *names* are Completed; newly promoted work needs a later selection. With no Waiting/Pending/Processing tasks, instance becomes Failed if any Failed, otherwise Completed, except Paused is preserved. Worker does not set initial Pending parent Processing. Concurrent snapshots, failed saves and empty workflows prevent liveness guarantees. Earlier task effects/results remain on a later failure; waiting dependents of failed tasks are not automatically failed, canceled or recovered. Pending independent siblings can still execute under a Paused parent: record limitation, withhold pause-as-execution-gate doctrine.

**Inspected assertions:** Worker_PicksUpPendingTasks_WhenScheduled checks fresh-context Completed and one recorded processor name; Worker_IgnoresUnscheduledTasks checks future Pending and no execution. SimplestCase and LinearChain assert A Completed/B Pending then C Pending after B; DiamondDependencies checks both branches promoted and D Waiting until both complete. No direct instance-completion assertion found in WorkflowWorkerTests; all-completed/Failed reconciliation and missing processor/processing diagnostics clearing are source-supported. `Worker_SkipsLockedTasks_HighConcurrency` starts the same worker object twice, uses EF InMemory and asserts uniqueness of retrieved completed row IDs, not execution counts. `Worker_RespectsSemaphoreThrottle_OneConcurrentExtractRecipe` merely asserts completedCount > 0, not peak concurrency/order. Neither proves its title. No PostgreSQL claim, duplicate invocation, crash/restart, paused-parent gating or multi-worker execution qualification. U90/U91.

**Class/confidence:** implementation-supported; high for asserted dependencies/due selection, medium for dispatch/completion, unqualified delivery/concurrency.

### BSL-background-processing-003 — Automatic retry classification, schedule and terminal persistence

**Trace:** ProcessTaskAsync catch filter → TransientWorkflowException OR AiExceptionHandler.IsTransient OR Is429Exception, combined with retryCount < MaxRetries → increment/Pending/RetryScheduler/saved error → optional rate-limit sibling rescheduling. All other caught exceptions use terminal task diagnostics save then isolated parent pause save. Errors during state saving are caught/logged; these logs do not certify persistence.

**Exact classification:** provider ClientResultException 429/503; HttpRequestException 429/503/504/408; TimeoutException; TaskCanceledException with inner TimeoutException or message containing timeout/canceled; any exception message containing `<!DOCTYPE html>`; worker HTTP 429 or any message containing `429`, `high demand`, `TooManyRequests`, case-insensitive. Predicates inspect the caught exception, not recursive inner exceptions generally. FatalWorkflowException has no unconditional precedence if its message matches. OperationCanceledException may fall into terminal handling; TaskCanceledException can be retried. No claim that every 5xx/network/JSON error is transient. Broad heuristics can match unrelated text; U92.

**Retry arithmetic:** new positive count selects RetryScheduleMinutes[count-1], defaults 1/5/20/60/300 minutes; count beyond length uses next UTC start, today's only before start, otherwise tomorrow even inside current window, plus integer-minute jitter [0, (end-start)*60). Default 01:00–05:00 UTC, MaxRetries 10. Starting at zero permits ten scheduled retries after the initial attempt; failure when count already ten enters fatal handling without count increment. No negative/zero count scheduler validation, positive/sorted schedule enforcement or valid-window qualification inferred. Initialization only warns for decreasing delays. Source config equals retry defaults; malformed config is U92, no repair.

**Saved retry:** same task identity, increment once, Pending/scheduledAt/errorMessage/UpdatedAt; no failure stack trace assigned on transient path (prior trace cleared at Processing). Workflow status is not changed by transient scheduling; no promotion or terminal capture event on that path. Primary retry save first; if it fails processing may remain stuck. For recognized rate limits only, all other same-processor Pending tasks, including future tasks and other instances, get successive +1 minute schedules after primary retry ordered by prior schedule. This may replace a later schedule with an earlier one; no max(existing,new) or provider Retry-After use. Secondary rescheduling failure does not undo primary saved retry. Reload guard supports skipping a future-rescheduled selected sibling. U90/U93 limit cross-context assurances.

**Fatal/exhausted:** task Failed/mapped AiErrorDetail.ToString/ErrorMessage/exception StackTrace/UpdatedAt saved first; then existing parent Paused/UpdatedAt saved separately. Task save failure returns before parent pause; parent update failure is swallowed. RetryCount and ScheduledAt are not reset in fatal handling. Completed siblings and domain/filesystem/provider effects are not rolled back. Parent pause is not global cessation. RecordImportReportFailureAsync and PublishRecipeFailedEventAsync are separately caught consumer effects; report identity guards and capture notifications stay with promoted recipe-quality/capture. Comments referring to instance Failed do not override actual Paused save. No automatic issue resolution, guaranteed notification or recovery.

**Inspected assertions:** transient configured schedule checks first retry ~1 minute and forced-due second ~5, same saved task Pending/count 1 then 2. HTTP/message/numeric 429 tests assert Pending/count plus selected schedules and parent still Processing (seeded that way). Rate-limit sibling test asserts future D later than A by >=0.9 minute and C schedule differs, not all ordering/cross-instance effects. Fatal DivideByZero test asserts Failed/error containing message/non-null stack and Paused parent. ArgumentException test asserts Failed/count zero; exhausted 429 and transient tests seed retryCount at limit and assert Failed/error/Paused, not ten full executed attempts. WorkerTransientFailure checks no recipe_failed; fatal consumer test asserts event/report behavior with doubles for imports and exclusion for indexing, used only to retain existing ownership. Some regression comments still say BUG, not a current failing run.

RetrySchedulerTests includes table-index equivalence, future/window and monotonic-delay properties plus exact 1/5/20/60/300/default-options and before/inside/after-window examples. AiExceptionHandlerTests asserts provider 503 true/400 false, timeout/canceled/HTML/HTTP408 true and mapping status/model/provider; other predicates are source-only. All tests inspected, none run.

**Class/confidence:** implementation-supported; high for asserted schedule/failure paths, medium for heuristics/isolated saves/consumer limits.

### BSL-background-processing-004 — Subsequent reads, concrete consumers and overlap boundaries

**Status representation:** WorkflowController.GetInstance includes all tasks; absent instance returns 404, successful result maps WorkflowInstanceDetailDto/WorkflowTaskDto and wrapping filter to 200 data. Instance statuses are Pending/Processing/Completed/Failed/Paused; task statuses Waiting/Pending/Processing/Completed/Failed, spelled with PascalCase via ToString. Detail includes parameters, IDs, workflow/task/processor names, dependency names (null if empty), retryCount, scheduledAt, errorMessage and timestamps. StackTrace stays off ordinary task detail; internal diagnostics endpoint has it. Task result is implementation-only schema discrepancy U94, withheld normatively. No status inference from task or workflow acceptance and no stable task ordering asserted.

RecipeImportController.GetById requires member context, delegates known-member/AddedBy-associated-recipe checks to RecipeImportService.GetImportByIdAsync and returns same detail unwrapped with SkipWrapping. RecipeDetailSheet.pollImportUntilTerminal uses returned import ID, lowercases status and refreshes recipe detail for completed/failed/paused. API client retains status and drops raw errorMessage. This is observable consumer treatment of saved states, not evidence that all sibling work stops. Existing quality polling/access/recovery requirements remain sole journey owners.

**Concrete workflow consumer:** recipe-import chain convert_pdf → extract_recipe → generate_hero → sync_recipe → categorize_ingredients → categorize_recipe → recipe_ready → complete_import_report → queue_search_index. URL chain starts fetch_url_content and ends complete_import_report. Optional repairReasons/repairNote reach extraction only. RecipeReadyProcessor commits readiness and then updates PDF metadata/publishes ready; report completion occurs later. A recipe can be ready before whole-instance completion and a later task can fail after domain effects. No new acquisition/readiness/indexing/PDF rules drafted. Existing U01 remains: report-service URL launch omits required url, and mock orchestration masks it.

**Assertion/substitution review:** TestWebApplicationFactory substitutes IWorkflowOrchestrator with a mock that persists a Processing instance and one Pending Mock task (or synthetic ConvertPdf when Tests:PdfWorkflow). It neither loads real YAML nor runs hosted WorkflowWorker. RecipeImportReportIntegrationTests.GetImportById_RequiresFamilyAccessToItsRecipe asserts permitted 200/other-member 404 against this factory; no full task/status read assertions there. RecipeImportLifecycleTests asserts newest seeded status, guarded report transitions and actual YAML edges; legacy recipe-scoped route is retired, not restored. RecipeDetailSheet test starts ID polling from Save and stubs Processing then Completed; it does not execute worker/API. WorkflowTaskDiagnosticsIntegrationTests uses authenticated factory with manually seeded Failed states; asserts exact error/stack/status/retryCount, absent 404 and unauthenticated 401; diagnostics journey remains excluded. WorkflowStandardizationIntegrationTests invokes CategorizeRecipe directly with mocked AI; success asserts fields and failure asserts no throw/no vegetarian value, proving why normal return alone does not imply complete content.

PdfCapturePostgresTests uses opt-in real database/schema/local store but retains factory orchestration, drives processor manually and manually sets task Failed/parent Paused before recovery assertions. It does not qualify real orchestration/worker claiming even if executed; not executed here. All integration/runtime assertions remain inspected only. U94 and A34.

**Ownership reuse:** recipe-capture requirements Initial recipe creation and workflow dispatch / Initial recipe persistence and photo workflow dispatch / Create an initial recipe from description intake / Persist a pending PDF before acknowledging intake own intake consequences. Finalize recipe readiness and broadcast completion / Persistent failure banner on workflow failure and PDF recovery own readiness/events. recipe-quality Persist recipe-level feedback before attempting re-import / Observe a returned import ID while detail remains active / Expose guarded contextual processing outcomes / Accept retry by resetting existing failed work / Persist clear and return queued cleanup identity own feedback/manual recovery. Keep their exact text, feature-enabled PDF/U70–U74, A69, U01/U75–U88 and historical qualifications unchanged. Manual trigger/reset/diagnostic UI, reaping, maintenance/cleanup, backup/recovery, indexing, demo, deployment, search/ranking, planning and SSE delivery/reconnection remain deferred to their owners; no additional capability is drafted.

**Class/confidence:** implementation-supported, medium across HTTP/consumer boundaries; inspected substitutions prevent end-to-end runtime claims.

### BSL-background-processing-005 — Complete draft mapping and validation boundary

**Artifacts:** selected CLI metadata `.openspec.yaml`, proposal, design, ADDED background-processing delta (14 requirements / 42 scenarios), extraction tasks and this plan. Drafted for human review, not accepted, promoted, archived or implemented. CLI artifact `done`/planning-complete reports file existence, not review or runtime acceptance. Main specs unchanged; background-processing exists only as this change's new-capability delta.

Every scenario is listed below; numbering is a local mapping convenience, not a new requirement-ID scheme. All rows are implementation-supported. “Asserted” means inspected source assertions, never tests executed this session.

| Delta requirement | Complete scenario headers | Evidence / assertion strength |
| --- | --- | --- |
| 1. Validate workflow definitions before accepting work | Definition unavailable; Invalid dependency graph; Undeclared payload parameter | BSL-background-processing-001: graph/placeholder assertions; unavailable definition source only; U89 |
| 2. Capture supplied parameters at acceptance | Required key absent; Optional snapshot supplied; Optional snapshot absent; Scalar substitution | BSL-background-processing-001: required-key and optional snapshot assertions; scalar source only |
| 3. Persist initial workflow and task identities before returning | Accept a dependency workflow; API acceptance identity; Persistence fails | BSL-background-processing-001: saved Pending/Waiting assertions; commit/rollback/API acceptance source only |
| 4. Apply initial schedules to root tasks | Scheduled roots; No initial schedule | BSL-background-processing-001: exact root schedule/null-dependent assertions |
| 5. Select due pending tasks for processor dispatch | Due and future work coexist; Throttle wait changes eligibility | BSL-background-processing-002: due/future assertions; reload guard/batch bound source only; U90 |
| 6. Record processor execution and successful task completion | Processor returns normally; Processor unavailable; Retry begins execution | BSL-background-processing-002: dispatch success asserted; absent processor/clearing source only |
| 7. Promote dependencies after successful task completion | Linear dependency completes; Multiple prerequisites | BSL-background-processing-002: simplest/chain/diamond assertions |
| 8. Derive completion from remaining task states | All tasks complete; Partial completion; Failed sibling without active tasks; Paused instance reconciles | BSL-background-processing-002: reconciliation source only, no direct instance-completion assertion; U91 |
| 9. Classify automatic retry eligibility at the attempt boundary | Recognized transient failure; Transient provider and network statuses; Timeout and message heuristics; Recognized rate limit; Unclassified failure | BSL-background-processing-003: transient/429/argument and AI examples asserted; remaining predicates source only; U92 |
| 10. Persist retries on the existing task | First transient retry persists; Retry allowance exhausted | BSL-background-processing-003: same task first/second count and exhausted seeded-limit assertions |
| 11. Schedule automatic retries using configured delays and UTC windows | Configured delay sequence; Before quiet window start; At or after quiet window start | BSL-background-processing-003: exact defaults/table and UTC-window example/property assertions |
| 12. Stagger other pending work after recognized rate limiting | Same processor pending work; Secondary rescheduling fails | BSL-background-processing-003: partial same-processor staggering assertions; secondary save-failure source only; U93 |
| 13. Retain terminal task failure and pause its workflow | Fatal attempt and pause persist; Parent update fails after task save; Earlier work already completed | BSL-background-processing-003: Failed/error/stack/Paused assertions; partial saves/retained siblings source only |
| 14. Read stored lifecycle state by instance identity | Read accepted work; Read scheduled retry; Read terminal partial work; Read missing instance | BSL-background-processing-004: DTO/controller/read source; seeded access/diagnostics and mocked polling assertions are narrower; U94 |

**Verification:** selected strict and all-item strict validation passed (24 items / zero failed); explicit six-path documentation verification passed documentation, spec:check and content. Before-image comparison passed preservation of every other existing file and the index, prior plan history (only two current-state table cells replaced), all 216 source identities and complete 14/42 mapping. Final evidence updates require a final verification run; its exact outcome and content identity are recorded in the final response/current `.task/agent-finish/last-run.json`. No source-supported rule is relabeled runtime-verified. Failed: none; blocked: none. Runtime/API/unit/browser/worker/PostgreSQL/model checks are **not-run** by authorization; behavior TDD, contract/client generation, deployment and migrations are **not-applicable**. Failed/blocked checks must be reported separately if any occur.

Explicit final verification selection:

```sh
task verify -- docs/openspec-baseline-plan.md openspec/changes/baseline-background-processing-workflow-lifecycle/.openspec.yaml openspec/changes/baseline-background-processing-workflow-lifecycle/proposal.md openspec/changes/baseline-background-processing-workflow-lifecycle/design.md openspec/changes/baseline-background-processing-workflow-lifecycle/specs/background-processing/spec.md openspec/changes/baseline-background-processing-workflow-lifecycle/tasks.md
```

### Background lifecycle source identities — SHA-256

All 198 unique prior source hashes rechecked unchanged. This manifest records 47 inspected source inputs, 18 newly represented paths, 216 unique evidence source paths overall. Main-spec and prior-artifact hashes are preserved separately by the before-image check; these digests identify inspected content, not passing runtime evidence.

| Source | SHA-256 |
| --- | --- |
| `api/src/RecipeApi/Controllers/RecipeController.cs` | `d1699c2de6f6cca9d879e67c0c7b9c7f0af4b2c4e104bc9ff04634b266eb5a70` |
| `api/src/RecipeApi/Services/IWorkflowOrchestrator.cs` | `401088470fcf96177d276c428961e3e4f9b233ffd49c05a1493b35376089be30` |
| `api/src/RecipeApi/Services/WorkflowOrchestrator.cs` | `9812d17bface86d79fef75eab2ef7668c7c0bde18455c1ea46774b46dcc0b14c` |
| `api/src/RecipeApi/Services/WorkflowRepository.cs` | `1356e4b126077506c07633c2d977a419d96641e8a03f976d45f4e945775214d3` |
| `api/src/RecipeApi/Services/WorkflowWorker.cs` | `69f9023b0003ff2f0a5dda6d85bcb42e13ebf064b5c8529bc6b0866e5b3871df` |
| `api/src/RecipeApi/Services/RetryScheduler.cs` | `e3849aceddc86ccca36766c284c4c90f0bddf65ed7398d7c0140efbf136ff965` |
| `api/src/RecipeApi/Services/WorkflowRetryOptions.cs` | `0937ff63830fbc251598e499848815450cf2aa4a584b4ef31981929655c81ec7` |
| `api/src/RecipeApi/Services/Ai/AiExceptionHandler.cs` | `5021f457d791e5f672ee1acf6fd4b3a85a8b4cc7e51f0310dce02070a86c0d1a` |
| `api/src/RecipeApi/Services/RecipeService.cs` | `9eec9ab5cd7102081b3765b08a41b8de4d45325858d18ab4573a326afa256b74` |
| `api/src/RecipeApi/Services/RecipeImportService.cs` | `3016a8e38da063513813e813fad5f8fddf10f285abfa1ef3e0743c200ac1af14` |
| `api/src/RecipeApi/Services/RecipeImportReportService.cs` | `99776d8ddfb954d0def99460d868d43a3f3f24e08c4459bd30c132959e30acb3` |
| `api/src/RecipeApi/Controllers/WorkflowController.cs` | `055be167e235752cf25d4ae1f95dd0f3842255e1fd8af4b832f847dad2969444` |
| `api/src/RecipeApi/Controllers/RecipeImportController.cs` | `a5fe04c228c90f4f85bc4681df800a74af53d676599cac965c9ba60b27fe550b` |
| `api/src/RecipeApi/Models/WorkflowDefinition.cs` | `b945fafe5f2bcf95606623219f202f20f0106dfa3dd682970a72aa14d7830a5e` |
| `api/src/RecipeApi/Models/WorkflowInstance.cs` | `82d14b99d40c02ec5b10c188a16d190e865fd1b6246bc514ee37021b7d537641` |
| `api/src/RecipeApi/Models/WorkflowTask.cs` | `3408be49a3afafc7ac70d6104124dcfcdd8df7509162ff9186d3581bb30f6e06` |
| `api/src/RecipeApi/Models/Ai/AiErrorDetail.cs` | `75858449e1fb3c8c5946880aca5eaa8e8cf90143d507c76b966abb641b923855` |
| `api/src/RecipeApi/Dto/WorkflowInstanceDetailDto.cs` | `c86b463339d6abc8ab761741a2c670a36077903dfe1090a8faa657655a5375b1` |
| `api/src/RecipeApi/Dto/WorkflowTaskDto.cs` | `722ca2b5e798e3e0c7c4bd82ede8200fcad19b6d15cc0ad6a2e0f4d9d8bdc69d` |
| `api/src/RecipeApi/Dto/WorkflowInstanceSummaryDto.cs` | `bde4eae602427173a99e10840ac73f670f2ff54ad64b374ec3b85d95438f4e93` |
| `api/src/RecipeApi/Infrastructure/LocalStorageProvider.cs` | `5a07af200857eec99fe0dd90f04fd2c1ce3fe4f3f64b86d5abb4eb09ae875225` |
| `api/src/RecipeApi/Infrastructure/SuccessWrappingFilter.cs` | `6fa3cd08587220fc4e18803f6ba020e494b81211cf99c53ec10de23ddd46f11d` |
| `api/src/RecipeApi/Middleware/ErrorHandlingMiddleware.cs` | `b5849eb709ca2bc85efa3051d3a953ca955ef8704848327ad88d0297299d949b` |
| `api/src/RecipeApi/Workflow/IWorkflowProcessor.cs` | `9d3f3ab896a51e711321d02036e25147cbce43b660e242fbbc3b8c47a8853efe` |
| `api/src/RecipeApi/Data/RecipeDbContext.cs` | `92084cf105ec2941e713fca9053609f4974156b6440fb72f9b623cf918916447` |
| `api/database/schema.sql` | `3f7767cd704299374ebdcd89a11709680013ba26a477ad23f41da54e6da55161` |
| `api/appsettings.json` | `589cf8537d72441ec62ae6a5bb514054225aabe193a4c538c2693244bfcde44f` |
| `api/src/RecipeApi/Program.cs` | `a4a2510b9cf0bbeb0e05072ab2bf2b299f4029e449bff17e7386b62f5321c523` |
| `api/src/RecipeApi/Workflows/recipe-import.yaml` | `56977712412ec2c0b5a04495e77edbf3b97a71f92ad5f8da8546b58261de5b0a` |
| `api/src/RecipeApi/Workflows/url-import.yaml` | `6f142f8831390021091f5c3ca9603f056d138719d1904ae72cd75827beb73787` |
| `api/src/RecipeApi/Services/Processors/RecipeReadyProcessor.cs` | `4206f98256cadae88d7be13a44e9d9d18b6c46679ba7b9f0aee0dcef8a848a74` |
| `api/src/RecipeApi/Services/Processors/CompleteRecipeImportReportProcessor.cs` | `0e5d13ababefa89cda1e3bc74e65065d7e9a51a49142a0e96b6b1c50a8e54b4d` |
| `api/src/RecipeApi.Tests/Services/WorkflowOrchestratorTests.cs` | `b4fea10a264c53c902878d97863998031aacca13291e239593e1b123ff476ab3` |
| `api/src/RecipeApi.Tests/Services/WorkflowWorkerTests.cs` | `b701d122fa95c23309741e209dbd2f9f8da40404a0f59e221e2809cc11448434` |
| `api/src/RecipeApi.Tests/Services/RetrySchedulerTests.cs` | `f02bf5379a3bcd50bc9f13e53f1ba29afa2e6afe5448a6cb7897e3f8e566d45b` |
| `api/src/RecipeApi.Tests/Services/Ai/AiExceptionHandlerTests.cs` | `3fb4ef36f32365ae24153227f0f4320326f23881b754dbc7e74b15711f106e15` |
| `api/src/RecipeApi.Tests/Services/RecipeImportLifecycleTests.cs` | `fe4b7249603997be939e0b8a2d790ef88f1eaa1863b7101a2011186f258a04cb` |
| `api/src/RecipeApi.Tests/Integration/WorkflowStandardizationIntegrationTests.cs` | `9c01f4afc3078187642521dc729c7ab11c41d2bd2e2bbc12263e944ad3a5f7fa` |
| `api/src/RecipeApi.Tests/Integration/WorkflowTaskDiagnosticsIntegrationTests.cs` | `f1872365af7fdb74450c1b0f7a48092b00aae208ffad30adb4d03e88f3429813` |
| `api/src/RecipeApi.Tests/Integration/RecipeImportReportIntegrationTests.cs` | `0ed0a2308f813e83ac5742288fd5f8268018e232aeda2778ff44153e888bac75` |
| `api/src/RecipeApi.Tests/Integration/PdfCapturePostgresTests.cs` | `54680e482267de1d1086781df5f587df640a85111d4beb8d03d0ce65a3b142c7` |
| `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` | `0ee567443fc0b5c11fffe631c94ea0407681b371224d8083a0e32b94b280804c` |
| `api/src/RecipeApi.Tests/Infrastructure/TestDbContextFactory.cs` | `4f292fc990b79f5db66d06d166a8317a13748dc0003e2c1f5dc1ed615954db82` |
| `specs/openapi.yaml` | `0fbd27813611e16474ec17a48ede372d5a41af02db3fa9ded82295a6357046ff` |
| `pwa/src/lib/api/recipes.ts` | `f4e70b39a2060bfc5b25010914f78e288321517db5c52c543d103502718dce7a` |
| `pwa/src/components/recipes/RecipeDetailSheet.tsx` | `bbc1bba8f16f3fa305775d072cb1c3850af34a24bd3979e2228b63984ca1a19c` |
| `pwa/src/components/recipes/RecipeDetailSheet.test.tsx` | `21727367dee891c473635cc2eafde324b0f6863e0dd4db1a7e82203d5e650da0` |

### BSL-background-processing-006 — Shared workflow lifecycle main-spec promotion

**Authorization A80 (2026-10-15):** User “promote” following the validated A79 draft authorizes syncing only the reviewed background-processing delta into main plus bounded plan/task follow-up. Installed openspec-sync-specs workflow used; CLI list/context/status resolve the repository root and the sole selected absolute delta path. Current specs instructions obtained successfully before writing. No archive, application implementation, runtime/database/model qualification or successor extraction.

**Result:** New main `openspec/specs/background-processing/spec.md` contains the exact reviewed Purpose body and all 14 requirements/42 scenarios verbatim under a single Requirements heading. Added non-normative evidence/qualification section references BSL-background-processing-001–006, U89–U94 and A34. All 14 mapping rows and 42 scenario headers in BSL-005 remain applicable without alteration. No TBD Purpose or delta operation headings in main. Other actual main headers remain household-identity 36/92, recipe-library 55/122, recipe-sharing 9/34, recipe-capture 37/92 and recipe-quality 37/92.

**Preservation and limits:** Private promotion before-images identify all existing tracked/untracked files, the dirty plan and selected tasks, plus the index. All 216 source identities match; preserve all five prior mains, the full selected delta/proposal/design/metadata, prior active changes/archives and existing staged/unstaged/untracked work. Plan changes are additive records plus current-stage/next-action/phase status updates. U89–U94 retain contract gaps, local throttles/weak concurrency assertions, missing claim/reconciliation guarantees, separate failure/pause/effect saves, broad retry predicates and substituted fixtures. U01/U75–U88, feature-enabled PDF/U70–U74, A69, A34 and all historical qualifications remain. No delivery, recovery, automatic resolution or real-store behavior is newly qualified. Nineteen changes remain active; no archival.

**Verification:** Require strict main/specs/all validation, exact Purpose and requirement-block equality, complete three-path documentation diff review, source/index/other-file and prior-plan preservation, and explicit `task verify` for main background-processing, this plan and selected tasks. Final observed outcomes/content identity belong to the final response/current `.task/agent-finish/last-run.json`. Runtime/API/browser/worker/PostgreSQL/model qualification **not-run** under A34; implementation TDD/client generation/migrations **not-applicable**. No application or successor work.


## Execution prompt

Paste this prompt and replace the session instruction with the desired bounded
scope. The default authorizes review only. Select the model in your host.

```text
Work on the background-processing OpenSpec brownfield baseline in
/Users/alex/Code/whats-for-supper.
Session instruction: Review this capability's checkpoint and recommend the next
bounded slice. Do not generate specs or change application behavior.

Read AGENT.md and its active-host loading rules, then
 docs/openspec-baseline/workflow.md and
 docs/openspec-baseline/background-processing.md.
Use these as the execution context; do not read the full history or other
capability plans unless an immediate dependency requires a specific section.
Resolve installed OpenSpec workflow/root before artifact writes. Preserve staged,
unstaged and untracked work. Recheck source identity and affected evidence.

Current user messages define scope. Reuse recorded decisions without asking for
approval again within already authorized work. Do not infer new drafting,
promotion, archive, implementation or runtime qualification authority from history.
Trace one selected observable journey through source, contracts and actual test
assertions/substitutions. Keep disputed claims non-normative. No application,
test, contract, client, SQL, configuration or dependency edits.

Update this capability plan's evidence/mappings, decisions, uncertainty, artifact
status, session log and next action. Update the small index only if its routing or
summary changes. Validate selected artifacts and run task verify with every changed
path. Distinguish passed, failed, blocked, not-run and not-applicable; source
support is not runtime verification. Stop at the authorized session boundary.
```

## Next-session record

Use this section for new capability sessions after the split. The earlier evidence
and lifecycle records above retain their original chronology.

```text
Session/date:
Branch, commit, relevant dirty inputs:
Current user authorization and selected capability/slice:
Completed discovery/evidence IDs:
Artifact paths and status (draft/validated/accepted/promoted separately):
Human decisions and unresolved questions:
Checks: passed / failed / blocked / not-run / not-applicable, with reasons:
Limitations and excluded assertions:
Exact next bounded action:
```
