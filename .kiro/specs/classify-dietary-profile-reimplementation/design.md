# Design: ClassifyDietaryProfile Reimplementation

## Summary
This design reintroduces `ClassifyDietaryProfile` as a first-class workflow processor and restores it into selected orchestration paths with explicit ordering guarantees. The design also formalizes compatibility with the current event-driven health architecture to prevent dual-writer drift.

## Current State
- Core workflows currently omit `ClassifyDietaryProfile` to avoid runtime failures from missing processor registration.
- Health metadata is computed asynchronously through `RecipeReady` -> `recipe_changed` -> `HealthWorker` -> `HealthComputationService`.
- Historical drift occurred when workflows referenced `ClassifyDietaryProfile` while non-demo DI did not register it.

## Target Architecture

### 1. Processor Layer
- Reintroduce a concrete `ClassifyDietaryProfileProcessor : IWorkflowProcessor`.
- Register it in non-demo DI alongside existing workflow processors.
- Keep demo bypass behavior optional and non-authoritative.

### 2. Workflow Layer
- `recipe-import`: `... -> categorize_ingredients -> classify_dietary_profile -> recipe_ready`
- `url-import`: `... -> categorize_ingredients -> classify_dietary_profile -> recipe_ready`
- `goto-synthesis`: `... -> categorize_ingredients -> classify_dietary_profile -> recipe_ready`
- Manual reclassification flow:
  - Option A: dedicated `classify-recipe` workflow.
  - Option B: event-triggered reclassification command path.
- Final choice is resolved in implementation planning, but whichever path is chosen must preserve deterministic `depends_on` ordering.

### 3. Data Ownership and Coexistence
- Establish single-writer authority for each persisted dietary/health field.
- If classifier and health worker both run, define precedence and idempotence rules to avoid data churn.
- Keep `RecipeReady` event publication intact unless explicitly replaced by an equivalent trigger mechanism.

### 4. Drift Guards
- Add tests that fail when any active workflow references a processor name not registered in runtime DI.
- Add regression tests for workflow step ordering and `depends_on` correctness.

## Implementation Strategy (Future Phase)
1. Contract and behavior decisions documented/approved (this spec).
2. Tests first:
   - Processor unit tests.
   - Workflow registration and processor resolution integration tests.
   - E2E happy path and failure path for import/synthesis flows.
3. Implement processor and DI registration.
4. Restore workflow YAML steps with ordering updates.
5. Validate with `task agent:test:impact` and `task review`.

## Failure Modes
- Missing DI registration while workflow step exists -> runtime "No processor found" failures.
- Dual-writer conflicts between classifier and health worker.
- Incorrect `depends_on` that allows `recipe_ready` before classification.

## Rollback Strategy
- Keep workflow/YAML restoration and DI registration in a bounded change set.
- If regressions occur, rollback by removing classification step from active workflows and disabling processor registration in one patch.
- Verify rollback by confirming import/synthesis flows still complete and health recomputation continues through event-driven path.

## Notes / Decisions
- 2026-05-25: This design is intentionally preparatory. No implementation changes are made by this spec itself.
