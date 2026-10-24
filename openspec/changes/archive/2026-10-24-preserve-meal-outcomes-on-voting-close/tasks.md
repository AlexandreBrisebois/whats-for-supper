# Tasks

## 1. Preserve completed outcomes on close

**Outcome and scenarios:** New round after meals were cooked; existing receipt replay/history protections.
**Owners and boundaries:** ScheduleService lock loop, POST /api/schedule/lock description, existing stateful browser lock handler. #248 has released shared files. User clarified deletion frees a slot; all stored Cooked/Skipped outcomes are preserved without migration.
**Acceptance boundary:** Service regressions followed by actual PostgreSQL/API reads and two-client browser convergence.

- [x] 1.1 Add and observe RED for reopened closure preserving past Cooked, future Planned, recipe-free and recipe-backed Skipped, removal/no resurrection, last-cooked/history and old-close replay with newer votes using `task test:api -- --filter FullyQualifiedName~ReopenedClose`.
- [x] 1.2 Correct only the lock status predicate, synchronize lock description and method-sensitive mock, and pass the regression plus ScheduleService and voting suites.
- [x] 1.3 Pass PostgreSQL/API authoritative rereads and browser participating-client convergence for reopened close; keep service/publisher mocks separate from runtime evidence.

## 2. Correct a removed cooked meal

**Outcome and scenarios:** Correct a cooked meal with earlier history; remove only cooked occurrence; ordinary planned removal.
**Owners and boundaries:** Existing date-delete and existing last-cooked recalculation helper, DELETE /api/schedule/day/{date}/remove description and stateful mock. No endpoint or schema additions.
**Acceptance boundary:** Test latest/only/nonlatest cooked occurrence and failure after persistence; real PostgreSQL delete/reread/replacement completion.

- [x] 2.1 Observe RED for last-cooked restoration/null and ordinary-removal preservation using `task test:api -- --filter FullyQualifiedName~RemoveCooked`.
- [x] 2.2 Reuse existing save/recalculate helper for Cooked removal only, update contract/mock behavior, and pass focused service plus real PostgreSQL/API correction checks.

## 3. Final integration and verification

- [x] 3.1 Record settled Skip/Remove clarification, synchronize affected artifacts, regenerate/check client centrally, prepare and review the full owned diff, then run `task verify -- <complete reviewed paths>` and reconcile all acceptance evidence before completion.

## Focused evidence

- Settled user policy: past Cooked records remain; Skip/Remove frees the slot through existing deletion; closing cannot resurrect removed recipes or legacy Skipped meals. All Skipped representations remain unchanged; no historical migration.
- Contract lock/removal descriptions updated before service implementation. Existing stateful mock already locks only Planned recipe rows and deletes requested dates, preserving Cooked/Skipped and no resurrection; no new mock state or API fields were needed.
- RED: `task test:api -- --filter 'FullyQualifiedName~ScheduleServiceTests.ReopenedClose|FullyQualifiedName~ScheduleServiceTests.RemoveCooked'`: 5 intended failures, 2 preservation passes. Failures established Cooked and recipe-backed Skipped becoming Locked and latest/only Cooked deletion retaining stale last-cooked values (also after publication failure).
- GREEN: isolated PostgreSQL configured, `task test:api -- --filter '(FullyQualifiedName~ScheduleServiceTests|FullyQualifiedName~MealOutcomePostgresTests|FullyQualifiedName~VotingSession)&FullyQualifiedName!~LiveBrowser_'`: 151 passed, no failures/skips. Includes actual API close replay/newer votes, household history, Cooked/Skipped preservation, deleted slot remaining empty, latest/only history correction and replacement assignment/completion.
- An initial PostgreSQL test expected a newly completed historical replacement to use calendar midnight. Current ValidateDay completion deliberately records the clock instant; test corrected to preserve that existing behavior. Only removal's existing recalculation helper derives remaining calendar-date midnight values.
- Mocked browser handler acceptance: `task test:e2e -- meal-outcome-close.spec.ts --project=chromium`: 1 passed. Covers recorded statuses, deletion/no resurrection after another close and replacement completion.
- Actual two-viewer browser qualification is recorded below; combined verification passed as recorded below.

- Coordinator live acceptance: `WFS_CALENDAR_LIVE=1 task test:api -- --filter FullyQualifiedName~PlanLaterPostgresTests.LiveBrowser_` with privately injected isolated PostgreSQL connection. Chromium passed 1 scenario in 13.3s through real API/PostgreSQL/SSE and two household members. It verified missed true/empty grocery maps on native reconnect, Plan later source/destination meals and groceries, past Cooked preservation and removed future slot staying empty after a genuinely new close. Initiating SSE echo suppression is preserved; receiver snapshot and both visible calendars were checked. The fixture retained its isolated API lease through final endpoint parity and was then released. Initial fixture-only locator/echo assertions were corrected; no application changes were made to satisfy those probes.

## Completion evidence

- Combined `task verify -- <all 76 reviewed changed paths>` passed every applicable check; no paths excluded. Record: `.task/agent-finish/runs/be34c4f071e549d98e08070b6828f9f9.json`. Frontend: 936 tests; browser impact: 297 passed/16 skipped; API: 1186 passed/121 skipped in the general run; dedicated Linux/PostgreSQL: 137 passed/zero skipped. Selected live household acceptance passed separately; unrelated opt-in suites are not implied qualified. Lint, formatting, types, strict specs, generated-client/contracts, actual endpoint parity and content identity passed. No commit, push, deployment, issue closure or archival.
- Application and test inputs are unchanged after that run; final checkbox/evidence documentation updates are validated separately with scoped `task verify`. Provider execution and physical-device qualification remain outside the selected checks.
