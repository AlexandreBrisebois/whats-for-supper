# PDF recipe import preview — tasks and checks

Status: T01/T03 complete; T04–T07 implemented and automated API/contract/native/lifecycle/Compose checks passed at the identities in [implementation-evidence.md](implementation-evidence.md). Full PWA regression results are recorded there. T02 production Ubuntu amd64 measurement/native checks passed at the explicit evaluation profile; actual NAS budgets/architecture, phone readability and extraction accuracy remain blocked/not-run. T08 automated evidence is recorded; real Android/iOS/NAS acceptance remains blocked. Source implementation is not a rollout qualification.
Kind: feature specification; design-first from design.md, gated approval. Product acceptance: requirements.md PDF-R01–15. OQ-01 architecture is resolved by a separate PDF processor in existing recipe-import; OQ-04 manifest strategy is approved; OQ-02/OQ-03 are early implementation follow-ups; resolve them from repository conventions/measurements before dependent tests/code, not by guessing.
Required/optional: T01–T08 are required within the approved preview. No optional task is a hidden completion condition. Listing tasks does not authorize executing them. An explicit complete-package kickoff selects T01–T08 together; routine internal dependencies do not require repeated selection/confirmation.
Dependencies/shared-file ownership: execute dependent changes sequentially. One writer owns OpenAPI/client/mock updates and each shared capture/recovery file within its selected task. Do not parallelize overlapping contract, capture, failure-service, worker/manifest or template mutations.

## T01 — Required: pinned insertion-point and recovery reconnaissance

Requirements: PDF-R01–15; design D1–D8. Dependencies: none.
Outcome: revalidate remaining source at pinned checkout containing existing feature flags; resolve facts, not new product choices.
Allowed effects when selected: spec evidence/design/task refinements only; no runtime edits.
Context: capture/page.tsx → MinimalCapture/useCapture → helpers; RecipeController → RecipeService/ValidationService/storage → workflow; FeatureFlagService/provider/store; sw/manifest serving; CapturesController → CaptureFailureService → FailedCapturesSection; source lifecycle/backup/purge; nearby OpenAPI/tests/mocks.
Checks: record member/metadata representation and persistence effects; photo rating/defaults/notes; accepted-ID/launch caveat; actual manifest linkage; Settings workflow-failure predicate and source cleanup ownership.
Stop: verify the approved OQ-01 processor integration/retry/cleanup against source, OQ-02 schema evidence, approved OQ-04 single /manifest.json strategy; propose decisions individually. Do not invent a new queue/workflow. Source reconnaissance is not runtime passing evidence.

## T02 — Required: renderer/container/resource qualification packet

Requirements: PDF-R05–07/14; design D4. Depends: T01.
Allowed effects when the implementation package is selected: bounded qualification harness/fixtures, PDFtoImage dependency/native packaging in the processor's production execution container, resource measurements and synchronized spec evidence. Keep final production behavior work coordinated with T04.
Outcome: qualify PDFtoImage version/native libraries/fonts/licenses on actual Synology/Ubuntu chiseled .NET; identify enforceable resource/time limits. Approved starting point: 200 DPI PNG per page. This approves the evaluation baseline, not unmeasured production render settings or resource guarantees.
Checks: text/scanned/bilingual/single-recipe multipage/cover-page readability, quantities/units/order, source bytes, input limits, corrupt/encrypted PDFs, startup/native load, bytes/pixels/memory/disk/time, synchronous-call timeout behavior, sequential disposal and cleanup. Multi-recipe fixture documents unsupported behavior, not a detector.
Completion: select and record OQ-03 settings/budgets from measurements, including bounded failure isolation if necessary within approved scope. Ask only if evidence requires changes to approved behavior/scope/consequential constraints. Mark actual target-architecture results separately; do not claim both x64/arm64 unless tested.

## T03 — Required: finalize approved PDF contract and processor integration

Requirements: PDF-R01/04–11/13/14; design D2–D5. Depends: T01, resource/schema inputs from T02. Follow-ups: resolve OQ-02 here; take relevant measured OQ-03 values from T02 before dependent code.
Allowed effects when selected: synchronize specifications and OpenAPI exact schemas/error bodies using approved wire decisions and existing conventions, before dependent tests/runtime code.
Outcome: specify approved multipart file/rating/notes and 202 {data:{id}} pending-recipe envelope in OpenAPI; approved 20 MiB (20,971,520-byte) API bound and 10-page processor ceiling; accepted-ID/error envelope; Settings failed-source creation/retry/delete/cleanup and member attribution; flag-off retry semantics. Preserve no PDF workflow, normal extraction and no durable queue.
Test seam: POST /api/recipes/capture-pdf (approved multipart file/rating/notes; 202 {data:{id}} before conversion); GET /api/captures/failures ({data:{items}}); POST /api/captures/failures/{id}/retry (202 {data:{queued:true}}); DELETE same resource (202 {data:{cleared:true,cleanupCommandId}}). Existing recovery envelopes verified from controller; PDF field names and 202 {data:{id}} are approved product wire decisions. Approved immediate statuses: 400 missing file/invalid metadata, 413 upload over 20 MiB, 415 unsupported type, 409 disabled preview; no pending import on rejection. Field schema/default/serialization and error-body details require contract synchronization in this task.
Checks: requirement/design/contract agreement, pending PDF recipe plus conversion-task failure compatible with existing Settings service predicates, retained retry source lifecycle and no enabled/auth bypass. Regenerate Kiota/client and synchronize mocks only as part of selected approved seam work.
Completion: finalize exact schemas within approved wire semantics and mark derived specs synchronized, then proceed to dependent tests/code. Ask one question only if this requires changed behavior/scope or a consequential contract decision beyond approved intent.

## T04 — Required: PDF source acceptance, separate conversion processor and Settings recovery

Requirements: PDF-R01/04–08/10/11/14; design D2–D5/D8. Depends: T01–T03 outputs. Finalize OQ-02/03 inputs before dependent code; OQ-01 architecture is approved.
Allowed effects when selected: approved OpenAPI/client DTO seam, RecipeController/source acceptance, separate PDF conversion processor in recipe-import.yaml and its renderer service, FeatureFlagService registry/gate, storage/image enumeration/lifecycle, agreed CaptureFailureService/maintenance integration and API tests. No photo route rename/prompt change/new workflow framework.
Write tests before code. Preserve image-only POST /api/recipes and feed generated pages through normal creation/workflow once.
Test seam:
- API tests: extend RecipeControllerTests.cs, ValidationServiceTests.cs, FeatureFlagServiceTests.cs and CaptureFailureIntegrationTests.cs; add named PdfCaptureIntegrationTests.cs/PdfConversionProcessorTests.cs for new boundaries. Real PostgreSQL and faithful TestWebApplicationFactory workflow effects.
- Browser scenario owned with T05 in pwa/e2e/capture-flow.spec.ts: select one PDF, rating/notes, Save → agreed accepted ID; disabled direct call; accepted pending source → workflow conversion failure → existing Settings failure row; Retry/Delete; corrupt/encrypted remains until user Delete.
- Mock owner: pwa/e2e/mock-api.ts, MOCK_IDS/schema builders. Slice owner synchronizes approved routes/envelopes from T03; do not mock a failure row that backend cannot create.
Checks: approved immediate 400/413/415/409 and existing auth responses without recipe/workflow persistence; corrupt/encrypted/over-page PDF failure inside the processor and existing Settings recovery; no side effects for disabled/auth rejection, 20 MiB API bound (exactly 20,971,520 bytes allowed; larger rejected before pending persistence) and whole-document 10-page ceiling (10 allowed; 11 fails the job without truncation)/render checks in processor, photo jobs skip PDF processor, safe automatic/manual conversion retries without duplicate/partial ready pages, ordered readable pages, original byte equality, member/rating/notes, no dish image, one persistence/workflow path, inherited enqueue failure semantics, temp cleanup versus retained accepted/failed source, retry/delete behavior. Run task test:api, task gen:client:check and applicable contract/mock parity checks.
Stop: stop on mismatch with approved semantics; no durable queue or failure record schema invented to satisfy a test.

## T05 — Required: ordinary PDF capture and existing recovery UI vertical slice

Requirements: PDF-R01–02/04/08–13; design D1–D3/D5/D8. Depends: T03/T04 approved seam. Depends on finalized T03 OQ-02 schemas before mocks/code.
Allowed effects when selected: capture/page.tsx, MinimalCapture/useCapture integration without photo redesign, small PDF confirmation/helper, locale resources, existing Settings failed-capture consumer only where needed, unit/E2E/mock changes.
Test seam:
- Units: new PdfCaptureConfirmation.test.tsx/PDF helper tests; existing FailedCapturesSection.test.tsx for Settings behavior. Test metadata, Save lock/error and reset; no draft persistence/cancellation/photo selection.
- Playwright: pwa/e2e/capture-flow.spec.ts (enabled picker/disabled regression, PDF versus .txt dispatch, rating/notes, accepted ID/Home, interruption/navigation/unlock/member reset); settings.spec.ts (failed PDF Retry/Delete); recipe-original-viewer.spec.ts (ordered readable page endpoints).
- Mock owner pwa/e2e/mock-api.ts; POST /api/recipes/capture-pdf schema/envelope from T03, recovery routes/envelopes listed in T03. Mock owner also preserves photo/link/description/bundle/GOTO fixtures.
Checks: reachable Save while notes keyboard open, familiar rating semantics, localized errors/progress, action positions unchanged, GOTO excludes PDFs, no auto-save and no cooked-dish choice, member attribution after switch, existing session feedback/duplicate controls preserved. Run task test:unit, focused task test:e2e scenarios, task typecheck and task lint:pwa.
Stop: no new Other ways/discard dialog/notification filtering/recovery UI; do not copy backend unapproved semantics into mocks.

## T06 — Required: Android share handoff and deployment manifest slice

Requirements: PDF-R01/03/09/13/14; design D2/D6. Depends: T01, T03/T05; establish/record OQ-03 staging cleanup/transient bounds here before dependent worker code; OQ-04 single /manifest.json strategy is already approved.
Allowed effects when selected: exact share-target handler in pwa/public/sw.js, single deployment-selected /manifest.json serving/linkage and handoff integration, focused worker/receiver tests and schema-compliant mocks.
Test seam:
- Units: new share-target handler/staging tests naming one pending shared PDF/new-share replacement, count/bytes/orphan cleanup and token ownership; no worker API upload.
- Playwright pwa/e2e/capture-flow.spec.ts: cold/warm simulated POST /share-target multipart PDF → confirmation; text-only POST → existing link review; disabled message/destinations; unlock/member switch discards share; staging failure requires restart. Preserve GET /capture and API/SSE bypass.
- Mock owner pwa/e2e/mock-api.ts, PDF API accepted-ID/failure envelopes from T03. Same-origin POST /share-target has local 303 /capture?share=<token> handoff, not an API acceptance response.
Checks: no origin-app restriction/auto-save/rendering, validated staging, no content/identity in URL/logs, stale manifests gated at runtime, old cleanup cannot erase newer share; new share replaces only the unsaved selection, never accepted jobs. Run PWA units/E2E/typecheck/lint and production PWA build. Actual Android OS qualification remains T08.
Stop: no native iOS extension, unlock share recovery or second conflicting manifest.

## T07 — Required: user guide, process documentation and Synology template/env

Requirements: PDF-R03/05/07–10/12–15; design D7. Depends: agreed T03 failure semantics, T05/T06 flow and the approved OQ-04 single manifest strategy.
Allowed effects when selected: docs/user-guide.md, PDF user/data-flow docs under docs/flows and directly affected links; release-template/synology/compose.yaml, .env.example and README.md; approved renderer packaging documentation. Do not edit deployed secrets or publish/deploy.
Outcome: document actual supported process and existing Settings Retry/Delete; add default-off WFS_FEATURE_PREVIEW_PDF_RECIPE_IMPORT off/opt-in/on to both API and PWA service environments, selected by the same .env value, with consistent /manifest.json selection. Document installing/refreshing share registration without adding capture onboarding nags.
Test seam (configuration/flow check): validate rendered Synology compose using synthetic env in off/opt-in/on; chosen PWA manifest target matches mode and API flag config. Reuse T06 POST /share-target and T05 capture scenarios, with mock owner pwa/e2e/mock-api.ts and T03 envelope; do not invent a new deployment API.
Checks: user docs omit internal API/renderer details; flow doc includes source/page storage, failed-job ownership/retry/delete, resets and normal workflow; no PDF download promise. Env example has no live secrets; actual .env change is a deployment step not performed here. Validate documentation links, compose/template syntax and production build config; revalidate stale existing photo-flow details within directly affected docs.
Stop: docs/template changes are not runtime deployment authorization; no new source workflow or flag framework.

## T08 — Required: household/device/lifecycle regression and release evidence

Requirements: PDF-R01–15; design D8. Depends: selected implementation tasks T04–T07 completed; renderer OQ-03 qualified.
Allowed effects when selected: evidence and scoped defect corrections only within separately selected authorization; rollout/deploy requires its own authorization.
Checks: API/PWA unit tests; focused capture/share/settings/original-viewer/GOTO/household E2E; typecheck/lint; contract/client/mock parity; production PWA build. Real backup/restore/soft delete/purge and accepted/failed source cleanup. Completed recipe browse/cook by member with preview off; import changes no votes/plans/groceries/GOTO. Accepted workflow retries continue when PDF acquisition flag turns off; PDF conversion retries use existing workflow behavior and retained PDF source.
Actual installed Android: OS PDF target registration, multiple compatible originating apps, cold/warm/open/closed launches, flag-disabled/stale manifest, unlocked direct share and locked/unlock reset requiring re-share, reachable rating/notes/Save. iOS picker. Record device/browser versions and qualify actual Synology renderer architecture.
Run appropriate named checks: task test:api; task test:unit; task test:e2e -- <focused files>; task typecheck; task lint:pwa; task gen:client:check; production npm run build in pwa; task spec:check. Docker/template and fixture commands are selected with the runtime qualification packet, not fabricated passing results.
Stop: classify passed/failed/blocked/not-run evidence, preserve original limitations, no graduation/support claim from synthetic navigation alone. Rollout proposal off → opt-in → on only after qualification.

## Traceability and evidence status

| Requirements | Primary tasks / checks |
| --- | --- |
| PDF-R01 | T01/T03/T04/T05/T06/T07/T08: effective flag/auth no effects, settings modes and manifest |
| PDF-R02/04 | T01/T04/T05/T08: familiar layout, PDF-only input, metadata and no dish selection |
| PDF-R03 | T01/T06/T07/T08: worker/manifest and real Android/iOS device evidence |
| PDF-R05/06/14 | T01/T02/T03/T04/T06/T08: renderer, input/resource/contract/staging limits |
| PDF-R07 | T01/T02/T04/T07/T08: source equality, ordered original view and lifecycle |
| PDF-R08/09/11 | T01/T04/T05/T06/T08: accepted/Home, restart/reset, session feedback/local lock |
| PDF-R10 | T01/T03/T04/T05/T07/T08: separate conversion processor, Settings routes, source retry/delete |
| PDF-R12/13 | T01/T04/T05/T06/T08: household/GOTO invariants and disabled-share next steps |
| PDF-R15 | T07/T08: guide/flows, Synology env/template/build checks |

Specification-only validation is recorded in review.md. Original consolidation checks were specification-only. Actual runtime/API/browser/container classifications now live in implementation-evidence.md; device/NAS absence is blocked evidence. Current review risks/gates do not authorize implementing tasks by themselves. Once the complete package is explicitly selected, continue through the required dependency order without asking to start each task.

## Kickoff execution scope

A complete-package implementation instruction selects all required T01–T08, including early reconnaissance/renderer qualification/schema work, application/tests/workflow/storage integration, Android sharing/manifest, user/process documentation and Synology template/env example. Update task progress and the spec as technical follow-ups are resolved. Preserve approved behavior; do not reopen accepted tradeoffs. Tests precede implementation, and finalized OpenAPI precedes dependent client/mock/runtime work. Routine schema/resource details may be resolved directly; behavior/scope changes need one-at-a-time user approval. Deployment, live .env/secret changes and rollout remain outside implementation authorization unless separately requested. Real-device/Synology qualification must be completed or explicitly blocked before release; never fabricate results.
