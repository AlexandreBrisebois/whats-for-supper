# Tasks

## 1. Home recovery extraction

- [x] 1.1 Trace empty Order In and planned recovery through UI, generated SDK, approved contract, API/service, persistence and visible outcome; verify BSL-tonight-meal-decisions-009/011/012 retain actual assertions and substitution limits.
- [x] 1.2 Draft each mapped recovery requirement/scenario and compare it with accepted Planner/mutation requirements; verify caller-specific request order, navigation, cancellation and TM-U01/TM-U02/TM-U07–TM-U09 limitations are coherent without application tasks.

## 2. Documentation integration verification

- [x] 2.1 Run `openspec validate baseline-tonight-meal-decisions-changed-plan-recovery --strict --no-interactive`; record the result after checking all normative claims against source and inspected assertions.
- [x] 2.2 Reconcile the complete coverage map and cross-slice ownership, then run `task verify -- <complete task-owned path set>`; inspect the verification record and preserve unrelated dirty inputs.

## Workflow follow-up

- Accepted and promoted as documentation under TM-P01 (2026-10-16), user “promote”: this reviewed delta is included in main `tonight-meal-decisions` 27/57. BSL-tonight-meal-decisions-001–012, TM-U01–TM-U10 and A34 remain in the capability plan. The change remains active; archival, application changes and runtime qualification require later authorization.
- Application TDD/new tests and client generation are not-applicable. Existing test execution and runtime/API/browser/database/model qualification are not-run under A34.

Documentation acceptance evidence: individual strict validation and the 17-path
scoped verification passed; immutable run record and final rerun are reported in
`docs/openspec-baseline/tonight-meal-decisions.md` and the session handoff.
These checkboxes complete extraction/checking only, not human or runtime acceptance.
