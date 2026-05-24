# Design Document — planner-recipe-actions-clarity

## Scope

This document covers planner-row interaction clarity and pivot copy clarity only.

In scope:

1. Non-today row: explicit `View recipe` plus title-tap `Change recipe` pivot.
2. Today row: `Cook mode` only as visible row action (hide `View recipe`).
3. Explicit EN/FR copy updates for recipe-change pivot.
4. Deterministic test strategy for today/non-today logic.

Out of scope:

- Backend/API/OpenAPI changes.
- Database/schema changes.
- New planner state stores.

## UX Contract

### Row behavior matrix (assigned recipe)

| Row Type | Title tap (`edit-recipe-button`) | Secondary action | Expected result |
|---|---|---|---|
| Non-today | Open change pivot | `view-recipe-button` | View detail sheet |
| Today | Open change pivot | `start-cook-mode` | Enter Cook mode |

### Icon contract

- `view-recipe-button`: `BookOpen`
- `start-cook-mode`: `UtensilsCrossed` (existing)

### No-dead-end guard

- Today row detail access is intentionally routed through Cook mode flow.
- Change pivot remains reachable from title tap on both today and non-today rows.

## Copy Contract (EN/FR)

### English

- Pivot eyebrow: `Planner options`
- Pivot title: `Change this recipe`
- Pivot subtitle: `Choose how to replace or remove this recipe`
- Actions:
  - `Quick replace`
  - `Search library`
  - `Remove recipe`
- Row action:
  - `View recipe`

### French

- Pivot eyebrow: `Options du planificateur`
- Pivot title: `Changer cette recette`
- Pivot subtitle: `Choisissez comment remplacer ou retirer cette recette`
- Actions:
  - `Remplacement rapide`
  - `Chercher dans la bibliothèque`
  - `Retirer la recette`
- Row action:
  - `Voir la recette`

### Terminology rule

For planner row actions and pivot copy only:

- Allowed: `recipe`, `recette`
- Forbidden in action labels: `meal`, `repas`

## State Ownership

- Row rendering logic remains in planner page day-card rendering (`PlannerDayCard` in `pwa/src/app/(app)/planner/page.tsx`).
- Pivot UI remains in `pwa/src/components/planner/PlanningPivotSheet.tsx`.
- Recipe detail and cook mode entrypoints remain in existing components/stores.
- No new global store is introduced.

## data-testid Index

Authoritative test IDs for this feature:

1. `edit-recipe-button`
2. `view-recipe-button`
3. `start-cook-mode`
4. `pivot-sheet`
5. `pivot-quick-find`
6. `pivot-search-library`
7. `pivot-remove-recipe`

## Testing Strategy

### Unit/Component

- Planner row tests:
  - Fixed mocked `getTodayString()` date.
  - Non-today assigned row: `view-recipe-button` visible, `start-cook-mode` hidden.
  - Today assigned row: `start-cook-mode` visible, `view-recipe-button` hidden.
  - `edit-recipe-button` opens pivot in both cases.
- Pivot tests:
  - EN/FR copy assertions for title, subtitle, and action labels.
  - Assert recipe-only terminology for action labels.

### E2E

- Use fixed date fixtures only (`2026-05-04` for Monday anchor or equivalent explicit ISO fixtures).
- Assert via `page.getByTestId(...)` exclusively.
- Validate:
  - today row shows cook mode and hides view recipe,
  - non-today row shows view recipe,
  - title tap opens change pivot.

### Deterministic time controls

- Unit: mock `getTodayString()`.
- E2E: fixed schedule fixture dates; if clock control is used, set static date and keep assertions date-explicit.

## Risks and Mitigations

1. Risk: Row crowding regression on narrow screens.
   - Mitigation: Keep today row to single visible secondary action (`Cook mode`).
2. Risk: Copy drift between EN and FR.
   - Mitigation: Add explicit i18n key assertions in tests.
3. Risk: Existing tests rely on relative dates.
   - Mitigation: Replace with fixed-date fixtures and mock helpers.
