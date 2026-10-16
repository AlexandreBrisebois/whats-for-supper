# Tasks

Documentation-only extraction under A45 in the [durable plan](../../../../docs/openspec-baseline-plan.md). No application implementation tasks. BSL-024/025 maps four requirements/eight scenarios; U27/U28 treatment is settled as non-normative. Behavior TDD, API/client generation and application tests are not applicable to these documentation edits; runtime browser/API/database qualification remains not-run under A34.

## 1. Extract and reconcile the baseline

- [x] 1.1 Recheck all 31 BSL-024 inputs and reconcile ProfilePage/ProfileDropdown → useFamily/familyStore → cookie/completion/router with existing listing, API identity, gates, recovery and selected-name owners. Verify unchanged inputs, actual assertions/substitutions and the A45 boundary; retain U27/U28 without behavior repairs.
- [x] 1.2 Create proposal, four ADDED requirements/eight scenarios and extraction design. Verify each scenario against BSL-025 source/assertion mapping, including loading, mouse-outside/toggle dismissal, different/current member selection and Continue-as; retain BSL-015's exact historical sentence/caveat and leave main unchanged.

## 2. Validate the documentation draft

- [x] 2.1 Run `openspec validate baseline-household-identity-profile-switching --strict --no-interactive`; verify four ADDED requirements/eight scenarios, descriptions within installed limits, all required planning artifacts and no MODIFIED/REMOVED sections. Record mapping, settled limitations and draft status in the plan without implying acceptance or promotion.
- [x] 2.2 Review metadata/proposal/delta/design/tasks and plan as the complete six-path scope. Run `task verify --` with exactly those paths; require passing documentation/content checks and preserved source, main, rename/removal changes, index and unrelated edits/deletions. Report exact outcomes/content identity; documentation validation does not qualify runtime switching.

## Workflow follow-up

- Main-spec promotion completed under A46 (user “promote it”, 2026-10-15): four requirements/eight scenarios appended verbatim; main now 36/92. Direct promotion authority, no separate acceptance statement or runtime qualification inferred. Switching, rename and removal remain active; archival requires separate authorization.
- Keep implementation/database qualification deferred under A34. Completing extraction tasks does not qualify switching behavior or settle historical member-creation lifecycle evidence.
- Recipe-library visibility remains queued until household-identity requirements are completed or explicitly deferred; no successor extraction is authorized here.
