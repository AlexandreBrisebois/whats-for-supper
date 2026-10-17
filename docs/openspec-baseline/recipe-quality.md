# Recipe quality baseline plan

## Current capability ownership after domain split — 2026-10-16

Use the current owners below for this former combined capability. All dated extraction records, source digests, BSL/U/A identifiers and qualification limits below remain historical evidence. Requirements and ordered scenarios were relocated unchanged; no runtime qualification is inferred. Earlier meal-planning navigation remains applicable.

| Current capability | Requirements / scenarios |
|---|---:|
| [recipe-quality](../../openspec/specs/recipe-quality/spec.md) | 28 / 74 |
| [capture-recovery](../../openspec/specs/capture-recovery/spec.md) | 16 / 37 |

The complete cross-source block identities and ownership map are recorded in the [archived split ownership map](../../openspec/changes/archive/2026-10-16-split-remaining-broad-capabilities/design.md). The existing source evidence below is preserved, including any older combined-capability counts and exclusions.

## Current lifecycle checkpoint — consolidated, 2026-10-16

This capability's main spec now contains **44 requirements / 111 scenarios**.
All baseline source changes were archived after the user's explicit approval;
there is no active baseline extraction/promotion queue. Historical checkpoint,
next-session and "changes active" text below records earlier sessions only.
Evidence limitations and unresolved findings remain in the [live backlog](backlog/README.md).
See [consolidation completion](backlog/consolidation-completion.md) for accepted
scope, preserved corrections, archive warnings and verification. Archival does not
establish application correctness, runtime qualification or resolution of defects.

## Current checkpoint and scope

Promoted baseline: **44 requirements / 111 scenarios** at RQ-P01 (2026-10-16).
The user accepted and authorized promotion of the three reviewed remaining drafts
(7/19) after the completed capability audit. Generation and documentation promotion
are complete within the inventoried connected recipe-quality boundary. All six
quality changes remain active and unarchived. A34 runtime qualification remains
deferred; U01/U75–U88, RQ-Q01–RQ-Q04 and historical qualifications remain intact.
Earlier draft/pending labels below are historical; the RQ-P01 record supersedes
them for documentation acceptance and promotion only.

Read [AGENT.md](../../AGENT.md) and [shared workflow](workflow.md), then this file.
No other capability plan or full project history is required up front. Follow only
immediate owner/spec dependencies needed for the selected work.

Accepted baseline: [main recipe-quality specification](../../openspec/specs/recipe-quality/spec.md).

**Phase-12 reconciliation R12 (2026-10-16):** Recorded promoted documentation remains 44 requirements / 111 scenarios; no additional supported extraction gap was found within this plan's explicit boundary.
[Cross-capability review](reconciliation.md) records current inventory, shared-owner
reconciliation, evidence drift and exclusions. Current main SHA-256: `8e564c9f00e9ee157cfff812c90d8d23c343d0a99a529143c9512c2d751f61c9`.
This session grants no new acceptance or promotion. Earlier session-specific
“current user” and next-action statements retain their historical scope. A34 and
all local unresolved/excluded behavior remain in force; runtime checks are not-run.


## Capability map and starting points

| Capability / purpose | Candidate scope and rules to recheck | Source starting point | Existing test starting point | Dependencies / initial confidence |
| --- | --- | --- | --- | --- |
| Recipe quality: report and recover content problems | Reasons/notes, manual duplicate reports, contextual re-import eligibility/idempotency, review/resolve, import-ID polling, failed-capture retry/clear | [report service](../../api/src/RecipeApi/Services/RecipeImportReportService.cs), [import service](../../api/src/RecipeApi/Services/RecipeImportService.cs), [failure service](../../api/src/RecipeApi/Services/CaptureFailureService.cs) | [report API tests](../../api/src/RecipeApi.Tests/Integration/RecipeImportReportIntegrationTests.cs), [report PostgreSQL tests](../../api/src/RecipeApi.Tests/Integration/RecipeImportReportPostgresTests.cs) | Provenance, identity, workflows, search review filters, cooking / high rules; medium recovery |

Shared owners and evidence policy live in [workflow.md](workflow.md). Recheck
these source/test starting points before using them as current evidence.

## Recorded decisions for this capability

Shared A01–A05/A07/A09–A12/A34 decisions are in workflow.md. The records below
retain their original scope; completed stages do not authorize successors.

| ID | Decision | State / authority |
| --- | --- | --- |
| A30 | Apply only member-creation task 2.1 and stop after verification before uniqueness enforcement | User 2026-10-15 explicitly selected task 2.1. Authorizes its 201 contract alignment, generated-client reconciliation, mocks and required tests/verification. No tasks 2.2–2.4, uniqueness/409 implementation, unrelated fixes, archival, commits or staging. |
| A69 | Record 200/202 mismatch and withhold exact description success status | User selected “Yes—record the mismatch and withhold an exact status requirement” in this session. No contract/application change or resolution of other discrepancies inferred. |
| A73 | Discover and draft only recipe issue reporting/contextual re-import | User 2026-10-15 explicitly selects `baseline-recipe-quality-issue-reporting` / `recipe-quality`, installed propose, implementation-supported extraction and assertion review. Authorizes proposal/design/delta/extraction tasks/plan only; withhold disputed claims, preserve main specs/prior work/A34 and stop at validated human-review draft. No promotion, archive, application/runtime/DB/model work or successor slice. |
| A74 | Promote reviewed recipe-quality delta into main specifications | User “promote”, 2026-10-15, after validated A73 draft. Exact Purpose and 13 requirements/35 scenarios; retain non-normative qualifications, all prior work/source identities and sixteen active changes. Plan/task follow-up only; no archival, application/runtime qualification or successor work. |
| A75 | Discover and draft only recipe-quality review/manual resolution | User attached request, 2026-10-15: `baseline-recipe-quality-review-resolution`; documentation-only source/test discovery and proposal/design/delta/extraction tasks plus plan. Strict selected/all validation and explicit changed-path verify; preserve five promoted specs/prior work/qualifications; stop for human review. No promote/archive/apply/runtime/DB/model/next slice. |
| A76 | Promote reviewed review/manual-resolution recipe-quality delta | User “promote”, 2026-10-15, after validated A75 draft. Exact 11 requirements/28 scenarios appended to main (now 24/63); preserve Purpose/prior 13/35 blocks, all 178 source identities, prior work and qualifications. Plan/task follow-up only; no archive, application/runtime/DB/model qualification or successor work. |
| A77 | Discover and draft only Settings failed-capture review, retry and clear | User attached request, 2026-10-15: `baseline-recipe-quality-failed-capture-recovery`, recipe-quality; documentation-only trace/proposal/design/delta/extraction tasks/plan, strict selected/all validation and explicit-path task verify. Preserve promoted specs, prior work and all qualifications; stop at validated draft for human review. No promotion/archive/application/runtime/DB/model/successor work. |
| A78 | Promote reviewed Settings failed-capture recovery recipe-quality delta | User “promote”, 2026-10-15, following validated A77 draft. Exact 13 additions/29 scenarios appended to main recipe-quality (now 37/92); preserve Purpose/prior 24/63, full delta/artifacts, 198 source identities, prior work and qualifications. Plan/task follow-up only; no archive, application/runtime/DB/model qualification or successor work. |

## Discrepancies and qualifications

These are implementation-supported/static findings, not runtime guarantees.
Cross-capability entries are included where the selected evidence depends on them.

| ID | Finding / risk | Evidence and required extraction treatment | Status / withheld claim |
| --- | --- | --- | --- |
| U01 | Contextual URL repair omits a required workflow parameter | Compare `WorkflowParameters` in [report service](../../api/src/RecipeApi/Services/RecipeImportReportService.cs), required `url` in [URL workflow](../../api/src/RecipeApi/Workflows/url-import.yaml), and [orchestrator validation](../../api/src/RecipeApi/Services/WorkflowOrchestrator.cs). Mocked workflow launch is not real launch evidence. Do not claim successful URL correction. | Open |
| U22 | Member-creation lifecycle/completion record diverges from plan and evidence | BSL-014/015: archive exists and tasks 2.1–2.4 are checked; A30 records task 2.1 only and no member-creation archive authority. Existing finish record has database-behavior blocked, excludes service/controller/SQL and archive tasks, and does not evaluate task acceptance. No later authorization established here. BSL-015 confirms 7/21 delta/main equality, stale task-specific hashes, and three broken archive links; user requires quoted limitation in future spec. Preserve artifacts pending later authorization provenance and required qualification. | Deferred under A34; user reports later authorization, original instruction/reference pending; no new archival or verified implementation acceptance; independent requirements discovery may proceed |
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

## Slice evidence and lifecycle records

## Draft slice — recipe quality / issue reporting and contextual re-import

**Authorization A73 (2026-10-15):** Current user request selects `baseline-recipe-quality-issue-reporting`, capability `recipe-quality`, documentation-only discovery, CLI proposal/design/delta/extraction tasks and this plan update. Establish actual behavior, inspect assertions/substitutions, withhold disputed normative claims and stop at a validated human-review draft. No application, test, API/generated client, SQL, dependency or configuration changes; no services/runtime/database/model qualification, promotion, archival or successor slice. A34 remains deferred.

**Identity / preservation:** HEAD `db6fede90ec0a7dfff26e6050036310bc8211837`; CLI list/context resolve nearest root `/Users/alex/Code/whats-for-supper`. CLI spec inventory contains household-identity, recipe-library, recipe-sharing and recipe-capture, no recipe-quality. Before-image held outside repository; initial status: modified plan and main recipe-capture, untracked description-entry/PDF-entry changes, no staged diff. All 148 unique previously recorded source hashes matched before drafting. Existing tracked/untracked bytes and main Purpose/content are preservation inputs, not task-owned edits. Actual header counts: identity 36/92, library 55/122, sharing 9/34, capture 37/92; sharing's earlier 9/27 checkpoint is historical, not rewritten.

### BSL-recipe-quality-001 — Entry, local draft and Save feedback

**Business purpose:** Let a household member identify ingredients, instructions or duplication needing attention without choosing an execution command.

**Ordered trace:** library detail activation → RecipeDetailSheet GET through recipes.ts/Kiota → RecipeService.GetRecipeDetail attaches report DTO → ActionGearMenu (only !isLoading, loaded recipe, !isEditing) → RecipeImportIssueSheet. Gear entry does not require canReimport, readiness or ownership: without source eligibility Duplicate still works. Existing issue changes entry/dialog title to Review issue; badge renders Reported or Review with accessible text. No separate report fetch/loading step. Shared access/detail-loading requirements remain owned by main specs.

**Form behavior:** initial state merges loaded reasons with optional contextual reason; note initialized once, expanded if nonempty. Close/backdrop/Escape unmount; reopening initializes current saved feedback, discarding unsubmitted changes. Close initially focused. Keyboard code attempts wrapping but its selector includes disabled controls; the test titled “closes on Escape and traps keyboard focus” asserts Escape only, so no comprehensive focus-trap qualification. UI combinations are Ingredients+Steps or Duplicate: selecting Duplicate clears content and selecting content clears Duplicate. Helper text still says “any combination” and the clear announcement says “Ingredients cleared” even for other content. Retain U75; do not turn misleading text into a selection guarantee. Content selection expands note; textarea maxLength 500. Ineligible unselected content buttons disabled; already-selected content can be removed.

**Save/error:** Save disabled for zero reasons, local busy or isReimporting. Save trims note/null, catches generic save errors or special saved-but-launch-failed error, retains local state while mounted and ends busy in finally. Busy alone does not disable all inputs/dismissal; no whole-form freeze, request cancellation or cross-remount lock claim. isReimporting disables reason/note/Save (and adjacent Resolve) with aria-describedby explanation. Detail applies submission.recipe before testing launch failure; failure leaves form open. Otherwise closes and toasts background started, Marked for review, Changes saved, or unchanged-failed-feedback guidance. Closing during pending submission is not rollback; late save response is not guarded by the polling watch.

**Assertions inspected, not executed:** RecipeImportIssueSheet.test.tsx asserts initial modal/Close focus, no-reason Save disable, maxLength, mutually exclusive Duplicate, ineligible content disable, active-control descriptions, both content reasons/trimmed note, retained open dialog after rejection and Escape. It does not assert complete focus cycling or all dismissal/reopen cases. Badge tests assert label/accessible description, compact style and French label. Gear tests assert report/review labels and absent standalone re-import entry. Detail tests mock API functions and assert authoritative issue/badge, failed guidance and returned-ID polling (see BSL-003). Confidence high for local source behavior; no browser/device observation.

**Entry dependency:** CooksMode shows contextual Ingredients/Steps reporting only for canReimport and outside editing, merges the selected context into loaded issue reasons and calls the same sheet/Save. It acknowledges started state without detail's polling loop. Existing Duplicate plus contextual content can initialize a mixed selection before toggling. Cooking navigation/state assertions remain dependency evidence, not cooking requirements.

### BSL-recipe-quality-002 — Contract, validation, persistence and policy

**Ordered seam:** recipes.ts.saveRecipeImportIssue → generated api/recipes/item/importReport POST metadata/models → OpenAPI POST `/api/recipes/{id}/import-report` → RecipeController.SubmitImportReport/SkipWrapping → RecipeImportReportService.SubmitAsync → RecipeDbContext/RecipeImportReport/schema.sql → unwrapped submission DTO → adapter map. api-client auth provider selects member store/cookie and adds X-Family-Member-Id; FamilyMemberIdModelBinder accepts header then cookie. Missing context 400, unknown member/recipe KeyNotFound → ErrorHandlingMiddleware 404; ArgumentException → 400; ineligible/active exceptions caught as 409. Shared household authentication remains a dependency; test factory disables it by default.

**Validation/persistence:** supported reasons ingredients/steps/duplicate are trimmed/lowercased, ordinally sorted and required nonempty/unique. Note trimmed to null; trimmed length >500 rejected in service, while DTO MaxLength also rejects raw input over 500 before trimming. No padded-overlength acceptance is inferred. Content-only needs CanReimport (nonempty SourceUrl OR ImageCount>0), not sourceType label or IsSynthesized; no check that artifacts still exist. Any Duplicate bypasses content eligibility and suppresses launch. OpenAPI accepts all seven valid subsets and length limit; form offers a narrower set. One report PK per RecipeId; new row records original/updating member, existing row updates feedback/updater/time. Material changes clear lifecycle/linkage/error, unchanged feedback retains them. FK cascade/set-null and SQL reason/status constraints inspected, not applied.

**Attempt policy:** validate → per-recipe static semaphore → read previous report/workflow snapshot → reject changed/mismatched active feedback before persistence → save report → manual-only if provenance/content/note condition fails → reuse active matching ID → suppress matching terminal retry → otherwise TriggerAsync with immutable repair snapshot and MarkAttemptStartedAsync. Matching is sorted reason string plus trimmed note, case-sensitive for note. No feedback-history ledger beyond linked workflow snapshot. Changed terminal feedback may request another attempt; unchanged failure feedback does not loop. Locks are process-local only. Trigger/link writes are not atomic with report save. Compensation tries deleting created instance if later linking fails; failed compensation returns started identity. No all-failure no-orphan guarantee.

**Public shape:** 200 unwrapped updatedAt/recipe/reimportStarted/importId/reimportLaunchFailed. Issue DTO only reasons/note/public status/isReimporting/safe failure message/failure import ID; omits private attribution/timestamps/raw errors/linkage. Active and failed statuses project as reported; ReadyToReview projects readyToReview. Relational ExecuteUpdate does not refresh tracked report before ToSubmissionResponse: possible stale immediate pending projection (U79); no universal immediate pending-state guarantee.

**Assertions inspected:** RecipeImportReportIntegrationTests asserts 200/manual Ingredients/no note and attribution, invalid arrays/501 note 400, all seven valid subsets 200, no-provenance Duplicate 200/content-only 409, two concurrent manual Saves one row, eligible image workflow ID/sorted snapshot, same active feedback reuse/changed 409/saved data unchanged, terminal feedback no new ID (terminal status seeded directly), injected launch exception saved report/no workflow, private field omissions and public projection. API factory defaults EF InMemory, in-memory storage/stub chat, no household auth, mocked orchestration persisting a Processing instance + Mock task without validating actual YAML. These are assertions against substituted orchestration, not workflow delivery. Postgres tests separately opt in via WFS_TEST_POSTGRES_CONNECTION, create/drop isolated DB and load schema; assert duplicate-only lifecycle no-op, matching/stale guards, mixed/content success status, no row creation, compatibility replacement/idempotency and constraint violations. No Postgres tests executed.

### BSL-recipe-quality-003 — Dispatch identity, access and observation

**U01 confirmed:** report WorkflowParameters omits `url`; url-import.yaml declares it required; real WorkflowOrchestrator.TriggerAsync validates required parameters before creating instance. Generic RecipeImportService.TriggerImport supplies url but is not called by report submission. RecipeService.CanReimport can still advertise URL eligibility. WorkflowRepository loads stored YAML, so installed/runtime definition identity is unknown. Do not claim successful contextual URL dispatch/correction or infer a repair from mocked initial response. Save/launch failure path is implemented independently.

**Observation trace:** detail takes returned importId only when started/no launch-failure → immediate getRecipeImportStatus → generated recipeImports.byImportId GET → RecipeImportController.GetById → RecipeImportService.GetImportByIdAsync → WorkflowInstanceDetailDto → adapter status only (errorMessage always null). Requires existing member and recipe.AddedBy equal to that member; another known member gets no result/404 despite being able to report that recipe. The integration test named RequiresFamilyAccessToItsRecipe explicitly seeds another member and asserts owner 200/stranger 404; it is attribution access, not all household access.

**Poll lifetime:** after nonterminal/error, setTimeout 1000 ms while watched ID still matches. Completed/failed/paused triggers target detail GET and stops only after successful refresh. Watch guard after both awaits rejects superseded status/detail; recipe-ID change/unmount clears watch/timer. No abort, timeout/backoff or persisted watch. Reloading an active report can disable controls but cannot recover successful active importId from public detail; no automatic polling resume. Polling 404 can repeat without user-visible status-request error. CooksMode saves/acknowledges without this poll. Submission response itself lacks equivalent stale recipe-ID protection.

**Assertions inspected:** detail component test substitutes getRecipeImportStatus Processing→Completed and getRecipe, advances fake time 1000 ms, asserts exact returned ID used twice, one terminal detail refresh, Review badge and no additional polls; not a network/backend assertion. Browser recipe-import-reporting.spec.ts supplies its own authenticate cookie/localStorage, builders and method-sensitive POST/DELETE/GET routes. Harness uses URL-labelled recipe but returns recipe-import identity; starts solely from canReimport/content/note and generates terminal state after two reads. Tests assert submitted payload/ID polling/Review, Duplicate no polling, active read-only after reload, failed/paused guidance/unlocked controls and contextual Cook entry. Reload test proves disabled controls only, not resumed observation. Common mock-api.ts has similar deterministic state, no backend validation/access/feedback dedup/launch compensation, does not match requested polling ID, and omits some contract-required fields (e.g. null importId/issue failure fields); examples in OpenAPI also omit required fields. Contract-text test checks generated enum/interface strings, not live schemas. U76/U77/U79 withhold universal access/recovery/parity. Confidence medium across real observation seam, high for inspected local loop.

### BSL-recipe-quality-004 — Feedback processing and conditional outcome

**Ordered source:** both workflow definitions pass repairReasons/repairNote to ExtractRecipe → RecipeAgent reads snapshot and appends delimited USER-REPORTED FOCUS (UNTRUSTED) with reason-specific scrutiny and note → source HTML/image extraction and existing artifact sync → RecipeReady → CompleteRecipeImportReport → MarkSucceededAsync guarded by current workflow ID. Program registers processor. Source/image contents remain authority; feedback is not executable instruction or replacement recipe facts. Reuse recipe-capture extraction/readiness ownership without restating initial capture, PDF conversion or hero behavior.

**Terminal boundaries:** successful report completion retains report and sets content-only ReadyToReview, mixed Duplicate Reported; clears error, stores completion time. No automatic resolution/deletion is connected. MarkFailedAsync guards the workflow ID, records bounded normalized private error, exposes safe saved-report guidance plus failed import ID, clears pending/completion time. Missing reports remain missing. Worker fatal path first saves failed task, then pauses instance, then best-effort records failure in fresh scope; failures can prevent report update. Ready SSE precedes report completion; already-ready RecipeReady can skip publish. Recipe-import queue_search_index follows complete_import_report; fatal later step can record failure after review status. Independent index-recipe-search workflow failures are excluded by worker helper. No semantic correction, reliable event order, guaranteed terminal update or report resolution claim.

**Assertions inspected:** RecipeAgentPromptSelectionTests use InMemoryStorageProvider, EF InMemory, mocked prompt repository and IChatClient with fixed valid extraction; repair tests directly invoke agent payload, assert delimited untrusted Ingredients/Steps focus, malicious-looking note retained as data, source-authority/full-JSON wording, 500-character note and SOURCE HTML; normal extraction omits focus. These do not assert actual model compliance. WorkflowWorkerTests fatal import/indexing theory constructs instance/task in EF InMemory with throwing processor and capturing publisher: import failure pauses task/instance, records ReimportFailed/error and captures event, independent indexing leaves report unchanged. This is not installed workflow execution. CompleteRecipeImportReportProcessor connection established from code/YAML/registration; no separately located end-to-end completion test. Relational success/stale guards asserted in opt-in Postgres tests but not run.

**Observable surfaces:** RecipeService detail loads report; RecipeSearchService maps all report states to reported except ReadyToReview. RecipeImportIssueBadge renders returned status on detail, search cards and stack cards; library stack passes supplied detail status. Save updates local detail, no report-change parent callback invalidates every loaded library surface. Paged list MapToDto does not attach issue independently. Search review filters/Top Pick exclusion and manual Resolve are adjacent dependencies only, not requirements in this delta. Browser mobile-review/ranking tests use substituted results and remain outside extracted scope.

**Evidence classification:** implementation-supported; high confidence for narrow form/persistence/guard code, medium for cross-layer conditional completion due to substituted tests, unqualified stored definitions/relational projection and best-effort failure updates. No application behavior verified in this session.

### BSL-recipe-quality-005 — Mapping, artifact and check boundary

Proposal, design, recipe-quality ADDED delta, extraction tasks and CLI metadata exist in `openspec/changes/baseline-recipe-quality-issue-reporting/`. Artifact readiness means existence; status is draft for human review, not accepted/promoted/archived. All 13 requirements/35 scenarios are mapped below. Evidence IDs reference implementation support and inspected assertions above, not executed tests.

| Requirement (delta order and exact header) | Scenario headers (all) | Evidence / assertion limits |
| --- | --- | --- |
| 1. Offer reporting from loaded recipe detail | Open a new report; Open existing feedback; Detail is loading or being edited | BSL-recipe-quality-001: gear/detail source and mocked component assertions |
| 2. Dismiss and reopen an unsubmitted issue form | Dismiss without submitting; Reopen discarded feedback | BSL-recipe-quality-001: source; Escape/initial focus asserted, reopen/backdrop not separately asserted |
| 3. Select issue reasons and an optional note | Select both content reasons; Switch to or from Duplicate; No content eligibility | BSL-recipe-quality-001/002: sheet assertions; U75 mixed reason difference |
| 4. Submit feedback through Save with bounded pending feedback | Submit a normalized note; Submit without a note; Submission or processing is pending | BSL-recipe-quality-001: sheet active-control and payload assertions; busy pending source |
| 5. Retain the open draft on submission error | Save rejects; Launch fails after feedback is saved | BSL-recipe-quality-001: rejected callback assertion; launch-failure source |
| 6. Validate report input at submission | Reject invalid reason or note input; Reject absent or unknown identity; Content-only report lacks provenance | BSL-recipe-quality-002: API invalid/identity/ineligibility assertions with factory substitutions |
| 7. Persist recipe-level feedback before attempting re-import | Save a manual-only report; Update saved feedback | BSL-recipe-quality-002: API persistence/manual/concurrency assertions; U79 |
| 8. Let the server decide whether feedback requests contextual processing | Duplicate remains manual-only with content reasons; Blank note remains manual-only; Eligible launch succeeds | BSL-recipe-quality-002/003: source policy, valid-subset and image launch assertions; U01 |
| 9. Reuse active feedback and avoid unchanged terminal retries | Repeat active feedback; Change active feedback; Repeat terminal feedback; Change terminal feedback | BSL-recipe-quality-002: active/seeded-terminal assertions; changed-terminal source; process-local only |
| 10. Apply the authoritative submission result in detail | Successful manual save; Started attempt acknowledgement | BSL-recipe-quality-001/003: mocked detail response and acknowledgement assertions |
| 11. Observe a returned import ID while detail remains active | Processing followed by terminal refresh; Ignore a superseded response; Status request rejects | BSL-recipe-quality-003: fake-timer terminal test; stale/error source; U76/U77 |
| 12. Expose guarded contextual processing outcomes | Matching content processing succeeds; Matching fatal failure is recorded; Older processing finishes after another attempt is linked | BSL-recipe-quality-004: prompt/worker tests and opt-in Postgres guard assertions, not executed; U78 |
| 13. Display returned issue indicators | Render a returned report status; Render a returned review status | BSL-recipe-quality-001/004: badge assertions and surface mapping; no universal parent refresh |

**Checks and stopping boundary:** Selected strict validation passed; all-item strict passed 20/20 (16 active changes, four main specs). Full six-path documentation scope reviewed; before-image comparison confirms all initial files except this intentionally updated plan unchanged, including prior dirty/untracked main-capture/description/PDF work. All 172 unique current source hashes match (148 prior identities preserved; selected slice records 52 inputs). Explicit six-path `task verify` passed documentation, spec:check and content; 11 pre-existing Git paths excluded from that bounded task selection, although all-item strict validates their OpenSpec items. Required failed: none; blocked: none. Repeat final documentation check after this record/task update; authoritative final content identity/results belong to response/current `.task/agent-finish/last-run.json`. Application/unit/API/browser/workflow/PostgreSQL/native/model qualification **not-run** under A34/current instruction; no services started. Behavior TDD/red-green, code implementation checks, client regeneration, migrations and deployment **not-applicable** to documentation extraction. No unresolved intent decision is needed to finish this bounded draft: disputed normative guarantees are withheld under A12/A73 rather than silently decided.

### Recipe quality source identities — SHA-256

Current inspected source/dependency bytes, not execution evidence. Prior source identities remain unchanged; this table records the selected slice's source identity at HEAD plus preserved worktree inputs.

| Source | SHA-256 |
| --- | --- |
| `pwa/src/components/recipes/RecipeImportIssueSheet.tsx` | `e7c8376cf97f3f9c642fc874a892d461aac9da72e2abc82f70ad09c56a4c9ae3` |
| `pwa/src/components/recipes/RecipeImportIssueSheet.test.tsx` | `abe9245f3286bbc94debc3f9b720cf388ca4145e76a04813f3555dee21a56fe0` |
| `pwa/src/components/recipes/RecipeImportIssueBadge.tsx` | `9b95eac67d842a064c9a54a3b94f87a93c4664153a51646e11b7da8ff625b5e3` |
| `pwa/src/components/recipes/RecipeImportIssueBadge.test.tsx` | `5bd1eb668e0826b844467a613ca1b023401e903947c7c571ce2d72e3912b01dc` |
| `pwa/src/components/recipes/RecipeDetailSheet.tsx` | `bbc1bba8f16f3fa305775d072cb1c3850af34a24bd3979e2228b63984ca1a19c` |
| `pwa/src/components/recipes/RecipeDetailSheet.test.tsx` | `21727367dee891c473635cc2eafde324b0f6863e0dd4db1a7e82203d5e650da0` |
| `pwa/src/components/recipes/ActionGearMenu.tsx` | `d0c0c5ee92658de43cfb9fddc40b4d69030a02c348396e9044d1c77e218b8e75` |
| `pwa/src/components/recipes/ActionGearMenu.test.tsx` | `29e263dcc11fbbe33233e9f8884d94b070f6ffe4548334da0bfe99099f51b896` |
| `pwa/src/components/recipes/RecipeStackCard.tsx` | `6c9633e0414e9608ea8628efe3d22de9a9f9db4da7d8afe7b3de84ea255362ca` |
| `pwa/src/components/planner/CooksMode.tsx` | `daddc803a112db04791b202e546021e86d3985acf11dbdc3e4e15e60c211d91a` |
| `pwa/src/app/(app)/recipes/page.tsx` | `18b9605e8078e8ee46674a0e781836886697ce18e9166c0591aeac6c8fe78bb4` |
| `pwa/src/app/(app)/browse-all-stack/page.tsx` | `2beaa3dd23a1817db55c037a27fbe92f881444d4285726af1b034a15d8ece947` |
| `pwa/src/lib/api/recipes.ts` | `f4e70b39a2060bfc5b25010914f78e288321517db5c52c543d103502718dce7a` |
| `pwa/src/lib/api/api-client.ts` | `c5cd4cfebddd8d5c1f2827c522a236fe12c504130ea0991c07bc8fc46376aa95` |
| `pwa/src/lib/api/generated/api/recipes/item/importReport/index.ts` | `da2d1d8454fa6a1e64e9d82b7e5a8ae965f0d02272d5b48941aabbef60c86930` |
| `pwa/src/lib/api/generated/models/index.ts` | `03e19537845755d2cd0d30071284bc8a11007237e380433184d3edbe1ddb05e6` |
| `pwa/src/lib/api/recipe-import-report-contract.test.ts` | `8a0f34127f2580ea58d782b0d6aa7aedd142c485ac7c97d7c06f584d96d8d8a7` |
| `pwa/e2e/recipe-import-reporting.spec.ts` | `644a942cb84682530cd938c2a7235cf43e1f61e9a0827232060e8785324c8b28` |
| `pwa/e2e/mock-api.ts` | `063ed6d6629ccde163487a92543ae36918183a81b7301dd01a5389248cbcbd07` |
| `pwa/e2e/fixtures.ts` | `402b5a1b872f625dc1425f46afdede2c9378dcc473088159774a8455b5d188e2` |
| `pwa/playwright.config.ts` | `6e15ab7bb105dea06751d9e8dc5d3e4d280f0eb2d465553fbea5e2da65e91532` |
| `specs/openapi.yaml` | `0fbd27813611e16474ec17a48ede372d5a41af02db3fa9ded82295a6357046ff` |
| `api/src/RecipeApi/Controllers/RecipeController.cs` | `d1699c2de6f6cca9d879e67c0c7b9c7f0af4b2c4e104bc9ff04634b266eb5a70` |
| `api/src/RecipeApi/Controllers/RecipeImportController.cs` | `a5fe04c228c90f4f85bc4681df800a74af53d676599cac965c9ba60b27fe550b` |
| `api/src/RecipeApi/Services/RecipeImportReportService.cs` | `99776d8ddfb954d0def99460d868d43a3f3f24e08c4459bd30c132959e30acb3` |
| `api/src/RecipeApi/Services/RecipeImportService.cs` | `3016a8e38da063513813e813fad5f8fddf10f285abfa1ef3e0743c200ac1af14` |
| `api/src/RecipeApi/Services/RecipeService.cs` | `9eec9ab5cd7102081b3765b08a41b8de4d45325858d18ab4573a326afa256b74` |
| `api/src/RecipeApi/Services/RecipeSearchService.cs` | `31e2bf8a197582b4852ce3a98820827504f410a5ae281bc3a247aa19b5674377` |
| `api/src/RecipeApi/Services/RecipeSearchPredicate.cs` | `188a9a6285d5762f275fe16c3a7cc62f1f25395ddc59ae51a2b17d1c36d82e9b` |
| `api/src/RecipeApi/Services/WorkflowOrchestrator.cs` | `9812d17bface86d79fef75eab2ef7668c7c0bde18455c1ea46774b46dcc0b14c` |
| `api/src/RecipeApi/Services/WorkflowRepository.cs` | `1356e4b126077506c07633c2d977a419d96641e8a03f976d45f4e945775214d3` |
| `api/src/RecipeApi/Services/WorkflowWorker.cs` | `69f9023b0003ff2f0a5dda6d85bcb42e13ebf064b5c8529bc6b0866e5b3871df` |
| `api/src/RecipeApi/Services/Agents/RecipeAgent.cs` | `b23761d819726cf5dd8c50000cabc05198fba855865e6beba05de0ea8a6097af` |
| `api/src/RecipeApi/Services/Processors/CompleteRecipeImportReportProcessor.cs` | `0e5d13ababefa89cda1e3bc74e65065d7e9a51a49142a0e96b6b1c50a8e54b4d` |
| `api/src/RecipeApi/Services/Processors/RecipeReadyProcessor.cs` | `4206f98256cadae88d7be13a44e9d9d18b6c46679ba7b9f0aee0dcef8a848a74` |
| `api/src/RecipeApi/Services/Processors/SyncRecipeProcessor.cs` | `246f5ffe2effb7ddc6b0019e5f6ab0436cc20a93b06cf1cdc337007f4ccd2945` |
| `api/src/RecipeApi/Workflows/recipe-import.yaml` | `56977712412ec2c0b5a04495e77edbf3b97a71f92ad5f8da8546b58261de5b0a` |
| `api/src/RecipeApi/Workflows/url-import.yaml` | `6f142f8831390021091f5c3ca9603f056d138719d1904ae72cd75827beb73787` |
| `api/src/RecipeApi/Infrastructure/FamilyMemberIdModelBinder.cs` | `4d5dcc9f7d9993abb4c59802f770da139c4875c55544df8410553332a04a2f64` |
| `api/src/RecipeApi/Middleware/ErrorHandlingMiddleware.cs` | `b5849eb709ca2bc85efa3051d3a953ca955ef8704848327ad88d0297299d949b` |
| `api/src/RecipeApi/Models/RecipeImportReport.cs` | `2fa6fb2814f07dc9a2226156c01894a01c8006ff4c249c5573c830cd2fd6fc56` |
| `api/src/RecipeApi/Data/RecipeDbContext.cs` | `92084cf105ec2941e713fca9053609f4974156b6440fb72f9b623cf918916447` |
| `api/src/RecipeApi/Dto/RecipeImportIssueDto.cs` | `dfb97589523119034893672b27df15559938ff51370fc87a441642c34eb3daa1` |
| `api/src/RecipeApi/Program.cs` | `a4a2510b9cf0bbeb0e05072ab2bf2b299f4029e449bff17e7386b62f5321c523` |
| `api/database/schema.sql` | `3f7767cd704299374ebdcd89a11709680013ba26a477ad23f41da54e6da55161` |
| `api/database/compatibility.sql` | `bd3828fc1ce8b898b0feaa8f2e41be2e211cecadbefbfe9a68e14df435b859d5` |
| `api/src/RecipeApi.Tests/Integration/RecipeImportReportIntegrationTests.cs` | `0ed0a2308f813e83ac5742288fd5f8268018e232aeda2778ff44153e888bac75` |
| `api/src/RecipeApi.Tests/Integration/RecipeImportReportPostgresTests.cs` | `917bb45c566d0704fb95ea66f4271ec442932cfee2c7c0a698e6ce684b74e6e4` |
| `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` | `0ee567443fc0b5c11fffe631c94ea0407681b371224d8083a0e32b94b280804c` |
| `api/src/RecipeApi.Tests/Services/Agents/RecipeAgentPromptSelectionTests.cs` | `f221b4c7359e6c821101e7ad2276c922dde48549235b5e50939c9c73ec2768f1` |
| `api/src/RecipeApi.Tests/Services/WorkflowWorkerTests.cs` | `b701d122fa95c23309741e209dbd2f9f8da40404a0f59e221e2809cc11448434` |
| `pwa/src/lib/api/generated/api/recipeImports/item/index.ts` | `1ae62eeebd51f7e92a148f19fc356d38134406263c5275b0a917640b698f7454` |

### BSL-recipe-quality-006 — Recipe-quality main specification promotion

**Authorization A74 (2026-10-15):** User “promote” following the validated A73 draft authorizes syncing only the reviewed recipe-quality delta into main, with bounded plan/task follow-up. Installed openspec-sync-specs workflow used; CLI list/context/status confirms nearest repository root, new main capability and selected delta path; current specs-rule snapshot obtained before write. No archive, application implementation, qualification or successor extraction.

**Result:** New `openspec/specs/recipe-quality/spec.md` contains original Purpose and exact 13 requirements/35 scenario blocks from the reviewed ADDED delta, under a single Requirements header. Non-normative status note adapts the reviewed historical qualifications to promoted status; exact BSL-015 sentence, U22, A34, U01/U75–U79, A69 and feature-enabled PDF/U70–U74 limits remain. No requirement/scenario text changed. Delta, proposal, design and CLI metadata unchanged; draft/extraction verification remains historical, not runtime acceptance.

**Preservation:** All 172 unique source hashes match current bytes. Before-image comparison required for all prior tracked/untracked files except authorized plan/task updates; main identity 36/92, library 55/122, sharing 9/34 and capture 37/92 remain byte-identical. Existing description/PDF dirty work, index and sixteen active changes retained. Source HEAD remains `db6fede90ec0a7dfff26e6050036310bc8211837`.

**Verification:** Require main/specs/all strict validation, verbatim Purpose/requirement equality, full three-path documentation diff/scope review and explicit `task verify` for main recipe-quality, plan and selected tasks. Final observed results/content identity belong to response/current `.task/agent-finish/last-run.json`. Report failed/blocked outcomes separately. Runtime/browser/API/database/model checks **not-run** under A34; behavior TDD, client generation, migrations and service startup **not-applicable** to documentation promotion. No services started.

## Drafted slice — recipe-quality issue review and manual resolution

**Authorization A75 (2026-10-15):** User request “Discover and draft the next WFS OpenSpec baseline slice: recipe issue review and manual resolution”, supplied in the session attachment, authorizes documentation-only discovery and drafting of `baseline-recipe-quality-review-resolution`, capability `recipe-quality`. Use installed openspec-propose, preserve all existing work, strictly validate selected/all items, explicitly verify changed documentation paths and stop for human review. No promotion/archive/application work, runtime/database/model qualification or another slice.

| Dimension | Current evidence / boundary |
| --- | --- |
| Source identity | Branch `moving-to-openspec`, HEAD `db6fede90ec0a7dfff26e6050036310bc8211837`, plus preserved staged/unstaged/untracked inputs. Initial Git: modified durable plan and main capture; untracked description/PDF/reporting changes and main quality. No staged changes. |
| CLI root / inventory | `openspec list --json`, `context --json`, `list --specs --json`: nearest root `/Users/alex/Code/whats-for-supper`; five main capabilities; sixteen prior active changes. CLI scaffolds only selected change; seventeen active afterward. No init/reconfiguration. |
| Actual main headers | household-identity **36/92**, recipe-library **55/122**, recipe-sharing **9/34**, recipe-capture **37/92**, recipe-quality **13/35**. Historical 9/27 sharing/checkpoint statements remain historical; actual current headers are 9/34. All five main files unchanged this session. |
| Preservation | Private before-image of plan/full Git diff/index and all 110 existing OpenSpec files under `/tmp/wfs-review-resolution-before`; all **172** prior unique source table SHA-256 values match before drafting. Final comparisons cover prior artifacts, tracked files/index and intentional plan insertions/current-status replacements. |
| Behavior confidence | Implementation-supported, medium overall; high for local guards/projection/control flow. Tests' assertions inspected, none executed. A34 remains deferred. |
| Artifact state | Proposal, design, recipe-quality ADDED delta (11 requirements/28 scenarios), extraction tasks and CLI metadata. Draft for human review; CLI readiness is existence only, not acceptance/promotion/runtime verification. |
| Ownership | Reuse promoted recipe-quality 13/35 for entry/initialization/reasons/note/Save/contextual policy/ID polling/conditional outcomes/badges. Household-identity owns access/member identity; recipe-library owns detail reads/dismissal. Uncreated recipe-search owns general search/ranking/Top Pick policy/promotion/continuation/semantic retrieval/planner eligibility; dependency only, no new capability. |
| Exclusions | Cooking-mode callers are entry dependencies only; generic/bulk re-import, Settings retry/clear, initial capture/editing/hero/planning/cooking/demo/broader preview/install/deployment remain outside. Preserve feature-enabled PDF/U70–U74, A69, U01/U75–U79, A34 and all historical qualifications. |

### BSL-recipe-quality-007 — Review discovery, filter membership and immediate results

**Ordered sources:** `pwa/src/app/(app)/recipes/page.tsx` → `pwa/src/components/recipes/RecipeFiltersSheet.tsx` → `pwa/src/lib/api/recipes.ts` searchRecipes → native fetch POST using generated DTO types (generated `api/recipes/search/index.ts` is a contract reference, not the active wrapper call) → `specs/openapi.yaml` POST `/api/recipes/search`/review boolean fields → `RecipeSearchService.SearchAsync` → `RecipeSearchPredicate.Apply` and `BuildSql` → persisted `recipe_import_reports` → search `MapResult` → page cards/RecipeImportIssueBadge. General search mechanics are dependencies, not extracted here.

- One Filters button/sheet is used at all widths, despite mobile test IDs. More filters reveals Reported and Ready to review after New/It's Been a While; selected secondary choices stay visible on collapse. Draft booleans toggle true/null independently. Apply commits both filters/preferences, closes sheet and runs search. Close/backdrop/Escape dismiss without applying. Filters is bottom-aligned below md, centered at md; no separate desktop review control was found. Actual English locale labels are Reported/Ready to review, French Signalé/Prêt à vérifier. “Needs review” appears in issue-resolution explanation, not a separate route/view. U80.
- Review flags travel as search filters; LINQ and SQL both use any report for Reported and only ReadyToReview/ready_to_review for ready. Ready has else-if precedence over Reported. Thus Reported includes ready, Reimporting and ReimportFailed as well as Reported. Other predicates/text remain constraining. No inference that every stored recipe is eligible to appear, or that filters override the rest of search.
- Service maps ReadyToReview to readyToReview and every other report status to reported, absent row to null. Both active review flags suppress service Top Pick; page independently suppresses any supplied hero, labels Results and renders ordinary cards/badges. New successful empty filtered results show filter-removal guidance/Clear Filters. Broader Top Pick/promotion/ranking/continuation eligibility remains recipe-search ownership, not another extracted capability.
- Cards open existing detail flow; detail GET loads public issue and gear offers Review issue. Saved reason/note initialization and pending/failure guidance reuse promoted recipe-quality requirements, not duplicated here. Completion retains report for review (U78); readiness does not resolve or prove correction.

### BSL-recipe-quality-008 — Manual resolution request, persistence, feedback and later reads

**Ordered sources:** `RecipeImportIssueSheet.resolve` → `RecipeDetailSheet.handleResolveImportIssue` → `resolveRecipeImportIssue` → generated importReport.delete → DELETE `/api/recipes/{id}/import-report` → `RecipeController.DeleteImportReport`/FamilyMemberIdModelBinder → `RecipeImportReportService.DeleteAsync`/RequireRecipeAndMemberAsync → `RecipeDbContext`/RecipeImportReport/`api/database/schema.sql` → `ToDetailResponse`/ToPublicDto → client mapToRecipe → local detail → subsequent GetRecipeDetail/new SearchAsync.

- Existing issue alone exposes Mark as resolved, regardless of content provenance, selected reasons or note. Copy says Removes this recipe from Needs review. Ready status adds sage fill and asks to check recipe then resolve when it looks right. New form omits resolution. This is a manual acknowledgement, not recipe validation or automatic completion.
- Busy for Save/resolve disables Save and Resolve. isReimporting also disables reason/note controls and associates Resolve with the pending explanation. Foreground busy does not disable every field, Escape/Close/backdrop. resolve checks busy/pending, clears old error and awaits callback. On rejection it sets Could not mark as resolved. Try again. and clears busy without resetting reasons/note. Another eligible activation retries. Success relies on caller dismissal (busy stays true); mounted rejection only is claimed. No dedicated stale-target guard/cancellation guarantee on the detail resolve callback. U83.
- Wrapper uses loaded recipe ID and generated DELETE without a body; edited reasons/note are not saved by Resolve. HearthAuthProvider adds current member header (store then cookie); binder accepts parseable header then cookie. Controller missing context returns 400/status/message. RequireRecipeAndMemberAsync checks known member then existing recipe; middleware maps KeyNotFoundException to 404/status/message. No AddedBy/reporter/updater equality or CanReimport test is in DeleteAsync. These source checks do not qualify all authenticated household-member journeys; U76 import-ID restriction stays intact. Negative DELETE identity statuses are source/contract-supported, not specifically asserted in the resolution test.
- Static per-recipe semaphore is shared with submission, process-local only. If linked workflow exists Pending/Processing, DeleteAsync rejects before removal; controller emits 409/message. It does not simply inspect report.Status; terminal/missing workflow does not trigger that guard. DELETE OpenAPI and generated DELETE metadata list only 400/404, omitting 409 (U81); exact implemented conflict is evidence, withheld as a normative status/parity promise.
- Otherwise remove existing report and SaveChanges; absent report skips save. Return 200 unwrapped updatedAt/recipe with importIssue null in both cases. Entity/SQL key is recipe_id; resolution physically removes the report, without correction validation, new re-import, explicit search-index refresh or SSE. No preservation of a separate resolved-history row is implemented.
- Detail applies returned recipe, dismisses issue form, toasts Marked as resolved; null issue removes badge and makes gear Report issue. CooksMode uses same form/wrapper and updates its local recipe/clears context, without the detail toast: entry dependency only, no cooking requirements extracted.
- Successful new detail reads use AsNoTracking report lookup; no report projects null. New search report-existence/status queries exclude resolved recipe from review filters and map null issue if otherwise returned, absent intervening report. This is source composition, not an executed DELETE→GET/search test.
- RecipesPage detail onClose clears ID/restores scroll; onDeleted explicitly reruns search. Resolve invokes neither a refresh callback nor searchPromotionStore.invalidate; service publishes no report-change event. Parent loaded cards may retain badge/review membership; existing continuations are separate recipe-search state. U82 withholds immediate loaded-list freshness. No broad parent-library refresh or planner promotion eligibility claim.

### BSL-recipe-quality-009 — Inspected assertions, substitutions and qualification limits

| Source / actual assertions | Boundary / missing evidence |
| --- | --- |
| RecipeFiltersSheet.test.tsx: section ordering, More filters reveals exact Reported/Ready choices, selected Reported survives collapse; locale heading checks and callback mapping | Rendered component with callbacks/discovery metadata; no actual responsive browser layout or backend request |
| Recipes page.test.tsx: dismiss changed Reported without another search, apply both flags, count 2, clear back to undefined; supplied Top Pick hidden with review filter; public badges | searchRecipes/getRecipe and related API/store dependencies substituted; no persistence/resolution parent-refresh test |
| RecipeImportIssueSheet.test.tsx: saved Ingredients/note initialization, ready resolve fill/copy and callback once; active Resolve disabled/described; Save rejection keeps dialog | Resolution rejection/retry and foreground-busy Resolve not separately asserted; existing Save failure is not resolution failure evidence. Escape test title mentions focus trap but asserts Escape only (prior qualification retained). |
| RecipeDetailSheet.test.tsx: mocked resolve called with recipe ID; authoritative null issue removes badge, dismisses Review issue and toasts exact success | API methods/toast stubbed; “idempotent” in test title does not exercise repeated DELETE. Gear Report issue after resolve is source composition, not this test assertion. |
| ActionGearMenu/RecipeImportIssueBadge tests: existing issue label Review issue; Reported/Review accessible labels/styles, compact/French presentation | Component rendering only; no live refresh/access |
| RecipeImportReportIntegrationTests.Delete_IsIdempotent_AndReturnsNullIssue: submit Duplicate then DELETE twice, each 200/recipe.importIssue null | Does not assert DB absence, subsequent GET/search, distinct-member DELETE, or authenticated household access. Factory default auth disabled, EF InMemory, mocked orchestration persists Processing workflow. |
| Submit_MatchingActiveFeedback_ReusesWorkflow_WhileChangedFeedbackAndResolveAreRejected: accepted contextual feedback then DELETE returns Conflict | Mocked orchestrator bypasses real workflow validation. Does not assert rejection body or DB report retention after DELETE; retention supported by service branch. No pending-versus-processing/terminal/missing-linked-workflow DELETE matrix. |
| Detail_MapsPublicStatus_AndOmitsPrivateFields: four internal/public mappings and omitted private properties | Separately seeded detail read, not post-resolution read |
| RecipeSearchIntegrationTests.Search_ReviewFilters_UseReportedSupersetAndReadySubset_WithoutTopPick: seeded Reported/Failed/Ready/unreported, Reported returns three; ready/both only ready; topPick null | Factory EF InMemory/auth disabled, embedding provider stubbed; no Reimporting fixture here (supported by predicate). No DELETE→search assertion. ComposeWithTextAndExistingFilters uses chicken/discoverable/quick and asserts only expected reported matches. |
| RecipeImportReportPostgresTests: matching/stale lifecycle updates; content success ready versus mixed reported with report retained; missing lifecycle calls do not create; constraint compatibility | Opt-in WFS_TEST_POSTGRES_CONNECTION, isolated database creation from schema and teardown. No DELETE resolution test; inspected only, not executed. |
| pwa/e2e/recipe-import-reporting.spec.ts: mobile 390x844 sends Reported then Ready, normal result cards and hidden supplied hero; active reload Resolve disabled; failed/paused Resolve enabled; synthesized Duplicate resolution clears mock issue and badge | Browser cookies/localStorage/auth and method-sensitive POST/DELETE/GET routes substituted. DELETE blindly clears local harness state, no member/active checks. No loaded parent review-list refresh/retry/asserted subsequent real GET. The synthesized broad route handler is less strict and its POST shape differs from real submission. |
| Common e2e/mock-api.ts import-report route: DELETE clears active issue/import ID and returns builder recipe with updatedAt plus extra submission fields | Shared mock state and no real identity/workflow/DB validation; cannot qualify production lock or status contracts. Per-test harness DELETE omits required updatedAt. Prior U79 completeness limitations remain. |

All listed behavior is implementation-supported or an inspected assertion. **Executed application/runtime/database/model evidence: none.** No runtime is blocked by a failed attempt because none was authorized/run. No consequential open question needs an assumed answer: disputed guarantees are withheld (U80–U83), not converted into future implementation tasks.

### BSL-recipe-quality-010 — Draft mapping, source identities and final review boundary

All additions live only under `openspec/changes/baseline-recipe-quality-review-resolution/`; main recipe-quality stays 13/35. Proposal/design/delta/tasks and CLI metadata are draft artifacts, not acceptance/promotion/archive/application status. This is 11 requirements/28 actual scenarios; mappings below enumerate every scenario, including source-only branches.

| Requirement (exact delta header) | All scenario headers | Evidence / assertion limits |
| --- | --- | --- |
| 1. Discover and apply recipe review filters | Reveal review choices; Apply a review selection; Dismiss a changed review draft; Retain selected review choices after collapse | BSL-recipe-quality-007/009: sheet/page/browser assertions; responsive placement source only |
| 2. Select saved issue membership for review | Reported is a superset; Select ready reports; Both review filters are selected; Compose review with current search constraints | BSL-recipe-quality-007/009: predicate and seeded integration assertions; pending membership source only |
| 3. Present review matches as ordinary results | Receive review matches; Receive no review matches | BSL-recipe-quality-007/009: page/service and substituted UI assertions; empty guidance source |
| 4. Offer explicit manual resolution for an existing issue | Review a reported issue; Review an updated recipe; No saved issue exists | BSL-recipe-quality-008/009: sheet/gear tests; new-form omission/report styling source |
| 5. Lock resolution during submission and contextual processing | Foreground submission remains pending; Loaded issue is re-importing | BSL-recipe-quality-008/009: active disabled asserted; foreground locking source only |
| 6. Address manual resolution to the loaded recipe with member context | Resolve the loaded recipe; Missing parseable member context; Unknown member or recipe | BSL-recipe-quality-008/009: wrapper/generated/controller/binder; missing/unknown DELETE source only |
| 7. Remove saved feedback through repeatable manual resolution | Remove an existing report; Repeat resolution without a report | BSL-recipe-quality-008/009: repeated API 200/null asserted; DB removal source |
| 8. Reject resolution while the linked contextual attempt is active | Resolve during a linked active attempt; Resolve after a linked terminal attempt | BSL-recipe-quality-008/009: Processing conflict asserted; other workflow states source; U81 |
| 9. Apply successful resolution to the open detail | Apply the authoritative cleared response; Open the gear menu after resolution | BSL-recipe-quality-008/009: detail success stub assertions; post-success gear source |
| 10. Retain the mounted issue draft after resolution failure | Resolution request rejects; Try resolution again | BSL-recipe-quality-008/009: catch/retry source only; U83, no dedicated rejection test |
| 11. Reflect persisted resolution in subsequent successful reads | Read detail after resolution; Search again after resolution | BSL-recipe-quality-007/008/009: new-read source composition; no executed DELETE→read proof, U82 |

**Verification boundary:** Selected/all strict OpenSpec validation, full six-path documentation diff review and explicit-path `task verify` are the required checks. Final outcomes and content identity are in the response/current `.task/agent-finish/last-run.json`. Failed/blocked/not-run/not-applicable remain separate. Do not attach a pre-edit harness identity to later documentation bytes. No application test execution, service startup or runtime/database/model qualification is performed. Stop at human review.

**Observed documentation checks (A75):** Selected strict validation **passed**; all-item strict validation **passed 22/22**; six explicit paths `task verify` **passed** documentation/spec:check/content. Complete new artifact content and plan diff against private before-image reviewed. All 110 prior OpenSpec files, 1470 other existing tracked files and index bytes preserved; prior plan content retained except two intentional current-stage/next-action replacements. All 178 current unique source hashes match (172 prior plus six new); every 11 requirement/28 scenario header maps above. Artifact status: **validated draft for human review**, not accepted/promoted/archived/implemented. **Failed: none; blocked: none.** Runtime/API/browser/PostgreSQL/model checks **not-run** by instruction, A34 deferred. Implementation TDD/client generation/migrations **not-applicable**. Final verification repeats after this record; final content identity/results belong to response/current harness.

### Recipe quality review/resolution source identities — SHA-256

Current inspected source/dependency bytes at the recorded HEAD/worktree; hashes identify evidence, not a runtime result. All 172 prior unique source identities matched before drafting. Reused sources are rechecked; the following manifest identifies this slice's immediate inputs.

| Source | SHA-256 |
| --- | --- |
| `pwa/src/app/(app)/recipes/page.tsx` | `18b9605e8078e8ee46674a0e781836886697ce18e9166c0591aeac6c8fe78bb4` |
| `pwa/src/app/(app)/recipes/page.test.tsx` | `4e43afaf0d59302a1c219fba02e5df5c08bb03e143dc4d2c8f9b0393f69257e6` |
| `pwa/src/components/recipes/RecipeFiltersSheet.tsx` | `c588ae862e5482fcbd64c16803705829e3cd73b7d8f47b7628d3737bb8782e78` |
| `pwa/src/components/recipes/RecipeFiltersSheet.test.tsx` | `de916aec12545ffccd3a6a40baafcfd7a901ce9a94b7d089bf9bc3aee28e259d` |
| `pwa/src/components/recipes/RecipeImportIssueSheet.tsx` | `e7c8376cf97f3f9c642fc874a892d461aac9da72e2abc82f70ad09c56a4c9ae3` |
| `pwa/src/components/recipes/RecipeImportIssueSheet.test.tsx` | `abe9245f3286bbc94debc3f9b720cf388ca4145e76a04813f3555dee21a56fe0` |
| `pwa/src/components/recipes/RecipeImportIssueBadge.tsx` | `9b95eac67d842a064c9a54a3b94f87a93c4664153a51646e11b7da8ff625b5e3` |
| `pwa/src/components/recipes/RecipeImportIssueBadge.test.tsx` | `5bd1eb668e0826b844467a613ca1b023401e903947c7c571ce2d72e3912b01dc` |
| `pwa/src/components/recipes/ActionGearMenu.tsx` | `d0c0c5ee92658de43cfb9fddc40b4d69030a02c348396e9044d1c77e218b8e75` |
| `pwa/src/components/recipes/ActionGearMenu.test.tsx` | `29e263dcc11fbbe33233e9f8884d94b070f6ffe4548334da0bfe99099f51b896` |
| `pwa/src/components/recipes/RecipeDetailSheet.tsx` | `bbc1bba8f16f3fa305775d072cb1c3850af34a24bd3979e2228b63984ca1a19c` |
| `pwa/src/components/recipes/RecipeDetailSheet.test.tsx` | `21727367dee891c473635cc2eafde324b0f6863e0dd4db1a7e82203d5e650da0` |
| `pwa/src/components/planner/CooksMode.tsx` | `daddc803a112db04791b202e546021e86d3985acf11dbdc3e4e15e60c211d91a` |
| `pwa/src/lib/api/recipes.ts` | `f4e70b39a2060bfc5b25010914f78e288321517db5c52c543d103502718dce7a` |
| `pwa/src/lib/api/api-client.ts` | `c5cd4cfebddd8d5c1f2827c522a236fe12c504130ea0991c07bc8fc46376aa95` |
| `pwa/src/lib/api/generated/api/recipes/item/importReport/index.ts` | `da2d1d8454fa6a1e64e9d82b7e5a8ae965f0d02272d5b48941aabbef60c86930` |
| `pwa/src/lib/api/generated/api/recipes/search/index.ts` | `a3515a1910d6028767770a4080284e1d47bdfcf475e9257da3d2f1d33d6f3666` |
| `pwa/src/lib/api/generated/models/index.ts` | `03e19537845755d2cd0d30071284bc8a11007237e380433184d3edbe1ddb05e6` |
| `pwa/src/store/searchPromotionStore.ts` | `9b1fd64d9ea5549161233734a976392b1ba8cbd75333492296284784004e2fd8` |
| `pwa/src/locales/en/common.json` | `3519f2d7e0140a11786597976b6868fa195312e0bc3feb3e4d3c3e144a41d0bc` |
| `pwa/src/locales/fr/common.json` | `b5d957a8f395091038e1c3ab64fed1b300cd7f015e0e11172ed1cba611d4e198` |
| `specs/openapi.yaml` | `0fbd27813611e16474ec17a48ede372d5a41af02db3fa9ded82295a6357046ff` |
| `api/src/RecipeApi/Controllers/RecipeController.cs` | `d1699c2de6f6cca9d879e67c0c7b9c7f0af4b2c4e104bc9ff04634b266eb5a70` |
| `api/src/RecipeApi/Infrastructure/FamilyMemberIdModelBinder.cs` | `4d5dcc9f7d9993abb4c59802f770da139c4875c55544df8410553332a04a2f64` |
| `api/src/RecipeApi/Middleware/ErrorHandlingMiddleware.cs` | `b5849eb709ca2bc85efa3051d3a953ca955ef8704848327ad88d0297299d949b` |
| `api/src/RecipeApi/Services/RecipeImportReportService.cs` | `99776d8ddfb954d0def99460d868d43a3f3f24e08c4459bd30c132959e30acb3` |
| `api/src/RecipeApi/Services/RecipeService.cs` | `9eec9ab5cd7102081b3765b08a41b8de4d45325858d18ab4573a326afa256b74` |
| `api/src/RecipeApi/Services/RecipeSearchPredicate.cs` | `188a9a6285d5762f275fe16c3a7cc62f1f25395ddc59ae51a2b17d1c36d82e9b` |
| `api/src/RecipeApi/Services/RecipeSearchService.cs` | `31e2bf8a197582b4852ce3a98820827504f410a5ae281bc3a247aa19b5674377` |
| `api/src/RecipeApi/Models/RecipeImportReport.cs` | `2fa6fb2814f07dc9a2226156c01894a01c8006ff4c249c5573c830cd2fd6fc56` |
| `api/src/RecipeApi/Data/RecipeDbContext.cs` | `92084cf105ec2941e713fca9053609f4974156b6440fb72f9b623cf918916447` |
| `api/database/schema.sql` | `3f7767cd704299374ebdcd89a11709680013ba26a477ad23f41da54e6da55161` |
| `api/src/RecipeApi/Dto/RecipeDetailResponseDto.cs` | `a7a0e1c3190cf711feea3a618716d54fb5b1bcd4f19349c32ec813c13771d342` |
| `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` | `0ee567443fc0b5c11fffe631c94ea0407681b371224d8083a0e32b94b280804c` |
| `api/src/RecipeApi.Tests/Integration/RecipeImportReportIntegrationTests.cs` | `0ed0a2308f813e83ac5742288fd5f8268018e232aeda2778ff44153e888bac75` |
| `api/src/RecipeApi.Tests/Integration/RecipeImportReportPostgresTests.cs` | `917bb45c566d0704fb95ea66f4271ec442932cfee2c7c0a698e6ce684b74e6e4` |
| `api/src/RecipeApi.Tests/Integration/RecipeSearchIntegrationTests.cs` | `27fc0d86492bcaa25f440543e65ff5e4df5f05f3e1fc315bc4c6b73bd9aa1ce6` |
| `pwa/e2e/recipe-import-reporting.spec.ts` | `644a942cb84682530cd938c2a7235cf43e1f61e9a0827232060e8785324c8b28` |
| `pwa/e2e/mock-api.ts` | `063ed6d6629ccde163487a92543ae36918183a81b7301dd01a5389248cbcbd07` |

### BSL-recipe-quality-011 — Review/manual-resolution main-spec promotion

**Authorization A76 (2026-10-15):** User “promote” following the validated A75 draft authorizes syncing only the reviewed recipe-quality delta to main, plus bounded plan/task records. Installed openspec-sync-specs workflow used. CLI list/context/status resolves nearest repository root and the sole selected delta path; current specs-rule snapshot obtained successfully before write. No archive, application implementation, runtime/database/model qualification or successor extraction.

**Result:** Original Purpose, all existing qualification text and all prior 13 requirements/35 scenarios retained. Appended exact 11 reviewed requirements/28 scenarios under the single main Requirements header; main recipe-quality now **24 requirements/63 scenarios**. Added a non-normative A76 evidence/limitation note only. No normative text changed. Original delta, proposal, design and CLI metadata remain byte-for-byte unchanged; extraction tasks gain only this promotion follow-up. Main household-identity 36/92, recipe-library 55/122, recipe-sharing 9/34 and recipe-capture 37/92 unchanged.

**Preservation and limits:** All **178** unique source table SHA-256 values match current files. Before-image comparison checks the prior main blocks/Purpose/qualifications, complete selected delta/artifacts, other OpenSpec/tracked files, Git index and prior plan content (only current stage/next action are replaced; evidence/approval/history retained). Source/test-inspected support remains distinct from runtime evidence. U80 actual filter labels, U81 undocumented DELETE conflict, U82 loaded-parent freshness, U83 negative/retry/access/real-store gaps stay unresolved. Preserve U01/U75–U79, feature-enabled PDF/U70–U74, A69's description-status caveat, A34 and all earlier historical qualifications. Successful processing retains the report until explicit resolution; semantic correction is not established.

**Verification:** Main recipe-quality strict validation and all five main-spec strict validation passed after sync. Require final all-item strict validation, exact delta/prior-block equality, full three-path documentation diff review and explicit `task verify` for main recipe-quality, plan and selected tasks. Final observed outcomes/content identity belong to response/current `.task/agent-finish/last-run.json`; report failed/blocked separately. Application/runtime/API/browser/database/model checks **not-run** under A34; implementation TDD/client generation/migrations **not-applicable**. Seventeen changes stay active; no archive, implementation or successor work.

## Draft slice — recipe quality / Settings failed-capture recovery

**Authorization A77, 2026-10-15:** Attached request selects `baseline-recipe-quality-failed-capture-recovery`, recipe-quality, documentation-only discovery and installed openspec-propose drafting. Authorized files are this plan and the selected change's five CLI/artifact files. Stop at a validated draft for human review; no application, tests, contract, generated client, SQL, dependencies/configuration, service startup, runtime/database/model qualification, promotion, archival or successor work.

**Identity and preservation:** HEAD `db6fede90ec0a7dfff26e6050036310bc8211837`; private plan before-image and full existing tracked/untracked content/index snapshots captured before artifact drafting or plan edits. Initial work included modified plan and main recipe-capture; untracked description/PDF/issue-reporting/review-resolution changes and main recipe-quality. Preserve all of them. CLI list/context resolves nearest root `/Users/alex/Code/whats-for-supper`; no initialization/reconfiguration. Eighteen active changes after selected CLI scaffold, seventeen prior. Main headers independently count household-identity **36/92**, recipe-library **55/122**, recipe-sharing **9/34**, recipe-capture **37/92**, recipe-quality **24/63**. All **178** prior unique source SHA-256 table entries match current files before drafting. This discovery is implementation-supported and test-source-inspected, not runtime-qualified.

### BSL-recipe-quality-012 — Connected Settings list, presentation and local action feedback

**Domain/purpose:** Let households manage existing failed acquisition attempts from Settings without recreating saved-recipe issue reporting or general workflow administration. Profile's settings-btn pushes PROFILE_SETTINGS (`/profile/settings`); SettingsPageContent mounts FailedCapturesSection unconditionally between Family GOTO and Preview features, with Back to Profile. No preview flag gates the section. Household-identity retains shared access/identity transport ownership; no new role/member-access policy is inferred.

**Ordered seam:** `profile/page.tsx` → `profile/settings/page.tsx`/`SettingsPageContent.tsx` → `components/profile/FailedCapturesSection.tsx` → `lib/api/captures.ts` → generated `api/captures/failures/{index,item/index,item/retry/index}.ts` → `specs/openapi.yaml` → `CapturesController` → `CaptureFailureService` → persistence described in BSL-013 → DTO/generated parsing → wrapper normalization → component local state. Shared api-client injects current member/cookie and SSE headers, but these controller actions do not bind a member, filter attribution or pass requestedBy to ClearAsync. A DTO familyMemberId is associated recipe attribution, not an ownership gate.

**List and representations:** Mount-only effect GETs, initially empty; pending, empty and caught rejection all render null. No dedicated loading/error/empty card or in-place fetch retry. GET selects Paused url-import/recipe-import with Any Failed task, sorts workflow UpdatedAt descending without a tie-breaker; separately loads associated recipes ignoring soft-delete filters. DTO id and workflowInstanceId both equal instance ID; recipeId is parsed from parameters (recipeId/RecipeId), familyMemberId from associated AddedBy, preview from parameter url or recipe.SourceUrl. Invalid/missing recipe parameters yield null rather than excluding the workflow. Most-recent failed task supplies task name, retry count and lastFailedAt; createdAt is workflow creation. status is failed, sourceType url or photos. DTO contains provenance fields/timestamps but row displays only friendlyReason and nonempty truncated preview, Retry and accessible Clear. Wrapper defaults missing items to [], nullable strings/ids to defaults and dates to ISO; workflowInstanceId falls back to id.

**Privacy/guidance:** CaptureFailureReasonMapper knows four codes but this service always calls it with null; FailureCode is null. Current friendlyReason is the generic English fallback (even with French Settings labels), not code-specific diagnostics. Raw ErrorMessage and StackTrace stay out of this list DTO. Preview URLs/task names are still returned; no blanket privacy sanitization claim. The component test's code-specific friendly text comes from a stub, not production classification.

**Retry UI:** POST row failure id without payload; adds retryingIds only after wrapper resolves. Before that Retry remains enabled, so repeated requests can overlap; after acknowledgement button becomes Retrying… and row remains. It ignores queued, never watches worker progress, and Clear remains available. Rejection adds errorIds, retains row and permits another Retry absent overlapping success. Existing error persists during a new attempt and clears only on success. Local Retrying… lasts for this mount.

**Clear UI:** clearingIds guard; browser confirm first, cancellation returns without DELETE. Confirmation sets per-row clearing state before awaiting DELETE by failure ID. Only Clear is disabled; Retry remains independent. Wrapper resolution removes targeted row without checking cleared/cleanupCommandId, clears error and hides section if last row. Catch retains row with shared Retry failed. Please try again. message; finally releases Clear lock. Another Clear confirms again. No toast, cleanup observation, once-only/race ordering or cancellation of in-flight calls is implemented. The mount effect has no member dependency, polling, focus refresh, SSE or mutation invalidation. Loaded failures and post-retry acknowledgement can be stale; a fresh mount reads current persisted eligibility.

### BSL-recipe-quality-013 — Accepted requests, persisted changes and deferred consumer effects

**Retry endpoint:** RetryAsync loads instance/tasks by GUID. Missing → NotFound/controller 404; wrong status/workflow/no failed task → NotFailedCapture/controller 422. Eligible selection is latest failed task by UpdatedAt. Makes it Pending/ScheduledAt clock.UtcNow, clears ErrorMessage/StackTrace, updates task and instance timestamps, makes same workflow Processing and saves before controller 202/data.queued true. Task identity, RetryCount, result/payload, dependencies and other tasks are retained; no new acquisition, report feedback, immediate recipe correction or direct worker invocation. AlreadyRetrying/409 exists in controller but is never returned by this service. A sequential repeat sees Processing and returns 422; no guaranteed ALREADY_RETRYING or concurrent deduplication. Withheld exact normative retry-rejection status because POST contract only describes 202/409 (U85).

**Resumption boundary:** Existing WorkflowWorker loop selects due Pending tasks using PostgreSQL-specific SQL/skip-locked (fallback LINQ for unsupported providers), takes ten, then throttles by processor, reloads task, records Processing and invokes stored ProcessorName. Successful completion updates task and promotes dependencies; transient/fatal paths can schedule or fail/pause again. RetryCount remains consumed. A task being due is eligibility, not immediate start, successful recovery or completion of every failed task. Capture processing/readiness/session notifications remain recipe-capture-owned; no new guarantees for external model or source quality.

**Clear persistence:** Same paused-failed predicate; missing controller 404, ineligible 409. Recipe lookup ignores deletion filters; protects IsDiscoverable OR (nonblank Name AND (ImageCount>0 OR IsSynthesized)). This heuristic is not universal readiness. Otherwise DeletedAt/DeletedBy are filled only if absent, DeleteNote records failed-capture-clear workflowInstanceId, IsDiscoverable=false and UpdatedAt advances. Controller passes null requestedBy, not selected member. A pending `DeleteFailedCaptureResidue` MaintenanceCommand stores recipeId (nullable), workflowInstanceId, sourceWorkflowId and reason user-cleared-failed-capture, generates command UUID, and workflow is removed in the same SaveChanges. EF relationship and schema.sql workflow_tasks FK both cascade task removal. Controller 202 returns data.cleared true/data.cleanupCommandId. No initial file deletion or report-resolution call.

**Queued cleanup dependency:** Dreaming maintenance task → registered ManagementProcessor ProcessMaintenanceCommands → ManagementService batch selects up to 50 due pending commands in creation order, marks processing/increments attempts, then consumes the command. It removes any remaining referenced workflow, reads recipe ignoring filters and rechecks the same safety predicate. Unsafe recipe: recursively removes existing ActiveRecipesRoot/id directory and removes row; safe recipe: skipped, recipe-became-ready-or-discoverable. Missing recipe/no recipe ID: completed recorded no-op. Result includes identities/reason/filesDeleted/recipeDeleted/outcome; caught exceptions mark failed with diagnostics. File effects precede save and are not transactionally coupled; pending acknowledgement does not prove consumer execution or full rollback, failed commands are not reselected by this pending-only batch. No cleanup deadline/status UI or general maintenance policy added here.

**Subsequent reads:** GET predicate excludes accepted retry while Processing and excludes cleared workflow while absent, even if cleanup is pending/failed or protected recipe survives. A later paused failed task can reappear on a new read. Component does not apply that read without remount; retry acknowledgement does not imply immediate loaded-list removal. The cleared row's local removal and database eligibility are separate observations.

**Overlap:** Promoted recipe-quality reporting/contextual re-import and review/manual resolution 24/63 remain unchanged. Clearing a failure removes a workflow and conditionally residue, not the explicit recipe import-report DELETE journey. No automatic resolution or semantic recipe correction inferred; related cascades do not certify human review. Recipe-capture's promoted Recover eligible failed PDF imports using retained work already owns its three scenarios (retry with flag off; failed conversion clear; action rejection), and preparation reuse/source effects remain with its PDF requirements. No PDF-specific additions here. Acquisition/extraction/readiness, general workflow scheduling/maintenance and ordinary library deletion remain dependencies.

### BSL-recipe-quality-014 — Actual assertions, fixtures and substitutions

**Inspected, not executed:**

- Settings page unit tests stub FailedCapturesSection and assert its stub alongside other sections. Profile test checks selection/language stubs; it does not assert Settings navigation. Entry/Back are source-supported.
- FailedCapturesSection.test.tsx substitutes captures module and locales and accepts confirm. Asserts hidden empty section (twice), row/reason testid presence (not exact reason content), Retry called with failure ID, post-success Retrying… and clear called with ID/removes row. Does not assert rejected list/retry/clear, confirmation cancellation, in-flight lock/repeated actions, error retention, concurrent response ordering or no polling.
- failed-captures-contract.test.ts reads generated file text: model names/field substrings, builder presence and DELETE signature. No executed HTTP serialization/status parity or required-field semantics are established by these assertions.
- CaptureFailureIntegrationTests default factory omits household auth, uses EF InMemory and InMemoryRecipeStore, mocked orchestrator and a synthetic extract_recipe/ExtractRecipe failed task. GET assertions include URL paused failed record and exclude scheduled Processing/Pending and db-backup. Retry asserts 202/queued, Processing/Pending, diagnostics cleared and due time; seeded RetryCount 3 is not explicitly asserted retained, no endpoint-to-worker execution. Clear asserts 202/cleared/nonempty command ID, workflow/tasks absent, pending command, soft deletion. Two independently seeded maintenance commands directly invoke ManagementService: unsafe recipe row/directory gone and completed/result contains recipeDeleted; safe recipe survives and command skipped. These do not establish actual scheduled Dreaming consumption, skip-locked behavior, PostgreSQL cascades, full clear payload or controller auth. No dedicated retry/clear missing/ineligible/rejection tests, multi-failure ordering or subsequent endpoint GET after actions in this file.
- WorkflowWorkerTests fatal-failure theory uses substituted processors/in-memory DB and invokes worker processing directly; asserts paused instance/failed task, capture failure membership and event/report effects for eligible workflows. It is adjacent failure-production evidence, not Settings retry-to-success qualification.
- settings.spec.ts uses common fixtures and visits Settings for layout/family/preview behavior; common GET returns empty failures, DELETE accepts without persisted mutation, retry handler accepts without a method check. No failed-row recovery assertions there.
- search-hardening.spec.ts Scenario 5 overrides GET/POST, sets failuresReturned=false upon retry, asserts row/202/one call/Retrying…, then explicitly page.goto Settings and asserts empty GET/hidden section. This is mocked new-mount behavior, not mounted polling or real workflow completion. Its failure fixture omits required workflowInstanceId/sourceWorkflowId; unit fixture supplies workflow fields but injects a known failureCode unlike production null. Neither proves live contract parity.

**Confidence:** High for direct source branches and inspected positive assertions; negative/error/ordering/freshness assertions absent as above. No current API/browser/database/worker/model result or production guarantee. A34 stays deferred; U01/U75–U83 and all historical qualifications remain.

### BSL-recipe-quality-015 — Draft mapping, artifacts and review handoff

**Artifacts:** CLI `.openspec.yaml`, proposal, extraction design, `specs/recipe-quality/spec.md` and documentation-only tasks under `openspec/changes/baseline-recipe-quality-failed-capture-recovery/`. Draft only; validation is not acceptance, promotion, archival or implementation. Main specs remain unchanged at the counts above. Scope contains no application/contract/generated/SQL/dependency/configuration changes.

**Complete mapping:** The following table lists every exact delta requirement and all its scenarios. Source support is BSL-012 (UI/client), BSL-013 (API/persistence/consumer) and BSL-014 (inspected assertions and limits); no row establishes executed runtime evidence.

| Requirement (exact delta header) | All scenario headers | Evidence / assertion limits |
| --- | --- | --- |
| Enter failed-capture management through Settings | Open Settings from Profile; Return to Profile | BSL-012/014: entry/back source; Settings section stub asserted |
| Show failed-capture management only for a loaded nonempty list | Initial request remains pending; List is empty; List request rejects | BSL-012/014: empty asserted; pending/rejection source only, U84 |
| List active paused capture failures in update order | Eligible capture failures exist; Scheduled or unrelated work exists | BSL-013/014: seeded membership/exclusion asserted; order/identity source |
| Present friendly capture-failure guidance without raw diagnostics | Display a returned failure; Stored failure contains private diagnostics | BSL-012/014: row/reason element asserted; diagnostics/fallback source, U86 |
| Address capture retry to the loaded workflow failure | Retry resolves successfully; Retry response is still pending | BSL-012/014: ID/post-success acknowledgement asserted; pending behavior source, U84 |
| Retain failed-capture rows after rejected retry | Retry rejects without overlap; Try retry again | BSL-012/014: catch/retry source only; overlapping dispatch unqualified, U87/U88 |
| Accept retry by resetting existing failed work | Persist an eligible retry; Retry reaches an ineligible identity | BSL-013/014: reset/accepted fields asserted; retained count/negative/worker source, U85/U87 |
| Confirm and lock failed-capture clearing | Cancel clear confirmation; Confirm clear and wait | BSL-012/014: clear ID asserted; confirmation/cancel/pending source only, U87/U88 |
| Apply clear acknowledgement to the loaded list | Clear one of multiple rows; Clear the final row | BSL-012/014: row removal asserted; multiple/final-row conditions source |
| Retain failed-capture rows after rejected clear | Clear rejects; Try clearing again | BSL-012/014: clear catch/retry source only, U88 |
| Persist clear and return queued cleanup identity | Clear persistence succeeds; Clear is no longer eligible | BSL-013/014: removal/cascade/pending command asserted in EF InMemory; rejection/payload source |
| Protect usable recipe content during failed-capture cleanup | Clear unfinished residue; Cleanup still finds unfinished residue; Content is usable at clear or cleanup | BSL-013/014: consumer delete/skip asserted via direct service invocation; clear heuristic source |
| Distinguish subsequent failure reads from stale mounted state | Read after accepted retry; Read after clear; Work changes while Settings remains mounted | BSL-012/013/014: new-mount mocked retry read asserted; real reads/stale mount source, U84/U88 |

**Actual draft counts:** 13 ADDED requirements / 29 scenarios. Proposed main total after a separately authorized exact promotion would be 37/92; current main remains 24/63.

**Checks and status:** Selected/all strict OpenSpec validation, complete six-path documentation diff review, mapping/count/source identity and before-image/index preservation checks plus explicit six-path `task verify` are required. Final results/content identity belong to the response/current `.task/agent-finish/last-run.json`, not an earlier digest. Runtime/API/browser/PostgreSQL/model checks are **not-run** by instruction; application TDD/client generation/migrations are **not-applicable**. No application tests or services run. Stop for human draft review; no promote/archive/apply/successor work.

**Observed A77 documentation checks:** Selected strict validation **passed**; all-item strict validation **passed 23/23**; six explicit paths `task verify` **passed** documentation, spec:check and content. Complete new artifacts and plan changes reviewed; exact 13 requirement/29 scenario mapping checked. All **1491** existing other paths and index bytes preserved, with prior plan content retained except intentional current-stage/next-action replacements and additive evidence/history. All **198** current unique evidence-source hashes match (178 prior, 20 new; reused route/registration inputs included). **Failed: none; blocked: none** for required documentation checks. Runtime/API/browser/PostgreSQL/worker/model qualification **not-run**, A34 deferred. Application TDD/generation/migrations **not-applicable**. Artifact status: **validated draft for human review**; no acceptance, promotion, archival or implementation. Final validation repeats after this record and task-status edits; final content identity/results belong to response/current harness.

### Failed-capture recovery source identities — SHA-256

These current source bytes identify read-only evidence, not a passing runtime result. Prior 178 unique identities matched before drafting. This manifest adds immediate inputs and rechecks reused boundaries.

| Source | SHA-256 |
| --- | --- |
| `pwa/src/app/(app)/profile/page.tsx` | `2276868bc76ec0f13f2293ea5f1ae46ed2c1181cb386fb9c45e1ae6c7ef200c4` |
| `pwa/src/app/(app)/profile/page.test.tsx` | `529e954a8515fa92b21b2fc7796185a5681b914fc206e4bd62f3c96ecae6a8c4` |
| `pwa/src/app/(app)/profile/settings/page.tsx` | `50a78692d92af7d84de69c1b4d9990e4ed00f83961b0d6ab580b63fd979b0e18` |
| `pwa/src/app/(app)/profile/settings/SettingsPageContent.tsx` | `3deed0d88c6ac8f4ab5b94cc4724ae163dae344fd39c7aaccdf8a0c67d7e9aec` |
| `pwa/src/app/(app)/profile/settings/page.test.tsx` | `f4f9abe7689432b86e8aff39e70969473792c97210ea38282eb57c3896d0feab` |
| `pwa/src/components/profile/FailedCapturesSection.tsx` | `2632d08670b6b1b9959fe39e7141bb8cc15932082877ce7402a5dcd24ba0b6af` |
| `pwa/src/components/profile/FailedCapturesSection.test.tsx` | `f518c27b3116b7b0641370e7acae81d1e45742aeed115d5f3089b9b837690e56` |
| `pwa/src/lib/api/captures.ts` | `ca0d112b46ce3bf0c60dc7a1ce7de4039d70ac6028dfb7d37314805e510b302f` |
| `pwa/src/lib/api/failed-captures-contract.test.ts` | `bd0cb4b0f407f632479c6c219086e88bfdfbf62642da757212d6f4da4794927a` |
| `pwa/src/lib/api/api-client.ts` | `c5cd4cfebddd8d5c1f2827c522a236fe12c504130ea0991c07bc8fc46376aa95` |
| `pwa/src/lib/api/generated/api/captures/failures/index.ts` | `941616534120bd48410e3777e40e1192fd0c9742a2e4aa94510d51b019472116` |
| `pwa/src/lib/api/generated/api/captures/failures/item/index.ts` | `dda1ec302ddb8a01030b3e320633aa9de79dc31528d63c0a564cffeeb9962f86` |
| `pwa/src/lib/api/generated/api/captures/failures/item/retry/index.ts` | `53b502626fc323702aa1c2ff93efbb17f8b23135e135c6a9b32f170c0e9d2fd5` |
| `pwa/src/lib/api/generated/models/index.ts` | `03e19537845755d2cd0d30071284bc8a11007237e380433184d3edbe1ddb05e6` |
| `pwa/src/locales/en/common.json` | `3519f2d7e0140a11786597976b6868fa195312e0bc3feb3e4d3c3e144a41d0bc` |
| `pwa/src/locales/fr/common.json` | `b5d957a8f395091038e1c3ab64fed1b300cd7f015e0e11172ed1cba611d4e198` |
| `pwa/e2e/settings.spec.ts` | `2663d9e27dc756b6e60be57c1d440d00bd99d6b73c8cccc54add595eecc50a82` |
| `pwa/e2e/mock-api.ts` | `063ed6d6629ccde163487a92543ae36918183a81b7301dd01a5389248cbcbd07` |
| `pwa/e2e/search-hardening.spec.ts` | `5ced566ad08583dd75abf434d0a15bc6c5be0e380483f7147cbc29e9b1bf6a03` |
| `specs/openapi.yaml` | `0fbd27813611e16474ec17a48ede372d5a41af02db3fa9ded82295a6357046ff` |
| `api/src/RecipeApi/Controllers/CapturesController.cs` | `2c6288fcac9627acefd02de76a77822d4a51955cd8db8b32ae967bf5c035e85f` |
| `api/src/RecipeApi/Services/CaptureFailureService.cs` | `88a7b76335db0873e0d5e4bcde15783a2ec792d84f97f967a24f3bcf5b79db29` |
| `api/src/RecipeApi/Services/CaptureFailureReasonMapper.cs` | `c31eb1c126d14ceea54f0313e3bddbdc370c47d5a1c4ab1a27b16218ddcb2de3` |
| `api/src/RecipeApi/Dto/CaptureFailureDto.cs` | `2c4556469d5bb3125b7638ab900baf967f5b6d6c8df9af80a2b4b6b98272b258` |
| `api/src/RecipeApi/Dto/CaptureFailureClearResponseDto.cs` | `f6f678f3352b466bbacf8ed3226ef34cb0551482b0a9f92ab28d2c26316852ba` |
| `api/src/RecipeApi/Models/WorkflowInstance.cs` | `82d14b99d40c02ec5b10c188a16d190e865fd1b6246bc514ee37021b7d537641` |
| `api/src/RecipeApi/Models/WorkflowTask.cs` | `3408be49a3afafc7ac70d6104124dcfcdd8df7509162ff9186d3581bb30f6e06` |
| `api/src/RecipeApi/Models/MaintenanceCommand.cs` | `662a52cec600eab7434f8b8b45c4b28e31573dec129ad538acad08dc40415b84` |
| `api/src/RecipeApi/Data/RecipeDbContext.cs` | `92084cf105ec2941e713fca9053609f4974156b6440fb72f9b623cf918916447` |
| `api/database/schema.sql` | `3f7767cd704299374ebdcd89a11709680013ba26a477ad23f41da54e6da55161` |
| `api/src/RecipeApi/Services/WorkflowWorker.cs` | `69f9023b0003ff2f0a5dda6d85bcb42e13ebf064b5c8529bc6b0866e5b3871df` |
| `api/src/RecipeApi/Services/RetryScheduler.cs` | `e3849aceddc86ccca36766c284c4c90f0bddf65ed7398d7c0140efbf136ff965` |
| `api/src/RecipeApi/Services/ManagementService.cs` | `c24464baa8f853c7195e30de61b168ef2b8eda059545a5449580807448811c4f` |
| `api/src/RecipeApi/Services/Processors/ManagementProcessor.cs` | `484abcf7eb3d3e5c2882c785edea3a4a3083f7f7c2efc3c5e479aad7e561096f` |
| `api/src/RecipeApi/Workflows/dreaming.yaml` | `862cf700ca717dd5b09b5f6dfb84b6f8810448c6080b805e2b3ff62289f9853d` |
| `api/src/RecipeApi.Tests/Integration/CaptureFailureIntegrationTests.cs` | `a16687f8b455625fb73002cc1e6327972014018b4d788ee645b3079bd84a00ae` |
| `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` | `0ee567443fc0b5c11fffe631c94ea0407681b371224d8083a0e32b94b280804c` |
| `api/src/RecipeApi.Tests/Services/WorkflowWorkerTests.cs` | `b701d122fa95c23309741e209dbd2f9f8da40404a0f59e221e2809cc11448434` |
| `pwa/src/lib/constants/routes.ts` | `790d2da3e039578fd7d291dead52213bfd2282b17517f973029bafac37f34d70` |
| `api/src/RecipeApi/Program.cs` | `a4a2510b9cf0bbeb0e05072ab2bf2b299f4029e449bff17e7386b62f5321c523` |

### BSL-recipe-quality-016 — Settings failed-capture recovery main-spec promotion

**Authorization A78 (2026-10-15):** User “promote” after the validated A77 draft authorizes only syncing its reviewed recipe-quality delta into main plus bounded plan/task follow-up. Installed openspec-sync-specs workflow used; CLI list/context/status resolve the repository root and sole selected delta. Current specs instructions obtained successfully before write. No archive, application implementation, runtime/database/model qualification or successor extraction.

**Result:** Appended the exact **13 requirements/29 scenarios** from `baseline-recipe-quality-failed-capture-recovery`; main recipe-quality is now **37 requirements/92 scenarios** under its single Requirements header. Original Purpose, all prior 24/63 blocks and qualification bytes retained. Full selected delta/proposal/design/metadata unchanged. Other main specs remain household-identity 36/92, recipe-library 55/122, recipe-sharing 9/34 and recipe-capture 37/92. Source change remains active; eighteen changes total.

**Preservation and limits:** All **198** unique source table hashes match. Private before-images identify current main/plan/tasks and full existing tracked/untracked content/index. Preserve all other files and prior plan history, with only current-stage/next-action replacements and additive promotion records. BSL-recipe-quality-012–015 and U84–U88 retain request acceptance versus recovery, queued cleanup versus execution, hidden list errors, post-response retry feedback, stale mounted state, retry-contract discrepancy, conditional safety and missing negative/runtime evidence. U01/U75–U83, PDF/U70–U74, A69's description-status caveat, A34 and all historical qualifications remain. No automatic issue resolution, verified recipe correction, successful recovery or completed cleanup inferred.

**Verification:** Require strict main/specs/all validation, exact prior-main/delta equality, full three-path documentation diff review, source/index/other-file preservation and explicit `task verify` for main recipe-quality, plan and selected tasks. Final observed outcomes and tested content identity belong to the final response/current `.task/agent-finish/last-run.json`. Runtime/API/browser/worker/PostgreSQL/model qualification **not-run** under A34; implementation TDD/client generation/migrations **not-applicable**. No archive/application/successor work.


## Execution prompt

Paste this prompt and replace the session instruction with the desired bounded
scope. The default authorizes review only. Select the model in your host.

```text
Work on the recipe-quality OpenSpec brownfield baseline in
/Users/alex/Code/whats-for-supper.
Session instruction: Review this capability's checkpoint and recommend the next
bounded slice. Do not generate specs or change application behavior.

Read AGENT.md and its active-host loading rules, then
 docs/openspec-baseline/workflow.md and
 docs/openspec-baseline/recipe-quality.md.
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

## Completeness audit and remaining draft generation — 2026-10-16

### Authorization, identity and preservation

The current user request authorizes a capability completeness audit and sequential
generation of every remaining implementation-supported recipe-quality draft,
including connected API-only behavior. This supersedes historical successor-slice
restrictions for **generation only**. Settled A04/A10–A12/A34 and the approved
capability structure are reused. No new consequential product decision was needed:
uncertain execution, repair, access and recovery guarantees remain withheld.

Branch: `moving-to-openspec`; HEAD:
`04a1c4570f9bbb01b47436790d4248635ac3179a`. Initial Git includes staged workflow,
Taskfile, baseline-plan, other capability plans/main specs and many active-change
artifacts; unstaged recipe-capture/discovery/meal-planning documentation and
untracked capture/discovery/meal-planning changes. The existing quality
issue-reporting design/delta are staged modifications. These inputs are preserved,
not owned by this session. A private full tracked/untracked file digest, porcelain
status and exact staged binary diff snapshot was captured before writes in
`/tmp/recipe-quality-before.json`. No source/configuration/index change is authorized.

Loaded AGENT/context-loading/Codex adapter, applicable mission/contract-testing/
execution-harness rules, shared baseline workflow, this plan and main quality spec.
No subtree AGENTS.md was found under docs or openspec. Installed openspec-propose
and project spec-driven configuration control scaffolding, dependency order and
artifact paths. CLI context/list resolve nearest root `/Users/alex/Code/whats-for-supper`;
no external store is selected and no initialization/configuration write is needed.
All existing active quality artifacts were inspected before scaffolding; their
names are retained and no duplicate change is generated.

### Reconciliation of the three promoted journeys

| Journey / active change | Main coverage | Evidence and present reconciliation |
| --- | --- | --- |
| `baseline-recipe-quality-issue-reporting` | 13 requirements / 35 scenarios, exact delta blocks present in main | BSL-001–006; detail/gear/shared form → recipes.ts/generated POST/OpenAPI → controller/report service → report row/attempt snapshot → returned recipe, ID watch and conditional terminal projection. U01 and U75–U79 remain. |
| `baseline-recipe-quality-review-resolution` | 11 / 28, exact delta blocks present in main | BSL-007–011; filters/search predicates and returned badges → loaded-ID DELETE → linked active guard/report removal → local detail and subsequent persisted reads. U80–U83 remain, with the assertion correction below. |
| `baseline-recipe-quality-failed-capture-recovery` | 13 / 29, exact delta blocks present in main | BSL-012–016; Profile/Settings → captures wrapper/generated resources → paused-failed eligibility → reset or clear/maintenance command → acknowledgement, conditional cleanup and fresh-mount reads. U84–U88 remain. |

The three pre-existing active quality changes contain exactly the promoted **37/92** requirement/scenario
blocks; none requires finishing, redrafting or modification. Main, existing active
quality changes, qualifications and unrelated work remain preservation inputs.
Actual inspected assertions include report normalization/manual/active/launch-failure
cases; idempotent DELETE returning null issue twice; new-search reported superset
and ready subset with Top Pick null; Settings reset/clear/maintenance assertions;
and fake-timer terminal detail refresh. Default API factory omits household auth,
uses EF InMemory and persists mocked Processing/Mock-task workflows. Browser routes
supply their own state; opt-in PostgreSQL tests are not executed. None of these
assertions proves installed orchestration, real database behavior or model repair.

**U83 evidence correction, not resolution:** Reinspection of
`RecipeImportReportIntegrationTests.Submit_MatchingActiveFeedback_ReusesWorkflow_WhileChangedFeedbackAndResolveAreRejected`
finds an explicit DELETE Conflict assertion plus retained reasons/note/link and
single-workflow assertions. The earlier phrase “dedicated resolution rejection/retry
... not asserted” must not be read as absence of *all* active-resolution rejection
coverage. Active rejection has substituted integration coverage. Dedicated UI
resolution rejection/retry, busy/terminal/missing-linked paths, authenticated
cross-member DELETE, PostgreSQL DELETE/read-after-delete and concurrency remain
unqualified. U81's omitted DELETE conflict contract is unchanged; no normative exact
conflict status or runtime pass is added. This corrects interpretation of unchanged
evidence, rather than claiming a new implementation or silently closing U83.

### Finite connected coverage inventory

“Remaining supported behavior” below means the gap identified during this audit;
its disposition is now drafted. The boundary includes ordinary household issue
entry, review/resolution, failure management, their connected presentation/callers,
and API-only import recovery/observation. It excludes source acquisition, general
cooking/search, shared workflow administration and deployment variants.

| ID | Connected behavior / boundary | Classification | Final disposition / owner |
| --- | --- | --- | --- |
| RQ-01 | Detail gear entry, report draft, dismissal, reason/note controls and Save failure | Already specified | Main reporting requirements; BSL-001/002. |
| RQ-02 | Report validation, recipe-level persistence, manual Duplicate, contextual eligibility, active reuse/terminal suppression | Already specified | Main reporting requirements; BSL-002/003; U01/U75/U79 withheld claims stay separate. |
| RQ-03 | Returned-ID detail polling, guarded outcomes and supplied detail/library badges | Already specified | Main observation/outcome/indicator requirements; BSL-003/004, U76–U79. API read eligibility separately drafted as RQ-10. |
| RQ-04 | Review filters, saved membership, immediate review results | Already specified | Main review requirements; BSL-007; general search remains dependency. |
| RQ-05 | Manual resolution guard/removal/repeat, detail acknowledgement, retry and subsequent reads | Already specified | Main resolution requirements; BSL-008/009; U81–U83 retained with correction above. |
| RQ-06 | Settings failed list/guidance, retry, confirmed clear, queued residue protection and stale mounted state | Already specified | Main failed-capture requirements; BSL-012–014; U84–U88. |
| RQ-07 | Shared-form contextual reason merge and saved note retention | Remaining supported behavior | Drafted `baseline-recipe-quality-cooking-feedback`, BSL-017, 1/3; cooking-owned entry/return/acknowledgement are excluded. |
| RQ-08 | Failed-import/recipe reference-copy controls and conditional clipboard acknowledgement | Remaining supported behavior | Drafted `baseline-recipe-quality-failure-references`, BSL-018, 2/5. |
| RQ-09 | Bulk unnamed-recipe import request/accepted IDs and stored import summary | Remaining supported behavior | Drafted `baseline-recipe-quality-bulk-import-observation`, BSL-019, first three requirements, 3/8. |
| RQ-10 | API import-ID read eligibility and attributed result | Remaining supported behavior | Same API draft, BSL-019, fourth requirement, 1/3; complements client polling without copying shared workflow representation. |
| RQ-11 | Initial URL/photo/description/PDF acquisition, source extraction, readiness and processing language | Owned by another capability | recipe-capture main/intake-boundaries/processing-language/completion-advice; immediate source/workflow dependencies only. No extraction/model success inferred here. |
| RQ-12 | Persisted recipe facts, original/hero retrieval, manual editing, ordinary trash/restore/purge and report cascade on hard deletion | Owned by another capability | recipe-library. A direct EF remove cascade assertion is not a public quality deletion journey or ordinary purge qualification. |
| RQ-13 | Household auth/member transport; generic workflow trigger/detail/task diagnostics/reset/reclamation/history; SSE delivery | Owned by another capability | household-identity, background-processing, household-live-updates. Reuse actual shared requirements instead of duplicating them. |
| RQ-14 | General search/ranking/continuation, cooking progression/completion, quality-form handoff/return/acknowledgement and planner state | Owned by another capability | recipe-search/cooking/meal-planning as approved owners; concurrently created `baseline-cooking-edit-report-handoffs` owns caller entry/return/acknowledgement. No placeholder owner is created here. |
| RQ-15 | Contextual URL dispatch, response/contract/access/freshness claims, action races, clipboard failure handling, batch recovery | Disputed/incomplete | U01/U75–U88 and RQ-Q01–Q04 below; withhold stronger claims, no repair tasks. |
| RQ-16 | Generic TriggerImport/GetImportStatus helpers and retired recipe-scoped import routes | Disputed/incomplete | Service methods have unit tests but no production callers found. Integration asserts old POST/GET `/api/recipes/{id}/import` are 404. No connected single-recipe endpoint to draft; helper capability claims withheld. |
| RQ-17 | Real API/browser/authenticated/database/worker/clipboard/model/deployment qualification; demo/preview variants | Deferred runtime qualification | A34, U22/U70–U74 and U88 preserved. Variants remain separate selection under A09; no runtime work or configuration writes. |

Inventory closure: **RQ-01–RQ-17 exhaust the inspected connected boundary**.
No supported behavior in that boundary remains unextracted after RQ-07–RQ-10.
There is no invented successor or empty artifact. This conclusion does not claim
all WFS capabilities, preview/demo variants or runtime qualification are complete.

### BSL-recipe-quality-017 — Cooking caller trace and assertion limits

Actor/entry: person in loaded CooksMode, outside the step editor, with returned
canReimport. Preparation selects Ingredients; a recipe step selects Steps. Ordered
trace: `pwa/src/components/planner/CooksMode.tsx` flag/reportContext →
`RecipeImportIssueSheet.tsx` mergeReasons/shared form →
`pwa/src/lib/api/recipes.ts` save/resolve → generated importReport POST/DELETE and
`specs/openapi.yaml` → RecipeController → RecipeImportReportService SubmitAsync/
DeleteAsync → `recipe_import_reports`, conditional immutable workflow feedback and
linked-attempt guards → returned recipe → local detail/form/acknowledgement state.
BSL-001–004/008 retain the deeper persistence/workflow evidence and failure rules.

mergeReasons adds the contextual reason once to saved reasons and retains note;
it can retain Duplicate mixed with content (U75), while later toggling and server
manual-only policy remain unchanged. Save sets recipeDetails before checking launch
failure; failure throws into the shared mounted draft's retry guidance. Successful
Save clears reportContext and sets acknowledgement to reimportStarted. Resolve
replaces local detail and closes without the detail caller's toast. Neither callback
changes ingredient checks or cookProgress. parsedSteps are not refreshed by these
callbacks; no updated instruction rendering/repair claim. There is no import-ID
poller, watch cancellation or dedicated stale-target callback guard. Dismissal
unmounts a draft without cancelling already issued work; a rejected mounted request
retains the shared form's error/retry behavior (U77/U83, RQ-Q04).

Assertions inspected in `CooksMode.test.tsx`: Ingredients test checks initial reason,
combined payload with null note, closed dialog, checked ingredient and unchanged
Check & Prep/progress; Steps test checks saved reason/note merge, dismissal/reopen,
exact saved payload and active step/progress; ineligible recipe test checks no flag.
API module, flags/router/instruction provider are substituted. No resolution,
launch-failure, caller race or terminal-observation assertion was located in those
tests. Browser contextual reports use intercepted HTTP/state. These are inspected
assertions, not test executions. Classification: implementation-supported; high for
local positive paths, medium for unasserted errors and callback lifecycle.

### BSL-recipe-quality-018 — Failure reference controls

Actor/entry: issue form receives safe failure guidance and failed import ID.
Ordered trace: matching WorkflowWorker failure → best-effort MarkFailedAsync →
persisted linked failure → RecipeImportReportService.ToPublicDto → generated
RecipeImportIssueDto/recipes.ts → RecipeDetailSheet or CooksMode props →
RecipeImportIssueSheet copyId → navigator.clipboard.writeText → copiedId and timeout.
Failure status/id provenance remains BSL-004/main guarded-outcome ownership.

Nested rendering requires both nonempty failure message and import ID; recipe ID
is additionally required for its control. A successful clipboard promise sets the
chosen label to Copied and schedules reset at 1500 ms. No feedback or workflow
mutation occurs. There is no catch, dedicated clipboard error, fallback, timer
cancellation or overlapping-copy ordering guarantee. Rejected writes do not establish
that call's acknowledgement. Source-only support; no dedicated copy/clipboard
assertion found in issue-sheet/detail tests or recipe-import-reporting browser tests.
Browser permission/device/timing qualification remains not-run (RQ-Q01/A34).

### BSL-recipe-quality-019 — API-only bulk recovery and observation

Actor/entry: authorized API consumer; no connected PWA application caller found for
bulk/summary beyond generated builders and browser stub handlers. Ordered bulk
trace: generated `api/recipes/imports/bulk/index.ts` / OpenAPI bodyless POST →
RecipeController.BulkTriggerImport → RecipeImportBulkService.TriggerAllPendingAsync
→ Recipes global DeletedAt == null filter plus Name == null snapshot → sequential
orchestrator.TriggerAsync("recipe-import", recipeId only) → WorkflowRepository stored
YAML / required-parameter checks / per-instance transaction and workflow/tasks →
BulkImportTriggerResponseDto unwrapped 202. No readiness/source/active/report/member
predicate, contextual feedback snapshot, attempt-link update or cancellation token.
A later exception escapes before Accepted and can leave earlier per-instance saves;
no batch rollback, resume cursor, duplicate suppression or successful repair promise.
These boundaries are source-supported, with no asserted partial-failure/repeat path.

Summary trace: generated `api/recipes/importStatus/index.ts` / OpenAPI GET →
RecipeController.GetImportSummary → RecipeImportService.GetImportSummary → group
only recipe-import instances by status → unwrapped 200 RecipeImportSummaryDto.
Completed → importedCount, Pending+Processing → queueCount, Failed → failedCount;
Paused and URL/other workflows excluded. Counts are instances, not ready recipes,
reports, failed-capture list rows or time-window health. No dedicated summary
assertion located; common browser mock returns constants.

Import-ID trace: recipes.ts getRecipeImportStatus/generated recipeImports GET /
OpenAPI → RecipeImportController.GetById / FamilyMemberIdModelBinder →
RecipeImportService.GetImportByIdAsync → existing member and instance/tasks →
exact recipeId JSON parameter → nondeleted recipe/AddedBy equality →
WorkflowInstanceDetailDto.FromModel → unwrapped 200; absent/inaccessible → 404.
Missing member context is implemented 400 but omitted from this OpenAPI operation;
withhold exact missing-context status parity. Unknown member throws to controller
404. Missing/unparseable GUID recipeId gives no result; malformed JSON itself can
throw. No workflow-type gate, new diagnostic sanitization or all-member access
promise. Background-processing owns stored state meaning, identity owns transport;
the detail wrapper only consumes status, while raw API detail includes parameters/
tasks. U76 remains confirmed. GET is observation, not retry or report resolution.

`RecipeControllerTests` bulk assertions: empty database → 202/zero/empty array;
two null-name recipes → 202/count two/two identities; named plus unnamed → count
one. They do not assert actual processor execution, exact payload, deleted/empty
names, repeats, partial failure, source eligibility or summary counters. Factory
substitutes EF InMemory/orchestration/household auth. `RecipeImportReportIntegrationTests`
assert attributed import GET 200 versus other known member 404; retired recipe-scoped
POST/GET 404. `RecipeImportLifecycleTests` directly call TriggerImport/GetImportStatus
with mock orchestrator; no public caller is inferred. Common browser bulk mock
returns **200**, versus actual/contract **202**, and no method check or persistent
mutation; summary is fixed zeros. Do not promote mocks into parity or runtime evidence.
Confidence: high for selection/counters and attributed branches; medium across
real orchestration/auth/database, not-run under A34.

### New qualifications and retained uncertainty disposition

New identifiers use a capability-local prefix to avoid colliding with shared U IDs.

| ID | Disputed, incomplete or missing evidence | Disposition |
| --- | --- | --- |
| RQ-Q01 | Clipboard availability/rejection has no dedicated recovery; multiple uncancelled timers and no copy assertions | Only conditional successful copy is drafted; browser/permission/device/error/timing qualification not-run. |
| RQ-Q02 | Bulk repeats can enqueue again; per-instance saves lack batch transaction/resume/cancel/dedup; source eligibility unchecked; browser bulk 200 disagrees with actual/contract 202 | Record source limits, no safe-repeat/rollback/repair guarantee. Summary counts are source-only and do not count Paused or URL imports. No contract/mock repair. |
| RQ-Q03 | Import GET contract omits implemented missing-context 400; raw detail includes parameters/tasks; malformed JSON can throw; complete payload/error/auth/real-store assertions absent | Only attributed successful read and missing/inaccessible 404 drafted; no universal sanitized response, complete parity or household-wide polling guarantee. |
| RQ-Q04 | Cooking callbacks lack a stale-target guard/poller; returned detail does not reparse instructions; error/resolve/launch/cancellation paths lack dedicated caller assertions | Source-supported local outcomes only. No repaired-content display, terminal refresh or guaranteed cancellation/recovery. |

All existing uncertainty remains open/deferred at its recorded scope: **U01** URL
required parameter; **U75** reason/eligibility mismatch; **U76** attribution-restricted
observation; **U77** memory/caller-specific watch; **U78** conditional completion,
no repair/resolution/delivery guarantee; **U79** response/contract/mock freshness;
**U80** actual review labels/search boundary; **U81** omitted DELETE conflict;
**U82** loaded parent freshness; **U83** missing UI retry/authenticated/real-store/
concurrency qualification, narrowed by the explicit active-rejection assertion;
**U84** hidden initial errors/stale mounted state; **U85** retry conflict/status gap;
**U86** generic reason/provenance; **U87** action races/conditional cleanup;
**U88** missing negative/auth/real-store qualification. U22, U70–U74, A69 and all
historical qualifications are retained unchanged. No uncertainty is silently
resolved, no model accuracy or runtime result inferred from source or mocked tests.

### Complete new requirement/scenario mappings and overlap reconciliation

Every row maps the exact requirement and every scenario header. All are ADDED to
the existing recipe-quality capability, with no MODIFIED/REMOVED blocks. Evidence
is implementation-supported, not runtime verified.

**baseline-recipe-quality-cooking-feedback:** Shared-form initialization only; cooking owns entry/return/acknowledgement and main quality owns later toggling/submission/policy.

| Exact requirement | All exact scenario headers | Evidence / assertion boundary |
| --- | --- | --- |
| Merge contextual issue reasons with loaded saved feedback | Initialize a new contextual report; Extend saved content feedback; Context overlaps a saved Duplicate reason | BSL-recipe-quality-017; merged content/note assertions inspected, mixed Duplicate initialization source-only |

**baseline-recipe-quality-failure-references:** Copy controls only; reuse main returned failure guidance and guarded outcome projection.

| Exact requirement | All exact scenario headers | Evidence / assertion boundary |
| --- | --- | --- |
| Offer failure reference copy controls when identifiers are returned

When the issue form receives both re-import failure guidance and a failed import ID, it SHALL offer Copy import ID and, when supplied, Copy recipe ID. Without both guidance and failed import ID it SHALL omit these controls. The controls SHALL use returned identifiers, without inferring that the attempt repaired the recipe or resolved its report.

#### Scenario: Both references are available
- **WHEN** the mounted issue form receives failure guidance, a failed import ID and a recipe ID
- **THEN** Copy import ID and Copy recipe ID are available

#### Scenario: Only the failed import reference is available
- **WHEN** the form receives failure guidance and failed import ID without a recipe ID
- **THEN** Copy import ID is available and Copy recipe ID is absent

#### Scenario: Failure guidance or import reference is absent
- **WHEN** the form lacks either failure guidance or a failed import ID
- **THEN** neither reference-copy control is shown

### Requirement: Acknowledge successful failure reference copying

Activating a failure reference control SHALL request clipboard writing of its corresponding identifier. After that request succeeds while the form remains mounted, the selected control SHALL display Copied and schedule its acknowledgement to clear after 1500 milliseconds. This SHALL NOT save feedback, resolve a report or retry an import.

#### Scenario: Copy a recipe reference successfully
- **WHEN** Copy recipe ID is activated and its clipboard write succeeds
- **THEN** the supplied recipe ID has been passed to clipboard writing and that control displays Copied with timed reset scheduled

#### Scenario: Copy an import reference successfully
- **WHEN** Copy import ID is activated and its clipboard write succeeds
- **THEN** the supplied failed import ID has been passed to clipboard writing and that control displays Copied with timed reset scheduled |  | BSL-recipe-quality-018; assertions and missing paths recorded above; no runtime pass |

**baseline-recipe-quality-bulk-import-observation:** Bulk/count/attributed-resource semantics only; reuse main polling and shared auth/workflow state representation.

| Exact requirement | All exact scenario headers | Evidence / assertion boundary |
| --- | --- | --- |
| Select unnamed stored recipes for bulk import requests

POST `/api/recipes/imports/bulk` SHALL select nondeleted recipes whose name is null and request a recipe-import workflow for each selected identity. A nonnull name, including an empty name, SHALL exclude a recipe. Selection SHALL NOT require a saved issue, failed task or eligible contextual feedback. Shared household authentication SHALL retain household-identity ownership.

#### Scenario: Select unnamed recipes
- **WHEN** bulk import is requested with two nondeleted recipes whose names are null and orchestration succeeds
- **THEN** one recipe-import request is made for each selected recipe with its recipe identity

#### Scenario: Exclude named or deleted records
- **WHEN** stored recipes have nonnull names or have been soft-deleted
- **THEN** those recipes are excluded from bulk selection

#### Scenario: An unnamed recipe already has work
- **WHEN** an unnamed nondeleted recipe has an existing workflow and bulk import is requested again
- **THEN** that existing workflow does not exclude it from another import request

### Requirement: Return accepted bulk workflow identities without certifying repair

After all selected bulk import requests return successfully, the API SHALL return unwrapped 202 with queuedCount equal to the number of returned workflow identities and instanceIds containing those identities. An empty selection SHALL return zero and an empty list. This acknowledgement SHALL NOT certify worker execution, recipe readiness, corrected content or report resolution.

#### Scenario: Nonempty bulk acceptance
- **WHEN** every selected recipe's workflow trigger returns successfully
- **THEN** the response is 202 with queuedCount matching instanceIds and the returned identities describe workflows rather than recipe IDs

#### Scenario: No eligible unnamed records
- **WHEN** bulk selection is empty
- **THEN** the response is 202 with queuedCount zero and instanceIds empty

### Requirement: Count stored recipe-import workflows in the import summary

GET `/api/recipes/import-status` SHALL return unwrapped 200 with importedCount counting Completed recipe-import instances, queueCount counting Pending plus Processing recipe-import instances and failedCount counting Failed recipe-import instances. It SHALL count workflow instances rather than recipes or reports and SHALL exclude other workflow types and Paused instances from these counts.

#### Scenario: Count stored import states
- **WHEN** recipe-import instances exist in Completed, Pending, Processing, Failed and Paused states
- **THEN** the first four contribute to their specified counters and Paused contributes to none

#### Scenario: Other workflow types exist
- **WHEN** url-import or other workflow types have stored states
- **THEN** they contribute to none of these import-summary counters

#### Scenario: No counted instances exist
- **WHEN** no recipe-import instances occupy a counted state
- **THEN** all three counters are zero

### Requirement: Restrict import identity reads to attributed recipe context

GET `/api/recipe-imports/{importId}` SHALL require bindable existing member context and an existing nondeleted recipe identified by the workflow's recipeId parameter with matching added-by attribution. A permitted read SHALL return unwrapped 200 with stored workflow detail. Missing or inaccessible imports SHALL return 404. Shared identity transport and background-processing stored-state meanings SHALL retain their existing ownership.

#### Scenario: Read an attributed import
- **WHEN** an existing member requests an existing import whose recipeId names that member's nondeleted recipe
- **THEN** the API returns 200 with that stored instance's identity, status and workflow detail

#### Scenario: Another known member requests the import
- **WHEN** a known member requests an import whose associated recipe was added by another member
- **THEN** the API returns 404 rather than that workflow detail

#### Scenario: Import or recipe context is absent
- **WHEN** the import is absent or its recipeId does not identify an accessible nondeleted recipe
- **THEN** the API returns 404 without successful import detail |  | BSL-recipe-quality-019; assertions and missing paths recorded above; no runtime pass |

### Source identity reconciliation

All **89 unique source paths / 131 hash rows actually present in this capability
plan before edits** match their recorded SHA-256 values. Historical 148/172/178/198
cross-plan manifest counts remain historical; this audit does not misstate them
as 198 rows in the split file. All current tracked/untracked bytes were also
snapshotted before writes. The following explicit current manifest identifies
immediate rechecked sources/tests/contracts/dependencies for this audit. Hashes
identify content, not test execution or environment qualification.

| Source | SHA-256 |
| --- | --- |
| `api/database/compatibility.sql` | `bd3828fc1ce8b898b0feaa8f2e41be2e211cecadbefbfe9a68e14df435b859d5` |
| `api/database/schema.sql` | `3f7767cd704299374ebdcd89a11709680013ba26a477ad23f41da54e6da55161` |
| `api/src/RecipeApi.Tests/Controllers/RecipeControllerTests.cs` | `903493f2d741b315edf8ca44a83c5083500f70c9d30117c89db979ca805ff385` |
| `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` | `0ee567443fc0b5c11fffe631c94ea0407681b371224d8083a0e32b94b280804c` |
| `api/src/RecipeApi.Tests/Integration/CaptureFailureIntegrationTests.cs` | `a16687f8b455625fb73002cc1e6327972014018b4d788ee645b3079bd84a00ae` |
| `api/src/RecipeApi.Tests/Integration/RecipeImportReportIntegrationTests.cs` | `0ed0a2308f813e83ac5742288fd5f8268018e232aeda2778ff44153e888bac75` |
| `api/src/RecipeApi.Tests/Integration/RecipeImportReportPostgresTests.cs` | `917bb45c566d0704fb95ea66f4271ec442932cfee2c7c0a698e6ce684b74e6e4` |
| `api/src/RecipeApi.Tests/Integration/RecipeSearchIntegrationTests.cs` | `27fc0d86492bcaa25f440543e65ff5e4df5f05f3e1fc315bc4c6b73bd9aa1ce6` |
| `api/src/RecipeApi.Tests/Services/Agents/RecipeAgentPromptSelectionTests.cs` | `f221b4c7359e6c821101e7ad2276c922dde48549235b5e50939c9c73ec2768f1` |
| `api/src/RecipeApi.Tests/Services/RecipeImportLifecycleTests.cs` | `fe4b7249603997be939e0b8a2d790ef88f1eaa1863b7101a2011186f258a04cb` |
| `api/src/RecipeApi.Tests/Services/WorkflowWorkerTests.cs` | `b701d122fa95c23309741e209dbd2f9f8da40404a0f59e221e2809cc11448434` |
| `api/src/RecipeApi/Controllers/CapturesController.cs` | `2c6288fcac9627acefd02de76a77822d4a51955cd8db8b32ae967bf5c035e85f` |
| `api/src/RecipeApi/Controllers/RecipeController.cs` | `d1699c2de6f6cca9d879e67c0c7b9c7f0af4b2c4e104bc9ff04634b266eb5a70` |
| `api/src/RecipeApi/Controllers/RecipeImportController.cs` | `a5fe04c228c90f4f85bc4681df800a74af53d676599cac965c9ba60b27fe550b` |
| `api/src/RecipeApi/Data/RecipeDbContext.cs` | `92084cf105ec2941e713fca9053609f4974156b6440fb72f9b623cf918916447` |
| `api/src/RecipeApi/Dto/BulkImportTriggerResponseDto.cs` | `b9a5bdee301aaedba85558c00ae3fff3eaf23b0bed6689c324dcb77f6ce418ff` |
| `api/src/RecipeApi/Dto/CaptureFailureClearResponseDto.cs` | `f6f678f3352b466bbacf8ed3226ef34cb0551482b0a9f92ab28d2c26316852ba` |
| `api/src/RecipeApi/Dto/CaptureFailureDto.cs` | `2c4556469d5bb3125b7638ab900baf967f5b6d6c8df9af80a2b4b6b98272b258` |
| `api/src/RecipeApi/Dto/RecipeDetailResponseDto.cs` | `a7a0e1c3190cf711feea3a618716d54fb5b1bcd4f19349c32ec813c13771d342` |
| `api/src/RecipeApi/Dto/RecipeImportIssueDto.cs` | `dfb97589523119034893672b27df15559938ff51370fc87a441642c34eb3daa1` |
| `api/src/RecipeApi/Dto/RecipeImportSummaryDto.cs` | `565768c56831cc99316b4bb6fda4e6a104e99b03004ee6207f02c390d1efbbfa` |
| `api/src/RecipeApi/Dto/WorkflowInstanceDetailDto.cs` | `c86b463339d6abc8ab761741a2c670a36077903dfe1090a8faa657655a5375b1` |
| `api/src/RecipeApi/Infrastructure/FamilyMemberIdModelBinder.cs` | `4d5dcc9f7d9993abb4c59802f770da139c4875c55544df8410553332a04a2f64` |
| `api/src/RecipeApi/Middleware/ErrorHandlingMiddleware.cs` | `b5849eb709ca2bc85efa3051d3a953ca955ef8704848327ad88d0297299d949b` |
| `api/src/RecipeApi/Models/MaintenanceCommand.cs` | `662a52cec600eab7434f8b8b45c4b28e31573dec129ad538acad08dc40415b84` |
| `api/src/RecipeApi/Models/RecipeImportReport.cs` | `2fa6fb2814f07dc9a2226156c01894a01c8006ff4c249c5573c830cd2fd6fc56` |
| `api/src/RecipeApi/Models/WorkflowInstance.cs` | `82d14b99d40c02ec5b10c188a16d190e865fd1b6246bc514ee37021b7d537641` |
| `api/src/RecipeApi/Models/WorkflowTask.cs` | `3408be49a3afafc7ac70d6104124dcfcdd8df7509162ff9186d3581bb30f6e06` |
| `api/src/RecipeApi/Program.cs` | `a4a2510b9cf0bbeb0e05072ab2bf2b299f4029e449bff17e7386b62f5321c523` |
| `api/src/RecipeApi/Services/Agents/RecipeAgent.cs` | `b23761d819726cf5dd8c50000cabc05198fba855865e6beba05de0ea8a6097af` |
| `api/src/RecipeApi/Services/CaptureFailureReasonMapper.cs` | `c31eb1c126d14ceea54f0313e3bddbdc370c47d5a1c4ab1a27b16218ddcb2de3` |
| `api/src/RecipeApi/Services/CaptureFailureService.cs` | `88a7b76335db0873e0d5e4bcde15783a2ec792d84f97f967a24f3bcf5b79db29` |
| `api/src/RecipeApi/Services/ManagementService.cs` | `c24464baa8f853c7195e30de61b168ef2b8eda059545a5449580807448811c4f` |
| `api/src/RecipeApi/Services/Processors/CompleteRecipeImportReportProcessor.cs` | `0e5d13ababefa89cda1e3bc74e65065d7e9a51a49142a0e96b6b1c50a8e54b4d` |
| `api/src/RecipeApi/Services/Processors/ManagementProcessor.cs` | `484abcf7eb3d3e5c2882c785edea3a4a3083f7f7c2efc3c5e479aad7e561096f` |
| `api/src/RecipeApi/Services/Processors/RecipeReadyProcessor.cs` | `4206f98256cadae88d7be13a44e9d9d18b6c46679ba7b9f0aee0dcef8a848a74` |
| `api/src/RecipeApi/Services/Processors/SyncRecipeProcessor.cs` | `246f5ffe2effb7ddc6b0019e5f6ab0436cc20a93b06cf1cdc337007f4ccd2945` |
| `api/src/RecipeApi/Services/RecipeImportBulkService.cs` | `699e706d68c3dc221a57a6724bf6b10dc7e3060620fe03d77cfeef48866d8ce1` |
| `api/src/RecipeApi/Services/RecipeImportReportService.cs` | `99776d8ddfb954d0def99460d868d43a3f3f24e08c4459bd30c132959e30acb3` |
| `api/src/RecipeApi/Services/RecipeImportService.cs` | `3016a8e38da063513813e813fad5f8fddf10f285abfa1ef3e0743c200ac1af14` |
| `api/src/RecipeApi/Services/RecipeSearchPredicate.cs` | `188a9a6285d5762f275fe16c3a7cc62f1f25395ddc59ae51a2b17d1c36d82e9b` |
| `api/src/RecipeApi/Services/RecipeSearchService.cs` | `31e2bf8a197582b4852ce3a98820827504f410a5ae281bc3a247aa19b5674377` |
| `api/src/RecipeApi/Services/RecipeService.cs` | `9eec9ab5cd7102081b3765b08a41b8de4d45325858d18ab4573a326afa256b74` |
| `api/src/RecipeApi/Services/RetryScheduler.cs` | `e3849aceddc86ccca36766c284c4c90f0bddf65ed7398d7c0140efbf136ff965` |
| `api/src/RecipeApi/Services/WorkflowOrchestrator.cs` | `9812d17bface86d79fef75eab2ef7668c7c0bde18455c1ea46774b46dcc0b14c` |
| `api/src/RecipeApi/Services/WorkflowRepository.cs` | `1356e4b126077506c07633c2d977a419d96641e8a03f976d45f4e945775214d3` |
| `api/src/RecipeApi/Services/WorkflowWorker.cs` | `69f9023b0003ff2f0a5dda6d85bcb42e13ebf064b5c8529bc6b0866e5b3871df` |
| `api/src/RecipeApi/Workflows/dreaming.yaml` | `862cf700ca717dd5b09b5f6dfb84b6f8810448c6080b805e2b3ff62289f9853d` |
| `api/src/RecipeApi/Workflows/recipe-import.yaml` | `56977712412ec2c0b5a04495e77edbf3b97a71f92ad5f8da8546b58261de5b0a` |
| `api/src/RecipeApi/Workflows/url-import.yaml` | `6f142f8831390021091f5c3ca9603f056d138719d1904ae72cd75827beb73787` |
| `pwa/e2e/fixtures.ts` | `402b5a1b872f625dc1425f46afdede2c9378dcc473088159774a8455b5d188e2` |
| `pwa/e2e/mock-api.ts` | `063ed6d6629ccde163487a92543ae36918183a81b7301dd01a5389248cbcbd07` |
| `pwa/e2e/recipe-import-reporting.spec.ts` | `644a942cb84682530cd938c2a7235cf43e1f61e9a0827232060e8785324c8b28` |
| `pwa/e2e/search-hardening.spec.ts` | `5ced566ad08583dd75abf434d0a15bc6c5be0e380483f7147cbc29e9b1bf6a03` |
| `pwa/e2e/settings.spec.ts` | `2663d9e27dc756b6e60be57c1d440d00bd99d6b73c8cccc54add595eecc50a82` |
| `pwa/playwright.config.ts` | `6e15ab7bb105dea06751d9e8dc5d3e4d280f0eb2d465553fbea5e2da65e91532` |
| `pwa/src/app/(app)/browse-all-stack/page.tsx` | `2beaa3dd23a1817db55c037a27fbe92f881444d4285726af1b034a15d8ece947` |
| `pwa/src/app/(app)/profile/page.test.tsx` | `529e954a8515fa92b21b2fc7796185a5681b914fc206e4bd62f3c96ecae6a8c4` |
| `pwa/src/app/(app)/profile/page.tsx` | `2276868bc76ec0f13f2293ea5f1ae46ed2c1181cb386fb9c45e1ae6c7ef200c4` |
| `pwa/src/app/(app)/profile/settings/SettingsPageContent.tsx` | `3deed0d88c6ac8f4ab5b94cc4724ae163dae344fd39c7aaccdf8a0c67d7e9aec` |
| `pwa/src/app/(app)/profile/settings/page.test.tsx` | `f4f9abe7689432b86e8aff39e70969473792c97210ea38282eb57c3896d0feab` |
| `pwa/src/app/(app)/profile/settings/page.tsx` | `50a78692d92af7d84de69c1b4d9990e4ed00f83961b0d6ab580b63fd979b0e18` |
| `pwa/src/app/(app)/recipes/page.test.tsx` | `4e43afaf0d59302a1c219fba02e5df5c08bb03e143dc4d2c8f9b0393f69257e6` |
| `pwa/src/app/(app)/recipes/page.tsx` | `18b9605e8078e8ee46674a0e781836886697ce18e9166c0591aeac6c8fe78bb4` |
| `pwa/src/components/planner/CooksMode.test.tsx` | `2509bef1abf8a7c5a45d96820269b7debd6112a3f52fee3e0f14b2d9b3c2c026` |
| `pwa/src/components/planner/CooksMode.tsx` | `daddc803a112db04791b202e546021e86d3985acf11dbdc3e4e15e60c211d91a` |
| `pwa/src/components/profile/FailedCapturesSection.test.tsx` | `f518c27b3116b7b0641370e7acae81d1e45742aeed115d5f3089b9b837690e56` |
| `pwa/src/components/profile/FailedCapturesSection.tsx` | `2632d08670b6b1b9959fe39e7141bb8cc15932082877ce7402a5dcd24ba0b6af` |
| `pwa/src/components/recipes/ActionGearMenu.test.tsx` | `29e263dcc11fbbe33233e9f8884d94b070f6ffe4548334da0bfe99099f51b896` |
| `pwa/src/components/recipes/ActionGearMenu.tsx` | `d0c0c5ee92658de43cfb9fddc40b4d69030a02c348396e9044d1c77e218b8e75` |
| `pwa/src/components/recipes/RecipeDetailSheet.test.tsx` | `21727367dee891c473635cc2eafde324b0f6863e0dd4db1a7e82203d5e650da0` |
| `pwa/src/components/recipes/RecipeDetailSheet.tsx` | `bbc1bba8f16f3fa305775d072cb1c3850af34a24bd3979e2228b63984ca1a19c` |
| `pwa/src/components/recipes/RecipeFiltersSheet.test.tsx` | `de916aec12545ffccd3a6a40baafcfd7a901ce9a94b7d089bf9bc3aee28e259d` |
| `pwa/src/components/recipes/RecipeFiltersSheet.tsx` | `c588ae862e5482fcbd64c16803705829e3cd73b7d8f47b7628d3737bb8782e78` |
| `pwa/src/components/recipes/RecipeImportIssueBadge.test.tsx` | `5bd1eb668e0826b844467a613ca1b023401e903947c7c571ce2d72e3912b01dc` |
| `pwa/src/components/recipes/RecipeImportIssueBadge.tsx` | `9b95eac67d842a064c9a54a3b94f87a93c4664153a51646e11b7da8ff625b5e3` |
| `pwa/src/components/recipes/RecipeImportIssueSheet.test.tsx` | `abe9245f3286bbc94debc3f9b720cf388ca4145e76a04813f3555dee21a56fe0` |
| `pwa/src/components/recipes/RecipeImportIssueSheet.tsx` | `e7c8376cf97f3f9c642fc874a892d461aac9da72e2abc82f70ad09c56a4c9ae3` |
| `pwa/src/components/recipes/RecipeStackCard.tsx` | `6c9633e0414e9608ea8628efe3d22de9a9f9db4da7d8afe7b3de84ea255362ca` |
| `pwa/src/lib/api/api-client.ts` | `c5cd4cfebddd8d5c1f2827c522a236fe12c504130ea0991c07bc8fc46376aa95` |
| `pwa/src/lib/api/captures.ts` | `ca0d112b46ce3bf0c60dc7a1ce7de4039d70ac6028dfb7d37314805e510b302f` |
| `pwa/src/lib/api/failed-captures-contract.test.ts` | `bd0cb4b0f407f632479c6c219086e88bfdfbf62642da757212d6f4da4794927a` |
| `pwa/src/lib/api/generated/api/captures/failures/index.ts` | `941616534120bd48410e3777e40e1192fd0c9742a2e4aa94510d51b019472116` |
| `pwa/src/lib/api/generated/api/captures/failures/item/index.ts` | `dda1ec302ddb8a01030b3e320633aa9de79dc31528d63c0a564cffeeb9962f86` |
| `pwa/src/lib/api/generated/api/captures/failures/item/retry/index.ts` | `53b502626fc323702aa1c2ff93efbb17f8b23135e135c6a9b32f170c0e9d2fd5` |
| `pwa/src/lib/api/generated/api/recipeImports/item/index.ts` | `1ae62eeebd51f7e92a148f19fc356d38134406263c5275b0a917640b698f7454` |
| `pwa/src/lib/api/generated/api/recipes/importStatus/index.ts` | `542c17d4919d294f42fa961236a89747e907cd0f4da9c19e5a106b981fe8ac35` |
| `pwa/src/lib/api/generated/api/recipes/imports/bulk/index.ts` | `76df8f64634281a6e90ff2feb5dce21d15bef01e68eee23940fbab1221b5d990` |
| `pwa/src/lib/api/generated/api/recipes/item/importReport/index.ts` | `da2d1d8454fa6a1e64e9d82b7e5a8ae965f0d02272d5b48941aabbef60c86930` |
| `pwa/src/lib/api/generated/api/recipes/search/index.ts` | `a3515a1910d6028767770a4080284e1d47bdfcf475e9257da3d2f1d33d6f3666` |
| `pwa/src/lib/api/generated/models/index.ts` | `03e19537845755d2cd0d30071284bc8a11007237e380433184d3edbe1ddb05e6` |
| `pwa/src/lib/api/recipe-import-report-contract.test.ts` | `8a0f34127f2580ea58d782b0d6aa7aedd142c485ac7c97d7c06f584d96d8d8a7` |
| `pwa/src/lib/api/recipes.ts` | `f4e70b39a2060bfc5b25010914f78e288321517db5c52c543d103502718dce7a` |
| `pwa/src/lib/constants/routes.ts` | `790d2da3e039578fd7d291dead52213bfd2282b17517f973029bafac37f34d70` |
| `pwa/src/locales/en/common.json` | `3519f2d7e0140a11786597976b6868fa195312e0bc3feb3e4d3c3e144a41d0bc` |
| `pwa/src/locales/fr/common.json` | `b5d957a8f395091038e1c3ab64fed1b300cd7f015e0e11172ed1cba611d4e198` |
| `pwa/src/store/searchPromotionStore.ts` | `9b1fd64d9ea5549161233734a976392b1ba8cbd75333492296284784004e2fd8` |
| `specs/openapi.yaml` | `0fbd27813611e16474ec17a48ede372d5a41af02db3fa9ded82295a6357046ff` |

### Artifact and lifecycle status / session handoff

The CLI scaffolded these three new changes sequentially, with proposal, design,
recipe-quality delta, documentation-extraction tasks and `.openspec.yaml` in each:

- `openspec/changes/baseline-recipe-quality-cooking-feedback/`: 1 requirement / 3 scenarios.
- `openspec/changes/baseline-recipe-quality-failure-references/`: 2 / 5.
- `openspec/changes/baseline-recipe-quality-bulk-import-observation/`: 4 / 11.

Selected strict validation passed for each drafted slice. The final integration
acceptance is strict validation of **all six selected quality changes**, the entire
OpenSpec set, exact promoted-block/new-mapping/count/identity/preservation checks,
full task-owned diff review and `task verify` with every changed/new documentation
path (this plan, the single changed index summary row and all 15 new artifact files).
Final observed results/content identity belong to the response and current
`.task/agent-finish/last-run.json`; no earlier verification identity is attached to
later edited bytes. No preparation is needed for documentation-only changes.

Generation is complete within RQ-01–RQ-17: accepted main remains 37/92; remaining
7/19 additions are generated drafts for human review, not human acceptance or
promotion. Existing quality artifacts and main specifications are preserved; concurrent
foreign documentation/index activity is recorded below without being reverted. The index's quality summary alone changes to route this status.
No application/tests/contracts/clients/SQL/configuration/dependencies are edited;
no runtime/API/browser/database/worker/model qualification is performed.

Checks: selected strict validation passed; complete-set strict validation and
explicit-path documentation verification are required final checks and their
observed outcomes are reported in the final response/current harness. Failed and
blocked checks are reported separately if present. Runtime/API/browser/worker/
PostgreSQL/model/clipboard qualification is **not-run** by instruction/A34;
application TDD, client regeneration, migrations, implementation acceptance and
archive checks are **not-applicable** to these documentation drafts.

**Exact next lifecycle action:** human review of the three proposals/designs/deltas,
all 19 scenario evidence mappings, U83 correction and retained/new qualifications.
Only after acceptance and separate authorization may reviewed deltas be promoted
into main specifications. Do not run apply, promote, archive, stage, commit, publish
or deploy as part of this generation session. Runtime qualification remains a
separate deferred action under A34.


### Concurrent work and ownership reconciliation

During final integration review, the initial whole-worktree preservation assertion
reported an unexpected change in `docs/openspec-baseline/cooking.md`. Reinspection
found four concurrently generated `baseline-cooking-*` changes, including
`baseline-cooking-edit-report-handoffs`. These are foreign work, not generated by
this quality session, and are preserved. That draft owns cooking entry, local
return/state and background acknowledgement; the quality cooking-feedback delta
was narrowed from 4/10 to **1/3**, solely shared-form contextual initialization.
All inventories/counts/mappings above reflect the narrowed result: **7/19** new,
**44/111** if later promoted. Cooking's concurrent proposal references an early
quality proposal state; it is not rewritten in this session. Its review should use
this final ownership reconciliation rather than infer acceptance of either draft.

The initial global index equality assertion cannot establish preservation across
concurrent foreign staging. This session issued no stage/index mutation command.
Final preservation checks compare all task-owned and evidence paths and report
foreign drift separately, rather than reverting it or claiming sole ownership of
the worktree. The early assertion failure is a concurrency finding, not a failed
OpenSpec validation or runtime behavior test. Final selected/all validation and
explicit-path checks are rerun for the reconciled final bytes.


Final full task-path verification command (17 files):

```sh
task verify -- docs/openspec-baseline/recipe-quality.md docs/openspec-baseline-plan.md openspec/changes/baseline-recipe-quality-cooking-feedback/.openspec.yaml openspec/changes/baseline-recipe-quality-cooking-feedback/design.md openspec/changes/baseline-recipe-quality-cooking-feedback/proposal.md openspec/changes/baseline-recipe-quality-cooking-feedback/specs/recipe-quality/spec.md openspec/changes/baseline-recipe-quality-cooking-feedback/tasks.md openspec/changes/baseline-recipe-quality-failure-references/.openspec.yaml openspec/changes/baseline-recipe-quality-failure-references/design.md openspec/changes/baseline-recipe-quality-failure-references/proposal.md openspec/changes/baseline-recipe-quality-failure-references/specs/recipe-quality/spec.md openspec/changes/baseline-recipe-quality-failure-references/tasks.md openspec/changes/baseline-recipe-quality-bulk-import-observation/.openspec.yaml openspec/changes/baseline-recipe-quality-bulk-import-observation/design.md openspec/changes/baseline-recipe-quality-bulk-import-observation/proposal.md openspec/changes/baseline-recipe-quality-bulk-import-observation/specs/recipe-quality/spec.md openspec/changes/baseline-recipe-quality-bulk-import-observation/tasks.md
```

### Observed final documentation acceptance

All six quality changes passed selected strict validation. The complete OpenSpec
set passed **69/69**, including the concurrent cooking drafts; informational
archive-readiness notices for already-promoted capture/library additions are not
validation failures and no archive was attempted. The explicit **17-path**
`task verify` passed **documentation**, **spec:check** and **content**. Exact
promoted blocks, every new header/scenario mapping, all 98 current unique source
identities, unchanged original quality artifacts/main specs/application/contracts
and the one-row index-summary edit were reviewed. All extraction tasks are complete.

The initial whole-worktree assertion failed because foreign cooking documentation
and foreign staging changed concurrently; that assumption was corrected and the
ownership overlap removed. No file was reset or index mutated by this session.
Final review found continuing changes limited to foreign cooking documentation/
tasks, with index bytes stable across that review interval. Such foreign edits are
excluded from this session's preservation claim; all task evidence and original
quality/source inputs remain preserved. Required final documentation checks have
**no remaining failures or blockers**. Runtime/API/browser/worker/PostgreSQL/model/
clipboard checks are **not-run** under A34; application TDD/client generation/
migrations and promotion/archive acceptance are **not-applicable**.

Artifact status: **generation complete; three validated drafts for human review**.
Human acceptance **pending**; main-spec promotion **not performed**; runtime
qualification **deferred/not-run**. The exact next lifecycle action remains human
review, including retained qualifications and the concurrent cooking ownership
reconciliation. Final verification repeats after this record so the harness identity
covers these final documentation bytes; no earlier digest is asserted for them.


## RQ-P01 — Accepted remaining baseline promotion, 2026-10-16

**Authorization:** User “promote” following the completed generation report accepts
the three reviewed quality deltas and authorizes their main-spec synchronization
and bounded documentation records. No archive, application implementation, runtime
qualification, staging, commit, publish or deployment is authorized.

**Context and identity:** Branch `moving-to-openspec`, HEAD
`04a1c4570f9bbb01b47436790d4248635ac3179a`; installed openspec-sync-specs used.
Current CLI list/context and all three statuses resolve the local repository root;
delta paths come from status artifactPaths.specs.existingOutputPaths. Current specs
rules obtained for each before writes. Private before-images/digests and staged
binary diff snapshot are held under `/tmp/recipe-quality-promotion`. Existing staged,
unstaged and untracked work, including concurrent cooking drafts, is preserved.
All **98** current evidence-source hashes match before promotion; no changed source
requires reinterpretation of the reviewed behavior or qualifications.

**Result:** Exact **1/3** contextual initialization, **2/5** failure-reference controls
and **4/11** bulk/import observation blocks appended from the selected deltas.
Main recipe-quality now **44/111**, retaining its original Purpose, prior **37/92**
requirement/scenario blocks and all earlier qualification text. A non-normative
promotion note points to the audit and retained limitations. The three selected
proposal/design/delta/metadata files remain unchanged; tasks gain additive lifecycle
follow-up only. The index quality summary changes to promoted 44/111. No other
main specification or cooking artifact is selected for modification.

**Qualifications:** A34, U01, U75–U88 with the explicit U83 evidence correction,
RQ-Q01–RQ-Q04, U22/U70–U74/A69 and all historical limitations remain at their recorded
scope. Accepted requests do not certify execution; processing completion does not
resolve reports; source support does not certify repair, cleanup, delivery,
clipboard availability or model accuracy. Cooking entry/return/acknowledgement
ownership stays with its separate cooking draft. No uncertainty is closed by sync.

**Required checks and reviewed path set:** Exact old-main preservation after removal
of the new note/additions; exact delta-to-main equality; unique 44/111 counts;
source/index/foreign-work preservation; six-path documentation diff review; selected
changes/main/all-spec/all-item strict validation; explicit `task verify` for main,
this capability plan, the index and the three selected tasks files. Final observed
outcomes/content identity belong to the final response/current harness; earlier
successful checks identify earlier bytes only.

**Lifecycle status:** Generation **complete**; human documentation acceptance
**recorded by “promote”**; main-spec promotion **performed**, subject to successful
final documentation checks; changes **active, not archived**; runtime/API/browser/
worker/PostgreSQL/model/clipboard qualification **not-run/deferred under A34**.
Application TDD/client generation/migrations are **not-applicable**. Report any failed
or blocked required checks separately. No further lifecycle action is performed;
archival or qualification requires a separate request.

RQ-P01 observed checks before final explicit-path verification: all three selected
changes strictly valid; all **10 main specifications passed** strict validation;
exact prior-main plus delta equality and unique **44/111** counts passed; all 98
source identities match. The first complete-set strict check reported **70 passed,
1 failed / 71 items**: concurrent foreign
`baseline-grocery-shopping-scheduled-needs` has no delta yet. Its direct strict
validation confirms “Change must have at least one delta. No deltas found.” This is
outside recipe-quality promotion scope and is not repaired, skipped or configured
away. No selected quality failure is implied. Final `task verify` still runs its
full spec check; report its observed outcome separately rather than claim a green
complete-set gate from selected validation alone. Concurrent cooking plan/index
updates are preserved. Promotion is applied; full-set verification may remain
blocked by foreign work until its author completes that draft. No runtime check
was executed and no index mutation was performed by this session.
