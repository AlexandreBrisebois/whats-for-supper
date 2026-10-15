# Tasks

Documentation-only extraction under A48 in the [durable plan](../../../docs/openspec-baseline-plan.md). No application implementation tasks. BSL-recipe-library-001–003 maps nine additions/18 scenarios. U29–U31 are confirmed non-normative. Behavior TDD, application tests and API/client regeneration are not applicable; browser/API/database runtime qualification is not-run under A34.

## 1. Extract and reconcile the baseline

- [x] 1.1 Recheck the 33-input manifest and reconcile Home/library entry → direct generated GET/OpenAPI → controller/service/EF → DTO/store/grid with actual assertions and shared owners. Verify no changed evidence inputs; preserve U29–U31, identity ownership and prior artifacts.
- [x] 1.2 Create proposal, nine ADDED requirements/18 scenarios and extraction design; verify each scenario against the BSL-recipe-library-003 mapping, including eligibility, filter/order/page response, returned list display, append, loading, All empty and initial-load Retry. Retain BSL-015's exact historical sentence/caveat without changing main specs.

## 2. Validate the documentation draft

- [x] 2.1 Run `openspec validate baseline-recipe-library-list-visibility --strict --no-interactive`; verify nine additions/18 scenarios, explicit Purpose, no MODIFIED/REMOVED sections, description limits and required artifacts. Record draft status/mapping in the plan without acceptance or promotion.
- [x] 2.2 Review the six task paths (metadata/proposal/delta/design/tasks/plan); run `task verify --` with those exact paths and require passing documentation/content checks. Verify unchanged source, main identity, three prior active changes, index and unrelated edits/deletions; report exact check outcomes/content identity. Documentation success does not qualify runtime behavior.

## Workflow follow-up

- Main-spec promotion completed under A49 (user “promote”, 2026-10-15): exact Purpose and nine requirements/18 scenarios copied into main recipe-library. Direct promotion authority; no separate acceptance statement or runtime qualification inferred. Library visibility and the three identity changes remain active; archival requires separate authorization. No successor extraction or application behavior authorized.
- Keep implementation/database qualification deferred under A34. Completed extraction tasks do not establish runtime qualification or settle historical member-creation evidence.
