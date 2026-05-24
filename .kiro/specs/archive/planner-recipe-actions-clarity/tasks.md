# Tasks — planner-recipe-actions-clarity

## Overview

This task set implements planner action clarity with deterministic tests first.

- Wave A: test scaffolding and deterministic date controls
- Wave B: row behavior changes (today vs non-today)
- Wave C: pivot copy/i18n updates (EN/FR)
- Wave D: regression and validation

---

## Wave A — Tests First (Deterministic Date)

- [x] 1. Add/adjust planner row component tests with fixed date mocking
  - Target: planner page test file(s) covering day-card action visibility.
  - Mock `getTodayString()` to explicit fixed date (`2026-05-04`).
  - Red assertions:
    - non-today assigned row should show `view-recipe-button`.
    - today assigned row should not show `view-recipe-button`.
    - today assigned row should show `start-cook-mode`.
  - _Requirements: R1, R2, R5_

- [x] 2. Add/adjust pivot tests for explicit recipe-copy in EN/FR
  - Target: `pwa/src/components/planner/PlanningPivotSheet.test.tsx`.
  - Red assertions for title/subtitle/action labels in EN and FR.
  - Assert recipe/recette wording in action labels.
  - _Requirements: R3, R5_

- [x] 3. Add/adjust E2E scenario with fixed date fixtures
  - Target: planner E2E spec file (existing planner spec preferred).
  - Ensure fixed week dates in mocks; no relative date generation.
  - Red assertions with `getByTestId` only for today/non-today behavior.
  - _Requirements: R1, R2, R5_

---

## Wave B — Implement Planner Row Behavior

- [x] 4. Add non-today `View recipe` action with `BookOpen` icon
  - File: `pwa/src/app/(app)/planner/page.tsx` (`PlannerDayCard`).
  - Render `view-recipe-button` only when assigned recipe and not today.
  - Wire to recipe detail entrypoint used by planner flow.
  - _Requirements: R1, R4_

- [x] 5. Keep today row focused on cook mode
  - File: `pwa/src/app/(app)/planner/page.tsx` (`PlannerDayCard`).
  - For today assigned row, render `start-cook-mode`; hide `view-recipe-button`.
  - Preserve `edit-recipe-button` title tap opening pivot.
  - _Requirements: R2_

---

## Wave C — Implement Copy and i18n Updates

- [x] 6. Update pivot copy to explicit recipe-change wording in EN
  - File: `pwa/src/components/planner/PlanningPivotSheet.tsx` and/or locale keys.
  - Title/subtitle/action text must match requirements exactly.
  - _Requirements: R3_

- [x] 7. Update pivot copy to explicit recipe-change wording in FR
  - File: locale resources used by `t(...)`.
  - Ensure EN/FR parity for all updated keys.
  - _Requirements: R3_

- [x] 8. Add/confirm row-action locale label `View recipe` / `Voir la recette`
  - Files: row action UI + locale resources.
  - Ensure no meal/repas wording in planner actions.
  - _Requirements: R3, R4_

---

## Wave D — Validation and Regression Guard

- [x] 9. Run targeted test suite for touched planner components/specs
  - Use repo task harness for impacted tests.
  - _Requirements: R1, R2, R3, R5_

- [x] 10. Run full E2E suite
  - Command: `task test:e2e`.
  - Verify feature behavior and prior failing tests are green.
  - _Requirements: R5_

- [ ] 11. Run final quality gate
  - Command: `task review`.
  - Resolve issues before completion.
  - _Requirements: R1, R2, R3, R4, R5_

---

## Notes / Decisions

- Decision locked: today row must not show `View recipe`; only `Cook mode` as visible secondary action.
- Decision locked: change action remains on recipe title (`edit-recipe-button`) for both today and non-today.
- Decision locked: deterministic date policy is mandatory for this feature’s tests.
