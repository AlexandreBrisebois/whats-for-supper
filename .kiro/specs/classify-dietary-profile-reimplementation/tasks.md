# Tasks: ClassifyDietaryProfile Reimplementation

## Phase 0 — Decision Lock
- [ ] Task 0.1: Decide coexistence model between `ClassifyDietaryProfileProcessor` and `HealthComputationService` (single writer vs dual-path with precedence).
- [ ] Task 0.2: Decide manual reclassification path (dedicated `classify-recipe` workflow vs event-driven trigger).
- [ ] Task 0.3: Document accepted rollback switch strategy.

## Phase 1 — Test-First Coverage
- [ ] Task 1.1: Add/restore processor unit test suite for payload parsing, idempotence, validation, and error paths.
- [ ] Task 1.2: Add integration test verifying workflow processor registration resolves `ClassifyDietaryProfile` in non-demo runtime.
- [ ] Task 1.3: Add integration/static test verifying active workflow YAML does not reference unregistered processors.
- [ ] Task 1.4: Add E2E coverage for import/synthesis workflows reaching `RecipeReady` with classification in-chain.

## Phase 2 — Implementation
- [ ] Task 2.1: Reintroduce `ClassifyDietaryProfileProcessor` implementation.
- [ ] Task 2.2: Register `ClassifyDietaryProfileProcessor` in non-demo DI.
- [ ] Task 2.3: Restore workflow steps and `depends_on` links in:
  - `recipe-import`
  - `url-import`
  - `goto-synthesis`
- [ ] Task 2.4: Implement selected manual reclassification path.

## Phase 3 — Validation & Release Safety
- [ ] Task 3.1: Run `task agent:test:impact` and fix regressions.
- [ ] Task 3.2: Run `task review` and fix regressions.
- [ ] Task 3.3: Execute rollback drill in dev/test environment.
- [ ] Task 3.4: Update HANDOVER/JOURNAL with decisions and verification evidence.

## Notes / Decisions
- 2026-05-25: Created as a future execution plan after workflow cleanup.
