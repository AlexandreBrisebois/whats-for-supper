# Tasks

Documentation-only extraction under A41 in the [durable plan](../../../../docs/openspec-baseline-plan.md). No application implementation tasks. BSL-020–022 maps the two requirements/two scenarios. Behavior TDD, API/client generation and application tests are not applicable to these documentation edits; runtime API/browser/database observations remain not-run under A34. No unresolved question changes the A40 draft boundary.

## 1. Extract and reconcile the baseline

- [x] 1.1 Reconcile DELETE client/contract → controller/service → EF/SQL → subsequent list/current-identity reads against BSL-020/021 and recheck the 35-path evidence manifest. Verify unchanged source, no connected deletion UI, actual InMemory/auth substitutions and U25/U26 limits; preserve the agreed API-success/list-only boundary.
- [x] 1.2 Create proposal, two ADDED requirements/two scenarios and extraction design. Verify each scenario against BSL-022, existing shared-access ownership and source assertions; retain the exact BSL-015 historical sentence non-normatively. Confirm no UI deletion, FK-safety, undocumented error or browser-cleanup promise, no main-spec change and no application work.

## 2. Validate the documentation draft

- [x] 2.1 Run `openspec validate baseline-household-identity-member-removal --strict --no-interactive`; verify two ADDED requirements/two scenarios, descriptions within installed limits, no MODIFIED/REMOVED sections and all four planning artifacts present. Record the draft status and scenario mapping in the plan without implying acceptance, promotion or archival.
- [x] 2.2 Review metadata/proposal/spec/design/tasks and plan as the complete six-path scope. Run `task verify --` with exactly those six paths; require passing documentation/content checks and unchanged source, main spec, rename change, unrelated edits/index/deletions. Report exact results/content identity; documentation checks do not qualify removal behavior.

## Workflow follow-up

- Main-spec promotion completed under A43 (user “promote”, 2026-10-15), following BSL-023 review: both requirements/two scenarios appended unchanged; main now 32/84. No separate acceptance statement or runtime qualification is inferred. Removal remains active; archival requires separate authorization.
- Keep member-renaming active. Profile switching remains the next identity slice after removal; recipe-library stays queued until identity requirements are complete or explicitly deferred.
- Implementation/database qualification stays deferred under A34; completing extraction tasks does not accept earlier implementation/archive claims or qualify runtime removal.
