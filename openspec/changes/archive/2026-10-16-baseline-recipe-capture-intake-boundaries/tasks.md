# Tasks

Documentation extraction only. Checked extraction tasks do not imply human acceptance, promotion or runtime qualification. Behavior TDD, client generation and application tests are not-applicable to these edits.

## 1. Intake extraction and reconciliation

- [x] 1.1 Reconcile the promoted blocks with current source and inspected assertions; verify BSL-recipe-capture-021 maps every modified/added requirement and all scenarios, including dispatch failure and optional metadata.
- [x] 1.2 Generate complete MODIFIED blocks and the photo-intake validation addition; verify existing scenario names are retained and no exact description success status is introduced.

## 2. Draft validation

- [x] 2.1 Review normative assertions and run `openspec validate baseline-recipe-capture-intake-boundaries --strict --no-interactive`; record the actual result in the capability plan.
- [x] 2.2 Run `openspec validate --all --strict --no-interactive`, review preservation and run `task verify -- <all task-owned changed/new paths>`; report check results separately from behavioral evidence.

## Workflow follow-up

- Accepted and promoted to main recipe-capture under RC-P1, user “promote”, 2026-10-16; see BSL-recipe-capture-025 in the capability plan. Main now 41 requirements / 110 scenarios.
- This change remains active. No archival, application implementation or runtime qualification performed; extraction checkboxes retain their documentation-only meaning.
