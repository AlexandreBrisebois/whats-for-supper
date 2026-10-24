# Tasks

## 1. Reconcile eligible snapshot grocery checks

**Outcome and scenarios:** All scenarios under Apply available snapshot adjuncts conditionally.
**Owners and boundaries:** weekStore.applySnapshot, plannerStore check map, useScheduleStream dispatch tests. Existing GET /api/schedule/{weekOffset} and /api/stream wire shapes remain unchanged.
**Dependencies and prerequisites:** Issue #249 selected; generated GET and raw stream representations confirmed from current source. Installed Vitest dependencies.
**Acceptance boundary:** Real hook/store seams with a mocked EventSource; actual household browser reconnect/update is separately required before claiming live qualification.

- [x] 1.1 Add raw checked/unchecked/empty map, reconnect/event, wrong-week, optimistic and generated-map regressions; observe intended RED using `task test:unit -- src/store/weekStore.test.ts src/hooks/useScheduleStream.grocery.test.ts`.
- [x] 1.2 Normalize the existing snapshot check-map extraction and observe GREEN using the same focused command plus `src/hooks/useScheduleStream.test.ts`; preserve existing absent-map, week and move guards.
- [x] 1.3 Qualify an actual household browser reconnect/update against the service; record loaded grocery items and checks. Mocked EventSource coverage alone does not satisfy live qualification.

## 2. Final Integration and Verification

- [x] 2.1 Coordinator reviews all owned diffs, prepares reviewed application paths, validates the OpenSpec change, and runs the combined `task verify -- <complete reviewed paths>`; report exact evidence and outstanding acceptance.

## Focused evidence

- RED: `task test:unit -- src/store/weekStore.test.ts src/hooks/useScheduleStream.grocery.test.ts`: 5 intended failures (raw values, reconnect empty-map clearing, deferred raw-map application), 65 passed; prior Old check remained despite raw wire dictionaries.
- GREEN: `task test:unit -- src/store/weekStore.test.ts src/hooks/useScheduleStream.grocery.test.ts src/hooks/useScheduleStream.test.ts`: 114 passed, 3 files.
- Live browser/service qualification is recorded below. Combined final verification passed as recorded below; no PostgreSQL behavior changes in this decoding slice.

- Coordinator live acceptance: `WFS_CALENDAR_LIVE=1 task test:api -- --filter FullyQualifiedName~PlanLaterPostgresTests.LiveBrowser_` with privately injected isolated PostgreSQL connection. Chromium passed 1 scenario in 13.3s through real API/PostgreSQL/SSE and two household members. It verified missed true/empty grocery maps on native reconnect, Plan later source/destination meals and groceries, past Cooked preservation and removed future slot staying empty after a genuinely new close. Initiating SSE echo suppression is preserved; receiver snapshot and both visible calendars were checked. The fixture retained its isolated API lease through final endpoint parity and was then released. Initial fixture-only locator/echo assertions were corrected; no application changes were made to satisfy those probes.

- Combined preservation run exposed an existing browser-test timing race: three Previous clicks reused offset two before navigation settled. HEAD/current navigation code is identical. Added per-transition URL and loaded-heading waits in `pwa/e2e/grocery.spec.ts`; its original extras projection/history assertions are unchanged. RED: the broad run failed with expected offset -1/actual 1. GREEN: `task test:e2e -- grocery.spec.ts -g "shows editable projections only next week" --project=chromium` passed 1 scenario. No application navigation change.

## Completion evidence

- Combined `task verify -- <all 76 reviewed changed paths>` passed every applicable check; no paths excluded. Record: `.task/agent-finish/runs/be34c4f071e549d98e08070b6828f9f9.json`. Frontend: 936 tests; browser impact: 297 passed/16 skipped; API: 1186 passed/121 skipped in the general run; dedicated Linux/PostgreSQL: 137 passed/zero skipped. Selected live household acceptance passed separately; unrelated opt-in suites are not implied qualified. Lint, formatting, types, strict specs, generated-client/contracts, actual endpoint parity and content identity passed. No commit, push, deployment, issue closure or archival.
- Application and test inputs are unchanged after that run; final checkbox/evidence documentation updates are validated separately with scoped `task verify`. Provider execution and physical-device qualification remain outside the selected checks.
