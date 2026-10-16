# Tasks

## 1. Home state extraction

- [x] 1.1 Trace Home initialization, sync, choice and detail hydration through approved schedule/recipe operations and persistence; verify BSL-tonight-meal-decisions-001–004 and 010 record source/test anchors and substitutions in the capability plan.
- [x] 1.2 Draft Home-state requirements and every named scenario; verify exact evidence mapping and reference existing non-cooking editing, Quick Find, cooking and live-update owners without rewriting their requirements.

## 2. Documentation integration verification

- [x] 2.1 Run `openspec validate baseline-tonight-meal-decisions-home-states --strict --no-interactive`; record result and compare all normative assertions with the mapped evidence.
- [x] 2.2 Reconcile all authorized slices and run `task verify -- <complete task-owned path set>`; inspect the verification record and preservation checks in the capability session record.

## Workflow follow-up

- Accepted and promoted as documentation under TM-P01 (2026-10-16), user “promote”: this reviewed delta is included in main `tonight-meal-decisions` 27/57. BSL-tonight-meal-decisions-001–012, TM-U01–TM-U10 and A34 remain in the capability plan. The change remains active; archival, application changes and runtime qualification require later authorization.
- Application TDD and new application tests are not-applicable to documentation extraction. Existing test execution and runtime/API/browser/database/model qualification are not-run under A34.

Documentation acceptance evidence: individual strict validation and the 17-path
scoped verification passed; immutable run record and final rerun are reported in
`docs/openspec-baseline/tonight-meal-decisions.md` and the session handoff.
These checkboxes complete extraction/checking only, not human or runtime acceptance.
