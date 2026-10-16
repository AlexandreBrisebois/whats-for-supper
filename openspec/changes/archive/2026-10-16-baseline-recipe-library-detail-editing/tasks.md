# Tasks

These are documentation-extraction tasks under A52, not application implementation or acceptance. A10 source evidence is distinct from runtime evidence; A34 qualification remains deferred.

## 1. Reconcile the bounded source and assertion evidence

- [x] 1.1 Trace loaded library detail through Edit/drafts, adapter/generated PATCH, contract, controller/service, persistence, side effects and visible completion; verify BSL-recipe-library-008 records field representations, Cancel, pending and failure boundaries and rechecks the prior 44 input digests.
- [x] 1.2 Inspect actual assertions and substitutions in RecipeDetailSheet tests, recipes browser/adapter tests, RecipeServiceTests and TestWebApplicationFactory; verify BSL-recipe-library-009 and U35–U37 distinguish asserted, source-only and unqualified database behavior. No application tests added or executed.

## 2. Extract and validate the documentation slice

- [x] 2.1 Deliver proposal, nine-ADDED-requirement/17-scenario recipe-library delta and extraction design; verify BSL-recipe-library-010 maps every scenario and each owning requirement to source/assertion evidence without duplicating main or shared owners. Preserve the BSL-015 exact historical sentence/caveat and prior evidence/uncertainties.
- [x] 2.2 Run `openspec validate baseline-recipe-library-detail-editing --strict`, final `openspec validate --all --strict`, six-path `task verify -- <plan and all five change files>`, bounded content/mapping and before-image/index preservation checks. Record exact outcomes in the final response/harness; preserve main specs, all pre-existing changes and deleted navigation spec. Review only; no runtime implication.

Behavior TDD, application unit/API/Playwright suites, client generation, live endpoint parity and database qualification are not applicable to these documentation changes; runtime behavior is not-run under A34. The inspected PATCH operation, OpenAPI/generated client, real server and mock discrepancies are evidence, with no synchronization or implementation tasks authorized.

## Workflow follow-up

- A53, 2026-10-15: user “promote it” authorized promotion. The exact nine requirements/17 scenarios are appended to main recipe-library (25/48), preserving its Purpose and prior content; see BSL-recipe-library-011. All six changes remain active.
- Archival and successor extraction require separate authorization; runtime/database qualification remains deferred A34.
