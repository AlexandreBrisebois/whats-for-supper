# Tasks

Documentation extraction only under A83. Checked tasks record source inspection and delivered documentation, not implemented fixes or passing behavior tests. Requirement numbers follow BSL-meal-planning-005 in the durable plan; every scenario is mapped there.

## 1. Establish entry and schedule evidence

- [x] 1.1 Resolve OpenSpec root, active changes and absent meal-planning capability with CLI; count actual main requirement/scenario headers and preserve the worktree/index and plan before-image. Acceptance: seven counts match A82, twenty prior changes remain, 239 prior source identities reconcile unchanged.
- [x] 1.2 Trace app layout/initializer, planner URL/navigation and generated GET through OpenAPI, access/result filters, controller, EF projection and returned DTOs. Acceptance: BSL-meal-planning-001/002 and U104/U105 map requirements 1–7 with actual assertions separated from implementation support.

## 2. Extract read-state and reconciliation boundaries

- [x] 2.1 Trace init/suggestion awaits, callable sync, all observed read triggers, loading/failure/rendered states and live-snapshot interaction; inspect page/store/API/browser assertions and fixture substitutions. Acceptance: BSL-meal-planning-003/004, U102/U103/U106–U109 and retained U95–U101 map requirements 8–15 without ordering/recovery guarantees.
- [x] 2.2 Draft proposal, design, meal-planning ADDED delta and durable-plan mapping/source identities. Acceptance: 15 requirements/40 scenarios map completely in BSL-meal-planning-005; seven promoted owners and all historical qualifications preserved. Implementation TDD, new tests, API/client generation and migrations are not-applicable.

## 3. Validate integrated documentation and stop

- [x] 3.1 Run selected `openspec validate baseline-meal-planning-week-reading-navigation --strict --no-interactive` and `openspec validate --all --strict --no-interactive`; review the complete six-path documentation diff, mappings, source identities and plan/index preservation. Acceptance: strict validation and preservation pass; discrepancies stay recorded.
- [x] 3.2 Run the explicit six-path `task verify` below after documentation updates. Acceptance: applicable documentation/spec/content checks pass and final outcomes are classified passed/failed/blocked/not-run/not-applicable; stop at draft human review with no promotion/archive/apply/successor.

```sh
task verify -- docs/openspec-baseline-plan.md openspec/changes/baseline-meal-planning-week-reading-navigation/.openspec.yaml openspec/changes/baseline-meal-planning-week-reading-navigation/proposal.md openspec/changes/baseline-meal-planning-week-reading-navigation/design.md openspec/changes/baseline-meal-planning-week-reading-navigation/specs/meal-planning/spec.md openspec/changes/baseline-meal-planning-week-reading-navigation/tasks.md
```

Inspected, not executed: `pwa/src/app/(app)/planner/page.test.tsx` (mocked stores/router/API/children), `pwa/src/store/weekStore.test.ts` (real stores, mocked API and shortened schedules), `ScheduleIntegrationTests.cs` / `ScheduleServiceTests.cs` (default auth-disabled EF InMemory factory, substitutions), `pwa/e2e/planner.spec.ts`, `planner-smart-defaults-week-offset.spec.ts` and relevant non-cooking readback assertions. Browser fixture/mock owners are `pwa/e2e/fixtures.ts`, `pwa/e2e/mock-api.ts` and local spec overrides. Contract seam: GET `/api/schedule?weekOffset`, 200 `data: ScheduleDays` with seven `ScheduleDayDto` entries and available `ScheduleRecipeDto`/nonCooking, plus conditional GET `/api/schedule/{weekOffset}/smart-defaults` only for read composition. These names identify inspected evidence, not a plan to change or execute those files.

Runtime/unit/API/browser/network/database/model checks remain not-run by authorization under A34. Test-first behavior changes, API synchronization/generated-client checks, deployment and migrations are not-applicable to this documentation-only edit. Exact final verification and content identity belong to the final response/current `.task/agent-finish/last-run.json`.

Verification record: selected strict and all-item strict passed (28/28); complete six-path documentation review, exact 15/40 mapping, 239 prior source hashes, prior plan/index/work preservation and the first explicit-path task verify passed. This task-record update changes content identity; final repeat outcomes and final identity belong to the response/current harness. No runtime qualification is claimed.

## Workflow follow-up

- Human review is next. Draft validation is not baseline acceptance or runtime qualification. Promotion, archival, implementation and another slice require separately selected work.

## Promotion follow-up — A84, 2026-10-16

The user subsequently instructed “promote”. The exact reviewed Purpose and 15 requirements/40 scenarios now form main meal-planning (BSL-meal-planning-006). The A83 stopping boundary above is historical; A84 authorizes this documentation promotion only. Delta/proposal/design/metadata, seven prior main specs, all 254 source identities and existing index/work/plan history remain unchanged. The source change remains active. Strict main/specs/all, exact equality, preservation and final three-path documentation verification outcomes belong to the response/current harness. Runtime qualification remains not-run under A34; no archive, application implementation or successor extraction.

```sh
task verify -- openspec/specs/meal-planning/spec.md docs/openspec-baseline-plan.md openspec/changes/baseline-meal-planning-week-reading-navigation/tasks.md
```
