# Background processing baseline plan

## Current lifecycle checkpoint — consolidated, 2026-10-16

This capability's main spec now contains **30 requirements / 98 scenarios**.
All baseline source changes were archived after the user's explicit approval;
there is no active baseline extraction/promotion queue. Historical checkpoint,
next-session and "changes active" text below records earlier sessions only.
Evidence limitations and unresolved findings remain in the [live backlog](backlog/README.md).
See [consolidation completion](backlog/consolidation-completion.md) for accepted
scope, preserved corrections, archive warnings and verification. Archival does not
establish application correctness, runtime qualification or resolution of defects.

## Current checkpoint and scope

Promoted baseline: **30/98 requirements/scenarios**, including the remaining shared
behavior delta promoted on 2026-10-16 (**16/56** added; BP-R01 and
BSL-background-processing-007–013). The original 14/42 baseline and Purpose are
preserved. Runtime qualification remains not-run/deferred under A34; retained
qualifications and exclusions still apply. Promotion documents supported behavior
without establishing implementation acceptance or runtime recovery guarantees.
No application changes or archival were made. Earlier slice headings and next-step
recommendations below are historical.

Read [AGENT.md](../../AGENT.md) and [shared workflow](workflow.md), then this file.
No other capability plan or full project history is required up front. Follow only
immediate owner/spec dependencies needed for the selected work.

Accepted baseline: [main background-processing specification](../../openspec/specs/background-processing/spec.md).

**Phase-12 reconciliation R12 (2026-10-16):** Recorded promoted documentation remains 30 requirements / 98 scenarios; no additional supported extraction gap was found within this plan's explicit boundary.
[Cross-capability review](reconciliation.md) records current inventory, shared-owner
reconciliation, evidence drift and exclusions. Current main SHA-256: `7023ac794f9119ec995215a431f9667934c69434a22815c2a9e40dbddc796e76`.
This session grants no new acceptance or promotion. Earlier session-specific
“current user” and next-action statements retain their historical scope. A34 and
all local unresolved/excluded behavior remain in force; runtime checks are not-run.


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

## Remaining shared capability generation — BP-R01, 2026-10-16

**Authorization:** User's pasted “Complete generation of the WFS background-processing OpenSpec baseline” request authorizes documentation-only discovery/generation of ALL remaining implemented shared behavior, continuing through the bounded journeys. This supersedes the historical await-selection checkpoint for discovery/drafting only. It explicitly forbids application/test/API contract/generated/SQL/config/dependency edits, services, runtime/unit/API/browser/network/database/model qualification, promotion, archival and another capability. The named change is `baseline-background-processing-remaining-shared-behavior`; installed openspec-propose was used. Local BP-prefixed decisions/uncertainties avoid collisions with historical global IDs.

**Current identity:** Repository `/Users/alex/Code/whats-for-supper`, branch `moving-to-openspec`, HEAD `04a1c4570f9bbb01b47436790d4248635ac3179a`. Entry status and staged diff were empty. Private before-images, all tracked/untracked file SHA-256 values and staged patch are in `/var/folders/7x/450tvgfj1lg2gx9p89txzx0w0000gn/T/wfs-background-remaining-0mqe6xu8`; overlapping plan/index and complete promoted spec bytes were captured before edits. CLI list/context resolve nearest repository root, schema `spec-driven`; no init/reconfiguration. Entry inventory: 35 active changes and eight main capabilities: background-processing 14/42, household-identity 36/92, household-live-updates 15/38, meal-planning 49/114, recipe-capture 37/92, recipe-library 92/201, recipe-quality 37/92, recipe-sharing 9/34. Counts are actual headers, not historical checkpoint labels. Selected scaffold adds one active change. Retired background-task-navigation remains absent.

### Complete coverage matrix

Classifications: **covered** = exact promoted requirement; **missing/supported** = newly extracted implementation-supported rule; **disputed/incomplete** = withheld normative claim; **other owner** = explicit boundary; **absent** = no implemented selected surface. All source evidence is static; no row implies runtime verification.

| Behavior / executable surface | Classification and exact disposition |
| --- | --- |
| Stored YAML validation, dependencies/cycles/placeholders | covered: **Validate workflow definitions before accepting work**; BSL-001 |
| Required keys, optional omission, parameter/payload snapshots/scalars | covered: **Capture supplied parameters at acceptance**; BSL-001 |
| Initial identities/Pending/Waiting, transaction/rollback and trigger 202 identity | covered: **Persist initial workflow and task identities before returning**; BSL-001 |
| Root schedules/dependent unscheduled/earliest eligibility | covered: **Apply initial schedules to root tasks**; BSL-001 |
| Due Pending selection, batch ten/order, reload future-schedule skip | covered: **Select due pending tasks for processor dispatch**; BSL-002 |
| Processing save/diagnostics clearing, matching dispatch, normal completion/missing processor | covered: **Record processor execution and successful task completion**; BSL-002 |
| Dependency-name promotion/next selection | covered: **Promote dependencies after successful task completion**; BSL-002 |
| Active-task completion derivation/Failed/Paused retention | covered: **Derive completion from remaining task states**; BSL-002 |
| Exception/status/message classification and allowance | covered: **Classify automatic retry eligibility at the attempt boundary**; BSL-003 |
| Existing identity, count increment, Pending/schedule/error, exhaustion | covered: **Persist retries on the existing task**; BSL-003 |
| Configured delays/defaults/UTC quiet window | covered: **Schedule automatic retries using configured delays and UTC windows**; BSL-003 |
| Rate-limit same-processor rescheduling/independent save | covered: **Stagger other pending work after recognized rate limiting**; BSL-003 |
| Terminal error/stack, separate parent pause, retained earlier effects | covered: **Retain terminal task failure and pause its workflow**; BSL-003 |
| GET instance detail, parameters/tasks/status/identity/diagnostic fields/timestamps, 200 data and missing 404 | covered: **Read stored lifecycle state by instance identity**; BSL-004. No task ordering promise; no duplicate detail requirement |
| Generic five-operation auth/member/role scope | missing/supported: BSL-007, shared-access ADDED requirement; household-identity credential policy reused |
| Trigger valid parameters binding, no HTTP schedule; GUID-constrained routes | missing/supported: BSL-007, binding ADDED requirement |
| Missing definition/invalid-definition HTTP responses; omitted/null parameters acceptance | disputed/incomplete: U89/BP-U01; rejection internal rules retained, exact disputed HTTP/binding acceptance withheld |
| GET active persisted Processing/Paused filter, descending UpdatedAt, summary fields, empty data array | missing/supported: BSL-008, active-list ADDED requirement |
| Active taskCount accuracy | disputed/incomplete: BP-U03; field is exposed but query omits task Include; accurate database count withheld |
| GET diagnostics any task status, full stored fields/stack/nulls/envelope and missing task | missing/supported: BSL-008, diagnostics ADDED requirement |
| Generic reset all five states, mutations/retention/parent lookup, repeated reset/missing task/save response/later eligibility | missing/supported: BSL-009, two reset ADDED requirements; failed-only/admin promises withheld BP-U02 |
| Reset orphan successful save, overlapping reset/worker outcome, cancellation/exclusivity/whole-workflow recovery | disputed/incomplete: BP-U04/U90/U93; attempt/call boundaries recorded, store/race guarantees withheld |
| Hosted first/periodic reclamation, strict interval/cutoff, field retention/count/error/save/catch/cancellation/later dispatch | missing/supported: BSL-010, four reclamation ADDED requirements |
| Reclamation deadline, processor liveness/heartbeat, exclusive recovery, retry-bound poison handling, successful restart | absent mechanisms / disputed guarantees: BP-U04; no heartbeat/lease/cancellation/limit gate implemented in reaper |
| Hosted idle/busy/error waits and local processor slot configuration | missing/supported: BSL-011, polling and local-slot ADDED requirements |
| Processor return result storage/non-null replacement/null retention | missing/supported: BSL-011, stored-result ADDED requirement; wire extension still withheld U94 |
| Generic StartWorkflow child acceptance, schedule, parameters and independent completion | missing/supported: BSL-012, child-launch ADDED requirement; no child-completion/dedup/atomicity promise |
| UTC cron configuration/numeric matching/future minute/horizon/errors | missing/supported: BSL-012, child-cron ADDED requirement; full-standard compatibility withheld BP-U05 |
| PruneWorkflows terminal persisted history eligibility/cutoff/counts/defaults/cascade and rereads | missing/supported: BSL-013, pruning ADDED requirement; only shared workflow records included |
| Generic workflow UI, PWA wrapper/store/feedback or admin-role implementation | absent: REST examples and generated builders/mock routes exist, no connected PWA journey found; do not restore retired navigation spec |
| Capture readiness/failure effects and recipe-specific processors | other owner: recipe-capture; record directly invoked boundaries BSL-003/004 only |
| Contextual import watch/repair and capture-failure Retry/Clear | other owner: recipe-quality, including U01/U75–U88; BSL-009 compares but does not absorb |
| Shared credentials/member context and SSE delivery/reconnect | other owner: household-identity / household-live-updates |
| Search/indexing, model quality, grocery/planner/cooking, notifications, maintenance-command contents, backup/restore, demo, deployment and job-specific seeder/report policies | other owner/excluded: trace only generic entry/return, no processor-by-processor or unrelated job audit |

No implementation-supported remaining shared row is deferred to another generation slice. Withheld claims and excluded owners are explicit dispositions, not accepted guarantees. This closes generation discovery under BP-R01; it does not close human review, promotion or runtime qualification.

### BSL-background-processing-007 — Generic API entry, binding and access

**Actor/entry/trace:** API-only household operator → actual `api/src/RestClient/07-workflow.rest` trigger/detail/active/reset requests and `09-reimport-investigation.rest` diagnostic request → OpenAPI five workflow paths → Program global AuthorizeFilter → WorkflowController actions → orchestrator or EF reads/save → DTOs/SuccessWrappingFilter → REST response and explicit reread. REST calls are direct HTTP, not generated-client consumers. Generated `pwa/src/lib/api/generated/api/workflows/` builders provide the same five methods; generated model mappings parse GUIDs, Date values, PascalCase enums, diagnostic stack/error and nested data. Generic request/instance parameter maps are generated AdditionalData containers; availability does not establish consumer serialization round trips. No workflow endpoint caller/wrapper/store/display is connected in `pwa/src` outside generated code (searched literal routes and workflows member access). Real recipe detail observation uses recipe-import endpoints, not these generic APIs; retain its existing BSL-004 ownership.

**Access:** Program requires an authenticated user globally; WorkflowController has no AllowAnonymous override, administrative role, familyMemberId parameter, member lookup or recipe attribution filter. FamilyMemberIdModelBinderProvider is name/type activated and is not invoked for workflow/task IDs. Shared HearthAuthenticationHandler handles household header/Bearer/cookie paths; credential policy is reused from household-identity. OpenAPI operations inherit global HearthSecret security. Diagnostic prose saying Hearth administration only does not add a role. Missing credentials challenge before action: source-supported 401, diagnostic auth assertion inspected separately below. No per-user tenant or member partition invented.

**Binding/response:** Trigger uses ApiController FromBody DTO with initialized Dictionary<string,string>; valid JSON passes request.Parameters to TriggerAsync without scheduledAt. Malformed JSON/incompatible dictionary shapes reject at binding; exact validation error payload/status is not extracted. Empty body is framework-invalid; `{}` leaves initialized dictionary, unlike OpenAPI required parameters. Explicit null is not a supported success guarantee. GUID route constraints cover detail, diagnostics and reset; bad GUID does not enter those actions (not the same as a missing-row 404 body). Trigger catches KeyNotFoundException but repository throws FileNotFoundException, invalid definitions InvalidWorkflowException; middleware maps these latter types to generic 500 versus advertised missing-definition 404, preserving U89. Its ArgumentException/KeyNotFound/UnauthorizedAccess mappings are 400/404/401 with status/message; other exceptions generic 500/message. Do not normatively assign definition codes or universal error envelopes. SuccessWrappingFilter yields 202 data.instanceId and 200 data for all other selected success objects; controller 404 message objects stay unwrapped. No trigger Location, schedule request or cancellation endpoint exists.

**Assertion/substitution limits:** Orchestrator tests use InMemoryStorageProvider/TestDbContextFactory EF InMemory with ignored transaction warnings; inspect graph/required/snapshot/schedule assertions retained BSL-001. No actual generic-trigger binding/auth endpoint test observed. All are source support, not relational acceptance evidence. Confidence medium for access/binding, high for direct argument/DTO/envelope mapping. Runtime not-run under BP-R01/A34. Disposition drafted.

### BSL-background-processing-008 — Active list and task diagnostics

**Active trace:** REST active GET → generated active builder/OpenAPI data array → WorkflowController.GetActive → WorkflowInstances Where Processing OR Paused / OrderByDescending UpdatedAt / ToListAsync → WorkflowInstanceSummaryDto.FromModel → Ok → wrapping filter. No pagination, member filter, task-status filter or tasks Include/lazy-loading configuration. Pending parents can have eligible work yet be absent. Fields id/workflowId/status/createdAt/updatedAt/taskCount; taskCount uses initialized `instance.Tasks.Count`, not a database aggregate. Fresh context can report zero despite persisted children. No reliable task cardinality/tie-break ordering claim. Empty returns data:[]; database failures follow middleware, not an empty-success fallback.

**Diagnostics trace:** REST investigation GET → generated diagnostics builder/OpenAPI → GetTaskDiagnostics Include Instance / TaskId lookup → mapper → Ok/data. Any existing task status is accepted; nullable error and stack included, along with taskId/instanceId/workflowId/taskName/processorName/status/retryCount/createdAt/updatedAt. No schedule/result/payload/dependencies projection here. Missing task returns 404/message Task not found. Missing parent is not guarded by mapper and is not a supported diagnostic success case; SQL requires parent FK, EF maps required cascade. DTO distinction keeps StackTrace off ordinary detail. No UI reread/store feedback is implemented.

**Actual assertions:** WorkflowTaskDiagnosticsIntegrationTests uses CreateWithAuthAsync/CreateAuthenticatedClient, seeds a Failed parent/task with synthetic error and stack, asserts 200/data IDs, workflow/task/processor names, Failed, retry two and exact error/stack; absent task 404; anonymous 401. It does not assert timestamps, non-Failed/null-error cases, other four routes' authentication or a real worker-generated failure. Factory creates a separate TestServer app (not production Program), auth explicitly enabled only here, EF InMemory by default; storage/orchestrator substitutes and worker not registered. No active filtering/count/order test found. PWA mock instance is unwrapped; trigger 200/unwrapped; reset data.success differs from actual data.message. Diagnostics fixture aligned shape, active static []; handlers ignore method/state and prove no mutation/reread parity. Implementation-supported, medium confidence; inspected assertions only, runtime not-run. Disposition drafted with taskCount accuracy withheld.

### BSL-background-processing-009 — Generic reset versus capture-failure Retry

**Trace:** REST POST with taskId/no body → generated reset builder/OpenAPI data.message → WorkflowController.ResetTask → tracked WorkflowTasks.FirstOrDefaultAsync → mutate → existing navigation or WorkflowInstances lookup → one SaveChangesAsync → Ok/message → wrapping filter → manual GET instance/diagnostics can show stored reset if no intervening writer. No connected UI/store success rendering. Missing task returns 404/message Task not found before mutation/save. Save exceptions propagate to middleware; no success or rollback/transaction guarantee beyond store behavior.

**Exact reset:** Any existing Waiting/Pending/Processing/Completed/Failed task becomes Pending, RetryCount=0, ScheduledAt=DateTimeOffset.UtcNow, ErrorMessage/StackTrace=null. Retained TaskId/InstanceId/TaskName/ProcessorName/Payload/DependsOn/Result/CreatedAt/UpdatedAt. Controller does not assign task UpdatedAt. Parent lookup changes only found Paused to Processing, retaining parent UpdatedAt/CreatedAt/parameters/identity. No sibling resets or dependency evaluation. Schema/EF insertion NOW defaults are not update triggers; no SaveChanges override/concurrency token was found. Single save includes parent mutation when present, no explicit transaction established. Parent absent branch still attempts task save, but relational FK forbids treating an orphan as a normal persisted success; InMemory cannot qualify it.

**Repeated/overlap/processing:** Sequential reset repeats assignment/current schedule on same identity, not a new trigger. No failed-only guard, optimistic version, lock, compare-and-set, cancellation or idempotency key. Reset of a running task can race worker completion/retry/fatal writes. No source-established winner for overlapping resets or worker/reset, no guaranteed cancellation or dedup. Pending+due selection later ignores parent status and dependency names; reload checks only schedule, so no whole-workflow recovery/terminal immutability claim. Until a subsequent processing save, cleared diagnostics are observable if no intervening writer; Result remains internal, U94 wire mismatch retained.

**Owner comparison:** CaptureFailureService.RetryAsync takes workflow-instance ID, requires Paused + url-import/recipe-import + Failed task, chooses latest failed UpdatedAt, retains RetryCount, advances task/parent UpdatedAt using IClock and resumes Processing. Generic reset takes task ID and zeroes count without those guards/timestamps. Do not change or reextract promoted recipe-quality **Accept retry by resetting existing failed work**. Its NotFound/NotFailedCapture/contract limitations U84–U88 stay intact.

**Evidence:** Source-only generic reset; no dedicated reset/controller assertion found in inspected tests. Comment/OpenAPI/REST failed-only summaries are not guards. Confidence high for assignment/retention, unqualified relational/race/overlap effects. Runtime not-run; no repair. Disposition drafted as specifically requested actual state behavior, with BP-U02/BP-U04 limits.

### BSL-background-processing-010 — Hosted stale-task reclamation

**Registration/time trace:** Program AddHostedService<WorkflowWorker>, WorkflowRetry options and scoped RecipeDbContext → ExecuteAsync InitializeThrottles (outside loop try) → initial _lastReapTime MinValue → strictly elapsed >5 min → ReapStaleTasksAsync → record UtcNow after returned call → pending selection/await all attempts → busy/idle delay. No independent timer; long processors, startup errors, cancellations or slow queries can postpone checks. Initial reaping requires successful initialization/loop entry. Reaper uses DateTimeOffset.UtcNow, not injected IClock; constants interval five and stale fifteen minutes are not WorkflowRetry configuration.

**Query/mutation:** scoped EF query Processing AND UpdatedAt < UtcNow-15 min, strict cutoff; no CreatedAt/ScheduledAt predicate, parent status, max retries, limit/order or live-processor check. Each selected task Pending, RetryCount++, UpdatedAt current UTC and ErrorMessage `Reclaimed by Zombie Reaper (stuck in Processing since {originalTime:u})`. Retain schedule/stack/result/payload/dependency names/identity/CreatedAt; parents untouched. One SaveChangesAsync for nonempty selected list, none for empty. Query/mutation/save broad catch logs all Exceptions including cancellation; returned failure still advances _lastReapTime. No partial-save/atomicity/concurrency success is asserted. Next pending selection reuses due schedule; future retained schedule still waits. Diagnostic read can expose reclamation error with retained older stack; ordinary instance detail exposes count/schedule/error.

**Interaction limits:** Processing entry clears error/stack without advancing UpdatedAt, so age is last stored update, not necessarily processor-start time. No heartbeat/lease/exclusive claim/cancel/join of running processor; its later write can conflict with or replace a reaper write. RetryCount increments without maximum test; later automatic caught-failure path alone checks its max. Repeated stale reclamation is not bounded poison recovery and success/restart is not proved. Paused/Completed parent not a selection gate. Cancellation caught in reaper does not mean the host ignores cancellation forever: subsequent query/delay receives the same token, outer OperationCanceledException breaks the loop. Processor cancellation still has U92 handling limits.

**Actual assertion:** WorkflowWorkerReaperTests.ZombieReaper_ShouldReclaimStaleTasks seeds one Processing task with UpdatedAt=real UtcNow-20min and count zero under a Processing parent in shared EF InMemory. Reflection invokes private reaper once with CancellationToken.None; fresh context asserts Pending/count one/error contains prefix and exact prior universal-time string. Does not assert strict equality cutoff, other statuses, retained fields, UpdatedAt advancement, parent states, retry maximum, cancellation/failures, initial/periodic loop, restart, real processors, PostgreSQL locks/transactions or duplicate calls. Wall clock not frozen. Confidence high for narrow asserted mutation, medium source-only timing/negative/retention rules; runtime not-run. Disposition drafted.

### BSL-background-processing-011 — Remaining worker loop, throttle and result boundaries

**Loop:** ProcessPendingTasks attempts PostgreSQL SKIP LOCKED then catches any query exception for fallback Pending/due/order/take-ten query, awaiting Task.WhenAll of selected tasks, returning selected count (not successful completions). Existing U90 retains claim/transaction/cancellation limits. Positive count resets idle and 500ms delay; empty count increments idle, 500*2^idle cap 60000ms (first 1000). Outer OperationCanceledException breaks; other errors log then token-cancellable 1000ms delay. This is polling behavior, not a start/reclamation SLA. Initialization failures occur before loop catch; no universal self-restart rule.

**Throttles:** InitializeThrottles reads WorkflowThrottle Default=5, ExtractRecipe initial=1/max=1, GenerateHero initial=2/max=2, SyncRecipe initial=Default/max=Default. Unknown processor gets hardcoded five even when Default differs. WaitAsync before independent task context; entered slot released in finally; wait cancellation rethrows. Invalid/zero counts/configuration and concurrent dictionary creation unqualified. Existing tests' completed-count-only/unique-row assertions do not prove peak concurrency or exact-once dispatch (U90). Do not infer distributed throttling.

**Result:** ProcessTaskAsync serializes non-null processor result using JsonDefaults.CamelCase before Completed save; null return leaves old result (including after reset) intact. Completion/reconciliation remain separate saves U91/U93. Internal result is JSONB per entity/EF/SQL; no universal output schema. WorkflowTaskDto includes Result but approved schema/generated mapped properties omit it U94; stored-result extraction does not promote a wire field.

**Assertions/confidence:** BSL-002/003 inspected worker assertions reused, not reexecuted. Busy/idle/error timing, local defaults/unknown processor, null-result retention and failure/cancellation bounds are source-only. Implementation-supported, medium; no runtime/host qualification. Disposition drafted.

### BSL-background-processing-012 — Generic child workflow acceptance and cron scheduling

**Trace:** Program registers scoped WorkflowProcessor as IWorkflowProcessor and singleton CronScheduleCalculator/IClock → actual dreaming.yaml StartWorkflow tasks (also other job definitions) → shared dispatch → ParsePayload JSON camelCase options → resolve schedule with IClock.UtcNow → orchestrator.TriggerAsync(workflowId, parameters ?? [], scheduledAt) → promoted persistence/root rules → StartedWorkflowResult(child workflow ID, instance ID, schedule) → launching-task completion result save → detail can address child by ID. No persisted parent-child foreign key, cancellation linkage or implicit await child tasks. Child save and parent-task save are independent; retried launches may create additional children. Job-specific policy/seeder recurrence and child processor work remain excluded.

**Rules/errors:** Blank payload/nonblank workflowId validation and malformed JSON throw before acceptance. Missing/blank cron gives null schedule; missing parameters uses empty dictionary. Nonblank cron is resolved before triggering, so parse/config/no-occurrence errors create no child through that attempt. Orchestrator rejection uses promoted rules, worker exceptions use existing classification. No HTTP scheduling argument exists; this is processor-level launch.

**Cron details:** Trim expression; whole `${NAME}`/`${NAME:-fallback}` regex; nonblank configuration first then nonblank fallback else InvalidOperationException. Five numeric fields minute 0–59/hour 0–23/day 1–31/month 1–12/weekday 0–7; comma lists, `*`, ascending ranges, positive slash steps. Scalar step iterates scalar-to-scalar, not a full cron-standard expansion. Weekday 7 normalized to Sunday 0; range bounds evaluated before normalization. All fields AND, including day-of-month and weekday. UTC cursor = clock converted UTC plus one minute, truncated to seconds zero; scan by minute through cursor+five years inclusive then throw. Invalid values, zero step, invalid ranges/field counts throw. No names/seconds/timezone/DST or full-standard compatibility claim; BP-U05. Configuration expressions are whole strings, not generic interpolation. Extreme configuration/overflow/resource guarantees not established.

**Actual assertions:** WorkflowProcessorTests uses real orchestrator with InMemoryStorageProvider and EF InMemory/ignored transactions; FixedClock. Immediate case asserts result workflow ID/null schedule and one Pending child task/null schedule, not processor execution. Scheduled case config override 04:30 at fixed 03:00 asserts returned/root schedule. CronScheduleCalculatorTests deterministic daily before/exact start next-day, configured override and weekly Monday examples. No error/grammar/boundary/child retry/concurrency/relational assertion found; those are source-only. Implementation-supported, high narrow asserted examples/medium remainder. Runtime not-run. Disposition drafted.

### BSL-background-processing-013 — Terminal workflow-history retention and final extraction review

**Narrow extra scope justification:** A complete shared workflow persistence audit reveals deletion affects generic detail/diagnostic existence. Follow only `PruneWorkflows`, not the other ManagementProcessor branches. Program registration → dreaming.yaml prune retentionDays seven → generic worker → ManagementProcessor.GetRetentionDays → ManagementService.PruneWorkflowsAsync → IClock.UtcNow minus days → Include Tasks, parent Completed OR Failed, UpdatedAt strictly before cutoff → count children, RemoveRange parents, SaveChanges → WorkflowPruneResult counts → worker result persistence. EF required parent relationship and SQL ON DELETE CASCADE support removal of children; no relational runtime proof. Successful later detail/diagnostics use the promoted missing-target behavior. Failures propagate into existing worker policy; no deletion/recovery guarantee when save fails.

**Retention limits:** Default seven on blank payload, absent property or numeric TryGetInt32 false; explicit Int32 passed as-is with no positivity guard. Invalid JSON or incompatible JSON kinds can throw rather than always default. Parent Paused (including terminal task failures that pause parents), Pending/Processing and cutoff equality retained; recent terminal retained. No guarantee of scheduled pruning, eternal history, recovery, backup, notification or domain/file cleanup. Job schedules/seeding/report delivery are outside this scope.

**Inspected assertion:** ManagementServiceTests.PruneWorkflowsAsync_RemovesOnlyOldTerminalWorkflowHistory uses TestWebApplicationFactory default auth omitted/EF InMemory and real-time IClock; seeds old Completed/Failed, recent Completed and old Processing. Asserts returned two instances/two tasks and remaining workflow IDs, not a direct post-delete task query, strict boundary, paused parent, malformed payload, authenticated host or PostgreSQL cascade. Inspect only, no test execution. Medium confidence source and narrow assertions.

**Complete mapping and review:** Prior BSL-005 mapping remains exact for main 14/42. New mapping below covers every new requirement and all 56 scenario headers; each row maps all its listed scenarios to the indicated evidence entry, whose source-only versus assertion limits apply. All earlier evidence/history/qualifications are retained. Discovery covers the complete matrix, including disputed, absent and other-owner dispositions; no named starting point alone is used as a completeness claim.

### Additional discrepancies and withheld claims

| Local ID | Observation and normative treatment |
| --- | --- |
| BP-U01 | OpenAPI requires parameters, DTO initializes an omitted property to an empty dictionary; invalid/missing-definition errors U89 differ from documented codes. Withhold omitted/null-field successful acceptance and disputed error HTTP/parity claims; no repair. |
| BP-U02 | Reset and REST/OpenAPI summaries say failed, source accepts every state. Diagnostics prose says administration, source uses shared household auth only. User explicitly requested actual states/access, so extract actual guards and preserve this discrepancy; no failed-only/admin-role or new UI rule. |
| BP-U03 | Active taskCount uses an unincluded Tasks collection without configured lazy loading; examples show positive counts. Withhold accurate database task counts, while documenting projected field and filter/order. |
| BP-U04 | Reset does not update timestamps/cancel live work; processing entry does not refresh UpdatedAt; reaper has no heartbeat/parent/max gate. Orphan branch attempts save but FK forbids normal relational orphan persistence. Withhold race winners, dedup/exclusivity, deadline, bounded poison recovery, successful restart, terminal immutability and atomic parent/effect recovery. U90–U93 remain. |
| BP-U05 | Child cron uses numeric five-field AND matcher and limited configuration expression; child launch and parent completion save independently. Withhold full cron-standard compatibility, child completion/recurrence/dedup/atomicity and recurring-job guarantees. |

U89–U94, U01/U70–U88, A34 and A69 remain open/qualified exactly as before. No apparent discrepancy is silently resolved through contract edits. No consequential unanswered user decision blocks supported extraction: disputed claims can remain withheld under the request's explicit treatment. Human review may select later changes but none are implemented here.

### New complete requirement/scenario mapping

| ADDED requirement | Complete scenario headers | Evidence |
| --- | --- | --- |
| Apply shared household authentication to generic workflow operations | Authenticated household request; Unauthenticated request | BSL-background-processing-007 |
| Bind generic workflow trigger parameters without an API schedule | Trigger dictionary; Malformed JSON body; Malformed identity route | BSL-background-processing-007 |
| List workflow instances by persisted active status | Filter stored parent states; No active instances; Summary projection | BSL-background-processing-008 |
| Read stored task diagnostics by task identity | Stored diagnostic fields; Diagnostics outside failure; Missing diagnostic task | BSL-background-processing-008 |
| Reset an existing task without a failed-state guard | Reset each stored task state; Reset missing task; Sequential repeated reset; Reset save fails | BSL-background-processing-009 |
| Retain task context and selectively resume a reset parent | Retained task state; Paused parent; Other parent status; Parent lookup absent; Later dispatch eligibility | BSL-background-processing-009 |
| Attempt stale-task reclamation from the hosted loop | Initial loop entry; Periodic invocation; Strict interval | BSL-background-processing-010 |
| Requeue processing tasks strictly older than the stale cutoff | Stale processing task; Cutoff and status exclusion; Timestamp source | BSL-background-processing-010 |
| Retain reclamation context without applying retry or parent gates | Retained schedule and diagnostics; Retry allowance exhausted; Parent and dependencies retained; Processor still running | BSL-background-processing-010 |
| Contain reclamation failures at the loop boundary | No stale tasks; Query or save failure; Cancellation during reclamation | BSL-background-processing-010 |
| Poll pending work with capped idle backoff | Selected batch; Idle batches; Outer cancellation; Other loop error | BSL-background-processing-011 |
| Use local processor slots for dispatch | Configured common processors; Unrecognized processor; Slot scope | BSL-background-processing-011 |
| Persist returned processor results without clearing prior results on null | Non-null return; Null return with prior result | BSL-background-processing-011 |
| Start child workflows through shared acceptance | Immediate child acceptance; Scheduled child acceptance; Invalid launch payload; Independent child lifecycle | BSL-background-processing-012 |
| Resolve child cron schedules against future UTC minutes | Configured expression; Fallback or missing configuration; Next matching minute; Numeric cron fields; Invalid or impossible schedule | BSL-background-processing-012 |
| Prune only old terminal workflow history | Old terminal history; Strict retention boundary; Paused failed work; Default and explicit retention; Pruned identity reread | BSL-background-processing-013 |

### Remaining-shared source identities — SHA-256

All 47 source identities in the prior lifecycle manifest rechecked unchanged at BP-R01 entry. The following current manifest includes those inputs and the additionally inspected immediate boundaries; hashes identify source content, not runtime results.

| Source | SHA-256 |
| --- | --- |
| `api/appsettings.json` | `589cf8537d72441ec62ae6a5bb514054225aabe193a4c538c2693244bfcde44f` |
| `api/database/compatibility.sql` | `bd3828fc1ce8b898b0feaa8f2e41be2e211cecadbefbfe9a68e14df435b859d5` |
| `api/database/schema.sql` | `3f7767cd704299374ebdcd89a11709680013ba26a477ad23f41da54e6da55161` |
| `api/src/RecipeApi.Tests/Infrastructure/TestDbContextFactory.cs` | `4f292fc990b79f5db66d06d166a8317a13748dc0003e2c1f5dc1ed615954db82` |
| `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` | `0ee567443fc0b5c11fffe631c94ea0407681b371224d8083a0e32b94b280804c` |
| `api/src/RecipeApi.Tests/Integration/PdfCapturePostgresTests.cs` | `54680e482267de1d1086781df5f587df640a85111d4beb8d03d0ce65a3b142c7` |
| `api/src/RecipeApi.Tests/Integration/RecipeImportReportIntegrationTests.cs` | `0ed0a2308f813e83ac5742288fd5f8268018e232aeda2778ff44153e888bac75` |
| `api/src/RecipeApi.Tests/Integration/WorkflowStandardizationIntegrationTests.cs` | `9c01f4afc3078187642521dc729c7ab11c41d2bd2e2bbc12263e944ad3a5f7fa` |
| `api/src/RecipeApi.Tests/Integration/WorkflowTaskDiagnosticsIntegrationTests.cs` | `f1872365af7fdb74450c1b0f7a48092b00aae208ffad30adb4d03e88f3429813` |
| `api/src/RecipeApi.Tests/Services/Ai/AiExceptionHandlerTests.cs` | `3fb4ef36f32365ae24153227f0f4320326f23881b754dbc7e74b15711f106e15` |
| `api/src/RecipeApi.Tests/Services/CronScheduleCalculatorTests.cs` | `72ddb975ee9a322ecc575517f191b974137390b40913221afb4c1c0d3d0334a5` |
| `api/src/RecipeApi.Tests/Services/ManagementServiceTests.cs` | `a1a038a13567186c47eb26e7dde7db4942dcbd8c128511c95e121bd70f59cfca` |
| `api/src/RecipeApi.Tests/Services/RecipeImportLifecycleTests.cs` | `fe4b7249603997be939e0b8a2d790ef88f1eaa1863b7101a2011186f258a04cb` |
| `api/src/RecipeApi.Tests/Services/RetrySchedulerTests.cs` | `f02bf5379a3bcd50bc9f13e53f1ba29afa2e6afe5448a6cb7897e3f8e566d45b` |
| `api/src/RecipeApi.Tests/Services/WorkflowOrchestratorTests.cs` | `b4fea10a264c53c902878d97863998031aacca13291e239593e1b123ff476ab3` |
| `api/src/RecipeApi.Tests/Services/WorkflowProcessorTests.cs` | `3027587f851b2c83da895869edf4a992dd09fd74eec2db8aabc08c4c25cc276d` |
| `api/src/RecipeApi.Tests/Services/WorkflowWorkerReaperTests.cs` | `02d420e9e3c26f888dbb8e63c117b7660ddbb8f1c33c99db1a7949c91b999656` |
| `api/src/RecipeApi.Tests/Services/WorkflowWorkerTests.cs` | `b701d122fa95c23309741e209dbd2f9f8da40404a0f59e221e2809cc11448434` |
| `api/src/RecipeApi/Controllers/RecipeController.cs` | `d1699c2de6f6cca9d879e67c0c7b9c7f0af4b2c4e104bc9ff04634b266eb5a70` |
| `api/src/RecipeApi/Controllers/RecipeImportController.cs` | `a5fe04c228c90f4f85bc4681df800a74af53d676599cac965c9ba60b27fe550b` |
| `api/src/RecipeApi/Controllers/WorkflowController.cs` | `055be167e235752cf25d4ae1f95dd0f3842255e1fd8af4b832f847dad2969444` |
| `api/src/RecipeApi/Data/RecipeDbContext.cs` | `92084cf105ec2941e713fca9053609f4974156b6440fb72f9b623cf918916447` |
| `api/src/RecipeApi/Dto/WorkflowInstanceDetailDto.cs` | `c86b463339d6abc8ab761741a2c670a36077903dfe1090a8faa657655a5375b1` |
| `api/src/RecipeApi/Dto/WorkflowInstanceSummaryDto.cs` | `bde4eae602427173a99e10840ac73f670f2ff54ad64b374ec3b85d95438f4e93` |
| `api/src/RecipeApi/Dto/WorkflowTaskDiagnosticsDto.cs` | `a7b81b7d2545a48d0bca71cbd5204bee6b043f58b6aa15848d498d995a16da3d` |
| `api/src/RecipeApi/Dto/WorkflowTaskDto.cs` | `722ca2b5e798e3e0c7c4bd82ede8200fcad19b6d15cc0ad6a2e0f4d9d8bdc69d` |
| `api/src/RecipeApi/Dto/WorkflowTriggerRequestDto.cs` | `85d9dbe0a53b4457682b98d30c5659943d5e75d104c515622b81fd35a531ce4a` |
| `api/src/RecipeApi/Dto/WorkflowTriggerResponseDto.cs` | `12ae17f3299b5763909989f27b40b8a6d08a314f899ed2a137d377ddcfdb7871` |
| `api/src/RecipeApi/Infrastructure/FamilyMemberIdModelBinder.cs` | `4d5dcc9f7d9993abb4c59802f770da139c4875c55544df8410553332a04a2f64` |
| `api/src/RecipeApi/Infrastructure/HearthAuthenticationHandler.cs` | `51ecd8a5be459e1ffaae7e3a33646de57aa13bf0fec088a7e388083da08ee817` |
| `api/src/RecipeApi/Infrastructure/LocalStorageProvider.cs` | `5a07af200857eec99fe0dd90f04fd2c1ce3fe4f3f64b86d5abb4eb09ae875225` |
| `api/src/RecipeApi/Infrastructure/SuccessWrappingFilter.cs` | `6fa3cd08587220fc4e18803f6ba020e494b81211cf99c53ec10de23ddd46f11d` |
| `api/src/RecipeApi/Middleware/ErrorHandlingMiddleware.cs` | `b5849eb709ca2bc85efa3051d3a953ca955ef8704848327ad88d0297299d949b` |
| `api/src/RecipeApi/Models/Ai/AiErrorDetail.cs` | `75858449e1fb3c8c5946880aca5eaa8e8cf90143d507c76b966abb641b923855` |
| `api/src/RecipeApi/Models/WorkflowDefinition.cs` | `b945fafe5f2bcf95606623219f202f20f0106dfa3dd682970a72aa14d7830a5e` |
| `api/src/RecipeApi/Models/WorkflowInstance.cs` | `82d14b99d40c02ec5b10c188a16d190e865fd1b6246bc514ee37021b7d537641` |
| `api/src/RecipeApi/Models/WorkflowTask.cs` | `3408be49a3afafc7ac70d6104124dcfcdd8df7509162ff9186d3581bb30f6e06` |
| `api/src/RecipeApi/Program.cs` | `a4a2510b9cf0bbeb0e05072ab2bf2b299f4029e449bff17e7386b62f5321c523` |
| `api/src/RecipeApi/Services/Ai/AiExceptionHandler.cs` | `5021f457d791e5f672ee1acf6fd4b3a85a8b4cc7e51f0310dce02070a86c0d1a` |
| `api/src/RecipeApi/Services/CaptureFailureService.cs` | `88a7b76335db0873e0d5e4bcde15783a2ec792d84f97f967a24f3bcf5b79db29` |
| `api/src/RecipeApi/Services/CronScheduleCalculator.cs` | `53e9f4964fb2286c3d4e67720fa884602575c0742334259b875ce5e0433ae43d` |
| `api/src/RecipeApi/Services/IWorkflowOrchestrator.cs` | `401088470fcf96177d276c428961e3e4f9b233ffd49c05a1493b35376089be30` |
| `api/src/RecipeApi/Services/ManagementService.cs` | `c24464baa8f853c7195e30de61b168ef2b8eda059545a5449580807448811c4f` |
| `api/src/RecipeApi/Services/Processors/CompleteRecipeImportReportProcessor.cs` | `0e5d13ababefa89cda1e3bc74e65065d7e9a51a49142a0e96b6b1c50a8e54b4d` |
| `api/src/RecipeApi/Services/Processors/ManagementProcessor.cs` | `484abcf7eb3d3e5c2882c785edea3a4a3083f7f7c2efc3c5e479aad7e561096f` |
| `api/src/RecipeApi/Services/Processors/RecipeReadyProcessor.cs` | `4206f98256cadae88d7be13a44e9d9d18b6c46679ba7b9f0aee0dcef8a848a74` |
| `api/src/RecipeApi/Services/Processors/WorkflowProcessor.cs` | `661a85f17a1ddcc00ec96e51af5b13fc7e7f2b5b8236ca1639d2a5a292772a40` |
| `api/src/RecipeApi/Services/RecipeImportReportService.cs` | `99776d8ddfb954d0def99460d868d43a3f3f24e08c4459bd30c132959e30acb3` |
| `api/src/RecipeApi/Services/RecipeImportService.cs` | `3016a8e38da063513813e813fad5f8fddf10f285abfa1ef3e0743c200ac1af14` |
| `api/src/RecipeApi/Services/RecipeService.cs` | `9eec9ab5cd7102081b3765b08a41b8de4d45325858d18ab4573a326afa256b74` |
| `api/src/RecipeApi/Services/RetryScheduler.cs` | `e3849aceddc86ccca36766c284c4c90f0bddf65ed7398d7c0140efbf136ff965` |
| `api/src/RecipeApi/Services/WorkflowOrchestrator.cs` | `9812d17bface86d79fef75eab2ef7668c7c0bde18455c1ea46774b46dcc0b14c` |
| `api/src/RecipeApi/Services/WorkflowRepository.cs` | `1356e4b126077506c07633c2d977a419d96641e8a03f976d45f4e945775214d3` |
| `api/src/RecipeApi/Services/WorkflowRetryOptions.cs` | `0937ff63830fbc251598e499848815450cf2aa4a584b4ef31981929655c81ec7` |
| `api/src/RecipeApi/Services/WorkflowWorker.cs` | `69f9023b0003ff2f0a5dda6d85bcb42e13ebf064b5c8529bc6b0866e5b3871df` |
| `api/src/RecipeApi/Workflow/IWorkflowProcessor.cs` | `9d3f3ab896a51e711321d02036e25147cbce43b660e242fbbc3b8c47a8853efe` |
| `api/src/RecipeApi/Workflows/dreaming.yaml` | `862cf700ca717dd5b09b5f6dfb84b6f8810448c6080b805e2b3ff62289f9853d` |
| `api/src/RecipeApi/Workflows/recipe-import.yaml` | `56977712412ec2c0b5a04495e77edbf3b97a71f92ad5f8da8546b58261de5b0a` |
| `api/src/RecipeApi/Workflows/url-import.yaml` | `6f142f8831390021091f5c3ca9603f056d138719d1904ae72cd75827beb73787` |
| `api/src/RestClient/07-workflow.rest` | `cb86f8dcd7174f708a1dd533edb988375bfd12531c0db02e512784f9e6bc912e` |
| `api/src/RestClient/09-reimport-investigation.rest` | `dc3f265e4dafac61f8fe53b02e18f7c1809426879f089160ec3d7c270f6dc828` |
| `pwa/e2e/mock-api.ts` | `063ed6d6629ccde163487a92543ae36918183a81b7301dd01a5389248cbcbd07` |
| `pwa/src/components/recipes/RecipeDetailSheet.test.tsx` | `21727367dee891c473635cc2eafde324b0f6863e0dd4db1a7e82203d5e650da0` |
| `pwa/src/components/recipes/RecipeDetailSheet.tsx` | `bbc1bba8f16f3fa305775d072cb1c3850af34a24bd3979e2228b63984ca1a19c` |
| `pwa/src/lib/api/generated/api/workflows/active/index.ts` | `880fef88b4ff69cbc2f59fbc583ee84c9ddb062bd04b56999f4f845949d8b08a` |
| `pwa/src/lib/api/generated/api/workflows/index.ts` | `9dca5ddc81e31f29163b6f3d23b6fa8badcaaf05fe4e4c475d906928ecd51383` |
| `pwa/src/lib/api/generated/api/workflows/instances/index.ts` | `66c953bc8e3d6bcf4ac8844a9acfec2e090337a261eb9bd02357fe30e169c906` |
| `pwa/src/lib/api/generated/api/workflows/instances/item/index.ts` | `e07aa6b70f6c68cc3664cf33eb61a9c0e82e5999a7388b6a54fa1383c8483996` |
| `pwa/src/lib/api/generated/api/workflows/item/index.ts` | `90a7f3bab29aecbb113e12b34cd7a980f56c987db3ac3f6e3baa4c54350f5dc1` |
| `pwa/src/lib/api/generated/api/workflows/item/trigger/index.ts` | `a8d85bf1495e6a71e50e46de4575c7305118d98e28eaf3e0f97cd3cd87dd2eba` |
| `pwa/src/lib/api/generated/api/workflows/tasks/index.ts` | `c1613385f79f987c3d306514f71f873da9c3d12eb6f6dd4e2085be158706521b` |
| `pwa/src/lib/api/generated/api/workflows/tasks/item/diagnostics/index.ts` | `5f55b0502606c950e1ab42f460275f9b95376d3f2fffdf9cb931f2316f8f9c57` |
| `pwa/src/lib/api/generated/api/workflows/tasks/item/index.ts` | `6cde534712a777b53fe712e10fb1d8574b8e079662ded2ef20faa1befe14403d` |
| `pwa/src/lib/api/generated/api/workflows/tasks/item/reset/index.ts` | `22689f1f34ffe8f3402623f09504afd6da40bd5ced32707783ba43998eb61825` |
| `pwa/src/lib/api/generated/models/index.ts` | `03e19537845755d2cd0d30071284bc8a11007237e380433184d3edbe1ddb05e6` |
| `pwa/src/lib/api/recipes.ts` | `f4e70b39a2060bfc5b25010914f78e288321517db5c52c543d103502718dce7a` |
| `specs/openapi.yaml` | `0fbd27813611e16474ec17a48ede372d5a41af02db3fa9ded82295a6357046ff` |

### BP-R01 lifecycle, review and verification checkpoint

| Dimension | Current state |
| --- | --- |
| Discovery | Reconciled across the full matrix, with BP-U01–BP-U05 and prior U qualifications; no supported shared generation gap remains |
| Artifacts | proposal/design/tasks and background-processing ADDED delta generated; selected strict validation passed, 16 requirements/56 scenarios |
| Human review | Pending; no acceptance decision inferred |
| Promotion | Not authorized/not performed; existing main remains exactly 14/42, Purpose and complete file preserved |
| Runtime | Not-run by BP-R01/A34, including unit/API/browser/worker/network/PostgreSQL/model checks |
| Capability baseline completion | Not declared; review, promotion and qualification remain separate |

**Scope review:** All seven task-owned files reviewed: selected CLI metadata, proposal, design, delta and extraction tasks; capability plan changes only its initial current-action paragraph plus this appended record; index changes only the Background processing row. No application implementation or edits to other capability plans. All normative assertions map to BSL-007–013; all 14/42 existing requirements/scenarios retain their BSL-005 mapping. No Purpose rewrite or MODIFIED delta, archive or retired navigation spec. Compared to private entry bytes, all 47 prior affected source identities match. Additional current manifest above fixes the inspected source identity. New source support is not runtime qualification.

**Concurrent work/preservation:** Entry worktree/index were clean. During discovery, other work added/staged unrelated changes to workflow validation/Taskfile and identity/library/meal-planning/sharing/quality planning artifacts; some selected draft bytes were also staged externally. This session did not stage, unstage or restore anything. Existing unrelated changes are not attributed to this extraction. At scope review a second private staged checkpoint was captured at `/var/folders/7x/450tvgfj1lg2gx9p89txzx0w0000gn/T/wfs-background-preverify-i7kim5so`. Preservation checks distinguish unchanged entry files, concurrent changed files and task-owned bytes; they do not falsely assert global entry-byte equality after concurrent edits. Index summary has only the one-row worktree change from its entry before-image. Recheck staged/current content separately; staged selected spec may be older than final worktree draft.

**Observed checks before final repository verification:**

- Passed: `openspec validate baseline-background-processing-remaining-shared-behavior --strict --no-interactive`; promoted header counts/source identities and complete mapping checks.
- Failed (concurrent unrelated items): `openspec validate --all --strict --no-interactive` reported **44 passed / 3 failed / 47 items**. Household-identity `baseline-household-identity-capture-attribution` and `baseline-household-identity-member-context-transport` had strict warnings for pre-requirement text; `baseline-household-live-updates-schedule-events` had no delta yet. Selected change and all eight main specs passed. No repair of those concurrent drafts is authorized. Informational already-promoted ADDED warnings in prior active library changes are not selected-change failures.
- Blocked: none observed at this checkpoint. A final `task verify` may fail its global spec:check on these unrelated drafts; retain that actual outcome.
- Not-run: all runtime/unit/API/browser/worker/network/database/PostgreSQL/model qualification, by explicit prohibition.
- Not-applicable: behavior TDD, app/client/contract generation, migration, deployment, implementation preparation and archival.

**Final command/evidence:** Run the following after final preservation/scope review and inspect `.task/agent-finish/last-run.json`. Its selected paths, tested content identity, excluded concurrent paths and individual outcomes are authoritative for that invocation; report them in the final response. A repository-wide failure does not invalidate the selected draft's strict validity, and must not be presented as all-checks-passed. Do not edit documents after final verification without rerunning applicable checks.

```sh
task verify -- docs/openspec-baseline/background-processing.md docs/openspec-baseline-plan.md openspec/changes/baseline-background-processing-remaining-shared-behavior/.openspec.yaml openspec/changes/baseline-background-processing-remaining-shared-behavior/proposal.md openspec/changes/baseline-background-processing-remaining-shared-behavior/design.md openspec/changes/baseline-background-processing-remaining-shared-behavior/specs/background-processing/spec.md openspec/changes/baseline-background-processing-remaining-shared-behavior/tasks.md
```

**Exact next-session checkpoint:** Review `baseline-background-processing-remaining-shared-behavior` proposal/design and 16/56 delta against this full matrix and BSL-007–013 mappings. Keep BP-U01–BP-U05/U89–U94 and prior qualifications withheld. Recheck sources, CLI inventory and concurrent/staged preservation first. The generation request is fulfilled at a validated draft for human review; do not generate another capability or start implementation. Promotion, archival, contract repair or runtime qualification requires a separately authorized action. Existing main remains promoted 14/42; no acceptance or baseline-complete label is authorized.

**Final-check interruption observed:** The first explicit seven-path `task verify` passed documentation, then failed content identity with “Mutation during verification; no success for final content”; spec:check was not-run in that invocation. Comparing private checkpoints showed all previously captured unrelated file bytes and staged bytes unchanged, but new concurrent identity/lifecycle/live-update planning files appeared during the check. This is a concurrent repository mutation, not an observed selected-source failure. A fresh final invocation is required; retain the first failure separately and inspect the new evidence record rather than carrying its documentation pass to new content.

## Promotion record — 2026-10-16

User authorization: “promote all the openspec changes”. Applied the active deltas
through `openspec-sync-specs` after resolving all 42 active changes and their
CLI-reported spec paths and rules. This capability's added requirements/scenarios
are now in its main spec. Existing Purpose and requirement blocks are preserved.
Source evidence, exclusions and uncertainty records above retain their original
qualification; promotion adds no runtime evidence. Change artifacts remain active.
No staging, commit, archival, application edits or runtime qualification performed.
Validation outcomes are reported with this execution rather than inferred from
completed extraction tasks.
