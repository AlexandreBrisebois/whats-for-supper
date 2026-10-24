# Tasks

## 1. Contract and first failure tracer

- [x] 1.1 Update existing URL capture/failure/retry operation behavior descriptions; coordinator regenerates Kiota and runs client drift verification after integration.
- [x] 1.2 Add focused red regression proving persisted URL intake with unavailable workflow YAML is visible through fresh failure reads, with unchanged recipe identity and source metadata.

## 2. Durable initialization and bounded recovery

- [x] 2.1 Save recipe and recoverable initialization marker together; initialize existing workflow graph atomically under row lock; reuse failure list and retry/clear. Run focused URL capture and existing capture/orchestrator regression tests green.
- [x] 2.2 Qualify actual PostgreSQL, disk and real orchestrator using missing then restored YAML, concurrent retries, lost reply after committed initialization, database-save failure rollback and reload/clear. Record exact command and provider evidence; no paid execution.

## 3. Integrated acceptance

- [x] 3.1 Coordinator synchronizes existing method-sensitive failed-capture mocks and runs affected Settings browser acceptance, generated-client checks and required combined repository verification. Keep acquisition asynchronous, successful captures and ordinary photo/PDF failures covered.

## Evidence

- Initial RED: `task test:api -- --filter FullyQualifiedName~UrlCaptureRecoveryTests` failed on fresh failure-list JSON `{data:{items:[]}}` after the recipe and recipe.info were confirmed saved; no implementation changes preceded this observation.
- First GREEN: URL/CaptureFailureIntegration/WorkflowOrchestrator/RecipeService focused suite passed 30/0/0.
- Extended real-seam acceptance initially found new-task EF tracking incorrectly attempted updates. Explicit task AddRange fixed it; subsequent actual PostgreSQL/local storage/real orchestrator suite passed 52/0/0 (UrlCaptureRecovery, CaptureFailureIntegrationTests, WorkflowOrchestratorTests, RecipeServiceTests, RecipeImportLifecycleTests).
- URL-only zero-task definition RED: focused UrlCaptureRecoveryTests failed expected 500/actual 202 before the initializer guard. Final green rerun: 52 passed, 0 failed, 0 skipped with the same provider configuration.
- Real PostgreSQL uses an isolated throwaway database created from api/database/schema.sql inside the coordinator-owned ephemeral pgvector container; no shared household data. Tests exercise missing/invalid YAML, a genuine PostgreSQL trigger rejecting task inserts and preserving the marker, lost acknowledgement intercepted AFTER committed initialization then same-context reread, four overlapping API retry requests leaving one graph, Clear, and a trigger rejecting initial workflow persistence proving no recipe-only commit. No paid processor executes.
- Browser: `task test:e2e -- url-capture-recovery.spec.ts --project=chromium` passed 1/0/0 against Chromium/managed Next dev server. Method-sensitive route overrides use all required failure fields, show saved-but-not-started guidance, retry the same workflow ID, reread empty state on reload and assert no intake POST. This mocked API/browser evidence does not replace real backend acceptance.
- Central generation/client drift and combined repository checks passed as recorded below; actual URL database/storage/orchestration acceptance and Settings mocked browser evidence are recorded above. Photo/PDF extension and historical orphan migration are outside scope.


Focused final backend command (the coordinator connection is injected privately as WFS_TEST_POSTGRES_CONNECTION):

```sh
task test:api -- --filter 'FullyQualifiedName~UrlCaptureRecovery|FullyQualifiedName~CaptureFailureIntegrationTests|FullyQualifiedName~WorkflowOrchestratorTests|FullyQualifiedName~RecipeServiceTests|FullyQualifiedName~RecipeImportLifecycleTests'
```

Final worker checks: strict OpenSpec validation and scoped git diff whitespace check passed. Application preparation and combined final verification are intentionally owned by the coordinator; this worker does not claim them complete.

- Central generation and client/contract checks passed in `.task/agent-finish/runs/f8793dc6b9b64508a61a4b7c6c44b879.json`; that full run passed all checks except the subsequently synchronized grocery navigation browser test. The Linux database runner passed 137 tests with zero skips, including URL recovery. The successful final full-path rerun is recorded below.

## Completion evidence

- Combined `task verify -- <all 76 reviewed changed paths>` passed every applicable check; no paths excluded. Record: `.task/agent-finish/runs/be34c4f071e549d98e08070b6828f9f9.json`. Frontend: 936 tests; browser impact: 297 passed/16 skipped; API: 1186 passed/121 skipped in the general run; dedicated Linux/PostgreSQL: 137 passed/zero skipped. Selected live household acceptance passed separately; unrelated opt-in suites are not implied qualified. Lint, formatting, types, strict specs, generated-client/contracts, actual endpoint parity and content identity passed. No commit, push, deployment, issue closure or archival.
- Application and test inputs are unchanged after that run; final checkbox/evidence documentation updates are validated separately with scoped `task verify`. Provider execution and physical-device qualification remain outside the selected checks.
