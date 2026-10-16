# Tasks

## 1. Bound and trace the documentation slice

- [x] 1.1 Resolve CLI root/configuration, active-change and capability inventories; verify meal-planning headers and capture Git/index/overlapping-document before-images. Acceptance: A85 inventory and preservation record in the capability plan; no initialization/reconfiguration.
- [x] 1.2 Trace both explicit-target paths through browser/generated request, OpenAPI, API/service/persistence, directly invoked side effects, response and displayed recovery. Acceptance: BSL-meal-planning-007–011 identify symbols, assertions/substitutions, source hashes and U110–U115 without importing adjacent policy or claiming execution.

## 2. Draft and reconcile the selected artifacts

- [x] 2.1 Draft the 15-requirement/30-scenario ADDED delta, proposal and cross-layer design. Acceptance: BSL-meal-planning-012 maps every requirement and exact scenario header to evidence; promoted Purpose/15 requirements/40 scenarios and shared owner rules remain unchanged.
- [x] 2.2 Update the capability checkpoint, authorization, uncertainties, manifest and review boundary; update only the small index's meal-planning summary for the new draft. Acceptance: compare full documents to private before-images and retain all prior records, including U95–U109 and the baseline-plan split.

## 3. Integrate documentation checks and stop

- [x] 3.1 Review the complete seven-path documentation diff, verify source/main/index preservation and run selected/all strict OpenSpec validation plus explicit-path task verify below. Acceptance: actual check outcomes and final content identity recorded by the harness/final handoff; failed, blocked and not-run remain distinct.

Behavior TDD, new tests, API/client regeneration, mock synchronization, schema migration and deployment are not-applicable to these documentation edits. Existing unit/API/browser tests and network/database/model qualification are not-run under A34/current authorization. Inspected browser assertions use fixtures and substituted POST responses, not a real assignment backend; no application checks are required or authorized here.

```sh
openspec validate baseline-meal-planning-empty-day-recipe-assignment --strict --no-interactive
openspec validate --all --strict --no-interactive
task verify -- docs/openspec-baseline-plan.md docs/openspec-baseline/meal-planning.md openspec/changes/baseline-meal-planning-empty-day-recipe-assignment/.openspec.yaml openspec/changes/baseline-meal-planning-empty-day-recipe-assignment/proposal.md openspec/changes/baseline-meal-planning-empty-day-recipe-assignment/design.md openspec/changes/baseline-meal-planning-empty-day-recipe-assignment/specs/meal-planning/spec.md openspec/changes/baseline-meal-planning-empty-day-recipe-assignment/tasks.md
```

## Workflow follow-up

- A85 stopped at the validated draft. A86 user “promote” accepted that draft and synced its exact 15/30 delta into main meal-planning (30/70 total), preserving Purpose/prior requirements and all qualifications. See BSL-meal-planning-013 for evidence and the current four-path verification command.
- The change remains active; no archival, application, runtime qualification or successor extraction is authorized. Checked extraction tasks do not mean behavior was executed. Promotion validation/content identity is reported by the final handoff and current harness record.
