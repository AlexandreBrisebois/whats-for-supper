# Tasks

## 1. Refresh both weeks after Plan later

**Outcome and scenarios:** Distinguish movement follow-ups, Request Plan later, Attempt incremental schedule publication; include successful two-week refresh and committed incomplete follow-ups.
**Owners and boundaries:** ScheduleService cross-week branch, POST /api/schedule/move existing result, Planner, method-sensitive move mock, focused service/component tests and PostgreSQL subscribers.
**Dependencies and prerequisites:** #249 integrated; existing MoveScheduleResultDto reused; coordinator owns generated client and browser fixture. API build interval coordinated with capture worker.
**Acceptance boundary:** Service tests use real recomputation and mocked publisher; PostgreSQL test uses real API/database/publisher and two response subscribers. Browser delivery/reconnect qualification remains a separate coordinator check.

- [x] 1.1 Update move contract descriptions, add focused service regressions for both grocery snapshots, source/destination publication failures, recomputation failure and no-op preservation; observe intended RED with `task test:api -- --filter FullyQualifiedName~PlanLater`.
- [x] 1.2 Reuse postcommit per-week follow-ups and existing movement result; observe focused service GREEN and affected ScheduleService tests.
- [x] 1.3 Add Planner incomplete-refresh regression before handling the result and update stateful POST move mock; observe RED/GREEN with `task test:unit -- 'src/app/(app)/planner/page.test.tsx'` and affected browser acceptance.
- [x] 1.4 Run `task test:database -- --filter FullyQualifiedName~PlanLaterPostgresTests` against real PostgreSQL; verify API result, authoritative rereads and both actual serialized subscriber snapshots.
- [x] 1.5 Coordinator runs actual two-viewer browser source/destination and reconnect qualification, including grocery check-state, before claiming browser acceptance.

## 2. Final Integration and Verification

- [x] 2.1 Coordinator regenerates/checks client, prepares reviewed paths, validates this change, and runs combined final task verify with full owned path set; retain unresolved acceptance.

## Focused evidence

- Contract description updated before service tests/implementation; existing result schema is reused. Parent owns final generation/check.
- Service RED: `task test:api -- --filter FullyQualifiedName~PlanLater`: 3 intended failures, 1 passed (success returned null; source publication failure threw after movement). First incremental build initially discovered no new tests; touching the owned test source forced recompile, after which the intended behavioral failures were observed.
- Service GREEN: `task test:api -- --filter FullyQualifiedName~ScheduleServiceTests`: 116 passed, zero failures/skips before the additional real recompute-failure regression.
- Planner RED: `task test:unit -- 'src/app/(app)/planner/page.test.tsx'`: 1 intended missing-warning failure, 35 passed after correcting missing referenceRequest test mock. GREEN: 36 passed.
- Real PostgreSQL/API + both serialized in-process SSE subscriber responses and authoritative GETs: `task test:api -- --filter 'FullyQualifiedName~PlanLaterPostgresTests&FullyQualifiedName!~LiveBrowser_|FullyQualifiedName~ScheduleServiceTests.PlanLater'` with configured isolated PostgreSQL: 6 passed, zero failures/skips. Includes source/destination publication failure, actual recompute failure after commit, no-op preservation and both persisted grocery lists.
- Stateful mock handler browser acceptance: `task test:e2e -- plan-later.spec.ts --project=chromium`: 1 passed. Two earlier fixture-only failures were corrected: observer now ignores voting events and checks the final move source/destination snapshot pair after asynchronous assignment follow-ups.
- Actual-browser acceptance is recorded below; combined verification passed as recorded below.

- Coordinator live acceptance: `WFS_CALENDAR_LIVE=1 task test:api -- --filter FullyQualifiedName~PlanLaterPostgresTests.LiveBrowser_` with privately injected isolated PostgreSQL connection. Chromium passed 1 scenario in 13.3s through real API/PostgreSQL/SSE and two household members. It verified missed true/empty grocery maps on native reconnect, Plan later source/destination meals and groceries, past Cooked preservation and removed future slot staying empty after a genuinely new close. Initiating SSE echo suppression is preserved; receiver snapshot and both visible calendars were checked. The fixture retained its isolated API lease through final endpoint parity and was then released. Initial fixture-only locator/echo assertions were corrected; no application changes were made to satisfy those probes.

## Completion evidence

- Combined `task verify -- <all 76 reviewed changed paths>` passed every applicable check; no paths excluded. Record: `.task/agent-finish/runs/be34c4f071e549d98e08070b6828f9f9.json`. Frontend: 936 tests; browser impact: 297 passed/16 skipped; API: 1186 passed/121 skipped in the general run; dedicated Linux/PostgreSQL: 137 passed/zero skipped. Selected live household acceptance passed separately; unrelated opt-in suites are not implied qualified. Lint, formatting, types, strict specs, generated-client/contracts, actual endpoint parity and content identity passed. No commit, push, deployment, issue closure or archival.
- Application and test inputs are unchanged after that run; final checkbox/evidence documentation updates are validated separately with scoped `task verify`. Provider execution and physical-device qualification remain outside the selected checks.
