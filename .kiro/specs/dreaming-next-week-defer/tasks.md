# Dreaming Completion and Next-Week Defer Tasks

Status: Planned; implementation has not started  
Requirements: [requirements.md](requirements.md)  
Design: [design.md](design.md)

## Execution order

`DND-001` owns the shared contract and must complete before generated-client work. `DND-002` and `DND-003` may begin only after that contract is accepted; they must not concurrently edit shared `ScheduleService.cs`. `DND-004` follows all implementation tasks. No task authorizes commit, push, deployment, or unrelated cleanup.

## DND-001 — Defer contract and backend slice

- **ID / mode:** DND-001 / implement
- **Outcome:** A typed `POST /api/schedule/defer` atomically commits an exact-source next-week defer and returns its final destination.
- **Authorization source:** Approved R4-R6 and design sections 2-4; proposed until the owner approves this spec.
- **Scope:** `specs/openapi.yaml`; defer DTOs; `ScheduleController.cs`; `ScheduleService.cs`; `06-schedule.rest`; focused API/service tests; generated client only through `task gen:client`. Exclude existing move semantics, recipe-card Plan for Later, schema/migrations, and unrelated generated output.
- **Starting baseline:** Record HEAD plus staged, unstaged, and untracked worktree evidence before the first edit; preserve unrelated changes.
- **Dependencies:** Approved OpenAPI request/response and `DND-001` ownership of shared scheduling service. `DND-003` depends on generated output from this task.
- **Acceptance:** R4, R5, R6; AC3-AC6.
- **Required context:** Requirements 3-5; design 2-4 and 7; `MoveScheduleDto.cs`, `ScheduleController.cs`, `ScheduleService.cs`, schedule service/integration tests.
- **Mandatory constraints:** Tests precede logic. Source matching is exact date plus recipe ID. A free destination has no calendar row. No move fallback, swap, push, or migration. Preserve request connection/echo metadata in both publications.
- **Verification:** Focused API/service tests for full-week spill, source error paths, locked/cooked/skipped semantics (including retained vote count on both skipped source and planned destination), last-cooked recalculation, groceries, and both schedule publications; `task gen:client`; `git diff --check`. Record actual results and tested identity.
- **Stop / escalation:** Stop for a required schema field, incompatible OpenAPI response envelope, inability to report a failed allocation safely, or a contract conflict with current generated client behavior.
- **Deliverable:** Reviewable contract/backend diff, generated-client result, focused evidence, and unresolved blockers.

## DND-002 — Dreaming completion workflow slice

- **ID / mode:** DND-002 / implement
- **Outcome:** Dreaming idempotently completes only overdue planned/locked recipe meals before its report runs.
- **Authorization source:** Approved R1-R3 and R7; proposed until the owner approves this spec.
- **Scope:** `ScheduleService.cs` only within an agreed non-overlapping ownership window; `FinalizeOverdueMealsProcessor.cs`; `Program.cs`; `dreaming.yaml`; `DreamingWorkflowSeeder.cs`; focused service/workflow tests. Exclude Home UI, prompts, database migrations, and unrelated workflow changes.
- **Starting baseline:** Reuse the task baseline from DND-001 where applicable; otherwise record a fresh pre-edit baseline without replacing prior evidence.
- **Dependencies:** `DND-001` must release shared `ScheduleService.cs`; existing worker retry semantics remain authoritative.
- **Acceptance:** R1-R3, R7; AC1, AC2, AC8.
- **Required context:** Requirements 3-4; design 5 and 7; `IWorkflowProcessor.cs`, current `dreaming.yaml`, `DreamingWorkflowSeeder.cs`, processor registration, worker retry tests.
- **Mandatory constraints:** Use deterministic clock/date control in tests. Do not mark recipe-less, today/future, cooked, skipped, or consensus events. Do not swallow processor failures. Do not create user-facing Dreaming effects.
- **Verification:** Focused Dreaming service tests, processor-resolution/dependency-order tests, retry test, default and override cron tests, and `git diff --check`; record actual command outcomes.
- **Stop / escalation:** Stop if deterministic time requires an unapproved broader clock architecture, if report ordering cannot express the dependency, or if retry behavior would need a worker-policy change.
- **Deliverable:** Reviewable Dreaming/workflow diff, test evidence, and remaining blockers.

## DND-003 — Next-week PWA caller migration

- **ID / mode:** DND-003 / implement
- **Outcome:** Planner and Home next-week recovery use the generated defer client and toast the committed destination while all unrelated scheduling flows retain their behavior.
- **Authorization source:** Approved R8 and design section 6; proposed until the owner approves this spec.
- **Scope:** `slotAssignment.ts`, planner recovery handler, `HomeCommandCenter.tsx`, and focused unit tests. Exclude recipe-card Plan for Later, `findFirstOpenPlannerSlot`, toast component redesign, and all non-next-week move callers.
- **Starting baseline:** Record/reuse task-local pre-edit evidence and preserve unrelated work.
- **Dependencies:** `DND-001` contract and generated client must be available; PWA code must consume its actual typed response shape.
- **Acceptance:** R8; AC7.
- **Required context:** Requirements R8; design section 6; existing planner/Home recovery tests; `useUiStore` toast API; generated defer client.
- **Mandatory constraints:** Send exact source date and recipe ID. Do not construct destination navigation. Do not retain client slot search or move payload fields in next-week branches. Keep tomorrow, drop, drag/reorder, swaps, and recipe-card Plan for Later unchanged.
- **Verification:** Focused planner/Home/slot-assignment unit tests, `task typecheck`, and `git diff --check`; assert defer payload, returned toast, retained current context, and absence of move call for next-week action.
- **Stop / escalation:** Stop if generated contract does not expose the required response, if the next-week branch lacks an exact source date, or if updating the caller would change Plan-for-Later behavior.
- **Deliverable:** Reviewable PWA diff, test/typecheck evidence, and remaining blockers.

## DND-004 — Reconciliation and scope review

- **ID / mode:** DND-004 / verify
- **Outcome:** The approved slices have evidence-backed contract/client/test reconciliation and a scoped final diff review.
- **Authorization source:** Approved validation requirements; no authority to fix new unrelated findings.
- **Scope:** Run validation and inspect changes made by DND-001 through DND-003. Do not edit product behavior except for separately authorized direct fixes.
- **Starting baseline:** Use the original pre-implementation baseline and task evidence; do not replace it with current worktree state.
- **Dependencies:** DND-001, DND-002, and DND-003 completed or explicitly reported blocked.
- **Acceptance:** AC1-AC8 evidence is classified; contract/client reconciliation completed.
- **Required context:** All requirements/design artifacts, changed-file diff, task evidence, execution harness.
- **Mandatory constraints:** Classify each check precisely. Static checks do not prove live API or workflow execution. Preserve unrelated dirty work.
- **Verification:** `task gen:client`; focused API/service/workflow tests; focused PWA tests; `task typecheck`; `task agent:reconcile`; scope review against baseline. Record passed/failed/blocked/not-run/not-applicable with commands and results.
- **Stop / escalation:** Stop and report any contract drift, test failure, unavailable dependency, or out-of-scope change. Do not commit, deploy, or broaden scope.
- **Deliverable:** Validation matrix, scope-review findings, changed-file rationale, and remaining blockers.

## Traceability

| Requirement | Primary task(s) |
|---|---|
| R1-R3 | DND-002, DND-004 |
| R4-R6 | DND-001, DND-004 |
| R7 | DND-002, DND-004 |
| R8 | DND-003, DND-004 |
