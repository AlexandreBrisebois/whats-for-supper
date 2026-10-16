# Tasks

These are documentation extraction tasks, not application implementation approval.

## 1. Shared context extraction

- [x] 1.1 Trace browser/server request preparation, approved contract, binder, report/current-member consumers and persistence; inspect assertions/substitutions and record BSL-household-identity-026 with current evidence identity in the capability plan.
- [x] 1.2 Draft three requirements/eight scenarios and extraction design; verify exact names do not duplicate main/delta requirements and preserve endpoint-specific response ownership and non-normative limits.

## 2. Documentation verification

- [x] 2.1 Run `openspec validate baseline-household-identity-member-context-transport --type change --strict --no-interactive` and strict main identity validation; record actual outcomes without runtime claims.
- [x] 2.2 Review scope/preservation against the before-image and run `task verify -- <all session-changed documentation paths>`; record passed/failed/blocked/not-run/not-applicable separately. Behavior TDD, application tests, client generation and migration are not-applicable; browser/API/database runtime checks are not-run under A34.

## Workflow follow-up

- Human review is required before acceptance or promotion. No lifecycle action is authorized by completed extraction checkboxes.
