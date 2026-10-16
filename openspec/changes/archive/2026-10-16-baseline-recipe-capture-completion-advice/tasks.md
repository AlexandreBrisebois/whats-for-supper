# Tasks

Documentation extraction only; no runtime qualification. Behavior TDD, API/client generation and application implementation checks are not-applicable.

## 1. Completion extraction

- [x] 1.1 Trace finalization, session handoff, name lookup and discard through existing owners; verify every scenario has BSL-recipe-capture-022 evidence and mock limits.
- [x] 1.2 Generate complete readiness modifications and new inline advice/discard requirements; verify preservation of original scenario names and no physical purge, guaranteed delivery or planner-assignment claim.

## 2. Draft validation

- [x] 2.1 Review normative assertions and run `openspec validate baseline-recipe-capture-completion-advice --strict --no-interactive`; record the actual result in the capability plan.
- [x] 2.2 Validate all OpenSpec items, review scope preservation and run `task verify -- <all task-owned changed/new paths>`; report actual outcomes separately from runtime evidence.

## Workflow follow-up

- Accepted and promoted to main recipe-capture under RC-P1, user “promote”, 2026-10-16; see BSL-recipe-capture-025 in the capability plan. Main now 41 requirements / 110 scenarios.
- This change remains active. No archival, application implementation or runtime qualification performed; extraction checkboxes retain their documentation-only meaning.
