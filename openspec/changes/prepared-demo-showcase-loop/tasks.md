# Tasks

This is approved **specification review/editing only**, not implementation approval. The reset behavior choices in group 1 remain unapproved. No apply, sync/archive, merge, deployment or live operation is selected. Earlier planning validation does not validate this revised content.

## 1. Resolve the remaining policy choices

**Outcome:** Written decisions and reconciled proposal/design/delta; no runtime changes.
**Owners:** Existing demo management, recovery, application-time, workflow and household state owners.
**Prerequisites:** Review the disposition inventory and dependency mapping in design.md against #245 and the final accepted #348 scope.

- [ ] 1.1 Accept the date policy and classify actual week/date fields versus audit, retention, eligibility and notification timestamps. Reconcile relative-week or absolute-date scenarios; preserve Calendar:TimeZone and UTC cron.
- [ ] 1.2 Select fresh versus prepared votes/reports, approve deterministic synthetic content/privacy and relationship rules, and verify the proposed fixture can converge under ordinary thresholds. Keep matches distinct from explicit saving, and model-free visitor imports distinct from baseline publication.
- [ ] 1.3 Select the safe-maintenance disposition and stale-work owner per operation: reset, lexical indexing/reconciliation, dreaming's backup/maintenance/overdue/rollover/rotation/filter/pruning work and queued commands. Treat #348's accepted model-free search path as reusable; model-free alone does not authorize survival across reset.
- [ ] 1.4 Accept or amend complete-format/legacy recapture policy and the smallest concrete operator-only capture/replacement/selection mechanism. Check generic workflow trigger and task-reset paths and separately decide manual-restore authority; no role-system or live credential change is implied.
- [ ] 1.5 Choose coordinated bounded pause versus explicit offline reset, prior-state/ambiguous-commit recovery and timeout/resume behavior. Name the minimal demo boundary activation, worker lease ownership and restart reconciliation seam; avoid upgrading WorkflowWorker's existing Write lease or assuming Recovery:BackupRoot is configured.
- [ ] 1.6 Decide manual one-shot, rejection outside demo, or deliberate recurrence, and separately accept or amend future recurrence after terminal failure. If behavior changes, reconcile the complete canonical restore-acceptance requirement, accepted workflow parameters, OpenAPI and lifecycle scenarios; preserve intentional automatic recurrence through the existing scheduler owner.

## 2. Prepare the smallest accepted implementation sequence

**Outcome:** Bounded red/green/refactor tasks with named real-seam acceptance, only after their group 1 decisions and separate implementation approval.
**Owners:** ManagementController → persisted workflow/ManagementProcessor → ManagementService/recovery/database/assets → ordinary API reads/PWA reconciliation.
**Prerequisites:** Verify the final accepted #348 head; recheck source after main moves. The four steps below are planning work, not permission to execute them.
**Acceptance boundary:** Reviewed tasks and contracts; no runtime or deployment qualification from this PR.

- [ ] 2.1 Plan the baseline-safety slice through existing demo-capture/demo-restore acceptance: missing/corrupt assets, malformed collections/relationships, explicit empty inventory, configured-root compatibility, staged capture and prior-baseline preservation. Name focused ManagementServiceTests/ManagementControllerTests and real PostgreSQL/failure-injection coverage. A separately approved missing-directory-only fix must state its limited result.
- [ ] 2.2 Plan one small complete household round trip, using every state's declared disposition and the accepted date policy. Proposed DemoShowcaseLoopTests must cross actual management/workflow/PostgreSQL/file-publication seams, then ordinary reads. Capture prepared plan/check/extra lineage and PDF/hero, make visitor mutations and a synthetic permitted model-free import, restore, verify the prepared facts/assets and absence of visitor-only membership. Reuse #348 provider traps; do not replay operational authority.
- [ ] 2.3 Plan interruption/concurrency acceptance at the existing owners: capture/copy/commit/restart failure, active/claimed workers, grocery check/bulk-check/recomputation, stale extra versions/round close/search continuations, missed SSE and mounted-client recovery. Proposed pwa/e2e/demo-showcase.spec.ts covers ordinary browse/vote/matches/explicit-save/groceries/cook plus reset. Require authoritative reads, no stale-draft replay and preserved browser acknowledgement; name exact registered test filters during accepted planning.
- [ ] 2.4 Plan only the selected recurrence/diagnostic changes through current YAML/seeder/shared acceptance. Name DemoWorkflowSeederTests, management result/status and successor failure/retry/restart cases. Separate reset completion from next-occurrence confirmation; preserve non-demo, ordinary merge/exact recovery, valid device state, operator data and artwork. Include synthetic preparation/recapture/activation/recovery documentation, not a new management UI.
- [ ] 2.5 For each selected slice, identify actual route/method/response or event changes, approved OpenAPI edits, generated Kiota consumers, and pwa/e2e/mock-api.ts handlers/builders/state transitions. Require task gen:client:check and affected API/mock/browser checks. Add reset-specific EN/FR interruption/retry/status/focus/touch acceptance on iPhone, Pixel Phone and iPad and the remaining self-hosting guidance; do not redo #348's context introduction or merged Home #339/duration #346.
- [ ] 2.6 Reconcile #348 as a conditional dependency, not a new implementation slice: record final accepted head and requirement/scenario owner mapping, safe prepared-bundle imports, local Mark as resolved, model-free Search/Similar/indexing, provider refusal and context/dismissal preservation. Keep its corrected browser loopback fixture and actual final-check limitations visible. Run its relevant regression tests when later reset changes integrate; do not mark it complete because code exists or copy its requirement blocks here.

The accepted implementation tasks must name test-first commands, exact filters and expected outcomes for their affected slice, plus applicable task prepare, task test:api, task test:database, task test:e2e, task gen:client:check and final task verify. Use only disposable synthetic databases/files/media/vectors and failing outbound traps/dummy credentials. Never use production, live demo state, actual AI or user telemetry. Physical-device checks are distinct from browser emulation.

## 3. Verify this specification-only revision

- [x] 3.1 Reassess the current capture/reset/recovery/state/authority sources and preserve canonical requirement/scenario names, complete disposition inventory, explicit unapproved decisions and #348 traceability. Preserve the pre-existing data-backup-and-recovery delta and metadata unchanged. Check the four-file scope and distinguish source observations from future acceptance.
- [ ] 3.2 Run task spec:check -- prepared-demo-showcase-loop --type change (strict/noninteractive under the installed workflow) and task verify with the four reviewed paths in the existing approved task when available. Record exact content identity, commands/results and record_path. Connector/static inspection is not a substitute for this gate.
- [ ] 3.3 Review the published planning diff and strict CI at its exact head. Read back all four files; report passed/failed/blocked/not-run separately. No application/provider/database/browser acceptance is claimed for this spec-only PR.

## Evidence and limits

Source review uses GitHub Connector only: main 4682643cd6086b66008fc77ede4570329e29b5ae, prior #340 b5c6e0aca537b497ffe7af880f9d0c8c8957ca3c and #348 5370238ec5d3b9b44172e7c077d40d54cbf44dbf. #348 remains draft/unmerged at inspection; its published implementation is not main behavior. Main's Home #339 and duration #346 are preservation dependencies. Issue #245 remains open; source findings do not establish deployed incidents.

The earlier OpenSpec 1.14.3 / task verify record .task/agent-finish/runs/68b4df4b6aa445f2966df33d9ceb03bd.json and identity 2f49cdf65b845e413618c392082f0b9a8dd9b4c47f7804f420fd394121816d6b belong only to the prior planning content. This revision returns 3.2/3.3 to pending. Groups 1–2 remain decisions/planning, not checked implementation tasks. No repository scripts, tests, provider calls, database/live reset, configuration or secrets were used by this connector review.
