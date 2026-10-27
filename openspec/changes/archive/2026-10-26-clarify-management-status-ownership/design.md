# Design

## Context and Existing Ownership

See proposal.md for scope. Both canonical specs were read fully, including scenarios, preambles, historical relocation notes and qualifications. Audit C0007 reports agreeing outcomes, not a proven application defect. The settled owner is data-backup-and-recovery; this is specification organization, not a runtime correction.

Source inspected at HEAD `e680fb7966978da3fbde25453a241c7e69e2b2a1`:

| Boundary / evidence | Source-observed facts; limits |
|---|---|
| `api/src/RecipeApi/Controllers/ManagementController.cs`, `GetStatus` | One EF query filters exactly db-backup, db-restore, db-disaster-recovery, demo-capture, demo-restore; orders CreatedAt descending; includes tasks. No demo-mode predicate or earlier taskId filter. No instance returns 404 before demo inspection. No tie breaker is specified. |
| `Models/WorkflowInstance.cs`, `Models/WorkflowTask.cs`, `Data/RecipeDbContext.cs` under `api/src/RecipeApi/` | Instance Id becomes workflowId; definition WorkflowId becomes workflowType. Persisted status/timestamps are projected, not inferred from result. Completed tasks with non-null stored Result are ordered UpdatedAt descending and JSON-deserialized; no match yields null. JSON literal null can also deserialize to null. No atomic snapshot across all diagnostic reads is established. |
| `api/src/RecipeApi/Models/ManagementStatus.cs` | Shared fields coexist with demo diagnostic fields on the existing response; ownership does not create a second DTO or endpoint. |
| `api/src/RecipeApi/Services/RecoverySnapshotService.Demo.cs`, `InspectDemoAsync` | Checks baseline selection and validates/stages declared content. Absence returns RECAPTURE_REQUIRED; selected validation/I/O/JSON/operation/PostgreSQL failures become BASELINE_INVALID; a journal exposes reconciliation-required. Not a blanket exception shield; no new fail-open or always-200 claim. |
| `GetStatus`, `Services/DemoModeOptions.cs`, `Services/CronScheduleCalculator.cs` | Cron validity is caught independently. Future pending RestoreDemoState in an active demo-restore supplies next occurrence; last reset is read separately. Seeder health requires demo enabled, valid cron and a confirmed successor. Newest generic result need not be the reset result. |
| `api/src/RecipeApi/Middleware/RecoveryBoundaryMiddleware.cs`, `ErrorHandlingMiddleware.cs` | Status bypasses recovery coordination gate; exceptions can still reach shared error handling. Availability during recovery is preserved as an existing obligation, not a universal successful-response guarantee. |
| `specs/openapi.yaml`: `/api/management/status`, `ManagementTaskStatusResponse` | Approved runtime contract remains unchanged. Known source/contract gaps: controller returns 404 but operation declares 200/503; model includes Paused but response enum omits it. This plan neither resolves those gaps nor declares source authoritative over OpenAPI. No new missing-instance/status-enum requirements. |
| `api/src/RecipeApi.Tests/Controllers/ManagementControllerTests.cs` | Inspected existing no-workflow, missing-baseline, invalid-cron and no-confirmed-successor assertions. Test existence is static evidence; tests were not executed as runtime acceptance. |

Shared household authentication remains owned by household-identity; acceptance, persistence, execution and retry lifecycle remain owned by background-processing. Existing cross-references are retained. A completed task result is not a claim of workflow success, complete recovery or successful recurrence.

## Decisions and Tradeoffs

Reuse the existing `Project the latest selected management result` requirement and anchor. It already owns ordinary projection. Expand its expression to the shared five-type selection currently hosted in demo-household. Remove the latter's redundant shared requirement, relocating both scenarios rather than deleting their coverage. This avoids another capability or an additional competing rule; retaining two authoritative copies would leave C0007 unresolved. No new runtime abstraction or capability is justified.

The only modified normative description is the shared-owner requirement. Its complete after-text and all four scenarios are in the data-backup-and-recovery delta. The demo delta records removal and replacement; no new requirement or scenario is invented.

### Exact obligation ownership map

| Obligation before | After owner / action |
|---|---|
| Ordinary selected instance projects instance identity as workflowId, workflowType, status, createdAt, updatedAt (DBR) | Same DBR requirement, extended to all selected management instances by merging demo's existing shared rule. |
| Most recently updated completed non-null task result, otherwise null (DBR; overlapping demo) | DBR sole authority, unchanged selection/null semantics; demo consumes it. |
| Newest CreatedAt among exactly five named ordinary/demo workflow types (demo) | Move to DBR shared description; independent of API demo activation and earlier caller taskId. No extra workflow types, status predicate or tie policy. |
| Selected result may be reschedule rather than restore (demo scenario) | Move scenario verbatim to DBR; retain separate reset-versus-successor diagnostic scenario in demo. |
| Snapshot readiness/missing content, cron validity, baseline/preflight/recovery/reset outcome and confirmed next occurrence (demo) | Stay in demo unchanged, including status availability during recovery and limits on what cron/enqueue proves. |
| Household access; acceptance versus completion; workflow lifecycle/retry (existing shared owners and DBR/demo consumers) | Unchanged owners and references. No shared result is promoted into successful completion. |

### Before/after requirement and scenario mapping

DBR = `openspec/specs/data-backup-and-recovery/spec.md`; DH = `openspec/specs/demo-household/spec.md`. Locations below refer to the current source, not line numbers promised after application.

| Before requirement / scenario | After requirement / scenario | Conservation |
|---|---|---|
| DBR:65–76 `Project the latest selected management result` | Same title/anchor, merged description | One modified description; no title rename. |
| DBR / `Completed result` | DBR / same requirement / `Completed result` | Entire scenario byte-identical, ordinary scope retained. |
| DBR / `No completed result` | DBR / same requirement / `No completed result` | Entire scenario byte-identical, null result retained. |
| DH:373–384 `Read latest management workflow diagnostics` | DBR / `Project the latest selected management result` | Remove superseded requirement only after both scenarios are present at destination; retain provenance note. |
| DH / `Latest management selection` | DBR / same shared requirement / `Latest management selection` | Entire scenario byte-identical; newest createdAt can differ from earlier taskId. |
| DH / `Completed task result` | DBR / same shared requirement / `Completed task result` | Entire scenario byte-identical, including reschedule example. |
| DH / `Report snapshot-file and cron diagnostics with management status` / `Missing core snapshot`; `Valid cron with missing snapshot`; `Invalid restore cron`; `Reschedule result is newer` | DH / same requirement and all four scenarios | Whole block byte-identical. |
| All other DBR and DH requirements/scenarios, including acceptance and execution/reset/failure rules | Same owner, title, body and scenarios | All other blocks byte-identical. |

Expected applied canonical counts: DBR 32 requirements / 92 scenarios (was 32 / 90); DH 36 / 118 (was 37 / 120); combined 68 / 210 (was 69 / 210); corpus 807 / 2,165 (was 808 / 2,165), assuming no concurrent canonical edits. One redundant requirement removed; zero scenarios lost or added.

### Every wording change and rationale

| Edit | Rationale / semantic effect |
|---|---|
| Replace DBR's leading ordinary-only condition with demo's five-workflow newest-created selection sentence | Transfers the existing global selection rule and makes DBR the shared owner. Does not change runtime selection or filter by demo activation. |
| Use `When found` before projection | Preserves demo's existing conditional found-instance boundary; avoids inventing a successful empty response. |
| Keep DBR's explicit `instance identity as workflowId`, workflowType, createdAt, updatedAt; qualify status as `persisted` | Retains exact response keys and identity meaning while carrying demo's existing persisted-status wording. No enum or serialization change. |
| Keep DBR's completed/non-null/newest-updated selection and explicit `or a null result` | Conserves ordinary and shared result semantics without equating result with workflow/reset success. `non-null` and demo's `nonnull stored result` refer to the same filter. |
| Remove DH shared requirement description; move its scenarios verbatim | Consolidates authority, preserves the broader scenarios and reschedule warning. No endpoint behavior removal. |
| Add DH shared-owner link and relocation note; add DBR reciprocal diagnostic-owner note | Makes delegation and the removed anchor discoverable. Exact proposed non-normative text below; no rewriting of historical evidence or qualifications. |

Apply these non-normative additions only after canonical editing is separately requested:

1. In DH Purpose, extend the existing shared-owner list with the label `management status` targeting `../data-backup-and-recovery/spec.md#requirement-project-the-latest-selected-management-result`; leave identity/background policy wording intact.
2. In DH's existing `Relocated requirement references (non-normative)` section, add: “The former requirement Read latest management workflow diagnostics and its Latest management selection and Completed task result scenarios now resolve to Project the latest selected management result. Demo-specific management diagnostics remain owned here.” Link the destination requirement name to `../data-backup-and-recovery/spec.md#requirement-project-the-latest-selected-management-result`. Add the explicit HTML anchor `<a id="requirement-read-latest-management-workflow-diagnostics"></a>` before that relocation paragraph to preserve existing inbound links.
3. In DBR's existing `Capability dependencies (non-normative)` section, add: “Shared management-status selection and result projection are owned by Project the latest selected management result. Demo-specific snapshot, cron, reset and recurrence diagnostics remain owned by demo-household.” Link the shared requirement name to `#requirement-project-the-latest-selected-management-result` and the demo-household name to `../demo-household/spec.md#requirement-report-snapshot-file-and-cron-diagnostics-with-management-status`.

These additions clarify current ownership; historical counts and lifecycle/qualification records are evidence and remain verbatim. The compatibility anchor avoids requiring unrelated inbound-document edits. Link validation must check that explicit anchor as well as heading anchors.

## First Observable Slice

One documentation slice connects DH's reference to the DBR shared requirement, all four conserved scenarios, then back to unchanged DH diagnostics. A reviewer can follow newest-management selection and distinguish a reschedule result from reset outcome without encountering a second projection authority. Only the two canonical spec files and change evidence/tasks are involved in later application; no UI, API, DTO, persistence, worker or model-provider seam changes.

Acceptance is full-file semantic review plus exact block/scenario conservation and link checks. Red/green behavior tests, new mocks, client generation and API/database/browser tests are not applicable to this documentation-only slice. Static validation does not qualify existing runtime behavior.

## Risks and Deferrable Questions

Primary risk is losing scenario or qualification text during consolidation. Compare against fresh before-images, use the explicit mapping and counts, then reread both full specs after application. Inventory spans/hashes are navigation evidence; full relevant-spec review remains required.

Do not silently fix the observed OpenAPI 404/503/Paused gaps, JSON-result failure handling, tie ordering or diagnostic consistency. Those questions are outside this ownership-only plan and cannot justify adding guarantees here. Existing A34, DBR-U01–U08/U12 and DH-U01–DH-U09/U07 qualification text remains unchanged; no atomic recovery, recurring-health or runtime/provider certification is inferred. Both URL/photo finalization requirements stay unchanged. P1 overlap tooling and P2 benchmarking remain deferred.
