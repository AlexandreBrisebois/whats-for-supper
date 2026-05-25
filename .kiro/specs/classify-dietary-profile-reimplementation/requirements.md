# Feature: ClassifyDietaryProfile Reimplementation

## Intent
Reintroduce `ClassifyDietaryProfile` into core workflows in a controlled, contract-first way after the health extraction cleanup, while preserving reliability and avoiding processor-registration drift.

## Contracts & Routes
- `specs/openapi.yaml` (authoritative contract baseline)
- Existing workflow routes/triggers that enqueue recipe processing:
  - recipe import trigger path (via orchestrated workflow)
  - URL import trigger path (via orchestrated workflow)
  - goto synthesis trigger path (via orchestrated workflow)
- Health event path compatibility:
  - `RecipeReady` -> `recipe_changed` event publication

## Requirements

### Requirement 1: Explicit Processor Reintroduction
1. A concrete `ClassifyDietaryProfile` workflow processor SHALL be reintroduced as an explicit `IWorkflowProcessor` implementation.
2. The processor SHALL be registered in DI in non-demo runtime mode.
3. Runtime startup and worker execution SHALL not depend on demo-mode bypass registration for `ClassifyDietaryProfile`.

### Requirement 2: Workflow Placement and Ordering
1. `recipe-import` SHALL place `classify_dietary_profile` after `categorize_ingredients` and before `recipe_ready`.
2. `url-import` SHALL place `classify_dietary_profile` after `categorize_ingredients` and before `recipe_ready`.
3. `goto-synthesis` SHALL place `classify_dietary_profile` after `categorize_ingredients` and before `recipe_ready`.
4. Any manual/classify workflow used for explicit reclassification SHALL define deterministic ordering and terminal behavior.
5. `recipe_ready.depends_on` SHALL reference the final upstream task so no workflow can mark recipes ready before classification is complete.

### Requirement 3: Coexistence with Event-Driven Health Path
1. The design SHALL explicitly define whether classification output feeds, replaces, or coexists with `HealthWorker` + `HealthComputationService`.
2. If both paths coexist, the design SHALL define source-of-truth precedence for persisted dietary profile fields.
3. Event publication from `RecipeReady` SHALL remain functional unless a replacement trigger path is explicitly specified and validated.

### Requirement 4: Failure Behavior and Drift Prevention
1. Workflows SHALL never enqueue `ClassifyDietaryProfile` unless a matching non-demo runtime processor registration exists.
2. The implementation SHALL include startup/validation checks or tests that detect workflow/processor drift before release.
3. Failure and retry behavior SHALL follow existing workflow worker retry semantics.

### Requirement 5: Test-First and Rollback
1. Tests SHALL be written or updated before implementation logic changes.
2. Minimum test coverage SHALL include:
   - Unit: processor logic and payload handling.
   - Integration: workflow task emission + processor resolution.
   - E2E: recipe flows reach ready state with expected classification effects.
3. A rollback plan SHALL be documented, including feature-flag or workflow toggle strategy and rollback verification steps.

## Risks & Questions
- Whether classification should become the sole writer of dietary profile fields or remain advisory to health-event computation.
- Whether manual reclassification should be a dedicated workflow (`classify-recipe`) or an event-driven trigger path.
- Whether runtime guardrails should fail-fast at startup or only in CI/test gates.

## Notes / Decisions
- 2026-05-25: Spec created as future-facing artifact only. No processor/workflow reimplementation in this phase.
