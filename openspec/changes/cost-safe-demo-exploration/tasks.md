# Tasks

Implementation is explicitly approved for this bounded change. Broader reset policies, Home #339, beta #345 and deployment remain excluded. Complete each increment test-first; record actual commands, red/green and limits below.

## 1. Reject model work and private AI capture honestly

**Outcome:** Demo AI requests fail before body processing or provider sends; prepared content survives and non-demo delegation remains.
**Owners:** Existing demo options/chat decorator, native embedding/hero, five worker bypasses, selected MVC actions, OpenAPI/Kiota, mode owner and capture/detail UI.
**Acceptance:** Real TestServer with disposable in-memory database/files plus actual provider transports replaced by failing doubles; no production or AI network.

- [x] 1.1 Add reusable 403 DEMO_AI_UNAVAILABLE contract to selected AI-only POST routes before logic; run strict spec validation, regenerate with task gen:client and synchronize route/method-specific pwa/e2e/mock-api.ts handlers. Verify task gen:client:check and error-shape tests.
- [x] 1.2 Add DemoAiBoundaryTests and DemoExplorationTests first; observe meaningful failures for direct native embedding/hero attempts, five-name false-success bypass and early HTTP refusal. Implement actual boundary guards/resource filters, retain chat/stream zero delegation, and verify dummy-credential/force/retry plus ordinary non-demo transport delegation controls through task test:api -- --filter 'FullyQualifiedName~DemoAiBoundaryTests|FullyQualifiedName~DemoExplorationTests|FullyQualifiedName~DemoMode'.
- [x] 1.3 Test and implement shared API demo-mode discovery and early localized unavailable capture/reimport/generation entry. Include unknown/failed discovery with Retry/return and preserved prepared media. Verify affected component tests and pwa/e2e/demo-mode.spec.ts no-file-selection/no-upload/no-fake-success scenarios in isolated browser mocks; document the restricted actions in this change.

## 2. Preserve model-free local search and editing

**Outcome:** Typed Search, prepared Similar and lexical indexing remain usable under demo without embeddings or embedding-only repair loops.
**Owners:** RecipeSearchService, SearchIndexWorkflow and SearchReconciliationWorkflow; ordinary non-demo behavior retained.
**Acceptance:** Real local service/database seams, synthetic content/vector compatibility and fail-on-send embedding double.

- [x] 2.1 Add DemoSearchTests for typed lexical results, compatible/missing/obsolete Similar, searchable edits and repeat indexing/reconciliation; observe red before production edits. Implement demo-specific provider avoidance while preserving prepared vectors and fingerprint guards; verify task test:api -- --filter 'FullyQualifiedName~DemoSearchTests|FullyQualifiedName~SearchIndexWorkflowTests|FullyQualifiedName~SearchReconciliationWorkflowTests' and existing affected search tests.

## 3. Explain the demo without disrupting tasks

**Outcome:** Top safe-area context band, one-screen phone/tablet explanation, safe first normal introduction, locally remembered dismissal and manual reopen.
**Owners:** App shell, existing identity/dialog/local-preference patterns and EN/FR locales; no generic onboarding framework.
**Acceptance:** Component/store tests and real loopback-rendered browser against synthetic route mocks; physical-device evidence is separate.

- [x] 3.1 Add DemoContext tests before behavior for first-ready Home, late readiness after interaction, protected deep links, competing dialogs, both close actions, read/write storage failure, no repeated visit popup, reset/profile/locale persistence and manual reopen. Implement scoped context state with a boolean demo key outside shared data; verify task test:unit -- src/components/identity/DemoContext.test.tsx.
- [x] 3.2 Add and exercise pwa/e2e/demo-mode.spec.ts on iPhone/Pixel/iPad viewports in EN/FR. Inspect screenshots and DOM for top safe-area placement, 44px touch targets, measured white/purple 4.5:1 contrast, readable expansion, dialog name/description/focus containment/Escape/return and reduced motion. Keep non-demo identity unchanged; record rendered artifacts and no tracking/network side effects.

## 4. Final review and verification

- [x] 4.1 Review the actual diff independently of implementation order for provider coverage, request-body privacy, non-demo regressions and explicit exclusions; fix only in-scope findings. Run applicable task prepare, task gen:client:check and task verify with the complete reviewed path set. Required blocked checks remain blockers; no production target is permitted.
- [ ] 4.2 Publish a separate linked draft implementation PR through the GitHub connector, read back its exact files/head and monitor final-head CI to terminal. Record branch/PR/head, isolated runtime identity, passed/failed/blocked/not-run checks and remaining limits. No merge, release, live reset or deployment.

## Evidence

Baseline: connector main ba8dca21c83000d03ce03dbe51bd7542daa76b88, exact tree e81bfb41a7bbfdd0831e9edde3de52369790da75. The isolated worktree preserves the broad PR #340 planning changes elsewhere. Node 26.12.0/npm 11.21.1/.NET 11 RC/OpenSpec 1.14.3 match repository pins; Kiota uses the side-by-side .NET 10 runtime under /tmp. No dependency pins changed.

Test-first: initial boundary/refusal tests had 16 intended failures/2 passes, then the focused API set passed 34/34. Search began with 4 failures/2 preservation passes; affected search/index/reconciliation passed 51/51. UI mode/gate began with 4 failures/1 preservation pass. Context tests reproduced late readiness, active-task completion, routing and storage-denial regressions. A separate synthetic categorization test reproduced swallowed demo refusal/fallback replacement; the guard preserves prepared category/cuisine/meal types. Current focused API/categorization controls pass 38/38. Compilation and tooling errors are not red evidence.

Rendered evidence: the registered demo-mode suite passes 15/15 isolated Chromium cases, covering EN/FR iPhone/Pixel/iPad portrait/landscape, expanded French text at 320×568, modal name/focus wrapping/Escape/return, 44px controls and measured normal/hover/pressed contrast. Screenshots were inspected. Native reverse-tab escape, a changing mock timestamp and an assertion accidentally counting permitted lexical Search were corrected. Cases reuse the existing registered suite; inventory/classifier policy is unchanged. Physical-device Safari/Chrome remains unqualified.

The complete pre-lifetime-correction verifier passed at .task/agent-finish/runs/7af6fe4b12cc4dfba7381f347951a8e3.json, identity 654ffa38d7b73f5cb30ec80318d8f262cf3652d3dd763cc9c16ad3c999193d46: 36 strict spec items, lint/format/types, 967 unit tests, 321 browser tests (18 existing opt-in/manual skips), 1,221 API tests (135 prerequisite/manual skips), generated-client/static contracts, loopback endpoint parity and 155 PostgreSQL tests with zero skips. The owned container was removed. A later isolated probe found full app-shell remount could replay an undismissed explanation; the three-file component-lifetime correction now passes 13 context cases including React StrictMode, lint and an optimized build. A complete stable rerun is required for that final source.

Diagnostic records remain explicit failures: 49b9b977aa3240a4abe07e52c695ad8c (new effect-state lint and first Vitest cache mutation), 6dbf4eb6f1f74998af21df4fea70eef5 (DTO init-accessor audit and read-only home fixtures), and database run 414a9422bc87474591bee3a6e7870c30 (155 passed but concurrent edits invalidated identity). No check was waived. The DTO follows existing get/set audit patterns. Local fixture permission allows only synthetic recovery testing to complete; HOME is unchanged and no production or shared Compose data is used.

Isolation: TestServer/Kestrel uses unique in-memory databases, /tmp/wfs-test-* files and model mocks; loopback 5109 serves generated OpenAPI. PWA loopback 3107 uses strict browser mocks and a refused internal API target. Hero/embedding positive controls use synthetic HttpMessageHandlers; demo provider counts are zero. PostgreSQL uses an owned temporary container and unique test databases/UUID fixture roots, removed after testing. No real AI, user telemetry, live demo, production target, reset or deployment.

The first GitHub application-test blob was denied because automatic approval review treated implementation approval as absent. After a fresh top-level delegation explicitly continued authorized publication, the single permitted retry succeeded. Publication is unblocked; the separate draft implementation PR and exact-head CI remain pending. Broader reset/public-operation readiness is not established by this slice.

Final source verification at .task/agent-finish/runs/2c4415b05e404e48aa108c4d0193b051.json retains stable identity ad14d2f56772d1cde530fcb6450b66f7740db1b3210b3510846f7d2f11e412ee. Strict specs, lint/format/types, 969 unit tests, 1,221 API tests (135 prerequisite/manual skips), contracts/client generation, endpoint parity and 155 PostgreSQL tests (zero skips) pass. The full browser run had 320 passed, 18 existing opt-in/manual skips and one intermittent unchanged grocery keyboard-case failure: Enter reached Edit after an asynchronous post-save focus transfer. That case subsequently passed 5/5 on final source and 20/20 against the exact main-tree baseline. The failure is retained, not waived or represented as a green full local gate. No grocery product/test changes are included; final-head CI and this limitation must be reported.
