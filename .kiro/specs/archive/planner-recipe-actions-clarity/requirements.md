# Requirements Document

## Introduction

This spec clarifies planner row actions so families can instantly distinguish:

- how to **view** recipe details,
- how to **change** the planned recipe,
- and (for today) how to **start cooking** without clutter.

The change is UI-only (PWA) and includes copy clarity in English and French.

## Product Decisions

1. Use **Recipe/Recette** consistently in planner action copy. Do not mix with meal/repas in action text.
2. On **non-today** rows with an assigned recipe:
   - show `View recipe` action,
   - tapping recipe title opens `Change recipe` pivot.
3. On **today** row with an assigned recipe:
   - show `Cook mode` action,
   - do **not** show `View recipe`.
4. Today recipe detail access is available through Cook mode flow.
5. Planner pivot copy must explicitly state recipe-change intent in EN/FR.
6. All tests for this feature use fixed dates/clocks; no runtime-relative date assertions.

## Glossary

- **Today row**: Planner day card where `day.date === getTodayString()`.
- **Non-today row**: Any planner day card where `day.date !== getTodayString()`.
- **Change recipe pivot**: `PlanningPivotSheet` opened from recipe title tap.
- **View recipe action**: Explicit row action opening recipe details.
- **Cook mode action**: Existing today-only quick action (`start-cook-mode`).

---

## Requirements

### Requirement 1: Non-Today Assigned Row Actions

**User Story:** As a parent planning ahead, I need distinct controls for viewing recipe details versus changing the planned recipe.

#### Acceptance Criteria

1. WHEN a non-today row has an assigned recipe, THE planner row SHALL render a `View recipe` action with `data-testid="view-recipe-button"`.
2. WHEN the user taps the recipe title area (`data-testid="edit-recipe-button"`) on a non-today assigned row, THE planner SHALL open the change recipe pivot (`data-testid="pivot-sheet"`).
3. WHEN the user taps `View recipe`, THE planner SHALL open recipe details without opening the change recipe pivot.

---

### Requirement 2: Today Assigned Row Action Priority

**User Story:** As a parent cooking tonight, I need a calm row focused on cooking, not extra controls.

#### Acceptance Criteria

1. WHEN today row has an assigned recipe, THE planner row SHALL render `Cook mode` action (`data-testid="start-cook-mode"`).
2. WHEN today row has an assigned recipe, THE planner row SHALL NOT render `View recipe` action (`data-testid="view-recipe-button"`).
3. WHEN the user taps the recipe title area (`data-testid="edit-recipe-button"`) on today row, THE planner SHALL open the change recipe pivot.
4. THE today row SHALL preserve existing drag handle behavior.

---

### Requirement 3: Pivot Copy Clarity and Terminology Consistency

**User Story:** As a bilingual user, I need explicit labels so I immediately understand these options are about changing the recipe.

#### Acceptance Criteria

1. THE planner pivot title in English SHALL be `Change this recipe`.
2. THE planner pivot subtitle in English SHALL be `Choose how to replace or remove this recipe`.
3. THE planner pivot action labels in English SHALL be:
   - `Quick replace`
   - `Search library`
   - `Remove recipe`
4. THE planner pivot title in French SHALL be `Changer cette recette`.
5. THE planner pivot subtitle in French SHALL be `Choisissez comment remplacer ou retirer cette recette`.
6. THE planner pivot action labels in French SHALL be:
   - `Remplacement rapide`
   - `Chercher dans la bibliothèque`
   - `Retirer la recette`
7. Planner action/pivot copy SHALL use recipe/recette terminology only and SHALL NOT mix meal/repas in these action labels.

---

### Requirement 4: View Recipe Icon Semantics

**User Story:** As a mobile user scanning quickly, I need icon meanings that do not conflict.

#### Acceptance Criteria

1. THE `View recipe` action SHALL use `BookOpen` iconography.
2. THE `Cook mode` action SHALL continue using `UtensilsCrossed` iconography.
3. The two actions SHALL remain visually distinct and shall not share the same icon.

---

### Requirement 5: Deterministic Test Time Rules

**User Story:** As a developer, I need stable tests that do not fail due to calendar drift.

#### Acceptance Criteria

1. Unit/component tests for this feature SHALL mock `getTodayString()` to a fixed ISO date.
2. E2E tests for this feature SHALL use fixed dates (for example `2026-05-04`) and SHALL NOT depend on runtime current date.
3. E2E assertions SHALL validate today/non-today behavior using fixture dates and `data-testid` selectors only.
4. No new E2E interaction in this feature SHALL rely on `getByText` or CSS selectors.
