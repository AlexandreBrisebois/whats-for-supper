# Tasks

Documentation extraction only. Behavior TDD, application/client/contract changes and runtime/model qualification are not-applicable to these edits.

## 1. Language request extraction

- [x] 1.1 Trace acquisition sources through extraction/synthesis and generated-description requests; verify BSL-recipe-capture-023 maps all four scenarios to current symbols and inspected test limitations.
- [x] 1.2 Generate the request-boundary requirement and review it for unsupported output-language, configuration snapshot or member-preference claims; verify NONE/blank behavior matches source.

## 2. Draft validation

- [x] 2.1 Review normative assertions and run `openspec validate baseline-recipe-capture-processing-language --strict --no-interactive`; record the actual result in the capability plan.
- [x] 2.2 Validate all OpenSpec items, review preservation and run `task verify -- <all task-owned changed/new paths>`; report actual results independently of behavior evidence.

## Workflow follow-up

- Accepted and promoted to main recipe-capture under RC-P1, user “promote”, 2026-10-16; see BSL-recipe-capture-025 in the capability plan. Main now 41 requirements / 110 scenarios.
- This change remains active. No archival, application implementation or runtime qualification performed; extraction checkboxes retain their documentation-only meaning.
