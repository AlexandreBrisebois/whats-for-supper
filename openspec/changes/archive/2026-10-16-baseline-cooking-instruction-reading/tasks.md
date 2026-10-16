# Tasks

Documentation extraction only. Optional design omitted under the installed conditional rule: no architecture, dependency, data model, security, performance or migration change, and no technical decision before coding. No coding is authorized. Human acceptance is separate from these extraction checkboxes.

## 1. Reconcile and extract this slice

- [x] 1.1 Trace this slice and inspect actual assertions/substitutions; evidence delivered as BSL-cooking-004–007 in [the cooking plan](../../../../docs/openspec-baseline/cooking.md).
- [x] 1.2 Draft supported requirements and all scenarios in [the delta](specs/cooking/spec.md); review every assertion against the plan mapping and keep uncertain claims outside normative text.
- [x] 1.3 Reconcile shared owners and predecessor cooking slices; verify unique requirement names, owner references and exclusions in the cooking plan coverage table.

## 2. Validate review artifacts

- [x] 2.1 Run `openspec validate baseline-cooking-instruction-reading --strict --no-interactive`; require success and review source links and whitespace.
- [x] 2.2 Reconcile all four cooking deltas with `openspec validate --all --strict --no-interactive` (69 passed, 0 failed); review unique requirements/scenario mappings, shared-owner names and the preserved-input comparison.

Final repository validation: `task verify -- <all task-owned documentation paths>`; the exact selection and outcomes live in `.task/agent-finish/last-run.json` and the cooking plan session record. This final command is separate from human acceptance.

Behavior TDD, application/API/E2E tests, generated-client checks and runtime/database/device qualification are not applicable to documentation edits or not-run under A34. Do not convert inspected test assertions into executed checks. No acceptance, promotion, archive or implementation task is included.
